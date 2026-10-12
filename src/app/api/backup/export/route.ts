import { readFile, rm } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { exigirSessao, podeVerEquipe, respostaSemPermissao } from "@/lib/permissoes";
import { gerarArquivoBackupDoTenant } from "@/lib/backup-sqlite";

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;

  // Backup contém dados de toda a operação: restrito a EMPRESA e GERENTE
  if (!podeVerEquipe(auth.sessao)) return respostaSemPermissao();

  let caminhoArquivo: string | null = null;

  try {
    caminhoArquivo = await gerarArquivoBackupDoTenant(auth.sessao.id_empresa);
    const conteudo = await readFile(caminhoArquivo);
    const dataAtual = new Date().toISOString().slice(0, 10);

    return new NextResponse(new Uint8Array(conteudo), {
      status: 200,
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Length": String(conteudo.byteLength),
        "Content-Disposition": `attachment; filename="backup_crm_dados_${dataAtual}.sqlite"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (erro) {
    console.error("Erro ao gerar backup do tenant:", erro);
    return NextResponse.json(
      { erro: "Não foi possível gerar o backup agora. Tente novamente em instantes." },
      { status: 500 },
    );
  } finally {
    if (caminhoArquivo) {
      await rm(caminhoArquivo, { force: true }).catch(() => undefined);
    }
  }
}
