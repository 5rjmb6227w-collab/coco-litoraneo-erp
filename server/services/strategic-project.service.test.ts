/**
 * Testes unitários do StrategicProjectService
 * 
 * Usa mocks do Repository para testar APENAS a lógica de negócio.
 * Não testa o banco de dados (isso é integração).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StrategicProjectService } from './strategic-project.service';
import type { IStrategicProjectRepository } from '../repositories/interfaces';
import { NotFoundError, ForbiddenError, ValidationError } from '../errors';

// Mock do Repository
const createMockRepository = (): IStrategicProjectRepository => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  addMember: vi.fn(),
  removeMember: vi.fn(),
  getMembers: vi.fn(),
  getPhases: vi.fn(),
  getTasksByProject: vi.fn(),
  getDashboardStats: vi.fn(),
});

describe('StrategicProjectService', () => {
  let service: StrategicProjectService;
  let mockRepository: IStrategicProjectRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new StrategicProjectService(mockRepository);
  });

  describe('create', () => {
    it('deve criar um projeto com sucesso', async () => {
      const userId = 1;
      const input = {
        title: 'Forno de Secagem',
        description: 'Implementação de forno industrial',
        category: 'equipamento',
        priority: 'alta' as const,
        budgetPlanned: 185000,
        dueDate: new Date('2026-12-31')
      };

      const createdProject = {
        id: 1,
        code: 'PROJ-001',
        title: input.title,
        description: input.description,
        category: input.category,
        priority: input.priority,
        status: 'planejamento',
        budgetPlanned: input.budgetPlanned,
        budgetActual: 0,
        progress: 0,
        dueDate: input.dueDate,
        ownerId: userId,
        members: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(mockRepository.create).mockResolvedValue(createdProject);
      vi.mocked(mockRepository.addMember).mockResolvedValue(undefined);
      vi.mocked(mockRepository.findAll).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 50
      });

      const result = await service.create(input, userId);

      expect(result).toEqual(createdProject);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: input.title,
          ownerId: userId,
          status: 'planejamento'
        })
      );
      expect(mockRepository.addMember).toHaveBeenCalledWith(1, userId, 'owner');
    });

    it('deve lançar ValidationError se título estiver vazio', async () => {
      const input = {
        title: '',
        budgetPlanned: 100000
      };

      await expect(service.create(input, 1)).rejects.toThrow(ValidationError);
    });
  });

  describe('getById', () => {
    it('deve retornar projeto se usuário tem acesso', async () => {
      const userId = 1;
      const projectId = 1;
      const project = {
        id: projectId,
        code: 'PROJ-001',
        title: 'Forno de Secagem',
        ownerId: userId,
        members: [],
        status: 'planejamento',
        progress: 0,
        budgetPlanned: 185000,
        budgetActual: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(project);

      const result = await service.getById(projectId, userId);

      expect(result).toEqual(project);
    });

    it('deve lançar NotFoundError se projeto não existe', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.getById(999, 1)).rejects.toThrow(NotFoundError);
    });

    it('deve lançar ForbiddenError se usuário não tem acesso', async () => {
      const project = {
        id: 1,
        code: 'PROJ-001',
        title: 'Forno de Secagem',
        ownerId: 2, // Outro usuário
        members: [],
        status: 'planejamento',
        progress: 0,
        budgetPlanned: 185000,
        budgetActual: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(project);

      await expect(service.getById(1, 1)).rejects.toThrow(ForbiddenError);
    });

    it('deve permitir acesso se usuário é membro', async () => {
      const userId = 2;
      const project = {
        id: 1,
        code: 'PROJ-001',
        title: 'Forno de Secagem',
        ownerId: 1,
        members: [{ userId: 2, role: 'editor' }],
        status: 'planejamento',
        progress: 0,
        budgetPlanned: 185000,
        budgetActual: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(project);

      const result = await service.getById(1, userId);

      expect(result).toEqual(project);
    });
  });

  describe('update', () => {
    it('deve atualizar projeto se usuário é owner', async () => {
      const userId = 1;
      const projectId = 1;
      const existing = {
        id: projectId,
        code: 'PROJ-001',
        title: 'Forno de Secagem',
        ownerId: userId,
        members: [],
        status: 'planejamento',
        progress: 0,
        budgetPlanned: 185000,
        budgetActual: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updated = {
        ...existing,
        status: 'andamento' as const,
        updatedAt: new Date()
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(existing);
      vi.mocked(mockRepository.update).mockResolvedValue(updated);

      const result = await service.update(projectId, { status: 'andamento' }, userId);

      expect(result).toEqual(updated);
      expect(mockRepository.update).toHaveBeenCalledWith(projectId, { status: 'andamento' });
    });

    it('deve lançar ForbiddenError se usuário é viewer', async () => {
      const projectId = 1;
      const existing = {
        id: projectId,
        code: 'PROJ-001',
        title: 'Forno de Secagem',
        ownerId: 1,
        members: [{ userId: 2, role: 'viewer' }],
        status: 'planejamento',
        progress: 0,
        budgetPlanned: 185000,
        budgetActual: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(existing);

      await expect(service.update(projectId, { status: 'andamento' }, 2)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('delete', () => {
    it('deve deletar projeto se usuário é owner', async () => {
      const userId = 1;
      const projectId = 1;
      const project = {
        id: projectId,
        code: 'PROJ-001',
        title: 'Forno de Secagem',
        ownerId: userId,
        members: [],
        status: 'planejamento',
        progress: 0,
        budgetPlanned: 185000,
        budgetActual: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(project);
      vi.mocked(mockRepository.update).mockResolvedValue({ ...project, status: 'cancelado' });

      await service.delete(projectId, userId);

      expect(mockRepository.update).toHaveBeenCalledWith(projectId, { status: 'cancelado' });
    });

    it('deve lançar ForbiddenError se usuário não é owner', async () => {
      const project = {
        id: 1,
        code: 'PROJ-001',
        title: 'Forno de Secagem',
        ownerId: 1,
        members: [],
        status: 'planejamento',
        progress: 0,
        budgetPlanned: 185000,
        budgetActual: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(project);

      await expect(service.delete(1, 2)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getDashboard', () => {
    it('deve retornar estatísticas do dashboard', async () => {
      const userId = 1;
      const projects = [
        {
          id: 1,
          code: 'PROJ-001',
          title: 'Forno de Secagem',
          ownerId: userId,
          members: [],
          status: 'andamento',
          progress: 50,
          budgetPlanned: 185000,
          budgetActual: 120000,
          dueDate: new Date('2026-12-31'),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 2,
          code: 'PROJ-002',
          title: 'Prensa Óleo',
          ownerId: userId,
          members: [],
          status: 'concluido',
          progress: 100,
          budgetPlanned: 320000,
          budgetActual: 310000,
          dueDate: new Date('2026-06-30'),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      vi.mocked(mockRepository.findAll).mockResolvedValue({
        data: projects,
        total: 2,
        page: 1,
        limit: 50
      });

      const result = await service.getDashboard(userId);

      expect(result.totalProjects).toBe(2);
      expect(result.inProgress).toBe(1);
      expect(result.completed).toBe(1);
      expect(result.totalBudgetPlanned).toBe(505000);
      expect(result.totalBudgetActual).toBe(430000);
      expect(result.averageProgress).toBe(75);
    });
  });
});

export {};
