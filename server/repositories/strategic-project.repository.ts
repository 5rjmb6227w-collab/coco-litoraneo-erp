/**
 * Implementação concreta do Repository de Projetos Estratégicos.
 * Segue o princípio SOLID de Single Responsibility - apenas acesso a dados.
 */

import { eq, like, and, or, sql, desc, count, asc } from 'drizzle-orm';
import { getDb } from '../db';
import {
  strategicProjects,
  strategicPhases,
  strategicProjectMembers
} from '../../drizzle/schema';
import { NotFoundError } from '../errors';
import type { PaginationOptions, PaginatedResult } from './interfaces/IProducerRepository';
import type {
  IStrategicProjectRepository,
  StrategicProjectFilters,
  CreateStrategicProjectDTO,
  UpdateStrategicProjectDTO,
  StrategicProject,
  StrategicPhaseDTO,
  StrategicPhase,
  StrategicProjectMemberDTO,
  StrategicProjectMember,
  DashboardStats
} from './interfaces/IStrategicProjectRepository';

// ============================================================================
// MAPEAMENTO
// ============================================================================
type SchemaProject = typeof strategicProjects.$inferSelect;
type SchemaPhase = typeof strategicPhases.$inferSelect;
type SchemaMember = typeof strategicProjectMembers.$inferSelect;

function mapToProject(row: SchemaProject): StrategicProject {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    startDate: row.startDate,
    targetEndDate: row.targetEndDate,
    actualEndDate: row.actualEndDate,
    budgetPlanned: row.budgetPlanned,
    budgetActual: row.budgetActual,
    progress: row.progress,
    ownerId: row.ownerId,
    photoUrl: row.photoUrl,
    tags: row.tags as string[] | null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

function mapToPhase(row: SchemaPhase): StrategicPhase {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    orderIndex: row.orderIndex,
    status: row.status,
    startDate: row.startDate,
    endDate: row.endDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapToMember(row: SchemaMember): StrategicProjectMember {
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    role: row.role,
    addedAt: row.addedAt,
    addedBy: row.addedBy,
  };
}

// ============================================================================
// IMPLEMENTAÇÃO
// ============================================================================
export class StrategicProjectRepository implements IStrategicProjectRepository {

  // ---------- PROJETOS ----------

  async findAll(
    filters: StrategicProjectFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<StrategicProject>> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const { search, status, category, priority, ownerId } = filters;
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(strategicProjects.title, `%${search}%`),
          like(strategicProjects.code, `%${search}%`),
          like(strategicProjects.description, `%${search}%`)
        )
      );
    }
    if (status) {
      conditions.push(eq(strategicProjects.status, status));
    }
    if (category) {
      conditions.push(eq(strategicProjects.category, category));
    }
    if (priority) {
      conditions.push(eq(strategicProjects.priority, priority));
    }
    if (ownerId) {
      conditions.push(eq(strategicProjects.ownerId, ownerId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(strategicProjects)
        .where(whereClause)
        .orderBy(desc(strategicProjects.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(strategicProjects)
        .where(whereClause)
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data: data.map(mapToProject),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findById(id: number): Promise<StrategicProject | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select()
      .from(strategicProjects)
      .where(eq(strategicProjects.id, id))
      .limit(1);

    return result[0] ? mapToProject(result[0]) : null;
  }

  async findByCode(code: string): Promise<StrategicProject | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select()
      .from(strategicProjects)
      .where(eq(strategicProjects.code, code))
      .limit(1);

    return result[0] ? mapToProject(result[0]) : null;
  }

  async findByMember(
    userId: number,
    filters: StrategicProjectFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<StrategicProject>> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const { search, status, category, priority } = filters;
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    // Buscar IDs de projetos onde o usuário é membro ou owner
    const memberProjectIds = await db
      .select({ projectId: strategicProjectMembers.projectId })
      .from(strategicProjectMembers)
      .where(eq(strategicProjectMembers.userId, userId));

    const ownerProjectIds = await db
      .select({ id: strategicProjects.id })
      .from(strategicProjects)
      .where(eq(strategicProjects.ownerId, userId));

    const allProjectIds = Array.from(new Set([
      ...memberProjectIds.map(r => r.projectId),
      ...ownerProjectIds.map(r => r.id)
    ]));

    if (allProjectIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const conditions = [
      sql`${strategicProjects.id} IN (${sql.join(allProjectIds.map(id => sql`${id}`), sql`, `)})`
    ];

    if (search) {
      conditions.push(
        or(
          like(strategicProjects.title, `%${search}%`),
          like(strategicProjects.code, `%${search}%`)
        )!
      );
    }
    if (status) {
      conditions.push(eq(strategicProjects.status, status));
    }
    if (category) {
      conditions.push(eq(strategicProjects.category, category));
    }
    if (priority) {
      conditions.push(eq(strategicProjects.priority, priority));
    }

    const whereClause = and(...conditions);

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(strategicProjects)
        .where(whereClause)
        .orderBy(desc(strategicProjects.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(strategicProjects)
        .where(whereClause)
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data: data.map(mapToProject),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async create(data: CreateStrategicProjectDTO): Promise<StrategicProject> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const code = await this.getNextCode();

    const result = await db
      .insert(strategicProjects)
      .values({
        code,
        title: data.title,
        description: data.description ?? null,
        category: data.category,
        priority: data.priority,
        status: data.status ?? 'planejamento',
        startDate: data.startDate ? new Date(data.startDate) : null,
        targetEndDate: data.targetEndDate ? new Date(data.targetEndDate) : null,
        budgetPlanned: data.budgetPlanned ?? null,
        ownerId: data.ownerId,
        photoUrl: data.photoUrl ?? null,
        tags: data.tags ?? null,
        createdBy: data.createdBy ?? null,
      });

    const insertId = result[0].insertId;

    // Adicionar o criador como owner do projeto
    await db.insert(strategicProjectMembers).values({
      projectId: insertId,
      userId: data.ownerId,
      role: 'owner',
      addedBy: data.createdBy ?? null,
    });

    return this.findById(insertId) as Promise<StrategicProject>;
  }

  async update(id: number, data: UpdateStrategicProjectDTO): Promise<StrategicProject> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.targetEndDate !== undefined) updateData.targetEndDate = data.targetEndDate;
    if (data.actualEndDate !== undefined) updateData.actualEndDate = data.actualEndDate;
    if (data.budgetPlanned !== undefined) updateData.budgetPlanned = data.budgetPlanned;
    if (data.budgetActual !== undefined) updateData.budgetActual = data.budgetActual;
    if (data.progress !== undefined) updateData.progress = data.progress;
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.updatedBy !== undefined) updateData.updatedBy = data.updatedBy;

    if (Object.keys(updateData).length > 0) {
      await db
        .update(strategicProjects)
        .set(updateData)
        .where(eq(strategicProjects.id, id));
    }

    const updated = await this.findById(id);
    if (!updated) throw new NotFoundError('Projeto estratégico', id);
    return updated;
  }

  async delete(id: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Deletar membros, fases e o projeto em cascata
    await db.delete(strategicProjectMembers).where(eq(strategicProjectMembers.projectId, id));
    await db.delete(strategicPhases).where(eq(strategicPhases.projectId, id));
    await db.delete(strategicProjects).where(eq(strategicProjects.id, id));
  }

  async getNextCode(): Promise<string> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select({ code: strategicProjects.code })
      .from(strategicProjects)
      .orderBy(desc(strategicProjects.id))
      .limit(1);

    if (result.length === 0) {
      return 'PROJ-001';
    }

    const lastCode = result[0].code;
    const match = lastCode.match(/PROJ-(\d+)/);
    const nextNum = match ? parseInt(match[1]) + 1 : 1;
    return `PROJ-${String(nextNum).padStart(3, '0')}`;
  }

  async getDashboardStats(userId: number): Promise<DashboardStats> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Buscar IDs de projetos acessíveis ao usuário
    const memberProjectIds = await db
      .select({ projectId: strategicProjectMembers.projectId })
      .from(strategicProjectMembers)
      .where(eq(strategicProjectMembers.userId, userId));

    const ownerProjectIds = await db
      .select({ id: strategicProjects.id })
      .from(strategicProjects)
      .where(eq(strategicProjects.ownerId, userId));

    const allProjectIds = Array.from(new Set([
      ...memberProjectIds.map(r => r.projectId),
      ...ownerProjectIds.map(r => r.id)
    ]));

    if (allProjectIds.length === 0) {
      return {
        totalProjects: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
        totalBudgetPlanned: 0,
        totalBudgetActual: 0,
      };
    }

    const inClause = sql`${strategicProjects.id} IN (${sql.join(allProjectIds.map(id => sql`${id}`), sql`, `)})`;

    const projects = await db
      .select()
      .from(strategicProjects)
      .where(inClause);

    const now = new Date().toISOString().split('T')[0];
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;
    let totalBudgetPlanned = 0;
    let totalBudgetActual = 0;

    for (const p of projects) {
      if (p.status === 'em_andamento') inProgress++;
      if (p.status === 'concluido') completed++;
      if (p.targetEndDate && new Date(p.targetEndDate) < new Date(now) && p.status !== 'concluido' && p.status !== 'cancelado') {
        overdue++;
      }
      totalBudgetPlanned += parseFloat(p.budgetPlanned ?? '0');
      totalBudgetActual += parseFloat(p.budgetActual ?? '0');
    }

    return {
      totalProjects: projects.length,
      inProgress,
      completed,
      overdue,
      totalBudgetPlanned,
      totalBudgetActual,
    };
  }

  // ---------- FASES ----------

  async findPhasesByProject(projectId: number): Promise<StrategicPhase[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select()
      .from(strategicPhases)
      .where(eq(strategicPhases.projectId, projectId))
      .orderBy(asc(strategicPhases.orderIndex));

    return result.map(mapToPhase);
  }

  async createPhase(data: StrategicPhaseDTO): Promise<StrategicPhase> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db.insert(strategicPhases).values({
      projectId: data.projectId,
      title: data.title,
      description: data.description ?? null,
      orderIndex: data.orderIndex,
      status: data.status ?? 'pendente',
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    });

    const insertId = result[0].insertId;
    const phase = await db
      .select()
      .from(strategicPhases)
      .where(eq(strategicPhases.id, insertId))
      .limit(1);

    return mapToPhase(phase[0]);
  }

  async updatePhase(id: number, data: Partial<StrategicPhaseDTO>): Promise<StrategicPhase> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.orderIndex !== undefined) updateData.orderIndex = data.orderIndex;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;

    if (Object.keys(updateData).length > 0) {
      await db
        .update(strategicPhases)
        .set(updateData)
        .where(eq(strategicPhases.id, id));
    }

    const phase = await db
      .select()
      .from(strategicPhases)
      .where(eq(strategicPhases.id, id))
      .limit(1);

    if (!phase[0]) throw new NotFoundError('Fase do projeto', id);
    return mapToPhase(phase[0]);
  }

  async deletePhase(id: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    await db.delete(strategicPhases).where(eq(strategicPhases.id, id));
  }

  // ---------- MEMBROS ----------

  async findMembersByProject(projectId: number): Promise<StrategicProjectMember[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select()
      .from(strategicProjectMembers)
      .where(eq(strategicProjectMembers.projectId, projectId))
      .orderBy(asc(strategicProjectMembers.addedAt));

    return result.map(mapToMember);
  }

  async addMember(data: StrategicProjectMemberDTO): Promise<StrategicProjectMember> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db.insert(strategicProjectMembers).values({
      projectId: data.projectId,
      userId: data.userId,
      role: data.role,
      addedBy: data.addedBy ?? null,
    });

    const insertId = result[0].insertId;
    const member = await db
      .select()
      .from(strategicProjectMembers)
      .where(eq(strategicProjectMembers.id, insertId))
      .limit(1);

    return mapToMember(member[0]);
  }

  async removeMember(projectId: number, userId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    await db
      .delete(strategicProjectMembers)
      .where(
        and(
          eq(strategicProjectMembers.projectId, projectId),
          eq(strategicProjectMembers.userId, userId)
        )
      );
  }

  async isMember(projectId: number, userId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select({ count: count() })
      .from(strategicProjectMembers)
      .where(
        and(
          eq(strategicProjectMembers.projectId, projectId),
          eq(strategicProjectMembers.userId, userId)
        )
      );

    return (result[0]?.count ?? 0) > 0;
  }

  async getMemberRole(projectId: number, userId: number): Promise<'owner' | 'editor' | 'viewer' | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Verificar se é o owner do projeto
    const project = await db
      .select({ ownerId: strategicProjects.ownerId })
      .from(strategicProjects)
      .where(eq(strategicProjects.id, projectId))
      .limit(1);

    if (project[0] && project[0].ownerId === userId) {
      return 'owner';
    }

    // Verificar na tabela de membros
    const member = await db
      .select({ role: strategicProjectMembers.role })
      .from(strategicProjectMembers)
      .where(
        and(
          eq(strategicProjectMembers.projectId, projectId),
          eq(strategicProjectMembers.userId, userId)
        )
      )
      .limit(1);

    return member[0]?.role ?? null;
  }
}

// Singleton para uso no sistema
let instance: StrategicProjectRepository | null = null;

export function getStrategicProjectRepository(): IStrategicProjectRepository {
  if (!instance) {
    instance = new StrategicProjectRepository();
  }
  return instance;
}

export default StrategicProjectRepository;
