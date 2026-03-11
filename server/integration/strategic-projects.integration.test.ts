/**
 * Testes de Integração - Fluxo de Projetos Estratégicos (Repository)
 *
 * Testa o Repository diretamente contra o banco de dados real.
 * Valida CRUD de projetos, fases, membros e dashboard stats.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { getStrategicProjectRepository } from '../repositories';
import type { IStrategicProjectRepository } from '../repositories/interfaces';

describe('Integração - Strategic Project Repository', () => {
  const repo: IStrategicProjectRepository = getStrategicProjectRepository();
  let createdProjectId: number;
  let createdPhaseId: number;

  // ==================== PROJETOS ====================
  describe('CRUD de Projetos', () => {
    it('deve gerar o próximo código sequencial', async () => {
      const code = await repo.getNextCode();
      expect(code).toMatch(/^PROJ-\d{3}$/);
    });

    it('deve criar um projeto estratégico', async () => {
      const project = await repo.create({
        title: 'Projeto de Teste - Integração',
        description: 'Projeto criado pelo teste de integração',
        category: 'equipamento',
        priority: 'alta',
        status: 'planejamento',
        startDate: '2026-04-01',
        targetEndDate: '2026-08-31',
        budgetPlanned: '50000.00',
        ownerId: 1,
        tags: ['teste', 'integração'],
        createdBy: 1,
      });

      expect(project).toBeDefined();
      expect(project.id).toBeGreaterThan(0);
      expect(project.code).toMatch(/^PROJ-\d{3}$/);
      expect(project.title).toBe('Projeto de Teste - Integração');
      expect(project.category).toBe('equipamento');
      expect(project.priority).toBe('alta');
      expect(project.status).toBe('planejamento');
      expect(project.ownerId).toBe(1);
      expect(project.tags).toEqual(['teste', 'integração']);

      createdProjectId = project.id;
    });

    it('deve buscar projeto por ID', async () => {
      const project = await repo.findById(createdProjectId);
      expect(project).not.toBeNull();
      expect(project!.id).toBe(createdProjectId);
      expect(project!.title).toBe('Projeto de Teste - Integração');
    });

    it('deve buscar projeto por código', async () => {
      const project = await repo.findById(createdProjectId);
      const byCode = await repo.findByCode(project!.code);
      expect(byCode).not.toBeNull();
      expect(byCode!.id).toBe(createdProjectId);
    });

    it('deve listar projetos com paginação', async () => {
      const result = await repo.findAll({}, { page: 1, limit: 10 });
      expect(result.data).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('deve filtrar projetos por status', async () => {
      const result = await repo.findAll({ status: 'planejamento' }, { page: 1, limit: 10 });
      expect(result.data.every(p => p.status === 'planejamento')).toBe(true);
    });

    it('deve filtrar projetos por categoria', async () => {
      const result = await repo.findAll({ category: 'equipamento' }, { page: 1, limit: 10 });
      expect(result.data.every(p => p.category === 'equipamento')).toBe(true);
    });

    it('deve filtrar projetos por busca textual', async () => {
      const result = await repo.findAll({ search: 'Integração' }, { page: 1, limit: 10 });
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.some(p => p.title.includes('Integração'))).toBe(true);
    });

    it('deve atualizar um projeto', async () => {
      const updated = await repo.update(createdProjectId, {
        title: 'Projeto de Teste - Atualizado',
        status: 'em_andamento',
        progress: 15,
        budgetActual: '8000.00',
        updatedBy: 1,
      });

      expect(updated.title).toBe('Projeto de Teste - Atualizado');
      expect(updated.status).toBe('em_andamento');
      expect(updated.progress).toBe(15);
      expect(updated.budgetActual).toBe('8000.00');
    });

    it('deve retornar null para projeto inexistente', async () => {
      const project = await repo.findById(999999);
      expect(project).toBeNull();
    });
  });

  // ==================== FASES ====================
  describe('CRUD de Fases', () => {
    it('deve criar uma fase no projeto', async () => {
      const phase = await repo.createPhase({
        projectId: createdProjectId,
        title: 'Fase de Teste',
        description: 'Fase criada pelo teste de integração',
        orderIndex: 0,
        status: 'pendente',
        startDate: '2026-04-01',
        endDate: '2026-05-15',
      });

      expect(phase).toBeDefined();
      expect(phase.id).toBeGreaterThan(0);
      expect(phase.projectId).toBe(createdProjectId);
      expect(phase.title).toBe('Fase de Teste');
      expect(phase.status).toBe('pendente');

      createdPhaseId = phase.id;
    });

    it('deve listar fases do projeto', async () => {
      const phases = await repo.findPhasesByProject(createdProjectId);
      expect(phases).toBeInstanceOf(Array);
      expect(phases.length).toBeGreaterThan(0);
      expect(phases[0].projectId).toBe(createdProjectId);
    });

    it('deve atualizar uma fase', async () => {
      const updated = await repo.updatePhase(createdPhaseId, {
        title: 'Fase de Teste - Atualizada',
        status: 'em_andamento',
      });

      expect(updated.title).toBe('Fase de Teste - Atualizada');
      expect(updated.status).toBe('em_andamento');
    });

    it('deve deletar uma fase', async () => {
      await repo.deletePhase(createdPhaseId);
      const phases = await repo.findPhasesByProject(createdProjectId);
      expect(phases.find(p => p.id === createdPhaseId)).toBeUndefined();
    });
  });

  // ==================== MEMBROS ====================
  describe('Gestão de Membros', () => {
    it('deve verificar que o owner é membro', async () => {
      const isMember = await repo.isMember(createdProjectId, 1);
      expect(isMember).toBe(true);
    });

    it('deve retornar o papel do owner', async () => {
      const role = await repo.getMemberRole(createdProjectId, 1);
      expect(role).toBe('owner');
    });

    it('deve retornar null para não-membro', async () => {
      const role = await repo.getMemberRole(createdProjectId, 999999);
      expect(role).toBeNull();
    });

    it('deve listar membros do projeto', async () => {
      const members = await repo.findMembersByProject(createdProjectId);
      expect(members).toBeInstanceOf(Array);
      expect(members.length).toBeGreaterThan(0);
      expect(members.some(m => m.userId === 1 && m.role === 'owner')).toBe(true);
    });
  });

  // ==================== DASHBOARD STATS ====================
  describe('Dashboard Stats', () => {
    it('deve retornar estatísticas do dashboard', async () => {
      const stats = await repo.getDashboardStats(1);
      expect(stats).toBeDefined();
      expect(typeof stats.totalProjects).toBe('number');
      expect(typeof stats.inProgress).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.overdue).toBe('number');
      expect(typeof stats.totalBudgetPlanned).toBe('number');
      expect(typeof stats.totalBudgetActual).toBe('number');
      expect(stats.totalProjects).toBeGreaterThan(0);
    });
  });

  // ==================== BUSCA POR MEMBRO ====================
  describe('Busca por Membro', () => {
    it('deve buscar projetos onde o usuário é membro', async () => {
      const result = await repo.findByMember(1, {}, { page: 1, limit: 10 });
      expect(result.data).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThan(0);
      expect(result.data.some(p => p.id === createdProjectId)).toBe(true);
    });

    it('deve retornar vazio para usuário sem projetos', async () => {
      const result = await repo.findByMember(999999, {}, { page: 1, limit: 10 });
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ==================== LIMPEZA ====================
  afterAll(async () => {
    if (createdProjectId) {
      try {
        await repo.delete(createdProjectId);
      } catch {
        // Ignora se já foi deletado
      }
    }
  });
});
