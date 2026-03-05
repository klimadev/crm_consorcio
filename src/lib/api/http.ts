import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function badRequest(message: string) {
  return NextResponse.json({ erro: message }, { status: 400 });
}

export function forbidden(message = "Sem permissao.") {
  return NextResponse.json({ erro: message }, { status: 403 });
}

export function notFound(message = "Nao encontrado.") {
  return NextResponse.json({ erro: message }, { status: 404 });
}

export function conflict(message: string) {
  return NextResponse.json({ erro: message }, { status: 409 });
}

export function serverError(message = "Erro interno do servidor.") {
  return NextResponse.json({ erro: message }, { status: 500 });
}
