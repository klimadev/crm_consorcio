import { getDb } from './index';

export async function ensureDbInitialized() {
  try {
    await getDb();
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}
