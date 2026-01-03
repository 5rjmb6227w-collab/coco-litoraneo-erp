# Coco Litorâneo ERP - TODO

## TAREFA 1: Fundação do Sistema

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
- [ ] Criar seeds dos 9 SKUs obrigatórios (3 categorias × 3 variações) - usuário cadastrará manualmente

### Rastreabilidade
- [x] Implementar campos created_at, created_by, updated_at, updated_by em todas as tabelas
- [x] Exibir informações de rastreabilidade no rodapé dos modais

### Testes Unitários
- [x] Testes do router producers
- [x] Testes do router coconutLoads
- [x] Testes do router producerPayables
- [x] Testes do router warehouseItems
- [x] Testes do router skus
- [x] Testes do router finishedGoods
- [x] Testes do router seed
- [x] Testes do router auditLogs

## TAREFA 2: Módulos de Gestão
- [ ] Módulo Produção (apontamentos + problemas do dia)
- [ ] Módulo Compras (solicitações + cotações + aprovação)
- [ ] Módulo Financeiro (provisões + fluxo de caixa + contas a receber)
- [ ] Módulo Qualidade (análises + NCs + ações corretivas + gráficos)
- [ ] Módulo Gente & Cultura (colaboradores + faltas + horas extras)

## TAREFA 3: Segurança e RBAC
- [ ] Sistema de login
- [ ] Gestão de usuários
- [ ] 10 perfis pré-definidos
- [ ] Matriz RBAC
- [ ] Monitoramento de usuários online
- [ ] Logs de auditoria

## TAREFA 4: Dashboard e Finalização
- [ ] Dashboard com KPIs
- [ ] Sistema de notificações
- [ ] Busca global
- [ ] Modo escuro/claro
- [ ] Export CSV padronizado
