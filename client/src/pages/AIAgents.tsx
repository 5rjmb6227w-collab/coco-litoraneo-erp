/**
 * AI AGENTS DASHBOARD
 * 
 * Painel de controle dos 6 Agentes de IA:
 * - Agente de Recebimento
 * - Agente de Produção
 * - Agente de Manutenção
 * - Agente de Vendas
 * - Agente de Compliance
 * - Agente de Custos
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { 
  Bot, 
  Truck, 
  Factory, 
  Wrench, 
  TrendingUp, 
  FileCheck, 
  DollarSign,
  Play,
  Pause,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  Settings
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'paused' | 'error' | 'waiting';
  lastRun?: string;
  nextRun?: string;
  findings: number;
  dataStatus: 'sufficient' | 'partial' | 'insufficient';
  dataMessage: string;
}

export default function AIAgents() {
  const { t } = useTranslation();
  
  const agents: Agent[] = [
    {
      id: 'receiving',
      name: 'Agente de Recebimento',
      description: 'Monitora cargas, detecta anomalias de peso e qualidade, sugere ajustes de preço',
      icon: <Truck className="h-6 w-6" />,
      status: 'waiting',
      findings: 0,
      dataStatus: 'insufficient',
      dataMessage: 'Cadastre cargas de coco para ativar este agente'
    },
    {
      id: 'production',
      name: 'Agente de Produção',
      description: 'Analisa rendimento, detecta gargalos, sugere otimizações de processo',
      icon: <Factory className="h-6 w-6" />,
      status: 'waiting',
      findings: 0,
      dataStatus: 'insufficient',
      dataMessage: 'Cadastre apontamentos de produção para ativar'
    },
    {
      id: 'maintenance',
      name: 'Agente de Manutenção',
      description: 'Prevê falhas de equipamentos, agenda manutenções preventivas',
      icon: <Wrench className="h-6 w-6" />,
      status: 'waiting',
      findings: 0,
      dataStatus: 'insufficient',
      dataMessage: 'Cadastre equipamentos em Admin → Equipamentos'
    },
    {
      id: 'sales',
      name: 'Agente de Vendas',
      description: 'Analisa tendências de mercado, sugere preços, identifica oportunidades',
      icon: <TrendingUp className="h-6 w-6" />,
      status: 'waiting',
      findings: 0,
      dataStatus: 'insufficient',
      dataMessage: 'Módulo de vendas não configurado'
    },
    {
      id: 'compliance',
      name: 'Agente de Compliance',
      description: 'Monitora documentos, alerta vencimentos, verifica conformidade LGPD',
      icon: <FileCheck className="h-6 w-6" />,
      status: 'waiting',
      findings: 0,
      dataStatus: 'insufficient',
      dataMessage: 'Cadastre documentos de compliance'
    },
    {
      id: 'costs',
      name: 'Agente de Custos',
      description: 'Analisa custos de produção, identifica desperdícios, sugere economias',
      icon: <DollarSign className="h-6 w-6" />,
      status: 'waiting',
      findings: 0,
      dataStatus: 'insufficient',
      dataMessage: 'Cadastre custos de produção para análise'
    }
  ];

  const getStatusBadge = (status: Agent['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
      case 'paused':
        return <Badge variant="secondary">Pausado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'waiting':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Aguardando Dados</Badge>;
    }
  };

  const getDataStatusIcon = (status: Agent['dataStatus']) => {
    switch (status) {
      case 'sufficient':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'insufficient':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Bot className="h-8 w-8" />
              Agentes de IA
            </h1>
            <p className="text-muted-foreground">
              6 agentes autônomos monitorando e otimizando sua operação
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Configurar
            </Button>
            <Button>
              <Play className="mr-2 h-4 w-4" />
              Executar Todos
            </Button>
          </div>
        </div>

        {/* Status Geral */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Agentes Aguardando Dados</AlertTitle>
          <AlertDescription>
            Os agentes de IA precisam de dados históricos para funcionar. À medida que você usar o sistema
            (cadastrar cargas, apontamentos, custos), os agentes serão ativados automaticamente.
            <br /><br />
            <strong>Mínimo recomendado:</strong> 30 dias de dados para análises precisas.
          </AlertDescription>
        </Alert>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Agentes Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0 / 6</div>
              <Progress value={0} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Insights Gerados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Últimas 24h</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Alertas Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">0</div>
              <p className="text-xs text-muted-foreground">Requer atenção</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Economia Sugerida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">R$ 0</div>
              <p className="text-xs text-muted-foreground">Este mês</p>
            </CardContent>
          </Card>
        </div>

        {/* Grid de Agentes */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {agent.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      {getStatusBadge(agent.status)}
                    </div>
                  </div>
                  <Switch disabled={agent.dataStatus === 'insufficient'} />
                </div>
                <CardDescription className="mt-2">
                  {agent.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Status de Dados */}
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                    {getDataStatusIcon(agent.dataStatus)}
                    <span className="text-sm">{agent.dataMessage}</span>
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Última execução:</span>
                      <p className="font-medium">{agent.lastRun || 'Nunca'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Descobertas:</span>
                      <p className="font-medium">{agent.findings}</p>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      disabled={agent.dataStatus === 'insufficient'}
                    >
                      <Play className="mr-1 h-3 w-3" />
                      Executar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={agent.dataStatus === 'insufficient'}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Histórico de Execuções */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Execuções</CardTitle>
            <CardDescription>
              Últimas execuções dos agentes e seus resultados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Nenhuma execução registrada</p>
              <p className="text-sm mt-2">
                Os agentes serão executados automaticamente quando houver dados suficientes
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
