/**
 * Testes unitários do StrategicTaskService
 * 
 * Segue o padrão AAA (Arrange, Act, Assert).
 * Usa mocks dos Repositories para testar APENAS a lógica de negócio.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StrategicTaskService } from './strategic-task.service';
import type { IStrategicTaskRepository } from '../repositories/interfaces/IStrategicTaskRepository';
import type { IStrategicProjectRepository } from '../repositories/interfaces/IStrategicProjectRepository';
import { NotFoundError, ForbiddenError, ValidationError } from '../errors';

// Mock emitEvent
vi.mock('../ai/eventEmitter', () => ({
  emitEvent: vi.fn().mockResolvedValue(undefined),
  EVENT_TYPES: {
    STRATEGIC_TASK_CREATED: 'STRATEGIC_TASK_CREATED',
    STRATEGIC_TASK_COMPLETED: 'STRATEGIC_TASK_COMPLETED',
    STRATEGIC_TASK_OVERDUE: 'STRATEGIC_TASK_OVERDUE',
  }
}));

const createMockTaskRepository = (): IStrategicTaskRepository => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  findByProject: vi.fn(),
  findDueToday: vi.fn(),
  findOverdue: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  reorder: vi.fn(),
  countByProjectAndStatus: vi.fn(),
  getNextCode: vi.fn(),
  findNotesByTask: vi.fn(),
  findNotesByProject: vi.fn(),
  createNote: vi.fn(),
  deleteNote: vi.fn(),
  findDependenciesByTask: vi.fn(),
  createDependency: vi.fn(),
  deleteDependency: vi.fn(),
  findLinksByTask: vi.fn(),
  findLinksByProject: vi.fn(),
  createLink: vi.fn(),
  deleteLink: vi.fn(),
});

const createMockProjectRepository = (): IStrategicProjectRepository => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  findByCode: vi.fn(),
  findByUser: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getNextCode: vi.fn(),
  getDashboardStats: vi.fn(),
  findPhasesByProject: vi.fn(),
  createPhase: vi.fn(),
  updatePhase: vi.fn(),
  deletePhase: vi.fn(),
  findMembersByProject: vi.fn(),
  addMember: vi.fn(),
  removeMember: vi.fn(),
  isMember: vi.fn(),
  getMemberRole: vi.fn(),
});

const makeProject = (overrides: Record<string, any> = {}) => ({
  id: 1,
  code: 'PROJ-001',
  title: 'Forno de Secagem',
  description: 'Implementação de forno industrial',
  category: 'equipamento' as const,
  priority: 'alta' as const,
  status: 'em_andamento' as const,
  startDate: new Date('2026-01-15'),
  targetEndDate: new Date('2026-06-30'),
  actualEndDate: null,
  budgetPlanned: '185000',
  budgetActual: '0',
  progress: 0,
  ownerId: 1,
  photoUrl: null,
  tags: null,
  createdAt: new Date(),
  createdBy: 1,
  updatedAt: new Date(),
  updatedBy: null,
  ...overrides,
});

const makeTask = (overrides: Record<string, any> = {}) => ({
  id: 1,
  code: 'PROJ-001-T01',
  projectId: 1,
  phaseId: null,
  title: 'Instalar forno',
  description: null,
  status: 'a_fazer' as const,
  priority: 'alta' as const,
  assigneeId: null,
  estimatedCost: '50000',
  actualCost: '0',
  dueDate: new Date('2026-06-30'),
  completedAt: null,
  orderIndex: 0,
  createdAt: new Date(),
  createdBy: 1,
  updatedAt: new Date(),
  updatedBy: null,
  ...overrides,
});

describe('StrategicTaskService', () => {
  let service: StrategicTaskService;
  let mockTaskRepository: IStrategicTaskRepository;
  let mockProjectRepository: IStrategicProjectRepository;

  beforeEach(() => {
    mockTaskRepository = createMockTaskRepository();
    mockProjectRepository = createMockProjectRepository();
    service = new StrategicTaskService(mockTaskRepository, mockProjectRepository);
    vi.clearAllMocks();
  });

  // ==================== TESTES DE CRIAÇÃO ====================

  describe('create', () => {
    it('deve criar uma tarefa com sucesso', async () => {
      const userId = 1;
      const project = makeProject({ ownerId: userId });
      const input = {
        projectId: 1,
        title: 'Instalar forno',
        priority: 'alta' as const,
        estimatedCost: '50000',
        dueDate: '2026-06-30',
        createdBy: userId,
      };
      const createdTask = makeTask();

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockProjectRepository.getMemberRole).mockResolvedValue(null);
      vi.mocked(mockTaskRepository.getNextCode).mockResolvedValue('PROJ-001-T01');
      vi.mocked(mockTaskRepository.create).mockResolvedValue(createdTask);
      vi.mocked(mockTaskRepository.countByProjectAndStatus).mockResolvedValue({
        a_fazer: 1, em_andamento: 0, aguardando: 0, concluida: 0,
      });
      vi.mocked(mockProjectRepository.update).mockResolvedValue(makeProject());

      const result = await service.create(input, userId);

      expect(result).toEqual(createdTask);
      expect(mockTaskRepository.create).toHaveBeenCalledTimes(1);
    });

    it('deve definir status padrão como a_fazer', async () => {
      const userId = 1;
      const project = makeProject({ ownerId: userId });
      const input = {
        projectId: 1,
        title: 'Tarefa sem status',
        priority: 'media' as const,
        createdBy: userId,
      };

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockTaskRepository.create).mockResolvedValue(makeTask());
      vi.mocked(mockTaskRepository.countByProjectAndStatus).mockResolvedValue({
        a_fazer: 1, em_andamento: 0, aguardando: 0, concluida: 0,
      });
      vi.mocked(mockProjectRepository.update).mockResolvedValue(makeProject());

      await service.create(input, userId);

      expect(mockTaskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'a_fazer' })
      );
    });

    it('deve lançar ValidationError se título estiver vazio', async () => {
      const project = makeProject({ ownerId: 1 });
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);

      const input = {
        projectId: 1,
        title: '',
        priority: 'alta' as const,
        createdBy: 1,
      };

      await expect(service.create(input, 1)).rejects.toThrow(ValidationError);
    });

    it('deve lançar ValidationError se projectId estiver ausente', async () => {
      const input = {
        projectId: 0,
        title: 'Tarefa',
        priority: 'alta' as const,
        createdBy: 1,
      };

      await expect(service.create(input, 1)).rejects.toThrow();
    });

    it('deve lançar ForbiddenError se usuário não tem acesso ao projeto', async () => {
      const project = makeProject({ ownerId: 2 });
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockProjectRepository.isMember).mockResolvedValue(false);

      const input = {
        projectId: 1,
        title: 'Instalar forno',
        priority: 'alta' as const,
        createdBy: 99,
      };

      await expect(service.create(input, 99)).rejects.toThrow(ForbiddenError);
    });
  });

  // ==================== TESTES DE BUSCA POR ID ====================

  describe('getById', () => {
    it('deve retornar tarefa se usuário tem acesso ao projeto', async () => {
      const userId = 1;
      const task = makeTask({ projectId: 1 });
      const project = makeProject({ ownerId: userId });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(task);
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);

      const result = await service.getById(1, userId);

      expect(result).toEqual(task);
    });

    it('deve lançar NotFoundError se tarefa não existe', async () => {
      vi.mocked(mockTaskRepository.findById).mockResolvedValue(null);

      await expect(service.getById(999, 1)).rejects.toThrow(NotFoundError);
    });
  });

  // ==================== TESTES DE ATUALIZAÇÃO ====================

  describe('update', () => {
    it('deve atualizar tarefa se usuário é owner do projeto', async () => {
      const userId = 1;
      const task = makeTask({ projectId: 1 });
      const project = makeProject({ ownerId: userId });
      const updatedTask = makeTask({ status: 'em_andamento' as const });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(task);
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockProjectRepository.getMemberRole).mockResolvedValue(null);
      vi.mocked(mockTaskRepository.update).mockResolvedValue(updatedTask);
      vi.mocked(mockTaskRepository.countByProjectAndStatus).mockResolvedValue({
        a_fazer: 2, em_andamento: 1, aguardando: 0, concluida: 1,
      });
      vi.mocked(mockProjectRepository.update).mockResolvedValue(makeProject({ progress: 25 }));

      const result = await service.update(1, { status: 'em_andamento' }, userId);

      expect(result).toEqual(updatedTask);
    });

    it('deve preencher completedAt ao mudar status para concluida', async () => {
      const userId = 1;
      const task = makeTask({ projectId: 1, status: 'em_andamento' });
      const project = makeProject({ ownerId: userId });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(task);
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockTaskRepository.update).mockResolvedValue(makeTask({ status: 'concluida', completedAt: new Date() }));
      vi.mocked(mockTaskRepository.countByProjectAndStatus).mockResolvedValue({
        a_fazer: 0, em_andamento: 0, aguardando: 0, concluida: 1,
      });
      vi.mocked(mockProjectRepository.update).mockResolvedValue(makeProject({ progress: 100, status: 'concluido' }));

      await service.update(1, { status: 'concluida' }, userId);

      // Verificar que completedAt foi passado ao repository.update
      expect(mockTaskRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'concluida',
          completedAt: expect.any(Date),
        })
      );
    });

    it('deve limpar completedAt ao mudar de concluida para outro status', async () => {
      const userId = 1;
      const task = makeTask({ projectId: 1, status: 'concluida', completedAt: new Date() });
      const project = makeProject({ ownerId: userId });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(task);
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockTaskRepository.update).mockResolvedValue(makeTask({ status: 'em_andamento', completedAt: null }));
      vi.mocked(mockTaskRepository.countByProjectAndStatus).mockResolvedValue({
        a_fazer: 0, em_andamento: 1, aguardando: 0, concluida: 0,
      });
      vi.mocked(mockProjectRepository.update).mockResolvedValue(makeProject({ progress: 0 }));

      await service.update(1, { status: 'em_andamento' }, userId);

      expect(mockTaskRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'em_andamento',
          completedAt: null,
        })
      );
    });

    it('deve recalcular budgetActual quando actualCost muda', async () => {
      const userId = 1;
      const task = makeTask({ projectId: 1, actualCost: '0' });
      const project = makeProject({ ownerId: userId });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(task);
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockTaskRepository.update).mockResolvedValue(makeTask({ actualCost: '25000' }));
      vi.mocked(mockTaskRepository.countByProjectAndStatus).mockResolvedValue({
        a_fazer: 1, em_andamento: 0, aguardando: 0, concluida: 0,
      });
      vi.mocked(mockProjectRepository.update).mockResolvedValue(makeProject());
      vi.mocked(mockTaskRepository.findAll).mockResolvedValue({
        data: [makeTask({ actualCost: '25000' })],
        total: 1,
        page: 1,
        limit: 10000,
      });

      await service.update(1, { actualCost: '25000' }, userId);

      // recalculateProjectBudget should have been called
      expect(mockProjectRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ budgetActual: '25000' })
      );
    });

    it('deve lançar ForbiddenError se usuário não tem acesso', async () => {
      const task = makeTask({ projectId: 1 });
      const project = makeProject({ ownerId: 2 });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(task);
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockProjectRepository.isMember).mockResolvedValue(false);

      await expect(service.update(1, { status: 'concluida' }, 99)).rejects.toThrow(ForbiddenError);
    });

    it('deve recalcular progresso do projeto ao mudar status', async () => {
      const userId = 1;
      const task = makeTask({ projectId: 1, status: 'a_fazer' });
      const project = makeProject({ ownerId: userId });
      const updatedTask = makeTask({ status: 'concluida' as const });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(task);
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockProjectRepository.isMember).mockResolvedValue(false);
      vi.mocked(mockTaskRepository.update).mockResolvedValue(updatedTask);
      vi.mocked(mockTaskRepository.countByProjectAndStatus).mockResolvedValue({
        a_fazer: 1, em_andamento: 0, aguardando: 0, concluida: 3,
      });
      vi.mocked(mockProjectRepository.update).mockResolvedValue(makeProject({ progress: 75 }));

      await service.update(1, { status: 'concluida' }, userId);

      // recalculateProjectProgress calls projectRepository.update with progress
      expect(mockProjectRepository.update).toHaveBeenCalledWith(1, { progress: 75 });
    });
  });

  // ==================== TESTES DE TAREFAS DE HOJE / ATRASADAS ====================

  describe('getTodayTasks', () => {
    it('deve retornar tarefas com dueDate = hoje', async () => {
      const userId = 1;
      const tasks = [makeTask({ dueDate: new Date() })];

      vi.mocked(mockTaskRepository.findDueToday).mockResolvedValue(tasks);

      const result = await service.getTodayTasks(userId);

      expect(result).toEqual(tasks);
      expect(mockTaskRepository.findDueToday).toHaveBeenCalledWith(userId);
    });
  });

  describe('getOverdueTasks', () => {
    it('deve retornar tarefas atrasadas', async () => {
      const userId = 1;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tasks = [makeTask({ dueDate: yesterday, status: 'em_andamento' })];

      vi.mocked(mockTaskRepository.findOverdue).mockResolvedValue(tasks);

      const result = await service.getOverdueTasks(userId);

      expect(result).toEqual(tasks);
      expect(mockTaskRepository.findOverdue).toHaveBeenCalledWith(userId);
    });
  });

  // ==================== TESTES DE BULK UPDATE ====================

  describe('bulkUpdateStatus', () => {
    it('deve atualizar status de múltiplas tarefas', async () => {
      const userId = 1;
      const taskIds = [1, 2];
      const task = makeTask({ projectId: 1 });
      const project = makeProject({ ownerId: userId });
      const updatedTask = makeTask({ status: 'em_andamento' as const });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(task);
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockProjectRepository.getMemberRole).mockResolvedValue(null);
      vi.mocked(mockTaskRepository.update).mockResolvedValue(updatedTask);
      vi.mocked(mockTaskRepository.countByProjectAndStatus).mockResolvedValue({
        a_fazer: 2, em_andamento: 2, aguardando: 0, concluida: 0,
      });
      vi.mocked(mockProjectRepository.update).mockResolvedValue(makeProject());

      await service.bulkUpdateStatus(taskIds, 'em_andamento', userId);

      expect(mockTaskRepository.update).toHaveBeenCalledTimes(2);
    });

    it('deve lançar ValidationError se status é inválido', async () => {
      await expect(service.bulkUpdateStatus([1], 'status_invalido' as any, 1)).rejects.toThrow(ValidationError);
    });

    it('deve preencher completedAt ao fazer bulk update para concluida', async () => {
      const userId = 1;
      const task = makeTask({ projectId: 1, status: 'a_fazer' });
      const project = makeProject({ ownerId: userId });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(task);
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockTaskRepository.update).mockResolvedValue(makeTask({ status: 'concluida' }));
      vi.mocked(mockTaskRepository.countByProjectAndStatus).mockResolvedValue({
        a_fazer: 0, em_andamento: 0, aguardando: 0, concluida: 1,
      });
      vi.mocked(mockProjectRepository.update).mockResolvedValue(makeProject({ progress: 100, status: 'concluido' }));

      await service.bulkUpdateStatus([1], 'concluida', userId);

      expect(mockTaskRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'concluida',
          completedAt: expect.any(Date),
        })
      );
    });
  });

  // ==================== TESTES DE EXCLUSÃO ====================

  describe('delete', () => {
    it('deve deletar tarefa e recalcular progresso', async () => {
      const userId = 1;
      const task = makeTask({ projectId: 1 });
      const project = makeProject({ ownerId: userId });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(task);
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockProjectRepository.getMemberRole).mockResolvedValue(null);
      vi.mocked(mockTaskRepository.delete).mockResolvedValue(undefined);
      vi.mocked(mockTaskRepository.countByProjectAndStatus).mockResolvedValue({
        a_fazer: 1, em_andamento: 0, aguardando: 0, concluida: 2,
      });
      vi.mocked(mockProjectRepository.update).mockResolvedValue(makeProject());

      await service.delete(1, userId);

      expect(mockTaskRepository.delete).toHaveBeenCalledWith(1);
      // Verifica que recalculou progresso
      expect(mockProjectRepository.update).toHaveBeenCalledWith(1, { progress: expect.any(Number) });
    });

    it('deve lançar NotFoundError se tarefa não existe', async () => {
      vi.mocked(mockTaskRepository.findById).mockResolvedValue(null);

      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundError);
    });

    it('deve verificar acesso antes de excluir', async () => {
      const task = makeTask({ projectId: 1 });
      const project = makeProject({ ownerId: 2 });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(task);
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockProjectRepository.isMember).mockResolvedValue(false);

      await expect(service.delete(1, 99)).rejects.toThrow(ForbiddenError);
    });
  });
});

export {};
