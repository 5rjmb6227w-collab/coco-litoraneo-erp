/**
 * Testes unitários do LoadService.
 * 
 * Segue o padrão AAA (Arrange, Act, Assert).
 * Usa mocks para isolar o service dos repositories.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoadService } from './load.service';
import type { 
  ILoadRepository, 
  IProducerRepository, 
  Load, 
  LoadWithProducer,
  CreateLoadDTO 
} from '../repositories/interfaces';
import { NotFoundError, ValidationError, BusinessError } from '../errors';

// Mock do LoadRepository
const createMockLoadRepository = (): ILoadRepository => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  findByExternalCode: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  updateStatus: vi.fn(),
  close: vi.fn(),
  findByProducerId: vi.fn(),
  findPending: vi.fn(),
  getEvolution: vi.fn(),
  countByStatus: vi.fn(),
  getTotalWeight: vi.fn(),
  countPending: vi.fn(),
  countToday: vi.fn(),
  canEdit: vi.fn()
});

// Mock do ProducerRepository
const createMockProducerRepository = (): IProducerRepository => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  findByCpfCnpj: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  existsByCpfCnpj: vi.fn(),
  countActive: vi.fn(),
  findTopByVolume: vi.fn()
});

// Dados de teste
const mockProducer = {
  id: 1,
  name: 'João Silva',
  cpfCnpj: '12345678901',
  phone: '11999999999',
  email: 'joao@email.com',
  address: 'Rua Teste, 123',
  city: 'São Paulo',
  state: 'SP',
  bankName: null,
  bankAgency: null,
  bankAccount: null,
  pixKey: null,
  isActive: true,
  notes: null,
  createdAt: new Date(),
  createdBy: '1',
  updatedAt: new Date(),
  updatedBy: null
};

const mockLoad: Load = {
  id: 1,
  externalCode: 'CARGA001',
  receivedAt: new Date(),
  producerId: 1,
  licensePlate: 'ABC1234',
  driverName: 'Carlos',
  grossWeight: 1000,
  tareWeight: 200,
  netWeight: 800,
  observations: null,
  photoUrl: null,
  status: 'recebido',
  closedAt: null,
  closedBy: null,
  createdAt: new Date(),
  createdBy: '1',
  updatedAt: new Date(),
  updatedBy: null
};

const mockLoadWithProducer: LoadWithProducer = {
  ...mockLoad,
  producer: {
    id: 1,
    name: 'João Silva',
    cpfCnpj: '12345678901',
    phone: '11999999999'
  }
};

describe('LoadService', () => {
  let service: LoadService;
  let mockLoadRepository: ILoadRepository;
  let mockProducerRepository: IProducerRepository;

  beforeEach(() => {
    mockLoadRepository = createMockLoadRepository();
    mockProducerRepository = createMockProducerRepository();
    service = new LoadService(mockLoadRepository, mockProducerRepository);
  });

  // ==================== TESTES DE LISTAGEM ====================

  describe('list', () => {
    it('deve retornar lista paginada de cargas', async () => {
      // Arrange
      const mockResult = {
        data: [mockLoadWithProducer],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };
      vi.mocked(mockLoadRepository.findAll).mockResolvedValue(mockResult);

      // Act
      const result = await service.list({}, { page: 1, limit: 10 });

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockLoadRepository.findAll).toHaveBeenCalledWith({}, { page: 1, limit: 10 });
    });
  });

  // ==================== TESTES DE BUSCA POR ID ====================

  describe('getById', () => {
    it('deve retornar carga quando encontrada', async () => {
      // Arrange
      vi.mocked(mockLoadRepository.findById).mockResolvedValue(mockLoadWithProducer);

      // Act
      const result = await service.getById(1);

      // Assert
      expect(result).toEqual(mockLoadWithProducer);
    });

    it('deve lançar NotFoundError quando carga não existe', async () => {
      // Arrange
      vi.mocked(mockLoadRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(service.getById(999)).rejects.toThrow(NotFoundError);
    });
  });

  // ==================== TESTES DE CRIAÇÃO ====================

  describe('create', () => {
    const createDTO: CreateLoadDTO = {
      producerId: 1,
      licensePlate: 'ABC1234',
      grossWeight: 1000,
      tareWeight: 200,
      netWeight: 800
    };

    it('deve criar carga com dados válidos', async () => {
      // Arrange
      vi.mocked(mockProducerRepository.findById).mockResolvedValue(mockProducer);
      vi.mocked(mockLoadRepository.create).mockResolvedValue(mockLoad);

      // Act
      const result = await service.create(createDTO);

      // Assert
      expect(result).toEqual(mockLoad);
      expect(mockLoadRepository.create).toHaveBeenCalled();
    });

    it('deve lançar NotFoundError quando produtor não existe', async () => {
      // Arrange
      vi.mocked(mockProducerRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createDTO)).rejects.toThrow(NotFoundError);
    });

    it('deve lançar BusinessError quando produtor está inativo', async () => {
      // Arrange
      vi.mocked(mockProducerRepository.findById).mockResolvedValue({
        ...mockProducer,
        isActive: false
      });

      // Act & Assert
      await expect(service.create(createDTO)).rejects.toThrow(BusinessError);
    });

    it('deve lançar ValidationError quando peso bruto é zero ou negativo', async () => {
      // Arrange
      vi.mocked(mockProducerRepository.findById).mockResolvedValue(mockProducer);
      const invalidDTO = { ...createDTO, grossWeight: 0 };

      // Act & Assert
      await expect(service.create(invalidDTO)).rejects.toThrow(ValidationError);
    });

    it('deve lançar ValidationError quando tara é maior que peso bruto', async () => {
      // Arrange
      vi.mocked(mockProducerRepository.findById).mockResolvedValue(mockProducer);
      const invalidDTO = { ...createDTO, grossWeight: 100, tareWeight: 200 };

      // Act & Assert
      await expect(service.create(invalidDTO)).rejects.toThrow(ValidationError);
    });

    it('deve lançar ValidationError para placa inválida', async () => {
      // Arrange
      vi.mocked(mockProducerRepository.findById).mockResolvedValue(mockProducer);
      const invalidDTO = { ...createDTO, licensePlate: 'INVALID' };

      // Act & Assert
      await expect(service.create(invalidDTO)).rejects.toThrow(ValidationError);
    });

    it('deve aceitar placa no formato Mercosul', async () => {
      // Arrange
      vi.mocked(mockProducerRepository.findById).mockResolvedValue(mockProducer);
      vi.mocked(mockLoadRepository.create).mockResolvedValue(mockLoad);
      const mercosulDTO = { ...createDTO, licensePlate: 'ABC1D23' };

      // Act
      await service.create(mercosulDTO);

      // Assert
      expect(mockLoadRepository.create).toHaveBeenCalled();
    });
  });

  // ==================== TESTES DE ATUALIZAÇÃO ====================

  describe('update', () => {
    it('deve atualizar carga existente', async () => {
      // Arrange
      vi.mocked(mockLoadRepository.findById).mockResolvedValue(mockLoadWithProducer);
      vi.mocked(mockLoadRepository.canEdit).mockResolvedValue(true);
      vi.mocked(mockLoadRepository.update).mockResolvedValue({
        ...mockLoad,
        driverName: 'Pedro'
      });

      // Act
      const result = await service.update(1, { driverName: 'Pedro' });

      // Assert
      expect(result.driverName).toBe('Pedro');
    });

    it('deve lançar NotFoundError quando carga não existe', async () => {
      // Arrange
      vi.mocked(mockLoadRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(999, {})).rejects.toThrow(NotFoundError);
    });

    it('deve lançar BusinessError quando carga está fechada', async () => {
      // Arrange
      vi.mocked(mockLoadRepository.findById).mockResolvedValue({
        ...mockLoadWithProducer,
        status: 'fechado'
      });
      vi.mocked(mockLoadRepository.canEdit).mockResolvedValue(false);

      // Act & Assert
      await expect(service.update(1, {})).rejects.toThrow(BusinessError);
    });

    it('deve recalcular peso líquido quando pesos mudam', async () => {
      // Arrange
      vi.mocked(mockLoadRepository.findById).mockResolvedValue(mockLoadWithProducer);
      vi.mocked(mockLoadRepository.canEdit).mockResolvedValue(true);
      vi.mocked(mockLoadRepository.update).mockResolvedValue({
        ...mockLoad,
        grossWeight: 1200,
        netWeight: 1000
      });

      // Act
      await service.update(1, { grossWeight: 1200 });

      // Assert
      expect(mockLoadRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ netWeight: 1000 })
      );
    });
  });

  // ==================== TESTES DE EXCLUSÃO ====================

  describe('delete', () => {
    it('deve excluir carga existente', async () => {
      // Arrange
      vi.mocked(mockLoadRepository.findById).mockResolvedValue(mockLoadWithProducer);
      vi.mocked(mockLoadRepository.canEdit).mockResolvedValue(true);
      vi.mocked(mockLoadRepository.delete).mockResolvedValue();

      // Act
      await service.delete(1);

      // Assert
      expect(mockLoadRepository.delete).toHaveBeenCalledWith(1);
    });

    it('deve lançar BusinessError quando carga está fechada', async () => {
      // Arrange
      vi.mocked(mockLoadRepository.findById).mockResolvedValue(mockLoadWithProducer);
      vi.mocked(mockLoadRepository.canEdit).mockResolvedValue(false);

      // Act & Assert
      await expect(service.delete(1)).rejects.toThrow(BusinessError);
    });
  });

  // ==================== TESTES DE TRANSIÇÃO DE STATUS ====================

  describe('updateStatus', () => {
    it('deve atualizar status de recebido para conferido', async () => {
      // Arrange
      vi.mocked(mockLoadRepository.findById).mockResolvedValue(mockLoadWithProducer);
      vi.mocked(mockLoadRepository.updateStatus).mockResolvedValue({
        ...mockLoad,
        status: 'conferido'
      });

      // Act
      const result = await service.updateStatus(1, 'conferido', '1');

      // Assert
      expect(result.status).toBe('conferido');
    });

    it('deve lançar BusinessError para transição inválida', async () => {
      // Arrange
      vi.mocked(mockLoadRepository.findById).mockResolvedValue(mockLoadWithProducer);

      // Act & Assert - não pode ir direto de recebido para fechado
      await expect(service.updateStatus(1, 'fechado', '1')).rejects.toThrow(BusinessError);
    });

    it('não deve permitir mudança de status fechado', async () => {
      // Arrange
      vi.mocked(mockLoadRepository.findById).mockResolvedValue({
        ...mockLoadWithProducer,
        status: 'fechado'
      });

      // Act & Assert
      await expect(service.updateStatus(1, 'recebido', '1')).rejects.toThrow(BusinessError);
    });
  });

  // ==================== TESTES DE CONFERÊNCIA ====================

  describe('check', () => {
    it('deve conferir carga com status recebido', async () => {
      // Arrange
      vi.mocked(mockLoadRepository.findById).mockResolvedValue(mockLoadWithProducer);
      vi.mocked(mockLoadRepository.updateStatus).mockResolvedValue({
        ...mockLoad,
        status: 'conferido'
      });

      // Act
      const result = await service.check(1, '1');

      // Assert
      expect(result.status).toBe('conferido');
    });

    it('deve lançar BusinessError se carga não está com status recebido', async () => {
      // Arrange
      vi.mocked(mockLoadRepository.findById).mockResolvedValue({
        ...mockLoadWithProducer,
        status: 'conferido'
      });

      // Act & Assert
      await expect(service.check(1, '1')).rejects.toThrow(BusinessError);
    });
  });

  // ==================== TESTES DE FECHAMENTO ====================

  describe('close', () => {
    it('deve fechar carga conferida', async () => {
      // Arrange
      vi.mocked(mockLoadRepository.findById).mockResolvedValue({
        ...mockLoadWithProducer,
        status: 'conferido'
      });
      vi.mocked(mockLoadRepository.close).mockResolvedValue({
        ...mockLoad,
        status: 'fechado'
      });

      // Act
      const result = await service.close(1, '1');

      // Assert
      expect(result.status).toBe('fechado');
    });

    it('deve lançar BusinessError se carga não está conferida', async () => {
      // Arrange
      vi.mocked(mockLoadRepository.findById).mockResolvedValue(mockLoadWithProducer);

      // Act & Assert
      await expect(service.close(1, '1')).rejects.toThrow(BusinessError);
    });
  });

  // ==================== TESTES DE LISTAGEM POR PRODUTOR ====================

  describe('listByProducer', () => {
    it('deve listar cargas do produtor', async () => {
      // Arrange
      vi.mocked(mockProducerRepository.findById).mockResolvedValue(mockProducer);
      vi.mocked(mockLoadRepository.findByProducerId).mockResolvedValue({
        data: [mockLoad],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });

      // Act
      const result = await service.listByProducer(1, { page: 1, limit: 10 });

      // Assert
      expect(result.data).toHaveLength(1);
    });

    it('deve lançar NotFoundError se produtor não existe', async () => {
      // Arrange
      vi.mocked(mockProducerRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(service.listByProducer(999, { page: 1, limit: 10 })).rejects.toThrow(NotFoundError);
    });
  });

  // ==================== TESTES DE RESUMO ====================

  describe('getSummary', () => {
    it('deve retornar resumo das cargas', async () => {
      // Arrange
      vi.mocked(mockLoadRepository.countToday).mockResolvedValue(5);
      vi.mocked(mockLoadRepository.getTotalWeight).mockResolvedValue(4000);
      vi.mocked(mockLoadRepository.countPending).mockResolvedValue(2);
      vi.mocked(mockLoadRepository.countByStatus).mockResolvedValue({
        recebido: 2,
        conferido: 1,
        fechado: 2
      });

      // Act
      const result = await service.getSummary();

      // Assert
      expect(result.totalToday).toBe(5);
      expect(result.pendingCount).toBe(2);
      expect(result.byStatus.recebido).toBe(2);
    });
  });

  // ==================== TESTES DE CÁLCULO DE PESO LÍQUIDO ====================

  describe('calculateNetWeight', () => {
    it('deve calcular peso líquido corretamente', () => {
      expect(service.calculateNetWeight(1000, 200)).toBe(800);
      expect(service.calculateNetWeight(500, 100)).toBe(400);
    });

    it('deve retornar zero se tara maior que bruto', () => {
      expect(service.calculateNetWeight(100, 200)).toBe(0);
    });
  });

  // ==================== TESTES DE VERIFICAÇÃO DE EDIÇÃO ====================

  describe('canEdit', () => {
    it('deve retornar true para carga não fechada', async () => {
      // Arrange
      vi.mocked(mockLoadRepository.canEdit).mockResolvedValue(true);

      // Act
      const result = await service.canEdit(1);

      // Assert
      expect(result).toBe(true);
    });

    it('deve retornar false para carga fechada', async () => {
      // Arrange
      vi.mocked(mockLoadRepository.canEdit).mockResolvedValue(false);

      // Act
      const result = await service.canEdit(1);

      // Assert
      expect(result).toBe(false);
    });
  });
});
