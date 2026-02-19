import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('Starting database initialization...');
    getDb();
    console.log('Database initialized successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized. Create a company via signup to get started.'
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
