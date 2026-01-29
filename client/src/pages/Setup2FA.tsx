import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, Copy, Check, QrCode } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function Setup2FA() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"intro" | "setup" | "verify" | "done">("intro");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  const { data: status, isLoading: statusLoading } = trpc.authLocal.get2FAStatus.useQuery();
  
  const setupMutation = trpc.authLocal.setup2FA.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setStep("setup");
      } else {
        setError(data.error || "Erro ao configurar 2FA");
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const confirmMutation = trpc.authLocal.confirm2FA.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setStep("done");
      } else {
        setError(data.error || "Código inválido");
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSetup = () => {
    setError("");
    setupMutation.mutate();
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    confirmMutation.mutate({ code });
  };

  const copyToClipboard = (text: string, type: "secret" | "backup") => {
    navigator.clipboard.writeText(text);
    if (type === "secret") {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    }
  };

  if (statusLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#8B7355]/10 rounded-lg">
                <Shield className="h-6 w-6 text-[#8B7355]" />
              </div>
              <div>
                <CardTitle>Autenticação em Duas Etapas (2FA)</CardTitle>
                <CardDescription>
                  Adicione uma camada extra de segurança à sua conta
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {status?.enabled ? (
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-700 mb-2">
                  2FA Ativado
                </h3>
                <p className="text-muted-foreground mb-4">
                  Sua conta está protegida com autenticação em duas etapas.
                </p>
                <Button 
                  variant="outline"
                  onClick={handleSetup}
                  disabled={setupMutation.isPending}
                >
                  Reconfigurar 2FA
                </Button>
              </div>
            ) : step === "intro" ? (
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-amber-800 mb-2">Por que usar 2FA?</h4>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• Protege sua conta mesmo se sua senha for comprometida</li>
                    <li>• Requerido para acessar dados financeiros sensíveis</li>
                    <li>• Padrão de segurança recomendado para sistemas empresariais</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">O que você vai precisar:</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#8B7355]/10 flex items-center justify-center text-xs font-medium text-[#8B7355]">1</div>
                      Um aplicativo autenticador (Google Authenticator, Authy, Microsoft Authenticator)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#8B7355]/10 flex items-center justify-center text-xs font-medium text-[#8B7355]">2</div>
                      Escanear o QR Code ou digitar a chave secreta
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#8B7355]/10 flex items-center justify-center text-xs font-medium text-[#8B7355]">3</div>
                      Confirmar com o código gerado
                    </li>
                  </ul>
                </div>

                <Button 
                  className="w-full bg-[#8B7355] hover:bg-[#5D4E37]"
                  onClick={handleSetup}
                  disabled={setupMutation.isPending}
                >
                  {setupMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Configurando...
                    </>
                  ) : (
                    "Começar Configuração"
                  )}
                </Button>
              </div>
            ) : step === "setup" && setupMutation.data?.success ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto w-48 h-48 bg-white border rounded-lg flex items-center justify-center mb-4">
                    <QrCode className="h-32 w-32 text-gray-400" />
                    <span className="sr-only">QR Code</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Escaneie o QR Code acima com seu aplicativo autenticador
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    URL: {setupMutation.data.qrCodeUrl}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Ou digite a chave manualmente:</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={setupMutation.data.secret} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(setupMutation.data?.secret || "", "secret")}
                    >
                      {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">Códigos de Backup</h4>
                  <p className="text-sm text-red-700 mb-3">
                    Guarde estes códigos em um local seguro. Você pode usá-los se perder acesso ao seu autenticador.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {setupMutation.data.backupCodes?.map((code, i) => (
                      <code key={i} className="text-sm bg-white px-2 py-1 rounded border">
                        {code}
                      </code>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(setupMutation.data?.backupCodes?.join("\n") || "", "backup")}
                  >
                    {copiedBackup ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    Copiar todos
                  </Button>
                </div>

                <Button 
                  className="w-full bg-[#8B7355] hover:bg-[#5D4E37]"
                  onClick={() => setStep("verify")}
                >
                  Continuar para Verificação
                </Button>
              </div>
            ) : step === "verify" ? (
              <form onSubmit={handleVerify} className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2">Verificar Configuração</h3>
                  <p className="text-sm text-muted-foreground">
                    Digite o código de 6 dígitos do seu aplicativo autenticador para confirmar a configuração.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verify-code">Código de Verificação</Label>
                  <Input
                    id="verify-code"
                    type="text"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center text-2xl tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep("setup")}
                  >
                    Voltar
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1 bg-[#8B7355] hover:bg-[#5D4E37]"
                    disabled={confirmMutation.isPending || code.length !== 6}
                  >
                    {confirmMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      "Confirmar"
                    )}
                  </Button>
                </div>
              </form>
            ) : step === "done" ? (
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-700 mb-2">
                  2FA Configurado com Sucesso!
                </h3>
                <p className="text-muted-foreground mb-4">
                  Sua conta agora está protegida com autenticação em duas etapas.
                </p>
                <Button 
                  className="bg-[#8B7355] hover:bg-[#5D4E37]"
                  onClick={() => setLocation("/admin/seguranca")}
                >
                  Voltar para Segurança
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
