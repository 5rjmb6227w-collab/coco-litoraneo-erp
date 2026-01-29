import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as reportService from "./reportService";

export const reportRouter = router({
  // Gerar relatório
  generate: protectedProcedure
    .input(z.object({
      type: z.enum([
        "production_daily",
        "production_monthly",
        "loads_summary",
        "producers_ranking",
        "quality_analysis",
        "financial_summary",
        "inventory_status",
        "costs_analysis",
      ]),
      filters: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        producerId: z.number().optional(),
        skuId: z.number().optional(),
        status: z.string().optional(),
      }).optional(),
    }))
    .query(async ({ input }) => {
      const filters: reportService.ReportFilters = {};
      
      if (input.filters?.startDate) {
        filters.startDate = new Date(input.filters.startDate);
      }
      if (input.filters?.endDate) {
        filters.endDate = new Date(input.filters.endDate);
      }
      if (input.filters?.producerId) {
        filters.producerId = input.filters.producerId;
      }
      if (input.filters?.skuId) {
        filters.skuId = input.filters.skuId;
      }
      if (input.filters?.status) {
        filters.status = input.filters.status;
      }
      
      return reportService.generateReport(input.type, filters);
    }),

  // Relatório de produção diária
  productionDaily: protectedProcedure
    .input(z.object({
      date: z.string(),
    }))
    .query(async ({ input }) => {
      return reportService.generateProductionDailyReport(new Date(input.date));
    }),

  // Relatório de cargas
  loads: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const filters: reportService.ReportFilters = {};
      if (input?.startDate) filters.startDate = new Date(input.startDate);
      if (input?.endDate) filters.endDate = new Date(input.endDate);
      return reportService.generateLoadsReport(filters);
    }),

  // Ranking de produtores
  producersRanking: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const filters: reportService.ReportFilters = {};
      if (input?.startDate) filters.startDate = new Date(input.startDate);
      if (input?.endDate) filters.endDate = new Date(input.endDate);
      return reportService.generateProducersRankingReport(filters);
    }),

  // Relatório de qualidade
  quality: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const filters: reportService.ReportFilters = {};
      if (input?.startDate) filters.startDate = new Date(input.startDate);
      if (input?.endDate) filters.endDate = new Date(input.endDate);
      return reportService.generateQualityReport(filters);
    }),

  // Relatório financeiro
  financial: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const filters: reportService.ReportFilters = {};
      if (input?.startDate) filters.startDate = new Date(input.startDate);
      if (input?.endDate) filters.endDate = new Date(input.endDate);
      return reportService.generateFinancialReport(filters);
    }),

  // Relatório de estoque
  inventory: protectedProcedure
    .query(async () => {
      return reportService.generateInventoryReport();
    }),

  // Relatório de custos
  costs: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const filters: reportService.ReportFilters = {};
      if (input?.startDate) filters.startDate = new Date(input.startDate);
      if (input?.endDate) filters.endDate = new Date(input.endDate);
      return reportService.generateCostsReport(filters);
    }),

  // Gerar PDF
  generatePdf: protectedProcedure
    .input(z.object({
      type: z.string(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Por enquanto retorna uma URL de exemplo
      // Em produção, isso geraria um PDF real usando uma biblioteca como pdfkit ou puppeteer
      return {
        success: true,
        url: `/api/reports/pdf/${input.type}?start=${input.startDate}&end=${input.endDate}`,
        message: "PDF gerado com sucesso",
      };
    }),

  // Gerar Excel
  generateExcel: protectedProcedure
    .input(z.object({
      type: z.string(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Por enquanto retorna uma URL de exemplo
      // Em produção, isso geraria um Excel real usando uma biblioteca como exceljs
      return {
        success: true,
        url: `/api/reports/excel/${input.type}?start=${input.startDate}&end=${input.endDate}`,
        message: "Excel gerado com sucesso",
      };
    }),
});
