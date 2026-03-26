

## 🏟️ Apito — Marketplace de Árbitros

App mobile-first para conectar árbitros esportivos a contratantes (organizadores de partidas amadoras).

---

### 🎨 Design & Visual
- **Tema escuro** com fundo #121212 ("Preto Apito")
- **Amarelo #FFD700** como cor de destaque/CTA ("Amarelo Cartão")
- **Verde #2ECC71** para sucesso, **Vermelho #E74C3C** para cancelamento
- Layout mobile-first centralizado, simulando viewport de celular
- Badges de nível: 🥉 Bronze, 🥈 Prata, 🥇 Ouro

---

### 👤 Seleção de Papel
- **Tela Home** com splash e seleção de papel: **Contratante** ou **Árbitro**
- Navegação e dashboard mudam conforme o papel escolhido

---

### 📱 Fluxo do Contratante
1. **Dashboard** — Próximas partidas, busca rápida, árbitros recomendados
2. **Busca de Árbitros** — Filtros por modalidade (Futebol Campo, Futsal, Society, Futebol 7), distância, preço, nível e avaliação
3. **Perfil do Árbitro** — Foto, bio, estatísticas (jogos apitados, pontualidade, média de cartões), avaliações e botão de contratação
4. **Checkout** — Seleção de data/hora/local, método de pagamento (PIX, cartão, saldo), opção de split de pagamento entre jogadores
5. **Modo Partida** — Acompanhamento em tempo real: status (a caminho → em andamento → finalizado), check-in duplo, e avaliação pós-jogo

---

### ⚽ Fluxo do Árbitro
1. **Dashboard** — Resumo de ganhos, próximas partidas, solicitações pendentes
2. **Solicitações** — Cards com detalhes da partida para aceitar/recusar
3. **Modo Partida** — Check-in, cronômetro, registro de ocorrências (gols, cartões, faltas), finalização e avaliação do contratante

---

### 🔧 Funcionalidades Compartilhadas
- **Perfil do Usuário** — Edição de dados, histórico de partidas
- **Carteira** — Saldo, extrato de transações, saques
- **Sistema de Avaliação** — Notas de 1-5 estrelas com comentários (bidirecional)
- **Navegação inferior (Bottom Nav)** — Contextual por papel (Contratante vs Árbitro)
- **Componentes reutilizáveis** — ArbitroCard, LevelBadge, RatingStars, StatusBadge

---

### 📂 Estrutura de Dados (mock/local)
- **Arbitro** — nome, cidade, modalidades, valor/hora, nível, estatísticas, disponibilidade
- **Contratação** — árbitro, data, local, modalidade, valor, status, pagamento, check-ins
- **Avaliação** — nota, comentário, pontualidade, profissionalismo
- Dados simulados (mock) para demonstração — sem backend nesta fase

---

### 🗂️ Páginas (10 telas)
1. Home (seleção de papel)
2. Dashboard Contratante
3. Busca de Árbitros
4. Perfil do Árbitro
5. Checkout
6. Modo Partida (Contratante)
7. Dashboard Árbitro
8. Solicitações (Árbitro)
9. Carteira
10. Perfil do Usuário

