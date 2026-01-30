/**
 * Implementação do Service de Produtores.
 * Segue o princípio SOLID de Single Responsibility - apenas lógica de negócio.
 * 
 * Este service orquestra o ProducerRepository e aplica regras de negócio.
 */

import type {
  IProducerRepository,
  Producer,
  ProducerFilters,
  CreateProducerDTO,
  UpdateProducerDTO,
  PaginationOptions,
  PaginatedResult
} from '../repositories/interfaces';
import type { IProducerService, ProducerSummary } from './interfaces/IProducerService';
import { getProducerRepository } from '../repositories';
import { NotFoundError, ValidationError } from '../errors';

export class ProducerService implements IProducerService {
  private repository: IProducerRepository;

  constructor(repository?: IProducerRepository) {
    // Dependency Injection - permite injetar mock para testes
    this.repository = repository || getProducerRepository();
  }

  async list(
    filters: ProducerFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Producer>> {
    return this.repository.findAll(filters, pagination);
  }

  async getById(id: number): Promise<Producer> {
    const producer = await this.repository.findById(id);
    if (!producer) {
      throw new NotFoundError('Produtor', id);
    }
    return producer;
  }

  async getByCpfCnpj(cpfCnpj: string): Promise<Producer | null> {
    const cleanCpfCnpj = this.cleanCpfCnpj(cpfCnpj);
    return this.repository.findByCpfCnpj(cleanCpfCnpj);
  }

  async create(data: CreateProducerDTO): Promise<Producer> {
    // Validar CPF/CNPJ
    const cleanCpfCnpj = this.cleanCpfCnpj(data.cpfCnpj);
    
    if (!this.validateCpfCnpj(cleanCpfCnpj)) {
      throw new ValidationError('CPF/CNPJ inválido');
    }

    // Verificar se já existe
    const exists = await this.repository.existsByCpfCnpj(cleanCpfCnpj);
    if (exists) {
      throw new ValidationError('Já existe um produtor com este CPF/CNPJ');
    }

    // Criar com CPF/CNPJ limpo
    return this.repository.create({
      ...data,
      cpfCnpj: cleanCpfCnpj
    });
  }

  async update(id: number, data: UpdateProducerDTO): Promise<Producer> {
    // Verificar se existe
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Produtor', id);
    }

    // Se estiver atualizando CPF/CNPJ, validar
    if (data.cpfCnpj) {
      const cleanCpfCnpj = this.cleanCpfCnpj(data.cpfCnpj);
      
      if (!this.validateCpfCnpj(cleanCpfCnpj)) {
        throw new ValidationError('CPF/CNPJ inválido');
      }

      // Verificar se já existe em outro produtor
      const exists = await this.repository.existsByCpfCnpj(cleanCpfCnpj, id);
      if (exists) {
        throw new ValidationError('Já existe outro produtor com este CPF/CNPJ');
      }

      data.cpfCnpj = cleanCpfCnpj;
    }

    return this.repository.update(id, data);
  }

  async deactivate(id: number): Promise<void> {
    const producer = await this.repository.findById(id);
    if (!producer) {
      throw new NotFoundError('Produtor', id);
    }

    await this.repository.update(id, { isActive: false });
  }

  async reactivate(id: number): Promise<void> {
    const producer = await this.repository.findById(id);
    if (!producer) {
      throw new NotFoundError('Produtor', id);
    }

    await this.repository.update(id, { isActive: true });
  }

  async getSummary(startDate?: Date, endDate?: Date): Promise<ProducerSummary> {
    const [activeCount, topProducers] = await Promise.all([
      this.repository.countActive(),
      this.repository.findTopByVolume(5, startDate, endDate)
    ]);

    // Para contar inativos e novos do mês, precisaríamos de queries adicionais
    // Por simplicidade, retornamos valores estimados
    return {
      totalActive: activeCount,
      totalInactive: 0, // TODO: implementar countInactive no repository
      newThisMonth: 0, // TODO: implementar countNewThisMonth no repository
      topProducers
    };
  }

  async getTopByVolume(
    limit: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ producer: Producer; totalWeight: number; totalLoads: number }>> {
    return this.repository.findTopByVolume(limit, startDate, endDate);
  }

  validateCpfCnpj(cpfCnpj: string): boolean {
    const clean = this.cleanCpfCnpj(cpfCnpj);
    
    if (clean.length === 11) {
      return this.validateCpf(clean);
    } else if (clean.length === 14) {
      return this.validateCnpj(clean);
    }
    
    return false;
  }

  formatCpfCnpj(cpfCnpj: string): string {
    const clean = this.cleanCpfCnpj(cpfCnpj);
    
    if (clean.length === 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (clean.length === 14) {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    return cpfCnpj;
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private cleanCpfCnpj(cpfCnpj: string): string {
    return cpfCnpj.replace(/\D/g, '');
  }

  private validateCpf(cpf: string): boolean {
    if (cpf.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cpf)) return false;

    // Validação do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;

    // Validação do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;

    return true;
  }

  private validateCnpj(cnpj: string): boolean {
    if (cnpj.length !== 14) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cnpj)) return false;

    // Validação do primeiro dígito verificador
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj.charAt(i)) * weights1[i];
    }
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    if (digit1 !== parseInt(cnpj.charAt(12))) return false;

    // Validação do segundo dígito verificador
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj.charAt(i)) * weights2[i];
    }
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    if (digit2 !== parseInt(cnpj.charAt(13))) return false;

    return true;
  }
}

// Singleton para uso no sistema
let instance: ProducerService | null = null;

export function getProducerService(): IProducerService {
  if (!instance) {
    instance = new ProducerService();
  }
  return instance;
}

export default ProducerService;
