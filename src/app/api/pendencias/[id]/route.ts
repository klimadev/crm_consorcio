import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json(
    { erro: "Pendências são calculadas automaticamente em tempo real e não podem ser editadas manualmente." },
    { status: 405 }
  );
}
