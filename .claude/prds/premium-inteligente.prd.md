# Features Premium Inteligentes

## Problem
Todos os perfis do CRM (dono, gerentes, colaboradores) esquecem follow-up de leads, não usam o CRM de forma consistente, e precisam de **visibilidade forçada** — alertas que não dá pra ignorar. Leads parados acumulam, valor potencial é perdido, e o CRM vira só um repositório morto. O dono paga o servidor, fez o CRM de graça, e não teve retorno esperado — as features mais legais precisam virar **alavanca de valor** pra justificar premium.

## Evidence
- **Assumption** — validar via observação de uso real: leads parados, falta de follow-up, baixa adesão ao CRM no dia a dia.

## Users
- **Primary**: Dono (perfil EMPRESA), Gerentes (perfil GERENTE), Colaboradores (perfil COLABORADOR) — todos que interagem com leads no CRM
- **Not for**: Clientes externos, leads

## Hypothesis
Acreditamos que **notificações inteligentes com popups contextuais + badges visuais no kanban** vão **reduzir leads parados e aumentar taxa de follow-up** para **todos os perfis do CRM**. Vamos saber que tá certo quando **observarmos leads parados diminuindo e leads sendo movidos de estágio após alertas** — sem métrica instrumentada, só observação direta.

## Success Metrics
| Metric | Target | How measured |
|--------|--------|-------------|
| Leads parados reduzindo | Observável | Olhar kanban antes/depois |
| Popups não ignorados | Uso | Ver se clicam nos CTAs |

## Scope
**MVP** — 1 flag binária `premium_liberado` (começa `true` pra todos). Motor de análise inteligente com regras de CRM (sem IA, sem WhatsApp). Popup contextual 1x/dia por perfil. Badge visual nos leads do kanban. Leads com badge aparecem primeiro na ordenação. Botões de teste no laboratório.

**Out of scope**
- Tabelas de plano/assinatura — 1 flag na tabela Empresa basta
- Dependência de WhatsApp pra análise inteligente (o existente AI Agent continua separado)
- IA generativa nos popups — só regras determinísticas
- Notificação sonora — só visual
- Métricas instrumentadas — validar por observação

## Delivery Milestones

| # | Milestone | Outcome | Status | Plan |
|---|---|---|---|---|
| 1 | Premium flag + motor de regras | Flag `premium_liberado` funcional + engine que analisa leads parados/vencidos/sem responsável | pending | — |
| 2 | SmartPopup por perfil | Popup contextual no dashboard que aparece 1x/dia com mensagem diferente pra EMPRESA, GERENTE, COLABORADOR | pending | — |
| 3 | Badge + priorização no kanban | Leads afetados ganham badge colorido + aparecem primeiro no board | pending | — |
| 4 | Página de testes no laboratório | Aba "Testes Premium" com preview de mensagem por usuário, simulação de gatilho | pending | — |
| 5 | Aprimorar AI Agent WhatsApp | Marcação de lead + follow-up recomendado no chat | pending | — |

## Open Questions
- [ ] Quantos dias sem atividade = "lead parado"? (sugiro 7)
- [ ] Frequência do popup pra cada perfil é a mesma? (1x/dia)

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Popup ser intrusivo/irritante | Média | Alto (rejeição) | localStorage pra não repetir no dia, botão "não mostrar hoje" |
| Análise lentificar dashboard | Baixa | Médio | Async + cache 5min servidor |
| Leads sem ultima_atividade | Média | Baixo | Fallback pra atualizado_em |
| Flag começa true mas desligar gera atrito | Alta | Alto (objetivo!) | É o propósito — aviso progressivo |

---
*Status: DRAFT — requirements only. Implementation planning pending via /plan.*
