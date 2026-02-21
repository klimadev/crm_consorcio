/* eslint-disable @typescript-eslint/no-require-imports */
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ESTAGIOS_PADRAO = [
  { nome: "Novo Lead", tipo: "ABERTO", ordem: 1 },
  { nome: "Em Atendimento", tipo: "ABERTO", ordem: 2 },
  { nome: "Proposta", tipo: "ABERTO", ordem: 3 },
  { nome: "Fechado", tipo: "GANHO", ordem: 4 },
  { nome: "Perdido", tipo: "PERDIDO", ordem: 5 },
];

async function limparEmpresaExistente(idEmpresa) {
  await prisma.lead.deleteMany({ where: { id_empresa: idEmpresa } });
  await prisma.funcionario.deleteMany({ where: { id_empresa: idEmpresa } });
  await prisma.pdv.deleteMany({ where: { id_empresa: idEmpresa } });
  await prisma.estagioFunil.deleteMany({ where: { id_empresa: idEmpresa } });
}

async function main() {
  const senhaEmpresa = await bcrypt.hash("123456", 10);
  const senhaEquipe = await bcrypt.hash("123456", 10);

  const empresaEmail = "empresa.demo@crmconsorcio.com";
  const empresaAtual = await prisma.empresa.findUnique({ where: { email: empresaEmail } });

  if (empresaAtual) {
    await limparEmpresaExistente(empresaAtual.id);
  }

  const empresa = empresaAtual
    ? await prisma.empresa.update({
        where: { id: empresaAtual.id },
        data: { nome: "Consorcio Demo", senha_hash: senhaEmpresa },
      })
    : await prisma.empresa.create({
        data: {
          nome: "Consorcio Demo",
          email: empresaEmail,
          senha_hash: senhaEmpresa,
        },
      });

  await prisma.estagioFunil.createMany({
    data: ESTAGIOS_PADRAO.map((estagio) => ({
      ...estagio,
      id_empresa: empresa.id,
    })),
  });

  await prisma.pdv.createMany({
    data: [
      { id_empresa: empresa.id, nome: "PDV Centro" },
      { id_empresa: empresa.id, nome: "PDV Zona Sul" },
    ],
  });

  const [pdvCentro, pdvZonaSul] = await prisma.pdv.findMany({
    where: { id_empresa: empresa.id },
    orderBy: { nome: "asc" },
  });

  await prisma.funcionario.createMany({
    data: [
      {
        id_empresa: empresa.id,
        id_pdv: pdvCentro.id,
        nome: "Marina Gerente",
        email: "gerente.demo@crmconsorcio.com",
        senha_hash: senhaEquipe,
        cargo: "GERENTE",
      },
      {
        id_empresa: empresa.id,
        id_pdv: pdvCentro.id,
        nome: "Joao Vendas",
        email: "colaborador1.demo@crmconsorcio.com",
        senha_hash: senhaEquipe,
        cargo: "COLABORADOR",
      },
      {
        id_empresa: empresa.id,
        id_pdv: pdvZonaSul.id,
        nome: "Ana Vendas",
        email: "colaborador2.demo@crmconsorcio.com",
        senha_hash: senhaEquipe,
        cargo: "COLABORADOR",
      },
    ],
  });

  const funcionarios = await prisma.funcionario.findMany({
    where: { id_empresa: empresa.id, ativo: true },
    orderBy: { nome: "asc" },
  });
  const estagios = await prisma.estagioFunil.findMany({
    where: { id_empresa: empresa.id },
    orderBy: { ordem: "asc" },
  });

  const estagioNovoLead = estagios.find((estagio) => estagio.ordem === 1);
  const estagioProposta = estagios.find((estagio) => estagio.ordem === 3);
  const estagioFechado = estagios.find((estagio) => estagio.tipo === "GANHO");

  if (!estagioNovoLead || !estagioProposta || !estagioFechado) {
    throw new Error("Estagios padrao nao encontrados para seed.");
  }

  await prisma.lead.createMany({
    data: [
      {
        id_empresa: empresa.id,
        id_funcionario: funcionarios[0].id,
        id_estagio: estagioNovoLead.id,
        nome: "Carlos Almeida",
        telefone: "(11) 99876-1234",
        valor_consorcio: 85000,
      },
      {
        id_empresa: empresa.id,
        id_funcionario: funcionarios[1].id,
        id_estagio: estagioProposta.id,
        nome: "Patricia Souza",
        telefone: "(11) 98888-4321",
        valor_consorcio: 120000,
        observacoes: "Cliente pediu retorno na sexta.",
      },
      {
        id_empresa: empresa.id,
        id_funcionario: funcionarios[2].id,
        id_estagio: estagioFechado.id,
        nome: "Rafael Lima",
        telefone: "(11) 97777-6543",
        valor_consorcio: 98000,
      },
    ],
  });

  console.log("Seed concluido com sucesso.");
  console.log("Empresa:", empresaEmail, "| senha: 123456");
  console.log("Gerente: gerente.demo@crmconsorcio.com | senha: 123456");
  console.log("Colaboradores: colaborador1.demo@crmconsorcio.com, colaborador2.demo@crmconsorcio.com | senha: 123456");
}

main()
  .catch((erro) => {
    console.error("Falha ao executar seed:", erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
