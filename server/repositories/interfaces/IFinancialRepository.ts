/**
 * Interface do Repository Financeiro.
 * Segue o princípio SOLID de Dependency Inversion.
 */

import type { PaginationOptions, PaginatedResult } from './IProducerRepository';

export type PaymentStatus = 'pending' | 'approved' | 'scheduled' | 'paid' | 'cancelled';
export type ReceivableStatus = 'pending' | 'partial' | 'received' | 'overdue' | 'cancelled';

// ==================== CONTAS A PAGAR (PRODUTORES) ====================

export interface ProducerPayableFilters {
  search?: string;
  status?: PaymentStatus | 'all';
  producerId?: number;
  startDate?: Date;
  endDate?: Date;
  overdue?: boolean;
}

export interface CreateProducerPayableDTO {
  producerId: number;
  loadId: number;
  amount: number;
  discount?: number;
  netAmount: number;
  dueDate: Date;
  notes?: string;
  createdBy?: string;
}

export interface UpdateProducerPayableDTO {
  amount?: number;
  discount?: number;
  netAmount?: number;
  dueDate?: Date;
  status?: PaymentStatus;
  approvedAt?: Date;
  approvedBy?: string;
  scheduledDate?: Date;
  paidAt?: Date;
  paidBy?: string;
  paymentProof?: string;
  notes?: string;
  updatedBy?: string;
}

export interface ProducerPayable {
  id: number;
  producerId: number;
  loadId: number;
  amount: number;
  discount: number;
  netAmount: number;
  dueDate: Date;
  status: PaymentStatus;
  approvedAt: Date | null;
  approvedBy: string | null;
  scheduledDate: Date | null;
  paidAt: Date | null;
  paidBy: string | null;
  paymentProof: string | null;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export interface ProducerPayableWithDetails extends ProducerPayable {
  producer: {
    id: number;
    name: string;
    cpfCnpj: string;
    pixKey: string | null;
    bankName: string | null;
    bankAgency: string | null;
    bankAccount: string | null;
  };
  load: {
    id: number;
    vehiclePlate: string;
    netWeight: number;
    receivedAt: Date;
  };
}

// ==================== CONTAS A RECEBER ====================

export interface AccountReceivableFilters {
  search?: string;
  status?: ReceivableStatus | 'all';
  customerId?: number;
  startDate?: Date;
  endDate?: Date;
  overdue?: boolean;
}

export interface CreateAccountReceivableDTO {
  customerId?: number;
  customerName: string;
  description: string;
  amount: number;
  dueDate: Date;
  referenceType?: string;
  referenceId?: number;
  notes?: string;
  createdBy?: string;
}

export interface UpdateAccountReceivableDTO {
  customerName?: string;
  description?: string;
  amount?: number;
  paidAmount?: number;
  dueDate?: Date;
  status?: ReceivableStatus;
  receivedAt?: Date;
  receivedBy?: string;
  notes?: string;
  updatedBy?: string;
}

export interface AccountReceivable {
  id: number;
  customerId: number | null;
  customerName: string;
  description: string;
  amount: number;
  paidAmount: number;
  dueDate: Date;
  status: ReceivableStatus;
  referenceType: string | null;
  referenceId: number | null;
  receivedAt: Date | null;
  receivedBy: string | null;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}

// ==================== FLUXO DE CAIXA ====================

export interface CashFlowEntry {
  date: Date;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  balance: number;
}

export interface CashFlowSummary {
  period: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  entries: CashFlowEntry[];
}

// ==================== MÉTRICAS ====================

export interface PaymentsByStatus {
  status: PaymentStatus;
  count: number;
  totalAmount: number;
}

export interface FinancialSummary {
  totalPayable: number;
  totalReceivable: number;
  overduePayable: number;
  overdueReceivable: number;
  paidThisMonth: number;
  receivedThisMonth: number;
}

export interface IFinancialRepository {
  // ==================== CONTAS A PAGAR (PRODUTORES) ====================

  findAllProducerPayables(
    filters: ProducerPayableFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<ProducerPayableWithDetails>>;

  findProducerPayableById(id: number): Promise<ProducerPayableWithDetails | null>;

  findProducerPayableByLoadId(loadId: number): Promise<ProducerPayable | null>;

  createProducerPayable(data: CreateProducerPayableDTO): Promise<ProducerPayable>;

  updateProducerPayable(id: number, data: UpdateProducerPayableDTO): Promise<ProducerPayable>;

  deleteProducerPayable(id: number): Promise<void>;

  approveProducerPayable(id: number, approvedBy: string): Promise<ProducerPayable>;

  scheduleProducerPayable(id: number, scheduledDate: Date): Promise<ProducerPayable>;

  markProducerPayableAsPaid(id: number, paidBy: string, paymentProof?: string): Promise<ProducerPayable>;

  getOverdueProducerPayables(): Promise<ProducerPayableWithDetails[]>;

  getUpcomingProducerPayables(days: number): Promise<ProducerPayableWithDetails[]>;

  // ==================== CONTAS A RECEBER ====================

  findAllAccountReceivables(
    filters: AccountReceivableFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<AccountReceivable>>;

  findAccountReceivableById(id: number): Promise<AccountReceivable | null>;

  createAccountReceivable(data: CreateAccountReceivableDTO): Promise<AccountReceivable>;

  updateAccountReceivable(id: number, data: UpdateAccountReceivableDTO): Promise<AccountReceivable>;

  deleteAccountReceivable(id: number): Promise<void>;

  markAccountReceivableAsReceived(id: number, amount: number, receivedBy: string): Promise<AccountReceivable>;

  getOverdueAccountReceivables(): Promise<AccountReceivable[]>;

  // ==================== FLUXO DE CAIXA ====================

  getCashFlow(startDate: Date, endDate: Date): Promise<CashFlowSummary>;

  getCashFlowByWeek(weeks: number): Promise<CashFlowSummary[]>;

  // ==================== MÉTRICAS ====================

  getPaymentsByStatus(): Promise<PaymentsByStatus[]>;

  getFinancialSummary(): Promise<FinancialSummary>;

  getTotalPendingPayments(): Promise<number>;

  getTotalOverduePayments(): Promise<number>;

  countOverduePayments(): Promise<number>;

  countUpcomingPayments(days: number): Promise<number>;
}

export default IFinancialRepository;
