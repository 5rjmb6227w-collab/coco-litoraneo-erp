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
import LoginLocal from "./pages/LoginLocal";
import Setup2FA from "./pages/Setup2FA";
import Custos from "./pages/Custos";
import CalendarioProducao from "./pages/CalendarioProducao";
import Relatorios from "./pages/Relatorios";
import { useKeyboardShortcuts } from "./components/KeyboardShortcuts";
import HistoricoPrecos from "./pages/HistoricoPrecos";
import RankingProdutores from "./pages/RankingProdutores";
import DashboardCEO from "./pages/DashboardCEO";
import DashboardGerente from "./pages/DashboardGerente";
import DashboardOperador from "./pages/DashboardOperador";
import OrcamentoPreparacao from "./pages/OrcamentoPreparacao";
import OrcamentoAcompanhamento from "./pages/OrcamentoAcompanhamento";
import OrcamentoAnaliseIA from "./pages/OrcamentoAnaliseIA";
import OrcamentoCenarios from "./pages/OrcamentoCenarios";
import OrcamentoCAPEX from "./pages/OrcamentoCAPEX";
import OrcamentoForecast from "./pages/OrcamentoForecast";
import OrcamentoAprovacao from "./pages/OrcamentoAprovacao";
import OrcamentoRelatorios from "./pages/OrcamentoRelatorios";
import Lotes from "./pages/Lotes";
import Alertas from "./pages/Alertas";
import Rastreabilidade from "./pages/Rastreabilidade";
import BOMReceitas from "./pages/BOMReceitas";
import DashboardQualidade from "./pages/DashboardQualidade";
import CadastroProdutos from "./pages/CadastroProdutos";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        {/* Tarefa 1 */}
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/dashboard/ceo" component={DashboardCEO} />
        <Route path="/dashboard/gerente" component={DashboardGerente} />
        <Route path="/dashboard/operador" component={DashboardOperador} />
        <Route path="/recebimento" component={Recebimento} />
        <Route path="/produtores" component={Produtores} />
        <Route path="/pagamentos" component={Pagamentos} />
        <Route path="/almoxarifado/producao" component={AlmoxarifadoProducao} />
        <Route path="/almoxarifado/geral" component={AlmoxarifadoGeral} />
        <Route path="/estoque" component={EstoqueProdutoAcabado} />
        <Route path="/cadastro/produtos" component={CadastroProdutos} />
        
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
        
        {/* Gestão de Custos */}
        <Route path="/custos" component={Custos} />
        
        {/* Calendário de Produção */}
        <Route path="/producao/calendario" component={CalendarioProducao} />
        
        {/* Relatórios */}
        <Route path="/relatorios" component={Relatorios} />
        
        {/* Histórico de Preços */}
        <Route path="/historico-precos" component={HistoricoPrecos} />
        
        {/* Ranking de Produtores */}
        <Route path="/ranking-produtores" component={RankingProdutores} />
        
        {/* Orçamento */}
        <Route path="/orcamento/preparacao" component={OrcamentoPreparacao} />
        <Route path="/orcamento/acompanhamento" component={OrcamentoAcompanhamento} />
        <Route path="/orcamento/analise-ia" component={OrcamentoAnaliseIA} />
        <Route path="/orcamento/cenarios" component={OrcamentoCenarios} />
        <Route path="/orcamento/capex" component={OrcamentoCAPEX} />
        <Route path="/orcamento/forecast" component={OrcamentoForecast} />
        <Route path="/orcamento/aprovacao" component={OrcamentoAprovacao} />
        <Route path="/orcamento/relatorios" component={OrcamentoRelatorios} />
        
        {/* Gestão de Lotes */}
        <Route path="/lotes" component={Lotes} />
        
        {/* Central de Alertas */}
        <Route path="/alertas" component={Alertas} />
        
        {/* Rastreabilidade */}
        <Route path="/rastreabilidade" component={Rastreabilidade} />
        
        {/* BOM / Receitas */}
        <Route path="/bom-receitas" component={BOMReceitas} />
        
        {/* Dashboard de Qualidade */}
        <Route path="/qualidade/dashboard" component={DashboardQualidade} />
        
        {/* Segurança e Autenticação */}
        <Route path="/seguranca/2fa" component={Setup2FA} />
        
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

function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  useKeyboardShortcuts();
  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <Toaster richColors position="bottom-right" />
          <KeyboardShortcutsProvider>
            <Switch>
              <Route path="/login" component={Login} />
              <Route path="/login-local" component={LoginLocal} />
              <Route>
                <Router />
                <CopilotFloatingButton />
              </Route>
            </Switch>
          </KeyboardShortcutsProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
