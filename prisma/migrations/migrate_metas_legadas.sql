-- Migração de dados: transporta registros ativos de Meta + MetaPeriodo + MetaTemplate
-- para a nova tabela MetaNova.
--
-- Regras de mapeamento:
-- - Apenas metas SEMANAIS (periodo = 'SEMANAL' ou periodo_tipo = 'SEMANA') com tipo = 'PDV'
-- - Apenas registros ATIVOS
-- - A tabela Meta antiga fornece: id_empresa, tipo_meta, alvo, data_inicio, data_fim, ativo, id_pdv
-- - MetaPeriodo fornece: semana_do_mes, mes, ano
-- - MetaTemplate fornece: nome como titulo, origem_resultado como origem
--
-- A migração é idempotente: registros já migrados (verificados por id_empresa + id_pdv + período) são ignorados.

PRAGMA foreign_keys=OFF;

-- Tabela temporária para registrar quais registros foram migrados
CREATE TEMP TABLE IF NOT EXISTS migrados (
  id_meta_legada TEXT PRIMARY KEY,
  id_meta_nova TEXT NOT NULL
);

-- Insere na MetaNova os dados combinados de Meta + MetaPeriodo + MetaTemplate
INSERT OR IGNORE INTO MetaNova (
  id,
  id_empresa,
  titulo,
  tipo_meta,
  origem,
  alvo,
  semana,
  mes_referencia,
  data_inicio,
  data_fim,
  ativo,
  id_equipe,
  criado_em,
  atualizado_em
)
SELECT
  -- Gera ID deterministico baseado no UUID original da meta (prefixo 'mig_')
  'mig_' || m.id,
  m.id_empresa,
  COALESCE(mt.nome, mp.periodo_label, 'Meta migrada'),
  m.tipo_meta,
  COALESCE(mt.origem_resultado, 'PAGAMENTOS'),
  m.alvo,
  COALESCE(mp.semana_do_mes, CAST(1 AS INTEGER)),
  -- mes_referencia no formato YYYY-MM
  CAST(mp.ano AS TEXT) || '-' || SUBSTR('0' || CAST(COALESCE(mp.mes, 1) AS TEXT), -2),
  m.data_inicio,
  m.data_fim,
  m.ativo,
  -- id_equipe = id_pdv, ou fallback para primeiro PDV da empresa (não deve acontecer)
  COALESCE(m.id_pdv, ''),
  m.criado_em,
  m.atualizado_em
FROM Meta m
LEFT JOIN MetaPeriodo mp ON mp.id_meta_legada = m.id
LEFT JOIN MetaTemplate mt ON mt.id = mp.id_template
WHERE
  m.ativo = 1
  AND m.tipo = 'PDV'
  AND (m.periodo = 'SEMANAL' OR mp.periodo_tipo IS NULL OR mp.periodo_tipo = 'SEMANA')
  AND m.id_pdv IS NOT NULL
  -- Evita duplicatas: já existe MetaNova para mesma equipe + mês + semana + ativa
  AND NOT EXISTS (
    SELECT 1 FROM MetaNova mn
    WHERE
      mn.id_equipe = COALESCE(m.id_pdv, '')
      AND mn.mes_referencia = CAST(mp.ano AS TEXT) || '-' || SUBSTR('0' || CAST(COALESCE(mp.mes, 1) AS TEXT), -2)
      AND mn.semana = COALESCE(mp.semana_do_mes, 1)
      AND mn.ativo = 1
  );

-- Registra migrados
INSERT OR IGNORE INTO migrados (id_meta_legada, id_meta_nova)
SELECT m.id, 'mig_' || m.id
FROM Meta m
WHERE m.ativo = 1 AND m.tipo = 'PDV';

PRAGMA foreign_keys=ON;

-- Log de resultados
SELECT 'Migração concluída.' AS status;
SELECT COUNT(*) AS total_migrado FROM MetaNova WHERE id LIKE 'mig_%';
