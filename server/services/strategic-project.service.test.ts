/**
 * Testes unitários do StrategicProjectService
 * 
 * Usa mocks do Repository para testar APENAS a lógica de negócio.
 * Não testa o banco de dados (isso é integração).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StrategicProjectService } from './strategic-project.service';
import type { IStrategicProjectRepository } from '../repositories/interfaces';
import { NotFoundError, ForbiddenError } from '../errors';

// Mock emitEvent para não disparar eventos reais
vi.mock('../events', () => ({
  emitEvent: vi.fn().mockResolvedValue(undefined),
  EVENT_TYPES: {
    STRATEGIC_PROJECT_CREATED: 'STRATEGIC_PROJECT_CREATED',
    STRATEGIC_PROJECT_OVERDUE: 'STRATEGIC_PROJECT_OVERDUE',
    STRATEGIC_BUDGET_EXCEEDED: 'STRATEGIC_BUDGET_EXCEEDED',
    STRATEGIC_PROJECT_COMPLETED: 'STRATEGIC_PROJECT_COMPLETED',
    STRATEGIC_PROJECT_DELETED: 'STRATEGIC_PROJECT_DELETED',
  }
}));

// Mock do Repository com todas as methods da interface
const createMockRepository = (): IStrategicProjectRepository => ({
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
  status: 'planejamento' as const,
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

describe('StrategicProjectService', () => {
  let service: StrategicProjectService;
  let mockRepository: IStrategicProjectRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new StrategicProjectService(mockRepository);
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar um projeto com sucesso', async () => {
      const userId = 1;
      const input = {
        title: 'Forno de Secagem',
        description: 'Implementação de forno industrial',
        category: 'equipamento' as const,
        priority: 'alta' as const,
        budgetPlanned: '185000',
        startDate: '2026-01-15',
        targetEndDate: '2026-06-30',
        ownerId: userId,
        createdBy: userId,
      };

      const createdProject = makeProject({ ownerId: userId });
      vi.mocked(mockRepository.create).mockResolvedValue(createdProject);

      const result = await service.create(input, userId);
      expect(result).toEqual(createdProject);
      expect(mockRepository.create).toHaveBeenCalledTimes(1);
    });

    it('deve lançar erro se título estiver vazio', async () => {
      const input = {
        title: '',
        category: 'equipamento' as const,
        priority: 'alta' as const,
        ownerId: 1,
        createdBy: 1,
      };

      await expect(service.create(input, 1)).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('deve retornar projeto se usuário é owner', async () => {
      const userId = 1;
      const project = makeProject({ ownerId: userId });
      vi.mocked(mockRepository.findById).mockResolvedValue(project);

      const result = await service.getById(1, userId);
      expect(result).toEqual(project);
    });

    it('deve retornar projeto se usuário é membro', async () => {
      const userId = 2;
      const project = makeProject({ ownerId: 1 });
      vi.mocked(mockRepository.findById).mockResolvedValue(project);
      vi.mocked(mockRepository.getMemberRole).mockResolvedValue('editor');

      const result = await service.getById(1, userId);
      expect(result).toEqual(project);
    });

    it('deve lançar NotFoundError se projeto não existe', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);
      await expect(service.getById(999, 1)).rejects.toThrow(NotFoundError);
    });

    it('deve lançar ForbiddenError se usuário não tem acesso', async () => {
      const project = makeProject({ ownerId: 1 });
      vi.mocked(mockRepository.findById).mockResolvedValue(project);
      vi.mocked(mockRepository.getMemberRole).mockResolvedValue(null);

      await expect(service.getById(1, 99)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('update', () => {
    it('deve atualizar projeto se usuário é owner', async () => {
      const userId = 1;
      const projectId = 1;
      const existing = makeProject({ ownerId: userId });
      const updated = makeProject({ ownerId: userId, status: 'em_andamento' as const });

      vi.mocked(mockRepository.findById).mockResolvedValue(existing);
      vi.mocked(mockRepository.update).mockResolvedValue(updated);

      const result = await service.update(projectId, { status: 'em_andamento' }, userId);
      expect(result).toEqual(updated);
      expect(mockRepository.update).toHaveBeenCalledWith(projectId, { status: 'em_andamento', updatedBy: userId });
    });

    it('deve atualizar projeto se usuário é editor', async () => {
      const userId = 2;
      const projectId = 1;
      const existing = makeProject({ ownerId: 1 });
      const updated = makeProject({ ownerId: 1, title: 'Novo Título' });

      vi.mocked(mockRepository.findById).mockResolvedValue(existing);
      vi.mocked(mockRepository.getMemberRole).mockResolvedValue('editor');
      vi.mocked(mockRepository.update).mockResolvedValue(updated);

      const result = await service.update(projectId, { title: 'Novo Título' }, userId);
      expect(result).toEqual(updated);
    });

    it('deve lançar ForbiddenError se usuário é viewer', async () => {
      const projectId = 1;
      const existing = makeProject({ ownerId: 1 });

      vi.mocked(mockRepository.findById).mockResolvedValue(existing);
      vi.mocked(mockRepository.getMemberRole).mockResolvedValue('viewer');

      await expect(service.update(projectId, { status: 'em_andamento' }, 2)).rejects.toThrow(ForbiddenError);
    });

    it('deve lançar ForbiddenError se usuário não é membro', async () => {
      const projectId = 1;
      const existing = makeProject({ ownerId: 1 });

      vi.mocked(mockRepository.findById).mockResolvedValue(existing);
      vi.mocked(mockRepository.getMemberRole).mockResolvedValue(null);

      await expect(service.update(projectId, { status: 'em_andamento' }, 99)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('delete', () => {
    it('deve deletar projeto se usuário é owner', async () => {
      const userId = 1;
      const projectId = 1;
      const project = makeProject({ ownerId: userId });

      vi.mocked(mockRepository.findById).mockResolvedValue(project);
      vi.mocked(mockRepository.update).mockResolvedValue({ ...project, status: 'cancelado' as const });

      await service.delete(projectId, userId);
      expect(mockRepository.update).toHaveBeenCalledWith(projectId, { status: 'cancelado' });
    });

    it('deve lançar ForbiddenError se usuário não é owner', async () => {
      const project = makeProject({ ownerId: 1 });

      vi.mocked(mockRepository.findById).mockResolvedValue(project);
      vi.mocked(mockRepository.getMemberRole).mockResolvedValue('editor');

      await expect(service.delete(1, 2)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getDashboard', () => {
    it('deve retornar estatísticas do dashboard', async () => {
      const userId = 1;
      const projects = [
        makeProject({
          id: 1,
          ownerId: userId,
          status: 'em_andamento' as const,
          progress: 50,
          budgetPlanned: '185000',
          budgetActual: '120000',
          targetEndDate: new Date('2026-12-31'),
        }),
        makeProject({
          id: 2,
          code: 'PROJ-002',
          ownerId: userId,
          status: 'concluido' as const,
          progress: 100,
          budgetPlanned: '320000',
          budgetActual: '310000',
          targetEndDate: new Date('2026-06-30'),
        }),
      ];

      vi.mocked(mockRepository.findAll).mockResolvedValue({
        data: projects,
        total: 2,
        page: 1,
        limit: 1000,
      });
      vi.mocked(mockRepository.isMember).mockResolvedValue(false);

      const result = await service.getDashboard(userId);
      expect(result.totalProjects).toBe(2);
      expect(result.inProgress).toBe(1);
      expect(result.completed).toBe(1);
      expect(result.totalBudgetPlanned).toBe(505000);
      expect(result.totalBudgetActual).toBe(430000);
      expect(result.averageProgress).toBe(75);
    });

    it('deve filtrar projetos inacessíveis', async () => {
      const userId = 2;
      const projects = [
        makeProject({ id: 1, ownerId: 1, status: 'em_andamento' as const }),
        makeProject({ id: 2, code: 'PROJ-002', ownerId: userId, status: 'concluido' as const }),
      ];

      vi.mocked(mockRepository.findAll).mockResolvedValue({
        data: projects,
        total: 2,
        page: 1,
        limit: 1000,
      });
      vi.mocked(mockRepository.isMember).mockResolvedValue(false);

      const result = await service.getDashboard(userId);
      // Apenas o projeto 2 é acessível (ownerId === userId)
      expect(result.totalProjects).toBe(1);
    });
  });


});

export {};
