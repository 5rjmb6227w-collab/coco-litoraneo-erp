-- =========================================================
-- AI COPILOT MIGRATION - COCO LITORÂNEO ERP
-- Arquivo SQL idempotente para STAGING
-- Versão: 2.5.1 + 2.5.2
-- Data: 2026-01-04
-- =========================================================

-- =========================================================
-- PARTE 1: TABELAS AI_* (DDL)
-- =========================================================

-- 1) Event log: o "fio" que liga todos os módulos
CREATE TABLE IF NOT EXISTS ai_events (
  id CHAR(36) NOT NULL,
  eventType VARCHAR(80) NOT NULL,              -- ex: "producer_payable.paid"
  module VARCHAR(40) NOT NULL,                 -- ex: "producerPayables"
  entityType VARCHAR(60) NOT NULL,             -- ex: "producer_payables"
  entityId CHAR(36) NOT NULL,                  -- id do registro afetado
  actorUserId CHAR(36) NULL,                   -- userId que executou (se houver)
  severity VARCHAR(12) NULL,                   -- "INFO"|"LOW"|"MEDIUM"|"HIGH"|"CRITICAL" (opcional)
  payload JSON NULL,                           -- dados do evento (diff básico, motivos, etc.)
  ipAddress VARCHAR(64) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  INDEX idx_ai_events_createdAt (createdAt),
  INDEX idx_ai_events_entity (entityType, entityId),
  INDEX idx_ai_events_module_type (module, eventType),
  INDEX idx_ai_events_actor (actorUserId)
);

-- 2) Insights gerados (por regra ou LLM)
CREATE TABLE IF NOT EXISTS ai_insights (
  id CHAR(36) NOT NULL,
  insightType VARCHAR(60) NOT NULL,            -- ex: "inventory_below_minimum", "payables_overdue"
  module VARCHAR(40) NOT NULL,                 -- módulo principal relacionado
  title VARCHAR(140) NOT NULL,
  summary TEXT NOT NULL,                       -- resumo curto (UI)
  severity VARCHAR(12) NOT NULL,               -- "LOW"|"MEDIUM"|"HIGH"|"CRITICAL"
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',  -- OPEN|ACKED|DISMISSED|RESOLVED
  periodStart DATE NULL,
  periodEnd DATE NULL,
  evidenceCount INT NOT NULL DEFAULT 0,
  evidence JSON NULL,                          -- lista compacta de evidências (além de ai_sources)
  recommendedActions JSON NULL,                -- ações sugeridas (payload leve)
  generatedBy VARCHAR(20) NOT NULL DEFAULT 'RULE', -- RULE|LLM|HYBRID
  modelInfo VARCHAR(120) NULL,                 -- ex: "manus-llm-x", "custom_http"
  createdBy CHAR(36) NULL,                     -- userId (se gerado sob demanda) ou null (cron)
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NULL,

  PRIMARY KEY (id),
  INDEX idx_ai_insights_status_sev (status, severity),
  INDEX idx_ai_insights_module (module),
  INDEX idx_ai_insights_createdAt (createdAt),
  INDEX idx_ai_insights_period (periodStart, periodEnd)
);

-- 3) Alertas (envio e rastreio por canal)
CREATE TABLE IF NOT EXISTS ai_alerts (
  id CHAR(36) NOT NULL,
  insightId CHAR(36) NULL,                     -- pode estar ligado a um insight
  channel VARCHAR(16) NOT NULL,                -- EMAIL|IN_APP|WHATSAPP (WHATSAPP opcional)
  toAddress VARCHAR(180) NULL,                 -- e-mail/identificador
  userId CHAR(36) NULL,                        -- destinatário interno (se IN_APP)
  subject VARCHAR(160) NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING|SENT|FAILED|ACKED
  errorMessage TEXT NULL,
  sentAt DATETIME(3) NULL,
  ackedAt DATETIME(3) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  INDEX idx_ai_alerts_status (status),
  INDEX idx_ai_alerts_user (userId),
  INDEX idx_ai_alerts_insight (insightId),
  INDEX idx_ai_alerts_createdAt (createdAt)
);

-- 4) Conversas do Copiloto (por usuário)
CREATE TABLE IF NOT EXISTS ai_conversations (
  id CHAR(36) NOT NULL,
  userId CHAR(36) NOT NULL,
  title VARCHAR(140) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE|ARCHIVED
  lastMessageAt DATETIME(3) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NULL,

  PRIMARY KEY (id),
  INDEX idx_ai_conv_user (userId),
  INDEX idx_ai_conv_last (lastMessageAt)
);

-- 5) Mensagens (chat)
CREATE TABLE IF NOT EXISTS ai_messages (
  id CHAR(36) NOT NULL,
  conversationId CHAR(36) NOT NULL,
  role VARCHAR(16) NOT NULL,                  -- USER|ASSISTANT|SYSTEM
  content MEDIUMTEXT NOT NULL,
  responseFormat VARCHAR(20) NULL,            -- ex: "SUMMARY_EVIDENCE_ACTIONS"
  sources JSON NULL,                          -- lista de sources (IDs + labels + urls)
  tokenUsage JSON NULL,                       -- opcional: {inputTokens, outputTokens, cost}
  modelInfo VARCHAR(120) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  INDEX idx_ai_msg_conv (conversationId),
  INDEX idx_ai_msg_createdAt (createdAt)
);

-- 6) Ações sugeridas pela IA (com aprovação)
CREATE TABLE IF NOT EXISTS ai_actions (
  id CHAR(36) NOT NULL,
  insightId CHAR(36) NULL,
  actionType VARCHAR(60) NOT NULL,            -- ex: "CREATE_PURCHASE_REQUEST", "OPEN_NON_CONFORMITY"
  module VARCHAR(40) NOT NULL,                -- módulo que será afetado
  title VARCHAR(160) NOT NULL,
  rationale TEXT NOT NULL,                    -- justificativa
  payloadDraft JSON NOT NULL,                 -- rascunho do que será aplicado
  status VARCHAR(20) NOT NULL DEFAULT 'SUGGESTED', -- SUGGESTED|APPROVED|REJECTED|EXECUTED|CANCELLED|FAILED
  requestedBy CHAR(36) NULL,                  -- userId que pediu o insight/ação (ou null se automático)
  executedBy CHAR(36) NULL,                   -- userId executor (quando executado)
  executedAt DATETIME(3) NULL,
  errorMessage TEXT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NULL,

  PRIMARY KEY (id),
  INDEX idx_ai_actions_status (status),
  INDEX idx_ai_actions_module (module),
  INDEX idx_ai_actions_insight (insightId),
  INDEX idx_ai_actions_createdAt (createdAt)
);

-- 7) Aprovações de ações
CREATE TABLE IF NOT EXISTS ai_action_approvals (
  id CHAR(36) NOT NULL,
  actionId CHAR(36) NOT NULL,
  approverUserId CHAR(36) NOT NULL,
  decision VARCHAR(12) NOT NULL,              -- APPROVE|REJECT
  notes TEXT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  INDEX idx_ai_action_approvals_action (actionId),
  INDEX idx_ai_action_approvals_approver (approverUserId)
);

-- 8) Evidências normalizadas (polimórfico)
CREATE TABLE IF NOT EXISTS ai_sources (
  id CHAR(36) NOT NULL,
  insightId CHAR(36) NULL,
  messageId CHAR(36) NULL,
  actionId CHAR(36) NULL,

  sourceEntityType VARCHAR(60) NOT NULL,      -- ex: "producer_payables"
  sourceEntityId CHAR(36) NOT NULL,           -- id do registro
  label VARCHAR(180) NULL,                    -- ex: "Pagamento Produtor #123"
  url VARCHAR(500) NULL,                      -- link interno (rota do app)
  meta JSON NULL,                             -- ex: {producerId, skuId, status, dueDate}
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  INDEX idx_ai_sources_entity (sourceEntityType, sourceEntityId),
  INDEX idx_ai_sources_insight (insightId),
  INDEX idx_ai_sources_message (messageId),
  INDEX idx_ai_sources_action (actionId)
);

-- 9) Feedback (opcional, mas útil)
CREATE TABLE IF NOT EXISTS ai_feedback (
  id CHAR(36) NOT NULL,
  userId CHAR(36) NOT NULL,
  conversationId CHAR(36) NULL,
  messageId CHAR(36) NULL,
  insightId CHAR(36) NULL,
  rating VARCHAR(12) NOT NULL,                -- LIKE|DISLIKE
  comment TEXT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  INDEX idx_ai_feedback_user (userId),
  INDEX idx_ai_feedback_createdAt (createdAt)
);

-- 10) Settings específicos do Copiloto
CREATE TABLE IF NOT EXISTS ai_settings (
  id CHAR(36) NOT NULL,
  settingKey VARCHAR(80) NOT NULL,
  settingValue JSON NOT NULL,
  scope VARCHAR(16) NOT NULL DEFAULT 'GLOBAL', -- GLOBAL|USER|ROLE
  scopeId CHAR(36) NULL,                       -- userId ou roleId se aplicável
  updatedBy CHAR(36) NULL,
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  UNIQUE KEY uq_ai_settings_key_scope (settingKey, scope, scopeId)
);

-- =========================================================
-- PARTE 2: VIEWS PARA CONTEXTO DO COPILOTO
-- =========================================================

-- (1) Produção diária por SKU e turno
-- Nota: Ajustado para usar nomes de colunas do schema Drizzle
DROP VIEW IF EXISTS vw_daily_production_summary;
CREATE VIEW vw_daily_production_summary AS
SELECT
  pe.productionDate,
  pe.shift,
  pe.skuId,
  s.code AS skuCode,
  s.description AS skuName,
  s.variation AS skuVariation,
  SUM(pe.quantityProduced) AS totalQuantityProduced,
  COUNT(*) AS entriesCount
FROM production_entries pe
JOIN skus s ON s.id = pe.skuId
GROUP BY pe.productionDate, pe.shift, pe.skuId, s.code, s.description, s.variation;

-- (2) Status de pagamentos a produtores (inclui atraso)
DROP VIEW IF EXISTS vw_payables_status_summary;
CREATE VIEW vw_payables_status_summary AS
SELECT
  pp.producerId,
  p.name AS producerName,
  pp.status,
  pp.dueDate,
  COUNT(*) AS payablesCount,
  SUM(pp.totalValue) AS totalValueSum,
  SUM(CASE
        WHEN pp.status <> 'pago' AND pp.dueDate IS NOT NULL AND pp.dueDate < CURDATE() THEN 1
        ELSE 0
      END) AS overdueCount,
  SUM(CASE
        WHEN pp.status <> 'pago' AND pp.dueDate IS NOT NULL AND pp.dueDate < CURDATE() THEN pp.totalValue
        ELSE 0
      END) AS overdueValueSum
FROM producer_payables pp
JOIN producers p ON p.id = pp.producerId
GROUP BY pp.producerId, p.name, pp.status, pp.dueDate;

-- (3) Almoxarifado: itens abaixo do mínimo
DROP VIEW IF EXISTS vw_inventory_below_minimum_warehouse;
CREATE VIEW vw_inventory_below_minimum_warehouse AS
SELECT
  wi.id AS warehouseItemId,
  wi.name,
  wi.category,
  wi.unit,
  wi.warehouseType,
  wi.location,
  wi.currentStock,
  wi.minimumStock,
  (wi.minimumStock - wi.currentStock) AS deficit
FROM warehouse_items wi
WHERE wi.minimumStock IS NOT NULL
  AND wi.currentStock IS NOT NULL
  AND wi.currentStock < wi.minimumStock;

-- (4) Produto acabado: saldo total por SKU e abaixo do mínimo
DROP VIEW IF EXISTS vw_inventory_below_minimum_finished_goods;
CREATE VIEW vw_inventory_below_minimum_finished_goods AS
SELECT
  s.id AS skuId,
  s.code AS skuCode,
  s.description AS skuName,
  s.variation AS skuVariation,
  'kg' AS unit,
  s.minimumStock,
  COALESCE(SUM(fgi.quantity), 0) AS currentStock,
  (s.minimumStock - COALESCE(SUM(fgi.quantity), 0)) AS deficit
FROM skus s
LEFT JOIN finished_goods_inventory fgi
  ON fgi.skuId = s.id
  AND (fgi.status IS NULL OR fgi.status NOT IN ('vencido'))
WHERE s.status IS NULL OR s.status <> 'inativo'
GROUP BY s.id, s.code, s.description, s.variation, s.minimumStock
HAVING s.minimumStock IS NOT NULL
   AND COALESCE(SUM(fgi.quantity), 0) < s.minimumStock;

-- (5) Qualidade: resumo de não conformidades por período/categoria/área
-- Nota: Ajustado para usar nomes de colunas do schema Drizzle (identificationDate, origin, area)
DROP VIEW IF EXISTS vw_quality_nc_summary;
CREATE VIEW vw_quality_nc_summary AS
SELECT
  DATE_FORMAT(nc.identificationDate, '%Y-%m-01') AS monthStart,
  nc.origin AS category,
  nc.area AS affectedArea,
  'medium' AS severity,
  nc.status,
  COUNT(*) AS ncCount,
  SUM(CASE WHEN nc.status IN ('aberta', 'em_analise', 'acao_corretiva') THEN 1 ELSE 0 END) AS openCount
FROM non_conformities nc
GROUP BY DATE_FORMAT(nc.identificationDate, '%Y-%m-01'),
         nc.origin, nc.area, nc.status;

-- (6) Compras: pipeline por status/urgência/categoria
-- Nota: Ajustado para usar nomes de colunas do schema Drizzle (sector em vez de category, totalEstimated)
DROP VIEW IF EXISTS vw_purchases_pipeline_summary;
CREATE VIEW vw_purchases_pipeline_summary AS
SELECT
  pr.status,
  pr.urgency,
  pr.sector AS category,
  COUNT(*) AS requestCount,
  SUM(COALESCE(pr.totalEstimated, 0)) AS estimatedValueSum
FROM purchase_requests pr
GROUP BY pr.status, pr.urgency, pr.sector;

-- (7) Financeiro: vencimentos (próximos e atrasados) por status/tipo/categoria
-- Nota: Ajustado para usar nomes de colunas do schema Drizzle (entryType em vez de type, origin em vez de category)
DROP VIEW IF EXISTS vw_financial_due_summary;
CREATE VIEW vw_financial_due_summary AS
SELECT
  fe.status,
  fe.entryType AS type,
  fe.origin AS category,
  fe.dueDate,
  COUNT(*) AS entriesCount,
  SUM(fe.value) AS totalValueSum,
  SUM(CASE
        WHEN fe.status NOT IN ('pago', 'recebido', 'cancelado') AND fe.dueDate IS NOT NULL AND fe.dueDate < CURDATE() THEN 1
        ELSE 0
      END) AS overdueCount,
  SUM(CASE
        WHEN fe.status NOT IN ('pago', 'recebido', 'cancelado') AND fe.dueDate IS NOT NULL AND fe.dueDate < CURDATE() THEN fe.value
        ELSE 0
      END) AS overdueValueSum
FROM financial_entries fe
GROUP BY fe.status, fe.entryType, fe.origin, fe.dueDate;

-- =========================================================
-- PARTE 3: QUERIES DE VERIFICAÇÃO
-- =========================================================

-- Verificar tabelas ai_* criadas
SELECT 'VERIFICAÇÃO: Tabelas ai_*' AS info;
SHOW TABLES LIKE 'ai_%';

-- Verificar views criadas
SELECT 'VERIFICAÇÃO: Views' AS info;
SHOW FULL TABLES WHERE Table_type='VIEW';

-- Verificar contagem de registros nas views
SELECT 'VERIFICAÇÃO: Contagem de registros nas views' AS info;

SELECT 'vw_daily_production_summary' AS view_name, COUNT(*) AS cnt FROM vw_daily_production_summary;
SELECT 'vw_payables_status_summary' AS view_name, COUNT(*) AS cnt FROM vw_payables_status_summary;
SELECT 'vw_inventory_below_minimum_warehouse' AS view_name, COUNT(*) AS cnt FROM vw_inventory_below_minimum_warehouse;
SELECT 'vw_inventory_below_minimum_finished_goods' AS view_name, COUNT(*) AS cnt FROM vw_inventory_below_minimum_finished_goods;
SELECT 'vw_quality_nc_summary' AS view_name, COUNT(*) AS cnt FROM vw_quality_nc_summary;
SELECT 'vw_purchases_pipeline_summary' AS view_name, COUNT(*) AS cnt FROM vw_purchases_pipeline_summary;
SELECT 'vw_financial_due_summary' AS view_name, COUNT(*) AS cnt FROM vw_financial_due_summary;

-- =========================================================
-- FIM DA MIGRAÇÃO
-- =========================================================
SELECT 'MIGRAÇÃO CONCLUÍDA COM SUCESSO!' AS status;
