/**
 * MAGIC MOMENTS SERVICE
 * 
 * Implementa os 12 "Momentos Mágicos" que criam experiências WOW no sistema.
 * Cada momento é um trigger automático que gera notificações ou ações
 * quando condições específicas são atendidas.
 */

import { getDb } from '../db';
import { 
  users, producers, coconutLoads, productionEntries, financialEntries,
  warehouseItems, warehouseMovements, purchaseRequests, producerPayables,
  productionOrders, productionGoals, magicMoments, aiAlerts
} from '../../drizzle/schema';
import { eq, and, gte, lte, sql, desc, count, sum } from 'drizzle-orm';

// ============================================================================
// TIPOS
// ============================================================================
export interface MagicMoment {
  id: string;
  type: string;
  title: string;
  message: string;
  icon: string;
  color: 'green' | 'blue' | 'yellow' | 'red' | 'purple';
  targetUserId?: number;
  targetRole?: string;
  data?: Record<string, any>;
  priority: 'low' | 'medium' | 'high';
  expiresAt?: Date;
}

export interface MagicMomentConfig {
  enabled: boolean;
  minDataDays: number;
  notifyChannels: ('in_app' | 'email' | 'whatsapp')[];
}

// ============================================================================
// CONFIGURAÇÃO PADRÃO
// ============================================================================
const DEFAULT_CONFIG: MagicMomentConfig = {
  enabled: true,
  minDataDays: 7,
  notifyChannels: ['in_app']
};

// ============================================================================
// MOMENTO 1: SAUDAÇÃO PERSONALIZADA DO CEO
// ============================================================================
export async function checkCeoGreeting(userId: number): Promise<MagicMoment | null> {
  const db = await getDb();
  if (!db) return null;
  
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0] || user[0].role !== 'ceo') return null;
  
  const today = new Date();
  const hour = today.getHours();
  
  // Buscar métricas dos últimos 30 dias
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const [loadsResult] = await db.select({ 
    total: sum(coconutLoads.grossWeight) 
  }).from(coconutLoads)
    .where(gte(coconutLoads.receivedAt, thirtyDaysAgo));
  
  const [productionResult] = await db.select({ 
    total: sum(productionEntries.quantityProduced) 
  }).from(productionEntries)
    .where(gte(productionEntries.productionDate, thirtyDaysAgo));
  
  const totalReceived = parseFloat(loadsResult?.total || '0');
  const totalProduced = parseFloat(productionResult?.total || '0');
  
  let greeting = '';
  if (hour < 12) greeting = 'Bom dia';
  else if (hour < 18) greeting = 'Boa tarde';
  else greeting = 'Boa noite';
  
  const userName = user[0].name?.split(' ')[0] || 'Chefe';
  
  // Verificar se há dados suficientes
  if (totalReceived === 0 && totalProduced === 0) {
    return {
      id: 'ceo_greeting_no_data',
      type: 'ceo_greeting',
      title: `${greeting}, ${userName}!`,
      message: '📊 Ainda não há dados suficientes para mostrar métricas. Comece registrando cargas de coco ou apontamentos de produção.',
      icon: '👋',
      color: 'blue',
      targetUserId: userId,
      priority: 'medium',
      data: { hasData: false }
    };
  }
  
  // Calcular margem estimada (simplificado)
  const margin = totalProduced > 0 ? ((totalProduced / totalReceived) * 100) : 0;
  
  return {
    id: `ceo_greeting_${today.toISOString().split('T')[0]}`,
    type: 'ceo_greeting',
    title: `${greeting}, ${userName}!`,
    message: `📊 Últimos 30 dias: ${totalReceived.toLocaleString('pt-BR')} kg recebidos, ${totalProduced.toLocaleString('pt-BR')} kg produzidos. Rendimento: ${margin.toFixed(1)}%`,
    icon: '📈',
    color: 'green',
    targetUserId: userId,
    priority: 'high',
    data: { totalReceived, totalProduced, margin }
  };
}

// ============================================================================
// MOMENTO 2: CARGA RECEBIDA EM TEMPO RECORDE
// ============================================================================
export async function checkFastReceiving(loadId: number): Promise<MagicMoment | null> {
  const db = await getDb();
  if (!db) return null;
  
  const load = await db.select().from(coconutLoads).where(eq(coconutLoads.id, loadId)).limit(1);
  if (!load[0]) return null;
  
  // Calcular tempo de processamento (se tivermos timestamps)
  // Por enquanto, parabenizar qualquer carga registrada
  const producer = await db.select().from(producers).where(eq(producers.id, load[0].producerId)).limit(1);
  
  return {
    id: `fast_receiving_${loadId}`,
    type: 'fast_receiving',
    title: '⚡ Carga registrada!',
    message: `Carga de ${producer[0]?.name || 'produtor'} (${load[0].grossWeight}kg) registrada com sucesso.`,
    icon: '🚛',
    color: 'green',
    targetRole: 'recebimento',
    priority: 'low',
    data: { loadId, producerName: producer[0]?.name }
  };
}

// ============================================================================
// MOMENTO 3: META DO TURNO ATINGIDA
// ============================================================================
export async function checkShiftGoalAchieved(): Promise<MagicMoment | null> {
  const db = await getDb();
  if (!db) return null;
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Buscar metas ativas
  const goals = await db.select().from(productionGoals)
    .where(and(
      eq(productionGoals.status, 'ativa'),
      lte(productionGoals.startDate, sql`CURDATE()`),
      sql`(${productionGoals.endDate} IS NULL OR ${productionGoals.endDate} >= CURDATE())`
    ));
  
  if (goals.length === 0) {
    return {
      id: 'no_goals_configured',
      type: 'goal_reminder',
      title: '🎯 Configure metas de produção',
      message: 'Nenhuma meta de produção configurada. Vá em Produção > Metas para definir objetivos do turno.',
      icon: '⚙️',
      color: 'yellow',
      targetRole: 'producao',
      priority: 'medium',
      data: { configured: false }
    };
  }
  
  for (const goal of goals) {
    const achieved = parseFloat(goal.achievedQuantity || '0');
    const target = parseFloat(goal.targetQuantity);
    const progress = (achieved / target) * 100;
    
    if (progress >= 100) {
      return {
        id: `goal_achieved_${goal.id}_${todayStr}`,
        type: 'goal_achieved',
        title: '🎉 META ATINGIDA!',
        message: `Parabéns! Meta de ${goal.type} superada: ${achieved.toLocaleString('pt-BR')}kg de ${target.toLocaleString('pt-BR')}kg (${progress.toFixed(1)}%)`,
        icon: '🏆',
        color: 'green',
        targetRole: 'producao',
        priority: 'high',
        data: { goalId: goal.id, achieved, target, progress }
      };
    } else if (progress >= 90) {
      return {
        id: `goal_almost_${goal.id}_${todayStr}`,
        type: 'goal_almost',
        title: '🔥 Quase lá!',
        message: `Faltam apenas ${(target - achieved).toLocaleString('pt-BR')}kg para atingir a meta de ${goal.type}!`,
        icon: '💪',
        color: 'blue',
        targetRole: 'producao',
        priority: 'medium',
        data: { goalId: goal.id, remaining: target - achieved, progress }
      };
    }
  }
  
  return null;
}

// ============================================================================
// MOMENTO 4: PRODUTOR FIEL (ANIVERSÁRIO DE PARCERIA)
// ============================================================================
export async function checkProducerAnniversary(): Promise<MagicMoment[]> {
  const db = await getDb();
  if (!db) return [];
  
  const moments: MagicMoment[] = [];
  const today = new Date();
  
  const producersList = await db.select().from(producers)
    .where(eq(producers.status, 'ativo'));
  
  for (const producer of producersList) {
    if (!producer.createdAt) continue;
    
    const createdAt = new Date(producer.createdAt);
    const yearsPartner = Math.floor((today.getTime() - createdAt.getTime()) / (365 * 24 * 60 * 60 * 1000));
    
    // Verificar se é aniversário (mesmo dia e mês)
    if (createdAt.getDate() === today.getDate() && 
        createdAt.getMonth() === today.getMonth() && 
        yearsPartner > 0) {
      moments.push({
        id: `producer_anniversary_${producer.id}_${today.getFullYear()}`,
        type: 'producer_anniversary',
        title: `🎂 ${yearsPartner} ano(s) de parceria!`,
        message: `Hoje completamos ${yearsPartner} ano(s) de parceria com ${producer.name}. Considere enviar uma mensagem de agradecimento!`,
        icon: '🤝',
        color: 'purple',
        targetRole: 'recebimento',
        priority: 'medium',
        data: { producerId: producer.id, producerName: producer.name, years: yearsPartner }
      });
    }
  }
  
  return moments;
}

// ============================================================================
// MOMENTO 5: ESTOQUE CRÍTICO RESOLVIDO
// ============================================================================
export async function checkStockResolved(itemId: number): Promise<MagicMoment | null> {
  const db = await getDb();
  if (!db) return null;
  
  const item = await db.select().from(warehouseItems).where(eq(warehouseItems.id, itemId)).limit(1);
  if (!item[0]) return null;
  
  const currentStock = parseFloat(item[0].currentStock || '0');
  const minStock = parseFloat(item[0].minimumStock || '0');
  
  if (currentStock > minStock * 1.5) {
    return {
      id: `stock_resolved_${itemId}`,
      type: 'stock_resolved',
      title: '✅ Estoque normalizado!',
      message: `${item[0].name} agora tem ${currentStock} ${item[0].unit} em estoque (mínimo: ${minStock}).`,
      icon: '📦',
      color: 'green',
      targetRole: 'almox_geral',
      priority: 'low',
      data: { itemId, itemName: item[0].name, currentStock, minStock }
    };
  }
  
  return null;
}

// ============================================================================
// MOMENTO 6: PAGAMENTO APROVADO
// ============================================================================
export async function checkPaymentApproved(payableId: number): Promise<MagicMoment | null> {
  const db = await getDb();
  if (!db) return null;
  
  const payable = await db.select().from(producerPayables).where(eq(producerPayables.id, payableId)).limit(1);
  if (!payable[0] || payable[0].status !== 'aprovado') return null;
  
  const producer = await db.select().from(producers).where(eq(producers.id, payable[0].producerId)).limit(1);
  
  return {
    id: `payment_approved_${payableId}`,
    type: 'payment_approved',
    title: '💰 Pagamento aprovado!',
    message: `Pagamento de R$ ${parseFloat(payable[0].totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para ${producer[0]?.name || 'produtor'} foi aprovado.`,
    icon: '✅',
    color: 'green',
    targetRole: 'financeiro',
    priority: 'medium',
    data: { payableId, producerName: producer[0]?.name, value: payable[0].totalValue }
  };
}

// ============================================================================
// MOMENTO 7: COMPRA ENTREGUE
// ============================================================================
export async function checkPurchaseDelivered(requestId: number): Promise<MagicMoment | null> {
  const db = await getDb();
  if (!db) return null;
  
  const request = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, requestId)).limit(1);
  if (!request[0] || request[0].status !== 'entregue') return null;
  
  return {
    id: `purchase_delivered_${requestId}`,
    type: 'purchase_delivered',
    title: '📦 Compra recebida!',
    message: `Solicitação ${request[0].requestNumber} foi entregue e o estoque foi atualizado automaticamente.`,
    icon: '🚚',
    color: 'green',
    targetRole: 'almox_geral',
    priority: 'medium',
    data: { requestId, requestNumber: request[0].requestNumber }
  };
}

// ============================================================================
// MOMENTO 8: ORDEM DE PRODUÇÃO CONCLUÍDA
// ============================================================================
export async function checkProductionOrderCompleted(orderId: number): Promise<MagicMoment | null> {
  const db = await getDb();
  if (!db) return null;
  
  const order = await db.select().from(productionOrders).where(eq(productionOrders.id, orderId)).limit(1);
  if (!order[0] || order[0].status !== 'concluida') return null;
  
  const produced = parseFloat(order[0].producedQuantity || '0');
  const planned = parseFloat(order[0].plannedQuantity);
  const efficiency = (produced / planned) * 100;
  
  let message = `OP ${order[0].orderNumber} concluída: ${produced.toLocaleString('pt-BR')}kg produzidos.`;
  let color: 'green' | 'yellow' | 'red' = 'green';
  
  if (efficiency >= 100) {
    message += ` 🎯 Meta superada em ${(efficiency - 100).toFixed(1)}%!`;
  } else if (efficiency >= 90) {
    message += ` ✅ ${efficiency.toFixed(1)}% da meta.`;
  } else {
    message += ` ⚠️ Apenas ${efficiency.toFixed(1)}% da meta.`;
    color = 'yellow';
  }
  
  return {
    id: `op_completed_${orderId}`,
    type: 'op_completed',
    title: '🏭 Ordem de Produção Concluída',
    message,
    icon: '✅',
    color,
    targetRole: 'producao',
    priority: 'high',
    data: { orderId, orderNumber: order[0].orderNumber, produced, planned, efficiency }
  };
}

// ============================================================================
// MOMENTO 9: RECORDE DE PRODUÇÃO
// ============================================================================
export async function checkProductionRecord(): Promise<MagicMoment | null> {
  const db = await getDb();
  if (!db) return null;
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Produção de hoje
  const [todayProduction] = await db.select({ 
    total: sum(productionEntries.quantityProduced) 
  }).from(productionEntries)
    .where(sql`DATE(${productionEntries.productionDate}) = ${todayStr}`);
  
  const todayTotal = parseFloat(todayProduction?.total || '0');
  if (todayTotal === 0) return null;
  
  // Média dos últimos 30 dias
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const avgResult = await db.execute(sql`
    SELECT AVG(daily_total) as avg_daily
    FROM (
      SELECT DATE(productionDate) as day, SUM(quantityProduced) as daily_total
      FROM production_entries
      WHERE productionDate >= ${thirtyDaysAgo.toISOString().split('T')[0]}
      AND DATE(productionDate) < ${todayStr}
      GROUP BY DATE(productionDate)
    ) daily
  `);
  
  const avgDaily = parseFloat((avgResult[0] as any)[0]?.avg_daily || '0');
  
  if (avgDaily > 0 && todayTotal > avgDaily * 1.2) {
    return {
      id: `production_record_${todayStr}`,
      type: 'production_record',
      title: '🏆 RECORDE DE PRODUÇÃO!',
      message: `Hoje produzimos ${todayTotal.toLocaleString('pt-BR')}kg - ${((todayTotal/avgDaily - 1) * 100).toFixed(1)}% acima da média!`,
      icon: '🎉',
      color: 'green',
      targetRole: 'producao',
      priority: 'high',
      data: { todayTotal, avgDaily, percentAbove: ((todayTotal/avgDaily - 1) * 100) }
    };
  }
  
  return null;
}

// ============================================================================
// MOMENTO 10: PROBLEMA RESOLVIDO PELA IA
// ============================================================================
export async function checkAiProblemSolved(insightId: number): Promise<MagicMoment | null> {
  // Este momento é disparado quando um insight da IA é marcado como resolvido
  return {
    id: `ai_solved_${insightId}`,
    type: 'ai_problem_solved',
    title: '🤖 Problema resolvido!',
    message: 'O insight identificado pela IA foi resolvido. O sistema está aprendendo com suas ações.',
    icon: '✅',
    color: 'green',
    priority: 'low',
    data: { insightId }
  };
}

// ============================================================================
// MOMENTO 11: ECONOMIA IDENTIFICADA
// ============================================================================
export async function checkSavingsIdentified(): Promise<MagicMoment | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Comparar custos do mês atual com mês anterior
  const today = new Date();
  const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  
  const [thisMonthCosts] = await db.select({ 
    total: sum(financialEntries.value) 
  }).from(financialEntries)
    .where(and(
      eq(financialEntries.entryType, 'pagar'),
      gte(financialEntries.dueDate, firstDayThisMonth)
    ));
  
  const [lastMonthCosts] = await db.select({ 
    total: sum(financialEntries.value) 
  }).from(financialEntries)
    .where(and(
      eq(financialEntries.entryType, 'pagar'),
      gte(financialEntries.dueDate, firstDayLastMonth),
      lte(financialEntries.dueDate, firstDayThisMonth)
    ));
  
  const thisMonth = parseFloat(thisMonthCosts?.total || '0');
  const lastMonth = parseFloat(lastMonthCosts?.total || '0');
  
  if (lastMonth > 0 && thisMonth < lastMonth * 0.9) {
    const savings = lastMonth - thisMonth;
    return {
      id: `savings_${today.getFullYear()}_${today.getMonth()}`,
      type: 'savings_identified',
      title: '💰 Economia identificada!',
      message: `Despesas ${((1 - thisMonth/lastMonth) * 100).toFixed(1)}% menores que o mês anterior. Economia de R$ ${savings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      icon: '📉',
      color: 'green',
      targetRole: 'financeiro',
      priority: 'high',
      data: { thisMonth, lastMonth, savings }
    };
  }
  
  return null;
}

// ============================================================================
// MOMENTO 12: QUALIDADE EXCEPCIONAL
// ============================================================================
export async function checkExceptionalQuality(): Promise<MagicMoment | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Verificar se há cargas recentes com qualidade acima da média
  const recentLoads = await db.select().from(coconutLoads)
    .where(gte(coconutLoads.receivedAt, sql`DATE_SUB(NOW(), INTERVAL 7 DAY)`))
    .orderBy(desc(coconutLoads.receivedAt))
    .limit(10);
  
  if (recentLoads.length < 5) return null;
  
  // Calcular média de qualidade (usando netWeight/grossWeight como proxy)
  const avgQuality = recentLoads.reduce((sum, load) => {
    const net = parseFloat(load.netWeight || '0');
    const gross = parseFloat(load.grossWeight || '0');
    return sum + (gross > 0 ? (net / gross) * 100 : 0);
  }, 0) / recentLoads.length;
  
  if (avgQuality > 85) {
    return {
      id: `quality_exceptional_${new Date().toISOString().split('T')[0]}`,
      type: 'quality_exceptional',
      title: '⭐ Qualidade excepcional!',
      message: `Média de aproveitamento das últimas cargas: ${avgQuality.toFixed(1)}%. Excelente trabalho na seleção de produtores!`,
      icon: '🌟',
      color: 'green',
      targetRole: 'recebimento',
      priority: 'medium',
      data: { avgQuality, loadsAnalyzed: recentLoads.length }
    };
  }
  
  return null;
}

// ============================================================================
// EXECUTAR TODOS OS MOMENTOS MÁGICOS
// ============================================================================
export async function runAllMagicMoments(userId?: number): Promise<MagicMoment[]> {
  const moments: MagicMoment[] = [];
  
  try {
    // Momento 1: Saudação CEO (se for CEO)
    if (userId) {
      const ceoGreeting = await checkCeoGreeting(userId);
      if (ceoGreeting) moments.push(ceoGreeting);
    }
    
    // Momento 3: Meta do turno
    const goalMoment = await checkShiftGoalAchieved();
    if (goalMoment) moments.push(goalMoment);
    
    // Momento 4: Aniversários de produtores
    const anniversaries = await checkProducerAnniversary();
    moments.push(...anniversaries);
    
    // Momento 9: Recorde de produção
    const record = await checkProductionRecord();
    if (record) moments.push(record);
    
    // Momento 11: Economia identificada
    const savings = await checkSavingsIdentified();
    if (savings) moments.push(savings);
    
    // Momento 12: Qualidade excepcional
    const quality = await checkExceptionalQuality();
    if (quality) moments.push(quality);
    
  } catch (error) {
    console.error('Erro ao executar momentos mágicos:', error);
  }
  
  return moments;
}

// ============================================================================
// PERSISTIR MOMENTO MÁGICO
// ============================================================================
export async function persistMagicMoment(moment: MagicMoment): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  try {
    // Mapear tipo para enum válido
    const typeMap: Record<string, any> = {
      'ceo_greeting': 'fechamento_turno',
      'fast_receiving': 'pagamento_produtor',
      'goal_achieved': 'meta_batida',
      'goal_almost': 'meta_batida',
      'goal_reminder': 'meta_batida',
      'producer_anniversary': 'aniversario_parceria',
      'stock_resolved': 'estoque_critico',
      'payment_approved': 'pagamento_produtor',
      'purchase_delivered': 'estoque_critico',
      'op_completed': 'fechamento_turno',
      'production_record': 'novo_recorde',
      'ai_problem_solved': 'problema_evitado',
      'savings_identified': 'economia_identificada',
      'quality_exceptional': 'cliente_especial'
    };
    
    await db.insert(magicMoments).values({
      type: typeMap[moment.type] || 'fechamento_turno',
      title: moment.title,
      message: moment.message,
      data: moment.data || {},
      targetUserId: moment.targetUserId,
      targetRole: moment.targetRole,
    });
  } catch (error) {
    console.error('Erro ao persistir momento mágico:', error);
  }
}

// ============================================================================
// BUSCAR MOMENTOS MÁGICOS DO USUÁRIO
// ============================================================================
export async function getUserMagicMoments(userId: number, role: string): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const moments = await db.select().from(magicMoments)
      .where(and(
        sql`(${magicMoments.targetUserId} = ${userId} OR ${magicMoments.targetRole} = ${role} OR (${magicMoments.targetUserId} IS NULL AND ${magicMoments.targetRole} IS NULL))`,
        eq(magicMoments.seen, false)
      ))
      .orderBy(desc(magicMoments.createdAt))
      .limit(10);
    
    return moments;
  } catch (error) {
    console.error('Erro ao buscar momentos mágicos:', error);
    return [];
  }
}

// ============================================================================
// DISPENSAR MOMENTO MÁGICO
// ============================================================================
export async function dismissMagicMoment(momentId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.update(magicMoments)
      .set({ seen: true, seenAt: new Date() })
      .where(eq(magicMoments.id, momentId));
    return true;
  } catch (error) {
    console.error('Erro ao dispensar momento mágico:', error);
    return false;
  }
}
