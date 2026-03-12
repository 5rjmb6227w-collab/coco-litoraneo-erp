/**
 * Testes unitários do StrategicProjectService
 * 
 * Segue o padrão AAA (Arrange, Act, Assert).
 * Usa mocks do Repository para testar APENAS a lógica de negócio.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StrategicProjectService } from './strategic-project.service';
import type { IStrategicProjectRepository } from '../repositories/interfaces';
import { NotFoundError, ValidationError, ForbiddenError } from '../errors';

// Mock emitEvent para não disparar eventos reais
vi.mock('../ai/eventEmitter', () => ({
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

// Dados de teste
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

  // ==================== TESTES DE CRIAÇÃO ====================

  describe('create', () => {
    it('deve criar um projeto com sucesso e retornar todos os campos', async () => {
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
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('title', 'Forno de Secagem');
      expect(result).toHaveProperty('budgetPlanned', '185000');
      expect(result).toHaveProperty('progress', 0);
      expect(mockRepository.create).toHaveBeenCalledTimes(1);
    });

    it('deve passar ownerId e status planejamento ao repository.create', async () => {
      const userId = 5;
      const input = {
        title: 'Novo Projeto',
        category: 'infraestrutura' as const,
        priority: 'media' as const,
        ownerId: userId,
        createdBy: userId,
      };

      vi.mocked(mockRepository.create).mockResolvedValue(makeProject({ ownerId: userId }));

      await service.create(input, userId);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: userId,
          status: 'planejamento',
          createdBy: userId,
        })
      );
    });

    it('deve gerar código automático PROJ-XXX via repository.create', async () => {
      const userId = 1;
      const input = {
        title: 'Projeto Teste',
        category: 'equipamento' as const,
        priority: 'alta' as const,
        ownerId: userId,
        createdBy: userId,
      };

      const createdProject = makeProject({ code: 'PROJ-003' });
      vi.mocked(mockRepository.create).mockResolvedValue(createdProject);

      const result = await service.create(input, userId);

      expect(result.code).toBe('PROJ-003');
      expect(result.code).toMatch(/^PROJ-\d{3}$/);
    });

    it('deve lançar ValidationError se título estiver vazio', async () => {
      const input = {
        title: '',
        category: 'equipamento' as const,
        priority: 'alta' as const,
        ownerId: 1,
        createdBy: 1,
      };

      await expect(service.create(input, 1)).rejects.toThrow(ValidationError);
    });

    it('deve lançar ValidationError se título for apenas espaços', async () => {
      const input = {
        title: '   ',
        category: 'equipamento' as const,
        priority: 'alta' as const,
        ownerId: 1,
        createdBy: 1,
      };

      await expect(service.create(input, 1)).rejects.toThrow(ValidationError);
    });
  });

  // ==================== TESTES DE BUSCA POR ID ====================

  describe('getById', () => {
    it('deve retornar projeto quando usuário é owner', async () => {
      const userId = 1;
      const project = makeProject({ ownerId: userId });
      vi.mocked(mockRepository.findById).mockResolvedValue(project);

      const result = await service.getById(1, userId);

      expect(result).toEqual(project);
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
    });

    it('deve retornar projeto quando usuário é editor', async () => {
      const userId = 2;
      const project = makeProject({ ownerId: 1 });
      vi.mocked(mockRepository.findById).mockResolvedValue(project);
      vi.mocked(mockRepository.getMemberRole).mockResolvedValue('editor');

      const result = await service.getById(1, userId);

      expect(result).toEqual(project);
    });

    it('deve retornar projeto quando usuário é viewer', async () => {
      const userId = 3;
      const project = makeProject({ ownerId: 1 });
      vi.mocked(mockRepository.findById).mockResolvedValue(project);
      vi.mocked(mockRepository.getMemberRole).mockResolvedValue('viewer');

      const result = await service.getById(1, userId);

      expect(result).toEqual(project);
    });

    it('deve lançar NotFoundError quando projeto não existe', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.getById(999, 1)).rejects.toThrow(NotFoundError);
    });

    it('deve lançar ForbiddenError quando usuário não é membro', async () => {
      const project = makeProject({ ownerId: 1 });
      vi.mocked(mockRepository.findById).mockResolvedValue(project);
      vi.mocked(mockRepository.getMemberRole).mockResolvedValue(null);

      await expect(service.getById(1, 99)).rejects.toThrow(ForbiddenError);
    });
  });

  // ==================== TESTES DE ATUALIZAÇÃO ====================

  describe('update', () => {
    it('deve atualizar campos e retornar projeto atualizado', async () => {
      const userId = 1;
      const existing = makeProject({ ownerId: userId });
      const updated = makeProject({ ownerId: userId, title: 'Título Atualizado', status: 'em_andamento' as const });

      vi.mocked(mockRepository.findById).mockResolvedValue(existing);
      vi.mocked(mockRepository.update).mockResolvedValue(updated);

      const result = await service.update(1, { title: 'Título Atualizado', status: 'em_andamento' }, userId);

      expect(result.title).toBe('Título Atualizado');
      expect(result.status).toBe('em_andamento');
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        title: 'Título Atualizado',
        status: 'em_andamento',
        updatedBy: userId,
      });
    });

    it('deve permitir edição quando usuário é editor', async () => {
      const userId = 2;
      const existing = makeProject({ ownerId: 1 });
      const updated = makeProject({ ownerId: 1, title: 'Novo Título' });

      vi.mocked(mockRepository.findById).mockResolvedValue(existing);
      vi.mocked(mockRepository.getMemberRole).mockResolvedValue('editor');
      vi.mocked(mockRepository.update).mockResolvedValue(updated);

      const result = await service.update(1, { title: 'Novo Título' }, userId);

      expect(result).toEqual(updated);
    });

    it('deve lançar ForbiddenError quando viewer tenta editar', async () => {
      const existing = makeProject({ ownerId: 1 });

      vi.mocked(mockRepository.findById).mockResolvedValue(existing);
      vi.mocked(mockRepository.getMemberRole).mockResolvedValue('viewer');

      await expect(service.update(1, { status: 'em_andamento' }, 2)).rejects.toThrow(ForbiddenError);
    });

    it('deve lançar NotFoundError quando projeto não existe', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.update(999, { title: 'X' }, 1)).rejects.toThrow(NotFoundError);
    });

    it('deve lançar ForbiddenError quando usuário não é membro', async () => {
      const existing = makeProject({ ownerId: 1 });
      vi.mocked(mockRepository.findById).mockResolvedValue(existing);
      vi.mocked(mockRepository.getMemberRole).mockResolvedValue(null);

      await expect(service.update(1, { status: 'em_andamento' }, 99)).rejects.toThrow(ForbiddenError);
    });
  });

  // ==================== TESTES DE EXCLUSÃO ====================

  describe('delete', () => {
    it('deve fazer soft delete (status → cancelado)', async () => {
      const userId = 1;
      const project = makeProject({ ownerId: userId });

      vi.mocked(mockRepository.findById).mockResolvedValue(project);
      vi.mocked(mockRepository.update).mockResolvedValue({ ...project, status: 'cancelado' as const });

      await service.delete(1, userId);

      expect(mockRepository.update).toHaveBeenCalledWith(1, { status: 'cancelado' });
    });

    it('deve lançar ForbiddenError quando não é owner', async () => {
      const project = makeProject({ ownerId: 1 });

      vi.mocked(mockRepository.findById).mockResolvedValue(project);
      vi.mocked(mockRepository.getMemberRole).mockResolvedValue('editor');

      await expect(service.delete(1, 2)).rejects.toThrow(ForbiddenError);
    });

    it('deve lançar NotFoundError quando projeto não existe', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundError);
    });
  });

  // ==================== TESTES DO DASHBOARD ====================

  describe('getDashboard', () => {
    it('deve retornar estatísticas corretas (total, em andamento, atrasados)', async () => {
      const userId = 1;
      const now = new Date();
      const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const projects = [
        makeProject({ id: 1, ownerId: userId, status: 'em_andamento' as const, progress: 50, targetEndDate: futureDate }),
        makeProject({ id: 2, code: 'PROJ-002', ownerId: userId, status: 'concluido' as const, progress: 100, targetEndDate: pastDate }),
        makeProject({ id: 3, code: 'PROJ-003', ownerId: userId, status: 'em_andamento' as const, progress: 30, targetEndDate: pastDate }),
      ];

      vi.mocked(mockRepository.findAll).mockResolvedValue({
        data: projects,
        total: 3,
        page: 1,
        limit: 1000,
      });
      vi.mocked(mockRepository.isMember).mockResolvedValue(false);

      const result = await service.getDashboard(userId);

      expect(result.totalProjects).toBe(3);
      expect(result.inProgress).toBe(2);
      expect(result.completed).toBe(1);
      expect(result.overdue).toBe(1); // Projeto 3: em_andamento + targetEndDate passada
    });

    it('deve calcular orçamento total corretamente', async () => {
      const userId = 1;
      const projects = [
        makeProject({
          id: 1,
          ownerId: userId,
          status: 'em_andamento' as const,
          budgetPlanned: '185000',
          budgetActual: '120000',
          progress: 50,
        }),
        makeProject({
          id: 2,
          code: 'PROJ-002',
          ownerId: userId,
          status: 'concluido' as const,
          budgetPlanned: '320000',
          budgetActual: '310000',
          progress: 100,
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

    it('deve retornar zeros quando não há projetos', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 1000,
      });

      const result = await service.getDashboard(1);

      expect(result.totalProjects).toBe(0);
      expect(result.inProgress).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.overdue).toBe(0);
      expect(result.totalBudgetPlanned).toBe(0);
      expect(result.totalBudgetActual).toBe(0);
      expect(result.averageProgress).toBe(0);
    });
  });

  // ==================== TESTES DE LISTAGEM ====================

  describe('list', () => {
    it('deve retornar lista paginada de projetos acessíveis', async () => {
      const userId = 1;
      const projects = [makeProject({ ownerId: userId })];

      vi.mocked(mockRepository.findAll).mockResolvedValue({
        data: projects,
        total: 1,
        page: 1,
        limit: 10,
      });

      const result = await service.list(userId, {}, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('deve filtrar projetos que o usuário não tem acesso', async () => {
      const userId = 2;
      const projects = [
        makeProject({ id: 1, ownerId: 1 }),
        makeProject({ id: 2, code: 'PROJ-002', ownerId: userId }),
      ];

      vi.mocked(mockRepository.findAll).mockResolvedValue({
        data: projects,
        total: 2,
        page: 1,
        limit: 10,
      });
      vi.mocked(mockRepository.isMember).mockResolvedValue(false);

      const result = await service.list(userId, {}, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].ownerId).toBe(userId);
    });
  });

  // ==================== TESTES DE CONTROLE DE ACESSO POR ROLE ====================

  describe('controle de acesso por role (CEO/admin vs. membros)', () => {
    const allProjects = [
      makeProject({ id: 1, ownerId: 1, code: 'PROJ-001' }),
      makeProject({ id: 2, ownerId: 2, code: 'PROJ-002' }),
      makeProject({ id: 3, ownerId: 3, code: 'PROJ-003' }),
    ];

    it('admin deve ver TODOS os projetos na listagem', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue({
        data: allProjects,
        total: 3,
        page: 1,
        limit: 10,
      });

      const result = await service.list(99, {}, { page: 1, limit: 10 }, 'admin');

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('ceo deve ver TODOS os projetos na listagem', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue({
        data: allProjects,
        total: 3,
        page: 1,
        limit: 10,
      });

      const result = await service.list(99, {}, { page: 1, limit: 10 }, 'ceo');

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('user comum deve ver APENAS projetos onde é owner ou membro', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue({
        data: allProjects,
        total: 3,
        page: 1,
        limit: 10,
      });
      vi.mocked(mockRepository.isMember).mockResolvedValue(false);

      const result = await service.list(2, {}, { page: 1, limit: 10 }, 'user');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].ownerId).toBe(2);
    });

    it('admin deve ver qualquer projeto por ID sem ser membro', async () => {
      const project = makeProject({ id: 1, ownerId: 1 });
      vi.mocked(mockRepository.findById).mockResolvedValue(project);

      const result = await service.getById(1, 99, 'admin');

      expect(result).toEqual(project);
      // Não deve chamar getMemberRole para admin
      expect(mockRepository.getMemberRole).not.toHaveBeenCalled();
    });

    it('ceo deve ver qualquer projeto por ID sem ser membro', async () => {
      const project = makeProject({ id: 1, ownerId: 1 });
      vi.mocked(mockRepository.findById).mockResolvedValue(project);

      const result = await service.getById(1, 99, 'ceo');

      expect(result).toEqual(project);
      expect(mockRepository.getMemberRole).not.toHaveBeenCalled();
    });

    it('user comum NÃO pode ver projeto onde não é membro', async () => {
      const project = makeProject({ id: 1, ownerId: 1 });
      vi.mocked(mockRepository.findById).mockResolvedValue(project);
      vi.mocked(mockRepository.getMemberRole).mockResolvedValue(null);

      await expect(service.getById(1, 99, 'user')).rejects.toThrow(ForbiddenError);
    });

    it('admin deve poder editar qualquer projeto', async () => {
      const existing = makeProject({ ownerId: 1 });
      const updated = makeProject({ ownerId: 1, title: 'Editado pelo Admin' });
      vi.mocked(mockRepository.findById).mockResolvedValue(existing);
      vi.mocked(mockRepository.update).mockResolvedValue(updated);

      const result = await service.update(1, { title: 'Editado pelo Admin' }, 99, 'admin');

      expect(result.title).toBe('Editado pelo Admin');
      expect(mockRepository.getMemberRole).not.toHaveBeenCalled();
    });

    it('admin deve poder excluir qualquer projeto', async () => {
      const project = makeProject({ ownerId: 1 });
      vi.mocked(mockRepository.findById).mockResolvedValue(project);
      vi.mocked(mockRepository.update).mockResolvedValue({ ...project, status: 'cancelado' as const });

      await service.delete(1, 99, 'admin');

      expect(mockRepository.update).toHaveBeenCalledWith(1, { status: 'cancelado' });
    });

    it('user comum NÃO pode excluir projeto de outro owner', async () => {
      const project = makeProject({ ownerId: 1 });
      vi.mocked(mockRepository.findById).mockResolvedValue(project);

      await expect(service.delete(1, 2, 'user')).rejects.toThrow(ForbiddenError);
    });

    it('admin deve ver dashboard com TODOS os projetos', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue({
        data: allProjects,
        total: 3,
        page: 1,
        limit: 1000,
      });

      const result = await service.getDashboard(99, 'admin');

      expect(result.totalProjects).toBe(3);
    });

    it('user comum deve ver dashboard apenas com seus projetos', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue({
        data: allProjects,
        total: 3,
        page: 1,
        limit: 1000,
      });
      vi.mocked(mockRepository.isMember).mockResolvedValue(false);

      const result = await service.getDashboard(2, 'user');

      expect(result.totalProjects).toBe(1);
    });
  });
});

export {};
