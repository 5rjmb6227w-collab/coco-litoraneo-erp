/**
 * PRODUÇÃO EXPANDIDA
 * 
 * Página completa de gestão de produção com:
 * - Ordens de Produção (OP)
 * - Kanban de Produção
 * - Metas de Produção
 * - Checklists de Turno
 * - Controle de Perdas e Reprocesso
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ClipboardList, 
  Target, 
  AlertTriangle, 
  CheckSquare,
  Play,
  Pause,
  RotateCcw,
  Package,
  Clock,
  TrendingUp,
  AlertCircle,
  Info
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ProductionExpanded() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('kanban');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Produção Expandida</h1>
            <p className="text-muted-foreground">
              Gestão completa de ordens de produção, metas e controle de qualidade
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              Turno Atual
            </Button>
            <Button>
              <Play className="mr-2 h-4 w-4" />
              Nova OP
            </Button>
          </div>
        </div>

        {/* Aviso de Configuração Pendente */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Configuração Necessária</AlertTitle>
          <AlertDescription>
            Para utilizar todas as funcionalidades de produção expandida, configure:
            <ul className="list-disc list-inside mt-2 text-sm">
              <li>Cadastre os equipamentos em Admin → Equipamentos</li>
              <li>Defina os SKUs de produtos em Produção → SKUs</li>
              <li>Configure os templates de checklist em Admin → Checklists</li>
              <li>Defina as metas de produção para cada turno</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Tabs de Funcionalidades */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="kanban">
              <ClipboardList className="mr-2 h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="ordens">
              <Package className="mr-2 h-4 w-4" />
              Ordens
            </TabsTrigger>
            <TabsTrigger value="metas">
              <Target className="mr-2 h-4 w-4" />
              Metas
            </TabsTrigger>
            <TabsTrigger value="checklist">
              <CheckSquare className="mr-2 h-4 w-4" />
              Checklist
            </TabsTrigger>
            <TabsTrigger value="perdas">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Perdas
            </TabsTrigger>
          </TabsList>

          {/* KANBAN */}
          <TabsContent value="kanban" className="space-y-4">
            <KanbanBoard />
          </TabsContent>

          {/* ORDENS DE PRODUÇÃO */}
          <TabsContent value="ordens" className="space-y-4">
            <OrdensProducao />
          </TabsContent>

          {/* METAS */}
          <TabsContent value="metas" className="space-y-4">
            <MetasProducao />
          </TabsContent>

          {/* CHECKLIST */}
          <TabsContent value="checklist" className="space-y-4">
            <ChecklistTurno />
          </TabsContent>

          {/* PERDAS E REPROCESSO */}
          <TabsContent value="perdas" className="space-y-4">
            <PerdasReprocesso />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ============================================================================
// COMPONENTE: KANBAN BOARD
// ============================================================================
function KanbanBoard() {
  const columns = [
    { id: 'aguardando', title: 'Aguardando', color: 'bg-gray-100' },
    { id: 'em_producao', title: 'Em Produção', color: 'bg-blue-100' },
    { id: 'parado', title: 'Parado', color: 'bg-yellow-100' },
    { id: 'finalizado', title: 'Finalizado', color: 'bg-green-100' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Kanban de Produção</h2>
        <Badge variant="outline">
          <AlertCircle className="mr-1 h-3 w-3" />
          Sem ordens cadastradas
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {columns.map((column) => (
          <div key={column.id} className={`${column.color} rounded-lg p-4 min-h-[400px]`}>
            <h3 className="font-medium mb-4 flex items-center justify-between">
              {column.title}
              <Badge variant="secondary">0</Badge>
            </h3>
            
            <div className="space-y-2">
              {/* Placeholder para cards de OP */}
              <div className="bg-white rounded-lg p-3 border-2 border-dashed border-gray-300 text-center text-muted-foreground text-sm">
                Arraste ordens aqui ou crie uma nova OP
              </div>
            </div>
          </div>
        ))}
      </div>

      <Alert variant="default" className="bg-blue-50">
        <Info className="h-4 w-4" />
        <AlertTitle>Como usar o Kanban</AlertTitle>
        <AlertDescription>
          1. Crie ordens de produção na aba "Ordens" | 
          2. Arraste os cards entre colunas para atualizar status | 
          3. Clique em um card para ver detalhes e registrar apontamentos
        </AlertDescription>
      </Alert>
    </div>
  );
}

// ============================================================================
// COMPONENTE: ORDENS DE PRODUÇÃO
// ============================================================================
function OrdensProducao() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Ordens de Produção</h2>
        <Button>
          <Play className="mr-2 h-4 w-4" />
          Nova Ordem
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aguardando
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Produção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Finalizadas Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">0</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Ordens</CardTitle>
          <CardDescription>
            Nenhuma ordem de produção cadastrada. Crie a primeira ordem para começar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Nenhuma ordem de produção encontrada</p>
            <p className="text-sm mt-2">
              Clique em "Nova Ordem" para criar a primeira OP
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// COMPONENTE: METAS DE PRODUÇÃO
// ============================================================================
function MetasProducao() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Metas de Produção</h2>
        <Button>
          <Target className="mr-2 h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Meta Diária
              <Badge variant="outline">Não definida</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span>0%</span>
              </div>
              <Progress value={0} />
              <p className="text-xs text-muted-foreground">
                Defina uma meta diária para acompanhar o progresso
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Meta Semanal
              <Badge variant="outline">Não definida</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span>0%</span>
              </div>
              <Progress value={0} />
              <p className="text-xs text-muted-foreground">
                Configure metas semanais para planejamento
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Meta Mensal
              <Badge variant="outline">Não definida</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span>0%</span>
              </div>
              <Progress value={0} />
              <p className="text-xs text-muted-foreground">
                Acompanhe o desempenho mensal da produção
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertTitle>Dica: Metas SMART</AlertTitle>
        <AlertDescription>
          Defina metas Específicas, Mensuráveis, Atingíveis, Relevantes e Temporais.
          O sistema calculará automaticamente o progresso baseado nos apontamentos de produção.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// ============================================================================
// COMPONENTE: CHECKLIST DE TURNO
// ============================================================================
function ChecklistTurno() {
  const checklistItems = [
    { category: 'Limpeza', items: ['Área de produção limpa', 'Equipamentos higienizados', 'Descarte de resíduos'] },
    { category: 'EPI', items: ['Uso de luvas', 'Uso de touca', 'Uso de avental', 'Uso de botas'] },
    { category: 'Segurança', items: ['Extintores verificados', 'Saídas de emergência livres', 'Primeiros socorros disponível'] },
    { category: 'Qualidade', items: ['Calibração de balanças', 'Temperatura dos equipamentos', 'Amostras coletadas'] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Checklist de Turno</h2>
        <div className="flex gap-2">
          <Button variant="outline">
            <Clock className="mr-2 h-4 w-4" />
            Manhã
          </Button>
          <Button variant="outline">
            <Clock className="mr-2 h-4 w-4" />
            Tarde
          </Button>
          <Button variant="outline">
            <Clock className="mr-2 h-4 w-4" />
            Noite
          </Button>
        </div>
      </div>

      <Alert variant="default" className="bg-yellow-50">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Checklist não iniciado</AlertTitle>
        <AlertDescription>
          Selecione um turno e inicie o checklist. Todos os itens devem ser verificados antes do início da produção.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        {checklistItems.map((category) => (
          <Card key={category.category}>
            <CardHeader>
              <CardTitle className="text-lg">{category.category}</CardTitle>
              <CardDescription>
                0 de {category.items.length} itens verificados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {category.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded hover:bg-muted">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: PERDAS E REPROCESSO
// ============================================================================
function PerdasReprocesso() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Controle de Perdas e Reprocesso</h2>
        <div className="flex gap-2">
          <Button variant="outline">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Registrar Perda
          </Button>
          <Button variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Registrar Reprocesso
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Perdas Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">0 kg</div>
            <p className="text-xs text-muted-foreground">0% da produção</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reprocesso Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">0 kg</div>
            <p className="text-xs text-muted-foreground">0% da produção</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Perdas Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 kg</div>
            <p className="text-xs text-muted-foreground">Meta: &lt;2%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo Perdas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 0,00</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Perdas</CardTitle>
          <CardDescription>
            Nenhuma perda registrada. Registre perdas para análise de causas e melhorias.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Nenhum registro de perda encontrado</p>
            <p className="text-sm mt-2">
              Isso é bom! Continue monitorando para manter a qualidade.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
