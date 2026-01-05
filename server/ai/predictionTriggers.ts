/**
 * Prediction Triggers - Dispara previsões automáticas em eventos do ERP
 */

import { generatePrediction } from "./mlProvider";
import { getDb } from "../db";
import { aiInsights, aiAlerts } from "../../drizzle/schema";

export async function triggerDemandForecastOnProduction(
  skuId: number,
  quantity: number,
  shift: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const inputData = {
      sku_id: skuId,
      current_quantity: quantity,
      current_shift: shift,
      timestamp: new Date().toISOString(),
    };

    const prediction = await generatePrediction({
      modelType: "demand_forecast",
      module: "production",
      entityType: "sku",
      entityId: skuId,
      period: "30days",
      historicalData: inputData,
      confidenceLevel: "high",
    });

    const output = prediction.prediction as any;
    
    if (output.predictedDemand && output.confidence > 0.85) {
      const impactValue = output.predictedDemand * 10;
      
      await db.insert(aiInsights).values({
        insightType: "demand_forecast",
        module: "production",
        title: `Previsão de Demanda: SKU ${skuId}`,
        summary: `Demanda prevista: ${output.predictedDemand} unidades nos próximos 30 dias. Confiança: ${Math.round(output.confidence * 100)}%`,
        severity: output.predictedDemand > 1000 ? "critical" : "warning",
        status: "active",
        details: { prediction: output, skuId, impactValue },
        entityType: "sku",
        entityId: skuId,
        generatedAt: new Date(),
      });
    }

    console.log(`[ML] Demand forecast for SKU ${skuId}: ${prediction.accuracyEstimate}`);
  } catch (error) {
    console.error("[ML] Error in demand forecast:", error);
  }
}

export async function triggerInventoryForecastOnMovement(
  warehouseItemId: number,
  currentStock: number,
  minimumStock: number,
  itemName: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const inputData = {
      warehouse_item_id: warehouseItemId,
      current_stock: currentStock,
      minimum_stock: minimumStock,
      timestamp: new Date().toISOString(),
    };

    const prediction = await generatePrediction({
      modelType: "inventory_forecast",
      module: "warehouse",
      entityType: "warehouse_item",
      entityId: warehouseItemId,
      period: "7days",
      historicalData: inputData,
      confidenceLevel: "medium",
    });

    const output = prediction.prediction as any;
    
    if (output.daysUntilStockout && output.daysUntilStockout < 7) {
      const impactValue = minimumStock * 5;
      
      await db.insert(aiInsights).values({
        insightType: "inventory_alert",
        module: "warehouse",
        title: `Previsão: Estoque de ${itemName} esgota em ${output.daysUntilStockout} dias`,
        summary: `Com produção atual, estoque esgota em ${output.daysUntilStockout} dias. Impacto: R$${impactValue.toLocaleString()} em perdas. Confiança: ${Math.round(output.confidence * 100)}%`,
        severity: output.daysUntilStockout < 3 ? "critical" : "warning",
        status: "active",
        details: { prediction: output, warehouseItemId, currentStock, minimumStock, impactValue },
        entityType: "warehouse_item",
        entityId: warehouseItemId,
        generatedAt: new Date(),
      });

      if (output.daysUntilStockout < 3) {
        await db.insert(aiAlerts).values({
          insightId: null,
          alertType: "inventory_critical",
          channel: "in_app",
          recipientUserId: null,
          recipientEmail: null,
          title: `URGENTE: Estoque crítico - ${itemName}`,
          message: `Estoque de ${itemName} esgota em ${output.daysUntilStockout} dias. Ação imediata necessária.`,
          status: "pending",
        });
      }
    }

    console.log(`[ML] Inventory forecast for item ${warehouseItemId}: ${output.daysUntilStockout} days`);
  } catch (error) {
    console.error("[ML] Error in inventory forecast:", error);
  }
}

export async function triggerQualityPrediction(
  productionLineId: number,
  defectRate: number
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const inputData = {
      production_line_id: productionLineId,
      current_defect_rate: defectRate,
      timestamp: new Date().toISOString(),
    };

    const prediction = await generatePrediction({
      modelType: "quality_prediction",
      module: "quality",
      entityType: "production_line",
      entityId: productionLineId,
      period: "7days",
      historicalData: inputData,
      confidenceLevel: "high",
    });

    const output = prediction.prediction as any;
    
    if (output.predictedDefectRate && output.predictedDefectRate > 0.05) {
      await db.insert(aiInsights).values({
        insightType: "quality_alert",
        module: "quality",
        title: `Alerta de Qualidade: Linha ${productionLineId}`,
        summary: `Taxa de defeitos prevista: ${Math.round(output.predictedDefectRate * 100)}% nos próximos 7 dias. Confiança: ${Math.round(output.confidence * 100)}%`,
        severity: output.predictedDefectRate > 0.1 ? "critical" : "warning",
        status: "active",
        details: { prediction: output, productionLineId, defectRate },
        entityType: "production_line",
        entityId: productionLineId,
        generatedAt: new Date(),
      });
    }

    console.log(`[ML] Quality prediction for line ${productionLineId}: ${output.predictedDefectRate}`);
  } catch (error) {
    console.error("[ML] Error in quality prediction:", error);
  }
}
