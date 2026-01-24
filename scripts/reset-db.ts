import fs from 'fs';
import path from 'path';

import { closeDatabase, initDb } from '../src/lib/db/client';
import { seedDefaultTenantData } from '../src/lib/db/operations';

const dbPath = path.join(process.cwd(), 'data', 'database.db');
const walPath = `${dbPath}-wal`;
const shmPath = `${dbPath}-shm`;

function removeIfExists(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }
}

try {
  closeDatabase();
} catch {
  // Ignore if the database was never opened in this process.
}

removeIfExists(walPath);
removeIfExists(shmPath);
removeIfExists(dbPath);

try {
  initDb();
  seedDefaultTenantData();
} finally {
  closeDatabase();
}

console.log('Database reset completed.');
