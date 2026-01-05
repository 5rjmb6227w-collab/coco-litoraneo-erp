/**
 * IntegrationsTutorial - Tutorial in-app para configurações de integrações
 * Bloco 9/9 - Guia interativo para WhatsApp, Zapier, Calendar e métricas
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  HelpCircle, 
  MessageSquare, 
  Zap, 
  Calendar, 
  BarChart3, 
  Shield, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle,
  Circle,
  ExternalLink,
  Copy,
  Play,
  X
} from "lucide-react";

// ============================================================================
// TIPOS
// ============================================================================

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface TutorialSection {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  steps: TutorialStep[];
  estimatedTime: string;
}

// ============================================================================
// CONTEÚDO DOS TUTORIAIS
// ============================================================================

const tutorialSections: TutorialSection[] = [
  {
    id: "whatsapp",
    title: "WhatsApp (Twilio)",
    icon: MessageSquare,
    description: "Configure notificações via WhatsApp para alertas críticos",
    estimatedTime: "10 min",
    steps: [
      {
        id: "whatsapp_1",
        title: "Criar conta Twilio",
        description: "Acesse twilio.com e crie uma conta gratuita",
        content: (
          <div className="space-y-4">
            <p>Para começar, você precisa de uma conta Twilio:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Acesse <a href="https://www.twilio.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">twilio.com</a></li>
              <li>Clique em "Sign Up" e crie sua conta</li>
              <li>Verifique seu e-mail e telefone</li>
              <li>Você receberá créditos gratuitos para teste</li>
            </ol>
            <div className="bg-muted p-3 rounded-lg text-sm">
              <strong>Dica:</strong> A conta trial permite enviar mensagens para números verificados. Para produção, faça upgrade.
            </div>
          </div>
        ),
      },
      {
        id: "whatsapp_2",
        title: "Ativar WhatsApp Sandbox",
        description: "Configure o sandbox do WhatsApp para testes",
        content: (
          <div className="space-y-4">
            <p>No console Twilio:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Vá em "Messaging" → "Try it out" → "Send a WhatsApp message"</li>
              <li>Siga as instruções para conectar seu WhatsApp ao sandbox</li>
              <li>Envie a mensagem de ativação para o número indicado</li>
              <li>Aguarde a confirmação</li>
            </ol>
            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg text-sm border border-green-200 dark:border-green-800">
              <strong>✓ Sandbox ativo:</strong> Você pode testar envio de mensagens imediatamente.
            </div>
          </div>
        ),
      },
      {
        id: "whatsapp_3",
        title: "Obter credenciais",
        description: "Copie Account SID e Auth Token",
        content: (
          <div className="space-y-4">
            <p>No console Twilio, encontre suas credenciais:</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Account SID</p>
                  <p className="text-xs text-muted-foreground">Identificador da sua conta</p>
                </div>
                <Button variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Auth Token</p>
                  <p className="text-xs text-muted-foreground">Token de autenticação (mantenha secreto)</p>
                </div>
                <Button variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">WhatsApp Number</p>
                  <p className="text-xs text-muted-foreground">Número do sandbox ou número próprio</p>
                </div>
                <Button variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "whatsapp_4",
        title: "Configurar no ERP",
        description: "Adicione as credenciais nas configurações",
        content: (
          <div className="space-y-4">
            <p>Agora configure no sistema:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Vá em <strong>Configurações → Integrações → WhatsApp</strong></li>
              <li>Cole o Account SID, Auth Token e número</li>
              <li>Adicione os números de telefone dos destinatários</li>
              <li>Selecione quais alertas devem ser enviados</li>
              <li>Clique em "Testar Conexão"</li>
            </ol>
            <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg text-sm border border-yellow-200 dark:border-yellow-800">
              <strong>⚠️ Importante:</strong> Mantenha o Auth Token seguro. Nunca compartilhe publicamente.
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "zapier",
    title: "Zapier",
    icon: Zap,
    description: "Automatize fluxos com Google Sheets, Slack e mais",
    estimatedTime: "15 min",
    steps: [
      {
        id: "zapier_1",
        title: "Criar conta Zapier",
        description: "Acesse zapier.com e crie uma conta",
        content: (
          <div className="space-y-4">
            <p>Zapier conecta o ERP a milhares de aplicativos:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Acesse <a href="https://zapier.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">zapier.com</a></li>
              <li>Crie uma conta gratuita (100 tarefas/mês)</li>
              <li>Explore os apps disponíveis</li>
            </ol>
            <div className="grid grid-cols-4 gap-2 mt-4">
              {["Google Sheets", "Slack", "Gmail", "Trello", "Notion", "Airtable", "HubSpot", "Salesforce"].map(app => (
                <Badge key={app} variant="secondary" className="justify-center py-1">
                  {app}
                </Badge>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: "zapier_2",
        title: "Criar Webhook",
        description: "Configure um webhook para receber dados do ERP",
        content: (
          <div className="space-y-4">
            <p>Crie um Zap com trigger de Webhook:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Clique em "Create Zap"</li>
              <li>Escolha "Webhooks by Zapier" como trigger</li>
              <li>Selecione "Catch Hook"</li>
              <li>Copie a URL do webhook gerada</li>
            </ol>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">URL do Webhook (exemplo):</p>
              <code className="text-sm break-all">https://hooks.zapier.com/hooks/catch/123456/abcdef/</code>
            </div>
          </div>
        ),
      },
      {
        id: "zapier_3",
        title: "Configurar ação",
        description: "Escolha o que fazer com os dados recebidos",
        content: (
          <div className="space-y-4">
            <p>Exemplos de automações úteis:</p>
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <p className="font-medium">📊 Exportar para Google Sheets</p>
                <p className="text-sm text-muted-foreground">Adicione linhas automaticamente quando houver novos recebimentos</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="font-medium">💬 Notificar no Slack</p>
                <p className="text-sm text-muted-foreground">Envie alertas para canais específicos da equipe</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="font-medium">📧 Enviar e-mail</p>
                <p className="text-sm text-muted-foreground">Notifique stakeholders sobre eventos importantes</p>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "zapier_4",
        title: "Conectar ao ERP",
        description: "Cole a URL do webhook nas configurações",
        content: (
          <div className="space-y-4">
            <p>Finalize a configuração:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Vá em <strong>Configurações → Integrações → Zapier</strong></li>
              <li>Cole a URL do webhook</li>
              <li>Selecione os eventos que devem disparar o webhook</li>
              <li>Clique em "Testar Webhook"</li>
              <li>Volte ao Zapier e verifique se os dados chegaram</li>
            </ol>
            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg text-sm border border-green-200 dark:border-green-800">
              <strong>✓ Pronto!</strong> Agora você pode criar automações complexas sem código.
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "calendar",
    title: "Google Calendar",
    icon: Calendar,
    description: "Sincronize vencimentos com seu calendário",
    estimatedTime: "8 min",
    steps: [
      {
        id: "calendar_1",
        title: "Autorizar acesso",
        description: "Conecte sua conta Google",
        content: (
          <div className="space-y-4">
            <p>Para sincronizar vencimentos:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Vá em <strong>Configurações → Integrações → Google Calendar</strong></li>
              <li>Clique em "Conectar com Google"</li>
              <li>Faça login na sua conta Google</li>
              <li>Autorize o acesso ao calendário</li>
            </ol>
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm border border-blue-200 dark:border-blue-800">
              <strong>ℹ️ Permissões:</strong> O ERP só terá acesso para criar e editar eventos. Seus outros dados permanecem privados.
            </div>
          </div>
        ),
      },
      {
        id: "calendar_2",
        title: "Escolher calendário",
        description: "Selecione onde criar os eventos",
        content: (
          <div className="space-y-4">
            <p>Recomendamos criar um calendário dedicado:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>No Google Calendar, crie um novo calendário "Coco Litorâneo - Vencimentos"</li>
              <li>Volte ao ERP e selecione este calendário</li>
              <li>Assim você pode compartilhar apenas este calendário com a equipe</li>
            </ol>
            <div className="flex gap-2 mt-4">
              <Badge className="bg-red-500">Pagamentos</Badge>
              <Badge className="bg-green-500">Recebimentos</Badge>
              <Badge className="bg-orange-500">Despesas</Badge>
              <Badge className="bg-pink-500">Atrasados</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Cores dos eventos por tipo</p>
          </div>
        ),
      },
      {
        id: "calendar_3",
        title: "Configurar lembretes",
        description: "Defina quando receber notificações",
        content: (
          <div className="space-y-4">
            <p>Configure lembretes automáticos:</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 border rounded">
                <span>7 dias antes</span>
                <Badge variant="outline">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between p-2 border rounded">
                <span>3 dias antes</span>
                <Badge variant="outline">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between p-2 border rounded">
                <span>1 dia antes</span>
                <Badge variant="outline">Ativo</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Você receberá notificações do Google Calendar nos horários configurados.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    id: "metrics",
    title: "Métricas e KPIs",
    icon: BarChart3,
    description: "Entenda o dashboard de observabilidade",
    estimatedTime: "5 min",
    steps: [
      {
        id: "metrics_1",
        title: "Visão geral",
        description: "Conheça os principais indicadores",
        content: (
          <div className="space-y-4">
            <p>O dashboard de métricas mostra:</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded-lg">
                <p className="font-medium">⚡ Latência</p>
                <p className="text-sm text-muted-foreground">Tempo de resposta do sistema</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="font-medium">📊 Requisições</p>
                <p className="text-sm text-muted-foreground">Volume de uso por módulo</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="font-medium">⚠️ Erros</p>
                <p className="text-sm text-muted-foreground">Taxa e origem de falhas</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="font-medium">🤖 Copiloto</p>
                <p className="text-sm text-muted-foreground">Performance da IA</p>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "metrics_2",
        title: "Interpretando dados",
        description: "O que cada métrica significa",
        content: (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <p className="font-medium text-green-700 dark:text-green-300">✓ Saudável</p>
                <p className="text-sm">Latência &lt; 500ms, Taxa de erro &lt; 1%</p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="font-medium text-yellow-700 dark:text-yellow-300">⚠️ Atenção</p>
                <p className="text-sm">Latência 500-1000ms, Taxa de erro 1-5%</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <p className="font-medium text-red-700 dark:text-red-300">✗ Crítico</p>
                <p className="text-sm">Latência &gt; 1000ms, Taxa de erro &gt; 5%</p>
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "lgpd",
    title: "LGPD e Privacidade",
    icon: Shield,
    description: "Conformidade com a Lei Geral de Proteção de Dados",
    estimatedTime: "5 min",
    steps: [
      {
        id: "lgpd_1",
        title: "Seus direitos",
        description: "O que a LGPD garante",
        content: (
          <div className="space-y-4">
            <p>Como usuário, você tem direito a:</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span><strong>Acesso:</strong> Saber quais dados temos sobre você</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span><strong>Portabilidade:</strong> Exportar seus dados</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span><strong>Correção:</strong> Atualizar dados incorretos</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span><strong>Exclusão:</strong> Solicitar remoção de dados</span>
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: "lgpd_2",
        title: "Exportar seus dados",
        description: "Como baixar uma cópia dos seus dados",
        content: (
          <div className="space-y-4">
            <p>Para exportar seus dados:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Vá em <strong>Configurações → Privacidade → Meus Dados</strong></li>
              <li>Clique em "Exportar Dados"</li>
              <li>Aguarde a geração do relatório</li>
              <li>Baixe o arquivo JSON com todos os seus dados</li>
            </ol>
            <Button className="w-full mt-4">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ir para Configurações de Privacidade
            </Button>
          </div>
        ),
      },
    ],
  },
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function IntegrationsTutorial() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const currentSection = tutorialSections.find(s => s.id === activeSection);
  const totalSteps = currentSection?.steps.length || 0;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const handleStepComplete = () => {
    if (currentSection) {
      const stepId = currentSection.steps[currentStep].id;
      setCompletedSteps(prev => new Set([...Array.from(prev), stepId]));
      
      if (currentStep < totalSteps - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleSectionSelect = (sectionId: string) => {
    setActiveSection(sectionId);
    setCurrentStep(0);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      setActiveSection(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="h-4 w-4 mr-2" />
          Tutorial de Integrações
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {activeSection ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleBack}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {currentSection?.title}
              </div>
            ) : (
              "Tutoriais de Configuração"
            )}
          </DialogTitle>
          <DialogDescription>
            {activeSection 
              ? `Passo ${currentStep + 1} de ${totalSteps}`
              : "Aprenda a configurar as integrações do sistema"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {!activeSection ? (
            // Lista de seções
            <div className="grid gap-3">
              {tutorialSections.map(section => {
                const Icon = section.icon;
                const sectionSteps = section.steps.map(s => s.id);
                const completedCount = sectionSteps.filter(id => completedSteps.has(id)).length;
                const isComplete = completedCount === section.steps.length;

                return (
                  <Card 
                    key={section.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSectionSelect(section.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${isComplete ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}>
                          <Icon className={`h-5 w-5 ${isComplete ? "text-green-600" : ""}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium">{section.title}</h3>
                            <Badge variant="outline">{section.estimatedTime}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{section.description}</p>
                          {completedCount > 0 && (
                            <Progress 
                              value={(completedCount / section.steps.length) * 100} 
                              className="h-1 mt-2"
                            />
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            // Conteúdo do passo atual
            <div className="space-y-4">
              <Progress value={progress} className="h-2" />
              
              {/* Indicadores de passos */}
              <div className="flex justify-center gap-2">
                {currentSection?.steps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(index)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                      index === currentStep 
                        ? "bg-primary text-primary-foreground"
                        : completedSteps.has(step.id)
                        ? "bg-green-500 text-white"
                        : "bg-muted"
                    }`}
                  >
                    {completedSteps.has(step.id) ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </button>
                ))}
              </div>

              {/* Conteúdo do passo */}
              {currentSection && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {currentSection.steps[currentStep].title}
                    </CardTitle>
                    <CardDescription>
                      {currentSection.steps[currentStep].description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {currentSection.steps[currentStep].content}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {activeSection && (
          <DialogFooter className="flex-shrink-0">
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={handleStepComplete}>
                {currentStep === totalSteps - 1 ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Concluir
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// TOOLTIP DE AJUDA CONTEXTUAL
// ============================================================================

export function HelpTooltip({ 
  content, 
  children 
}: { 
  content: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-64">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover" />
      </div>
    </div>
  );
}

export default IntegrationsTutorial;
