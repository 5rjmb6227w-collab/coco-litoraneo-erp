# Auditoria Completa do Sistema ERP Coco Litorâneo
## Data: Janeiro 2026

---

## FASE 1: AUDITORIA DO BANCO DE DADOS (SCHEMA)

### Tabelas Identificadas (Total: 45+ tabelas)

#### Módulo de Autenticação e Usuários
| Tabela | Status | Observações |
|--------|--------|-------------|
| users | ✅ OK | 12 roles definidas, campos de auditoria presentes |
| userSessions | ✅ OK | Controle de sessões ativas |
| passwordHistory | ✅ OK | Histórico para evitar reutilização |
| loginAttempts | ✅ OK | Registro de tentativas de login |
| securityAlerts | ✅ OK | Alertas de segurança |
| userTwoFactor | ✅ OK | Suporte a 2FA (TOTP, SMS, Email) |
| securityPolicies | ✅ OK | Políticas configuráveis |

#### Módulo de Operações (Recebimento)
| Tabela | Status | Observações |
|--------|--------|-------------|
| producers | ✅ OK | Dados bancários, PIX, preço padrão |
| coconutLoads | ✅ OK | Recebimento com foto, status workflow |
| producerPayables | ✅ OK | Workflow de pagamento completo |

#### Módulo de Produção
| Tabela | Status | Observações |
|--------|--------|-------------|
| productionEntries | ✅ OK | Apontamentos por turno |
| productionProblems | ✅ OK | Problemas do dia |
| productionOrders | ✅ OK | Ordens de produção |
| productionGoals | ✅ OK | Metas de produção |
| productionChecklists | ✅ OK | Checklists de turno |
| productionChecklistItems | ✅ OK | Itens do checklist |
| productionStops | ✅ OK | Paradas de produção |
| productionReprocesses | ✅ OK | Reprocessos e perdas |

#### Módulo de Almoxarifado
| Tabela | Status | Observações |
|--------|--------|-------------|
| warehouseItems | ✅ OK | Itens de produção e gerais |
| warehouseMovements | ✅ OK | Movimentações com auditoria |

#### Módulo de Estoque (Produto Acabado)
| Tabela | Status | Observações |
|--------|--------|-------------|
| skus | ✅ OK | SKUs com categoria, variação, validade |
| finishedGoodsInventory | ✅ OK | Controle por lote |
| finishedGoodsMovements | ✅ OK | Movimentações de PA |

#### Módulo de Compras
| Tabela | Status | Observações |
|--------|--------|-------------|
| purchaseRequests | ✅ OK | Solicitações de compra |
| purchaseRequestItems | ✅ OK | Itens das solicitações |
| purchaseOrders | ✅ OK | Pedidos de compra |
| purchaseOrderItems | ✅ OK | Itens dos pedidos |

#### Módulo Financeiro
| Tabela | Status | Observações |
|--------|--------|-------------|
| financialCategories | ✅ OK | Categorias de receita/despesa |
| financialEntries | ✅ OK | Lançamentos financeiros |

#### Módulo de Qualidade
| Tabela | Status | Observações |
|--------|--------|-------------|
| qualityAnalyses | ✅ OK | Análises de qualidade |
| nonConformities | ✅ OK | Não conformidades |
| correctiveActions | ✅ OK | Ações corretivas |

#### Módulo de Pessoas (RH)
| Tabela | Status | Observações |
|--------|--------|-------------|
| employees | ✅ OK | Colaboradores com setor |
| employeeEvents | ✅ OK | Eventos (faltas, atrasos, HE) |
| employeeNotes | ✅ OK | Observações e advertências |

#### Módulo de IA/Copiloto
| Tabela | Status | Observações |
|--------|--------|-------------|
| aiMessages | ✅ OK | Histórico de conversas |
| aiInsights | ✅ OK | Insights gerados |
| aiActions | ✅ OK | Ações sugeridas |
| aiFeedback | ✅ OK | Feedback simples |
| aiFeedbackAdvanced | ✅ OK | Feedback detalhado com rating |
| aiPredictions | ✅ OK | Previsões ML |
| aiConfig | ✅ OK | Configurações do Copiloto |
| aiRetrainLogs | ✅ OK | Logs de retreinamento |
| aiPerformanceReports | ✅ OK | Relatórios de performance |
| aiAbExperiments | ✅ OK | Experimentos A/B |
| aiAgents | ✅ OK | Agentes autônomos |
| aiAgentLogs | ✅ OK | Logs dos agentes |

#### Módulo de Vendas
| Tabela | Status | Observações |
|--------|--------|-------------|
| customers | ✅ OK | Clientes com crédito |
| salesOrders | ✅ OK | Pedidos de venda |
| salesOrderItems | ✅ OK | Itens dos pedidos |

#### Módulo de Custos
| Tabela | Status | Observações |
|--------|--------|-------------|
| productionCosts | ✅ OK | Custos diretos e indiretos |

#### Outros
| Tabela | Status | Observações |
|--------|--------|-------------|
| auditLogs | ✅ OK | Logs de auditoria |
| systemSettings | ✅ OK | Configurações do sistema |
| complianceDocuments | ✅ OK | Documentos de compliance |
| equipments | ✅ OK | Equipamentos |
| sensorReadings | ✅ OK | Leituras de sensores IoT |
| magicMoments | ✅ OK | Momentos mágicos |
| backupRecords | ✅ OK | Registros de backup |

---

### DEFICIÊNCIAS IDENTIFICADAS NO SCHEMA

#### 1. CRÍTICAS (Impactam funcionamento)

| ID | Problema | Impacto | Solução Sugerida |
|----|----------|---------|------------------|
| DB-001 | Falta de índices explícitos | Performance em consultas | Adicionar índices em FKs e campos de busca |
| DB-002 | Falta de constraints de FK no Drizzle | Integridade referencial não garantida | Adicionar .references() nas FKs |
| DB-003 | Campo `actionsSuggested` com typo | Inconsistência | Corrigir para `actionsSuggested` (linha 1170) |

#### 2. IMPORTANTES (Melhorias recomendadas)

| ID | Problema | Impacto | Solução Sugerida |
|----|----------|---------|------------------|
| DB-004 | Falta de soft delete em algumas tabelas | Perda de histórico | Adicionar campo deletedAt |
| DB-005 | Campos de valor monetário sem precisão adequada | Arredondamentos | Usar precision: 14, scale: 4 para valores |
| DB-006 | Falta de campo version para controle de concorrência | Race conditions | Adicionar campo version para optimistic locking |

#### 3. SUGESTÕES DE MELHORIA

| ID | Sugestão | Benefício |
|----|----------|-----------|
| DB-007 | Criar tabela de notificações genérica | Centralizar notificações |
| DB-008 | Adicionar campo de prioridade em purchaseRequests | Melhor gestão de compras |
| DB-009 | Criar tabela de metas por colaborador | Gestão de performance |

---


## FASE 2: AUDITORIA DOS ROUTERS E APIs DO BACKEND

### Routers Identificados (Total: 35 routers)

| Router | Procedures | Status | Observações |
|--------|------------|--------|-------------|
| auth | 2 | ✅ OK | me, logout |
| producers | 4 | ✅ OK | list, getById, create, update |
| coconutLoads | 4 | ✅ OK | list, getById, create, update |
| producerPayables | 5 | ✅ OK | list, getById, approve, schedule, pay |
| warehouseItems | 5 | ✅ OK | list, getById, create, update, move |
| skus | 4 | ✅ OK | list, getById, create, update |
| finishedGoods | 4 | ✅ OK | list, getById, move, inventory |
| seed | 1 | ✅ OK | runAll |
| auditLogs | 1 | ✅ OK | list |
| production.entries | 4 | ✅ OK | list, create, update, delete |
| production.issues | 4 | ✅ OK | list, create, update, resolve |
| production.orders | 4 | ✅ OK | list, create, update, updateStatus |
| production.goals | 3 | ✅ OK | list, create, update |
| production.checklists | 4 | ✅ OK | listToday, create, checkItem, finalize |
| production.stops | 3 | ✅ OK | listActive, register, finalize |
| production.reprocesses | 3 | ✅ OK | listPending, register, finalize |
| purchases | 8 | ✅ OK | requests, orders, approve, receive |
| financial | 5 | ✅ OK | categories, entries, summary |
| quality.analyses | 4 | ✅ OK | list, create, update, approve |
| quality.nonConformities | 5 | ✅ OK | list, create, update, close |
| quality.correctiveActions | 4 | ✅ OK | list, create, update, verify |
| employees | 4 | ✅ OK | list, create, update, terminate |
| employees.events | 3 | ✅ OK | list, create, delete |
| employees.notes | 3 | ✅ OK | list, create, delete |
| admin.users | 5 | ✅ OK | list, create, update, roles |
| admin.onlineUsers | 2 | ✅ OK | list, kick |
| admin.auditLogs | 1 | ✅ OK | list |
| admin.securityAlerts | 3 | ✅ OK | list, markRead, markAllRead |
| admin.settings | 3 | ✅ OK | get, update, list |
| admin.sessions | 2 | ✅ OK | list, terminate |
| dashboard | 3 | ✅ OK | stats, charts, recent |
| search | 1 | ✅ OK | global |
| ai | 10+ | ✅ OK | chat, insights, actions, feedback |
| system | 2 | ✅ OK | notifyOwner, health |

**Total de Procedures: 108**

### BUGS CRÍTICOS ENCONTRADOS

| ID | Bug | Severidade | Impacto |
|----|-----|------------|---------|
| BUG-001 | **Página /dashboard retorna 404** | 🔴 CRÍTICO | Usuário não consegue acessar o Dashboard |

---


## FASE 11: TESTES DE FUNCIONALIDADES VIA BROWSER

### Páginas Testadas

| Página | URL | Status | Observações |
|--------|-----|--------|-------------|
| Dashboard | / | ✅ OK | Funcionando, mostra KPIs e gráficos |
| Dashboard | /dashboard | ⚠️ 404 | Rota não existe, redireciona para 404 |
| Recebimento | /recebimento | ✅ OK | Modal Nova Carga funciona |
| Produtores | /produtores | ✅ OK | Lista e filtros funcionam |
| Pagamentos | /pagamentos | ✅ OK | Workflow de pagamento |
| Compras | /compras | ✅ OK | Solicitações e sugestões |
| Financeiro | /financeiro | ✅ OK | Lançamentos e fluxo de caixa |
| Qualidade - Análises | /qualidade/analises | ✅ OK | Filtros funcionam |
| Qualidade - NCs | /qualidade/ncs | ✅ OK | Lista NCs |
| Colaboradores | /rh/colaboradores | ✅ OK | Cadastro de colaboradores |
| Usuários | /admin/usuarios | ✅ OK | Gestão de usuários |
| Copiloto IA | /copiloto | ✅ OK | Chat funciona, responde perguntas |
| OP & Metas | /producao/expandida | ✅ OK | Kanban, modais funcionam |
| Agentes IA | /ia/agentes | ✅ OK | Lista 6 agentes |
| Momentos Mágicos | /ia/momentos-magicos | ✅ OK | 12 momentos configuráveis |
| Segurança | /admin/seguranca | ✅ OK | Dashboard de segurança |

### BUGS IDENTIFICADOS NOS TESTES

| ID | Bug | Severidade | Página |
|----|-----|------------|--------|
| BUG-001 | Rota /dashboard retorna 404 | 🟡 MÉDIO | Dashboard |
| BUG-002 | Menu lateral duplicado em algumas páginas | 🟡 MÉDIO | Copiloto, Dashboard |
| BUG-003 | Falta validação de campos obrigatórios em alguns modais | 🟡 MÉDIO | Vários |

### FUNCIONALIDADES TESTADAS COM SUCESSO

1. **Copiloto IA** - Responde perguntas corretamente
2. **Nova Carga** - Modal abre e campos funcionam
3. **Filtros** - Funcionam em todas as páginas
4. **Navegação** - Menu lateral funciona corretamente
5. **Autenticação** - Usuário logado aparece corretamente
6. **Exportar CSV** - Botões presentes em todas as páginas

---

