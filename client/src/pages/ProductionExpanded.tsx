/**
 * PRODUÇÃO EXPANDIDA
 * 
 * Página completa de gestão de produção com:
 * - Ordens de Produção (OP)
 * - Kanban de Produção com Drag-and-Drop
 * - Metas de Produção
 * - Checklists de Turno
 * - Controle de Perdas e Reprocesso
 */

import { useState, useCallback } from 'react';
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
  Plus,
  GripVertical
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';

export default function ProductionExpanded() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('kanban');
  const [showNewOPModal, setShowNewOPModal] = useState(false);
  const [showNewMetaModal, setShowNewMetaModal] = useState(false);
  const [showNewChecklistModal, setShowNewChecklistModal] = useState(false);
  const [showRegistrarPerdaModal, setShowRegistrarPerdaModal] = useState(false);

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
          <MetasProducao onNewMeta={() => setShowNewMetaModal(true)} />
        </TabsContent>

        {/* CHECKLIST */}
        <TabsContent value="checklist" className="space-y-4">
          <ChecklistTurno onNewChecklist={() => setShowNewChecklistModal(true)} />
        </TabsContent>

        {/* PERDAS E REPROCESSO */}
        <TabsContent value="perdas" className="space-y-4">
          <PerdasReprocesso onRegistrarPerda={() => setShowRegistrarPerdaModal(true)} />
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <NovaOPModal open={showNewOPModal} onOpenChange={setShowNewOPModal} />
      <NovaMetaModal open={showNewMetaModal} onOpenChange={setShowNewMetaModal} />
      <NovoChecklistModal open={showNewChecklistModal} onOpenChange={setShowNewChecklistModal} />
      <RegistrarPerdaModal open={showRegistrarPerdaModal} onOpenChange={setShowRegistrarPerdaModal} />
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
// MODAL: NOVA META DE PRODUÇÃO
// ============================================================================
function NovaMetaModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [formData, setFormData] = useState({
    type: 'diaria' as 'diaria' | 'semanal' | 'mensal' | 'turno',
    targetQuantity: '',
    shift: 'todos' as 'manha' | 'tarde' | 'noite' | 'todos',
    skuId: '',
    targetYield: '',
    maxLossPercent: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    observations: '',
  });

  const utils = trpc.useUtils();
  const { data: skus } = trpc.skus.list.useQuery({});
  
  const createMeta = trpc.production.goals.create.useMutation({
    onSuccess: () => {
      toast.success('Meta de produção criada com sucesso!');
      utils.production.goals.list.invalidate();
      onOpenChange(false);
      setFormData({
        type: 'diaria',
        targetQuantity: '',
        shift: 'todos',
        skuId: '',
        targetYield: '',
        maxLossPercent: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        observations: '',
      });
    },
    onError: (error) => {
      toast.error(`Erro ao criar meta: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.targetQuantity) {
      toast.error('Preencha a quantidade alvo');
      return;
    }

    createMeta.mutate({
      type: formData.type,
      targetQuantity: parseFloat(formData.targetQuantity),
      shift: formData.shift,
      skuId: formData.skuId ? parseInt(formData.skuId) : undefined,
      targetYield: formData.targetYield ? parseFloat(formData.targetYield) : undefined,
      maxLossPercent: formData.maxLossPercent ? parseFloat(formData.maxLossPercent) : undefined,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      observations: formData.observations || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Nova Meta de Produção
          </DialogTitle>
          <DialogDescription>
            Defina uma meta de produção para acompanhar o desempenho
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Meta *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: 'diaria' | 'semanal' | 'mensal' | 'turno') => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diaria">Diária</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="turno">Por Turno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Turno</Label>
              <Select 
                value={formData.shift} 
                onValueChange={(value: 'manha' | 'tarde' | 'noite' | 'todos') => setFormData({ ...formData, shift: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Turnos</SelectItem>
                  <SelectItem value="manha">Manhã</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                  <SelectItem value="noite">Noite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantidade Alvo (kg) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.targetQuantity}
                onChange={(e) => setFormData({ ...formData, targetQuantity: e.target.value })}
                placeholder="Ex: 5000"
              />
            </div>

            <div className="space-y-2">
              <Label>Produto (SKU)</Label>
              <Select 
                value={formData.skuId} 
                onValueChange={(value) => setFormData({ ...formData, skuId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os produtos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtos</SelectItem>
                  {skus?.map((sku) => (
                    <SelectItem key={sku.id} value={sku.id.toString()}>
                      {sku.code} - {sku.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rendimento Alvo (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.targetYield}
                onChange={(e) => setFormData({ ...formData, targetYield: e.target.value })}
                placeholder="Ex: 95"
              />
            </div>

            <div className="space-y-2">
              <Label>Perda Máxima (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.maxLossPercent}
                onChange={(e) => setFormData({ ...formData, maxLossPercent: e.target.value })}
                placeholder="Ex: 2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início *</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              placeholder="Informações adicionais sobre a meta..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMeta.isPending}>
              {createMeta.isPending ? 'Criando...' : 'Criar Meta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MODAL: NOVO CHECKLIST DE TURNO
// ============================================================================
function NovoChecklistModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [formData, setFormData] = useState({
    shift: 'manha' as 'manha' | 'tarde' | 'noite',
    date: new Date().toISOString().split('T')[0],
  });

  const utils = trpc.useUtils();
  
  const createChecklist = trpc.production.checklists.create.useMutation({
    onSuccess: () => {
      toast.success('Checklist de turno criado com sucesso!');
      utils.production.checklists.listToday.invalidate();
      onOpenChange(false);
      setFormData({
        shift: 'manha',
        date: new Date().toISOString().split('T')[0],
      });
    },
    onError: (error) => {
      toast.error(`Erro ao criar checklist: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createChecklist.mutate(formData);
  };

  const getShiftLabel = (shift: string) => {
    const labels: Record<string, string> = {
      manha: 'Manhã (06:00 - 14:00)',
      tarde: 'Tarde (14:00 - 22:00)',
      noite: 'Noite (22:00 - 06:00)',
    };
    return labels[shift] || shift;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Novo Checklist de Turno
          </DialogTitle>
          <DialogDescription>
            Inicie um novo checklist para o turno selecionado
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Turno *</Label>
            <Select 
              value={formData.shift} 
              onValueChange={(value: 'manha' | 'tarde' | 'noite') => setFormData({ ...formData, shift: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manha">{getShiftLabel('manha')}</SelectItem>
                <SelectItem value="tarde">{getShiftLabel('tarde')}</SelectItem>
                <SelectItem value="noite">{getShiftLabel('noite')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data *</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              O checklist será criado com os itens padrão configurados para o turno. 
              Você poderá marcar cada item como concluído durante o turno.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createChecklist.isPending}>
              {createChecklist.isPending ? 'Criando...' : 'Criar Checklist'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MODAL: REGISTRAR PERDA/REPROCESSO
// ============================================================================
function RegistrarPerdaModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [formData, setFormData] = useState({
    originalBatchNumber: '',
    productionOrderId: '',
    skuId: '',
    quantity: '',
    reason: 'umidade_alta' as 'umidade_alta' | 'granulometria' | 'cor' | 'contaminacao_leve' | 'embalagem_danificada' | 'outro',
    reasonDetail: '',
    reprocessDate: new Date().toISOString().split('T')[0],
  });

  const utils = trpc.useUtils();
  const { data: skus } = trpc.skus.list.useQuery({});
  const { data: orders } = trpc.production.orders.list.useQuery({});
  
  const registerReprocess = trpc.production.reprocesses.register.useMutation({
    onSuccess: () => {
      toast.success('Perda/Reprocesso registrado com sucesso!');
      utils.production.reprocesses.listPending.invalidate();
      onOpenChange(false);
      setFormData({
        originalBatchNumber: '',
        productionOrderId: '',
        skuId: '',
        quantity: '',
        reason: 'umidade_alta',
        reasonDetail: '',
        reprocessDate: new Date().toISOString().split('T')[0],
      });
    },
    onError: (error) => {
      toast.error(`Erro ao registrar: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.originalBatchNumber || !formData.skuId || !formData.quantity) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    registerReprocess.mutate({
      originalBatchNumber: formData.originalBatchNumber,
      productionOrderId: formData.productionOrderId ? parseInt(formData.productionOrderId) : undefined,
      skuId: parseInt(formData.skuId),
      quantity: parseFloat(formData.quantity),
      reason: formData.reason,
      reasonDetail: formData.reasonDetail || undefined,
      reprocessDate: formData.reprocessDate,
    });
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      umidade_alta: 'Umidade Alta',
      granulometria: 'Granulometria Fora do Padrão',
      cor: 'Cor Fora do Padrão',
      contaminacao_leve: 'Contaminação Leve',
      embalagem_danificada: 'Embalagem Danificada',
      outro: 'Outro',
    };
    return labels[reason] || reason;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Registrar Perda / Reprocesso
          </DialogTitle>
          <DialogDescription>
            Registre uma perda ou material para reprocessamento
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lote Original *</Label>
              <Input
                value={formData.originalBatchNumber}
                onChange={(e) => setFormData({ ...formData, originalBatchNumber: e.target.value })}
                placeholder="Ex: LOTE-2026-001"
              />
            </div>

            <div className="space-y-2">
              <Label>Ordem de Produção</Label>
              <Select 
                value={formData.productionOrderId} 
                onValueChange={(value) => setFormData({ ...formData, productionOrderId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {orders?.map((order) => (
                    <SelectItem key={order.id} value={order.id.toString()}>
                      {order.orderNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Produto (SKU) *</Label>
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
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantidade (kg) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="Ex: 50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Select 
                value={formData.reason} 
                onValueChange={(value: any) => setFormData({ ...formData, reason: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="umidade_alta">{getReasonLabel('umidade_alta')}</SelectItem>
                  <SelectItem value="granulometria">{getReasonLabel('granulometria')}</SelectItem>
                  <SelectItem value="cor">{getReasonLabel('cor')}</SelectItem>
                  <SelectItem value="contaminacao_leve">{getReasonLabel('contaminacao_leve')}</SelectItem>
                  <SelectItem value="embalagem_danificada">{getReasonLabel('embalagem_danificada')}</SelectItem>
                  <SelectItem value="outro">{getReasonLabel('outro')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={formData.reprocessDate}
                onChange={(e) => setFormData({ ...formData, reprocessDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Detalhes do Motivo</Label>
            <Textarea
              value={formData.reasonDetail}
              onChange={(e) => setFormData({ ...formData, reasonDetail: e.target.value })}
              placeholder="Descreva detalhes adicionais sobre o problema..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={registerReprocess.isPending}>
              {registerReprocess.isPending ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// COMPONENTE: KANBAN BOARD COM DRAG-AND-DROP
// ============================================================================
function KanbanBoard({ onNewOP }: { onNewOP: () => void }) {
  const { data: kanban, isLoading } = trpc.production.orders.getKanban.useQuery();
  const utils = trpc.useUtils();
  
  const moveKanban = trpc.production.orders.moveKanban.useMutation({
    onSuccess: () => {
      utils.production.orders.getKanban.invalidate();
      utils.production.orders.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao mover card: ${error.message}`);
    },
  });

  const [draggedOrder, setDraggedOrder] = useState<any>(null);
  
  const columns = [
    { id: 'aguardando' as const, title: 'Aguardando', color: 'bg-gray-100', data: kanban?.aguardando || [] },
    { id: 'em_producao' as const, title: 'Em Produção', color: 'bg-blue-100', data: kanban?.em_producao || [] },
    { id: 'qualidade' as const, title: 'Qualidade', color: 'bg-yellow-100', data: kanban?.qualidade || [] },
    { id: 'concluida' as const, title: 'Finalizado', color: 'bg-green-100', data: kanban?.concluida || [] },
  ];

  const totalOrders = columns.reduce((sum, col) => sum + col.data.length, 0);

  const handleDragStart = (e: React.DragEvent, order: any) => {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetColumn: 'aguardando' | 'em_producao' | 'qualidade' | 'concluida') => {
    e.preventDefault();
    
    if (draggedOrder && draggedOrder.kanbanColumn !== targetColumn) {
      moveKanban.mutate({
        orderId: draggedOrder.id,
        newColumn: targetColumn,
        newPosition: 0,
      });
      toast.success(`OP ${draggedOrder.orderNumber} movida para ${columns.find(c => c.id === targetColumn)?.title}`);
    }
    
    setDraggedOrder(null);
  };

  const handleDragEnd = () => {
    setDraggedOrder(null);
  };

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
          <div 
            key={column.id} 
            className={`${column.color} rounded-lg p-4 min-h-[400px] transition-all ${
              draggedOrder ? 'ring-2 ring-dashed ring-gray-400' : ''
            }`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <h3 className="font-medium mb-4 flex items-center justify-between">
              {column.title}
              <Badge variant="secondary">{column.data.length}</Badge>
            </h3>
            
            <div className="space-y-2">
              {column.data.length > 0 ? (
                column.data.map((order: any) => (
                  <div 
                    key={order.id} 
                    className={`bg-white rounded-lg p-3 shadow-sm border cursor-grab active:cursor-grabbing transition-all ${
                      draggedOrder?.id === order.id ? 'opacity-50 scale-95' : 'hover:shadow-md'
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, order)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{order.orderNumber}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {order.plannedQuantity} kg
                        </div>
                      </div>
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
          1. Crie ordens de produção clicando em "Nova OP" | 
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
    atrasadas: 0,
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
function MetasProducao({ onNewMeta }: { onNewMeta: () => void }) {
  const { data: goals } = trpc.production.goals.list.useQuery({});
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Metas de Produção</h2>
        <Button onClick={onNewMeta}>
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
                {goals?.find(g => g.type === 'diaria' && g.status === 'ativa') ? 'Ativa' : 'Não definida'}
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
                {goals?.find(g => g.type === 'semanal' && g.status === 'ativa') ? 'Ativa' : 'Não definida'}
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
                {goals?.find(g => g.type === 'mensal' && g.status === 'ativa') ? 'Ativa' : 'Não definida'}
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
function ChecklistTurno({ onNewChecklist }: { onNewChecklist: () => void }) {
  const { data: checklists } = trpc.production.checklists.listToday.useQuery();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Checklist de Turno</h2>
        <Button onClick={onNewChecklist}>
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
            {checklists?.find(c => c.shift === 'manha') ? (
              <div className="space-y-2">
                <Badge variant="default">Em andamento</Badge>
                <p className="text-sm text-muted-foreground">
                  Responsável: {checklists.find(c => c.shift === 'manha')?.responsibleName}
                </p>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <CheckSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Nenhum checklist registrado</p>
              </div>
            )}
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
            {checklists?.find(c => c.shift === 'tarde') ? (
              <div className="space-y-2">
                <Badge variant="default">Em andamento</Badge>
                <p className="text-sm text-muted-foreground">
                  Responsável: {checklists.find(c => c.shift === 'tarde')?.responsibleName}
                </p>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <CheckSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Nenhum checklist registrado</p>
              </div>
            )}
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
            {checklists?.find(c => c.shift === 'noite') ? (
              <div className="space-y-2">
                <Badge variant="default">Em andamento</Badge>
                <p className="text-sm text-muted-foreground">
                  Responsável: {checklists.find(c => c.shift === 'noite')?.responsibleName}
                </p>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <CheckSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Nenhum checklist registrado</p>
              </div>
            )}
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
function PerdasReprocesso({ onRegistrarPerda }: { onRegistrarPerda: () => void }) {
  const { data: pendingReprocesses } = trpc.production.reprocesses.listPending.useQuery();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Perdas e Reprocesso</h2>
        <Button onClick={onRegistrarPerda}>
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
              Reprocesso Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingReprocesses?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Aguardando processamento</p>
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
          <CardTitle>Reprocessos Pendentes</CardTitle>
          <CardDescription>
            Material aguardando reprocessamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingReprocesses && pendingReprocesses.length > 0 ? (
            <div className="space-y-2">
              {pendingReprocesses.map((reprocess: any) => (
                <div key={reprocess.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Lote: {reprocess.originalBatchNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {reprocess.quantity} kg - {reprocess.reason}
                    </div>
                  </div>
                  <Badge variant="outline">Aguardando</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum reprocesso pendente</p>
              <p className="text-sm mt-2">
                Registre perdas durante o processo produtivo para acompanhar indicadores
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
