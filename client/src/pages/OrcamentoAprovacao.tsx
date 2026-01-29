import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  MessageSquare,
  User,
  Calendar,
  DollarSign,
  ArrowRight,
  FileText,
  History,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
} from "lucide-react";

interface ApprovalRequest {
  id: number;
  budgetId: number;
  budgetName: string;
  type: "budget" | "revision" | "capex";
  status: "pending" | "approved" | "rejected" | "revision_requested";
  requestedBy: string;
  requestedAt: string;
  totalValue: number;
  description: string;
  currentLevel: number;
  maxLevel: number;
  approvals: ApprovalStep[];
}

interface ApprovalStep {
  level: number;
  approverName: string;
  approverRole: string;
  status: "pending" | "approved" | "rejected";
  comment?: string;
  approvedAt?: string;
}

const APPROVAL_LEVELS = [
  { level: 1, role: "Gerente de Área", minValue: 0, maxValue: 50000 },
  { level: 2, role: "Diretor Financeiro", minValue: 50001, maxValue: 200000 },
  { level: 3, role: "CEO", minValue: 200001, maxValue: Infinity },
];

export default function OrcamentoAprovacao() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState("pendentes");
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [comment, setComment] = useState("");
  
  // Mock data for approval requests
  const [requests, setRequests] = useState<ApprovalRequest[]>([
    {
      id: 1,
      budgetId: 1,
      budgetName: "Orçamento Produção 2026",
      type: "budget",
      status: "pending",
      requestedBy: "Maria Silva",
      requestedAt: "2026-01-15T10:30:00",
      totalValue: 850000,
      description: "Orçamento anual do departamento de produção incluindo mão de obra, insumos e manutenção.",
      currentLevel: 2,
      maxLevel: 3,
      approvals: [
        { level: 1, approverName: "João Santos", approverRole: "Gerente de Produção", status: "approved", comment: "Valores alinhados com o planejamento", approvedAt: "2026-01-16T14:20:00" },
        { level: 2, approverName: "Carlos Oliveira", approverRole: "Diretor Financeiro", status: "pending" },
        { level: 3, approverName: "Ana Costa", approverRole: "CEO", status: "pending" },
      ],
    },
    {
      id: 2,
      budgetId: 2,
      budgetName: "CAPEX - Nova Linha de Envase",
      type: "capex",
      status: "pending",
      requestedBy: "Pedro Almeida",
      requestedAt: "2026-01-20T09:15:00",
      totalValue: 450000,
      description: "Investimento em nova linha de envase automático para aumentar capacidade produtiva em 40%.",
      currentLevel: 1,
      maxLevel: 3,
      approvals: [
        { level: 1, approverName: "João Santos", approverRole: "Gerente de Produção", status: "pending" },
        { level: 2, approverName: "Carlos Oliveira", approverRole: "Diretor Financeiro", status: "pending" },
        { level: 3, approverName: "Ana Costa", approverRole: "CEO", status: "pending" },
      ],
    },
    {
      id: 3,
      budgetId: 1,
      budgetName: "Revisão Orçamento Comercial",
      type: "revision",
      status: "approved",
      requestedBy: "Fernanda Lima",
      requestedAt: "2026-01-10T11:00:00",
      totalValue: 120000,
      description: "Revisão do orçamento comercial para incluir nova campanha de marketing.",
      currentLevel: 2,
      maxLevel: 2,
      approvals: [
        { level: 1, approverName: "Roberto Dias", approverRole: "Gerente Comercial", status: "approved", comment: "Aprovado conforme planejamento", approvedAt: "2026-01-11T09:30:00" },
        { level: 2, approverName: "Carlos Oliveira", approverRole: "Diretor Financeiro", status: "approved", comment: "Dentro do limite de revisão", approvedAt: "2026-01-12T16:45:00" },
      ],
    },
    {
      id: 4,
      budgetId: 3,
      budgetName: "Orçamento TI 2026",
      type: "budget",
      status: "rejected",
      requestedBy: "Lucas Mendes",
      requestedAt: "2026-01-05T14:00:00",
      totalValue: 280000,
      description: "Orçamento anual de TI incluindo infraestrutura, licenças e novos projetos.",
      currentLevel: 2,
      maxLevel: 3,
      approvals: [
        { level: 1, approverName: "Marcos Paulo", approverRole: "Gerente de TI", status: "approved", approvedAt: "2026-01-06T10:00:00" },
        { level: 2, approverName: "Carlos Oliveira", approverRole: "Diretor Financeiro", status: "rejected", comment: "Valor acima do limite. Revisar e resubmeter com redução de 15%.", approvedAt: "2026-01-08T11:30:00" },
      ],
    },
  ]);

  // Queries
  const { data: budgets } = trpc.budget.list.useQuery({ year: selectedYear });

  const pendingRequests = useMemo(() => requests.filter(r => r.status === "pending"), [requests]);
  const approvedRequests = useMemo(() => requests.filter(r => r.status === "approved"), [requests]);
  const rejectedRequests = useMemo(() => requests.filter(r => r.status === "rejected" || r.status === "revision_requested"), [requests]);

  const handleApprove = () => {
    if (!selectedRequest) return;
    
    setRequests(prev => prev.map(r => {
      if (r.id === selectedRequest.id) {
        const newApprovals = r.approvals.map((a, idx) => {
          if (idx === r.currentLevel - 1) {
            return { ...a, status: "approved" as const, comment, approvedAt: new Date().toISOString() };
          }
          return a;
        });
        
        const newCurrentLevel = r.currentLevel + 1;
        const newStatus = newCurrentLevel > r.maxLevel ? "approved" as const : "pending" as const;
        
        return { ...r, approvals: newApprovals, currentLevel: newCurrentLevel, status: newStatus };
      }
      return r;
    }));
    
    toast.success("Orçamento aprovado com sucesso!");
    setShowApprovalDialog(false);
    setComment("");
    setSelectedRequest(null);
  };

  const handleReject = () => {
    if (!selectedRequest) return;
    
    setRequests(prev => prev.map(r => {
      if (r.id === selectedRequest.id) {
        const newApprovals = r.approvals.map((a, idx) => {
          if (idx === r.currentLevel - 1) {
            return { ...a, status: "rejected" as const, comment, approvedAt: new Date().toISOString() };
          }
          return a;
        });
        
        return { ...r, approvals: newApprovals, status: "rejected" as const };
      }
      return r;
    }));
    
    toast.error("Orçamento rejeitado");
    setShowRejectDialog(false);
    setComment("");
    setSelectedRequest(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Aprovado</Badge>;
      case "rejected":
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" /> Rejeitado</Badge>;
      case "revision_requested":
        return <Badge className="bg-orange-500"><RotateCcw className="h-3 w-3 mr-1" /> Revisão</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "budget":
        return <Badge variant="outline"><FileText className="h-3 w-3 mr-1" /> Orçamento</Badge>;
      case "revision":
        return <Badge variant="outline"><History className="h-3 w-3 mr-1" /> Revisão</Badge>;
      case "capex":
        return <Badge variant="outline"><DollarSign className="h-3 w-3 mr-1" /> CAPEX</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getRequiredLevel = (value: number) => {
    for (const level of APPROVAL_LEVELS) {
      if (value >= level.minValue && value <= level.maxValue) {
        return level;
      }
    }
    return APPROVAL_LEVELS[APPROVAL_LEVELS.length - 1];
  };

  const renderRequestCard = (request: ApprovalRequest, showActions: boolean = false) => (
    <Card key={request.id} className="mb-4">
      <CardContent className="pt-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{request.budgetName}</h3>
              {getTypeBadge(request.type)}
              {getStatusBadge(request.status)}
            </div>
            <p className="text-sm text-muted-foreground mb-3">{request.description}</p>
            
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Solicitado por: <strong>{request.requestedBy}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(request.requestedAt).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold">R$ {request.totalValue.toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
          
          {showActions && request.status === "pending" && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => {
                  setSelectedRequest(request);
                  setShowRejectDialog(true);
                }}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Rejeitar
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setSelectedRequest(request);
                  setShowApprovalDialog(true);
                }}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
            </div>
          )}
        </div>
        
        {/* Approval Timeline */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-medium mb-3">Fluxo de Aprovação</p>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {request.approvals.map((approval, idx) => (
              <div key={idx} className="flex items-center">
                <div className={`flex flex-col items-center p-3 rounded-lg min-w-[140px] ${
                  approval.status === "approved" ? "bg-green-50 border border-green-200" :
                  approval.status === "rejected" ? "bg-red-50 border border-red-200" :
                  idx === request.currentLevel - 1 ? "bg-blue-50 border border-blue-200" :
                  "bg-gray-50 border border-gray-200"
                }`}>
                  <Avatar className="h-8 w-8 mb-1">
                    <AvatarFallback className={
                      approval.status === "approved" ? "bg-green-500 text-white" :
                      approval.status === "rejected" ? "bg-red-500 text-white" :
                      "bg-gray-300"
                    }>
                      {approval.approverName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-center">{approval.approverName}</span>
                  <span className="text-xs text-muted-foreground">{approval.approverRole}</span>
                  {approval.status === "approved" && (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-1" />
                  )}
                  {approval.status === "rejected" && (
                    <XCircle className="h-4 w-4 text-red-600 mt-1" />
                  )}
                  {approval.status === "pending" && idx === request.currentLevel - 1 && (
                    <Clock className="h-4 w-4 text-blue-600 mt-1 animate-pulse" />
                  )}
                </div>
                {idx < request.approvals.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground mx-1" />
                )}
              </div>
            ))}
          </div>
          
          {/* Comments */}
          {request.approvals.some(a => a.comment) && (
            <div className="mt-3 space-y-2">
              {request.approvals.filter(a => a.comment).map((approval, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-muted rounded">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="font-medium">{approval.approverName}:</span>
                    <span className="ml-1">{approval.comment}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Workflow de Aprovação</h1>
            <p className="text-muted-foreground">
              Gerencie as aprovações de orçamentos e investimentos
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Pendentes</span>
              </div>
              <p className="text-2xl font-bold mt-2">{pendingRequests.length}</p>
              <p className="text-xs text-muted-foreground">
                R$ {pendingRequests.reduce((sum, r) => sum + r.totalValue, 0).toLocaleString('pt-BR')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Aprovados</span>
              </div>
              <p className="text-2xl font-bold mt-2">{approvedRequests.length}</p>
              <p className="text-xs text-muted-foreground">
                R$ {approvedRequests.reduce((sum, r) => sum + r.totalValue, 0).toLocaleString('pt-BR')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm text-muted-foreground">Rejeitados</span>
              </div>
              <p className="text-2xl font-bold mt-2">{rejectedRequests.length}</p>
              <p className="text-xs text-muted-foreground">
                R$ {rejectedRequests.reduce((sum, r) => sum + r.totalValue, 0).toLocaleString('pt-BR')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span className="text-sm text-muted-foreground">Aguardando Você</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {pendingRequests.filter(r => r.currentLevel === 2).length}
              </p>
              <p className="text-xs text-muted-foreground">requerem sua ação</p>
            </CardContent>
          </Card>
        </div>

        {/* Alçadas de Aprovação */}
        <Card>
          <CardHeader>
            <CardTitle>Alçadas de Aprovação</CardTitle>
            <CardDescription>Níveis de aprovação baseados no valor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {APPROVAL_LEVELS.map((level) => (
                <div key={level.level} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {level.level}
                    </div>
                    <span className="font-medium">{level.role}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {level.maxValue === Infinity 
                      ? `Acima de R$ ${level.minValue.toLocaleString('pt-BR')}`
                      : `R$ ${level.minValue.toLocaleString('pt-BR')} - R$ ${level.maxValue.toLocaleString('pt-BR')}`
                    }
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pendentes">
              Pendentes ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="aprovados">
              Aprovados ({approvedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="rejeitados">
              Rejeitados ({rejectedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes" className="mt-4">
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">Nenhuma aprovação pendente</p>
                  <p className="text-muted-foreground">Todas as solicitações foram processadas.</p>
                </CardContent>
              </Card>
            ) : (
              pendingRequests.map(request => renderRequestCard(request, true))
            )}
          </TabsContent>

          <TabsContent value="aprovados" className="mt-4">
            {approvedRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">Nenhum orçamento aprovado</p>
                </CardContent>
              </Card>
            ) : (
              approvedRequests.map(request => renderRequestCard(request, false))
            )}
          </TabsContent>

          <TabsContent value="rejeitados" className="mt-4">
            {rejectedRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">Nenhum orçamento rejeitado</p>
                </CardContent>
              </Card>
            ) : (
              rejectedRequests.map(request => renderRequestCard(request, false))
            )}
          </TabsContent>
        </Tabs>

        {/* Approval Dialog */}
        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aprovar Orçamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedRequest?.budgetName}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest?.description}</p>
                <p className="text-lg font-bold mt-2">
                  R$ {selectedRequest?.totalValue.toLocaleString('pt-BR')}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Comentário (opcional)</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Adicione um comentário sobre a aprovação..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                Cancelar
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmar Aprovação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeitar Orçamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-medium">{selectedRequest?.budgetName}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest?.description}</p>
                <p className="text-lg font-bold mt-2">
                  R$ {selectedRequest?.totalValue.toLocaleString('pt-BR')}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Motivo da Rejeição (obrigatório)</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Explique o motivo da rejeição..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancelar
              </Button>
              <Button 
                className="bg-red-600 hover:bg-red-700" 
                onClick={handleReject}
                disabled={!comment.trim()}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Confirmar Rejeição
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
