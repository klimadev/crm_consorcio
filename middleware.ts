import { NextRequest, NextResponse } from "next/server";
import { NOME_COOKIE_SESSAO } from "@/lib/autenticacao";

const rotasProtegidas = ["/resumo", "/kanban", "/equipe", "/configs"];

export function middleware(request: NextRequest) {
  const rotaProtegida = rotasProtegidas.some((rota) => request.nextUrl.pathname.startsWith(rota));

  if (!rotaProtegida) {
    return NextResponse.next();
  }

  const token = request.cookies.get(NOME_COOKIE_SESSAO)?.value;
  if (!token) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/resumo/:path*", "/kanban/:path*", "/equipe/:path*", "/configs/:path*"],
};
