/**
 * Testes de Integração - Fluxo de Tarefas Estratégicas (Repository)
 *
 * Testa o Repository diretamente contra o banco de dados real.
 * Valida CRUD de tarefas, notas, dependências, links e contagens.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { getStrategicProjectRepository, getStrategicTaskRepository } from '../repositories';
import type { IStrategicProjectRepository, IStrategicTaskRepository } from '../repositories/interfaces';

describe('Integração - Strategic Task Repository', () => {
  const projectRepo: IStrategicProjectRepository = getStrategicProjectRepository();
  const taskRepo: IStrategicTaskRepository = getStrategicTaskRepository();

  let testProjectId: number;
  let testPhaseId: number;
  let createdTaskId: number;
  let createdTask2Id: number;
  let createdNoteId: number;
  let createdDependencyId: number;
  let createdLinkId: number;

  // ==================== SETUP ====================
  it('deve criar projeto e fase de teste', async () => {
    const project = await projectRepo.create({
      title: 'Projeto para Teste de Tarefas',
      category: 'processo',
      priority: 'media',
      ownerId: 1,
      createdBy: 1,
    });
    testProjectId = project.id;

    const phase = await projectRepo.createPhase({
      projectId: testProjectId,
      title: 'Fase de Teste',
      orderIndex: 0,
    });
    testPhaseId = phase.id;

    expect(testProjectId).toBeGreaterThan(0);
    expect(testPhaseId).toBeGreaterThan(0);
  });

  // ==================== TAREFAS ====================
  describe('CRUD de Tarefas', () => {
    it('deve gerar o próximo código de tarefa', async () => {
      const project = await projectRepo.findById(testProjectId);
      const code = await taskRepo.getNextCode(project!.code);
      expect(code).toMatch(/-T\d{2}$/);
    });

    it('deve criar uma tarefa', async () => {
      const task = await taskRepo.create({
        projectId: testProjectId,
        phaseId: testPhaseId,
        title: 'Tarefa de Teste 1',
        description: 'Descrição da tarefa de teste',
        priority: 'alta',
        status: 'a_fazer',
        startDate: '2026-04-01',
        dueDate: '2026-04-15',
        estimatedHours: '8.00',
        estimatedCost: '500.00',
        assigneeName: 'Hermano',
        tags: ['teste'],
        createdBy: 1,
      });

      expect(task).toBeDefined();
      expect(task.id).toBeGreaterThan(0);
      expect(task.code).toMatch(/-T\d{2}$/);
      expect(task.title).toBe('Tarefa de Teste 1');
      expect(task.priority).toBe('alta');
      expect(task.status).toBe('a_fazer');
      expect(task.projectId).toBe(testProjectId);
      expect(task.phaseId).toBe(testPhaseId);

      createdTaskId = task.id;
    });

    it('deve criar uma segunda tarefa', async () => {
      const task = await taskRepo.create({
        projectId: testProjectId,
        phaseId: testPhaseId,
        title: 'Tarefa de Teste 2',
        priority: 'media',
        status: 'a_fazer',
        dueDate: '2026-04-20',
        createdBy: 1,
      });

      expect(task.id).toBeGreaterThan(0);
      createdTask2Id = task.id;
    });

    it('deve buscar tarefa por ID', async () => {
      const task = await taskRepo.findById(createdTaskId);
      expect(task).not.toBeNull();
      expect(task!.id).toBe(createdTaskId);
      expect(task!.title).toBe('Tarefa de Teste 1');
    });

    it('deve listar tarefas com paginação', async () => {
      const result = await taskRepo.findAll(
        { projectId: testProjectId },
        { page: 1, limit: 10 }
      );
      expect(result.data).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.data.every(t => t.projectId === testProjectId)).toBe(true);
    });

    it('deve filtrar tarefas por status', async () => {
      const result = await taskRepo.findAll(
        { projectId: testProjectId, status: 'a_fazer' },
        { page: 1, limit: 10 }
      );
      expect(result.data.every(t => t.status === 'a_fazer')).toBe(true);
    });

    it('deve filtrar tarefas por busca textual', async () => {
      const result = await taskRepo.findAll(
        { search: 'Teste 1' },
        { page: 1, limit: 10 }
      );
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('deve buscar todas as tarefas de um projeto', async () => {
      const tasks = await taskRepo.findByProject(testProjectId);
      expect(tasks).toBeInstanceOf(Array);
      expect(tasks.length).toBeGreaterThanOrEqual(2);
    });

    it('deve atualizar uma tarefa', async () => {
      const updated = await taskRepo.update(createdTaskId, {
        title: 'Tarefa de Teste 1 - Atualizada',
        status: 'em_andamento',
        actualHours: '3.00',
        actualCost: '200.00',
        updatedBy: 1,
      });

      expect(updated.title).toBe('Tarefa de Teste 1 - Atualizada');
      expect(updated.status).toBe('em_andamento');
      expect(updated.actualHours).toBe('3.00');
      expect(updated.actualCost).toBe('200.00');
    });

    it('deve retornar null para tarefa inexistente', async () => {
      const task = await taskRepo.findById(999999);
      expect(task).toBeNull();
    });
  });

  // ==================== CONTAGENS ====================
  describe('Contagens por Status', () => {
    it('deve contar tarefas por status', async () => {
      const counts = await taskRepo.countByProjectAndStatus(testProjectId);
      expect(counts).toBeDefined();
      expect(typeof counts.a_fazer).toBe('number');
      expect(typeof counts.em_andamento).toBe('number');
      expect(typeof counts.aguardando).toBe('number');
      expect(typeof counts.concluida).toBe('number');
      expect(typeof counts.cancelada).toBe('number');
      // Temos 1 em_andamento e 1 a_fazer
      expect(counts.em_andamento).toBeGreaterThanOrEqual(1);
      expect(counts.a_fazer).toBeGreaterThanOrEqual(1);
    });
  });

  // ==================== NOTAS ====================
  describe('CRUD de Notas', () => {
    it('deve criar uma nota em uma tarefa', async () => {
      const note = await taskRepo.createNote({
        taskId: createdTaskId,
        projectId: testProjectId,
        content: 'Nota de teste - observação importante',
        noteType: 'observacao',
        createdBy: 1,
        createdByName: 'Hermano',
      });

      expect(note).toBeDefined();
      expect(note.id).toBeGreaterThan(0);
      expect(note.content).toBe('Nota de teste - observação importante');
      expect(note.noteType).toBe('observacao');
      expect(note.createdByName).toBe('Hermano');

      createdNoteId = note.id;
    });

    it('deve listar notas de uma tarefa', async () => {
      const notes = await taskRepo.findNotesByTask(createdTaskId);
      expect(notes).toBeInstanceOf(Array);
      expect(notes.length).toBeGreaterThan(0);
      expect(notes[0].taskId).toBe(createdTaskId);
    });

    it('deve listar notas de um projeto', async () => {
      const notes = await taskRepo.findNotesByProject(testProjectId);
      expect(notes).toBeInstanceOf(Array);
      expect(notes.length).toBeGreaterThan(0);
    });

    it('deve deletar uma nota', async () => {
      await taskRepo.deleteNote(createdNoteId);
      const notes = await taskRepo.findNotesByTask(createdTaskId);
      expect(notes.find(n => n.id === createdNoteId)).toBeUndefined();
    });
  });

  // ==================== DEPENDÊNCIAS ====================
  describe('CRUD de Dependências', () => {
    it('deve criar uma dependência entre tarefas', async () => {
      const dep = await taskRepo.createDependency({
        taskId: createdTask2Id,
        dependsOnTaskId: createdTaskId,
        dependencyType: 'FS',
      });

      expect(dep).toBeDefined();
      expect(dep.id).toBeGreaterThan(0);
      expect(dep.taskId).toBe(createdTask2Id);
      expect(dep.dependsOnTaskId).toBe(createdTaskId);
      expect(dep.dependencyType).toBe('FS');

      createdDependencyId = dep.id;
    });

    it('deve listar dependências de uma tarefa', async () => {
      const deps = await taskRepo.findDependenciesByTask(createdTask2Id);
      expect(deps).toBeInstanceOf(Array);
      expect(deps.length).toBeGreaterThan(0);
      expect(deps[0].dependsOnTaskId).toBe(createdTaskId);
    });

    it('deve deletar uma dependência', async () => {
      await taskRepo.deleteDependency(createdDependencyId);
      const deps = await taskRepo.findDependenciesByTask(createdTask2Id);
      expect(deps.find(d => d.id === createdDependencyId)).toBeUndefined();
    });
  });

  // ==================== LINKS COM MÓDULOS ERP ====================
  describe('CRUD de Links ERP', () => {
    it('deve criar um link com módulo ERP', async () => {
      const link = await taskRepo.createLink({
        taskId: createdTaskId,
        projectId: testProjectId,
        linkedModule: 'compras',
        linkedEntityType: 'purchase_request',
        linkedEntityId: 1,
        linkedEntityLabel: 'Solicitação de Compra #001',
        createdBy: 1,
      });

      expect(link).toBeDefined();
      expect(link.id).toBeGreaterThan(0);
      expect(link.linkedModule).toBe('compras');
      expect(link.linkedEntityLabel).toBe('Solicitação de Compra #001');

      createdLinkId = link.id;
    });

    it('deve listar links de uma tarefa', async () => {
      const links = await taskRepo.findLinksByTask(createdTaskId);
      expect(links).toBeInstanceOf(Array);
      expect(links.length).toBeGreaterThan(0);
    });

    it('deve listar links de um projeto', async () => {
      const links = await taskRepo.findLinksByProject(testProjectId);
      expect(links).toBeInstanceOf(Array);
      expect(links.length).toBeGreaterThan(0);
    });

    it('deve deletar um link', async () => {
      await taskRepo.deleteLink(createdLinkId);
      const links = await taskRepo.findLinksByTask(createdTaskId);
      expect(links.find(l => l.id === createdLinkId)).toBeUndefined();
    });
  });

  // ==================== REORDENAÇÃO ====================
  describe('Reordenação de Tarefas', () => {
    it('deve reordenar tarefas', async () => {
      // Inverter a ordem
      await taskRepo.reorder(testProjectId, testPhaseId, [createdTask2Id, createdTaskId]);

      const tasks = await taskRepo.findByProject(testProjectId);
      const task1 = tasks.find(t => t.id === createdTaskId);
      const task2 = tasks.find(t => t.id === createdTask2Id);

      expect(task2!.orderIndex).toBeLessThan(task1!.orderIndex);
    });
  });

  // ==================== LIMPEZA ====================
  afterAll(async () => {
    if (testProjectId) {
      try {
        // Deletar tarefas primeiro (por causa das foreign keys lógicas)
        if (createdTaskId) await taskRepo.delete(createdTaskId);
        if (createdTask2Id) await taskRepo.delete(createdTask2Id);
        // Deletar projeto (cascata membros e fases)
        await projectRepo.delete(testProjectId);
      } catch {
        // Ignora se já foi deletado
      }
    }
  });
});
