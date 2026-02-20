import { NextResponse } from "next/server";
import { limparCookieSessao } from "@/lib/autenticacao";

export async function POST() {
  const resposta = NextResponse.json({ ok: true });
  limparCookieSessao(resposta);
  return resposta;
}
