/**
 * Agentes de IA Autônomos - Coco Litorâneo ERP
 * 
 * 6 Agentes especializados que monitoram e sugerem ações proativamente:
 * 1. Agente de Recebimento Inteligente
 * 2. Agente de Produção Autônomo
 * 3. Agente de Manutenção Preditiva
 * 4. Agente de Vendas/Demanda
 * 5. Agente de Compliance
 * 6. Agente de Custos
 */

import { getDb } from "../db";
import { 
  producers, coconutLoads, productionEntries, productionOrders, productionStops,
  equipments, maintenanceRecords, customers, salesOrders, salesOrderItems,
  complianceDocuments, productionCosts, warehouseItems, skus, aiInsights, aiAlerts,
  productionGoals, finishedGoodsInventory
} from "../../drizzle/schema";
import { eq, gte, lte, desc, sql, and, lt, isNull, count, avg, sum } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================
interface AgentAnalysis {
  agentName: string;
  analysisType: string;
  confidence: number;
  insights: AgentInsight[];
  alerts: AgentAlert[];
  suggestions: AgentSuggestion[];
  dataStatus: 'sufficient' | 'partial' | 'insufficient';
  dataMessage?: string;
}

interface AgentInsight {
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, unknown>;
}

interface AgentAlert {
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionRequired: boolean;
  suggestedAction?: string;
}

interface AgentSuggestion {
  action: string;
  reason: string;
  impact: string;
  effort: 'baixo' | 'medio' | 'alto';
  priority: number;
}

// ============================================================================
// AGENTE 1: RECEBIMENTO INTELIGENTE
// ============================================================================
export async function runReceivingAgent(): Promise<AgentAnalysis> {
  const insights: AgentInsight[] = [];
  const alerts: AgentAlert[] = [];
  const suggestions: AgentSuggestion[] = [];
  
  // Verificar se há dados suficientes
  const db = await getDb();
  if (!db) return { agentName: 'Agente de Recebimento Inteligente', analysisType: 'producer_analysis', confidence: 0, insights: [], alerts: [], suggestions: [], dataStatus: 'insufficient' as const, dataMessage: '⚠️ Banco de dados indisponível' };
  
  const producerCount = await db.select({ count: count() }).from(producers);
  const loadCount = await db.select({ count: count() }).from(coconutLoads);
  
  if (producerCount[0].count === 0) {
    return {
      agentName: 'Agente de Recebimento Inteligente',
      analysisType: 'producer_analysis',
      confidence: 0,
      insights: [],
      alerts: [],
      suggestions: [],
      dataStatus: 'insufficient',
      dataMessage: '⚠️ Nenhum produtor cadastrado. Cadastre produtores em Recebimento > Produtores para ativar este agente.'
    };
  }
  
  if (loadCount[0].count < 5) {
    return {
      agentName: 'Agente de Recebimento Inteligente',
      analysisType: 'producer_analysis',
      confidence: 30,
      insights: [{
        title: 'Dados insuficientes para análise completa',
        description: `Apenas ${loadCount[0].count} cargas registradas. Recomendamos pelo menos 10 cargas por produtor para análises precisas.`,
        severity: 'info'
      }],
      alerts: [],
      suggestions: [{
        action: 'Registrar mais cargas',
        reason: 'Histórico insuficiente para análises preditivas',
        impact: 'Habilitar previsões de volume e qualidade',
        effort: 'baixo',
        priority: 1
      }],
      dataStatus: 'partial',
      dataMessage: '📊 Dados parciais disponíveis. Continue registrando cargas para análises mais precisas.'
    };
  }
  
  // Análise de produtores com histórico
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Produtores que reduziram entregas
  const producerDeliveries = await db.execute(sql`
    SELECT 
      p.id, p.name,
      COUNT(CASE WHEN cl.receivedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as recent_loads,
      COUNT(CASE WHEN cl.receivedAt >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND cl.receivedAt < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as previous_loads,
      AVG(cl.netWeight) as avg_weight
    FROM producers p
    LEFT JOIN coconut_loads cl ON p.id = cl.producerId
    GROUP BY p.id, p.name
    HAVING previous_loads > 0
  `);
  
  const producerDeliveriesRows = producerDeliveries[0] as unknown as any[];
  for (const producer of producerDeliveriesRows) {
    if (producer.recent_loads < producer.previous_loads * 0.7) {
      alerts.push({
        title: `Produtor ${producer.name} reduziu entregas`,
        message: `Entregas caíram de ${producer.previous_loads} para ${producer.recent_loads} nos últimos 30 dias (-${Math.round((1 - producer.recent_loads/producer.previous_loads) * 100)}%)`,
        severity: 'medium',
        actionRequired: true,
        suggestedAction: 'Entrar em contato para verificar situação'
      });
    }
  }
  
  // Previsão de volume semanal
  const weeklyAvg = await db.execute(sql`
    SELECT 
      DAYOFWEEK(receivedAt) as day_of_week,
      AVG(netWeight) as avg_weight,
      COUNT(*) as load_count
    FROM coconut_loads
    WHERE receivedAt >= DATE_SUB(NOW(), INTERVAL 90 DAY)
    GROUP BY DAYOFWEEK(receivedAt)
  `);
  
  const weeklyAvgRows = weeklyAvg[0] as unknown as any[];
  if (weeklyAvgRows.length > 0) {
    const totalWeeklyAvg = weeklyAvgRows.reduce((sum: number, day: any) => sum + parseFloat(day.avg_weight || 0) * day.load_count, 0);
    insights.push({
      title: 'Previsão de recebimento semanal',
      description: `Baseado nos últimos 90 dias, estimamos receber aproximadamente ${Math.round(totalWeeklyAvg)} kg esta semana.`,
      severity: 'info',
      data: { weeklyAvg: weeklyAvgRows }
    });
  }
  
  // Sugestões baseadas em análise
  suggestions.push({
    action: 'Analisar qualidade histórica por produtor',
    reason: 'Identificar produtores com melhor qualidade para priorização',
    impact: 'Melhorar qualidade média da matéria-prima',
    effort: 'baixo',
    priority: 2
  });
  
  return {
    agentName: 'Agente de Recebimento Inteligente',
    analysisType: 'producer_analysis',
    confidence: 85,
    insights,
    alerts,
    suggestions,
    dataStatus: 'sufficient',
    dataMessage: '✅ Análise completa realizada com base no histórico de cargas.'
  };
}

// ============================================================================
// AGENTE 2: PRODUÇÃO AUTÔNOMO
// ============================================================================
export async function runProductionAgent(): Promise<AgentAnalysis> {
  const insights: AgentInsight[] = [];
  const alerts: AgentAlert[] = [];
  const suggestions: AgentSuggestion[] = [];
  
  const db = await getDb();
  if (!db) return { agentName: 'Agente de Produção Autônomo', analysisType: 'production_monitoring', confidence: 0, insights: [], alerts: [], suggestions: [], dataStatus: 'insufficient' as const, dataMessage: '⚠️ Banco de dados indisponível' };
  
  // Verificar dados de produção
  const productionCount = await db.select({ count: count() }).from(productionEntries);
  const orderCount = await db.select({ count: count() }).from(productionOrders);
  
  if (productionCount[0].count === 0) {
    return {
      agentName: 'Agente de Produção Autônomo',
      analysisType: 'production_monitoring',
      confidence: 0,
      insights: [],
      alerts: [],
      suggestions: [{
        action: 'Registrar apontamentos de produção',
        reason: 'Sem dados de produção para análise',
        impact: 'Habilitar monitoramento de rendimento e metas',
        effort: 'baixo',
        priority: 1
      }],
      dataStatus: 'insufficient',
      dataMessage: '⚠️ Nenhum apontamento de produção registrado. Vá em Produção > Apontamentos para começar.'
    };
  }
  
  // Análise de rendimento
  const yieldAnalysis = await db.execute(sql`
    SELECT 
      DATE(productionDate) as date,
      shift,
      SUM(quantityProduced) as total_produced,
      AVG(yieldPercent) as avg_yield
    FROM production_entries
    WHERE productionDate >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY DATE(productionDate), shift
    ORDER BY date DESC, shift
  `);
  
  // Verificar quedas de rendimento
  const recentYields = yieldAnalysis[0] as unknown as any[];
  if (recentYields.length >= 2) {
    const latestYield = parseFloat(recentYields[0]?.avg_yield || 0);
    const previousYield = parseFloat(recentYields[1]?.avg_yield || 0);
    
    if (latestYield < previousYield * 0.9 && previousYield > 0) {
      alerts.push({
        title: 'Queda de rendimento detectada',
        message: `Rendimento caiu de ${previousYield.toFixed(1)}% para ${latestYield.toFixed(1)}% (-${((1 - latestYield/previousYield) * 100).toFixed(1)}%)`,
        severity: 'high',
        actionRequired: true,
        suggestedAction: 'Verificar equipamentos e matéria-prima. Considerar pausa para manutenção.'
      });
    }
  }
  
  // Verificar metas do turno
  const todayGoals = await db.select()
    .from(productionGoals)
    .where(and(
      eq(productionGoals.status, 'ativa'),
      lte(productionGoals.startDate, sql`CURDATE()`),
      sql`(${productionGoals.endDate} IS NULL OR ${productionGoals.endDate} >= CURDATE())`
    ));
  
  if (todayGoals.length > 0) {
    for (const goal of todayGoals) {
      const progress = (parseFloat(goal.achievedQuantity || '0') / parseFloat(goal.targetQuantity)) * 100;
      if (progress < 50) {
        alerts.push({
          title: `Meta ${goal.type} abaixo de 50%`,
          message: `Produção atual: ${goal.achievedQuantity}kg de ${goal.targetQuantity}kg (${progress.toFixed(1)}%)`,
          severity: 'medium',
          actionRequired: true,
          suggestedAction: 'Avaliar capacidade e considerar hora extra ou realocação'
        });
      }
    }
  } else {
    suggestions.push({
      action: 'Configurar metas de produção',
      reason: 'Sem metas definidas para acompanhamento',
      impact: 'Permitir monitoramento de performance em tempo real',
      effort: 'baixo',
      priority: 1
    });
  }
  
  // Análise de paradas
  const stopsAnalysis = await db.select({
    reason: productionStops.reason,
    count: count(),
    totalMinutes: sum(productionStops.durationMinutes)
  })
  .from(productionStops)
  .where(gte(productionStops.stopDate, sql`DATE_SUB(CURDATE(), INTERVAL 30 DAY)`))
  .groupBy(productionStops.reason)
  .orderBy(desc(sum(productionStops.durationMinutes)));
  
  if (stopsAnalysis.length > 0) {
    const topStop = stopsAnalysis[0];
    insights.push({
      title: 'Principal causa de paradas',
      description: `"${topStop.reason}" causou ${topStop.count} paradas totalizando ${topStop.totalMinutes} minutos nos últimos 30 dias.`,
      severity: 'medium',
      data: { stopsAnalysis }
    });
  }
  
  return {
    agentName: 'Agente de Produção Autônomo',
    analysisType: 'production_monitoring',
    confidence: productionCount[0].count >= 20 ? 90 : 60,
    insights,
    alerts,
    suggestions,
    dataStatus: productionCount[0].count >= 10 ? 'sufficient' : 'partial',
    dataMessage: productionCount[0].count >= 10 
      ? '✅ Monitoramento ativo com dados suficientes.'
      : `📊 ${productionCount[0].count} apontamentos registrados. Continue para análises mais precisas.`
  };
}

// ============================================================================
// AGENTE 3: MANUTENÇÃO PREDITIVA
// ============================================================================
export async function runMaintenanceAgent(): Promise<AgentAnalysis> {
  const insights: AgentInsight[] = [];
  const alerts: AgentAlert[] = [];
  const suggestions: AgentSuggestion[] = [];
  
  const db = await getDb();
  if (!db) return { agentName: 'Agente de Manutenção Preditiva', analysisType: 'maintenance_prediction', confidence: 0, insights: [], alerts: [], suggestions: [], dataStatus: 'insufficient' as const, dataMessage: '⚠️ Banco de dados indisponível' };
  
  // Verificar equipamentos cadastrados
  const equipmentCount = await db.select({ count: count() }).from(equipments);
  
  if (equipmentCount[0].count === 0) {
    return {
      agentName: 'Agente de Manutenção Preditiva',
      analysisType: 'maintenance_prediction',
      confidence: 0,
      insights: [],
      alerts: [],
      suggestions: [{
        action: 'Cadastrar equipamentos',
        reason: 'Sem equipamentos para monitorar',
        impact: 'Habilitar previsão de falhas e manutenção preventiva',
        effort: 'medio',
        priority: 1
      }],
      dataStatus: 'insufficient',
      dataMessage: '⚠️ Nenhum equipamento cadastrado. Vá em Produção > Equipamentos para cadastrar.'
    };
  }
  
  // Verificar manutenções vencidas ou próximas
  const equipmentsMaintenance = await db.select()
    .from(equipments)
    .where(eq(equipments.status, 'operacional'));
  
  const today = new Date();
  
  for (const equip of equipmentsMaintenance) {
    if (equip.nextMaintenanceDate) {
      const nextMaint = new Date(equip.nextMaintenanceDate);
      const daysUntil = Math.ceil((nextMaint.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil < 0) {
        alerts.push({
          title: `Manutenção VENCIDA: ${equip.name}`,
          message: `Manutenção preventiva atrasada há ${Math.abs(daysUntil)} dias`,
          severity: 'critical',
          actionRequired: true,
          suggestedAction: 'Agendar manutenção imediatamente para evitar quebras'
        });
      } else if (daysUntil <= 7) {
        alerts.push({
          title: `Manutenção próxima: ${equip.name}`,
          message: `Manutenção preventiva em ${daysUntil} dias`,
          severity: 'medium',
          actionRequired: true,
          suggestedAction: 'Agendar manutenção para horário de menor impacto'
        });
      }
    }
  }
  
  // Análise de padrões de falhas
  const failurePatterns = await db.execute(sql`
    SELECT 
      e.name as equipment_name,
      e.id as equipment_id,
      COUNT(mr.id) as failure_count,
      AVG(mr.downtimeMinutes) as avg_downtime,
      MAX(mr.completedAt) as last_failure
    FROM equipments e
    LEFT JOIN maintenance_records mr ON e.id = mr.equipmentId AND mr.type = 'corretiva'
    WHERE mr.completedAt >= DATE_SUB(NOW(), INTERVAL 180 DAY)
    GROUP BY e.id, e.name
    HAVING failure_count >= 3
    ORDER BY failure_count DESC
  `);
  
  const failurePatternsRows = failurePatterns[0] as unknown as any[];
  for (const pattern of failurePatternsRows) {
    insights.push({
      title: `Equipamento com falhas recorrentes: ${pattern.equipment_name}`,
      description: `${pattern.failure_count} falhas nos últimos 6 meses, média de ${Math.round(pattern.avg_downtime)} min de parada cada.`,
      severity: 'high',
      data: pattern
    });
    
    suggestions.push({
      action: `Avaliar substituição ou reforma de ${pattern.equipment_name}`,
      reason: 'Padrão de falhas indica desgaste avançado',
      impact: `Reduzir ${pattern.failure_count * Math.round(pattern.avg_downtime)} min de paradas/semestre`,
      effort: 'alto',
      priority: 2
    });
  }
  
  // Custo de manutenção vs prevenção
  const maintenanceCosts = await db.execute(sql`
    SELECT 
      type,
      COUNT(*) as count,
      SUM(COALESCE(cost, 0)) as total_cost,
      SUM(COALESCE(downtimeMinutes, 0)) as total_downtime
    FROM maintenance_records
    WHERE completedAt >= DATE_SUB(NOW(), INTERVAL 365 DAY)
    GROUP BY type
  `);
  
  const maintenanceCostsRows = maintenanceCosts[0] as unknown as any[];
  if (maintenanceCostsRows.length > 0) {
    insights.push({
      title: 'Análise de custos de manutenção (12 meses)',
      description: 'Comparativo entre manutenções preventivas e corretivas',
      severity: 'info',
      data: { costs: maintenanceCostsRows }
    });
  }
  
  return {
    agentName: 'Agente de Manutenção Preditiva',
    analysisType: 'maintenance_prediction',
    confidence: equipmentCount[0].count >= 5 ? 80 : 50,
    insights,
    alerts,
    suggestions,
    dataStatus: equipmentCount[0].count >= 3 ? 'sufficient' : 'partial',
    dataMessage: equipmentCount[0].count >= 3
      ? '✅ Monitoramento de equipamentos ativo.'
      : `📊 ${equipmentCount[0].count} equipamentos cadastrados. Cadastre mais para análises completas.`
  };
}

// ============================================================================
// AGENTE 4: VENDAS/DEMANDA
// ============================================================================
export async function runSalesAgent(): Promise<AgentAnalysis> {
  const insights: AgentInsight[] = [];
  const alerts: AgentAlert[] = [];
  const suggestions: AgentSuggestion[] = [];
  
  const db = await getDb();
  if (!db) return { agentName: 'Agente de Vendas/Demanda', analysisType: 'demand_forecast', confidence: 0, insights: [], alerts: [], suggestions: [], dataStatus: 'insufficient' as const, dataMessage: '⚠️ Banco de dados indisponível' };
  
  // Verificar clientes e pedidos
  const customerCount = await db.select({ count: count() }).from(customers);
  const orderCount = await db.select({ count: count() }).from(salesOrders);
  
  if (customerCount[0].count === 0) {
    return {
      agentName: 'Agente de Vendas/Demanda',
      analysisType: 'demand_forecast',
      confidence: 0,
      insights: [],
      alerts: [],
      suggestions: [{
        action: 'Cadastrar clientes',
        reason: 'Sem clientes para análise de demanda',
        impact: 'Habilitar previsão de demanda e identificação de oportunidades',
        effort: 'medio',
        priority: 1
      }],
      dataStatus: 'insufficient',
      dataMessage: '⚠️ Nenhum cliente cadastrado. Vá em Vendas > Clientes para cadastrar.'
    };
  }
  
  if (orderCount[0].count < 5) {
    return {
      agentName: 'Agente de Vendas/Demanda',
      analysisType: 'demand_forecast',
      confidence: 20,
      insights: [{
        title: 'Histórico de vendas insuficiente',
        description: `Apenas ${orderCount[0].count} pedidos registrados. Recomendamos pelo menos 20 pedidos para previsões precisas.`,
        severity: 'info'
      }],
      alerts: [],
      suggestions: [{
        action: 'Registrar pedidos de venda',
        reason: 'Histórico insuficiente para previsões',
        impact: 'Habilitar forecast de demanda semanal/mensal',
        effort: 'baixo',
        priority: 1
      }],
      dataStatus: 'partial',
      dataMessage: '📊 Dados parciais. Continue registrando pedidos para previsões mais precisas.'
    };
  }
  
  // Clientes que reduziram pedidos
  const customerTrends = await db.execute(sql`
    SELECT 
      c.id, c.name,
      COUNT(CASE WHEN so.orderDate >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as recent_orders,
      COUNT(CASE WHEN so.orderDate >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND so.orderDate < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as previous_orders,
      SUM(CASE WHEN so.orderDate >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN so.netValue ELSE 0 END) as recent_value,
      SUM(CASE WHEN so.orderDate >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND so.orderDate < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN so.netValue ELSE 0 END) as previous_value
    FROM customers c
    LEFT JOIN sales_orders so ON c.id = so.customerId AND so.status NOT IN ('cancelado', 'orcamento')
    GROUP BY c.id, c.name
    HAVING previous_orders > 0
  `);
  
  const customerTrendsRows = customerTrends[0] as unknown as any[];
  for (const customer of customerTrendsRows) {
    if (customer.recent_orders < customer.previous_orders * 0.5 && customer.previous_orders >= 2) {
      alerts.push({
        title: `Cliente ${customer.name} reduziu pedidos`,
        message: `Pedidos caíram de ${customer.previous_orders} para ${customer.recent_orders} no último mês`,
        severity: 'medium',
        actionRequired: true,
        suggestedAction: 'Entrar em contato para entender motivo e recuperar cliente'
      });
    }
    
    // Cliente com pedido maior que média
    if (customer.recent_value > customer.previous_value * 1.5 && customer.previous_value > 0) {
      insights.push({
        title: `Cliente ${customer.name} aumentou pedidos`,
        description: `Valor aumentou ${Math.round((customer.recent_value/customer.previous_value - 1) * 100)}% no último mês. Pode indicar promoção ou expansão.`,
        severity: 'info',
        data: customer
      });
      
      suggestions.push({
        action: `Contatar ${customer.name} para confirmar demanda futura`,
        reason: 'Aumento significativo pode indicar oportunidade de parceria',
        impact: 'Fidelização e previsibilidade de demanda',
        effort: 'baixo',
        priority: 1
      });
    }
  }
  
  // Previsão de demanda
  const demandForecast = await db.execute(sql`
    SELECT 
      WEEK(orderDate) as week_num,
      SUM(netValue) as total_value,
      COUNT(*) as order_count
    FROM sales_orders
    WHERE orderDate >= DATE_SUB(NOW(), INTERVAL 90 DAY)
      AND status NOT IN ('cancelado', 'orcamento')
    GROUP BY WEEK(orderDate)
    ORDER BY week_num
  `);
  
  const demandForecastRows = demandForecast[0] as unknown as any[];
  if (demandForecastRows.length >= 4) {
    const avgWeeklyValue = demandForecastRows.reduce((sum: number, w: any) => sum + parseFloat(w.total_value), 0) / demandForecastRows.length;
    insights.push({
      title: 'Previsão de demanda semanal',
      description: `Média semanal dos últimos 90 dias: R$ ${avgWeeklyValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      severity: 'info',
      data: { forecast: demandForecastRows, avgWeeklyValue }
    });
  }
  
  // Produtos com estoque alto - oportunidade de promoção
  const highStock = await db.execute(sql`
    SELECT 
      s.name as sku_name,
      fgi.currentStock,
      fgi.minimumStock,
      (fgi.currentStock / NULLIF(fgi.minimumStock, 0)) as stock_ratio
    FROM finished_goods_inventory fgi
    JOIN skus s ON fgi.skuId = s.id
    WHERE fgi.currentStock > fgi.minimumStock * 3
    ORDER BY stock_ratio DESC
    LIMIT 5
  `);
  
  const highStockRows = highStock[0] as unknown as any[];
  for (const item of highStockRows) {
    suggestions.push({
      action: `Considerar promoção de ${item.sku_name}`,
      reason: `Estoque ${item.stock_ratio?.toFixed(1)}x acima do mínimo`,
      impact: 'Liberar capital e espaço de armazenagem',
      effort: 'baixo',
      priority: 3
    });
  }
  
  return {
    agentName: 'Agente de Vendas/Demanda',
    analysisType: 'demand_forecast',
    confidence: orderCount[0].count >= 20 ? 85 : 50,
    insights,
    alerts,
    suggestions,
    dataStatus: orderCount[0].count >= 10 ? 'sufficient' : 'partial',
    dataMessage: orderCount[0].count >= 10
      ? '✅ Análise de demanda ativa com dados suficientes.'
      : `📊 ${orderCount[0].count} pedidos registrados. Continue para previsões mais precisas.`
  };
}

// ============================================================================
// AGENTE 5: COMPLIANCE
// ============================================================================
export async function runComplianceAgent(): Promise<AgentAnalysis> {
  const insights: AgentInsight[] = [];
  const alerts: AgentAlert[] = [];
  const suggestions: AgentSuggestion[] = [];
  
  const db = await getDb();
  if (!db) return { agentName: 'Agente de Compliance', analysisType: 'compliance_monitoring', confidence: 0, insights: [], alerts: [], suggestions: [], dataStatus: 'insufficient' as const, dataMessage: '⚠️ Banco de dados indisponível' };
  
  // Verificar documentos cadastrados
  const docCount = await db.select({ count: count() }).from(complianceDocuments);
  
  if (docCount[0].count === 0) {
    return {
      agentName: 'Agente de Compliance',
      analysisType: 'compliance_monitoring',
      confidence: 0,
      insights: [],
      alerts: [],
      suggestions: [{
        action: 'Cadastrar documentos de compliance',
        reason: 'Sem documentos para monitorar vencimentos',
        impact: 'Evitar multas e interdições por documentação vencida',
        effort: 'medio',
        priority: 1
      }],
      dataStatus: 'insufficient',
      dataMessage: '⚠️ Nenhum documento cadastrado. Vá em Compliance > Documentos para cadastrar alvarás, licenças e certificados.'
    };
  }
  
  const today = new Date();
  
  // Documentos vencidos ou próximos do vencimento
  const documents = await db.select().from(complianceDocuments);
  
  let vencidos = 0;
  let proximos = 0;
  
  for (const doc of documents) {
    if (doc.expirationDate) {
      const expDate = new Date(doc.expirationDate);
      const daysUntil = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const alertDays = doc.renewalAlertDays || 30;
      
      if (daysUntil < 0) {
        vencidos++;
        alerts.push({
          title: `DOCUMENTO VENCIDO: ${doc.name}`,
          message: `${doc.type.toUpperCase()} vencido há ${Math.abs(daysUntil)} dias. Número: ${doc.documentNumber || 'N/A'}`,
          severity: 'critical',
          actionRequired: true,
          suggestedAction: 'Providenciar renovação URGENTE para evitar penalidades'
        });
      } else if (daysUntil <= alertDays) {
        proximos++;
        alerts.push({
          title: `Documento vencendo: ${doc.name}`,
          message: `${doc.type} vence em ${daysUntil} dias (${expDate.toLocaleDateString('pt-BR')})`,
          severity: daysUntil <= 7 ? 'high' : 'medium',
          actionRequired: true,
          suggestedAction: 'Iniciar processo de renovação'
        });
      }
    }
  }
  
  // Resumo de compliance
  insights.push({
    title: 'Status de Compliance',
    description: `${documents.length} documentos cadastrados. ${vencidos} vencidos, ${proximos} próximos do vencimento.`,
    severity: vencidos > 0 ? 'critical' : (proximos > 0 ? 'medium' : 'info'),
    data: { total: documents.length, vencidos, proximos }
  });
  
  // Verificar documentos de fornecedores (se houver)
  // TODO: Integrar com cadastro de fornecedores quando implementado
  
  // Sugestões de melhoria
  if (documents.filter((d: typeof documents[0]) => d.type === 'certificado').length === 0) {
    suggestions.push({
      action: 'Avaliar certificações de qualidade',
      reason: 'Nenhum certificado cadastrado (ISO, Orgânico, etc)',
      impact: 'Diferencial competitivo e acesso a novos mercados',
      effort: 'alto',
      priority: 3
    });
  }
  
  return {
    agentName: 'Agente de Compliance',
    analysisType: 'compliance_monitoring',
    confidence: 95,
    insights,
    alerts,
    suggestions,
    dataStatus: 'sufficient',
    dataMessage: '✅ Monitoramento de compliance ativo.'
  };
}

// ============================================================================
// AGENTE 6: CUSTOS
// ============================================================================
export async function runCostsAgent(): Promise<AgentAnalysis> {
  const insights: AgentInsight[] = [];
  const alerts: AgentAlert[] = [];
  const suggestions: AgentSuggestion[] = [];
  
  const db = await getDb();
  if (!db) return { agentName: 'Agente de Custos', analysisType: 'cost_analysis', confidence: 0, insights: [], alerts: [], suggestions: [], dataStatus: 'insufficient' as const, dataMessage: '⚠️ Banco de dados indisponível' };
  
  // Verificar dados de custos
  const costCount = await db.select({ count: count() }).from(productionCosts);
  
  if (costCount[0].count === 0) {
    return {
      agentName: 'Agente de Custos',
      analysisType: 'cost_analysis',
      confidence: 0,
      insights: [],
      alerts: [],
      suggestions: [{
        action: 'Registrar custos de produção',
        reason: 'Sem dados de custos para análise',
        impact: 'Habilitar análise de rentabilidade e identificação de desvios',
        effort: 'medio',
        priority: 1
      }],
      dataStatus: 'insufficient',
      dataMessage: '⚠️ Nenhum custo de produção registrado. Os custos são calculados automaticamente ao fechar ordens de produção.'
    };
  }
  
  // Análise de variação de custos
  const costVariance = await db.execute(sql`
    SELECT 
      s.name as sku_name,
      AVG(pc.unitCost) as avg_unit_cost,
      AVG(pc.standardUnitCost) as avg_standard_cost,
      AVG(pc.costVariancePercent) as avg_variance,
      COUNT(*) as batch_count
    FROM production_costs pc
    JOIN skus s ON pc.skuId = s.id
    WHERE pc.productionDate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY pc.skuId, s.name
    HAVING avg_variance IS NOT NULL
    ORDER BY ABS(avg_variance) DESC
  `);
  
  const costVarianceRows = costVariance[0] as unknown as any[];
  for (const cost of costVarianceRows) {
    const variance = parseFloat(cost.avg_variance || 0);
    if (Math.abs(variance) > 10) {
      alerts.push({
        title: `Desvio de custo: ${cost.sku_name}`,
        message: `Custo real ${variance > 0 ? 'acima' : 'abaixo'} do padrão em ${Math.abs(variance).toFixed(1)}%`,
        severity: Math.abs(variance) > 20 ? 'high' : 'medium',
        actionRequired: true,
        suggestedAction: variance > 0 
          ? 'Investigar causas do aumento (matéria-prima, rendimento, energia)'
          : 'Verificar se economia é sustentável ou indica problema de qualidade'
      });
    }
  }
  
  // Tendência de custos por insumo
  const inputCostTrend = await db.execute(sql`
    SELECT 
      wi.name as item_name,
      AVG(CASE WHEN wm.movementDate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN wm.unitCost END) as recent_cost,
      AVG(CASE WHEN wm.movementDate >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) AND wm.movementDate < DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN wm.unitCost END) as previous_cost
    FROM warehouse_items wi
    JOIN warehouse_movements wm ON wi.id = wm.warehouseItemId AND wm.type = 'entrada'
    WHERE wi.category = 'producao'
    GROUP BY wi.id, wi.name
    HAVING recent_cost IS NOT NULL AND previous_cost IS NOT NULL
  `);
  
  const inputCostTrendRows = inputCostTrend[0] as unknown as any[];
  for (const trend of inputCostTrendRows) {
    const recentCost = parseFloat(trend.recent_cost || 0);
    const previousCost = parseFloat(trend.previous_cost || 0);
    
    if (previousCost > 0 && recentCost > previousCost * 1.15) {
      alerts.push({
        title: `Aumento de custo: ${trend.item_name}`,
        message: `Custo médio subiu ${((recentCost/previousCost - 1) * 100).toFixed(1)}% no último mês`,
        severity: 'medium',
        actionRequired: true,
        suggestedAction: 'Buscar fornecedores alternativos ou renegociar'
      });
    }
  }
  
  // Comparação com mercado (simulado - em produção viria de API externa)
  suggestions.push({
    action: 'Configurar benchmarks de mercado',
    reason: 'Comparar custos com referências do setor',
    impact: 'Identificar oportunidades de economia',
    effort: 'medio',
    priority: 2
  });
  
  // Resumo de custos
  const costSummary = await db.execute(sql`
    SELECT 
      SUM(totalCost) as total_cost,
      SUM(quantityProduced) as total_produced,
      AVG(unitCost) as avg_unit_cost
    FROM production_costs
    WHERE productionDate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
  `);
  
  const costSummaryRows = costSummary[0] as unknown as any[];
  if (costSummaryRows[0]?.total_cost) {
    const summary = costSummaryRows[0];
    insights.push({
      title: 'Resumo de custos (30 dias)',
      description: `Custo total: R$ ${parseFloat(summary.total_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Produção: ${parseFloat(summary.total_produced).toLocaleString('pt-BR')} kg | Custo médio: R$ ${parseFloat(summary.avg_unit_cost).toFixed(4)}/kg`,
      severity: 'info',
      data: summary
    });
  }
  
  return {
    agentName: 'Agente de Custos',
    analysisType: 'cost_analysis',
    confidence: costCount[0].count >= 10 ? 85 : 50,
    insights,
    alerts,
    suggestions,
    dataStatus: costCount[0].count >= 5 ? 'sufficient' : 'partial',
    dataMessage: costCount[0].count >= 5
      ? '✅ Análise de custos ativa.'
      : `📊 ${costCount[0].count} registros de custo. Continue para análises mais precisas.`
  };
}

// ============================================================================
// EXECUTOR DE TODOS OS AGENTES
// ============================================================================
export async function runAllAgents(): Promise<AgentAnalysis[]> {
  const results: AgentAnalysis[] = [];
  
  try {
    results.push(await runReceivingAgent());
  } catch (error) {
    console.error('Erro no Agente de Recebimento:', error);
  }
  
  try {
    results.push(await runProductionAgent());
  } catch (error) {
    console.error('Erro no Agente de Produção:', error);
  }
  
  try {
    results.push(await runMaintenanceAgent());
  } catch (error) {
    console.error('Erro no Agente de Manutenção:', error);
  }
  
  try {
    results.push(await runSalesAgent());
  } catch (error) {
    console.error('Erro no Agente de Vendas:', error);
  }
  
  try {
    results.push(await runComplianceAgent());
  } catch (error) {
    console.error('Erro no Agente de Compliance:', error);
  }
  
  try {
    results.push(await runCostsAgent());
  } catch (error) {
    console.error('Erro no Agente de Custos:', error);
  }
  
  return results;
}

// ============================================================================
// PERSISTIR INSIGHTS E ALERTAS DOS AGENTES
// ============================================================================
export async function persistAgentFindings(analysis: AgentAnalysis, userId?: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Persistir insights
  for (const insight of analysis.insights) {
    const severityMap: Record<string, 'info' | 'warning' | 'critical'> = {
      'info': 'info',
      'low': 'info',
      'medium': 'warning',
      'high': 'warning',
      'critical': 'critical'
    };
    await db.insert(aiInsights).values({
      insightType: analysis.analysisType,
      severity: severityMap[insight.severity] || 'info',
      title: insight.title,
      summary: insight.description,
      details: insight.data || {},
      module: analysis.agentName.toLowerCase().replace(/\s+/g, '_'),
      status: 'active',
    });
  }
  
  // Persistir alertas
  for (const alert of analysis.alerts) {
    await db.insert(aiAlerts).values({
      alertType: analysis.analysisType,
      channel: 'in_app',
      title: alert.title,
      message: `${alert.message}${alert.suggestedAction ? '\n\nAção sugerida: ' + alert.suggestedAction : ''}`,
      status: 'pending',
    });
  }
}
