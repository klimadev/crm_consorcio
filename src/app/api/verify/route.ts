import { getQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if data exists without authentication
    const regions = getQuery<{ count: number }>('SELECT COUNT(*) as count FROM regions');
    const users = getQuery<{ count: number }>('SELECT COUNT(*) as count FROM users');
    const deals = getQuery<{ count: number }>('SELECT COUNT(*) as count FROM deals');
    const customers = getQuery<{ count: number }>('SELECT COUNT(*) as count FROM customers');
    
    return NextResponse.json({
      success: true,
      data: {
        regions: regions[0]?.count || 0,
        users: users[0]?.count || 0,
        deals: deals[0]?.count || 0,
        customers: customers[0]?.count || 0,
      },
      message: 'Database verification complete'
    });
  } catch (error) {
    console.error('Error verifying database:', error);
    return NextResponse.json({ 
      error: 'Failed to verify database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}