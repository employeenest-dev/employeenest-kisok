import express, { Express, Request } from 'express';
import cors from 'cors';
import multer from 'multer';

import { AttendanceMethod, AttendanceRecord, AttendanceType, DataStore, ObjectStorage, SavedObject } from './types';
import { createId } from './utils/id';

interface CreateAppOptions {
  databaseMode: 'file' | 'mongo';
  objectStorage: ObjectStorage;
  staticUploadsDir?: string;
  storageMode: 'local' | 'r2';
  store: DataStore;
}

const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  storage: multer.memoryStorage(),
});

function readFirstValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return undefined;
}

function parseEmbedding(value: unknown): number[] {
  const raw = readFirstValue(value);

  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed) || parsed.some(item => typeof item !== 'number')) {
    throw new Error('Embedding must be a JSON array of numbers.');
  }

  return parsed;
}

function parseRequiredString(body: Record<string, unknown>, key: string): string {
  const value = readFirstValue(body[key]);

  if (!value) {
    throw new Error(`Missing required field "${key}".`);
  }

  return value.trim();
}

function parseOptionalNumber(body: Record<string, unknown>, key: string): number | undefined {
  const value = readFirstValue(body[key]);

  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`Field "${key}" must be a number.`);
  }

  return parsed;
}

function parseAttendanceMethod(value: string): AttendanceMethod {
  if (value === 'FACE' || value === 'MANUAL') {
    return value;
  }

  throw new Error('Attendance method must be FACE or MANUAL.');
}

function parseAttendanceType(value: string): AttendanceType {
  if (value === 'CHECKIN' || value === 'CHECKOUT') {
    return value;
  }

  throw new Error('Attendance type must be CHECKIN or CHECKOUT.');
}

async function persistFileIfPresent(
  file: Express.Multer.File | undefined,
  objectStorage: ObjectStorage,
  prefix: string,
): Promise<SavedObject | undefined> {
  if (!file) {
    return undefined;
  }

  return objectStorage.saveUpload({
    buffer: file.buffer,
    contentType: file.mimetype,
    originalName: file.originalname,
    prefix,
  });
}

function serializeAttendance(record: AttendanceRecord) {
  return {
    confidence: record.confidence,
    createdAt: record.createdAt,
    deviceId: record.deviceId,
    employeeId: record.employeeId,
    id: record.id,
    method: record.method,
    photoUrl: record.photoUrl,
    syncId: record.syncId,
    timestamp: record.timestamp,
    type: record.type,
  };
}

function serializeEmployee(record: {
  createdAt: string;
  employeeId: string;
  embeddingVersion: number;
  faceEmbedding: number[];
  faceImageUrl?: string;
  id: string;
  name: string;
  team: string;
  updatedAt: string;
}) {
  return {
    createdAt: record.createdAt,
    employeeId: record.employeeId,
    embeddingVersion: record.embeddingVersion,
    faceEmbedding: record.faceEmbedding,
    faceImageUrl: record.faceImageUrl,
    id: record.id,
    name: record.name,
    team: record.team,
    updatedAt: record.updatedAt,
  };
}

export function createApp(options: CreateAppOptions): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (options.staticUploadsDir) {
    app.use('/uploads', express.static(options.staticUploadsDir));
  }

  app.get('/health', (_request, response) => {
    response.json({
      databaseMode: options.databaseMode,
      status: 'ok',
      storageMode: options.storageMode,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/employees', async (_request, response, next) => {
    try {
      const employees = await options.store.listEmployees();
      response.json({ employees: employees.map(serializeEmployee) });
    } catch (error) {
      next(error);
    }
  });

  app.get('/employees/embeddings', async (_request, response, next) => {
    try {
      const employees = await options.store.listEmployees();
      response.json({
        employees: employees.map(employee => ({
          employeeId: employee.employeeId,
          embeddingVersion: employee.embeddingVersion,
          faceEmbedding: employee.faceEmbedding,
          faceImageUrl: employee.faceImageUrl,
          id: employee.id,
          name: employee.name,
          team: employee.team,
          updatedAt: employee.updatedAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    '/employees',
    upload.single('faceImage'),
    async (request: Request, response, next) => {
      try {
        const now = new Date().toISOString();
        const employeeId = parseRequiredString(request.body, 'employeeId');
        const employee = {
          createdAt: now,
          employeeId,
          embeddingVersion: parseOptionalNumber(request.body, 'embeddingVersion') ?? 1,
          faceEmbedding: parseEmbedding(request.body.embedding),
          id: createId('employee'),
          name: parseRequiredString(request.body, 'name'),
          team: parseRequiredString(request.body, 'team'),
          updatedAt: now,
        };

        const faceImage = await persistFileIfPresent(
          request.file,
          options.objectStorage,
          `employees/${employeeId}`,
        );

        const saved = await options.store.createEmployee({
          ...employee,
          faceImageUrl: faceImage?.url,
        });

        response.status(201).json({ employee: serializeEmployee(saved) });
      } catch (error) {
        next(error);
      }
    },
  );

  app.put(
    '/employees/:id',
    upload.single('faceImage'),
    async (request: Request, response, next) => {
      try {
        const employeeRecordId = Array.isArray(request.params.id)
          ? request.params.id[0]
          : request.params.id;
        const existing = await options.store.getEmployeeById(employeeRecordId);

        if (!existing) {
          response.status(404).json({ error: 'Employee not found.' });
          return;
        }

        const nextEmployeeId =
          readFirstValue(request.body.employeeId)?.trim() || existing.employeeId;
        const faceImage = await persistFileIfPresent(
          request.file,
          options.objectStorage,
          `employees/${nextEmployeeId}`,
        );

        const updated = await options.store.updateEmployee({
          ...existing,
          employeeId: nextEmployeeId,
          embeddingVersion:
            parseOptionalNumber(request.body, 'embeddingVersion') ??
            existing.embeddingVersion,
          faceEmbedding:
            request.body.embedding !== undefined
              ? parseEmbedding(request.body.embedding)
              : existing.faceEmbedding,
          faceImageUrl: faceImage?.url ?? existing.faceImageUrl,
          name: readFirstValue(request.body.name)?.trim() || existing.name,
          team: readFirstValue(request.body.team)?.trim() || existing.team,
          updatedAt: new Date().toISOString(),
        });

        response.status(200).json({ employee: serializeEmployee(updated) });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get('/attendance', async (request, response, next) => {
    try {
      const limit = parseOptionalNumber(request.query as Record<string, unknown>, 'limit');
      const employeeId = readFirstValue(request.query.employeeId);
      const attendance = await options.store.listAttendance({ employeeId, limit });
      response.json({ attendance: attendance.map(serializeAttendance) });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    '/attendance',
    upload.single('photo'),
    async (request: Request, response, next) => {
      try {
        const employeeId = parseRequiredString(request.body, 'employeeId');
        const employee = await options.store.getEmployeeById(employeeId);

        if (!employee) {
          response.status(404).json({ error: 'Employee not found.' });
          return;
        }

        const method = parseAttendanceMethod(parseRequiredString(request.body, 'method'));
        const type = parseAttendanceType(parseRequiredString(request.body, 'type'));
        const syncId = readFirstValue(request.body.syncId) ?? createId('sync');
        const existing = await options.store.getAttendanceBySyncId(syncId);

        if (existing) {
          response.status(200).json({
            attendance: serializeAttendance(existing),
            duplicate: true,
          });
          return;
        }

        if (method === 'MANUAL' && !request.file) {
          response.status(400).json({
            error: 'Manual attendance requires a proof photo.',
          });
          return;
        }

        const photo = await persistFileIfPresent(
          request.file,
          options.objectStorage,
          `attendance/${employee.employeeId}`,
        );

        const record: AttendanceRecord = {
          confidence: parseOptionalNumber(request.body, 'confidence'),
          createdAt: new Date().toISOString(),
          deviceId: parseRequiredString(request.body, 'deviceId'),
          employeeId,
          id: createId('attendance'),
          method,
          photoUrl: photo?.url,
          syncId,
          timestamp: readFirstValue(request.body.timestamp) ?? new Date().toISOString(),
          type,
        };

        const saved = await options.store.createAttendance(record);
        response.status(201).json({ attendance: serializeAttendance(saved) });
      } catch (error) {
        next(error);
      }
    },
  );

  app.use(
    (
      error: unknown,
      _request: Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      const message = error instanceof Error ? error.message : 'Unexpected server error.';
      response.status(400).json({ error: message });
    },
  );

  return app;
}
