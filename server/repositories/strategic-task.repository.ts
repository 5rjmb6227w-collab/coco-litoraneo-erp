/**
 * Implementação concreta do Repository de Tarefas Estratégicas.
 * Segue o princípio SOLID de Single Responsibility - apenas acesso a dados.
 */

import { eq, like, and, or, sql, desc, count, asc, lte, gte } from 'drizzle-orm';
import { getDb } from '../db';
import {
  strategicTasks,
  strategicTaskNotes,
  strategicTaskDependencies,
  strategicTaskLinks,
  strategicProjects
} from '../../drizzle/schema';
import { NotFoundError } from '../errors';
import type { PaginationOptions, PaginatedResult } from './interfaces/IProducerRepository';
import type {
  IStrategicTaskRepository,
  StrategicTaskFilters,
  CreateStrategicTaskDTO,
  UpdateStrategicTaskDTO,
  StrategicTask,
  CreateTaskNoteDTO,
  TaskNote,
  CreateTaskDependencyDTO,
  TaskDependency,
  CreateTaskLinkDTO,
  TaskLink,
  TaskCountByStatus
} from './interfaces/IStrategicTaskRepository';

// ============================================================================
// MAPEAMENTO
// ============================================================================
type SchemaTask = typeof strategicTasks.$inferSelect;
type SchemaNote = typeof strategicTaskNotes.$inferSelect;
type SchemaDep = typeof strategicTaskDependencies.$inferSelect;
type SchemaLink = typeof strategicTaskLinks.$inferSelect;

function mapToTask(row: SchemaTask): StrategicTask {
  return {
    id: row.id,
    projectId: row.projectId,
    phaseId: row.phaseId,
    parentTaskId: row.parentTaskId,
    code: row.code,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    assigneeId: row.assigneeId,
    assigneeName: row.assigneeName,
    startDate: row.startDate,
    dueDate: row.dueDate,
    completedAt: row.completedAt,
    estimatedHours: row.estimatedHours,
    actualHours: row.actualHours,
    estimatedCost: row.estimatedCost,
    actualCost: row.actualCost,
    orderIndex: row.orderIndex,
    tags: row.tags as string[] | null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

function mapToNote(row: SchemaNote): TaskNote {
  return {
    id: row.id,
    taskId: row.taskId,
    projectId: row.projectId,
    content: row.content,
    noteType: row.noteType,
    attachmentUrl: row.attachmentUrl,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    createdByName: row.createdByName,
  };
}

function mapToDependency(row: SchemaDep): TaskDependency {
  return {
    id: row.id,
    taskId: row.taskId,
    dependsOnTaskId: row.dependsOnTaskId,
    dependencyType: row.dependencyType,
  };
}

function mapToLink(row: SchemaLink): TaskLink {
  return {
    id: row.id,
    taskId: row.taskId,
    projectId: row.projectId,
    linkedModule: row.linkedModule,
    linkedEntityType: row.linkedEntityType,
    linkedEntityId: row.linkedEntityId,
    linkedEntityLabel: row.linkedEntityLabel,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

// ============================================================================
// IMPLEMENTAÇÃO
// ============================================================================
export class StrategicTaskRepository implements IStrategicTaskRepository {

  // ---------- TAREFAS ----------

  async findAll(
    filters: StrategicTaskFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<StrategicTask>> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const { projectId, phaseId, status, priority, assigneeId, dueDateStart, dueDateEnd, search, parentTaskId } = filters;
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (projectId) conditions.push(eq(strategicTasks.projectId, projectId));
    if (phaseId) conditions.push(eq(strategicTasks.phaseId, phaseId));
    if (status) conditions.push(eq(strategicTasks.status, status));
    if (priority) conditions.push(eq(strategicTasks.priority, priority));
    if (assigneeId) conditions.push(eq(strategicTasks.assigneeId, assigneeId));
    if (parentTaskId !== undefined) {
      if (parentTaskId === null) {
        conditions.push(sql`${strategicTasks.parentTaskId} IS NULL`);
      } else {
        conditions.push(eq(strategicTasks.parentTaskId, parentTaskId));
      }
    }
    if (dueDateStart) conditions.push(gte(strategicTasks.dueDate, dueDateStart));
    if (dueDateEnd) conditions.push(lte(strategicTasks.dueDate, dueDateEnd));
    if (search) {
      conditions.push(
        or(
          like(strategicTasks.title, `%${search}%`),
          like(strategicTasks.code, `%${search}%`),
          like(strategicTasks.description, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(strategicTasks)
        .where(whereClause)
        .orderBy(asc(strategicTasks.orderIndex), desc(strategicTasks.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(strategicTasks)
        .where(whereClause)
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data: data.map(mapToTask),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findById(id: number): Promise<StrategicTask | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select()
      .from(strategicTasks)
      .where(eq(strategicTasks.id, id))
      .limit(1);

    return result[0] ? mapToTask(result[0]) : null;
  }

  async findByProject(projectId: number): Promise<StrategicTask[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select()
      .from(strategicTasks)
      .where(eq(strategicTasks.projectId, projectId))
      .orderBy(asc(strategicTasks.orderIndex));

    return result.map(mapToTask);
  }

  async findDueToday(userId: number): Promise<StrategicTask[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const today = new Date().toISOString().split('T')[0];

    const result = await db
      .select()
      .from(strategicTasks)
      .where(
        and(
          eq(strategicTasks.dueDate, today),
          eq(strategicTasks.assigneeId, userId),
          sql`${strategicTasks.status} NOT IN ('concluida', 'cancelada')`
        )
      )
      .orderBy(asc(strategicTasks.orderIndex));

    return result.map(mapToTask);
  }

  async findOverdue(userId: number): Promise<StrategicTask[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const today = new Date().toISOString().split('T')[0];

    const result = await db
      .select()
      .from(strategicTasks)
      .where(
        and(
          sql`${strategicTasks.dueDate} < ${today}`,
          eq(strategicTasks.assigneeId, userId),
          sql`${strategicTasks.status} NOT IN ('concluida', 'cancelada')`
        )
      )
      .orderBy(asc(strategicTasks.dueDate));

    return result.map(mapToTask);
  }

  async create(data: CreateStrategicTaskDTO): Promise<StrategicTask> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Buscar o código do projeto para gerar o código da tarefa
    const project = await db
      .select({ code: strategicProjects.code })
      .from(strategicProjects)
      .where(eq(strategicProjects.id, data.projectId))
      .limit(1);

    const projectCode = project[0]?.code ?? 'PROJ-000';
    const taskCode = await this.getNextCode(projectCode);

    const result = await db.insert(strategicTasks).values({
      projectId: data.projectId,
      phaseId: data.phaseId ?? null,
      parentTaskId: data.parentTaskId ?? null,
      code: taskCode,
      title: data.title,
      description: data.description ?? null,
      priority: data.priority,
      status: data.status ?? 'a_fazer',
      assigneeId: data.assigneeId ?? null,
      assigneeName: data.assigneeName ?? null,
      startDate: data.startDate ?? null,
      dueDate: data.dueDate ?? null,
      estimatedHours: data.estimatedHours ?? null,
      estimatedCost: data.estimatedCost ?? null,
      orderIndex: data.orderIndex ?? 0,
      tags: data.tags ?? null,
      createdBy: data.createdBy ?? null,
    });

    const insertId = result[0].insertId;
    return this.findById(insertId) as Promise<StrategicTask>;
  }

  async update(id: number, data: UpdateStrategicTaskDTO): Promise<StrategicTask> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const updateData: Record<string, unknown> = {};

    if (data.phaseId !== undefined) updateData.phaseId = data.phaseId;
    if (data.parentTaskId !== undefined) updateData.parentTaskId = data.parentTaskId;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
    if (data.assigneeName !== undefined) updateData.assigneeName = data.assigneeName;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;
    if (data.estimatedHours !== undefined) updateData.estimatedHours = data.estimatedHours;
    if (data.actualHours !== undefined) updateData.actualHours = data.actualHours;
    if (data.estimatedCost !== undefined) updateData.estimatedCost = data.estimatedCost;
    if (data.actualCost !== undefined) updateData.actualCost = data.actualCost;
    if (data.orderIndex !== undefined) updateData.orderIndex = data.orderIndex;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.updatedBy !== undefined) updateData.updatedBy = data.updatedBy;

    if (Object.keys(updateData).length > 0) {
      await db
        .update(strategicTasks)
        .set(updateData)
        .where(eq(strategicTasks.id, id));
    }

    const updated = await this.findById(id);
    if (!updated) throw new NotFoundError('Tarefa estratégica', id);
    return updated;
  }

  async delete(id: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Deletar notas, dependências, links e a tarefa
    await db.delete(strategicTaskNotes).where(eq(strategicTaskNotes.taskId, id));
    await db.delete(strategicTaskDependencies).where(
      or(
        eq(strategicTaskDependencies.taskId, id),
        eq(strategicTaskDependencies.dependsOnTaskId, id)
      )
    );
    await db.delete(strategicTaskLinks).where(eq(strategicTaskLinks.taskId, id));
    // Deletar subtarefas recursivamente
    await db.delete(strategicTasks).where(eq(strategicTasks.parentTaskId, id));
    await db.delete(strategicTasks).where(eq(strategicTasks.id, id));
  }

  async reorder(projectId: number, phaseId: number | null, taskIds: number[]): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    for (let i = 0; i < taskIds.length; i++) {
      await db
        .update(strategicTasks)
        .set({ orderIndex: i })
        .where(eq(strategicTasks.id, taskIds[i]));
    }
  }

  async countByProjectAndStatus(projectId: number): Promise<TaskCountByStatus> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select({
        status: strategicTasks.status,
        count: count()
      })
      .from(strategicTasks)
      .where(eq(strategicTasks.projectId, projectId))
      .groupBy(strategicTasks.status);

    const counts: TaskCountByStatus = {
      a_fazer: 0,
      em_andamento: 0,
      aguardando: 0,
      concluida: 0,
      cancelada: 0,
    };

    for (const r of result) {
      if (r.status in counts) {
        counts[r.status as keyof TaskCountByStatus] = r.count;
      }
    }

    return counts;
  }

  async getNextCode(projectCode: string): Promise<string> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select({ code: strategicTasks.code })
      .from(strategicTasks)
      .where(like(strategicTasks.code, `${projectCode}-T%`))
      .orderBy(desc(strategicTasks.id))
      .limit(1);

    if (result.length === 0 || !result[0].code) {
      return `${projectCode}-T01`;
    }

    const lastCode = result[0].code;
    const match = lastCode.match(/-T(\d+)$/);
    const nextNum = match ? parseInt(match[1]) + 1 : 1;
    return `${projectCode}-T${String(nextNum).padStart(2, '0')}`;
  }

  // ---------- NOTAS ----------

  async findNotesByTask(taskId: number): Promise<TaskNote[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select()
      .from(strategicTaskNotes)
      .where(eq(strategicTaskNotes.taskId, taskId))
      .orderBy(desc(strategicTaskNotes.createdAt));

    return result.map(mapToNote);
  }

  async findNotesByProject(projectId: number): Promise<TaskNote[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select()
      .from(strategicTaskNotes)
      .where(eq(strategicTaskNotes.projectId, projectId))
      .orderBy(desc(strategicTaskNotes.createdAt));

    return result.map(mapToNote);
  }

  async createNote(data: CreateTaskNoteDTO): Promise<TaskNote> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db.insert(strategicTaskNotes).values({
      taskId: data.taskId,
      projectId: data.projectId,
      content: data.content,
      noteType: data.noteType,
      attachmentUrl: data.attachmentUrl ?? null,
      createdBy: data.createdBy ?? null,
      createdByName: data.createdByName ?? null,
    });

    const insertId = result[0].insertId;
    const note = await db
      .select()
      .from(strategicTaskNotes)
      .where(eq(strategicTaskNotes.id, insertId))
      .limit(1);

    return mapToNote(note[0]);
  }

  async deleteNote(id: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    await db.delete(strategicTaskNotes).where(eq(strategicTaskNotes.id, id));
  }

  // ---------- DEPENDÊNCIAS ----------

  async findDependenciesByTask(taskId: number): Promise<TaskDependency[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select()
      .from(strategicTaskDependencies)
      .where(eq(strategicTaskDependencies.taskId, taskId));

    return result.map(mapToDependency);
  }

  async createDependency(data: CreateTaskDependencyDTO): Promise<TaskDependency> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db.insert(strategicTaskDependencies).values({
      taskId: data.taskId,
      dependsOnTaskId: data.dependsOnTaskId,
      dependencyType: data.dependencyType,
    });

    const insertId = result[0].insertId;
    const dep = await db
      .select()
      .from(strategicTaskDependencies)
      .where(eq(strategicTaskDependencies.id, insertId))
      .limit(1);

    return mapToDependency(dep[0]);
  }

  async deleteDependency(id: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    await db.delete(strategicTaskDependencies).where(eq(strategicTaskDependencies.id, id));
  }

  // ---------- LINKS COM MÓDULOS ERP ----------

  async findLinksByTask(taskId: number): Promise<TaskLink[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select()
      .from(strategicTaskLinks)
      .where(eq(strategicTaskLinks.taskId, taskId))
      .orderBy(desc(strategicTaskLinks.createdAt));

    return result.map(mapToLink);
  }

  async findLinksByProject(projectId: number): Promise<TaskLink[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select()
      .from(strategicTaskLinks)
      .where(eq(strategicTaskLinks.projectId, projectId))
      .orderBy(desc(strategicTaskLinks.createdAt));

    return result.map(mapToLink);
  }

  async createLink(data: CreateTaskLinkDTO): Promise<TaskLink> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db.insert(strategicTaskLinks).values({
      taskId: data.taskId,
      projectId: data.projectId,
      linkedModule: data.linkedModule,
      linkedEntityType: data.linkedEntityType,
      linkedEntityId: data.linkedEntityId,
      linkedEntityLabel: data.linkedEntityLabel,
      createdBy: data.createdBy ?? null,
    });

    const insertId = result[0].insertId;
    const link = await db
      .select()
      .from(strategicTaskLinks)
      .where(eq(strategicTaskLinks.id, insertId))
      .limit(1);

    return mapToLink(link[0]);
  }

  async deleteLink(id: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    await db.delete(strategicTaskLinks).where(eq(strategicTaskLinks.id, id));
  }
}

// Singleton para uso no sistema
let instance: StrategicTaskRepository | null = null;

export function getStrategicTaskRepository(): IStrategicTaskRepository {
  if (!instance) {
    instance = new StrategicTaskRepository();
  }
  return instance;
}

export default StrategicTaskRepository;
