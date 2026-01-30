/**
 * Utilitário para exportação de relatórios em PDF
 * Suporta diferentes tipos de dashboards e formatação profissional
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Cores do tema Coco Litorâneo
const COLORS = {
  primary: '#8B7355',
  secondary: '#6B5A45',
  text: '#333333',
  textLight: '#666666',
  border: '#E5E5E5',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

// Tipos de dados para os relatórios
export interface DashboardMetrics {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
}

export interface TableData {
  headers: string[];
  rows: (string | number)[][];
}

export interface ChartData {
  title: string;
  type: 'bar' | 'line' | 'pie';
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
}

export interface PDFReportConfig {
  title: string;
  subtitle?: string;
  dateRange?: string;
  metrics?: DashboardMetrics[];
  tables?: { title: string; data: TableData }[];
  charts?: ChartData[];
  notes?: string[];
  footer?: string;
}

// Função auxiliar para adicionar cabeçalho
function addHeader(doc: jsPDF, config: PDFReportConfig) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Logo/Título da empresa
  doc.setFillColor(139, 115, 85); // primary color
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Emoji de coco (usando texto)
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('🥥', 15, 22);
  
  // Nome da empresa
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Coco Litorâneo', 35, 18);
  
  // Subtítulo
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Gestão Integrada', 35, 26);
  
  // Data de geração
  doc.setFontSize(8);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 15, 18, { align: 'right' });
  
  // Título do relatório
  doc.setTextColor(51, 51, 51);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(config.title, 15, 50);
  
  // Subtítulo do relatório
  if (config.subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(102, 102, 102);
    doc.text(config.subtitle, 15, 58);
  }
  
  // Período
  if (config.dateRange) {
    doc.setFontSize(9);
    doc.setTextColor(102, 102, 102);
    doc.text(`Período: ${config.dateRange}`, pageWidth - 15, 50, { align: 'right' });
  }
  
  return 65; // Retorna a posição Y após o cabeçalho
}

// Função auxiliar para adicionar métricas
function addMetrics(doc: jsPDF, metrics: DashboardMetrics[], startY: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const cardWidth = (pageWidth - 40) / 3;
  const cardHeight = 35;
  let y = startY;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 51, 51);
  doc.text('Indicadores Principais', 15, y);
  y += 10;
  
  metrics.forEach((metric, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = 15 + col * (cardWidth + 5);
    const cardY = y + row * (cardHeight + 5);
    
    // Card background
    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(229, 229, 229);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 3, 3, 'FD');
    
    // Título da métrica
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(102, 102, 102);
    doc.text(metric.title, x + 5, cardY + 10);
    
    // Valor
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 51, 51);
    const valueText = `${metric.value}${metric.unit ? ' ' + metric.unit : ''}`;
    doc.text(valueText, x + 5, cardY + 25);
    
    // Trend indicator
    if (metric.trend && metric.trendValue) {
      doc.setFontSize(8);
      if (metric.trend === 'up') {
        doc.setTextColor(34, 197, 94); // green
        doc.text(`↑ ${metric.trendValue}`, x + cardWidth - 25, cardY + 25);
      } else if (metric.trend === 'down') {
        doc.setTextColor(239, 68, 68); // red
        doc.text(`↓ ${metric.trendValue}`, x + cardWidth - 25, cardY + 25);
      } else {
        doc.setTextColor(102, 102, 102);
        doc.text(`→ ${metric.trendValue}`, x + cardWidth - 25, cardY + 25);
      }
    }
  });
  
  const rows = Math.ceil(metrics.length / 3);
  return y + rows * (cardHeight + 5) + 10;
}

// Função auxiliar para adicionar tabelas
function addTable(doc: jsPDF, title: string, tableData: TableData, startY: number): number {
  let y = startY;
  
  // Título da tabela
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 51, 51);
  doc.text(title, 15, y);
  y += 5;
  
  // Tabela usando autoTable
  autoTable(doc, {
    startY: y,
    head: [tableData.headers],
    body: tableData.rows,
    theme: 'striped',
    headStyles: {
      fillColor: [139, 115, 85],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 51, 51],
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto',
  });
  
  // Retorna a posição Y após a tabela
  return (doc as any).lastAutoTable.finalY + 15;
}

// Função auxiliar para adicionar notas
function addNotes(doc: jsPDF, notes: string[], startY: number): number {
  let y = startY;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 51, 51);
  doc.text('Observações', 15, y);
  y += 8;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 102, 102);
  
  notes.forEach((note, index) => {
    doc.text(`• ${note}`, 15, y);
    y += 6;
  });
  
  return y + 5;
}

// Função auxiliar para adicionar rodapé
function addFooter(doc: jsPDF, text?: string) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Linha separadora
    doc.setDrawColor(229, 229, 229);
    doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
    
    // Texto do rodapé
    doc.setFontSize(8);
    doc.setTextColor(102, 102, 102);
    doc.text(text || 'Coco Litorâneo - Sistema de Gestão Integrada', 15, pageHeight - 12);
    
    // Número da página
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 15, pageHeight - 12, { align: 'right' });
  }
}

// Função principal para gerar PDF
export function generatePDFReport(config: PDFReportConfig): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  let currentY = addHeader(doc, config);
  
  // Adicionar métricas se existirem
  if (config.metrics && config.metrics.length > 0) {
    currentY = addMetrics(doc, config.metrics, currentY);
  }
  
  // Adicionar tabelas se existirem
  if (config.tables && config.tables.length > 0) {
    config.tables.forEach((table) => {
      // Verificar se precisa de nova página
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }
      currentY = addTable(doc, table.title, table.data, currentY);
    });
  }
  
  // Adicionar notas se existirem
  if (config.notes && config.notes.length > 0) {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    currentY = addNotes(doc, config.notes, currentY);
  }
  
  // Adicionar rodapé em todas as páginas
  addFooter(doc, config.footer);
  
  return doc;
}

// Função para download do PDF
export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(`${filename}.pdf`);
}

// Funções específicas para cada tipo de dashboard

export function generateCEODashboardPDF(data: {
  oee: number;
  financialMetrics: {
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
  };
  productionData: {
    totalProduction: number;
    loadsReceived: number;
    avgQuality: string;
  };
  topProducers: { name: string; loads: number; quality: string }[];
  dateRange: string;
}) {
  const config: PDFReportConfig = {
    title: 'Dashboard CEO',
    subtitle: 'Visão Estratégica do Negócio',
    dateRange: data.dateRange,
    metrics: [
      { title: 'OEE Geral', value: data.oee.toFixed(1), unit: '%', trend: data.oee >= 85 ? 'up' : 'down' },
      { title: 'Receita', value: `R$ ${data.financialMetrics.revenue.toLocaleString('pt-BR')}` },
      { title: 'Despesas', value: `R$ ${data.financialMetrics.expenses.toLocaleString('pt-BR')}` },
      { title: 'Lucro', value: `R$ ${data.financialMetrics.profit.toLocaleString('pt-BR')}`, trend: data.financialMetrics.profit > 0 ? 'up' : 'down' },
      { title: 'Margem', value: data.financialMetrics.margin.toFixed(1), unit: '%' },
      { title: 'Produção Total', value: data.productionData.totalProduction.toLocaleString('pt-BR'), unit: 'kg' },
    ],
    tables: [
      {
        title: 'Top Produtores',
        data: {
          headers: ['Produtor', 'Cargas', 'Qualidade Média'],
          rows: data.topProducers.map(p => [p.name, p.loads, p.quality]),
        },
      },
    ],
    notes: [
      `Total de cargas recebidas: ${data.productionData.loadsReceived}`,
      `Qualidade média das cargas: ${data.productionData.avgQuality}`,
    ],
  };
  
  return generatePDFReport(config);
}

export function generateManagerDashboardPDF(data: {
  oee: number;
  oeeHistory: { date: string; value: number }[];
  productionLines: { name: string; status: string; efficiency: number }[];
  alerts: { type: string; message: string; priority: string }[];
  dateRange: string;
}) {
  const config: PDFReportConfig = {
    title: 'Dashboard Gerente',
    subtitle: 'Visão Operacional',
    dateRange: data.dateRange,
    metrics: [
      { title: 'OEE Atual', value: data.oee.toFixed(1), unit: '%' },
      { title: 'Linhas Ativas', value: data.productionLines.filter(l => l.status === 'ativo').length },
      { title: 'Alertas Pendentes', value: data.alerts.length, trend: data.alerts.length > 5 ? 'down' : 'up' },
    ],
    tables: [
      {
        title: 'Status das Linhas de Produção',
        data: {
          headers: ['Linha', 'Status', 'Eficiência (%)'],
          rows: data.productionLines.map(l => [l.name, l.status, l.efficiency.toFixed(1)]),
        },
      },
      {
        title: 'Alertas Ativos',
        data: {
          headers: ['Tipo', 'Mensagem', 'Prioridade'],
          rows: data.alerts.map(a => [a.type, a.message, a.priority]),
        },
      },
    ],
    notes: [
      'Relatório gerado automaticamente pelo sistema',
      'Dados em tempo real do chão de fábrica',
    ],
  };
  
  return generatePDFReport(config);
}

export function generateOperatorDashboardPDF(data: {
  currentShift: string;
  shiftProgress: number;
  tasksCompleted: number;
  totalTasks: number;
  productionOrders: { code: string; product: string; quantity: number; status: string }[];
  dateRange: string;
}) {
  const config: PDFReportConfig = {
    title: 'Dashboard Operador',
    subtitle: `Turno: ${data.currentShift}`,
    dateRange: data.dateRange,
    metrics: [
      { title: 'Progresso do Turno', value: data.shiftProgress.toFixed(0), unit: '%' },
      { title: 'Tarefas Concluídas', value: `${data.tasksCompleted}/${data.totalTasks}` },
      { title: 'Taxa de Conclusão', value: ((data.tasksCompleted / data.totalTasks) * 100).toFixed(0), unit: '%' },
    ],
    tables: [
      {
        title: 'Ordens de Produção do Turno',
        data: {
          headers: ['Código', 'Produto', 'Quantidade', 'Status'],
          rows: data.productionOrders.map(o => [o.code, o.product, o.quantity, o.status]),
        },
      },
    ],
  };
  
  return generatePDFReport(config);
}

export function generateQualityDashboardPDF(data: {
  approvalRate: number;
  totalAnalyses: number;
  openNCs: number;
  avgResolutionTime: number;
  gradeDistribution: { grade: string; count: number; percentage: number }[];
  producerScores: { name: string; score: number; loads: number }[];
  dateRange: string;
}) {
  const config: PDFReportConfig = {
    title: 'Dashboard Qualidade',
    subtitle: 'Análise de Qualidade e Conformidade',
    dateRange: data.dateRange,
    metrics: [
      { title: 'Taxa de Aprovação', value: data.approvalRate.toFixed(1), unit: '%', trend: data.approvalRate >= 95 ? 'up' : 'down' },
      { title: 'Total de Análises', value: data.totalAnalyses },
      { title: 'NCs Abertas', value: data.openNCs, trend: data.openNCs === 0 ? 'up' : 'down' },
      { title: 'Tempo Médio Resolução', value: data.avgResolutionTime.toFixed(1), unit: 'dias' },
    ],
    tables: [
      {
        title: 'Distribuição por Grau de Qualidade',
        data: {
          headers: ['Grau', 'Quantidade', 'Percentual (%)'],
          rows: data.gradeDistribution.map(g => [g.grade, g.count, g.percentage.toFixed(1)]),
        },
      },
      {
        title: 'Ranking de Produtores por Qualidade',
        data: {
          headers: ['Produtor', 'Score (%)', 'Cargas'],
          rows: data.producerScores.slice(0, 10).map(p => [p.name, p.score.toFixed(1), p.loads]),
        },
      },
    ],
    notes: [
      'Score de qualidade baseado na taxa de aprovação das cargas',
      'NCs = Não Conformidades registradas no período',
    ],
  };
  
  return generatePDFReport(config);
}
