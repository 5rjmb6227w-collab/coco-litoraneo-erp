/**
 * Attachment Triggers - Processamento automático de anexos nas mutations
 * Bloco 6/9 - Integração com MultimodalService
 */

import { createAttachmentSource } from "./multimodalService";

// ============================================================================
// TIPOS
// ============================================================================

export type AttachmentType = "image" | "pdf" | "document" | "video" | "audio";

interface AttachmentInfo {
  url: string;
  type: AttachmentType;
  filename?: string;
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Detecta o tipo de anexo baseado na URL ou extensão
 */
export function detectAttachmentType(url: string): AttachmentType {
  const lowercaseUrl = url.toLowerCase();
  
  // Imagens
  if (/\.(jpg|jpeg|png|gif|webp|bmp|tiff)(\?|$)/i.test(lowercaseUrl)) {
    return "image";
  }
  
  // PDFs
  if (/\.pdf(\?|$)/i.test(lowercaseUrl)) {
    return "pdf";
  }
  
  // Documentos
  if (/\.(doc|docx|xls|xlsx|txt|csv)(\?|$)/i.test(lowercaseUrl)) {
    return "document";
  }
  
  // Vídeos
  if (/\.(mp4|avi|mov|wmv|webm)(\?|$)/i.test(lowercaseUrl)) {
    return "video";
  }
  
  // Áudios
  if (/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(lowercaseUrl)) {
    return "audio";
  }
  
  // Default para imagem (mais comum em laudos)
  return "image";
}

/**
 * Extrai anexos de um objeto (suporta múltiplos formatos)
 */
export function extractAttachments(data: Record<string, unknown>): AttachmentInfo[] {
  const attachments: AttachmentInfo[] = [];
  
  // Campos comuns de anexos
  const attachmentFields = [
    "attachmentUrl",
    "photoUrl",
    "imageUrl",
    "documentUrl",
    "fileUrl",
    "laudoUrl",
    "reportUrl",
    "evidenceUrl",
  ];
  
  for (const field of attachmentFields) {
    const value = data[field];
    if (typeof value === "string" && value.startsWith("http")) {
      attachments.push({
        url: value,
        type: detectAttachmentType(value),
        filename: value.split("/").pop()?.split("?")[0],
      });
    }
  }
  
  // Suporte para array de anexos
  const attachmentsArray = data.attachments || data.files || data.photos;
  if (Array.isArray(attachmentsArray)) {
    for (const item of attachmentsArray) {
      if (typeof item === "string" && item.startsWith("http")) {
        attachments.push({
          url: item,
          type: detectAttachmentType(item),
        });
      } else if (typeof item === "object" && item !== null) {
        const url = (item as Record<string, unknown>).url || (item as Record<string, unknown>).fileUrl;
        if (typeof url === "string" && url.startsWith("http")) {
          attachments.push({
            url,
            type: detectAttachmentType(url),
            filename: (item as Record<string, unknown>).filename as string | undefined,
          });
        }
      }
    }
  }
  
  return attachments;
}

// ============================================================================
// TRIGGERS PARA MUTATIONS
// ============================================================================

/**
 * Trigger para Non-Conformities (NCs)
 * Processa laudos de qualidade, fotos de evidências
 */
export async function triggerNCAttachmentProcessing(params: {
  ncId: number;
  ncCode: string;
  category: string;
  attachmentUrl?: string;
  photoUrl?: string;
  evidenceUrl?: string;
}): Promise<number[]> {
  const sourceIds: number[] = [];
  
  const attachments = extractAttachments(params as Record<string, unknown>);
  
  for (const attachment of attachments) {
    const sourceId = await createAttachmentSource({
      entityType: "non_conformity",
      entityId: params.ncId,
      label: `NC ${params.ncCode} - ${params.category} - Evidência`,
      attachmentUrl: attachment.url,
      attachmentType: attachment.type,
      url: `/qualidade/nao-conformidades?id=${params.ncId}`,
    });
    
    if (sourceId) {
      sourceIds.push(sourceId);
      console.log(`[AttachmentTrigger] NC ${params.ncCode}: Anexo agendado para processamento (sourceId: ${sourceId})`);
    }
  }
  
  return sourceIds;
}

/**
 * Trigger para Production Issues (Problemas de Produção)
 * Processa fotos de problemas, laudos técnicos
 */
export async function triggerProductionIssueAttachmentProcessing(params: {
  issueId: number;
  issueType: string;
  description: string;
  attachmentUrl?: string;
  photoUrl?: string;
}): Promise<number[]> {
  const sourceIds: number[] = [];
  
  const attachments = extractAttachments(params as Record<string, unknown>);
  
  for (const attachment of attachments) {
    const sourceId = await createAttachmentSource({
      entityType: "production_issue",
      entityId: params.issueId,
      label: `Problema de Produção #${params.issueId} - ${params.issueType}`,
      attachmentUrl: attachment.url,
      attachmentType: attachment.type,
      url: `/producao/problemas?id=${params.issueId}`,
    });
    
    if (sourceId) {
      sourceIds.push(sourceId);
      console.log(`[AttachmentTrigger] Issue ${params.issueId}: Anexo agendado para processamento`);
    }
  }
  
  return sourceIds;
}

/**
 * Trigger para Quality Analyses (Análises de Qualidade)
 * Processa laudos laboratoriais, certificados
 */
export async function triggerQualityAnalysisAttachmentProcessing(params: {
  analysisId: number;
  analysisType: string;
  lotNumber?: string;
  attachmentUrl?: string;
  laudoUrl?: string;
  reportUrl?: string;
}): Promise<number[]> {
  const sourceIds: number[] = [];
  
  const attachments = extractAttachments(params as Record<string, unknown>);
  
  for (const attachment of attachments) {
    const label = params.lotNumber
      ? `Análise de Qualidade - Lote ${params.lotNumber} - ${params.analysisType}`
      : `Análise de Qualidade #${params.analysisId} - ${params.analysisType}`;
    
    const sourceId = await createAttachmentSource({
      entityType: "quality_analysis",
      entityId: params.analysisId,
      label,
      attachmentUrl: attachment.url,
      attachmentType: attachment.type,
      url: `/qualidade/analises?id=${params.analysisId}`,
    });
    
    if (sourceId) {
      sourceIds.push(sourceId);
      console.log(`[AttachmentTrigger] Analysis ${params.analysisId}: Anexo agendado para processamento`);
    }
  }
  
  return sourceIds;
}

/**
 * Trigger para Purchase Requests (Solicitações de Compra)
 * Processa cotações, notas fiscais
 */
export async function triggerPurchaseAttachmentProcessing(params: {
  requestId: number;
  requestCode?: string;
  attachmentUrl?: string;
  quotationUrl?: string;
  invoiceUrl?: string;
}): Promise<number[]> {
  const sourceIds: number[] = [];
  
  const attachments = extractAttachments(params as Record<string, unknown>);
  
  for (const attachment of attachments) {
    const sourceId = await createAttachmentSource({
      entityType: "purchase_request",
      entityId: params.requestId,
      label: `Compra ${params.requestCode || `#${params.requestId}`} - Documento`,
      attachmentUrl: attachment.url,
      attachmentType: attachment.type,
      url: `/compras?id=${params.requestId}`,
    });
    
    if (sourceId) {
      sourceIds.push(sourceId);
      console.log(`[AttachmentTrigger] Purchase ${params.requestId}: Anexo agendado para processamento`);
    }
  }
  
  return sourceIds;
}

/**
 * Trigger para Coconut Loads (Cargas de Coco)
 * Processa tickets de pesagem, fotos de carga
 */
export async function triggerCoconutLoadAttachmentProcessing(params: {
  loadId: number;
  loadCode: string;
  producerName: string;
  attachmentUrl?: string;
  ticketUrl?: string;
  photoUrl?: string;
}): Promise<number[]> {
  const sourceIds: number[] = [];
  
  const attachments = extractAttachments(params as Record<string, unknown>);
  
  for (const attachment of attachments) {
    const sourceId = await createAttachmentSource({
      entityType: "coconut_load",
      entityId: params.loadId,
      label: `Carga ${params.loadCode} - ${params.producerName}`,
      attachmentUrl: attachment.url,
      attachmentType: attachment.type,
      url: `/recebimento?id=${params.loadId}`,
    });
    
    if (sourceId) {
      sourceIds.push(sourceId);
      console.log(`[AttachmentTrigger] Load ${params.loadCode}: Anexo agendado para processamento`);
    }
  }
  
  return sourceIds;
}

/**
 * Trigger para Financial Entries (Lançamentos Financeiros)
 * Processa comprovantes, notas fiscais
 */
export async function triggerFinancialAttachmentProcessing(params: {
  entryId: number;
  entryType: string;
  description: string;
  attachmentUrl?: string;
  receiptUrl?: string;
  invoiceUrl?: string;
}): Promise<number[]> {
  const sourceIds: number[] = [];
  
  const attachments = extractAttachments(params as Record<string, unknown>);
  
  for (const attachment of attachments) {
    const sourceId = await createAttachmentSource({
      entityType: "financial_entry",
      entityId: params.entryId,
      label: `${params.entryType} #${params.entryId} - ${params.description.slice(0, 50)}`,
      attachmentUrl: attachment.url,
      attachmentType: attachment.type,
      url: `/financeiro?id=${params.entryId}`,
    });
    
    if (sourceId) {
      sourceIds.push(sourceId);
      console.log(`[AttachmentTrigger] Financial ${params.entryId}: Anexo agendado para processamento`);
    }
  }
  
  return sourceIds;
}

/**
 * Trigger genérico para qualquer entidade com anexo
 */
export async function triggerGenericAttachmentProcessing(params: {
  entityType: string;
  entityId: number;
  label: string;
  url?: string;
  attachmentUrl: string;
}): Promise<number | null> {
  const attachmentType = detectAttachmentType(params.attachmentUrl);
  
  const sourceId = await createAttachmentSource({
    entityType: params.entityType,
    entityId: params.entityId,
    label: params.label,
    attachmentUrl: params.attachmentUrl,
    attachmentType,
    url: params.url,
  });
  
  if (sourceId) {
    console.log(`[AttachmentTrigger] ${params.entityType} ${params.entityId}: Anexo agendado para processamento`);
  }
  
  return sourceId;
}

// ============================================================================
// FUNÇÃO PRINCIPAL DE INTEGRAÇÃO
// ============================================================================

/**
 * Processa anexos de qualquer mutation automaticamente
 * Chamado após insert/update de entidades com anexos
 */
export async function processEntityAttachments(
  entityType: string,
  entityId: number,
  data: Record<string, unknown>,
  label: string,
  url?: string
): Promise<number[]> {
  const attachments = extractAttachments(data);
  
  if (attachments.length === 0) {
    return [];
  }
  
  const sourceIds: number[] = [];
  
  for (const attachment of attachments) {
    const sourceId = await createAttachmentSource({
      entityType,
      entityId,
      label,
      attachmentUrl: attachment.url,
      attachmentType: attachment.type,
      url,
    });
    
    if (sourceId) {
      sourceIds.push(sourceId);
    }
  }
  
  console.log(`[AttachmentTrigger] ${entityType} ${entityId}: ${sourceIds.length} anexo(s) agendado(s) para processamento`);
  
  return sourceIds;
}
