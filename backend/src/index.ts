import { loadConfig } from './config';
import { createApp } from './app';
import { LocalObjectStorage, R2ObjectStorage } from './storage/objectStorage';
import { FileStore } from './store/fileStore';
import { MongoStore } from './store/mongoStore';
import { DataStore } from './types';

async function bootstrap(): Promise<void> {
  const config = loadConfig();

  let store: DataStore;
  let databaseMode: 'file' | 'mongo' = 'file';

  if (config.mongoUri) {
    store = await MongoStore.connect(config.mongoUri, config.mongoDbName);
    databaseMode = 'mongo';
  } else {
    store = new FileStore(config.dataFile);
  }

  const hasR2Config =
    !!config.r2Endpoint &&
    !!config.r2Bucket &&
    !!config.r2AccessKeyId &&
    !!config.r2SecretAccessKey &&
    !!config.r2PublicBaseUrl;

  const objectStorage = hasR2Config
    ? new R2ObjectStorage(
        config.r2Endpoint!,
        config.r2Bucket!,
        config.r2AccessKeyId!,
        config.r2SecretAccessKey!,
        config.r2PublicBaseUrl!,
      )
    : new LocalObjectStorage(config.uploadDir, config.publicBaseUrl);

  const app = createApp({
    databaseMode,
    objectStorage,
    staticUploadsDir: hasR2Config ? undefined : config.uploadDir,
    storageMode: hasR2Config ? 'r2' : 'local',
    store,
  });

  const server = app.listen(config.port, () => {
    console.log(
      `attendance backend listening on ${config.publicBaseUrl} using ${databaseMode} db and ${
        hasR2Config ? 'r2' : 'local'
      } storage`,
    );
  });

  const shutdown = async () => {
    server.close(async () => {
      if (store.close) {
        await store.close();
      }

      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch(error => {
  console.error(error);
  process.exit(1);
});
