/**
 * Interface do Repository de Compras.
 * Segue o princípio SOLID de Dependency Inversion.
 */

import type { PaginationOptions, PaginatedResult } from './IProducerRepository';

export type PurchaseRequestStatus = 'pending' | 'quoted' | 'approved' | 'ordered' | 'received' | 'cancelled';
export type QuotationStatus = 'pending' | 'selected' | 'rejected';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

// ==================== SOLICITAÇÕES DE COMPRA ====================

export interface PurchaseRequestFilters {
  search?: string;
  status?: PurchaseRequestStatus | 'all';
  priority?: Priority | 'all';
  requestedBy?: string;
  startDate?: Date;
  endDate?: Date;
  itemId?: number;
}

export interface CreatePurchaseRequestDTO {
  itemId?: number;
  itemName: string;
  itemDescription?: string;
  quantity: number;
  unit: string;
  priority?: Priority;
  neededBy?: Date;
  justification?: string;
  requestedBy?: string;
  createdBy?: string;
}

export interface UpdatePurchaseRequestDTO {
  itemName?: string;
  itemDescription?: string;
  quantity?: number;
  unit?: string;
  priority?: Priority;
  status?: PurchaseRequestStatus;
  neededBy?: Date;
  justification?: string;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  updatedBy?: string;
}

export interface PurchaseRequest {
  id: number;
  requestNumber: string;
  itemId: number | null;
  itemName: string;
  itemDescription: string | null;
  quantity: number;
  unit: string;
  priority: Priority;
  status: PurchaseRequestStatus;
  neededBy: Date | null;
  justification: string | null;
  requestedBy: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export interface PurchaseRequestWithItem extends PurchaseRequest {
  item?: {
    id: number;
    name: string;
    code: string | null;
    currentStock: number;
    minimumStock: number;
  } | null;
  quotationsCount: number;
}

// ==================== COTAÇÕES ====================

export interface QuotationFilters {
  purchaseRequestId?: number;
  supplierId?: number;
  status?: QuotationStatus | 'all';
}

export interface CreateQuotationDTO {
  purchaseRequestId: number;
  supplierId: number;
  unitPrice: number;
  totalPrice: number;
  deliveryDays?: number;
  validUntil?: Date;
  paymentTerms?: string;
  notes?: string;
  createdBy?: string;
}

export interface UpdateQuotationDTO {
  unitPrice?: number;
  totalPrice?: number;
  deliveryDays?: number;
  validUntil?: Date;
  paymentTerms?: string;
  status?: QuotationStatus;
  notes?: string;
  updatedBy?: string;
}

export interface Quotation {
  id: number;
  purchaseRequestId: number;
  supplierId: number;
  unitPrice: number;
  totalPrice: number;
  deliveryDays: number | null;
  validUntil: Date | null;
  paymentTerms: string | null;
  status: QuotationStatus;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export interface QuotationWithDetails extends Quotation {
  purchaseRequest: {
    id: number;
    requestNumber: string;
    itemName: string;
    quantity: number;
    unit: string;
  };
  supplier: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
  };
}

// ==================== FORNECEDORES ====================

export interface SupplierFilters {
  search?: string;
  isActive?: boolean;
  category?: string;
}

export interface CreateSupplierDTO {
  name: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  category?: string;
  notes?: string;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateSupplierDTO {
  name?: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  category?: string;
  notes?: string;
  isActive?: boolean;
  updatedBy?: string;
}

export interface Supplier {
  id: number;
  name: string;
  cpfCnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  category: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}

// ==================== HISTÓRICO DE PREÇOS ====================

export interface PriceHistory {
  id: number;
  supplierId: number;
  itemId: number | null;
  itemName: string;
  unitPrice: number;
  quotationId: number | null;
  recordedAt: Date;
}

export interface PriceHistoryWithDetails extends PriceHistory {
  supplier: {
    id: number;
    name: string;
  };
}

export interface IPurchaseRepository {
  // ==================== SOLICITAÇÕES DE COMPRA ====================

  findAllRequests(
    filters: PurchaseRequestFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<PurchaseRequestWithItem>>;

  findRequestById(id: number): Promise<PurchaseRequestWithItem | null>;

  findRequestByNumber(requestNumber: string): Promise<PurchaseRequestWithItem | null>;

  createRequest(data: CreatePurchaseRequestDTO): Promise<PurchaseRequest>;

  updateRequest(id: number, data: UpdatePurchaseRequestDTO): Promise<PurchaseRequest>;

  deleteRequest(id: number): Promise<void>;

  approveRequest(id: number, approvedBy: string): Promise<PurchaseRequest>;

  rejectRequest(id: number, rejectedBy: string, reason: string): Promise<PurchaseRequest>;

  getPendingRequests(): Promise<PurchaseRequestWithItem[]>;

  // ==================== COTAÇÕES ====================

  findAllQuotations(
    filters: QuotationFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<QuotationWithDetails>>;

  findQuotationById(id: number): Promise<QuotationWithDetails | null>;

  findQuotationsByRequest(purchaseRequestId: number): Promise<QuotationWithDetails[]>;

  createQuotation(data: CreateQuotationDTO): Promise<Quotation>;

  updateQuotation(id: number, data: UpdateQuotationDTO): Promise<Quotation>;

  deleteQuotation(id: number): Promise<void>;

  selectQuotation(id: number): Promise<Quotation>;

  rejectQuotation(id: number): Promise<Quotation>;

  // ==================== FORNECEDORES ====================

  findAllSuppliers(
    filters: SupplierFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Supplier>>;

  findSupplierById(id: number): Promise<Supplier | null>;

  findSupplierByCpfCnpj(cpfCnpj: string): Promise<Supplier | null>;

  createSupplier(data: CreateSupplierDTO): Promise<Supplier>;

  updateSupplier(id: number, data: UpdateSupplierDTO): Promise<Supplier>;

  deleteSupplier(id: number): Promise<void>;

  // ==================== HISTÓRICO DE PREÇOS ====================

  getPriceHistory(
    itemName: string,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<PriceHistoryWithDetails>>;

  getPriceHistoryBySupplier(
    supplierId: number,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<PriceHistory>>;

  recordPrice(supplierId: number, itemId: number | null, itemName: string, unitPrice: number, quotationId?: number): Promise<PriceHistory>;

  getAveragePrice(itemName: string, months?: number): Promise<number | null>;

  // ==================== MÉTRICAS ====================

  countPendingRequests(): Promise<number>;

  countQuotationsByRequest(purchaseRequestId: number): Promise<number>;

  getTotalPurchasesValue(startDate?: Date, endDate?: Date): Promise<number>;

  // ==================== GERAÇÃO DE NÚMERO ====================

  generateRequestNumber(): Promise<string>;
}

export default IPurchaseRepository;
