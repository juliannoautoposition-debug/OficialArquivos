# App de Vendas - Sistema de Vendas em Tempo Real

## 📋 Descrição

Sistema completo de vendas com sincronização em tempo real entre múltiplos usuários. Todos os usuários conectados veem as atualizações de estoque, vendas e histórico instantaneamente.

## ✨ Funcionalidades

### Tela de Vendas
- Visualização de produtos disponíveis com imagem, preço e estoque
- Carrinho de compras interativo
- Controles de quantidade (+/-)
- Finalização de venda com atualização automática do estoque
- Notificações por WhatsApp

### Gestão de Estoque (Protegido por Senha)
- Adicionar novos produtos com imagem
- Editar produtos existentes
- Excluir produtos
- Upload de imagens dos produtos
- Configuração do WhatsApp do gestor
- Senha padrão: `sucesso2026`

### Histórico de Vendas
- Visualização de todas as vendas realizadas
- Detalhes de cada venda (itens, quantidades, valores)
- Atualização em tempo real

## 🚀 Sincronização em Tempo Real

A aplicação usa WebSocket para sincronizar dados entre todos os usuários conectados:

- ✅ Quando um produto é adicionado/editado/excluído, todos veem a atualização
- ✅ Quando uma venda é finalizada, o estoque é atualizado para todos
- ✅ O histórico de vendas é sincronizado entre todos os usuários
- ✅ Configurações do WhatsApp são compartilhadas

## 🛠️ Tecnologias Utilizadas

### Frontend
- React + TypeScript
- Bootstrap 5
- Bootstrap Icons
- TanStack Query (React Query)
- WebSocket para sincronização em tempo real

### Backend
- Node.js + Express
- TypeScript
- WebSocket Server (ws)
- Zod para validação
- Armazenamento em memória

## 📱 Como Usar

### Iniciar a Aplicação

O servidor já está rodando automaticamente. Acesse a aplicação no navegador.

### Fazer uma Venda

1. Na tela de **Vendas**, selecione a quantidade desejada de cada produto
2. Clique em **Adicionar** para incluir no carrinho
3. Revise os itens no carrinho
4. Clique em **Finalizar Venda**
5. A venda será registrada e o estoque atualizado automaticamente

### Gerenciar Estoque

1. Clique em **Estoque** no menu
2. Digite a senha: `sucesso2026`
3. Adicione novos produtos usando o formulário
4. Edite ou exclua produtos existentes
5. Configure o WhatsApp do gestor (opcional)

### Ver Histórico

1. Clique em **Histórico** no menu
2. Visualize todas as vendas realizadas

## 🔔 Notificações WhatsApp

Configure o número do WhatsApp do gestor (com DDD) na tela de Estoque. As vendas serão enviadas automaticamente com detalhes dos produtos vendidos e valor total.

## 🔒 Segurança

- Acesso ao estoque protegido por senha
- Validação de dados com Zod
- Prevenção de estoque negativo
- Validação de tipos em todas as operações

## 📊 Dados

Os dados são armazenados em memória durante a execução da aplicação. Para persistência permanente, considere migrar para PostgreSQL (já configurado na estrutura do projeto).

## 🎨 Interface

A interface preserva 100% do design original, incluindo:
- Navbar com cor personalizada (#3f1e00)
- Cards de produtos com hover effects
- Modais animados de sucesso
- Layout responsivo para mobile
- Ícones intuitivos

## 🧪 Testado

- ✅ Adição de produtos ao carrinho
- ✅ Finalização de vendas
- ✅ Gestão de estoque
- ✅ Sincronização entre múltiplos usuários
- ✅ Responsividade mobile
- ✅ Autenticação de estoque

## 📝 Próximos Passos Sugeridos

1. Migrar para PostgreSQL para persistência de dados
2. Implementar autenticação de usuários
3. Adicionar relatórios e gráficos
4. Implementar backup automático
5. Adicionar filtros avançados no histórico
