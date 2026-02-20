import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SessaoToken } from "@/lib/tipos";

export const NOME_COOKIE_SESSAO = "crm_consorcio_sessao";

const segredo = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "segredo-dev-trocar-em-producao",
);

export async function criarTokenSessao(sessao: SessaoToken) {
  return new SignJWT(sessao)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(segredo);
}

export async function validarTokenSessao(token: string) {
  try {
    const { payload } = await jwtVerify(token, segredo);
    return payload as SessaoToken;
  } catch {
    return null;
  }
}

export function definirCookieSessao(resposta: NextResponse, token: string) {
  resposta.cookies.set(NOME_COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function limparCookieSessao(resposta: NextResponse) {
  resposta.cookies.set(NOME_COOKIE_SESSAO, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function obterSessaoNoServidor() {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOME_COOKIE_SESSAO)?.value;
  if (!token) {
    return null;
  }

  return validarTokenSessao(token);
}

export async function obterSessaoNaRequest(request: NextRequest) {
  const token = request.cookies.get(NOME_COOKIE_SESSAO)?.value;
  if (!token) {
    return null;
  }

  return validarTokenSessao(token);
}
