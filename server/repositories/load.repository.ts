/**
 * Implementação concreta do Repository de Cargas.
 * Segue o princípio SOLID de Single Responsibility - apenas acesso a dados.
 * Adaptado para o schema real do banco de dados.
 */

import { eq, like, and, or, sql, desc, count, gte, lte } from 'drizzle-orm';
import { getDb } from '../db';
import { coconutLoads, producers } from '../../drizzle/schema';
import type {
  ILoadRepository,
  LoadFilters,
  CreateLoadDTO,
  UpdateLoadDTO,
  Load,
  LoadWithProducer,
  LoadEvolution,
  LoadStatus
} from './interfaces/ILoadRepository';
import type { PaginationOptions, PaginatedResult } from './interfaces/IProducerRepository';

// Mapeamento entre interface e schema real
type SchemaLoad = typeof coconutLoads.$inferSelect;
type SchemaProducer = typeof producers.$inferSelect;

function mapToLoad(row: SchemaLoad): Load {
  return {
    id: row.id,
    externalCode: row.externalCode,
    receivedAt: row.receivedAt,
    producerId: row.producerId,
    licensePlate: row.licensePlate,
    driverName: row.driverName,
    grossWeight: Number(row.grossWeight),
    tareWeight: Number(row.tareWeight),
    netWeight: Number(row.netWeight),
    observations: row.observations,
    photoUrl: row.photoUrl,
    status: row.status as LoadStatus,
    closedAt: row.closedAt,
    closedBy: row.closedBy?.toString() ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy?.toString() ?? null,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy?.toString() ?? null
  };
}

function mapToLoadWithProducer(row: SchemaLoad, producerRow: SchemaProducer): LoadWithProducer {
  return {
    ...mapToLoad(row),
    producer: {
      id: producerRow.id,
      name: producerRow.name,
      cpfCnpj: producerRow.cpfCnpj,
      phone: producerRow.phone
    }
  };
}

export class LoadRepository implements ILoadRepository {
  async findAll(
    filters: LoadFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<LoadWithProducer>> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const { search, status, producerId, startDate, endDate } = filters;
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(coconutLoads.licensePlate, `%${search}%`),
          like(coconutLoads.externalCode, `%${search}%`),
          like(coconutLoads.driverName, `%${search}%`)
        )
      );
    }

    if (status && status !== 'all') {
      conditions.push(eq(coconutLoads.status, status));
    }

    if (producerId) {
      conditions.push(eq(coconutLoads.producerId, producerId));
    }

    if (startDate) {
      conditions.push(gte(coconutLoads.receivedAt, startDate));
    }

    if (endDate) {
      conditions.push(lte(coconutLoads.receivedAt, endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(coconutLoads)
        .leftJoin(producers, eq(coconutLoads.producerId, producers.id))
        .where(whereClause)
        .orderBy(desc(coconutLoads.receivedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(coconutLoads)
        .where(whereClause)
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data: data.map(row => mapToLoadWithProducer(row.coconut_loads, row.producers!)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findById(id: number): Promise<LoadWithProducer | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select()
      .from(coconutLoads)
      .leftJoin(producers, eq(coconutLoads.producerId, producers.id))
      .where(eq(coconutLoads.id, id))
      .limit(1);

    if (!result[0]) return null;
    return mapToLoadWithProducer(result[0].coconut_loads, result[0].producers!);
  }

  async findByExternalCode(externalCode: string): Promise<LoadWithProducer | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select()
      .from(coconutLoads)
      .leftJoin(producers, eq(coconutLoads.producerId, producers.id))
      .where(eq(coconutLoads.externalCode, externalCode))
      .limit(1);

    if (!result[0]) return null;
    return mapToLoadWithProducer(result[0].coconut_loads, result[0].producers!);
  }

  async create(data: CreateLoadDTO): Promise<Load> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .insert(coconutLoads)
      .values({
        producerId: data.producerId,
        licensePlate: data.licensePlate,
        driverName: data.driverName ?? null,
        grossWeight: data.grossWeight.toString(),
        tareWeight: data.tareWeight.toString(),
        netWeight: data.netWeight.toString(),
        observations: data.observations ?? null,
        photoUrl: data.photoUrl ?? null,
        receivedAt: data.receivedAt || new Date(),
        externalCode: data.externalCode ?? null,
        status: 'recebido',
        createdBy: data.createdBy ? parseInt(data.createdBy) : null
      });

    const insertId = result[0].insertId;
    const load = await this.findById(insertId);
    return load as Load;
  }

  async update(id: number, data: UpdateLoadDTO): Promise<Load> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const updateData: Record<string, unknown> = {};

    if (data.licensePlate !== undefined) updateData.licensePlate = data.licensePlate;
    if (data.driverName !== undefined) updateData.driverName = data.driverName;
    if (data.grossWeight !== undefined) updateData.grossWeight = data.grossWeight.toString();
    if (data.tareWeight !== undefined) updateData.tareWeight = data.tareWeight.toString();
    if (data.netWeight !== undefined) updateData.netWeight = data.netWeight.toString();
    if (data.observations !== undefined) updateData.observations = data.observations;
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.closedAt !== undefined) updateData.closedAt = data.closedAt;
    if (data.closedBy !== undefined) updateData.closedBy = parseInt(data.closedBy);
    if (data.updatedBy !== undefined) updateData.updatedBy = parseInt(data.updatedBy);

    if (Object.keys(updateData).length > 0) {
      await db
        .update(coconutLoads)
        .set(updateData)
        .where(eq(coconutLoads.id, id));
    }

    const load = await this.findById(id);
    return load as Load;
  }

  async delete(id: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    await db
      .delete(coconutLoads)
      .where(eq(coconutLoads.id, id));
  }

  async updateStatus(id: number, status: LoadStatus, userId?: string): Promise<Load> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const updateData: Record<string, unknown> = { status };
    
    if (status === 'fechado') {
      updateData.closedAt = new Date();
      if (userId) updateData.closedBy = parseInt(userId);
    }

    await db
      .update(coconutLoads)
      .set(updateData)
      .where(eq(coconutLoads.id, id));

    const load = await this.findById(id);
    return load as Load;
  }

  async close(id: number, closedBy: string): Promise<Load> {
    return this.updateStatus(id, 'fechado', closedBy);
  }

  async findByProducerId(
    producerId: number,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Load>> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(coconutLoads)
        .where(eq(coconutLoads.producerId, producerId))
        .orderBy(desc(coconutLoads.receivedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(coconutLoads)
        .where(eq(coconutLoads.producerId, producerId))
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data: data.map(mapToLoad),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findPending(): Promise<LoadWithProducer[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select()
      .from(coconutLoads)
      .leftJoin(producers, eq(coconutLoads.producerId, producers.id))
      .where(eq(coconutLoads.status, 'recebido'))
      .orderBy(desc(coconutLoads.receivedAt));

    return result.map(row => mapToLoadWithProducer(row.coconut_loads, row.producers!));
  }

  async getEvolution(startDate: Date, endDate: Date): Promise<LoadEvolution[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select({
        date: sql<string>`DATE(${coconutLoads.receivedAt})`,
        totalWeight: sql<number>`SUM(${coconutLoads.netWeight})`,
        totalLoads: count()
      })
      .from(coconutLoads)
      .where(and(
        gte(coconutLoads.receivedAt, startDate),
        lte(coconutLoads.receivedAt, endDate)
      ))
      .groupBy(sql`DATE(${coconutLoads.receivedAt})`)
      .orderBy(sql`DATE(${coconutLoads.receivedAt})`);

    return result.map(r => ({
      date: r.date,
      totalWeight: Number(r.totalWeight) || 0,
      totalLoads: r.totalLoads
    }));
  }

  async countByStatus(): Promise<Record<LoadStatus, number>> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select({
        status: coconutLoads.status,
        count: count()
      })
      .from(coconutLoads)
      .groupBy(coconutLoads.status);

    const counts: Record<LoadStatus, number> = {
      recebido: 0,
      conferido: 0,
      fechado: 0
    };

    result.forEach(r => {
      counts[r.status as LoadStatus] = r.count;
    });

    return counts;
  }

  async getTotalWeight(startDate?: Date, endDate?: Date): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const conditions = [];
    if (startDate) conditions.push(gte(coconutLoads.receivedAt, startDate));
    if (endDate) conditions.push(lte(coconutLoads.receivedAt, endDate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select({
        total: sql<number>`SUM(${coconutLoads.netWeight})`
      })
      .from(coconutLoads)
      .where(whereClause);

    return Number(result[0]?.total) || 0;
  }

  async countPending(): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select({ count: count() })
      .from(coconutLoads)
      .where(eq(coconutLoads.status, 'recebido'));

    return result[0]?.count ?? 0;
  }

  async countToday(): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db
      .select({ count: count() })
      .from(coconutLoads)
      .where(gte(coconutLoads.receivedAt, today));

    return result[0]?.count ?? 0;
  }

  async canEdit(id: number): Promise<boolean> {
    const load = await this.findById(id);
    if (!load) return false;
    return load.status !== 'fechado';
  }
}

// Singleton para uso no sistema
let instance: LoadRepository | null = null;

export function getLoadRepository(): ILoadRepository {
  if (!instance) {
    instance = new LoadRepository();
  }
  return instance;
}

export default LoadRepository;
