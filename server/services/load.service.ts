/**
 * Implementação do Service de Cargas.
 * Segue o princípio SOLID de Single Responsibility - apenas lógica de negócio.
 * 
 * Este service orquestra o LoadRepository e ProducerRepository,
 * aplicando regras de negócio para o fluxo de cargas.
 */

import type {
  ILoadRepository,
  IProducerRepository,
  Load,
  LoadWithProducer,
  LoadFilters,
  CreateLoadDTO,
  UpdateLoadDTO,
  LoadStatus,
  LoadEvolution,
  PaginationOptions,
  PaginatedResult
} from '../repositories/interfaces';
import type { ILoadService, LoadSummary } from './interfaces/ILoadService';
import { getLoadRepository, getProducerRepository } from '../repositories';
import { NotFoundError, ValidationError, BusinessError } from '../errors';

export class LoadService implements ILoadService {
  private loadRepository: ILoadRepository;
  private producerRepository: IProducerRepository;

  constructor(loadRepository?: ILoadRepository, producerRepository?: IProducerRepository) {
    // Dependency Injection - permite injetar mocks para testes
    this.loadRepository = loadRepository || getLoadRepository();
    this.producerRepository = producerRepository || getProducerRepository();
  }

  async list(
    filters: LoadFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<LoadWithProducer>> {
    return this.loadRepository.findAll(filters, pagination);
  }

  async getById(id: number): Promise<LoadWithProducer> {
    const load = await this.loadRepository.findById(id);
    if (!load) {
      throw new NotFoundError('Carga', id);
    }
    return load;
  }

  async getByExternalCode(externalCode: string): Promise<LoadWithProducer | null> {
    return this.loadRepository.findByExternalCode(externalCode);
  }

  async create(data: CreateLoadDTO): Promise<Load> {
    // Validar produtor
    const producer = await this.producerRepository.findById(data.producerId);
    if (!producer) {
      throw new NotFoundError('Produtor', data.producerId);
    }

    if (!producer.isActive) {
      throw new BusinessError(
        'Não é possível criar carga para um produtor inativo',
        'PRODUCER_INACTIVE',
        { producerId: data.producerId }
      );
    }

    // Validar pesos
    if (data.grossWeight <= 0) {
      throw new ValidationError('Peso bruto deve ser maior que zero');
    }

    if (data.tareWeight < 0) {
      throw new ValidationError('Peso tara não pode ser negativo');
    }

    if (data.tareWeight >= data.grossWeight) {
      throw new ValidationError('Peso tara deve ser menor que o peso bruto');
    }

    // Calcular peso líquido se não informado
    const netWeight = data.netWeight || this.calculateNetWeight(data.grossWeight, data.tareWeight);

    // Validar placa
    if (!this.validateLicensePlate(data.licensePlate)) {
      throw new ValidationError('Placa do veículo inválida');
    }

    return this.loadRepository.create({
      ...data,
      netWeight,
      licensePlate: data.licensePlate.toUpperCase().replace(/[^A-Z0-9]/g, '')
    });
  }

  async update(id: number, data: UpdateLoadDTO): Promise<Load> {
    // Verificar se existe
    const existing = await this.loadRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Carga', id);
    }

    // Verificar se pode editar
    if (!await this.canEdit(id)) {
      throw BusinessError.loadAlreadyClosed(id);
    }

    // Validar pesos se informados
    const grossWeight = data.grossWeight ?? existing.grossWeight;
    const tareWeight = data.tareWeight ?? existing.tareWeight;

    if (data.grossWeight !== undefined && data.grossWeight <= 0) {
      throw new ValidationError('Peso bruto deve ser maior que zero');
    }

    if (data.tareWeight !== undefined && data.tareWeight < 0) {
      throw new ValidationError('Peso tara não pode ser negativo');
    }

    if (tareWeight >= grossWeight) {
      throw new ValidationError('Peso tara deve ser menor que o peso bruto');
    }

    // Recalcular peso líquido se pesos mudaram
    if (data.grossWeight !== undefined || data.tareWeight !== undefined) {
      data.netWeight = this.calculateNetWeight(grossWeight, tareWeight);
    }

    // Validar placa se informada
    if (data.licensePlate) {
      if (!this.validateLicensePlate(data.licensePlate)) {
        throw new ValidationError('Placa do veículo inválida');
      }
      data.licensePlate = data.licensePlate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    return this.loadRepository.update(id, data);
  }

  async delete(id: number): Promise<void> {
    const load = await this.loadRepository.findById(id);
    if (!load) {
      throw new NotFoundError('Carga', id);
    }

    if (!await this.canEdit(id)) {
      throw BusinessError.loadAlreadyClosed(id);
    }

    await this.loadRepository.delete(id);
  }

  async updateStatus(id: number, status: LoadStatus, userId?: string): Promise<Load> {
    const load = await this.loadRepository.findById(id);
    if (!load) {
      throw new NotFoundError('Carga', id);
    }

    // Validar transição de status
    this.validateStatusTransition(load.status, status);

    return this.loadRepository.updateStatus(id, status, userId);
  }

  async check(id: number, userId: string): Promise<Load> {
    const load = await this.loadRepository.findById(id);
    if (!load) {
      throw new NotFoundError('Carga', id);
    }

    if (load.status !== 'recebido') {
      throw BusinessError.invalidStatusTransition('Carga', load.status, 'conferido');
    }

    return this.loadRepository.updateStatus(id, 'conferido', userId);
  }

  async close(id: number, userId: string): Promise<Load> {
    const load = await this.loadRepository.findById(id);
    if (!load) {
      throw new NotFoundError('Carga', id);
    }

    if (load.status !== 'conferido') {
      throw BusinessError.loadNotApproved(id);
    }

    return this.loadRepository.close(id, userId);
  }

  async listByProducer(
    producerId: number,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Load>> {
    // Verificar se produtor existe
    const producer = await this.producerRepository.findById(producerId);
    if (!producer) {
      throw new NotFoundError('Produtor', producerId);
    }

    return this.loadRepository.findByProducerId(producerId, pagination);
  }

  async listPending(): Promise<LoadWithProducer[]> {
    return this.loadRepository.findPending();
  }

  async getSummary(): Promise<LoadSummary> {
    const [todayCount, todayWeight, pendingCount, byStatus] = await Promise.all([
      this.loadRepository.countToday(),
      this.getTodayWeight(),
      this.loadRepository.countPending(),
      this.loadRepository.countByStatus()
    ]);

    return {
      totalToday: todayCount,
      totalWeightToday: todayWeight,
      pendingCount,
      byStatus
    };
  }

  async getEvolution(startDate: Date, endDate: Date): Promise<LoadEvolution[]> {
    return this.loadRepository.getEvolution(startDate, endDate);
  }

  async getTotalWeight(startDate?: Date, endDate?: Date): Promise<number> {
    return this.loadRepository.getTotalWeight(startDate, endDate);
  }

  async canEdit(id: number): Promise<boolean> {
    return this.loadRepository.canEdit(id);
  }

  calculateNetWeight(grossWeight: number, tareWeight: number): number {
    return Math.max(0, grossWeight - tareWeight);
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private async getTodayWeight(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.loadRepository.getTotalWeight(today, tomorrow);
  }

  private validateStatusTransition(currentStatus: LoadStatus, newStatus: LoadStatus): void {
    const validTransitions: Record<LoadStatus, LoadStatus[]> = {
      'recebido': ['conferido'],
      'conferido': ['fechado', 'recebido'], // Pode voltar para recebido se houver erro
      'fechado': [] // Não pode mudar de fechado
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw BusinessError.invalidStatusTransition('Carga', currentStatus, newStatus);
    }
  }

  private validateLicensePlate(plate: string): boolean {
    // Remove caracteres especiais
    const clean = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Formato antigo: ABC1234 (3 letras + 4 números)
    const oldFormat = /^[A-Z]{3}[0-9]{4}$/;
    
    // Formato Mercosul: ABC1D23 (3 letras + 1 número + 1 letra + 2 números)
    const mercosulFormat = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
    
    return oldFormat.test(clean) || mercosulFormat.test(clean);
  }
}

// Singleton para uso no sistema
let instance: LoadService | null = null;

export function getLoadService(): ILoadService {
  if (!instance) {
    instance = new LoadService();
  }
  return instance;
}

export default LoadService;
