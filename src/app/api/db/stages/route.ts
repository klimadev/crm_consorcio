import { auth } from '@/lib/auth/auth';
import { getPipelineStagesByTenant, createPipelineStage, updatePipelineStage, deletePipelineStage, reorderPipelineStages } from '@/lib/db/operations';
import { getOneQuery } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { PipelineStage as PipelineStageDB } from '@/types/db';
import type { PipelineStage } from '@/types';

function transformStageToComponent(stage: PipelineStageDB): PipelineStage {
  return {
    id: stage.id,
    name: stage.display_name || stage.name,
    color: stage.color || '',
    type: stage.type,
    orderIndex: stage.order_index,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stagesDB = await getPipelineStagesByTenant(session.user.tenantId);
    const stages = stagesDB.map(transformStageToComponent);
    return NextResponse.json(stages);
  } catch (error) {
    console.error('Error fetching stages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized - Owner access required' }, { status: 401 });
    }

    const data = await request.json();
    
    if (data.stageIds) {
      reorderPipelineStages(session.user.tenantId, data.stageIds);
      return NextResponse.json({ success: true });
    }

    if (!data.name || !data.type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    const stage = createPipelineStage(session.user.tenantId, {
      name: data.name,
      color: data.color || '',
      type: data.type,
    });

    return NextResponse.json(stage, { status: 201 });
  } catch (error) {
    console.error('Error creating stage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized - Owner access required' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = getOneQuery<any>('SELECT company_id FROM pipeline_stages WHERE id = ?', [data.id]);
    if (!existing || existing.company_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }

    const stage = updatePipelineStage(
      data.id,
      data.name,
      data.type,
      data.order_index || data.orderIndex
    );
    if (!stage) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }

    return NextResponse.json(stage);
  } catch (error) {
    console.error('Error updating stage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized - Owner access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = getOneQuery<any>('SELECT company_id FROM pipeline_stages WHERE id = ?', [id]);
    if (!existing || existing.company_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }

    deletePipelineStage(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting stage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
