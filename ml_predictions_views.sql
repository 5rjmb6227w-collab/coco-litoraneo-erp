-- ============================================================================
-- ML PREDICTIONS - VIEWS OTIMIZADAS COM ÍNDICES
-- ============================================================================

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_predictions_modelType ON ai_predictions(modelType);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_entityId ON ai_predictions(entityId);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_generatedAt ON ai_predictions(generatedAt);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_provider ON ai_predictions(provider);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_module_entityType ON ai_predictions(module, entityType);

-- ============================================================================
-- vw_production_trends - Tendências de produção com agregações históricas
-- ============================================================================
DROP VIEW IF EXISTS vw_production_trends;
CREATE VIEW vw_production_trends AS
SELECT 
  DATE_FORMAT(pe.createdAt, '%Y-%m') AS month,
  s.code AS sku_code,
  s.name AS sku_name,
  COUNT(pe.id) AS total_entries,
  SUM(pe.quantity) AS total_quantity,
  AVG(pe.quantity) AS avg_quantity,
  MIN(pe.quantity) AS min_quantity,
  MAX(pe.quantity) AS max_quantity,
  ROUND(STDDEV(pe.quantity), 2) AS stddev_quantity,
  ROUND((MAX(pe.quantity) - MIN(pe.quantity)) / AVG(pe.quantity) * 100, 2) AS variation_pct,
  COUNT(DISTINCT pe.productionLineId) AS distinct_lines,
  COUNT(DISTINCT pe.shift) AS distinct_shifts
FROM production_entries pe
LEFT JOIN skus s ON pe.skuId = s.id
WHERE pe.createdAt >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
GROUP BY month, s.id, s.code, s.name
ORDER BY month DESC, total_quantity DESC;

-- ============================================================================
-- vw_inventory_forecast - Previsão de estoque baseada em tendências
-- ============================================================================
DROP VIEW IF EXISTS vw_inventory_forecast;
CREATE VIEW vw_inventory_forecast AS
SELECT 
  wi.id,
  wi.code,
  wi.name,
  wi.currentStock,
  wi.minimumStock,
  wi.reorderPoint,
  ROUND((wi.currentStock / wi.minimumStock) * 100, 2) AS stock_level_pct,
  CASE 
    WHEN wi.currentStock <= wi.minimumStock THEN 'CRITICAL'
    WHEN wi.currentStock <= wi.reorderPoint THEN 'LOW'
    ELSE 'NORMAL'
  END AS stock_status,
  (SELECT AVG(quantity) FROM warehouse_movements wm 
   WHERE wm.warehouseItemId = wi.id 
   AND wm.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
   AND wm.movementType = 'saida') AS avg_daily_usage,
  ROUND(wi.currentStock / NULLIF((SELECT AVG(quantity) FROM warehouse_movements wm 
   WHERE wm.warehouseItemId = wi.id 
   AND wm.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
   AND wm.movementType = 'saida'), 0), 0) AS days_until_stockout,
  wi.updatedAt
FROM warehouse_items wi
WHERE wi.warehouseType = 'production'
ORDER BY stock_level_pct ASC;

-- ============================================================================
-- vw_demand_forecast_summary - Resumo de previsões de demanda
-- ============================================================================
DROP VIEW IF EXISTS vw_demand_forecast_summary;
CREATE VIEW vw_demand_forecast_summary AS
SELECT 
  ap.period,
  ap.module,
  ap.entityType,
  COUNT(*) AS total_predictions,
  ROUND(AVG(CAST(ap.accuracyEstimate AS DECIMAL(5,2))), 2) AS avg_accuracy,
  MIN(CAST(ap.accuracyEstimate AS DECIMAL(5,2))) AS min_accuracy,
  MAX(CAST(ap.accuracyEstimate AS DECIMAL(5,2))) AS max_accuracy,
  ROUND(AVG(ap.executionTimeMs), 0) AS avg_execution_time_ms,
  ap.provider,
  ap.generatedAt
FROM ai_predictions ap
WHERE ap.modelType = 'demand_forecast'
  AND ap.generatedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY ap.period, ap.module, ap.entityType, ap.provider
ORDER BY ap.generatedAt DESC;

-- ============================================================================
-- vw_model_accuracy_history - Histórico de acurácia dos modelos
-- ============================================================================
DROP VIEW IF EXISTS vw_model_accuracy_history;
CREATE VIEW vw_model_accuracy_history AS
SELECT 
  DATE(ap.generatedAt) AS prediction_date,
  ap.modelType,
  ap.module,
  COUNT(*) AS predictions_count,
  ROUND(AVG(CAST(ap.accuracyEstimate AS DECIMAL(5,2))), 2) AS avg_accuracy,
  ROUND(AVG(ap.executionTimeMs), 0) AS avg_execution_time_ms,
  ROUND(MIN(CAST(ap.executionTimeMs AS DECIMAL(10,2))), 0) AS min_execution_time_ms,
  ROUND(MAX(CAST(ap.executionTimeMs AS DECIMAL(10,2))), 0) AS max_execution_time_ms,
  ROUND(STDDEV(CAST(ap.accuracyEstimate AS DECIMAL(5,2))), 2) AS stddev_accuracy,
  ap.provider
FROM ai_predictions ap
WHERE ap.generatedAt >= DATE_SUB(NOW(), INTERVAL 90 DAY)
GROUP BY prediction_date, ap.modelType, ap.module, ap.provider
ORDER BY prediction_date DESC, ap.modelType;

-- ============================================================================
-- vw_prediction_quality_metrics - Métricas de qualidade das previsões
-- ============================================================================
DROP VIEW IF EXISTS vw_prediction_quality_metrics;
CREATE VIEW vw_prediction_quality_metrics AS
SELECT 
  ap.modelType,
  ap.module,
  ap.entityType,
  COUNT(*) AS total_predictions,
  ROUND(AVG(CAST(ap.accuracyEstimate AS DECIMAL(5,2))), 2) AS avg_accuracy,
  ROUND(AVG(CAST(ap.validationScore AS DECIMAL(5,2))), 2) AS avg_validation_score,
  ROUND(AVG(ap.executionTimeMs), 0) AS avg_execution_time_ms,
  COUNT(CASE WHEN ap.executionTimeMs > 500 THEN 1 END) AS slow_predictions,
  ROUND(COUNT(CASE WHEN ap.executionTimeMs > 500 THEN 1 END) / COUNT(*) * 100, 2) AS slow_prediction_pct,
  ap.provider,
  MAX(ap.generatedAt) AS last_prediction_at
FROM ai_predictions ap
WHERE ap.generatedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY ap.modelType, ap.module, ap.entityType, ap.provider
ORDER BY avg_accuracy DESC;

-- ============================================================================
-- vw_provider_performance - Comparação de performance entre providers
-- ============================================================================
DROP VIEW IF EXISTS vw_provider_performance;
CREATE VIEW vw_provider_performance AS
SELECT 
  ap.provider,
  ap.modelType,
  COUNT(*) AS predictions_count,
  ROUND(AVG(CAST(ap.accuracyEstimate AS DECIMAL(5,2))), 2) AS avg_accuracy,
  ROUND(AVG(ap.executionTimeMs), 0) AS avg_execution_time_ms,
  ROUND(MIN(ap.executionTimeMs), 0) AS min_execution_time_ms,
  ROUND(MAX(ap.executionTimeMs), 0) AS max_execution_time_ms,
  ROUND(STDDEV(ap.executionTimeMs), 0) AS stddev_execution_time_ms,
  ROUND(COUNT(CASE WHEN ap.executionTimeMs > 500 THEN 1 END) / COUNT(*) * 100, 2) AS timeout_pct
FROM ai_predictions ap
WHERE ap.generatedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY ap.provider, ap.modelType
ORDER BY avg_accuracy DESC, avg_execution_time_ms ASC;

-- ============================================================================
-- Verificações de performance
-- ============================================================================
SELECT 'Índices criados:' AS status;
SHOW INDEX FROM ai_predictions;

SELECT 'Views criadas:' AS status;
SHOW FULL TABLES WHERE Table_type='VIEW' AND Tables_in_coco_litoraneo LIKE 'vw_%prediction%';

SELECT 'Contagem de registros:' AS status;
SELECT COUNT(*) AS total_predictions FROM ai_predictions;
