import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { exigirSessao } from "@/lib/permissoes";

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  try {
    const formData = await request.formData();
    const arquivo = formData.get("arquivo") as File | null;

    if (!arquivo) {
      return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
    }

    // Validar tipo do arquivo
    const tiposPermitidos = ["application/pdf"];
    if (!tiposPermitidos.includes(arquivo.type)) {
      return NextResponse.json({ erro: "Apenas arquivos PDF são permitidos." }, { status: 400 });
    }

    // Validar tamanho (max 10MB)
    const tamanhoMaximo = 10 * 1024 * 1024; // 10MB
    if (arquivo.size > tamanhoMaximo) {
      return NextResponse.json({ erro: "Arquivo muito grande. Máximo 10MB." }, { status: 400 });
    }

    // Criar diretório se não existir
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Gerar nome único para o arquivo
    const extensao = ".pdf";
    const nomeArquivo = `${Date.now()}-${Math.random().toString(36).substring(7)}${extensao}`;
    const caminhoCompleto = path.join(uploadsDir, nomeArquivo);

    // Converter e salvar o arquivo
    const buffer = Buffer.from(await arquivo.arrayBuffer());
    await writeFile(caminhoCompleto, buffer);

    // Retornar a URL pública
    const urlPublica = `/uploads/${nomeArquivo}`;

    return NextResponse.json({ url: urlPublica, nome: arquivo.name });
  } catch (erro) {
    console.error("Erro ao fazer upload:", erro);
    return NextResponse.json({ erro: "Erro ao fazer upload do arquivo." }, { status: 500 });
  }
}
