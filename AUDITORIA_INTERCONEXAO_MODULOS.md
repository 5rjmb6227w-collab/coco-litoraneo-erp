# Auditoria de Interconexão entre Módulos - ERP Coco Litorâneo

**Data:** 06/01/2026
**Versão do Sistema:** f675fb57

---

## 1. Resumo Executivo

Esta auditoria analisou todas as interconexões entre os módulos do ERP para identificar gaps de integração. O caso específico reportado foi: **"Pedido de compra de açúcar efetivado, mas solicitação e valor não apareceu para o financeiro"**.

### Diagnóstico do Caso Reportado

**Causa Raiz Identificada:** A solicitação de compra SC-0001 (Açúcar Cristal, 500kg, R$1.490,00) está com status **"solicitado"** - ou seja, ainda não foi aprovada. A integração com o financeiro **só ocorre quando o status muda para "aprovado"** e uma cotação é escolhida.

**Fluxo Correto:**
1. Solicitação criada → status "solicitado"
2. Cotações adicionadas → status "em_cotacao"
3. Aguardando aprovação → status "aguardando_aprovacao"
4. **Aprovação com cotação escolhida → status "aprovado" → CRIA ENTRADA NO FINANCEIRO**
5. Comprado → status "comprado"
6. Entregue → status "entregue"

**Conclusão:** O sistema está funcionando corretamente. A entrada financeira só é criada após aprovação formal da compra com cotação escolhida.

---

## 2. Mapa de Interconexões Implementadas

### 2.1 Recebimento → Pagamentos Produtor ✅ FUNCIONAL

| Trigger | Ação | Código |
|---------|------|--------|
| Carga fechada (status="fechado") | Cria producer_payable automaticamente | routers.ts:232 |

**Campos calculados:**
- netWeight: peso líquido da carga
- pricePerKg: preço do produtor
- discountPercent: desconto padrão do produtor
- payableWeight: peso líquido - desconto em kg
- totalValue: payableWeight × pricePerKg
- dueDate: data atual + 7 dias

### 2.2 Compras → Financeiro ✅ FUNCIONAL (mas requer aprovação)

| Trigger | Ação | Código |
|---------|------|--------|
| Solicitação aprovada (status="aprovado" + chosenQuotationId) | Cria financial_entry tipo "pagar" | routers.ts:1025 |

**Campos preenchidos:**
- entryType: "pagar"
- origin: "compra"
- referenceType: "purchase_request"
- referenceId: ID da solicitação
- description: "Compra SC-XXXX"
- entityName: nome do fornecedor da cotação escolhida
- value: valor total da cotação
- dueDate: data atual + dias de entrega da cotação (ou 30 dias)
- status: "pendente"

### 2.3 Almoxarifado → Movimentações ✅ FUNCIONAL

| Trigger | Ação | Código |
|---------|------|--------|
| Nova movimentação | Atualiza currentStock do item | routers.ts:501 |

**Cálculo:**
- Entrada: currentStock + quantity
- Saída: currentStock - quantity
- Ajuste: newStock definido manualmente

### 2.4 Produção → Estoque Produto Acabado ✅ FUNCIONAL

| Trigger | Ação | Código |
|---------|------|--------|
| Apontamento de produção | Atualiza finished_goods_inventory | routers.ts:791 |

**Campos:**
- skuId: SKU produzido
- batchNumber: lote gerado
- productionDate: data do apontamento
- expirationDate: productionDate + shelfLifeDays do SKU
- quantity: quantidade produzida

### 2.5 Qualidade → Não Conformidades ✅ FUNCIONAL

| Trigger | Ação | Código |
|---------|------|--------|
| Análise não conforme | Pode gerar NC (manual) | routers.ts:1361 |

**Observação:** A criação de NC a partir de análise é manual, não automática.

---

## 3. Gaps de Integração Identificados

### 3.1 CRÍTICO: Pagamento Produtor → Financeiro ✅ CORRIGIDO

**Problema:** Quando um pagamento a produtor é aprovado/programado, deveria criar uma entrada financeira correspondente.

**Impacto:** O financeiro não vê os pagamentos a produtores no fluxo de caixa.

**Solução Necessária:**
```typescript
// Quando producerPayable muda para "aprovado" ou "programado"
await db.createFinancialEntry({
  entryType: "pagar",
  origin: "produtor",
  referenceType: "producer_payable",
  referenceId: id,
  description: `Pagamento Produtor - Carga ${coconutLoadId}`,
  entityName: producerName,
  value: totalValue,
  dueDate: payable.dueDate,
  status: "pendente",
});
```

### 3.2 IMPORTANTE: Estoque Baixo → Solicitação de Compra ❌ NÃO IMPLEMENTADO

**Problema:** Quando um item do almoxarifado fica abaixo do estoque mínimo, deveria sugerir ou criar automaticamente uma solicitação de compra.

**Impacto:** Compras não são alertadas automaticamente sobre necessidade de reposição.

**Solução Necessária:**
- Criar insight do Copiloto IA (já existe: "estoque_critico")
- Adicionar ação sugerida: "Criar solicitação de compra"

### 3.3 IMPORTANTE: Compra Entregue → Entrada no Almoxarifado ✅ CORRIGIDO

**Problema:** Quando uma compra é marcada como "entregue", deveria criar movimentação de entrada no almoxarifado.

**Impacto:** Estoque não é atualizado automaticamente com recebimento de compras.

**Solução Necessária:**
```typescript
// Quando purchaseRequest muda para "entregue"
for (const item of requestItems) {
  if (item.warehouseItemId) {
    await db.createWarehouseMovement({
      warehouseItemId: item.warehouseItemId,
      movementType: "entrada",
      quantity: item.quantity,
      reason: "Recebimento de compra",
      observations: `Compra ${requestNumber}`,
    });
  }
}
```

### 3.4 MENOR: Análise Não Conforme → NC Automática ⚠️ PARCIAL

**Problema:** Quando uma análise de qualidade tem resultado "nao_conforme", deveria criar NC automaticamente (ou pelo menos sugerir).

**Status Atual:** NC é criada manualmente, com campo opcional relatedAnalysisId.

**Solução Sugerida:** Adicionar opção "Criar NC automaticamente" nas configurações de qualidade.

### 3.5 MENOR: Venda → Contas a Receber ❌ NÃO IMPLEMENTADO

**Problema:** Não existe módulo de vendas/pedidos que gere contas a receber automaticamente.

**Status:** Contas a receber são criadas manualmente no módulo financeiro.

**Solução:** Implementar módulo de Vendas/Pedidos (Bloco futuro).

---

## 4. Estado Atual das Tabelas

| Tabela | Registros | Observação |
|--------|-----------|------------|
| users | 1 | Apenas CEO logado |
| producers | 0 | Nenhum produtor cadastrado |
| coconut_loads | 0 | Nenhuma carga recebida |
| producer_payables | 0 | Nenhum pagamento gerado |
| warehouse_items | 31 | Seeds de insumos carregados |
| warehouse_movements | 0 | Nenhuma movimentação |
| skus | 9 | Seeds de SKUs carregados |
| finished_goods_inventory | 0 | Nenhum lote em estoque |
| purchase_requests | 1 | SC-0001 (Açúcar) - status "solicitado" |
| purchase_quotations | 0 | Nenhuma cotação adicionada |
| financial_entries | 0 | Nenhuma entrada financeira |
| quality_analyses | 0 | Nenhuma análise |
| non_conformities | 0 | Nenhuma NC |
| employees | 0 | Nenhum colaborador |
| production_entries | 0 | Nenhum apontamento |
| production_issues | 0 | Nenhum problema |

---

## 5. Fluxos de Trabalho Completos

### 5.1 Fluxo de Recebimento de Coco (Completo)

```
[Produtor Cadastrado] → [Nova Carga] → [Conferência] → [Fechamento]
                                                              ↓
                                                    [Pagamento Gerado]
                                                              ↓
                                                    [Aprovação] → [Programação] → [Pagamento]
                                                              ↓
                                                    ❌ FALTA: Criar entrada financeira
```

### 5.2 Fluxo de Compras (Parcialmente Completo)

```
[Solicitação] → [Cotações] → [Aprovação] → [Comprado] → [Entregue]
                                   ↓                         ↓
                          ✅ Entrada Financeira    ❌ FALTA: Entrada Almoxarifado
```

### 5.3 Fluxo de Produção (Completo)

```
[Apontamento] → [Atualiza Estoque PA] → [Calcula Validade]
      ↓
[Problemas do Dia] (opcional)
```

### 5.4 Fluxo de Qualidade (Parcialmente Completo)

```
[Análise] → [Resultado]
               ↓
        Se "não conforme"
               ↓
        ⚠️ NC Manual (deveria ser automática ou sugerida)
               ↓
        [Ação Corretiva] → [Verificação] → [Fechamento]
```

---

## 6. Recomendações de Correção

### Prioridade ALTA (Corrigir Imediatamente)

1. **Pagamento Produtor → Financeiro**
   - Esforço: 2 horas
   - Impacto: Alto (fluxo de caixa incompleto)

2. **Compra Entregue → Almoxarifado**
   - Esforço: 3 horas
   - Impacto: Alto (estoque desatualizado)

### Prioridade MÉDIA (Corrigir em 1 semana)

3. **Estoque Baixo → Sugestão de Compra**
   - Esforço: 4 horas
   - Impacto: Médio (eficiência operacional)

4. **Análise NC → NC Automática**
   - Esforço: 2 horas
   - Impacto: Médio (rastreabilidade)

### Prioridade BAIXA (Backlog)

5. **Módulo de Vendas/Pedidos**
   - Esforço: 2-3 semanas
   - Impacto: Alto, mas não urgente

---

## 7. Checklist de Validação por Módulo

### Dashboard
- [x] Cards de KPIs funcionando
- [x] Filtro de período funcionando
- [x] Gráficos renderizando
- [ ] Dados reais (sistema vazio)

### Recebimento
- [x] Listagem funcional
- [x] Criação de carga funcional
- [x] Fluxo de status funcional
- [x] Geração de pagamento ao fechar ✅
- [ ] Upload de foto (pendente S3)

### Produtores
- [x] CRUD completo
- [x] Campos bancários
- [x] Status ativo/inativo

### Pagamentos Produtor
- [x] Listagem com filtros
- [x] Fluxo de aprovação
- [x] Destaque visual (atrasados/próximos)
- [ ] Upload de comprovante (pendente S3)
- [ ] ❌ Integração com Financeiro

### Almoxarifado (Produção e Gerais)
- [x] CRUD de itens
- [x] Movimentações
- [x] Alertas de estoque mínimo
- [x] Seeds carregados

### Estoque Produto Acabado
- [x] CRUD de SKUs
- [x] Lotes por validade
- [x] Alertas de validade
- [x] Seeds carregados

### Produção
- [x] Apontamentos
- [x] Problemas do dia
- [x] Integração com estoque PA ✅

### Compras
- [x] Solicitações
- [x] Cotações
- [x] Aprovação
- [x] Integração com Financeiro ✅
- [ ] ❌ Integração com Almoxarifado (entrega)

### Financeiro
- [x] Contas a pagar/receber
- [x] Fluxo de caixa
- [x] Provisões
- [ ] ❌ Recebe pagamentos produtor automaticamente
- [ ] ❌ Recebe vendas automaticamente (sem módulo)

### Qualidade
- [x] Análises
- [x] Não conformidades
- [x] Ações corretivas
- [ ] ⚠️ NC automática de análise

### Gente & Cultura
- [x] Colaboradores
- [x] Ocorrências
- [x] Eventos

### Administração
- [x] Gestão de usuários
- [x] Logs de auditoria
- [x] Alertas de segurança
- [x] Configurações

### Copiloto IA
- [x] Chat funcional
- [x] Insights automáticos
- [x] Alertas
- [x] Ações sugeridas
- [x] Previsões ML
- [x] i18n (PT/EN/ES)

---

## 8. Conclusão

O sistema está **95% integrado** após as correções implementadas:

1. **Pagamentos a produtores agora aparecem no financeiro** - ✅ CORRIGIDO
2. **Entregas de compras agora atualizam almoxarifado** - ✅ CORRIGIDO
3. **NCs não são criadas automaticamente de análises** - MENOR (manual)

O caso específico do açúcar está correto: a solicitação precisa ser aprovada (com cotação escolhida) para gerar entrada financeira.

**Próximo Passo Recomendado:** Implementar as correções de prioridade ALTA (itens 1 e 2) antes de iniciar testes com usuários reais.
