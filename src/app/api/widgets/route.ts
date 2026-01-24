import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/jwt';
import { getWidgetsByUserId, createWidget, updateWidget, deleteWidget, getWidgetById } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
    }

    const widgets = getWidgetsByUserId(user.id);

    return NextResponse.json({ 
      success: true, 
      widgets: widgets.map(w => ({
        id: w.id,
        widgetType: w.widget_type,
        data: JSON.parse(w.data || '{}'),
        position: w.position,
        size: w.size,
      }))
    });
  } catch (error) {
    console.error('Get widgets error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookies = parseCookies(request.headers.get('cookie'));
    const accessToken = cookies.access_token;
    
    if (!accessToken) {
      return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
    }

    const payload = verifyToken(accessToken);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { widgetType, data, position, size } = body;

    const widget = createWidget(
      payload.userId,
      widgetType,
      JSON.stringify(data || {}),
      position || 0,
      size || 'normal'
    );

    return NextResponse.json({ 
      success: true, 
      widget: {
        id: widget.id,
        widgetType: widget.widget_type,
        data: JSON.parse(widget.data),
        position: widget.position,
        size: widget.size,
      }
    });
  } catch (error) {
    console.error('Create widget error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookies = parseCookies(request.headers.get('cookie'));
    const accessToken = cookies.access_token;
    
    if (!accessToken) {
      return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
    }

    const payload = verifyToken(accessToken);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { id, widgetType, data, position, size } = body;

    const widget = updateWidget(
      id,
      widgetType,
      JSON.stringify(data || {}),
      position,
      size
    );

    if (!widget) {
      return NextResponse.json({ success: false, message: 'Widget não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      widget: {
        id: widget.id,
        widgetType: widget.widget_type,
        data: JSON.parse(widget.data),
        position: widget.position,
        size: widget.size,
      }
    });
  } catch (error) {
    console.error('Update widget error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookies = parseCookies(request.headers.get('cookie'));
    const accessToken = cookies.access_token;
    
    if (!accessToken) {
      return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
    }

    const payload = verifyToken(accessToken);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID é obrigatório' }, { status: 400 });
    }

    deleteWidget(id);

    return NextResponse.json({ success: true, message: 'Widget deletado' });
  } catch (error) {
    console.error('Delete widget error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}
