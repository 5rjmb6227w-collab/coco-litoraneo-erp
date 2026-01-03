import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import Recebimento from "./pages/Recebimento";
import Produtores from "./pages/Produtores";
import Pagamentos from "./pages/Pagamentos";
import AlmoxarifadoProducao from "./pages/AlmoxarifadoProducao";
import AlmoxarifadoGeral from "./pages/AlmoxarifadoGeral";
import EstoqueProdutoAcabado from "./pages/EstoqueProdutoAcabado";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/recebimento" component={Recebimento} />
        <Route path="/produtores" component={Produtores} />
        <Route path="/pagamentos" component={Pagamentos} />
        <Route path="/almoxarifado/producao" component={AlmoxarifadoProducao} />
        <Route path="/almoxarifado/geral" component={AlmoxarifadoGeral} />
        <Route path="/estoque" component={EstoqueProdutoAcabado} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="bottom-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
