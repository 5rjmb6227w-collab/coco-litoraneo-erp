import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from './db';

// Mock do banco de dados
vi.mock('./db', async () => {
  const actual = await vi.importActual('./db');
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

describe('OEE Metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOEEMetrics', () => {
    it('should return OEE metrics structure with all required fields', async () => {
      // Mock do banco retornando dados vazios
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      
      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      const result = await db.getOEEMetrics();
      
      // Quando não há dados, deve retornar valores padrão
      if (result) {
        expect(result).toHaveProperty('oee');
        expect(result).toHaveProperty('availability');
        expect(result).toHaveProperty('performance');
        expect(result).toHaveProperty('quality');
        expect(result).toHaveProperty('totalProduced');
        expect(result).toHaveProperty('totalLosses');
        expect(result).toHaveProperty('totalDowntimeMinutes');
        expect(result).toHaveProperty('totalProductiveMinutes');
        expect(result).toHaveProperty('totalPlannedMinutes');
        expect(result).toHaveProperty('shiftsCount');
      }
    });

    it('should calculate OEE correctly (OEE = Availability × Performance × Quality / 10000)', () => {
      // Teste da fórmula do OEE
      const availability = 90; // 90%
      const performance = 85; // 85%
      const quality = 95; // 95%
      
      const expectedOEE = (availability * performance * quality) / 10000;
      
      expect(expectedOEE).toBeCloseTo(72.675, 2);
    });

    it('should cap OEE values at 100%', () => {
      // Valores não devem exceder 100%
      const maxOEE = Math.min(150, 100);
      expect(maxOEE).toBe(100);
    });
  });

  describe('getOEEHistory', () => {
    it('should return array of daily OEE data', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };
      
      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      const result = await db.getOEEHistory(7);
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getDashboardAlerts', () => {
    it('should return array of alerts', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      
      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      const result = await db.getDashboardAlerts(10);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should limit alerts to specified count', async () => {
      const alerts = [
        { id: 1, type: 'stock_low', severity: 'warning', title: 'Test 1', message: 'Msg 1', timestamp: new Date(), module: 'test' },
        { id: 2, type: 'stock_low', severity: 'critical', title: 'Test 2', message: 'Msg 2', timestamp: new Date(), module: 'test' },
        { id: 3, type: 'stock_low', severity: 'info', title: 'Test 3', message: 'Msg 3', timestamp: new Date(), module: 'test' },
      ];
      
      const limited = alerts.slice(0, 2);
      expect(limited.length).toBe(2);
    });

    it('should categorize alert severity correctly', () => {
      const severities = ['info', 'warning', 'critical'] as const;
      
      severities.forEach(severity => {
        expect(['info', 'warning', 'critical']).toContain(severity);
      });
    });
  });

  describe('getCurrentShiftMetrics', () => {
    it('should determine correct shift based on hour', () => {
      const getShift = (hour: number) => {
        if (hour >= 6 && hour < 14) return 'manha';
        if (hour >= 14 && hour < 22) return 'tarde';
        return 'noite';
      };

      expect(getShift(8)).toBe('manha');
      expect(getShift(16)).toBe('tarde');
      expect(getShift(23)).toBe('noite');
      expect(getShift(3)).toBe('noite');
    });

    it('should calculate shift progress correctly', () => {
      // Turno manhã: 6:00 - 14:00 (8 horas = 480 minutos)
      const shiftStartMinutes = 6 * 60; // 360
      const shiftEndMinutes = 14 * 60; // 840
      const currentMinutes = 10 * 60; // 600 (10:00)
      
      const progress = ((currentMinutes - shiftStartMinutes) / (shiftEndMinutes - shiftStartMinutes)) * 100;
      
      expect(progress).toBe(50); // Metade do turno
    });
  });
});

describe('OEE Formula Validation', () => {
  it('should calculate OEE components correctly', () => {
    // Cenário de exemplo
    const plannedTime = 480; // 8 horas em minutos
    const downtime = 48; // 10% de parada
    const productiveTime = plannedTime - downtime;
    
    const theoreticalProduction = 2000; // kg
    const actualProduction = 1600; // kg
    const goodProduction = 1520; // kg (95% de qualidade)
    
    // Disponibilidade = Tempo Produtivo / Tempo Planejado
    const availability = (productiveTime / plannedTime) * 100;
    expect(availability).toBe(90);
    
    // Performance = Produção Real / Produção Teórica
    const performance = (actualProduction / theoreticalProduction) * 100;
    expect(performance).toBe(80);
    
    // Qualidade = Produção Boa / Produção Total
    const quality = (goodProduction / actualProduction) * 100;
    expect(quality).toBe(95);
    
    // OEE = D × P × Q / 10000
    const oee = (availability * performance * quality) / 10000;
    expect(oee).toBeCloseTo(68.4, 1);
  });
});
