/**
 * PRODUCTION SERVICE - MÓDULO DE PRODUÇÃO EXPANDIDO
 * 
 * Implementa funcionalidades avançadas de produção:
 * - Ordens de Produção (OP)
 * - Kanban Digital
 * - Checklists de Turno
 * - Metas de Produção
 * - Controle de Paradas
 * - Reprocesso
 * - Custos de Produção
 */

import { getDb } from '../db';
import { 
  productionOrders, productionGoals, productionStops,
  productionReprocesses, productionCosts, shiftChecklists, checklistItems,
  equipments, productionEntries, users
} from '../../drizzle/schema';
import { eq, and, gte, lte, sql, desc, asc, count, sum } from 'drizzle-orm';

// ============================================================================
// ORDENS DE PRODUÇÃO
// ============================================================================

/**
 * Gera próximo número de OP
 */
async function generateOrderNumber(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const year = new Date().getFullYear();
  const [lastOrder] = await db.select({ orderNumber: productionOrders.orderNumber })
    .from(productionOrders)
    .where(sql`${productionOrders.orderNumber} LIKE ${`OP-${year}-%`}`)
    .orderBy(desc(productionOrders.id))
    .limit(1);
  
  let sequence = 1;
  if (lastOrder?.orderNumber) {
    const parts = lastOrder.orderNumber.split('-');
    sequence = parseInt(parts[2] || '0') + 1;
  }
  
  return `OP-${year}-${sequence.toString().padStart(5, '0')}`;
}

/**
 * Criar nova Ordem de Produção
 */
export async function createProductionOrder(input: {
  skuId: number;
  variation: 'flocos' | 'medio' | 'fino';
  plannedQuantity: number;
  plannedStartDate: Date;
  plannedEndDate?: Date;
  priority?: 'baixa' | 'normal' | 'alta' | 'urgente';
  observations?: string;
  createdBy: number;
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const orderNumber = await generateOrderNumber();
  
  const [result] = await db.insert(productionOrders).values({
    orderNumber,
    skuId: input.skuId,
    variation: input.variation,
    plannedQuantity: input.plannedQuantity.toString(),
    plannedStartDate: input.plannedStartDate,
    plannedEndDate: input.plannedEndDate,
    priority: input.priority || 'normal',
    observations: input.observations,
    createdBy: input.createdBy,
  });
  
  return { id: result.insertId, orderNumber };
}

/**
 * Listar Ordens de Produção
 */
export async function listProductionOrders(filters?: {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  priority?: string;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(productionOrders);
  
  const conditions = [];
  if (filters?.status) conditions.push(eq(productionOrders.status, filters.status as any));
  if (filters?.priority) conditions.push(eq(productionOrders.priority, filters.priority as any));
  if (filters?.startDate) conditions.push(gte(productionOrders.plannedStartDate, filters.startDate));
  if (filters?.endDate) conditions.push(lte(productionOrders.plannedStartDate, filters.endDate));
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(desc(productionOrders.createdAt));
}

/**
 * Atualizar status da OP
 */
export async function updateOrderStatus(
  orderId: number, 
  status: 'aguardando' | 'em_producao' | 'qualidade' | 'concluida' | 'cancelada',
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const updates: any = { status };
  
  if (status === 'em_producao') {
    updates.actualStartDate = new Date();
  } else if (status === 'concluida') {
    updates.actualEndDate = new Date();
  }
  
  await db.update(productionOrders)
    .set(updates)
    .where(eq(productionOrders.id, orderId));
  
  return true;
}

/**
 * Atualizar quantidade produzida
 */
export async function updateProducedQuantity(orderId: number, quantity: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const [order] = await db.select().from(productionOrders).where(eq(productionOrders.id, orderId));
  if (!order) return false;
  
  const currentProduced = parseFloat(order.producedQuantity || '0');
  const newTotal = currentProduced + quantity;
  
  await db.update(productionOrders)
    .set({ producedQuantity: newTotal.toString() })
    .where(eq(productionOrders.id, orderId));
  
  return true;
}

// ============================================================================
// KANBAN DIGITAL
// ============================================================================

/**
 * Obter visão Kanban das OPs
 */
export async function getKanbanView(): Promise<{
  backlog: any[];
  aguardando: any[];
  em_producao: any[];
  qualidade: any[];
  concluida: any[];
}> {
  const db = await getDb();
  if (!db) return { backlog: [], aguardando: [], em_producao: [], qualidade: [], concluida: [] };
  
  const orders = await db.select().from(productionOrders)
    .where(sql`${productionOrders.status} != 'cancelada'`)
    .orderBy(
      sql`FIELD(${productionOrders.priority}, 'urgente', 'alta', 'normal', 'baixa')`,
      asc(productionOrders.kanbanPosition)
    );
  
  return {
    backlog: orders.filter(o => o.kanbanColumn === 'backlog'),
    aguardando: orders.filter(o => o.kanbanColumn === 'aguardando'),
    em_producao: orders.filter(o => o.kanbanColumn === 'em_producao'),
    qualidade: orders.filter(o => o.kanbanColumn === 'qualidade'),
    concluida: orders.filter(o => o.kanbanColumn === 'concluida')
  };
}

/**
 * Mover card no Kanban
 */
export async function moveKanbanCard(
  orderId: number, 
  newColumn: 'backlog' | 'aguardando' | 'em_producao' | 'qualidade' | 'concluida',
  newPosition: number,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // Mapear coluna para status
  const statusMap: Record<string, any> = {
    'backlog': 'aguardando',
    'aguardando': 'aguardando',
    'em_producao': 'em_producao',
    'qualidade': 'qualidade',
    'concluida': 'concluida'
  };
  
  await db.update(productionOrders)
    .set({ 
      kanbanColumn: newColumn,
      kanbanPosition: newPosition,
      status: statusMap[newColumn]
    })
    .where(eq(productionOrders.id, orderId));
  
  return true;
}

// ============================================================================
// METAS DE PRODUÇÃO
// ============================================================================

/**
 * Criar meta de produção
 */
export async function createProductionGoal(input: {
  type: 'diaria' | 'semanal' | 'mensal' | 'turno';
  targetQuantity: number;
  shift?: 'manha' | 'tarde' | 'noite' | 'todos';
  skuId?: number;
  targetYield?: number;
  maxLossPercent?: number;
  startDate: Date;
  endDate?: Date;
  observations?: string;
  createdBy: number;
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [result] = await db.insert(productionGoals).values({
    type: input.type,
    targetQuantity: input.targetQuantity.toString(),
    shift: input.shift,
    skuId: input.skuId,
    targetYield: input.targetYield?.toString(),
    maxLossPercent: input.maxLossPercent?.toString(),
    startDate: input.startDate,
    endDate: input.endDate,
    observations: input.observations,
    createdBy: input.createdBy,
  });
  
  return { id: result.insertId };
}

/**
 * Listar metas de produção
 */
export async function listProductionGoals(filters?: {
  type?: string;
  active?: boolean;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(productionGoals);
  
  const conditions = [];
  if (filters?.type) conditions.push(eq(productionGoals.type, filters.type as any));
  if (filters?.active === true) conditions.push(eq(productionGoals.status, 'ativa'));
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(desc(productionGoals.createdAt));
}

/**
 * Listar metas ativas
 */
export async function listActiveGoals(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(productionGoals)
    .where(and(
      eq(productionGoals.status, 'ativa'),
      lte(productionGoals.startDate, sql`CURDATE()`),
      sql`(${productionGoals.endDate} IS NULL OR ${productionGoals.endDate} >= CURDATE())`
    ))
    .orderBy(desc(productionGoals.createdAt));
}

/**
 * Atualizar progresso da meta
 */
export async function updateGoalProgress(goalId: number, additionalQuantity: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const [goal] = await db.select().from(productionGoals).where(eq(productionGoals.id, goalId));
  if (!goal) return false;
  
  const currentAchieved = parseFloat(goal.achievedQuantity || '0');
  const newTotal = currentAchieved + additionalQuantity;
  const target = parseFloat(goal.targetQuantity);
  
  const updates: any = { achievedQuantity: newTotal.toString() };
  
  // Verificar se meta foi atingida
  if (newTotal >= target && goal.status === 'ativa') {
    updates.status = 'concluida';
    updates.achievedAt = new Date();
  }
  
  await db.update(productionGoals)
    .set(updates)
    .where(eq(productionGoals.id, goalId));
  
  return true;
}

/**
 * Obter dashboard de metas
 */
export async function getGoalsDashboard(): Promise<{
  active: any[];
  achieved: any[];
  summary: { total: number; achieved: number; percentage: number };
}> {
  const db = await getDb();
  if (!db) return { active: [], achieved: [], summary: { total: 0, achieved: 0, percentage: 0 } };
  
  const goals = await db.select().from(productionGoals)
    .where(sql`${productionGoals.status} IN ('ativa', 'atingida')`)
    .orderBy(desc(productionGoals.createdAt));
  
  const active = goals.filter(g => g.status === 'ativa');
  const achieved = goals.filter(g => g.status === 'concluida');
  
  return {
    active,
    achieved,
    summary: {
      total: goals.length,
      achieved: achieved.length,
      percentage: goals.length > 0 ? (achieved.length / goals.length) * 100 : 0
    }
  };
}

// ============================================================================
// CHECKLISTS DE TURNO
// ============================================================================

/**
 * Criar checklist de turno
 */
export async function createShiftChecklist(input: {
  shift: 'manha' | 'tarde' | 'noite';
  date: Date;
  responsibleId: number;
  responsibleName: string;
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [result] = await db.insert(shiftChecklists).values({
    checklistDate: input.date,
    shift: input.shift,
    responsibleId: input.responsibleId,
    responsibleName: input.responsibleName,
    status: 'pendente',
  });
  
  return { id: result.insertId };
}

/**
 * Listar checklists do dia
 */
export async function listTodayChecklists(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const today = new Date().toISOString().split('T')[0];
  
  return db.select()
    .from(shiftChecklists)
    .where(sql`DATE(${shiftChecklists.checklistDate}) = ${today}`)
    .orderBy(asc(shiftChecklists.shift));
}

/**
 * Marcar item do checklist
 */
export async function checkItem(
  itemId: number, 
  checked: boolean, 
  notes?: string,
  userId?: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.update(checklistItems)
    .set({ 
      checked,
      observations: notes,
      checkedAt: checked ? new Date() : null,
      checkedBy: checked ? userId : null
    })
    .where(eq(checklistItems.id, itemId));
  
  return true;
}

/**
 * Finalizar checklist
 */
export async function finalizeChecklist(checklistId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.update(shiftChecklists)
    .set({ 
      status: 'concluido',
      completedAt: new Date()
    })
    .where(eq(shiftChecklists.id, checklistId));
  
  return true;
}

// ============================================================================
// PARADAS DE PRODUÇÃO
// ============================================================================

/**
 * Registrar parada
 */
export async function registerStop(input: {
  productionOrderId?: number;
  equipmentId?: number;
  shift: 'manha' | 'tarde' | 'noite';
  stopDate: Date;
  reason: 'setup' | 'manutencao_preventiva' | 'manutencao_corretiva' | 'falta_material' | 'falta_operador' | 'quebra' | 'limpeza' | 'qualidade' | 'energia' | 'outro';
  reasonDetail?: string;
  startedAt: Date;
  plannedStop?: boolean;
  createdBy: number;
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [result] = await db.insert(productionStops).values({
    productionOrderId: input.productionOrderId,
    equipmentId: input.equipmentId,
    shift: input.shift,
    stopDate: input.stopDate,
    reason: input.reason,
    reasonDetail: input.reasonDetail,
    startedAt: input.startedAt,
    plannedStop: input.plannedStop || false,
    createdBy: input.createdBy,
  });
  
  return { id: result.insertId };
}

/**
 * Finalizar parada
 */
export async function finalizeStop(stopId: number, actionTaken?: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const [stop] = await db.select().from(productionStops).where(eq(productionStops.id, stopId));
  if (!stop) return false;
  
  const endTime = new Date();
  const duration = Math.round((endTime.getTime() - new Date(stop.startedAt).getTime()) / 60000);
  
  await db.update(productionStops)
    .set({ 
      endedAt: endTime,
      durationMinutes: duration,
      actionTaken
    })
    .where(eq(productionStops.id, stopId));
  
  return true;
}

/**
 * Listar paradas ativas (sem endedAt)
 */
export async function listActiveStops(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(productionStops)
    .where(sql`${productionStops.endedAt} IS NULL`)
    .orderBy(desc(productionStops.startedAt));
}

// ============================================================================
// REPROCESSO
// ============================================================================

/**
 * Registrar reprocesso
 */
export async function registerReprocess(input: {
  originalBatchNumber: string;
  productionOrderId?: number;
  skuId: number;
  quantity: number;
  reason: 'umidade_alta' | 'granulometria' | 'cor' | 'contaminacao_leve' | 'embalagem_danificada' | 'outro';
  reasonDetail?: string;
  reprocessDate: Date;
  createdBy: number;
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [result] = await db.insert(productionReprocesses).values({
    originalBatchNumber: input.originalBatchNumber,
    productionOrderId: input.productionOrderId,
    skuId: input.skuId,
    quantity: input.quantity.toString(),
    reason: input.reason,
    reasonDetail: input.reasonDetail,
    reprocessDate: input.reprocessDate,
    status: 'aguardando',
    createdBy: input.createdBy,
  });
  
  return { id: result.insertId };
}

/**
 * Listar reprocessos pendentes
 */
export async function listPendingReprocesses(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(productionReprocesses)
    .where(eq(productionReprocesses.status, 'aguardando'))
    .orderBy(desc(productionReprocesses.createdAt));
}

/**
 * Finalizar reprocesso
 */
export async function finalizeReprocess(
  reprocessId: number, 
  reprocessedQuantity: number,
  lossQuantity: number,
  newBatchNumber?: string,
  observations?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.update(productionReprocesses)
    .set({ 
      status: 'concluido',
      reprocessedQuantity: reprocessedQuantity.toString(),
      lossQuantity: lossQuantity.toString(),
      newBatchNumber,
      observations
    })
    .where(eq(productionReprocesses.id, reprocessId));
  
  return true;
}

// ============================================================================
// CUSTOS DE PRODUÇÃO
// ============================================================================

/**
 * Registrar custo de produção
 */
export async function registerProductionCost(input: {
  productionOrderId?: number;
  batchNumber?: string;
  skuId: number;
  productionDate: Date;
  quantityProduced: number;
  rawMaterialCost?: number;
  packagingCost?: number;
  laborCost?: number;
  energyCost?: number;
  overheadCost?: number;
  maintenanceCost?: number;
  createdBy: number;
}): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const totalDirect = (input.rawMaterialCost || 0) + (input.packagingCost || 0) + 
                      (input.laborCost || 0) + (input.energyCost || 0);
  const totalIndirect = (input.overheadCost || 0) + (input.maintenanceCost || 0);
  const totalCost = totalDirect + totalIndirect;
  const unitCost = input.quantityProduced > 0 ? totalCost / input.quantityProduced : 0;
  
  const [result] = await db.insert(productionCosts).values({
    productionOrderId: input.productionOrderId,
    batchNumber: input.batchNumber,
    skuId: input.skuId,
    productionDate: input.productionDate,
    quantityProduced: input.quantityProduced.toString(),
    rawMaterialCost: input.rawMaterialCost?.toString(),
    packagingCost: input.packagingCost?.toString(),
    laborCost: input.laborCost?.toString(),
    energyCost: input.energyCost?.toString(),
    overheadCost: input.overheadCost?.toString(),
    maintenanceCost: input.maintenanceCost?.toString(),
    totalDirectCost: totalDirect.toString(),
    totalIndirectCost: totalIndirect.toString(),
    totalCost: totalCost.toString(),
    unitCost: unitCost.toString(),
    createdBy: input.createdBy,
  });
  
  return { id: result.insertId };
}

/**
 * Obter custos por OP
 */
export async function getOrderCosts(orderId: number): Promise<{
  costs: any[];
  total: number;
}> {
  const db = await getDb();
  if (!db) return { costs: [], total: 0 };
  
  const costs = await db.select().from(productionCosts)
    .where(eq(productionCosts.productionOrderId, orderId))
    .orderBy(desc(productionCosts.createdAt));
  
  const total = costs.reduce((sum, c) => sum + parseFloat(c.totalCost || '0'), 0);
  
  return { costs, total };
}

// ============================================================================
// DASHBOARD DE PRODUÇÃO
// ============================================================================

/**
 * Obter dashboard completo de produção
 */
export async function getProductionDashboard(): Promise<{
  ordersToday: { total: number; inProgress: number; completed: number };
  goalsStatus: { active: number; achieved: number; percentage: number };
  activeStops: number;
  pendingChecklists: number;
  pendingReprocesses: number;
  todayProduction: number;
  alerts: string[];
}> {
  const db = await getDb();
  if (!db) return {
    ordersToday: { total: 0, inProgress: 0, completed: 0 },
    goalsStatus: { active: 0, achieved: 0, percentage: 0 },
    activeStops: 0,
    pendingChecklists: 0,
    pendingReprocesses: 0,
    todayProduction: 0,
    alerts: ['⚠️ Configure dados de produção para ver métricas']
  };
  
  const today = new Date().toISOString().split('T')[0];
  const alerts: string[] = [];
  
  // Ordens do dia
  const orders = await db.select().from(productionOrders)
    .where(sql`DATE(${productionOrders.plannedStartDate}) = ${today}`);
  
  const ordersToday = {
    total: orders.length,
    inProgress: orders.filter(o => o.status === 'em_producao').length,
    completed: orders.filter(o => o.status === 'concluida').length
  };
  
  // Metas
  const goals = await listActiveGoals();
  const achievedGoals = goals.filter(g => 
    parseFloat(g.achievedQuantity || '0') >= parseFloat(g.targetQuantity)
  );
  
  const goalsStatus = {
    active: goals.length,
    achieved: achievedGoals.length,
    percentage: goals.length > 0 ? (achievedGoals.length / goals.length) * 100 : 0
  };
  
  // Paradas ativas
  const activeStopsList = await listActiveStops();
  const activeStops = activeStopsList.length;
  if (activeStops > 0) {
    alerts.push(`🔴 ${activeStops} parada(s) de produção em andamento`);
  }
  
  // Checklists pendentes
  const [checklistsCount] = await db.select({ count: count() })
    .from(shiftChecklists)
    .where(and(
      sql`DATE(${shiftChecklists.checklistDate}) = ${today}`,
      eq(shiftChecklists.status, 'pendente')
    ));
  
  const pendingChecklists = checklistsCount.count;
  if (pendingChecklists > 0) {
    alerts.push(`📋 ${pendingChecklists} checklist(s) de turno pendente(s)`);
  }
  
  // Reprocessos pendentes
  const [reprocessCount] = await db.select({ count: count() })
    .from(productionReprocesses)
    .where(eq(productionReprocesses.status, 'aguardando'));
  
  const pendingReprocesses = reprocessCount.count;
  if (pendingReprocesses > 0) {
    alerts.push(`♻️ ${pendingReprocesses} reprocesso(s) pendente(s)`);
  }
  
  // Produção do dia
  const [productionSum] = await db.select({ total: sum(productionEntries.quantityProduced) })
    .from(productionEntries)
    .where(sql`DATE(${productionEntries.productionDate}) = ${today}`);
  
  const todayProduction = parseFloat(productionSum?.total || '0');
  
  // Alertas adicionais
  if (orders.length === 0) {
    alerts.push('📝 Nenhuma OP planejada para hoje. Crie uma Ordem de Produção.');
  }
  
  if (goals.length === 0) {
    alerts.push('🎯 Nenhuma meta de produção configurada. Defina metas em Produção > Metas.');
  }
  
  return {
    ordersToday,
    goalsStatus,
    activeStops,
    pendingChecklists,
    pendingReprocesses,
    todayProduction,
    alerts
  };
}
