# Coco Litorâneo ERP - TODO

## TAREFA 1: Fundação do Sistema ✅

### Estrutura Base
- [x] Configurar identidade visual (paleta coco: #8B7355, #D4C4B0, #5D4E37, #FAF8F5)
- [x] Implementar layout com menu lateral colapsável
- [x] Configurar tema claro como padrão
- [x] Implementar cabeçalho com logo, busca global e menu do usuário

### Módulo 1: Recebimento de Coco
- [x] Criar schema da tabela coconut_loads
- [x] Implementar listagem com filtros (data, produtor, placa, peso, status)
- [x] Implementar modal "Nova Carga" com todos os campos
- [x] Implementar cálculo automático de peso líquido
- [x] Implementar fluxo de status (Recebido → Conferido → Fechado)
- [x] Implementar trava de edição quando status = Fechado
- [ ] Implementar upload de foto da carga (pendente - requer storage)
- [x] Implementar export CSV

### Módulo 2: Produtores/Fornecedores
- [x] Criar schema da tabela producers
- [x] Implementar listagem com filtros
- [x] Implementar modal "Novo Produtor" com todos os campos
- [x] Implementar campo external_code para integração ERP

### Módulo 3: Pagamentos Produtor
- [x] Criar schema da tabela producer_payables
- [x] Implementar geração automática ao fechar carga
- [x] Implementar cálculo automático (peso × preço - desconto)
- [x] Implementar fluxo de status (Pendente → Aprovado → Programado → Pago)
- [x] Implementar destaque visual (atrasados vermelho, próximos amarelo)
- [ ] Implementar upload de comprovante (pendente - requer storage)
- [x] Implementar campos de auditoria (quem aprovou, quem pagou)

### Módulo 4: Almoxarifado Produção
- [x] Criar schema da tabela warehouse_items (produção)
- [x] Criar schema da tabela warehouse_movements
- [x] Implementar listagem com filtros
- [x] Implementar modal "Novo Item" com categorias de produção
- [x] Implementar modal "Nova Movimentação"
- [x] Implementar cálculo automático de estoque
- [x] Implementar alertas de estoque mínimo (badge vermelho)
- [x] Criar seeds dos 15 itens obrigatórios

### Módulo 5: Almoxarifado Gerais
- [x] Criar schema da tabela warehouse_items (gerais)
- [x] Implementar listagem com filtros
- [x] Implementar modal "Novo Item" com categorias gerais
- [x] Implementar modal "Nova Movimentação"
- [x] Criar seeds de itens de limpeza, CIP, EPI, uniformes, manutenção

### Módulo 6: Estoque Produto Acabado
- [x] Criar schema da tabela skus
- [x] Criar schema da tabela finished_goods_inventory
- [x] Criar schema da tabela finished_goods_movements
- [x] Implementar listagem com filtros
- [x] Implementar modal "Novo SKU" com variações
- [x] Implementar campo "Dias de validade"
- [x] Implementar cálculo automático de data de validade
- [x] Implementar alertas de estoque mínimo
- [x] Implementar alertas de validade (≤30 dias amarelo, ≤7 dias vermelho)

### Rastreabilidade
- [x] Implementar campos created_at, created_by, updated_at, updated_by em todas as tabelas
- [x] Exibir informações de rastreabilidade no rodapé dos modais

### Testes Unitários Tarefa 1
- [x] Testes do router producers
- [x] Testes do router coconutLoads
- [x] Testes do router producerPayables
- [x] Testes do router warehouseItems
- [x] Testes do router skus
- [x] Testes do router finishedGoods
- [x] Testes do router seed
- [x] Testes do router auditLogs

## TAREFA 2: Módulos de Gestão ✅
- [x] Módulo Produção - Apontamentos
- [x] Módulo Produção - Problemas do Dia
- [x] Módulo Compras (solicitações + cotações + aprovação)
- [x] Módulo Financeiro (provisões + fluxo de caixa + contas a receber)
- [x] Módulo Qualidade - Análises
- [x] Módulo Qualidade - Não Conformidades
- [x] Módulo Gente & Cultura - Colaboradores
- [x] Módulo Gente & Cultura - Ocorrências
- [x] Testes unitários (19 testes)

## TAREFA 3: Segurança e RBAC ✅

- [x] Tabelas de RBAC no schema (roles, permissions, user_sessions, security_alerts, system_settings)
- [x] Queries de administração no db.ts
- [x] Routers de administração (admin.users, admin.onlineUsers, admin.auditLogs, admin.securityAlerts, admin.settings, admin.sessions)
- [x] Página Gestão de Usuários (AdminUsuarios)
- [x] Página Usuários Online (AdminOnline)
- [x] Página Logs de Auditoria (AdminLogs)
- [x] Página Alertas de Segurança (AdminAlertas)
- [x] Página Configurações do Sistema (AdminConfiguracoes)
- [x] Menu de Administração (apenas para admin)
- [x] Proteção de rotas (apenas admin pode acessar)
- [x] Testes unitários (17 testes)

## TAREFA 4: Dashboard e Finalização ✅

### Dashboard Executivo
- [x] Cards de KPIs (Produção Total, Cargas Recebidas, A Pagar Produtores, Pagamentos Atrasados, Compras Pendentes, NCs Abertas)
- [x] Filtro de período (7 dias, 30 dias, 3 meses, 1 ano)
- [x] Ações rápidas (Nova Carga, Apontamento, Solicitação)
- [x] Gráfico: Produção por SKU/Variação (barras)
- [x] Gráfico: Produção por Turno (pizza)
- [x] Gráfico: Evolução do Recebimento (linha)
- [x] Gráfico: Pagamentos por Status (pizza)
- [x] Lista: Top 5 Produtores por volume
- [x] Lista: Vencimentos próximos (7 dias)
- [x] Lista: Alertas de estoque
- [x] Gráfico: NCs por mês (barras)
- [x] Indicador: Índice de Conformidade (%)
- [x] Tabela: Produtos próximos do vencimento

### Busca Global
- [x] Router de busca global implementado
- [x] Busca em: produtores, cargas, colaboradores, almoxarifado, SKUs, NCs

### Funcionalidades Complementares
- [x] Export CSV em todos os módulos
- [x] Filtros em todas as listagens
- [x] Ordenação em todas as tabelas
- [x] Modais de criação/edição
- [x] Rastreabilidade (created_by/at, updated_by/at)

### Testes Unitários Tarefa 4
- [x] Testes do router dashboard (12 testes)
- [x] Testes do router search (2 testes)

## RESUMO DE TESTES
- Tarefa 1: 15 testes ✅
- Tarefa 2: 19 testes ✅
- Tarefa 3: 17 testes ✅
- Tarefa 4: 14 testes ✅
- Auth: 1 teste ✅
- AI Copilot Backend: 31 testes ✅
- **Total: 97 testes passando**
- Frontend Copiloto: Testes manuais aprovados (Chat, Insights, Alertas, Acoes, Config, Widgets, Botao flutuante)

## CHECKPOINTS
- [x] Checkpoint Tarefa 1: ef966dca
- [x] Checkpoint Tarefa 2: 5f5c0288
- [x] Checkpoint Tarefa 3: ea1a0316
- [ ] Checkpoint Tarefa 4: (pendente)

## PENDÊNCIAS MENORES (não bloqueantes)
- [ ] Upload de foto da carga (requer configuração de storage S3)
- [ ] Upload de comprovante de pagamento (requer configuração de storage S3)
- [ ] Modo escuro/claro (toggle no header)
- [ ] Notificações em tempo real (WebSocket)


## BUG FIXES
- [x] Corrigir query getPaymentsByStatus - nome da coluna totalAmount incorreto (corrigido para totalValue)
- [x] Corrigir query getLoadsEvolution - nome da coluna netWeight incorreto (corrigido para usar receivedAt)
- [x] Corrigir query getProductionByShift - formato de data incorreto (convertido para ISO string)
- [x] Corrigir query getProductionBySkuVariation - formato de data incorreto (convertido para ISO string)
- [x] Corrigir query getDashboardStats - formato de data incorreto (convertido para ISO string)
- [x] Corrigir query getLoadsEvolution - erro de sintaxe SQL no GROUP BY e ORDER BY (usando SQL raw)
- [x] Adicionar foto de coqueiros na página inicial (Dashboard)
- [x] Adicionar foto de coqueiros como fundo da página de login
- [x] Corrigir erro no módulo Financeiro que impede carregamento da página (corrigido: cashFlow retorna weeks, não entries)
- [x] Corrigir página de login - foto de coqueiros deve ocupar TODA a tela de fundo
- [x] Ajustar página de login: botão mais para baixo
- [x] Ajustar página de login: cor do botão marrom coco seco (#8B7355)
- [x] Ajustar página de login: remover card branco, deixar só o botão
- [x] Corrigir fluxo de login: usuários não autenticados devem ver a página com foto de coqueiros primeiro
## UPGRADE: COPILOTO IA

- [x] Definir arquitetura do Copiloto IA
- [x] Definir novas tabelas ai_*
- [x] Definir eventos e onde disparar nas mutations tRPC
- [x] Definir UX (página /copiloto + widgets no Dashboard)
- [x] Listar insights/alertas P0

### TAREFA 2: Backend do Copiloto IA ✅
- [x] Schema Drizzle para tabelas ai_* (ai_events, ai_insights, ai_alerts, ai_conversations, ai_messages, ai_actions, ai_action_approvals, ai_sources, ai_feedback, ai_config)
- [x] Router tRPC ai.* (chat, listConversations, getMessages, createConversation, archiveConversation, listInsights, dismissInsight, resolveInsight, runInsightChecks, listEvents, emitEvent, getQuickSummary, getContext, submitFeedback, listActions, approveAction, rejectAction, getStats)
- [x] Event Emitter para captura de eventos do ERP
- [x] Context Builder para agregação de dados RAG
- [x] Insight Generator com 6 verificações automáticas (estoque crítico, pagamentos atrasados, produtos vencendo, contas vencidas, NCs abertas, compras pendentes)
- [x] Chat Service com integração LLM
- [x] Testes unitários (31 testes)

### TAREFA 3: Frontend do Copiloto IA ✅
- [x] Página /copiloto com 5 abas (Chat, Insights, Alertas, Ações, Config)
- [x] ChatPanel com histórico de conversa e botão de cópia
- [x] InsightCards com badges de severidade e "Ver evidencias"
- [x] AlertsTable com filtros e ações de acknowledge
- [x] ActionsQueue com aprovação/rejeição de ações
- [x] CopilotSettings com configurações de verificações e e-mail
- [x] Widgets no Dashboard (Copiloto IA, Insights do Dia, Alertas Críticos, Pendências)
- [x] Botão flutuante (CopilotFloatingButton) com notificações
- [x] Integração tRPC com TanStack Query e cache invalidation
- [x] Estados loading/empty/error em todos os componentes

### TAREFA 4: Integrações (Pendente)
- [ ] Notificações por e-mail
- [ ] Auditoria de ações executadas
- [ ] Hooks de eventos nas mutations existentes
