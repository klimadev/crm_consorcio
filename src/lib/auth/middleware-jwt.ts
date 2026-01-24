import { jwtVerify } from 'jose';

export async function verifyAccessToken(token: string) {
  try {
    const secret = process.env.JWT_SECRET || 'crm-next-jwt-secret-key-change-in-production';
    const key = new TextEncoder().encode(secret);
    
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch (error) {
    // Em produção, remova o console.log para evitar flood
    console.error('Erro de validação JWT (Edge):', error);
    return null;
  }
}