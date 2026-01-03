import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Settings, Save, Building, Bell, Shield, Clock } from "lucide-react";

export default function AdminConfiguracoes() {
  const { data: settings, isLoading, refetch } = trpc.admin.settings.list.useQuery();

  const updateMutation = trpc.admin.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Configuração salva com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao salvar configuração");
    },
  });

  const handleSave = (key: string, value: string, type?: string, category?: string, description?: string) => {
    updateMutation.mutate({ key, value, type: type as any, category, description });
  };

  // Agrupar configurações por categoria
  const groupedSettings = settings?.reduce((acc: any, setting: any) => {
    const cat = setting.category || "geral";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(setting);
    return acc;
  }, {}) || {};

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Configurações do Sistema
        </h1>
        <p className="text-muted-foreground">
          Gerencie as configurações gerais do sistema
        </p>
      </div>

      <Tabs defaultValue="empresa" className="space-y-4">
        <TabsList>
          <TabsTrigger value="empresa" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="sistema" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
              <CardDescription>
                Informações básicas da empresa exibidas no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome da Empresa</Label>
                  <div className="flex gap-2">
                    <Input
                      defaultValue={groupedSettings.empresa?.find((s: any) => s.settingKey === "empresa_nome")?.settingValue || "Coco Litorâneo"}
                      id="empresa_nome"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById("empresa_nome") as HTMLInputElement;
                        handleSave("empresa_nome", input.value, "string", "empresa", "Nome da empresa");
                      }}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>CNPJ</Label>
                  <div className="flex gap-2">
                    <Input
                      defaultValue={groupedSettings.empresa?.find((s: any) => s.settingKey === "empresa_cnpj")?.settingValue || ""}
                      id="empresa_cnpj"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById("empresa_cnpj") as HTMLInputElement;
                        handleSave("empresa_cnpj", input.value, "string", "empresa", "CNPJ da empresa");
                      }}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label>Endereço</Label>
                  <div className="flex gap-2">
                    <Input
                      defaultValue={groupedSettings.empresa?.find((s: any) => s.settingKey === "empresa_endereco")?.settingValue || ""}
                      id="empresa_endereco"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById("empresa_endereco") as HTMLInputElement;
                        handleSave("empresa_endereco", input.value, "string", "empresa", "Endereço da empresa");
                      }}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Segurança</CardTitle>
              <CardDescription>
                Políticas de senha e acesso ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tempo de Sessão (minutos)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      defaultValue={groupedSettings.seguranca?.find((s: any) => s.settingKey === "sessao_timeout")?.settingValue || "60"}
                      id="sessao_timeout"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById("sessao_timeout") as HTMLInputElement;
                        handleSave("sessao_timeout", input.value, "number", "seguranca", "Tempo de expiração da sessão em minutos");
                      }}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Tentativas de Login</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      defaultValue={groupedSettings.seguranca?.find((s: any) => s.settingKey === "login_tentativas")?.settingValue || "5"}
                      id="login_tentativas"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById("login_tentativas") as HTMLInputElement;
                        handleSave("login_tentativas", input.value, "number", "seguranca", "Número máximo de tentativas de login antes do bloqueio");
                      }}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Tempo de Bloqueio (minutos)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      defaultValue={groupedSettings.seguranca?.find((s: any) => s.settingKey === "bloqueio_tempo")?.settingValue || "30"}
                      id="bloqueio_tempo"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById("bloqueio_tempo") as HTMLInputElement;
                        handleSave("bloqueio_tempo", input.value, "number", "seguranca", "Tempo de bloqueio após tentativas excedidas");
                      }}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Notificações</CardTitle>
              <CardDescription>
                Defina quais alertas e notificações devem ser enviados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Alertas de Estoque Baixo</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificar quando itens atingirem estoque mínimo
                    </p>
                  </div>
                  <Switch
                    defaultChecked={groupedSettings.notificacoes?.find((s: any) => s.settingKey === "notif_estoque")?.settingValue === "true"}
                    onCheckedChange={(checked) => {
                      handleSave("notif_estoque", checked.toString(), "boolean", "notificacoes", "Alertas de estoque baixo");
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Alertas de Pagamentos</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificar sobre pagamentos próximos do vencimento
                    </p>
                  </div>
                  <Switch
                    defaultChecked={groupedSettings.notificacoes?.find((s: any) => s.settingKey === "notif_pagamentos")?.settingValue === "true"}
                    onCheckedChange={(checked) => {
                      handleSave("notif_pagamentos", checked.toString(), "boolean", "notificacoes", "Alertas de pagamentos");
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Alertas de Segurança</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificar sobre tentativas de acesso suspeitas
                    </p>
                  </div>
                  <Switch
                    defaultChecked={groupedSettings.notificacoes?.find((s: any) => s.settingKey === "notif_seguranca")?.settingValue !== "false"}
                    onCheckedChange={(checked) => {
                      handleSave("notif_seguranca", checked.toString(), "boolean", "notificacoes", "Alertas de segurança");
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sistema">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Sistema</CardTitle>
              <CardDescription>
                Parâmetros gerais de funcionamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Dias de Validade Padrão (Produto Acabado)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      defaultValue={groupedSettings.sistema?.find((s: any) => s.settingKey === "validade_padrao")?.settingValue || "365"}
                      id="validade_padrao"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById("validade_padrao") as HTMLInputElement;
                        handleSave("validade_padrao", input.value, "number", "sistema", "Dias de validade padrão para produto acabado");
                      }}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Dias para Alerta de Vencimento</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      defaultValue={groupedSettings.sistema?.find((s: any) => s.settingKey === "alerta_vencimento")?.settingValue || "30"}
                      id="alerta_vencimento"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById("alerta_vencimento") as HTMLInputElement;
                        handleSave("alerta_vencimento", input.value, "number", "sistema", "Dias antes do vencimento para alertar");
                      }}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Prazo Padrão de Pagamento (dias)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      defaultValue={groupedSettings.sistema?.find((s: any) => s.settingKey === "prazo_pagamento")?.settingValue || "7"}
                      id="prazo_pagamento"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById("prazo_pagamento") as HTMLInputElement;
                        handleSave("prazo_pagamento", input.value, "number", "sistema", "Prazo padrão de pagamento a produtores");
                      }}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
