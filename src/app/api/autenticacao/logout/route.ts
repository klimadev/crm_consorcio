import { NextRequest, NextResponse } from "next/server";
import { limparCookieSessao } from "@/lib/autenticacao";

export async function POST(request: NextRequest) {
  const isSecure = request.headers.get("x-forwarded-proto") === "https";
  const resposta = NextResponse.json({ ok: true });
  limparCookieSessao(resposta, isSecure);
  return resposta;
}
