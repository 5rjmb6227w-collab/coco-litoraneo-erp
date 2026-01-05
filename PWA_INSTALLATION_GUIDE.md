# Guia de Instalação PWA - Coco Litorâneo ERP

## O que é PWA?

O **Progressive Web App (PWA)** permite instalar o sistema Coco Litorâneo diretamente no seu dispositivo móvel ou computador, funcionando como um aplicativo nativo com:

- ✅ Acesso offline aos dados críticos
- ✅ Notificações push para alertas
- ✅ Ícone na tela inicial
- ✅ Sincronização automática ao reconectar

---

## Instalação no iPhone/iPad (iOS)

### Passo a Passo:

1. **Abra o Safari** (obrigatório - não funciona em outros navegadores no iOS)
2. **Acesse o sistema**: `https://seu-dominio.manus.space`
3. **Toque no ícone de compartilhar** (quadrado com seta para cima)
4. **Role para baixo** e toque em **"Adicionar à Tela de Início"**
5. **Confirme o nome** "Coco Litorâneo" e toque em **"Adicionar"**

### Requisitos iOS:
- iOS 11.3 ou superior
- Safari como navegador
- Conexão inicial com internet para instalação

### Recursos Disponíveis no iOS:
- ✅ Ícone na tela inicial
- ✅ Tela cheia (sem barra do Safari)
- ✅ Cache offline de dados
- ⚠️ Notificações push (iOS 16.4+)
- ⚠️ Background sync limitado

---

## Instalação no Android

### Passo a Passo (Chrome):

1. **Abra o Chrome**
2. **Acesse o sistema**: `https://seu-dominio.manus.space`
3. **Aguarde o banner** "Adicionar à tela inicial" aparecer
   - Se não aparecer, toque nos **3 pontos** (menu) → **"Instalar app"**
4. **Confirme** tocando em **"Instalar"**

### Passo a Passo (Samsung Internet):

1. **Abra o Samsung Internet**
2. **Acesse o sistema**
3. **Toque no menu** (3 linhas) → **"Adicionar página a"** → **"Tela inicial"**

### Requisitos Android:
- Android 5.0 ou superior
- Chrome 45+ ou Samsung Internet 4+

### Recursos Disponíveis no Android:
- ✅ Ícone na tela inicial
- ✅ Tela cheia
- ✅ Cache offline completo
- ✅ Notificações push
- ✅ Background sync
- ✅ Badging de notificações

---

## Instalação no Desktop (Windows/Mac/Linux)

### Chrome/Edge:

1. **Acesse o sistema** no navegador
2. **Clique no ícone de instalação** (na barra de endereço, lado direito)
3. **Confirme** clicando em **"Instalar"**

### Alternativa:
- Menu (3 pontos) → **"Instalar Coco Litorâneo..."**

---

## Funcionalidades Offline

### Dados Disponíveis Offline:

| Módulo | Visualização | Criação | Edição |
|--------|--------------|---------|--------|
| Dashboard | ✅ Cache | ❌ | ❌ |
| Insights IA | ✅ Cache | ❌ | ❌ |
| Alertas | ✅ Cache | ❌ | ✅ Acknowledge |
| Chat Copiloto | ✅ Histórico | ⏳ Fila | ❌ |
| Produção | ✅ Cache | ⏳ Fila | ⏳ Fila |
| Estoque | ✅ Cache | ⏳ Fila | ⏳ Fila |

**Legenda:**
- ✅ Disponível offline
- ⏳ Salvo em fila, sincroniza ao reconectar
- ❌ Requer conexão

### Como Funciona a Sincronização:

1. **Offline**: Ações são salvas localmente no IndexedDB
2. **Reconexão detectada**: Sistema inicia sync automático
3. **Conflitos**: Versão mais recente prevalece (timestamp)
4. **Notificação**: Usuário é avisado quando sync completa

---

## Notificações Push

### Configuração:

1. **Acesse o Copiloto IA** → **Configurações**
2. **Ative "Notificações Push"**
3. **Permita** quando o navegador solicitar
4. **Selecione** os tipos de alerta desejados:
   - 🔴 Alertas críticos (sempre ativo)
   - 🟡 Insights importantes
   - 🟢 Resumo diário

### Tipos de Notificação:

| Tipo | Prioridade | Som | Vibração |
|------|------------|-----|----------|
| Estoque crítico | Alta | ✅ | ✅ |
| Pagamento atrasado | Alta | ✅ | ✅ |
| NC aberta >7 dias | Média | ✅ | ❌ |
| Produto vencendo | Média | ✅ | ❌ |
| Resumo diário | Baixa | ❌ | ❌ |

---

## Solução de Problemas

### App não instala:

1. **Verifique a conexão** com internet
2. **Limpe o cache** do navegador
3. **Tente em modo anônimo** primeiro
4. **Verifique HTTPS** - deve começar com `https://`

### Notificações não chegam:

1. **Verifique permissões** do navegador/sistema
2. **iOS**: Certifique-se de ter iOS 16.4+
3. **Android**: Verifique se o app não está em "economia de bateria"
4. **Reative** nas configurações do Copiloto

### Dados não sincronizam:

1. **Verifique conexão** com internet
2. **Force sync**: Puxe a tela para baixo (pull-to-refresh)
3. **Verifique conflitos** no painel de sincronização
4. **Limpe cache** se persistir (perderá dados offline)

### Ícone não aparece na tela inicial:

1. **Reinstale** o PWA
2. **Verifique espaço** de armazenamento
3. **Reinicie** o dispositivo

---

## Requisitos Técnicos

### Navegadores Suportados:

| Navegador | Versão Mínima | PWA Completo |
|-----------|---------------|--------------|
| Chrome | 45+ | ✅ |
| Safari (iOS) | 11.3+ | ⚠️ Parcial |
| Edge | 17+ | ✅ |
| Firefox | 44+ | ⚠️ Parcial |
| Samsung Internet | 4+ | ✅ |

### Espaço Necessário:

- **Instalação inicial**: ~5 MB
- **Cache de dados**: ~20-50 MB (varia com uso)
- **Máximo recomendado**: 100 MB

---

## Suporte

Em caso de dúvidas ou problemas:

1. **Acesse** Administração → Configurações → Suporte
2. **Descreva** o problema com prints se possível
3. **Informe** dispositivo e versão do navegador

---

*Última atualização: Janeiro 2026*
*Versão do PWA: 1.0.0*
