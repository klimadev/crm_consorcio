import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { withSessao } from "@/lib/api/route-guards";
import { ok, badRequest, serverError } from "@/lib/api/http";

export async function POST(request: NextRequest) {
  return withSessao(request, async () => {
    try {
      const formData = await request.formData();
      const arquivo = formData.get("arquivo") as File | null;

      if (!arquivo) {
        return badRequest("Nenhum arquivo enviado.");
      }

      const tiposPermitidos = ["application/pdf"];
      if (!tiposPermitidos.includes(arquivo.type)) {
        return badRequest("Apenas arquivos PDF são permitidos.");
      }

      const tamanhoMaximo = 10 * 1024 * 1024;
      if (arquivo.size > tamanhoMaximo) {
        return badRequest("Arquivo muito grande. Máximo 10MB.");
      }

      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      const extensao = ".pdf";
      const nomeArquivo = `${Date.now()}-${Math.random().toString(36).substring(7)}${extensao}`;
      const caminhoCompleto = path.join(uploadsDir, nomeArquivo);

      const buffer = Buffer.from(await arquivo.arrayBuffer());
      await writeFile(caminhoCompleto, buffer);

      const urlPublica = `/uploads/${nomeArquivo}`;

      return ok({ url: urlPublica, nome: arquivo.name });
    } catch (erro) {
      console.error("Erro ao fazer upload:", erro);
      return serverError("Erro ao fazer upload do arquivo.");
    }
  });
}
