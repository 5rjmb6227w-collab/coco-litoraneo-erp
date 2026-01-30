/**
 * Interface do Service Financeiro.
 * Define o contrato para operações financeiras do sistema.
 */

export interface PayableFilters {
  status?: 'pendente' | 'pago' | 'cancelado';
  producerId?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface ReceivableFilters {
  status?: 'pendente' | 'recebido' | 'cancelado';
  customerId?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface CreatePayableDTO {
  producerId: number;
  loadId?: number;
  description: string;
  amount: number;
  dueDate: Date;
  createdBy?: string;
}

export interface CreateReceivableDTO {
  customerId?: number;
  description: string;
  amount: number;
  dueDate: Date;
  createdBy?: string;
}

export interface PaymentDTO {
  id: number;
  paidAmount: number;
  paidAt: Date;
  paymentMethod: 'pix' | 'transferencia' | 'boleto' | 'dinheiro';
  notes?: string;
  paidBy?: string;
}

export interface CashFlowSummary {
  totalReceivables: number;
  totalPayables: number;
  balance: number;
  overdueReceivables: number;
  overduePayables: number;
  receivablesNext30Days: number;
  payablesNext30Days: number;
}

export interface DailyFlowItem {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
}

export interface IFinancialService {
  // Contas a Pagar (Produtores)
  listPayables(filters: PayableFilters): Promise<any[]>;
  getPayableById(id: number): Promise<any>;
  createPayable(data: CreatePayableDTO): Promise<any>;
  markPayableAsPaid(payment: PaymentDTO): Promise<void>;
  cancelPayable(id: number, reason: string, cancelledBy?: string): Promise<void>;
  
  // Contas a Receber
  listReceivables(filters: ReceivableFilters): Promise<any[]>;
  getReceivableById(id: number): Promise<any>;
  createReceivable(data: CreateReceivableDTO): Promise<any>;
  markReceivableAsReceived(payment: PaymentDTO): Promise<void>;
  cancelReceivable(id: number, reason: string, cancelledBy?: string): Promise<void>;
  
  // Fluxo de Caixa
  getCashFlowSummary(startDate?: Date, endDate?: Date): Promise<CashFlowSummary>;
  getDailyFlow(startDate: Date, endDate: Date): Promise<DailyFlowItem[]>;
  
  // Relatórios
  getOverduePayables(): Promise<any[]>;
  getOverdueReceivables(): Promise<any[]>;
  getPayablesByProducer(producerId: number): Promise<any[]>;
  
  // Validações
  validatePaymentAmount(payableId: number, amount: number): Promise<boolean>;
  calculatePendingAmount(payableId: number): Promise<number>;
}
