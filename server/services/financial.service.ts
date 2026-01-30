/**
 * Implementação do Service Financeiro.
 * Segue o princípio SOLID de Single Responsibility - apenas lógica de negócio financeira.
 */

import type {
  IFinancialService,
  PayableFilters,
  ReceivableFilters,
  CreatePayableDTO,
  CreateReceivableDTO,
  PaymentDTO,
  CashFlowSummary,
  DailyFlowItem
} from './interfaces/IFinancialService';
import { NotFoundError, ValidationError, BusinessError } from '../errors';
import * as db from '../db';

export class FinancialService implements IFinancialService {
  
  // ==================== CONTAS A PAGAR ====================
  
  async listPayables(filters: PayableFilters): Promise<any[]> {
    // Usar função existente do db.ts
    return db.getProducerPayables({
      producerId: filters.producerId,
      status: filters.status,
      startDate: filters.startDate?.toISOString().split('T')[0],
      endDate: filters.endDate?.toISOString().split('T')[0]
    });
  }
  
  async getPayableById(id: number): Promise<any> {
    const payable = await db.getProducerPayableById(id);
    if (!payable) {
      throw new NotFoundError('Conta a Pagar', id);
    }
    return payable;
  }
  
  async createPayable(data: CreatePayableDTO): Promise<any> {
    // Validar se produtor existe
    const producer = await db.getProducerById(data.producerId);
    if (!producer) {
      throw new ValidationError('Produtor não encontrado');
    }
    
    // Validar valor
    if (data.amount <= 0) {
      throw new ValidationError('Valor deve ser maior que zero');
    }
    
    // Nota: O schema producerPayables é vinculado a coconutLoads
    // Para criar payables genéricos, usar financialEntries
    const id = await db.createFinancialEntry({
      entryType: 'pagar',
      origin: 'produtor',
      description: data.description,
      entityName: producer.name,
      value: data.amount.toString(),
      dueDate: data.dueDate,
      status: 'pendente',
      referenceType: 'producer',
      referenceId: data.producerId,
      createdBy: data.createdBy ? Number(data.createdBy) : undefined,
    });
    
    return { id };
  }
  
  async markPayableAsPaid(payment: PaymentDTO): Promise<void> {
    const payable = await this.getPayableById(payment.id);
    
    if (payable.status === 'pago') {
      throw BusinessError.paymentAlreadyPaid(payment.id);
    }
    
    // Validar valor do pagamento
    const pendingAmount = await this.calculatePendingAmount(payment.id);
    if (payment.paidAmount > pendingAmount) {
      throw new ValidationError(`Valor do pagamento (${payment.paidAmount}) excede o valor pendente (${pendingAmount})`);
    }
    
    await db.updateProducerPayable(payment.id, {
      status: 'pago',
      paidAt: payment.paidAt,
      paidBy: payment.paidBy ? Number(payment.paidBy) : undefined,
      paymentMethod: payment.paymentMethod,
      observations: payment.notes,
      updatedBy: payment.paidBy ? Number(payment.paidBy) : undefined,
    });
  }
  
  async cancelPayable(id: number, reason: string, cancelledBy?: string): Promise<void> {
    const payable = await this.getPayableById(id);
    
    if (payable.status === 'pago') {
      throw BusinessError.invalidStatusTransition('Conta a Pagar', 'pago', 'cancelado');
    }
    
    // Adicionar nota de cancelamento no campo observations
    await db.updateProducerPayable(id, {
      observations: `CANCELADO: ${reason}`,
      updatedBy: cancelledBy ? Number(cancelledBy) : undefined,
    });
  }
  
  // ==================== CONTAS A RECEBER ====================
  
  async listReceivables(filters: ReceivableFilters): Promise<any[]> {
    return db.getFinancialEntries({
      entryType: 'receber',
      status: filters.status,
      startDate: filters.startDate?.toISOString().split('T')[0],
      endDate: filters.endDate?.toISOString().split('T')[0]
    });
  }
  
  async getReceivableById(id: number): Promise<any> {
    // Buscar entrada financeira por ID
    const entries = await db.getFinancialEntries({ referenceId: id });
    const receivable = entries.find((e: any) => e.id === id);
    if (!receivable) {
      throw new NotFoundError('Conta a Receber', id);
    }
    return receivable;
  }
  
  async createReceivable(data: CreateReceivableDTO): Promise<any> {
    if (data.amount <= 0) {
      throw new ValidationError('Valor deve ser maior que zero');
    }
    
    const id = await db.createFinancialEntry({
      entryType: 'receber',
      origin: 'venda',
      description: data.description,
      value: data.amount.toString(),
      dueDate: data.dueDate,
      status: 'pendente',
      createdBy: data.createdBy ? Number(data.createdBy) : undefined,
    });
    
    return { id };
  }
  
  async markReceivableAsReceived(payment: PaymentDTO): Promise<void> {
    const receivable = await this.getReceivableById(payment.id);
    
    if (receivable.status === 'recebido') {
      throw BusinessError.paymentAlreadyPaid(payment.id);
    }
    
    await db.updateFinancialEntry(payment.id, {
      status: 'recebido',
      paidAt: payment.paidAt,
      paymentMethod: payment.paymentMethod,
      observations: payment.notes,
      updatedBy: payment.paidBy ? Number(payment.paidBy) : undefined,
    });
  }
  
  async cancelReceivable(id: number, reason: string, cancelledBy?: string): Promise<void> {
    const receivable = await this.getReceivableById(id);
    
    if (receivable.status === 'recebido') {
      throw BusinessError.invalidStatusTransition('Conta a Receber', 'recebido', 'cancelado');
    }
    
    await db.updateFinancialEntry(id, {
      status: 'cancelado',
      observations: `CANCELADO: ${reason}`,
      updatedBy: cancelledBy ? Number(cancelledBy) : undefined,
    });
  }
  
  // ==================== FLUXO DE CAIXA ====================
  
  async getCashFlowSummary(startDate?: Date, endDate?: Date): Promise<CashFlowSummary> {
    const stats = await db.getDashboardStats();
    
    return {
      totalReceivables: 0, // TODO: implementar query específica
      totalPayables: stats?.payables?.total || 0,
      balance: 0 - (stats?.payables?.total || 0),
      overdueReceivables: 0, // TODO: implementar
      overduePayables: stats?.payables?.overdue || 0,
      receivablesNext30Days: 0, // TODO: implementar
      payablesNext30Days: stats?.payables?.pending || 0
    };
  }
  
  async getDailyFlow(startDate: Date, endDate: Date): Promise<DailyFlowItem[]> {
    // TODO: implementar query de fluxo diário
    return [];
  }
  
  // ==================== RELATÓRIOS ====================
  
  async getOverduePayables(): Promise<any[]> {
    const payables = await db.getProducerPayables({ status: 'pendente' });
    const today = new Date();
    return payables.filter(p => new Date(p.dueDate as any) < today);
  }
  
  async getOverdueReceivables(): Promise<any[]> {
    const receivables = await db.getFinancialEntries({ entryType: 'receber', status: 'pendente' });
    const today = new Date();
    return receivables.filter((r: any) => new Date(r.dueDate) < today);
  }
  
  async getPayablesByProducer(producerId: number): Promise<any[]> {
    return db.getProducerPayables({ producerId });
  }
  
  // ==================== VALIDAÇÕES ====================
  
  async validatePaymentAmount(payableId: number, amount: number): Promise<boolean> {
    const pendingAmount = await this.calculatePendingAmount(payableId);
    return amount > 0 && amount <= pendingAmount;
  }
  
  async calculatePendingAmount(payableId: number): Promise<number> {
    const payable = await this.getPayableById(payableId);
    const totalAmount = Number(payable.amount);
    const paidAmount = Number(payable.paidAmount || 0);
    return totalAmount - paidAmount;
  }
}

// Singleton para uso global
let financialServiceInstance: FinancialService | null = null;

export function getFinancialService(): FinancialService {
  if (!financialServiceInstance) {
    financialServiceInstance = new FinancialService();
  }
  return financialServiceInstance;
}
