import { seedDefaultTenantData } from '@/lib/db/operations';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const tenantId = seedDefaultTenantData();
    return NextResponse.json({ 
      success: true, 
      message: 'Default tenant initialized',
      tenantId 
    });
  } catch (error) {
    console.error('Error initializing default tenant:', error);
    return NextResponse.json({ error: 'Failed to initialize default tenant' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST to initialize the default tenant with all modules data',
    modules: [
      'users',
      'regions',
      'pdvs',
      'pipeline_stages',
      'tags',
      'custom_fields',
      'products',
      'customers',
      'deals',
      'integrations',
      'dashboard_widgets'
    ]
  });
}
