import path from 'node:path';

import dotenv from 'dotenv';

dotenv.config();

export interface BackendConfig {
  port: number;
  publicBaseUrl: string;
  dataFile: string;
  uploadDir: string;
  mongoUri?: string;
  mongoDbName: string;
  r2Endpoint?: string;
  r2Bucket?: string;
  r2AccessKeyId?: string;
  r2SecretAccessKey?: string;
  r2PublicBaseUrl?: string;
}

function resolvePath(value: string | undefined, fallback: string): string {
  return path.resolve(process.cwd(), value ?? fallback);
}

export function loadConfig(): BackendConfig {
  return {
    port: Number(process.env.PORT ?? 4000),
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:4000',
    dataFile: resolvePath(process.env.DATA_FILE, './backend/data/app-data.json'),
    uploadDir: resolvePath(process.env.UPLOAD_DIR, './backend/uploads'),
    mongoUri: process.env.MONGODB_URI,
    mongoDbName: process.env.MONGODB_DB_NAME ?? 'attendance-kiosk',
    r2Endpoint: process.env.R2_ENDPOINT,
    r2Bucket: process.env.R2_BUCKET,
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    r2PublicBaseUrl: process.env.R2_PUBLIC_BASE_URL,
  };
}
