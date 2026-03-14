# 🚀 DELIVERY TECH - Sistema Completo de Gestão

## 📱 Visão Geral

Sistema de delivery com 4 níveis de acesso (Admin, Vendedor, Cliente, Motorista) com design dark tech futurista, cores neon vibrantes e efeitos pulsantes.

## 🎨 Design

- **Tema**: Dark Tech Futurista
- **Cores Principais**:
  - Cyan Neon: `#00f0ff` (Principal)
  - Magenta Neon: `#ff00ff` (Accent)
  - Verde Neon: `#00ff41` (Success)
  - Roxo: `#8b5cf6` (Secondary)
  - Pink: `#ff006e` (Alert)
- **Efeitos**: Animações pulsantes, gradientes, sombras neon, blur effects

## 🏗️ Estrutura

### 1. Página de Login (`/`)
- 2 opções: Acessar Conta | Inserir Código
- Não permite criação de conta sem convite
- Design com background animado e efeitos neon

### 2. Painel Admin (`/admin`)
**Acesso**: Usuário admin com PIN

**Funcionalidades**:
- **Dashboard**: KPIs, gráficos de vendas, estatísticas gerais
- **Usuários**: Hierarquia de vendedores com clientes e motoristas vinculados
- **Código de Convite**: Geração de códigos para novos vendedores
- **Taxa Admin**: Configuração de % sobre vendas de cada vendedor
- **Segurança**: Troca de senhas PIN de todos os usuários
- **API**: Configuração da API PIXWAVE para recebimento em DEPIX
- **Faturamento**: Detalhamento de vendas e valores a repassar

### 3. Painel Vendedor (`/vendedor`)
**Acesso**: Vendedor com username e PIN
**Botão Online/Offline**: Controla visibilidade da loja para clientes

**Funcionalidades**:
- **Dashboard**: Vendas, clientes ativos, motoristas, gráficos
- **Chat**: Sistema tipo WhatsApp
  - Clientes: bordas verdes (online) / cinzas (offline)
  - Motoristas: mesmas indicações visuais
  - Envio de produtos no chat com cálculo automático
  - Botões: vídeo, ligação, áudio, câmera, galeria, produtos
- **Produtos**: Cadastro com nome, descrição e valor
- **Relatórios**: Valor total, taxa admin, taxa motorista, líquido
- **Códigos de Convite**: Geração para clientes e motoristas
- **Recebimentos**: Endereço DEPIX e histórico
- **Taxa Motorista**: Configuração de taxa fixa e % por motorista

### 4. Painel Cliente (`/cliente`)
**Acesso**: Cliente com username e reconhecimento facial

**Funcionalidades**:
- **Chat**: Lista de vendedores
  - Bordas verdes (online) / cinzas (offline)
  - Recebe produtos enviados pelo vendedor
  - Seleciona quantidade e realiza pagamento PIX
  - Botões: vídeo, ligação, áudio, câmera, galeria, localização
- **Adicionar Vendedor**: Inserir código de convite
- **Pedidos**: Status do pedido
  - Pagamento aprovado: "Parabéns! Recebemos seu pagamento"
  - Motorista aceito: Chat temporário com motorista
  - Entregue: Status final (chat temporário some)

### 5. Painel Motorista (`/motorista`)
**Acesso**: Motorista com username e PIN
**Botão Online/Offline**: Controla recebimento de notificações

**Funcionalidades**:
- **Chat**:
  - Vendedor (permanente): bordas verdes/cinzas
  - Clientes (temporário): aparece ao aceitar pedido
  - Botão confirmar entrega (remove chat temporário)
- **Relatórios**: Comissões, entregas, valores recebidos
  - Separação por taxa fixa e % de vendas
  - Filtros por data

## 🔐 Fluxo de Cadastro

### Admin
1. Acessa com username e PIN predefinido

### Vendedor
1. Recebe código do admin
2. Insere código na tela inicial
3. Preenche: foto, nome da loja, WhatsApp, username
4. Cria PIN de 6 dígitos (estilo iPhone)
5. Confirma PIN

### Cliente
1. Recebe código do vendedor
2. Insere código na tela inicial
3. Preenche: username, WhatsApp
4. Configura reconhecimento facial

### Motorista
1. Recebe código do vendedor
2. Insere código na tela inicial
3. Preenche: foto, nome, WhatsApp, username
4. Cria PIN de 6 dígitos
5. Confirma PIN

## 💳 Sistema de Pagamentos

- **API**: PIXWAVE
- **Moeda**: DEPIX (carteira descentralizada)
- **Fluxo**:
  1. Cliente seleciona quantidade
  2. Sistema gera QR Code PIX
  3. Status: "Aguardando Pagamento..."
  4. Confirmação: "Pagamento Efetuado com Sucesso"
  5. Notificação para motorista
  6. Motorista aceita e entrega
  7. Confirmação final

## 📊 Hierarquia de Comissões

```
Venda Total (100%)
  ├─ Taxa Admin (configurável por vendedor)
  ├─ Taxa Motorista (taxa fixa + % vendas)
  └─ Vendedor (valor restante)
```

## 🎯 Recursos Técnicos

- **Framework**: React + TypeScript
- **Roteamento**: React Router (Data Mode)
- **Animações**: Motion (Framer Motion)
- **Gráficos**: Recharts
- **Ícones**: Lucide React
- **Estilização**: Tailwind CSS v4
- **Backend**: Supabase (DB, Auth, Storage)

## 🔔 Notificações

- Vendedor recebe quando fica online
- Motorista recebe solicitação de entrega ao ficar online
- Cliente recebe status de pedido
- Indicadores visuais (bordas pulsantes, animações)

## 🎨 Componentes Principais

- `LoginPage`: Tela inicial com 2 modos
- `AdminPanel`: Painel completo do admin
- `VendedorPanel`: Painel com botão online/offline
- `ClientePanel`: Painel com chat e pedidos
- `MotoristaPanel`: Painel com notificações e entregas
- `SidebarLayout`: Layout com menu lateral animado
- `StatCard`: Cards de estatísticas com efeitos
- `RegisterFlow`: Fluxo de cadastro por tipo de usuário

## 🚀 Como Usar

1. **Login Admin**: Digite "admin" como username
2. **Gerar Código**: Vá em "Código de Convite" e gere um código
3. **Cadastrar Vendedor**: Use o código no botão "Inserir Código"
4. **Vendedor Online**: Ative o botão online/offline no painel
5. **Cliente**: Vendedor gera código para cliente
6. **Motorista**: Vendedor gera código para motorista
7. **Fazer Pedido**: Cliente escolhe produto, paga via PIX
8. **Entrega**: Motorista aceita e confirma entrega

## 🎨 Efeitos Visuais

- Backgrounds com blur e movimento constante
- Sombras neon pulsantes
- Gradientes animados
- Bordas indicadoras de status online/offline
- Transições suaves entre estados
- Cards com hover effects
- Botões com feedback tátil (scale on tap)

---

**Status**: ✅ Sistema completo implementado
**Próximos Passos**: Integração com backend real para persistência de dados
