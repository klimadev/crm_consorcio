import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarTokenSessao, definirCookieSessao } from "@/lib/autenticacao";
import { exigirSessao, respostaSemPermissao } from "@/lib/permissoes";
import { Perfil } from "@/lib/tipos";
import { esquemaLoginComo, mensagemErroValidacao } from "@/lib/validacoes";

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (auth.sessao.perfil !== "EMPRESA") {
    return respostaSemPermissao();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "Payload JSON invalido." }, { status: 400 });
  }

  const validacao = esquemaLoginComo.safeParse(body);
  if (!validacao.success) {
    return NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 });
  }

  const { id_funcionario } = validacao.data;

  const funcionario = await prisma.funcionario.findUnique({
    where: { id: id_funcionario },
  });

  if (!funcionario || funcionario.id_empresa !== auth.sessao.id_empresa || !funcionario.ativo) {
    return NextResponse.json(
      { erro: "Funcionario inativo ou nao encontrado." },
      { status: 404 },
    );
  }

  const perfilFuncionario = (
    funcionario.cargo === "ADMINISTRADOR" ? "EMPRESA" : funcionario.cargo
  ) as Perfil;

  const isSecure = request.headers.get("x-forwarded-proto") === "https";

  const token = await criarTokenSessao({
    id_usuario: funcionario.id,
    id_empresa: funcionario.id_empresa,
    perfil: perfilFuncionario,
    id_pdv: funcionario.id_pdv,
  });

  const resposta = NextResponse.json({
    ok: true,
    perfil: perfilFuncionario,
    nome: funcionario.nome,
  });
  definirCookieSessao(resposta, token, isSecure);

  await prisma.auditoriaEquipe.create({
    data: {
      id_empresa: auth.sessao.id_empresa,
      id_funcionario_alvo: funcionario.id,
      acao: "LOGIN_COMO_FUNCIONARIO",
      autor_tipo: "EMPRESA",
      autor_id: auth.sessao.id_usuario,
    },
  });

  return resposta;
}
