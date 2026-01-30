import { AppError } from './AppError';

/**
 * Erro para violações de regras de negócio (HTTP 422).
 * Usado quando uma operação viola regras de negócio da aplicação.
 */
export class BusinessError extends AppError {
  public readonly rule: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    rule: string,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      422,
      'BUSINESS_RULE_VIOLATION',
      true,
      { rule, ...context }
    );

    this.rule = rule;
    this.context = context;
  }

  // ==================== REGRAS DE CARGA ====================

  /**
   * Carga já fechada não pode ser editada
   */
  static loadAlreadyClosed(loadId: number): BusinessError {
    return new BusinessError(
      'Esta carga já foi fechada e não pode ser editada.',
      'LOAD_ALREADY_CLOSED',
      { loadId }
    );
  }

  /**
   * Carga não pode ser fechada sem aprovação
   */
  static loadNotApproved(loadId: number): BusinessError {
    return new BusinessError(
      'A carga precisa ser aprovada antes de ser fechada.',
      'LOAD_NOT_APPROVED',
      { loadId }
    );
  }

  /**
   * Peso inválido para carga
   */
  static invalidLoadWeight(grossWeight: number, tareWeight: number): BusinessError {
    return new BusinessError(
      'O peso bruto deve ser maior que a tara.',
      'INVALID_LOAD_WEIGHT',
      { grossWeight, tareWeight }
    );
  }

  // ==================== REGRAS DE PAGAMENTO ====================

  /**
   * Pagamento já foi efetuado
   */
  static paymentAlreadyPaid(paymentId: number): BusinessError {
    return new BusinessError(
      'Este pagamento já foi efetuado.',
      'PAYMENT_ALREADY_PAID',
      { paymentId }
    );
  }

  /**
   * Pagamento não pode ser aprovado
   */
  static paymentCannotBeApproved(paymentId: number, currentStatus: string): BusinessError {
    return new BusinessError(
      `Pagamento com status '${currentStatus}' não pode ser aprovado.`,
      'PAYMENT_CANNOT_BE_APPROVED',
      { paymentId, currentStatus }
    );
  }

  // ==================== REGRAS DE ESTOQUE ====================

  /**
   * Estoque insuficiente
   */
  static insufficientStock(itemName: string, requested: number, available: number): BusinessError {
    return new BusinessError(
      `Estoque insuficiente de '${itemName}'. Solicitado: ${requested}, Disponível: ${available}.`,
      'INSUFFICIENT_STOCK',
      { itemName, requested, available }
    );
  }

  /**
   * Item abaixo do estoque mínimo
   */
  static belowMinimumStock(itemName: string, current: number, minimum: number): BusinessError {
    return new BusinessError(
      `O item '${itemName}' está abaixo do estoque mínimo. Atual: ${current}, Mínimo: ${minimum}.`,
      'BELOW_MINIMUM_STOCK',
      { itemName, current, minimum }
    );
  }

  // ==================== REGRAS DE PRODUÇÃO ====================

  /**
   * Ordem de produção já iniciada
   */
  static productionOrderAlreadyStarted(opId: number): BusinessError {
    return new BusinessError(
      'Esta ordem de produção já foi iniciada.',
      'PRODUCTION_ORDER_ALREADY_STARTED',
      { opId }
    );
  }

  /**
   * Ordem de produção já finalizada
   */
  static productionOrderAlreadyCompleted(opId: number): BusinessError {
    return new BusinessError(
      'Esta ordem de produção já foi finalizada.',
      'PRODUCTION_ORDER_ALREADY_COMPLETED',
      { opId }
    );
  }

  /**
   * Quantidade produzida excede o planejado
   */
  static productionExceedsPlanned(opId: number, produced: number, planned: number): BusinessError {
    return new BusinessError(
      `A quantidade produzida (${produced}) excede o planejado (${planned}).`,
      'PRODUCTION_EXCEEDS_PLANNED',
      { opId, produced, planned }
    );
  }

  // ==================== REGRAS DE LOTE ====================

  /**
   * Lote já em quarentena
   */
  static batchAlreadyInQuarantine(batchId: number): BusinessError {
    return new BusinessError(
      'Este lote já está em quarentena.',
      'BATCH_ALREADY_IN_QUARANTINE',
      { batchId }
    );
  }

  /**
   * Lote expirado
   */
  static batchExpired(batchCode: string, expiryDate: Date): BusinessError {
    return new BusinessError(
      `O lote '${batchCode}' expirou em ${expiryDate.toLocaleDateString('pt-BR')}.`,
      'BATCH_EXPIRED',
      { batchCode, expiryDate: expiryDate.toISOString() }
    );
  }

  /**
   * Lote não pode ser liberado
   */
  static batchCannotBeReleased(batchId: number, reason: string): BusinessError {
    return new BusinessError(
      `O lote não pode ser liberado: ${reason}.`,
      'BATCH_CANNOT_BE_RELEASED',
      { batchId, reason }
    );
  }

  // ==================== REGRAS DE QUALIDADE ====================

  /**
   * NC já resolvida
   */
  static ncAlreadyResolved(ncId: number): BusinessError {
    return new BusinessError(
      'Esta não conformidade já foi resolvida.',
      'NC_ALREADY_RESOLVED',
      { ncId }
    );
  }

  /**
   * Análise fora do padrão
   */
  static analysisOutOfSpec(parameter: string, value: number, min: number, max: number): BusinessError {
    return new BusinessError(
      `O parâmetro '${parameter}' (${value}) está fora da especificação (${min} - ${max}).`,
      'ANALYSIS_OUT_OF_SPEC',
      { parameter, value, min, max }
    );
  }

  // ==================== REGRAS DE COMPRAS ====================

  /**
   * Solicitação já aprovada
   */
  static purchaseRequestAlreadyApproved(requestId: number): BusinessError {
    return new BusinessError(
      'Esta solicitação de compra já foi aprovada.',
      'PURCHASE_REQUEST_ALREADY_APPROVED',
      { requestId }
    );
  }

  /**
   * Cotação não pode ser selecionada
   */
  static quotationCannotBeSelected(quotationId: number, reason: string): BusinessError {
    return new BusinessError(
      `A cotação não pode ser selecionada: ${reason}.`,
      'QUOTATION_CANNOT_BE_SELECTED',
      { quotationId, reason }
    );
  }

  // ==================== REGRAS GERAIS ====================

  /**
   * Operação não permitida no status atual
   */
  static invalidStatusTransition(entity: string, currentStatus: string, targetStatus: string): BusinessError {
    return new BusinessError(
      `Não é possível alterar o status de '${currentStatus}' para '${targetStatus}'.`,
      'INVALID_STATUS_TRANSITION',
      { entity, currentStatus, targetStatus }
    );
  }

  /**
   * Entidade em uso e não pode ser excluída
   */
  static entityInUse(entityType: string, entityId: number, usedBy: string): BusinessError {
    return new BusinessError(
      `${entityType} não pode ser excluído pois está sendo usado em ${usedBy}.`,
      'ENTITY_IN_USE',
      { entityType, entityId, usedBy }
    );
  }

  /**
   * Limite excedido
   */
  static limitExceeded(limitType: string, current: number, maximum: number): BusinessError {
    return new BusinessError(
      `Limite de ${limitType} excedido. Atual: ${current}, Máximo: ${maximum}.`,
      'LIMIT_EXCEEDED',
      { limitType, current, maximum }
    );
  }

  /**
   * Período inválido
   */
  static invalidPeriod(startDate: Date, endDate: Date): BusinessError {
    return new BusinessError(
      'A data de início deve ser anterior à data de fim.',
      'INVALID_PERIOD',
      { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
    );
  }
}

export default BusinessError;
