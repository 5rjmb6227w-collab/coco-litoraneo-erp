/**
 * Testes de Integração - Fluxo de Projetos Estratégicos
 * 
 * Testa o fluxo completo de gestão de projetos estratégicos através da API tRPC.
 * Estes testes validam a integração entre todas as camadas (Router → Service → Repository → DB).
 */

import { describe, it, expect, afterAll } from 'vitest';
import { appRouter } from '../routers';

// Contexto de teste com usuário autenticado (id numérico como string, conforme padrão)
const createTestContext = () => ({
  user: {
    id: '999',
    openId: 'test-user-999',
    name: 'Test User',
    role: 'admin' as const
  }
});

describe('Integração - Fluxo de Projetos Estratégicos', () => {
  const caller = appRouter.createCaller(createTestContext());
  let createdProjectId: number;
  let createdTaskId: number;
  let createdPhaseId: number;

  // ==================== PROJETOS: LISTAGEM ====================

  describe('Listagem de Projetos', () => {
    it('deve listar projetos com paginação', async () => {
      const result = await caller.strategic.projects.list({
        page: 1,
        limit: 10,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  // ==================== PROJETOS: CRIAÇÃO ====================

  describe('Criação de Projeto', () => {
    it('deve criar um projeto com dados válidos', async () => {
      const timestamp = Date.now();
      const result = await caller.strategic.projects.create({
        title: `Projeto Teste Integração ${timestamp}`,
        description: 'Projeto criado via teste de integração',
        category: 'equipamento',
        priority: 'alta',
        budgetPlanned: '150000',
        startDate: '2026-04-01',
        targetEndDate: '2026-12-31',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('code');
      expect(result.title).toContain('Projeto Teste Integração');
      expect(result.status).toBe('planejamento');
      expect(result.progress).toBe(0);
      createdProjectId = result.id;
    });
  });

  // ==================== PROJETOS: BUSCA POR ID ====================

  describe('Busca de Projeto por ID', () => {
    it('deve retornar projeto existente com todos os campos', async () => {
      if (!createdProjectId) return;

      const result = await caller.strategic.projects.getById({ id: createdProjectId });

      expect(result).toHaveProperty('id', createdProjectId);
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('status', 'planejamento');
      expect(result).toHaveProperty('budgetPlanned');
      expect(result).toHaveProperty('progress');
    });
  });

  // ==================== PROJETOS: ATUALIZAÇÃO ====================

  describe('Atualização de Projeto', () => {
    it('deve atualizar status e título do projeto', async () => {
      if (!createdProjectId) return;

      const result = await caller.strategic.projects.update({
        id: createdProjectId,
        status: 'em_andamento',
        title: 'Projeto Atualizado via Integração',
      });

      expect(result.status).toBe('em_andamento');
      expect(result.title).toBe('Projeto Atualizado via Integração');
    });
  });

  // ==================== PROJETOS: DASHBOARD ====================

  describe('Dashboard de Projetos', () => {
    it('deve retornar estatísticas do dashboard', async () => {
      const result = await caller.strategic.projects.dashboard();

      expect(result).toHaveProperty('totalProjects');
      expect(result).toHaveProperty('inProgress');
      expect(result).toHaveProperty('completed');
      expect(result).toHaveProperty('overdue');
      expect(result).toHaveProperty('totalBudgetPlanned');
      expect(result).toHaveProperty('totalBudgetActual');
      expect(result).toHaveProperty('averageProgress');
      expect(typeof result.totalProjects).toBe('number');
    });
  });

  // ==================== FASES: CRIAÇÃO ====================

  describe('Fases do Projeto', () => {
    it('deve criar uma fase no projeto', async () => {
      if (!createdProjectId) return;

      const result = await caller.strategic.phases.create({
        projectId: createdProjectId,
        title: 'Fase 1 - Planejamento',
        description: 'Fase de planejamento inicial',
        startDate: '2026-04-01',
        endDate: '2026-06-30',
        orderIndex: 0,
      });

      expect(result).toHaveProperty('id');
      expect(result.title).toBe('Fase 1 - Planejamento');
      createdPhaseId = result.id;
    });

    it('deve listar fases do projeto', async () => {
      if (!createdProjectId) return;

      const result = await caller.strategic.phases.list({ projectId: createdProjectId });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==================== TAREFAS: CRIAÇÃO ====================

  describe('Tarefas do Projeto', () => {
    it('deve criar uma tarefa no projeto', async () => {
      if (!createdProjectId) return;

      const result = await caller.strategic.tasks.create({
        projectId: createdProjectId,
        phaseId: createdPhaseId || undefined,
        title: 'Tarefa de Teste - Integração',
        description: 'Tarefa criada via teste de integração',
        priority: 'alta',
        estimatedCost: '25000',
        dueDate: '2026-06-30',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('code');
      expect(result.title).toBe('Tarefa de Teste - Integração');
      expect(result.status).toBe('a_fazer');
      createdTaskId = result.id;
    });

    it('deve listar tarefas do projeto', async () => {
      if (!createdProjectId) return;

      const result = await caller.strategic.tasks.list({
        projectId: createdProjectId,
        page: 1,
        limit: 10,
      });

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it('deve buscar tarefa por ID', async () => {
      if (!createdTaskId) return;

      const result = await caller.strategic.tasks.getById({ id: createdTaskId });

      expect(result).toHaveProperty('id', createdTaskId);
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('status');
    });

    it('deve atualizar status da tarefa', async () => {
      if (!createdTaskId) return;

      const result = await caller.strategic.tasks.update({
        id: createdTaskId,
        status: 'em_andamento',
      });

      expect(result.status).toBe('em_andamento');
    });

    it('deve retornar tarefas de hoje (pode ser vazio)', async () => {
      const result = await caller.strategic.tasks.todayTasks();

      expect(Array.isArray(result)).toBe(true);
    });

    it('deve retornar tarefas atrasadas (pode ser vazio)', async () => {
      const result = await caller.strategic.tasks.overdueTasks();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ==================== MEMBROS ====================

  describe('Membros do Projeto', () => {
    it('deve listar membros do projeto', async () => {
      if (!createdProjectId) return;

      const result = await caller.strategic.members.list({ projectId: createdProjectId });

      expect(Array.isArray(result)).toBe(true);
      // O criador deve ser membro automaticamente
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==================== LIMPEZA ====================

  afterAll(async () => {
    // Limpar dados de teste na ordem inversa de dependência
    if (createdTaskId) {
      try {
        await caller.strategic.tasks.delete({ id: createdTaskId });
      } catch { /* ignora */ }
    }
    if (createdPhaseId) {
      try {
        await caller.strategic.phases.delete({ id: createdPhaseId, projectId: createdProjectId });
      } catch { /* ignora */ }
    }
    if (createdProjectId) {
      try {
        await caller.strategic.projects.delete({ id: createdProjectId });
      } catch { /* ignora */ }
    }
  });
});
