'use client';

import { GoogleGenAI } from "@google/genai";
import { Deal, Employee, Product, PDV } from "@/types";

const initAI = () => {
  if (typeof window === 'undefined') return null;
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is missing");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeDeal = async (
  deal: Deal,
  stageName: string,
  products: Product[],
  employees: Employee[],
  pdvs: PDV[]
): Promise<string> => {
  const ai = initAI();
  if (!ai) return "Erro: Chave de API não configurada.";

  const assignedNames = employees
    .filter((e) => deal.assignedEmployeeIds.includes(e.id))
    .map((e) => `${e.name} (${e.role})`)
    .join(", ");

  const productNames = products
    .filter((p) => deal.productIds.includes(p.id))
    .map((p) => `${p.name} (R$ ${p.basePrice})`)
    .join(", ");

  const prompt = `
    Atue como um Consultor de Vendas Sênior e Especialista em CRM.
    Analise o seguinte negócio (Deal) no CRM e forneça um resumo curto e estratégico (máximo 3 parágrafos).
    
    Dados do Negócio:
    - Cliente: ${deal.customerName}
    - Valor: R$ ${deal.value}
    - Estágio Atual: ${stageName}
    - Produtos de Interesse: ${productNames || "Nenhum especificado"}
    - Responsáveis: ${assignedNames || "Não atribuído"}
    - Notas atuais: "${deal.notes}"

    Sua resposta deve conter:
    1. Uma avaliação de probabilidade de fechamento (Baixa, Média, Alta) com uma breve justificativa.
    2. Sugestão de próxima ação (Next Best Action) para o vendedor.
    3. Identificação de eventuais riscos (ex: falta de produtos, estagnação no funil).

    Responda em Português do Brasil de forma profissional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Não foi possível gerar uma análise no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao conectar com a IA. Verifique sua chave de API ou tente novamente.";
  }
};
