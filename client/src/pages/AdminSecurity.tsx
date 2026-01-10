/**
 * ADMIN SECURITY
 * 
 * Página de administração de segurança com:
 * - Configuração de 2FA
 * - Políticas de senha
 * - Status de backup
 * - Auditoria de segurança
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Key, 
  Database, 
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Lock,
  Smartphone,
  Info
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminSecurity() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Segurança</h1>
            <p className="text-muted-foreground">
              Configurações de segurança, autenticação e backup do sistema
            </p>
          </div>
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Configuração Pendente
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">
              <Shield className="mr-2 h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="2fa">
              <Smartphone className="mr-2 h-4 w-4" />
              2FA
            </TabsTrigger>
            <TabsTrigger value="politicas">
              <Lock className="mr-2 h-4 w-4" />
              Políticas
            </TabsTrigger>
            <TabsTrigger value="backup">
              <Database className="mr-2 h-4 w-4" />
              Backup
            </TabsTrigger>
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-4">
            <SecurityDashboard />
          </TabsContent>

          {/* 2FA */}
          <TabsContent value="2fa" className="space-y-4">
            <TwoFactorAuth />
          </TabsContent>

          {/* POLÍTICAS */}
          <TabsContent value="politicas" className="space-y-4">
            <SecurityPolicies />
          </TabsContent>

          {/* BACKUP */}
          <TabsContent value="backup" className="space-y-4">
            <BackupManagement />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ============================================================================
// COMPONENTE: DASHBOARD DE SEGURANÇA
// ============================================================================
function SecurityDashboard() {
  return (
    <div className="space-y-4">
      {/* Alertas Críticos */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Ações Necessárias</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside mt-2">
            <li>Nenhum backup configurado - Configure backup imediatamente</li>
            <li>Política de segurança não definida - Configure em "Políticas"</li>
            <li>0% dos usuários com 2FA habilitado</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Cards de Status */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Database className="mr-2 h-4 w-4" />
              Último Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">Nunca</div>
            <p className="text-xs text-muted-foreground">Configure backup urgente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Smartphone className="mr-2 h-4 w-4" />
              Usuários com 2FA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <Progress value={0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <CheckCircle className="mr-2 h-4 w-4" />
              Logins Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">0</div>
            <p className="text-xs text-muted-foreground">0 falhas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Lock className="mr-2 h-4 w-4" />
              Política Ativa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">Nenhuma</div>
            <p className="text-xs text-muted-foreground">Configure uma política</p>
          </CardContent>
        </Card>
      </div>

      {/* Recomendações */}
      <Card>
        <CardHeader>
          <CardTitle>Recomendações de Segurança</CardTitle>
          <CardDescription>
            Ações recomendadas para melhorar a segurança do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50">
              <XCircle className="h-5 w-5 text-red-600" />
              <div className="flex-1">
                <p className="font-medium">Configure backup automatizado</p>
                <p className="text-sm text-muted-foreground">Crítico para recuperação de dados</p>
              </div>
              <Button size="sm" variant="destructive">Configurar</Button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <p className="font-medium">Defina política de senhas</p>
                <p className="text-sm text-muted-foreground">Melhora a segurança das contas</p>
              </div>
              <Button size="sm" variant="outline">Configurar</Button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50">
              <Info className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="font-medium">Habilite 2FA para administradores</p>
                <p className="text-sm text-muted-foreground">Camada extra de proteção</p>
              </div>
              <Button size="sm" variant="outline">Configurar</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// COMPONENTE: 2FA
// ============================================================================
function TwoFactorAuth() {
  return (
    <div className="space-y-4">
      <Alert>
        <Smartphone className="h-4 w-4" />
        <AlertTitle>Autenticação de Dois Fatores (2FA)</AlertTitle>
        <AlertDescription>
          O 2FA adiciona uma camada extra de segurança exigindo um código do celular além da senha.
          Recomendado para todos os usuários com acesso a dados sensíveis.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuração do Administrador</CardTitle>
            <CardDescription>
              Configure 2FA para sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">2FA Habilitado</p>
                <p className="text-sm text-muted-foreground">Status atual da sua conta</p>
              </div>
              <Badge variant="outline" className="text-red-600">Desabilitado</Badge>
            </div>

            <div className="border rounded-lg p-4 text-center">
              <Smartphone className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Use um app autenticador como Google Authenticator ou Authy
              </p>
              <Button>Habilitar 2FA</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Política de 2FA</CardTitle>
            <CardDescription>
              Configure quem deve usar 2FA obrigatoriamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Obrigatório para CEO</p>
                <p className="text-sm text-muted-foreground">Usuários com role CEO</p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Obrigatório para Admin</p>
                <p className="text-sm text-muted-foreground">Usuários com role Admin</p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Obrigatório para Financeiro</p>
                <p className="text-sm text-muted-foreground">Usuários com role Financeiro</p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Obrigatório para Todos</p>
                <p className="text-sm text-muted-foreground">Todos os usuários do sistema</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status dos Usuários</CardTitle>
          <CardDescription>
            Visão geral do 2FA por usuário
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Nenhum usuário com 2FA configurado</p>
            <p className="text-sm mt-2">
              Incentive os usuários a habilitarem 2FA para maior segurança
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// COMPONENTE: POLÍTICAS DE SEGURANÇA
// ============================================================================
function SecurityPolicies() {
  return (
    <div className="space-y-4">
      <Alert variant="default" className="bg-yellow-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Nenhuma Política Ativa</AlertTitle>
        <AlertDescription>
          Configure uma política de segurança para definir regras de senha, bloqueio de conta e sessão.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Política de Senhas</CardTitle>
          <CardDescription>
            Defina os requisitos mínimos para senhas dos usuários
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tamanho Mínimo</Label>
              <Input type="number" placeholder="8" defaultValue="8" />
            </div>
            <div className="space-y-2">
              <Label>Expiração (dias)</Label>
              <Input type="number" placeholder="90" defaultValue="90" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Exigir letra maiúscula</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>Exigir letra minúscula</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>Exigir número</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>Exigir caractere especial</Label>
              <Switch />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Política de Bloqueio</CardTitle>
          <CardDescription>
            Configure bloqueio automático após tentativas falhas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tentativas antes do bloqueio</Label>
              <Input type="number" placeholder="5" defaultValue="5" />
            </div>
            <div className="space-y-2">
              <Label>Duração do bloqueio (minutos)</Label>
              <Input type="number" placeholder="30" defaultValue="30" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Política de Sessão</CardTitle>
          <CardDescription>
            Configure timeout e sessões simultâneas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Timeout de sessão (minutos)</Label>
              <Input type="number" placeholder="480" defaultValue="480" />
            </div>
            <div className="space-y-2">
              <Label>Sessões simultâneas máximas</Label>
              <Input type="number" placeholder="3" defaultValue="3" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>Salvar Política</Button>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: BACKUP
// ============================================================================
function BackupManagement() {
  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Backup Não Configurado</AlertTitle>
        <AlertDescription>
          Nenhum backup foi realizado. Configure backup automatizado para proteger seus dados.
          Em caso de falha, todos os dados podem ser perdidos permanentemente.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Último Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">Nunca</div>
            <p className="text-xs text-muted-foreground">Nenhum backup realizado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tamanho do Banco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">~50 MB</div>
            <p className="text-xs text-muted-foreground">Estimativa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Backups Retidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuração de Backup</CardTitle>
          <CardDescription>
            Configure backup automatizado do banco de dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Instruções de Configuração</AlertTitle>
            <AlertDescription>
              O backup automatizado requer configuração no servidor. Entre em contato com o suporte técnico
              ou configure manualmente usando as seguintes opções:
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>Backup via mysqldump (recomendado)</li>
                <li>Backup via snapshot do TiDB</li>
                <li>Exportação manual via Admin → Exportar Dados</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Frequência</Label>
              <select className="w-full p-2 border rounded-md">
                <option value="daily">Diário</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Retenção (dias)</Label>
              <Input type="number" placeholder="30" defaultValue="30" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">
              <Database className="mr-2 h-4 w-4" />
              Backup Manual Agora
            </Button>
            <Button className="flex-1">
              Salvar Configuração
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Backups</CardTitle>
          <CardDescription>
            Nenhum backup realizado ainda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Database className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Nenhum backup encontrado</p>
            <p className="text-sm mt-2">
              Configure backup automatizado ou execute um backup manual
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
