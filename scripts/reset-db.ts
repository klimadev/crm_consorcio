import fs from 'fs';
import path from 'path';

import { closeDatabase, initDb } from '../src/lib/db/client';

const dbPath = path.join(process.cwd(), 'data', 'saas.db');
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
} finally {
  closeDatabase();
}

console.log('Database reset completed. Use signup to create a new company.');
