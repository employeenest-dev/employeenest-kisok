import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import mime from 'mime-types';

import { ObjectStorage, SaveUploadInput, SavedObject } from '../types';
import { createId } from '../utils/id';

function sanitizeSegment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9/-]+/g, '-').replace(/\/+/g, '/');
}

function resolveExtension(originalName: string, contentType: string): string {
  const fromName = path.extname(originalName).replace('.', '');

  if (fromName) {
    return fromName;
  }

  const fromMime = mime.extension(contentType);
  return typeof fromMime === 'string' ? fromMime : 'bin';
}

function buildObjectKey(prefix: string, originalName: string, contentType: string): string {
  const extension = resolveExtension(originalName, contentType);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${sanitizeSegment(prefix)}/${timestamp}-${createId('upload')}.${extension}`;
}

export class LocalObjectStorage implements ObjectStorage {
  constructor(
    private readonly uploadDir: string,
    private readonly publicBaseUrl: string,
  ) {}

  async saveUpload(input: SaveUploadInput): Promise<SavedObject> {
    const key = buildObjectKey(input.prefix, input.originalName, input.contentType);
    const absolutePath = path.join(this.uploadDir, key);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.buffer);

    return {
      key,
      url: `${this.publicBaseUrl.replace(/\/$/, '')}/uploads/${key}`,
    };
  }
}

export class R2ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;

  constructor(
    endpoint: string,
    private readonly bucket: string,
    accessKeyId: string,
    secretAccessKey: string,
    private readonly publicBaseUrl: string,
  ) {
    this.client = new S3Client({
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      endpoint,
      forcePathStyle: true,
      region: 'auto',
    });
  }

  async saveUpload(input: SaveUploadInput): Promise<SavedObject> {
    const key = buildObjectKey(input.prefix, input.originalName, input.contentType);

    await this.client.send(
      new PutObjectCommand({
        Body: input.buffer,
        Bucket: this.bucket,
        CacheControl: 'public, max-age=31536000, immutable',
        ContentType: input.contentType,
        Key: key,
      }),
    );

    return {
      key,
      url: `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`,
    };
  }
}
