/**
 * MAGIC MOMENTS
 * 
 * Painel de Momentos Mágicos - eventos especiais que criam "wow":
 * - Saudação personalizada do CEO
 * - Alertas de recordes
 * - Celebrações de metas
 * - Notificações proativas
 * - Configuração por tipo de momento
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { 
  Sparkles, 
  Trophy, 
  PartyPopper, 
  Bell, 
  Sun,
  TrendingUp,
  Target,
  Calendar,
  Gift,
  Heart,
  Star,
  Zap,
  Settings,
  Check,
  X,
  Clock,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface MomentDefinition {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'greeting' | 'achievement' | 'alert' | 'celebration';
}

const MOMENT_DEFINITIONS: MomentDefinition[] = [
  // Saudações
  {
    id: 'ceo_greeting',
    name: 'Saudação Personalizada',
    description: 'Bom dia/tarde/noite com resumo do dia para o CEO',
    icon: <Sun className="h-5 w-5" />,
    category: 'greeting'
  },
  {
    id: 'first_login',
    name: 'Primeiro Login do Dia',
    description: 'Mensagem de boas-vindas com destaques do dia',
    icon: <Star className="h-5 w-5" />,
    category: 'greeting'
  },
  // Conquistas
  {
    id: 'production_record',
    name: 'Recorde de Produção',
    description: 'Celebra quando a produção bate recorde',
    icon: <Trophy className="h-5 w-5" />,
    category: 'achievement'
  },
  {
    id: 'quality_exceptional',
    name: 'Qualidade Excepcional',
    description: 'Celebra quando qualidade das cargas está acima de 85%',
    icon: <Target className="h-5 w-5" />,
    category: 'achievement'
  },
  {
    id: 'savings_identified',
    name: 'Economia Identificada',
    description: 'Alerta quando economias são identificadas',
    icon: <TrendingUp className="h-5 w-5" />,
    category: 'achievement'
  },
  {
    id: 'goal_achieved',
    name: 'Meta Atingida',
    description: 'Celebra quando metas diárias/semanais são batidas',
    icon: <PartyPopper className="h-5 w-5" />,
    category: 'achievement'
  },
  // Alertas Proativos
  {
    id: 'stock_resolved',
    name: 'Estoque Normalizado',
    description: 'Avisa quando estoque crítico é resolvido',
    icon: <Bell className="h-5 w-5" />,
    category: 'alert'
  },
  {
    id: 'payment_approved',
    name: 'Pagamento Aprovado',
    description: 'Notifica quando pagamentos são aprovados',
    icon: <Calendar className="h-5 w-5" />,
    category: 'alert'
  },
  {
    id: 'goal_reminder',
    name: 'Lembrete de Metas',
    description: 'Alerta quando nenhuma meta está configurada',
    icon: <Zap className="h-5 w-5" />,
    category: 'alert'
  },
  // Celebrações
  {
    id: 'producer_anniversary',
    name: 'Aniversário de Parceria',
    description: 'Lembra aniversários de parceria com produtores',
    icon: <Gift className="h-5 w-5" />,
    category: 'celebration'
  },
  {
    id: 'op_completed',
    name: 'Ordem de Produção Concluída',
    description: 'Celebra conclusão de ordens de produção',
    icon: <Heart className="h-5 w-5" />,
    category: 'celebration'
  },
  {
    id: 'ai_problem_solved',
    name: 'Problema Resolvido pela IA',
    description: 'Celebra quando insights da IA são resolvidos',
    icon: <Sparkles className="h-5 w-5" />,
    category: 'celebration'
  }
];

const CATEGORIES = [
  { id: 'greeting' as const, name: 'Saudações', icon: <Sun className="h-4 w-4" /> },
  { id: 'achievement' as const, name: 'Conquistas', icon: <Trophy className="h-4 w-4" /> },
  { id: 'alert' as const, name: 'Alertas Proativos', icon: <Bell className="h-4 w-4" /> },
  { id: 'celebration' as const, name: 'Celebrações', icon: <PartyPopper className="h-4 w-4" /> },
];

const getCategoryColor = (category: MomentDefinition['category']) => {
  switch (category) {
    case 'greeting': return 'bg-blue-100 text-blue-800';
    case 'achievement': return 'bg-yellow-100 text-yellow-800';
    case 'alert': return 'bg-red-100 text-red-800';
    case 'celebration': return 'bg-purple-100 text-purple-800';
  }
};

export default function MagicMoments() {
  const { user } = useAuth();

  const [configOpen, setConfigOpen] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<MomentDefinition | null>(null);
  const [configEnabled, setConfigEnabled] = useState(true);
  const [configChannels, setConfigChannels] = useState<string[]>(['in_app']);

  // Queries
  const { data: momentsData, isLoading: momentsLoading, refetch: refetchMoments } = trpc.ai.getMagicMoments.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const { data: configData, isLoading: configLoading, refetch: refetchConfig } = trpc.ai.getMagicMomentsConfig.useQuery();
  const { data: historyData, isLoading: historyLoading } = trpc.ai.getMagicMomentsHistory.useQuery({ limit: 20 });

  // Mutations
  const saveConfigMutation = trpc.ai.saveMagicMomentConfig.useMutation({
    onSuccess: () => {
      toast.success('Configuração salva', { description: 'A configuração do momento mágico foi atualizada.' });
      refetchConfig();
      setConfigOpen(false);
    },
    onError: () => {
      toast.error('Erro', { description: 'Não foi possível salvar a configuração.' });
    }
  });

  const dismissMutation = trpc.ai.dismissMagicMoment.useMutation({
    onSuccess: () => {
      refetchMoments();
      toast.success('Momento dispensado');
    }
  });

  // Get config for a specific moment type
  const getMomentConfig = (momentType: string) => {
    if (!configData) return { enabled: true, channels: ['in_app'] };
    const config = configData.find((c: any) => c.momentType === momentType);
    if (!config) return { enabled: true, channels: ['in_app'] };
    return { enabled: config.enabled, channels: (config.channels as string[]) || ['in_app'] };
  };

  // Open config dialog for a specific moment
  const openConfig = (moment: MomentDefinition) => {
    setSelectedMoment(moment);
    const config = getMomentConfig(moment.id);
    setConfigEnabled(config.enabled);
    setConfigChannels(config.channels);
    setConfigOpen(true);
  };

  // Open global config dialog
  const openGlobalConfig = () => {
    setSelectedMoment(null);
    setConfigOpen(true);
  };

  // Save config
  const handleSaveConfig = () => {
    if (selectedMoment) {
      saveConfigMutation.mutate({
        momentType: selectedMoment.id,
        enabled: configEnabled,
        channels: configChannels,
      });
    }
  };

  // Toggle channel
  const toggleChannel = (channel: string) => {
    setConfigChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  // Count active moments
  const activeMoments = MOMENT_DEFINITIONS.filter(m => getMomentConfig(m.id).enabled).length;
  const liveMomentsCount = momentsData?.liveMoments?.length || 0;
  const persistedCount = momentsData?.persistedMoments?.length || 0;
  const historyCount = historyData?.length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-yellow-500" />
              Momentos Mágicos
            </h1>
            <p className="text-muted-foreground">
              Experiências personalizadas que criam "wow" no dia a dia
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchMoments()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button variant="outline" onClick={openGlobalConfig}>
              <Settings className="mr-2 h-4 w-4" />
              Configurar
            </Button>
          </div>
        </div>

        {/* Explicação */}
        <Alert className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <AlertTitle className="text-purple-800">O que são Momentos Mágicos?</AlertTitle>
          <AlertDescription className="text-purple-700">
            São interações personalizadas que transformam o uso do sistema em uma experiência especial.
            Ao invés de apenas mostrar dados, o sistema celebra conquistas, antecipa necessidades e 
            cria conexão emocional com os usuários.
            <br /><br />
            <strong>Exemplo:</strong> Ao abrir o sistema pela manhã, o CEO recebe: "Bom dia, Hermano! 
            Ontem processamos 12.500kg de coco - 15% acima da meta. Hoje temos R$45.000 a pagar e 
            R$62.000 a receber. Excelente dia!"
          </AlertDescription>
        </Alert>

        {/* Momentos Ativos (Live) */}
        {momentsLoading ? (
          <Card>
            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
            <CardContent><Skeleton className="h-20 w-full" /></CardContent>
          </Card>
        ) : liveMomentsCount > 0 ? (
          <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <Sparkles className="h-5 w-5" />
                Momentos Ativos Agora
              </CardTitle>
              <CardDescription className="text-yellow-700">
                {liveMomentsCount} momento(s) detectado(s) em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {momentsData?.liveMoments?.map((moment: any) => (
                  <div key={moment.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/70 border border-yellow-200">
                    <span className="text-2xl">{moment.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-yellow-900">{moment.title}</p>
                      <p className="text-sm text-yellow-700">{moment.message}</p>
                    </div>
                    <Badge variant="outline" className={`text-xs ${
                      moment.priority === 'high' ? 'border-red-300 text-red-700' :
                      moment.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                      'border-gray-300 text-gray-700'
                    }`}>
                      {moment.priority === 'high' ? 'Alta' : moment.priority === 'medium' ? 'Média' : 'Baixa'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Momentos Persistidos Não Vistos */}
        {persistedCount > 0 && (
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                Notificações Pendentes
              </CardTitle>
              <CardDescription>
                {persistedCount} momento(s) não visto(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {momentsData?.persistedMoments?.map((moment: any) => (
                  <div key={moment.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium">{moment.title}</p>
                      <p className="text-sm text-muted-foreground">{moment.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {new Date(moment.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => dismissMutation.mutate({ momentId: moment.id })}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Dispensar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Momentos Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeMoments} / {MOMENT_DEFINITIONS.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeMoments === MOMENT_DEFINITIONS.length ? 'Todos habilitados' : `${MOMENT_DEFINITIONS.length - activeMoments} desabilitado(s)`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Detectados Agora
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{liveMomentsCount}</div>
              <p className="text-xs text-muted-foreground">Momentos em tempo real</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{persistedCount}</div>
              <p className="text-xs text-muted-foreground">Não dispensados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{historyCount}</div>
              <p className="text-xs text-muted-foreground">Total registrados</p>
            </CardContent>
          </Card>
        </div>

        {/* Momentos por Categoria */}
        {CATEGORIES.map((category) => (
          <Card key={category.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {category.icon}
                {category.name}
              </CardTitle>
              <CardDescription>
                {category.id === 'greeting' && 'Mensagens personalizadas de boas-vindas'}
                {category.id === 'achievement' && 'Celebrações de metas e recordes'}
                {category.id === 'alert' && 'Notificações proativas importantes'}
                {category.id === 'celebration' && 'Momentos especiais da equipe'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOMENT_DEFINITIONS
                  .filter((m) => m.category === category.id)
                  .map((moment) => {
                    const config = getMomentConfig(moment.id);
                    return (
                      <div 
                        key={moment.id} 
                        className={`flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors ${!config.enabled ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${getCategoryColor(moment.category)}`}>
                            {moment.icon}
                          </div>
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              {moment.name}
                              {!config.enabled && (
                                <Badge variant="outline" className="text-xs">
                                  <EyeOff className="h-3 w-3 mr-1" />
                                  Desabilitado
                                </Badge>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">{moment.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            {config.channels.includes('in_app') && (
                              <Badge variant="secondary" className="text-xs">App</Badge>
                            )}
                            {config.channels.includes('email') && (
                              <Badge variant="secondary" className="text-xs">Email</Badge>
                            )}
                          </div>
                          <Switch 
                            checked={config.enabled} 
                            onCheckedChange={(checked) => {
                              saveConfigMutation.mutate({
                                momentType: moment.id,
                                enabled: checked,
                                channels: config.channels,
                              });
                            }}
                          />
                          <Button variant="ghost" size="sm" onClick={() => openConfig(moment)}>
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Histórico */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Momentos</CardTitle>
            <CardDescription>
              Últimos momentos mágicos disparados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : historyCount > 0 ? (
              <div className="space-y-2">
                {historyData?.map((moment: any) => (
                  <div key={moment.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{moment.title}</p>
                      <p className="text-sm text-muted-foreground">{moment.message}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">
                        {new Date(moment.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                      <Badge variant={moment.seen ? 'secondary' : 'default'} className="text-xs">
                        {moment.seen ? 'Visto' : 'Novo'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Nenhum momento mágico disparado ainda</p>
                <p className="text-sm mt-2">
                  Os momentos serão criados automaticamente conforme você usa o sistema
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Config Dialog - Individual Moment */}
        <Dialog open={configOpen && selectedMoment !== null} onOpenChange={(open) => { if (!open) setConfigOpen(false); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurar: {selectedMoment?.name}
              </DialogTitle>
              <DialogDescription>
                {selectedMoment?.description}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="moment-enabled" className="text-base font-medium">
                  Habilitado
                </Label>
                <Switch 
                  id="moment-enabled"
                  checked={configEnabled} 
                  onCheckedChange={setConfigEnabled} 
                />
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">Canais de Notificação</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="channel-app"
                      checked={configChannels.includes('in_app')}
                      onCheckedChange={() => toggleChannel('in_app')}
                    />
                    <Label htmlFor="channel-app">No aplicativo (in-app)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="channel-email"
                      checked={configChannels.includes('email')}
                      onCheckedChange={() => toggleChannel('email')}
                    />
                    <Label htmlFor="channel-email">E-mail</Label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfigOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveConfig} disabled={saveConfigMutation.isPending}>
                {saveConfigMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Config Dialog - Global */}
        <Dialog open={configOpen && selectedMoment === null} onOpenChange={(open) => { if (!open) setConfigOpen(false); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações Gerais dos Momentos Mágicos
              </DialogTitle>
              <DialogDescription>
                Gerencie quais momentos estão ativos e seus canais de notificação
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              {MOMENT_DEFINITIONS.map((moment) => {
                const config = getMomentConfig(moment.id);
                return (
                  <div key={moment.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getCategoryColor(moment.category)}`}>
                        {moment.icon}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{moment.name}</p>
                        <p className="text-xs text-muted-foreground">{moment.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={config.enabled} 
                        onCheckedChange={(checked) => {
                          saveConfigMutation.mutate({
                            momentType: moment.id,
                            enabled: checked,
                            channels: config.channels,
                          });
                        }}
                      />
                      <Button variant="ghost" size="sm" onClick={() => openConfig(moment)}>
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfigOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
