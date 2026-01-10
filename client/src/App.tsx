import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";

// Pages - Tarefa 1
import Dashboard from "./pages/Dashboard";
import Recebimento from "./pages/Recebimento";
import Produtores from "./pages/Produtores";
import Pagamentos from "./pages/Pagamentos";
import AlmoxarifadoProducao from "./pages/AlmoxarifadoProducao";
import AlmoxarifadoGeral from "./pages/AlmoxarifadoGeral";
import EstoqueProdutoAcabado from "./pages/EstoqueProdutoAcabado";

// Pages - Tarefa 2
import ProducaoApontamentos from "./pages/ProducaoApontamentos";
import ProducaoProblemas from "./pages/ProducaoProblemas";
import Compras from "./pages/Compras";
import Financeiro from "./pages/Financeiro";
import QualidadeAnalises from "./pages/QualidadeAnalises";
import QualidadeNaoConformidades from "./pages/QualidadeNaoConformidades";
import GenteColaboradores from "./pages/GenteColaboradores";
import GenteOcorrencias from "./pages/GenteOcorrencias";

// Pages - Tarefa 3 (Administração)
import AdminUsuarios from "./pages/AdminUsuarios";
import AdminOnline from "./pages/AdminOnline";
import AdminLogs from "./pages/AdminLogs";
import AdminAlertas from "./pages/AdminAlertas";
import AdminConfiguracoes from "./pages/AdminConfiguracoes";

// Página de Login
import Login from "./pages/Login";

// Copiloto IA
import Copiloto from "./pages/Copiloto";
import CopilotPerformance from "./pages/CopilotPerformance";
import AdminMetrics from "./pages/AdminMetrics";
import ProductionExpanded from "./pages/ProductionExpanded";
import AdminSecurity from "./pages/AdminSecurity";
import AIAgents from "./pages/AIAgents";
import MagicMoments from "./pages/MagicMoments";
import { CopilotFloatingButton } from "./components/copilot/CopilotFloatingButton";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        {/* Tarefa 1 */}
        <Route path="/" component={Dashboard} />
        <Route path="/recebimento" component={Recebimento} />
        <Route path="/produtores" component={Produtores} />
        <Route path="/pagamentos" component={Pagamentos} />
        <Route path="/almoxarifado/producao" component={AlmoxarifadoProducao} />
        <Route path="/almoxarifado/geral" component={AlmoxarifadoGeral} />
        <Route path="/estoque" component={EstoqueProdutoAcabado} />
        
        {/* Tarefa 2 */}
        <Route path="/producao/apontamentos" component={ProducaoApontamentos} />
        <Route path="/producao/problemas" component={ProducaoProblemas} />
        <Route path="/compras" component={Compras} />
        <Route path="/financeiro" component={Financeiro} />
        <Route path="/qualidade/analises" component={QualidadeAnalises} />
        <Route path="/qualidade/ncs" component={QualidadeNaoConformidades} />
        <Route path="/rh/colaboradores" component={GenteColaboradores} />
        <Route path="/rh/ocorrencias" component={GenteOcorrencias} />
        
        {/* Tarefa 3 - Administração */}
        <Route path="/admin/usuarios" component={AdminUsuarios} />
        <Route path="/admin/online" component={AdminOnline} />
        <Route path="/admin/logs" component={AdminLogs} />
        <Route path="/admin/alertas" component={AdminAlertas} />
        <Route path="/admin/configuracoes" component={AdminConfiguracoes} />
        
        {/* Copiloto IA */}
        <Route path="/copiloto" component={Copiloto} />
        <Route path="/copiloto/performance" component={CopilotPerformance} />
        <Route path="/admin/metricas" component={AdminMetrics} />
        <Route path="/admin/seguranca" component={AdminSecurity} />
        
        {/* Produção Expandida */}
        <Route path="/producao/expandida" component={ProductionExpanded} />
        
        {/* IA Avançada */}
        <Route path="/ia/agentes" component={AIAgents} />
        <Route path="/ia/momentos-magicos" component={MagicMoments} />
        
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

// Rota de Login (sem DashboardLayout)
function LoginRouter() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="bottom-right" />
          <Switch>
            <Route path="/login" component={Login} />
            <Route>
              <Router />
              <CopilotFloatingButton />
            </Route>
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
