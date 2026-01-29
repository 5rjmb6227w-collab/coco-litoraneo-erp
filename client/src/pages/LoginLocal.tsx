import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, Shield, Eye, EyeOff } from "lucide-react";

export default function LoginLocal() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"login" | "2fa">("login");
  const [sessionToken, setSessionToken] = useState("");
  const [twoFACode, setTwoFACode] = useState("");

  const loginMutation = trpc.authLocal.login.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        if (data.requires2FA) {
          setSessionToken(data.sessionToken || "");
          setStep("2fa");
          setError("");
        } else {
          // Login completo, redirecionar
          window.location.href = "/";
        }
      } else {
        setError(data.error || "Erro ao fazer login");
      }
    },
    onError: (err) => {
      setError(err.message || "Erro ao fazer login");
    },
  });

  const verify2FAMutation = trpc.authLocal.verify2FA.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        window.location.href = "/";
      } else {
        setError(data.error || "Código inválido");
      }
    },
    onError: (err) => {
      setError(err.message || "Erro ao verificar código");
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ email, password });
  };

  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    verify2FAMutation.mutate({ sessionToken, code: twoFACode });
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: "url('/coconut-trees.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      
      <Card className="w-full max-w-md relative z-10 bg-white/95 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-[#8B7355] rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-[#5D4E37]">
            {step === "login" ? "Entrar no Sistema" : "Verificação em Duas Etapas"}
          </CardTitle>
          <CardDescription>
            {step === "login" 
              ? "Digite suas credenciais para acessar o ERP Coco Litorâneo"
              : "Digite o código do seu aplicativo autenticador"
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#8B7355] hover:bg-[#5D4E37]"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>

              <div className="text-center">
                <a 
                  href="/recuperar-senha" 
                  className="text-sm text-[#8B7355] hover:underline"
                >
                  Esqueceu sua senha?
                </a>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código de Verificação</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-muted-foreground text-center">
                  Abra seu aplicativo autenticador (Google Authenticator, Authy, etc.) e digite o código de 6 dígitos.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#8B7355] hover:bg-[#5D4E37]"
                disabled={verify2FAMutation.isPending || twoFACode.length !== 6}
              >
                {verify2FAMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Verificar"
                )}
              </Button>

              <Button 
                type="button" 
                variant="ghost" 
                className="w-full"
                onClick={() => {
                  setStep("login");
                  setTwoFACode("");
                  setSessionToken("");
                }}
              >
                Voltar ao login
              </Button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground mb-2">Ou entre com</p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = "/api/oauth/login"}
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 mr-2" />
              Continuar com Google (Manus)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
