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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Info,
  Plus
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';

export default function ProductionExpanded() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('kanban');
  const [showNewOPModal, setShowNewOPModal] = useState(false);

  return (
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
          <Button onClick={() => setShowNewOPModal(true)}>
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
          <KanbanBoard onNewOP={() => setShowNewOPModal(true)} />
        </TabsContent>

        {/* ORDENS DE PRODUÇÃO */}
        <TabsContent value="ordens" className="space-y-4">
          <OrdensProducao onNewOP={() => setShowNewOPModal(true)} />
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

      {/* Modal Nova OP */}
      <NovaOPModal 
        open={showNewOPModal} 
        onOpenChange={setShowNewOPModal} 
      />
    </div>
  );
}

// ============================================================================
// MODAL: NOVA ORDEM DE PRODUÇÃO
// ============================================================================
function NovaOPModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [formData, setFormData] = useState({
    skuId: '',
    variation: 'flocos' as 'flocos' | 'medio' | 'fino',
    plannedQuantity: '',
    plannedStartDate: new Date().toISOString().split('T')[0],
    plannedEndDate: '',
    priority: 'normal' as 'baixa' | 'normal' | 'alta' | 'urgente',
    observations: '',
  });

  const utils = trpc.useUtils();
  const { data: skus } = trpc.skus.list.useQuery({});
  
  const createOP = trpc.production.orders.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Ordem de Produção ${data.orderNumber} criada com sucesso!`);
      utils.production.orders.list.invalidate();
      utils.production.orders.getKanban.invalidate();
      onOpenChange(false);
      // Reset form
      setFormData({
        skuId: '',
        variation: 'flocos',
        plannedQuantity: '',
        plannedStartDate: new Date().toISOString().split('T')[0],
        plannedEndDate: '',
        priority: 'normal',
        observations: '',
      });
    },
    onError: (error) => {
      toast.error(`Erro ao criar OP: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.skuId || !formData.plannedQuantity) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    createOP.mutate({
      skuId: parseInt(formData.skuId),
      variation: formData.variation,
      plannedQuantity: parseFloat(formData.plannedQuantity),
      plannedStartDate: formData.plannedStartDate,
      plannedEndDate: formData.plannedEndDate || undefined,
      priority: formData.priority,
      observations: formData.observations || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Nova Ordem de Produção
          </DialogTitle>
          <DialogDescription>
            Crie uma nova OP para iniciar a produção de um produto
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="skuId">Produto (SKU) *</Label>
              <Select 
                value={formData.skuId} 
                onValueChange={(value) => setFormData({ ...formData, skuId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {skus?.map((sku) => (
                    <SelectItem key={sku.id} value={sku.id.toString()}>
                      {sku.code} - {sku.description}
                    </SelectItem>
                  ))}
                  {(!skus || skus.length === 0) && (
                    <SelectItem value="none" disabled>
                      Nenhum SKU cadastrado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="variation">Variação *</Label>
              <Select 
                value={formData.variation} 
                onValueChange={(value: 'flocos' | 'medio' | 'fino') => setFormData({ ...formData, variation: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flocos">Flocos</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="fino">Fino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plannedQuantity">Quantidade Planejada (kg) *</Label>
              <Input
                id="plannedQuantity"
                type="number"
                step="0.01"
                min="0"
                value={formData.plannedQuantity}
                onChange={(e) => setFormData({ ...formData, plannedQuantity: e.target.value })}
                placeholder="Ex: 1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value: 'baixa' | 'normal' | 'alta' | 'urgente') => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plannedStartDate">Data Início Prevista *</Label>
              <Input
                id="plannedStartDate"
                type="date"
                value={formData.plannedStartDate}
                onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plannedEndDate">Data Fim Prevista</Label>
              <Input
                id="plannedEndDate"
                type="date"
                value={formData.plannedEndDate}
                onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              placeholder="Informações adicionais sobre a ordem de produção..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createOP.isPending}>
              {createOP.isPending ? 'Criando...' : 'Criar OP'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// COMPONENTE: KANBAN BOARD
// ============================================================================
function KanbanBoard({ onNewOP }: { onNewOP: () => void }) {
  const { data: kanban, isLoading } = trpc.production.orders.getKanban.useQuery();
  
  const columns = [
    { id: 'aguardando', title: 'Aguardando', color: 'bg-gray-100', data: kanban?.aguardando || [] },
    { id: 'em_producao', title: 'Em Produção', color: 'bg-blue-100', data: kanban?.em_producao || [] },
    { id: 'qualidade', title: 'Qualidade', color: 'bg-yellow-100', data: kanban?.qualidade || [] },
    { id: 'concluida', title: 'Finalizado', color: 'bg-green-100', data: kanban?.concluida || [] },
  ];

  const totalOrders = columns.reduce((sum, col) => sum + col.data.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Kanban de Produção</h2>
        <Badge variant="outline">
          {totalOrders === 0 ? (
            <>
              <AlertCircle className="mr-1 h-3 w-3" />
              Sem ordens cadastradas
            </>
          ) : (
            `${totalOrders} ordem(s) ativa(s)`
          )}
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {columns.map((column) => (
          <div key={column.id} className={`${column.color} rounded-lg p-4 min-h-[400px]`}>
            <h3 className="font-medium mb-4 flex items-center justify-between">
              {column.title}
              <Badge variant="secondary">{column.data.length}</Badge>
            </h3>
            
            <div className="space-y-2">
              {column.data.length > 0 ? (
                column.data.map((order: any) => (
                  <div key={order.id} className="bg-white rounded-lg p-3 shadow-sm border">
                    <div className="font-medium text-sm">{order.orderNumber}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {order.plannedQuantity} kg
                    </div>
                    <Badge 
                      variant={order.priority === 'urgente' ? 'destructive' : order.priority === 'alta' ? 'default' : 'secondary'}
                      className="mt-2 text-xs"
                    >
                      {order.priority}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg p-3 border-2 border-dashed border-gray-300 text-center text-muted-foreground text-sm">
                  Arraste ordens aqui ou crie uma nova OP
                </div>
              )}
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
function OrdensProducao({ onNewOP }: { onNewOP: () => void }) {
  const { data: orders, isLoading } = trpc.production.orders.list.useQuery({});
  
  const stats = {
    aguardando: orders?.filter(o => o.status === 'aguardando').length || 0,
    em_producao: orders?.filter(o => o.status === 'em_producao').length || 0,
    concluida: orders?.filter(o => o.status === 'concluida').length || 0,
    atrasadas: 0, // TODO: calcular baseado em datas
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Ordens de Produção</h2>
        <Button onClick={onNewOP}>
          <Plus className="mr-2 h-4 w-4" />
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
            <div className="text-2xl font-bold">{stats.aguardando}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Produção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.em_producao}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Finalizadas Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.concluida}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.atrasadas}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Ordens</CardTitle>
          <CardDescription>
            {orders && orders.length > 0 
              ? `${orders.length} ordem(s) de produção cadastrada(s)`
              : 'Nenhuma ordem de produção cadastrada. Crie a primeira ordem para começar.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders && orders.length > 0 ? (
            <div className="space-y-2">
              {orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{order.orderNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.plannedQuantity} kg - {order.variation}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        order.status === 'concluida' ? 'default' :
                        order.status === 'em_producao' ? 'secondary' :
                        order.status === 'cancelada' ? 'destructive' :
                        'outline'
                      }
                    >
                      {order.status}
                    </Badge>
                    <Badge 
                      variant={order.priority === 'urgente' ? 'destructive' : order.priority === 'alta' ? 'default' : 'secondary'}
                    >
                      {order.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Nenhuma ordem de produção encontrada</p>
              <p className="text-sm mt-2">
                Clique em "Nova Ordem" para criar a primeira OP
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// COMPONENTE: METAS DE PRODUÇÃO
// ============================================================================
function MetasProducao() {
  const { data: goals } = trpc.production.goals.list.useQuery({});
  
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
              <Badge variant="outline">
                {goals?.find(g => g.type === 'diaria') ? 'Ativa' : 'Não definida'}
              </Badge>
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
              <Badge variant="outline">
                {goals?.find(g => g.type === 'semanal') ? 'Ativa' : 'Não definida'}
              </Badge>
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
                Defina uma meta semanal para acompanhar o progresso
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Meta Mensal
              <Badge variant="outline">
                {goals?.find(g => g.type === 'mensal') ? 'Ativa' : 'Não definida'}
              </Badge>
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
                Defina uma meta mensal para acompanhar o progresso
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {goals && goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Metas Cadastradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {goals.map((goal) => (
                <div key={goal.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium capitalize">{goal.type}</div>
                    <div className="text-sm text-muted-foreground">
                      Meta: {goal.targetQuantity} kg
                    </div>
                  </div>
                  <Badge variant={goal.status === 'ativa' ? 'default' : 'secondary'}>
                    {goal.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Alert variant="default" className="bg-amber-50">
        <TrendingUp className="h-4 w-4" />
        <AlertTitle>Dica</AlertTitle>
        <AlertDescription>
          Configure metas de produção para acompanhar o desempenho da equipe e identificar oportunidades de melhoria.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// ============================================================================
// COMPONENTE: CHECKLIST DE TURNO
// ============================================================================
function ChecklistTurno() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Checklist de Turno</h2>
        <Button>
          <CheckSquare className="mr-2 h-4 w-4" />
          Novo Checklist
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Turno Manhã
            </CardTitle>
            <CardDescription>06:00 - 14:00</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4 text-muted-foreground">
              <CheckSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhum checklist registrado</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Turno Tarde
            </CardTitle>
            <CardDescription>14:00 - 22:00</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4 text-muted-foreground">
              <CheckSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhum checklist registrado</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Turno Noite
            </CardTitle>
            <CardDescription>22:00 - 06:00</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4 text-muted-foreground">
              <CheckSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhum checklist registrado</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Configuração de Templates</AlertTitle>
        <AlertDescription>
          Configure os templates de checklist em Admin → Checklists para definir os itens que devem ser verificados em cada turno.
        </AlertDescription>
      </Alert>
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
        <h2 className="text-xl font-semibold">Perdas e Reprocesso</h2>
        <Button>
          <AlertTriangle className="mr-2 h-4 w-4" />
          Registrar Perda
        </Button>
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
              Perdas Semana
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
              Índice de Aproveitamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">100%</div>
            <p className="text-xs text-muted-foreground">Meta: &gt;98%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Perdas</CardTitle>
          <CardDescription>
            Registros de perdas e reprocesso dos últimos 30 dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Nenhuma perda registrada</p>
            <p className="text-sm mt-2">
              Registre perdas durante o processo produtivo para acompanhar indicadores
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
