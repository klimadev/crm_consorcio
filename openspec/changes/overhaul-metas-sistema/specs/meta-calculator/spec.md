## ADDED Requirements

### Requirement: Sistema deve prover funções de cálculo de progresso puras e determinísticas
O sistema DEVE expor um módulo `calculator.ts` com funções puras que calculam progresso de metas sem depender de banco de dados ou I/O. As funções DEVEM receber todos os dados necessários como parâmetros e retornar resultados sem efeitos colaterais.

#### Scenario: calcularProgresso com tipo VALOR e origem PAGAMENTOS
- **WHEN** `calcularProgresso` é chamado com `{ alvo: 25000, tipo_meta: "VALOR", origem: "PAGAMENTOS" }` e `{ pagamentos: [{ valor: 15000 }] }`
- **THEN** o resultado DEVE conter `realizado: 15000`, `percentual: 60.0`, `faltante: 10000`

#### Scenario: calcularProgresso com tipo VOLUME e origem FECHADOS
- **WHEN** `calcularProgresso` é chamado com `{ alvo: 10, tipo_meta: "VOLUME", origem: "FECHADOS" }` e `{ leads: [{ id: "1" }, { id: "2" }] }`
- **THEN** o resultado DEVE conter `realizado: 2`, `percentual: 20.0`, `faltante: 8`

#### Scenario: percentual nunca ultrapassa 0 quando alvo é 0
- **WHEN** `calcularProgresso` é chamado com `{ alvo: 0 }`
- **THEN** o resultado DEVE conter `percentual: 0` sem lançar erro

### Requirement: Sistema deve calcular competência semanal em formato ISO
O sistema DEVE prover função `obterCompetencia(data)` que retorna string `"YYYY-WNN"` (ano-Wsemana) usando padrão ISO 8601. A função DEVE usar exclusivamente operações UTC.

#### Scenario: competencia para segunda-feira 2026-06-15
- **WHEN** `obterCompetencia(new Date("2026-06-15T12:00:00Z"))`
- **THEN** o resultado DEVE ser `"2026-W25"`

#### Scenario: competencia para domingo 2026-06-21
- **WHEN** `obterCompetencia(new Date("2026-06-21T12:00:00Z"))`
- **THEN** o resultado DEVE ser `"2026-W25"` (domingo pertence à mesma semana ISO)

### Requirement: Sistema deve calcular dias restantes corretamente
O sistema DEVE prover função `calcularDiasRestantes(dataFim)` que retorna número de dias inteiros restantes, considerando 0 quando a data já passou.

#### Scenario: dias restantes para data futura
- **WHEN** `calcularDiasRestantes(new Date("2026-06-21T23:59:59Z"))` e hoje é `2026-06-15`
- **THEN** o resultado DEVE ser `6`

#### Scenario: dias restantes para data passada retorna 0
- **WHEN** `calcularDiasRestantes(new Date("2026-06-10T23:59:59Z"))` e hoje é `2026-06-15`
- **THEN** o resultado DEVE ser `0`
