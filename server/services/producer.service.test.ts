/**
 * Testes unitários do ProducerService.
 * 
 * Segue o padrão AAA (Arrange, Act, Assert).
 * Usa mocks para isolar o service do repository.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProducerService } from './producer.service';
import type { IProducerRepository, Producer, CreateProducerDTO, UpdateProducerDTO } from '../repositories/interfaces';
import { NotFoundError, ValidationError } from '../errors';

// Mock do repository
const createMockRepository = (): IProducerRepository => ({
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
const mockProducer: Producer = {
  id: 1,
  name: 'João Silva',
  cpfCnpj: '12345678901',
  phone: '11999999999',
  email: 'joao@email.com',
  address: 'Rua Teste, 123',
  city: 'São Paulo',
  state: 'SP',
  bankName: 'Banco Teste',
  bankAgency: '1234',
  bankAccount: '12345-6',
  pixKey: 'joao@email.com',
  isActive: true,
  notes: null,
  createdAt: new Date(),
  createdBy: '1',
  updatedAt: new Date(),
  updatedBy: null
};

describe('ProducerService', () => {
  let service: ProducerService;
  let mockRepository: IProducerRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new ProducerService(mockRepository);
  });

  // ==================== TESTES DE LISTAGEM ====================

  describe('list', () => {
    it('deve retornar lista paginada de produtores', async () => {
      // Arrange
      const mockResult = {
        data: [mockProducer],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };
      vi.mocked(mockRepository.findAll).mockResolvedValue(mockResult);

      // Act
      const result = await service.list({}, { page: 1, limit: 10 });

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockRepository.findAll).toHaveBeenCalledWith({}, { page: 1, limit: 10 });
    });

    it('deve passar filtros para o repository', async () => {
      // Arrange
      const filters = { search: 'João', isActive: true };
      const pagination = { page: 1, limit: 10 };
      vi.mocked(mockRepository.findAll).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      });

      // Act
      await service.list(filters, pagination);

      // Assert
      expect(mockRepository.findAll).toHaveBeenCalledWith(filters, pagination);
    });
  });

  // ==================== TESTES DE BUSCA POR ID ====================

  describe('getById', () => {
    it('deve retornar produtor quando encontrado', async () => {
      // Arrange
      vi.mocked(mockRepository.findById).mockResolvedValue(mockProducer);

      // Act
      const result = await service.getById(1);

      // Assert
      expect(result).toEqual(mockProducer);
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
    });

    it('deve lançar NotFoundError quando produtor não existe', async () => {
      // Arrange
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(service.getById(999)).rejects.toThrow(NotFoundError);
    });
  });

  // ==================== TESTES DE CRIAÇÃO ====================

  describe('create', () => {
    const createDTO: CreateProducerDTO = {
      name: 'Maria Santos',
      cpfCnpj: '529.982.247-25', // CPF válido
      phone: '11988888888',
      email: 'maria@email.com'
    };

    it('deve criar produtor com CPF válido', async () => {
      // Arrange
      vi.mocked(mockRepository.existsByCpfCnpj).mockResolvedValue(false);
      vi.mocked(mockRepository.create).mockResolvedValue({
        ...mockProducer,
        id: 2,
        name: createDTO.name,
        cpfCnpj: '52998224725'
      });

      // Act
      const result = await service.create(createDTO);

      // Assert
      expect(result.name).toBe(createDTO.name);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cpfCnpj: '52998224725' // CPF limpo
        })
      );
    });

    it('deve criar produtor com CNPJ válido', async () => {
      // Arrange
      const cnpjDTO = { ...createDTO, cpfCnpj: '11.222.333/0001-81' }; // CNPJ válido
      vi.mocked(mockRepository.existsByCpfCnpj).mockResolvedValue(false);
      vi.mocked(mockRepository.create).mockResolvedValue({
        ...mockProducer,
        cpfCnpj: '11222333000181'
      });

      // Act
      const result = await service.create(cnpjDTO);

      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cpfCnpj: '11222333000181' // CNPJ limpo
        })
      );
    });

    it('deve lançar ValidationError para CPF inválido', async () => {
      // Arrange
      const invalidDTO = { ...createDTO, cpfCnpj: '111.111.111-11' };

      // Act & Assert
      await expect(service.create(invalidDTO)).rejects.toThrow(ValidationError);
    });

    it('deve lançar ValidationError para CNPJ inválido', async () => {
      // Arrange
      const invalidDTO = { ...createDTO, cpfCnpj: '11.111.111/1111-11' };

      // Act & Assert
      await expect(service.create(invalidDTO)).rejects.toThrow(ValidationError);
    });

    it('deve lançar ValidationError quando CPF/CNPJ já existe', async () => {
      // Arrange
      vi.mocked(mockRepository.existsByCpfCnpj).mockResolvedValue(true);

      // Act & Assert
      await expect(service.create(createDTO)).rejects.toThrow(ValidationError);
      await expect(service.create(createDTO)).rejects.toThrow(/Já existe/);
    });
  });

  // ==================== TESTES DE ATUALIZAÇÃO ====================

  describe('update', () => {
    const updateDTO: UpdateProducerDTO = {
      name: 'João Silva Atualizado',
      phone: '11977777777'
    };

    it('deve atualizar produtor existente', async () => {
      // Arrange
      vi.mocked(mockRepository.findById).mockResolvedValue(mockProducer);
      vi.mocked(mockRepository.update).mockResolvedValue({
        ...mockProducer,
        ...updateDTO
      });

      // Act
      const result = await service.update(1, updateDTO);

      // Assert
      expect(result.name).toBe(updateDTO.name);
      expect(mockRepository.update).toHaveBeenCalledWith(1, updateDTO);
    });

    it('deve lançar NotFoundError quando produtor não existe', async () => {
      // Arrange
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(999, updateDTO)).rejects.toThrow(NotFoundError);
    });

    it('deve validar novo CPF/CNPJ na atualização', async () => {
      // Arrange
      vi.mocked(mockRepository.findById).mockResolvedValue(mockProducer);
      const updateWithCpf = { cpfCnpj: '111.111.111-11' };

      // Act & Assert
      await expect(service.update(1, updateWithCpf)).rejects.toThrow(ValidationError);
    });

    it('deve verificar duplicidade de CPF/CNPJ na atualização', async () => {
      // Arrange
      vi.mocked(mockRepository.findById).mockResolvedValue(mockProducer);
      vi.mocked(mockRepository.existsByCpfCnpj).mockResolvedValue(true);
      const updateWithCpf = { cpfCnpj: '529.982.247-25' };

      // Act & Assert
      await expect(service.update(1, updateWithCpf)).rejects.toThrow(ValidationError);
      await expect(service.update(1, updateWithCpf)).rejects.toThrow(/outro produtor/);
    });
  });

  // ==================== TESTES DE DESATIVAÇÃO/REATIVAÇÃO ====================

  describe('deactivate', () => {
    it('deve desativar produtor existente', async () => {
      // Arrange
      vi.mocked(mockRepository.findById).mockResolvedValue(mockProducer);
      vi.mocked(mockRepository.update).mockResolvedValue({
        ...mockProducer,
        isActive: false
      });

      // Act
      await service.deactivate(1);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(1, { isActive: false });
    });

    it('deve lançar NotFoundError quando produtor não existe', async () => {
      // Arrange
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(service.deactivate(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('reactivate', () => {
    it('deve reativar produtor existente', async () => {
      // Arrange
      vi.mocked(mockRepository.findById).mockResolvedValue({
        ...mockProducer,
        isActive: false
      });
      vi.mocked(mockRepository.update).mockResolvedValue({
        ...mockProducer,
        isActive: true
      });

      // Act
      await service.reactivate(1);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(1, { isActive: true });
    });
  });

  // ==================== TESTES DE VALIDAÇÃO CPF/CNPJ ====================

  describe('validateCpfCnpj', () => {
    it('deve validar CPF correto', () => {
      expect(service.validateCpfCnpj('529.982.247-25')).toBe(true);
      expect(service.validateCpfCnpj('52998224725')).toBe(true);
    });

    it('deve rejeitar CPF inválido', () => {
      expect(service.validateCpfCnpj('111.111.111-11')).toBe(false);
      expect(service.validateCpfCnpj('123.456.789-00')).toBe(false);
      expect(service.validateCpfCnpj('12345')).toBe(false);
    });

    it('deve validar CNPJ correto', () => {
      expect(service.validateCpfCnpj('11.222.333/0001-81')).toBe(true);
      expect(service.validateCpfCnpj('11222333000181')).toBe(true);
    });

    it('deve rejeitar CNPJ inválido', () => {
      expect(service.validateCpfCnpj('11.111.111/1111-11')).toBe(false);
      expect(service.validateCpfCnpj('00.000.000/0000-00')).toBe(false);
    });
  });

  // ==================== TESTES DE FORMATAÇÃO CPF/CNPJ ====================

  describe('formatCpfCnpj', () => {
    it('deve formatar CPF corretamente', () => {
      expect(service.formatCpfCnpj('52998224725')).toBe('529.982.247-25');
    });

    it('deve formatar CNPJ corretamente', () => {
      expect(service.formatCpfCnpj('11222333000181')).toBe('11.222.333/0001-81');
    });

    it('deve retornar valor original se formato inválido', () => {
      expect(service.formatCpfCnpj('12345')).toBe('12345');
    });
  });

  // ==================== TESTES DE RESUMO ====================

  describe('getSummary', () => {
    it('deve retornar resumo dos produtores', async () => {
      // Arrange
      vi.mocked(mockRepository.countActive).mockResolvedValue(10);
      vi.mocked(mockRepository.findTopByVolume).mockResolvedValue([
        { producer: mockProducer, totalWeight: 1000, totalLoads: 5 }
      ]);

      // Act
      const result = await service.getSummary();

      // Assert
      expect(result.totalActive).toBe(10);
      expect(result.topProducers).toHaveLength(1);
    });
  });

  // ==================== TESTES DE TOP PRODUTORES ====================

  describe('getTopByVolume', () => {
    it('deve retornar top produtores por volume', async () => {
      // Arrange
      const topProducers = [
        { producer: mockProducer, totalWeight: 1000, totalLoads: 5 },
        { producer: { ...mockProducer, id: 2 }, totalWeight: 800, totalLoads: 4 }
      ];
      vi.mocked(mockRepository.findTopByVolume).mockResolvedValue(topProducers);

      // Act
      const result = await service.getTopByVolume(5);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockRepository.findTopByVolume).toHaveBeenCalledWith(5, undefined, undefined);
    });

    it('deve passar período para o repository', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      vi.mocked(mockRepository.findTopByVolume).mockResolvedValue([]);

      // Act
      await service.getTopByVolume(5, startDate, endDate);

      // Assert
      expect(mockRepository.findTopByVolume).toHaveBeenCalledWith(5, startDate, endDate);
    });
  });
});
