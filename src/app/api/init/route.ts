import { seedDefaultTenantData } from '@/lib/db/operations';
import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('Starting database initialization...');
    
    // Initialize database first
    await getDb();
    console.log('Database connection established');
    
    // Then seed data
    const tenantId = seedDefaultTenantData();
    console.log('Database initialized successfully, tenant ID:', tenantId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized with default tenant data',
      tenantId 
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    return NextResponse.json({ 
      error: 'Failed to initialize database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}