import { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { badRequest } from "@/lib/api/http";
import { mensagemErroValidacao } from "@/lib/validacoes";

type ResultadoValidacao<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseJson<T>(request: NextRequest): Promise<ResultadoValidacao<T>> {
  try {
    return { ok: true, data: (await request.json()) as T };
  } catch {
    return { ok: false, response: badRequest("JSON invalido.") };
  }
}

export function validateBody<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  payload: unknown,
): ResultadoValidacao<z.infer<TSchema>> {
  const validacao = schema.safeParse(payload);
  if (!validacao.success) {
    return { ok: false, response: badRequest(mensagemErroValidacao(validacao.error)) };
  }
  return { ok: true, data: validacao.data };
}

export function validateQuery<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  payload: unknown,
  fallbackMessage = "Parametros de busca invalidos.",
): ResultadoValidacao<z.infer<TSchema>> {
  const validacao = schema.safeParse(payload);
  if (!validacao.success) {
    return { ok: false, response: badRequest(fallbackMessage) };
  }
  return { ok: true, data: validacao.data };
}
