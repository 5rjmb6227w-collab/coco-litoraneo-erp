/**
 * Implementação concreta do Repository de Produtores.
 * Segue o princípio SOLID de Single Responsibility - apenas acesso a dados.
 */

import { eq, like, and, or, sql, desc, count } from 'drizzle-orm';
import { getDb } from '../db';
import { producers, coconutLoads } from '../../drizzle/schema';
import type {
  IProducerRepository,
  ProducerFilters,
  PaginationOptions,
  PaginatedResult,
  CreateProducerDTO,
  UpdateProducerDTO,
  Producer
} from './interfaces/IProducerRepository';

// Mapeamento entre interface e schema real
type SchemaProducer = typeof producers.$inferSelect;

function mapToProducer(row: SchemaProducer): Producer {
  return {
    id: row.id,
    name: row.name,
    cpfCnpj: row.cpfCnpj,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: null, // Campo não existe no schema atual
    state: null, // Campo não existe no schema atual
    bankName: row.bank,
    bankAgency: row.agency,
    bankAccount: row.account,
    pixKey: row.pixKey,
    externalCode: row.externalCode,
    notes: null, // Campo não existe no schema atual
    isActive: row.status === 'ativo',
    createdAt: row.createdAt,
    createdBy: row.createdBy?.toString() ?? null,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy?.toString() ?? null
  };
}

export class ProducerRepository implements IProducerRepository {
  async findAll(
    filters: ProducerFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Producer>> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const { search, status } = filters;
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(producers.name, `%${search}%`),
          like(producers.cpfCnpj, `%${search}%`),
          like(producers.email, `%${search}%`)
        )
      );
    }

    if (status && status !== 'all') {
      const statusValue = status === 'active' ? 'ativo' : 'inativo';
      conditions.push(eq(producers.status, statusValue));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(producers)
        .where(whereClause)
        .orderBy(desc(producers.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(producers)
        .where(whereClause)
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data: data.map(mapToProducer),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findById(id: number): Promise<Producer | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select()
      .from(producers)
      .where(eq(producers.id, id))
      .limit(1);

    return result[0] ? mapToProducer(result[0]) : null;
  }

  async findByCpfCnpj(cpfCnpj: string): Promise<Producer | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select()
      .from(producers)
      .where(eq(producers.cpfCnpj, cpfCnpj))
      .limit(1);

    return result[0] ? mapToProducer(result[0]) : null;
  }

  async findByExternalCode(externalCode: string): Promise<Producer | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select()
      .from(producers)
      .where(eq(producers.externalCode, externalCode))
      .limit(1);

    return result[0] ? mapToProducer(result[0]) : null;
  }

  async create(data: CreateProducerDTO): Promise<Producer> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .insert(producers)
      .values({
        name: data.name,
        cpfCnpj: data.cpfCnpj,
        phone: data.phone ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
        bank: data.bankName ?? null,
        agency: data.bankAgency ?? null,
        account: data.bankAccount ?? null,
        pixKey: data.pixKey ?? null,
        externalCode: data.externalCode ?? null,
        status: data.isActive === false ? 'inativo' : 'ativo',
        defaultPricePerKg: '0',
        createdBy: data.createdBy ? parseInt(data.createdBy) : null
      });

    const insertId = result[0].insertId;
    return this.findById(insertId) as Promise<Producer>;
  }

  async update(id: number, data: UpdateProducerDTO): Promise<Producer> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.cpfCnpj !== undefined) updateData.cpfCnpj = data.cpfCnpj;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.bankName !== undefined) updateData.bank = data.bankName;
    if (data.bankAgency !== undefined) updateData.agency = data.bankAgency;
    if (data.bankAccount !== undefined) updateData.account = data.bankAccount;
    if (data.pixKey !== undefined) updateData.pixKey = data.pixKey;
    if (data.externalCode !== undefined) updateData.externalCode = data.externalCode;
    if (data.isActive !== undefined) updateData.status = data.isActive ? 'ativo' : 'inativo';
    if (data.updatedBy !== undefined) updateData.updatedBy = parseInt(data.updatedBy);

    if (Object.keys(updateData).length > 0) {
      await db
        .update(producers)
        .set(updateData)
        .where(eq(producers.id, id));
    }

    return this.findById(id) as Promise<Producer>;
  }

  async delete(id: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    await db
      .update(producers)
      .set({ status: 'inativo' })
      .where(eq(producers.id, id));
  }

  async countActive(): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select({ count: count() })
      .from(producers)
      .where(eq(producers.status, 'ativo'));

    return result[0]?.count ?? 0;
  }

  async findTopByVolume(
    limitNum: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ producer: Producer; totalWeight: number; totalLoads: number }>> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const conditions = [];

    if (startDate) {
      conditions.push(sql`${coconutLoads.receivedAt} >= ${startDate}`);
    }
    if (endDate) {
      conditions.push(sql`${coconutLoads.receivedAt} <= ${endDate}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select({
        producerId: coconutLoads.producerId,
        totalWeight: sql<number>`SUM(${coconutLoads.netWeight})`,
        totalLoads: count()
      })
      .from(coconutLoads)
      .where(whereClause)
      .groupBy(coconutLoads.producerId)
      .orderBy(sql`SUM(${coconutLoads.netWeight}) DESC`)
      .limit(limitNum);

    const producersData = await Promise.all(
      result.map(async (r: { producerId: number; totalWeight: number; totalLoads: number }) => {
        const producer = await this.findById(r.producerId);
        return {
          producer: producer!,
          totalWeight: Number(r.totalWeight) || 0,
          totalLoads: Number(r.totalLoads) || 0
        };
      })
    );

    return producersData.filter((p: { producer: Producer | null }) => p.producer !== null) as Array<{ producer: Producer; totalWeight: number; totalLoads: number }>;
  }

  async existsByCpfCnpj(cpfCnpj: string, excludeId?: number): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const conditions = [eq(producers.cpfCnpj, cpfCnpj)];
    
    if (excludeId) {
      conditions.push(sql`${producers.id} != ${excludeId}`);
    }

    const result = await db
      .select({ count: count() })
      .from(producers)
      .where(and(...conditions));

    return (result[0]?.count ?? 0) > 0;
  }
}

// Singleton para uso no sistema
let instance: ProducerRepository | null = null;

export function getProducerRepository(): IProducerRepository {
  if (!instance) {
    instance = new ProducerRepository();
  }
  return instance;
}

export default ProducerRepository;
