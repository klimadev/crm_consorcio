import path from 'path';
import { initDb, closeDatabase } from '../src/lib/db/client';

const dbPath = path.join(process.cwd(), 'data', 'database.db');

console.log('Initializing database at:', dbPath);

initDb();
closeDatabase();

console.log('Database schema created successfully!');
console.log('Database initialization completed.');
