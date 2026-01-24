import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    // Importar função de logout dinamicamente
    const jwtAuthModule = await import('@/lib/auth/jwt');
    return await jwtAuthModule.logout();
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
