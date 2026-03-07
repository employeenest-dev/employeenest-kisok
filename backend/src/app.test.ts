import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import request from 'supertest';

import { createApp } from './app';
import { LocalObjectStorage } from './storage/objectStorage';
import { FileStore } from './store/fileStore';

test('employee and attendance endpoints work with local storage', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'attendance-kiosk-'));

  try {
    const store = new FileStore(path.join(tempDir, 'data.json'));
    const app = createApp({
      databaseMode: 'file',
      objectStorage: new LocalObjectStorage(path.join(tempDir, 'uploads'), 'http://localhost:4000'),
      staticUploadsDir: path.join(tempDir, 'uploads'),
      storageMode: 'local',
      store,
    });

    const employeeResponse = await request(app)
      .post('/employees')
      .field('name', 'Pranav Rao')
      .field('employeeId', 'NAT-001')
      .field('team', 'Engineering')
      .field('embedding', JSON.stringify([0.12, -0.31, 0.55]))
      .attach('faceImage', Buffer.from('fake-image-data'), {
        contentType: 'image/jpeg',
        filename: 'face.jpg',
      });

    assert.equal(employeeResponse.status, 201);
    assert.equal(employeeResponse.body.employee.name, 'Pranav Rao');

    const embeddingsResponse = await request(app).get('/employees/embeddings');

    assert.equal(embeddingsResponse.status, 200);
    assert.equal(embeddingsResponse.body.employees.length, 1);

    const employeeId = employeeResponse.body.employee.id as string;
    const updateResponse = await request(app)
      .put(`/employees/${employeeId}`)
      .field('team', 'Platform')
      .field('embeddingVersion', '2')
      .field('embedding', JSON.stringify([0.44, 0.11, -0.28]));

    assert.equal(updateResponse.status, 200);
    assert.equal(updateResponse.body.employee.team, 'Platform');
    assert.equal(updateResponse.body.employee.embeddingVersion, 2);

    const syncId = 'sync-001';

    const attendanceResponse = await request(app)
      .post('/attendance')
      .field('employeeId', employeeId)
      .field('type', 'CHECKIN')
      .field('method', 'MANUAL')
      .field('deviceId', 'tablet-frontdesk-01')
      .field('syncId', syncId)
      .attach('photo', Buffer.from('manual-proof'), {
        contentType: 'image/jpeg',
        filename: 'attendance.jpg',
      });

    assert.equal(attendanceResponse.status, 201);
    assert.equal(attendanceResponse.body.attendance.syncId, syncId);

    const duplicateResponse = await request(app)
      .post('/attendance')
      .field('employeeId', employeeId)
      .field('type', 'CHECKIN')
      .field('method', 'MANUAL')
      .field('deviceId', 'tablet-frontdesk-01')
      .field('syncId', syncId)
      .attach('photo', Buffer.from('manual-proof'), {
        contentType: 'image/jpeg',
        filename: 'attendance.jpg',
      });

    assert.equal(duplicateResponse.status, 200);
    assert.equal(duplicateResponse.body.duplicate, true);

    const listResponse = await request(app).get('/attendance?limit=10');

    assert.equal(listResponse.status, 200);
    assert.equal(listResponse.body.attendance.length, 1);
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
});
