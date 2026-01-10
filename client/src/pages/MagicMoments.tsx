/**
 * MAGIC MOMENTS
 * 
 * Painel de Momentos Mágicos - eventos especiais que criam "wow":
 * - Saudação personalizada do CEO
 * - Alertas de recordes
 * - Celebrações de metas
 * - Notificações proativas
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Info,
  Settings
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface MagicMoment {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  triggerCount: number;
  lastTriggered?: string;
  category: 'greeting' | 'achievement' | 'alert' | 'celebration';
}

export default function MagicMoments() {
  const { t } = useTranslation();
  
  const moments: MagicMoment[] = [
    // Saudações
    {
      id: 'ceo_greeting',
      name: 'Saudação Personalizada',
      description: 'Bom dia/tarde/noite com resumo do dia para o CEO',
      icon: <Sun className="h-5 w-5" />,
      enabled: true,
      triggerCount: 0,
      category: 'greeting'
    },
    {
      id: 'first_login',
      name: 'Primeiro Login do Dia',
      description: 'Mensagem de boas-vindas com destaques do dia',
      icon: <Star className="h-5 w-5" />,
      enabled: true,
      triggerCount: 0,
      category: 'greeting'
    },
    // Conquistas
    {
      id: 'production_record',
      name: 'Recorde de Produção',
      description: 'Celebra quando a produção bate recorde',
      icon: <Trophy className="h-5 w-5" />,
      enabled: true,
      triggerCount: 0,
      category: 'achievement'
    },
    {
      id: 'quality_streak',
      name: 'Sequência de Qualidade',
      description: 'Celebra dias consecutivos sem não-conformidades',
      icon: <Target className="h-5 w-5" />,
      enabled: true,
      triggerCount: 0,
      category: 'achievement'
    },
    {
      id: 'cost_reduction',
      name: 'Redução de Custos',
      description: 'Alerta quando custos ficam abaixo da meta',
      icon: <TrendingUp className="h-5 w-5" />,
      enabled: true,
      triggerCount: 0,
      category: 'achievement'
    },
    {
      id: 'goal_achieved',
      name: 'Meta Atingida',
      description: 'Celebra quando metas diárias/semanais são batidas',
      icon: <PartyPopper className="h-5 w-5" />,
      enabled: true,
      triggerCount: 0,
      category: 'achievement'
    },
    // Alertas Proativos
    {
      id: 'cash_flow_alert',
      name: 'Alerta de Fluxo de Caixa',
      description: 'Avisa quando saldo fica abaixo do mínimo',
      icon: <Bell className="h-5 w-5" />,
      enabled: true,
      triggerCount: 0,
      category: 'alert'
    },
    {
      id: 'payment_due',
      name: 'Pagamentos do Dia',
      description: 'Resumo matinal de pagamentos a vencer',
      icon: <Calendar className="h-5 w-5" />,
      enabled: true,
      triggerCount: 0,
      category: 'alert'
    },
    {
      id: 'stock_low',
      name: 'Estoque Baixo',
      description: 'Alerta quando itens atingem estoque mínimo',
      icon: <Zap className="h-5 w-5" />,
      enabled: true,
      triggerCount: 0,
      category: 'alert'
    },
    // Celebrações
    {
      id: 'birthday',
      name: 'Aniversário de Funcionário',
      description: 'Lembra aniversários da equipe',
      icon: <Gift className="h-5 w-5" />,
      enabled: true,
      triggerCount: 0,
      category: 'celebration'
    },
    {
      id: 'work_anniversary',
      name: 'Aniversário de Empresa',
      description: 'Celebra tempo de casa dos funcionários',
      icon: <Heart className="h-5 w-5" />,
      enabled: true,
      triggerCount: 0,
      category: 'celebration'
    },
    {
      id: 'milestone',
      name: 'Marco Histórico',
      description: 'Celebra marcos como 1 milhão de kg processados',
      icon: <Sparkles className="h-5 w-5" />,
      enabled: true,
      triggerCount: 0,
      category: 'celebration'
    }
  ];

  const categories = [
    { id: 'greeting', name: 'Saudações', icon: <Sun className="h-4 w-4" /> },
    { id: 'achievement', name: 'Conquistas', icon: <Trophy className="h-4 w-4" /> },
    { id: 'alert', name: 'Alertas Proativos', icon: <Bell className="h-4 w-4" /> },
    { id: 'celebration', name: 'Celebrações', icon: <PartyPopper className="h-4 w-4" /> },
  ];

  const getCategoryColor = (category: MagicMoment['category']) => {
    switch (category) {
      case 'greeting': return 'bg-blue-100 text-blue-800';
      case 'achievement': return 'bg-yellow-100 text-yellow-800';
      case 'alert': return 'bg-red-100 text-red-800';
      case 'celebration': return 'bg-purple-100 text-purple-800';
    }
  };

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
            <Button variant="outline">
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

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Momentos Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12 / 12</div>
              <p className="text-xs text-muted-foreground">Todos habilitados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Disparados Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">0</div>
              <p className="text-xs text-muted-foreground">Aguardando dados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Este Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Momentos criados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Conquistas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">0</div>
              <p className="text-xs text-muted-foreground">Recordes batidos</p>
            </CardContent>
          </Card>
        </div>

        {/* Momentos por Categoria */}
        {categories.map((category) => (
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
                {moments
                  .filter((m) => m.category === category.id)
                  .map((moment) => (
                    <div 
                      key={moment.id} 
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getCategoryColor(moment.category)}`}>
                          {moment.icon}
                        </div>
                        <div>
                          <p className="font-medium">{moment.name}</p>
                          <p className="text-sm text-muted-foreground">{moment.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="text-muted-foreground">Disparos</p>
                          <p className="font-medium">{moment.triggerCount}</p>
                        </div>
                        <Switch checked={moment.enabled} />
                      </div>
                    </div>
                  ))}
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
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum momento mágico disparado ainda</p>
              <p className="text-sm mt-2">
                Os momentos serão criados automaticamente conforme você usa o sistema
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
