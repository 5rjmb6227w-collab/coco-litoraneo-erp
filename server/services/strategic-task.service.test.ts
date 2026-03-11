/**
 * Testes unitários do StrategicTaskService
 * 
 * Usa mocks do Repository para testar APENAS a lógica de negócio.
 * Não testa o banco de dados (isso é integração).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StrategicTaskService } from './strategic-task.service';
import type { IStrategicTaskRepository, IStrategicProjectRepository } from '../repositories/interfaces';
import { NotFoundError, ForbiddenError, ValidationError } from '../errors';

// Mocks dos Repositories
const createMockTaskRepository = (): IStrategicTaskRepository => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  addNote: vi.fn(),
  deleteNote: vi.fn(),
  addDependency: vi.fn(),
  removeDependency: vi.fn(),
  addLink: vi.fn(),
  removeLink: vi.fn(),
  reorder: vi.fn(),
  findByDateRange: vi.fn(),
  findOverdue: vi.fn(),
  getTaskCounts: vi.fn(),
});

const createMockProjectRepository = (): IStrategicProjectRepository => ({
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

describe('StrategicTaskService', () => {
  let service: StrategicTaskService;
  let mockTaskRepository: IStrategicTaskRepository;
  let mockProjectRepository: IStrategicProjectRepository;

  beforeEach(() => {
    mockTaskRepository = createMockTaskRepository();
    mockProjectRepository = createMockProjectRepository();
    service = new StrategicTaskService(mockTaskRepository);
    // Substituir projectRepository interno
    (service as any).projectRepository = mockProjectRepository;
  });

  describe('create', () => {
    it('deve criar uma tarefa com sucesso', async () => {
      const userId = 1;
      const projectId = 1;
      const input = {
        projectId,
        phaseId: 1,
        title: 'Instalar forno',
        description: 'Instalação do forno de secagem',
        priority: 'alta' as const,
        estimatedCost: 50000,
        dueDate: new Date('2026-12-31')
      };

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

      const createdTask = {
        id: 1,
        code: 'PROJ-001-T01',
        projectId,
        phaseId: 1,
        title: input.title,
        description: input.description,
        priority: input.priority,
        status: 'pendente',
        estimatedCost: input.estimatedCost,
        actualCost: 0,
        progress: 0,
        dueDate: input.dueDate,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockTaskRepository.create).mockResolvedValue(createdTask);
      vi.mocked(mockTaskRepository.findAll).mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 });
      vi.mocked(mockProjectRepository.update).mockResolvedValue(project);

      const result = await service.create(input, userId);

      expect(result).toEqual(createdTask);
      expect(mockTaskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: input.title,
          status: 'pendente'
        })
      );
    });

    it('deve lançar ValidationError se título estiver vazio', async () => {
      const input = {
        projectId: 1,
        phaseId: 1,
        title: ''
      };

      await expect(service.create(input, 1)).rejects.toThrow(ValidationError);
    });

    it('deve lançar NotFoundError se projeto não existe', async () => {
      const input = {
        projectId: 999,
        phaseId: 1,
        title: 'Tarefa'
      };

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(null);

      await expect(service.create(input, 1)).rejects.toThrow(NotFoundError);
    });

    it('deve lançar ForbiddenError se usuário não tem acesso ao projeto', async () => {
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

      const input = {
        projectId: 1,
        phaseId: 1,
        title: 'Tarefa'
      };

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);

      await expect(service.create(input, 1)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('update', () => {
    it('deve atualizar status para concluida e preencher completedAt', async () => {
      const userId = 1;
      const taskId = 1;
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

      const existing = {
        id: taskId,
        code: 'PROJ-001-T01',
        projectId,
        phaseId: 1,
        title: 'Instalar forno',
        status: 'em_andamento',
        estimatedCost: 50000,
        actualCost: 0,
        progress: 80,
        dueDate: new Date('2026-12-31'),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updated = {
        ...existing,
        status: 'concluida',
        completedAt: new Date(),
        progress: 100,
        updatedAt: new Date()
      };

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(existing);
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockTaskRepository.update).mockResolvedValue(updated);
      vi.mocked(mockTaskRepository.findAll).mockResolvedValue({ data: [updated], total: 1, page: 1, limit: 50 });
      vi.mocked(mockProjectRepository.update).mockResolvedValue(project);

      const result = await service.update(taskId, { status: 'concluida' }, userId);

      expect(result.status).toBe('concluida');
      expect(result.completedAt).toBeDefined();
    });

    it('deve recalcular progress do projeto após atualização', async () => {
      const userId = 1;
      const taskId = 1;
      const projectId = 1;

      const project = {
        id: projectId,
        code: 'PROJ-001',
        title: 'Forno de Secagem',
        ownerId: userId,
        members: [],
        status: 'planejamento',
        progress: 50,
        budgetPlanned: 185000,
        budgetActual: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const existing = {
        id: taskId,
        code: 'PROJ-001-T01',
        projectId,
        phaseId: 1,
        title: 'Instalar forno',
        status: 'em_andamento',
        estimatedCost: 50000,
        actualCost: 0,
        progress: 80,
        dueDate: new Date('2026-12-31'),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updated = {
        ...existing,
        status: 'concluida',
        completedAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(existing);
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockTaskRepository.update).mockResolvedValue(updated);
      vi.mocked(mockTaskRepository.findAll).mockResolvedValue({ data: [updated], total: 1, page: 1, limit: 50 });
      vi.mocked(mockProjectRepository.update).mockResolvedValue(project);

      await service.update(taskId, { status: 'concluida' }, userId);

      expect(mockProjectRepository.update).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining({ progress: expect.any(Number) })
      );
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

      const existing = {
        id: 1,
        code: 'PROJ-001-T01',
        projectId: 1,
        phaseId: 1,
        title: 'Instalar forno',
        status: 'em_andamento',
        estimatedCost: 50000,
        actualCost: 0,
        progress: 80,
        dueDate: new Date('2026-12-31'),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(existing);
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);

      await expect(service.update(1, { status: 'concluida' }, 1)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getTodayTasks', () => {
    it('deve retornar tarefas com dueDate = hoje', async () => {
      const userId = 1;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tasks = [
        {
          id: 1,
          code: 'PROJ-001-T01',
          projectId: 1,
          phaseId: 1,
          title: 'Tarefa hoje',
          status: 'pendente',
          estimatedCost: 5000,
          actualCost: 0,
          progress: 0,
          dueDate: today,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      vi.mocked(mockTaskRepository.findByDateRange).mockResolvedValue(tasks);

      const result = await service.getTodayTasks(userId);

      expect(result).toEqual(tasks);
      expect(mockTaskRepository.findByDateRange).toHaveBeenCalled();
    });
  });

  describe('getOverdueTasks', () => {
    it('deve retornar tarefas atrasadas', async () => {
      const userId = 1;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tasks = [
        {
          id: 1,
          code: 'PROJ-001-T01',
          projectId: 1,
          phaseId: 1,
          title: 'Tarefa atrasada',
          status: 'em_andamento',
          estimatedCost: 5000,
          actualCost: 0,
          progress: 50,
          dueDate: yesterday,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      vi.mocked(mockTaskRepository.findOverdue).mockResolvedValue(tasks);

      const result = await service.getOverdueTasks(userId);

      expect(result).toEqual(tasks);
      expect(mockTaskRepository.findOverdue).toHaveBeenCalled();
    });
  });

  describe('bulkUpdateStatus', () => {
    it('deve atualizar status de múltiplas tarefas', async () => {
      const userId = 1;
      const taskIds = [1, 2, 3];

      const task1 = {
        id: 1,
        code: 'PROJ-001-T01',
        projectId: 1,
        phaseId: 1,
        title: 'Tarefa 1',
        status: 'pendente',
        estimatedCost: 5000,
        actualCost: 0,
        progress: 0,
        dueDate: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const project = {
        id: 1,
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

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(task1);
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockTaskRepository.update).mockResolvedValue({ ...task1, status: 'em_andamento' });
      vi.mocked(mockTaskRepository.findAll).mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 });
      vi.mocked(mockProjectRepository.update).mockResolvedValue(project);

      await service.bulkUpdateStatus(taskIds, 'em_andamento', userId);

      // findById é chamado múltiplas vezes (uma por tarefa + chamadas internas)
      expect(mockTaskRepository.findById).toHaveBeenCalled();
      expect(mockTaskRepository.update).toHaveBeenCalled();
    });

    it('deve lançar ValidationError se status é inválido', async () => {
      await expect(service.bulkUpdateStatus([1], 'status_invalido' as any, 1)).rejects.toThrow(ValidationError);
    });
  });
});

export {};
