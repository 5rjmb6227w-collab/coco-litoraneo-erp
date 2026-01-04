/**
 * CopilotSettings - Configurações do Copiloto IA (somente admin/CEO)
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Settings, 
  Clock, 
  Bell, 
  Mail, 
  AlertTriangle,
  Save,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface CopilotConfig {
  insightCheckInterval: number; // minutos
  alertEmailEnabled: boolean;
  alertEmailRecipients: string[];
  stockCriticalThreshold: number; // % do mínimo
  paymentOverdueThreshold: number; // dias
  expirationWarningDays: number;
  ncOpenThreshold: number; // dias
  purchaseRequestThreshold: number; // dias
  autoGenerateInsights: boolean;
  autoSendAlerts: boolean;
}

const defaultConfig: CopilotConfig = {
  insightCheckInterval: 60,
  alertEmailEnabled: true,
  alertEmailRecipients: [],
  stockCriticalThreshold: 50,
  paymentOverdueThreshold: 3,
  expirationWarningDays: 30,
  ncOpenThreshold: 7,
  purchaseRequestThreshold: 3,
  autoGenerateInsights: true,
  autoSendAlerts: true,
};

export function CopilotSettings() {
  const [config, setConfig] = useState<CopilotConfig>(defaultConfig);
  const [emailInput, setEmailInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simular salvamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success("Configurações salvas com sucesso!");
  };

  const handleAddEmail = () => {
    if (emailInput && emailInput.includes("@")) {
      setConfig(prev => ({
        ...prev,
        alertEmailRecipients: [...prev.alertEmailRecipients, emailInput],
      }));
      setEmailInput("");
    }
  };

  const handleRemoveEmail = (email: string) => {
    setConfig(prev => ({
      ...prev,
      alertEmailRecipients: prev.alertEmailRecipients.filter(e => e !== email),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-stone-800">Configurações do Copiloto</h2>
        </div>

        <Button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-amber-600 hover:bg-amber-700"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar
        </Button>
      </div>

      {/* Verificações automáticas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Verificações Automáticas
          </CardTitle>
          <CardDescription>
            Configure quando e como o Copiloto deve verificar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Gerar insights automaticamente</Label>
              <p className="text-sm text-stone-500">
                O Copiloto verifica o sistema periodicamente
              </p>
            </div>
            <Switch
              checked={config.autoGenerateInsights}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ ...prev, autoGenerateInsights: checked }))
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Intervalo de verificação</Label>
              <Select 
                value={String(config.insightCheckInterval)}
                onValueChange={(value) => 
                  setConfig(prev => ({ ...prev, insightCheckInterval: Number(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">A cada 15 minutos</SelectItem>
                  <SelectItem value="30">A cada 30 minutos</SelectItem>
                  <SelectItem value="60">A cada 1 hora</SelectItem>
                  <SelectItem value="120">A cada 2 horas</SelectItem>
                  <SelectItem value="240">A cada 4 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Limites de Alerta
          </CardTitle>
          <CardDescription>
            Defina quando o Copiloto deve gerar alertas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Estoque crítico (%)</Label>
              <p className="text-xs text-stone-500">
                % do estoque mínimo para considerar crítico
              </p>
              <Input
                type="number"
                value={config.stockCriticalThreshold}
                onChange={(e) => 
                  setConfig(prev => ({ ...prev, stockCriticalThreshold: Number(e.target.value) }))
                }
                min={0}
                max={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Pagamento atrasado (dias)</Label>
              <p className="text-xs text-stone-500">
                Dias após vencimento para alertar
              </p>
              <Input
                type="number"
                value={config.paymentOverdueThreshold}
                onChange={(e) => 
                  setConfig(prev => ({ ...prev, paymentOverdueThreshold: Number(e.target.value) }))
                }
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label>Aviso de validade (dias)</Label>
              <p className="text-xs text-stone-500">
                Dias antes do vencimento para alertar
              </p>
              <Input
                type="number"
                value={config.expirationWarningDays}
                onChange={(e) => 
                  setConfig(prev => ({ ...prev, expirationWarningDays: Number(e.target.value) }))
                }
                min={1}
              />
            </div>

            <div className="space-y-2">
              <Label>NC aberta (dias)</Label>
              <p className="text-xs text-stone-500">
                Dias para alertar sobre NC sem resolução
              </p>
              <Input
                type="number"
                value={config.ncOpenThreshold}
                onChange={(e) => 
                  setConfig(prev => ({ ...prev, ncOpenThreshold: Number(e.target.value) }))
                }
                min={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Solicitação pendente (dias)</Label>
              <p className="text-xs text-stone-500">
                Dias para alertar sobre compra pendente
              </p>
              <Input
                type="number"
                value={config.purchaseRequestThreshold}
                onChange={(e) => 
                  setConfig(prev => ({ ...prev, purchaseRequestThreshold: Number(e.target.value) }))
                }
                min={1}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notificações por e-mail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Notificações por E-mail
          </CardTitle>
          <CardDescription>
            Configure quem recebe alertas por e-mail
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enviar alertas por e-mail</Label>
              <p className="text-sm text-stone-500">
                Alertas críticos serão enviados automaticamente
              </p>
            </div>
            <Switch
              checked={config.alertEmailEnabled}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ ...prev, alertEmailEnabled: checked }))
              }
            />
          </div>

          {config.alertEmailEnabled && (
            <>
              <Separator />
              
              <div className="space-y-2">
                <Label>Destinatários</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="email@exemplo.com"
                    onKeyDown={(e) => e.key === "Enter" && handleAddEmail()}
                  />
                  <Button variant="outline" onClick={handleAddEmail}>
                    Adicionar
                  </Button>
                </div>

                {config.alertEmailRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {config.alertEmailRecipients.map((email) => (
                      <div
                        key={email}
                        className="flex items-center gap-1 px-2 py-1 bg-stone-100 rounded text-sm"
                      >
                        <span>{email}</span>
                        <button
                          onClick={() => handleRemoveEmail(email)}
                          className="text-stone-500 hover:text-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enviar automaticamente</Label>
                  <p className="text-sm text-stone-500">
                    Alertas críticos são enviados imediatamente
                  </p>
                </div>
                <Switch
                  checked={config.autoSendAlerts}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({ ...prev, autoSendAlerts: checked }))
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Informações */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">Sobre as configurações</h4>
              <p className="text-sm text-amber-700 mt-1">
                As alterações entram em vigor imediatamente após salvar. 
                Verificações manuais podem ser executadas na aba "Insights".
                Apenas administradores e o CEO podem alterar estas configurações.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
