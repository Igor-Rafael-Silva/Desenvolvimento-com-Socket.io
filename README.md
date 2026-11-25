# 🐍 Snake.io Multiplayer 2D

Jogo multiplayer 2D em tempo real inspirado no clássico **Snake.io**, desenvolvido com **HTML5 Canvas**, **CSS3**, **JavaScript** no front-end e **Node.js**, **Express** e **Socket.io** no back-end para comunicação bidirecional de baixa latência.

---

## ✨ Funcionalidades

- **Multiplayer em Tempo Real:** Sincronização contínua a **60 FPS (Tick Rate)** com servidor autoritativo ("fonte da verdade") em Node.js para evitar trapaças e dessincronização.
- **Controles Fluidos:** Direção omnidirecional via **Mouse** ou controle angular via teclado (**A / D** ou **Setas**), além de sistema de **Turbo (Boost)** segurando o **Clique** ou **Espaço**.
- **Mecânica Completa de Snake.io:**
  - Crescimento dinâmico dos segmentos ao coletar orbes luminosos.
  - Eliminação ao colidir com as bordas da arena ou com o corpo de outro jogador.
  - Cobras derrotadas se transformam em uma trilha de orbes bônus na arena.
- **Interface & Câmera:**
  - Tela inicial com escolha de nickname e tela de *Game Over* com respawn instantâneo.
  - Câmera dinâmica centralizada no jogador, minimapa em tempo real e placar ao vivo.

---

## 🛠️ Tecnologias Utilizadas

- **Front-end:** HTML5 Canvas, CSS3, JavaScript (ES6+)
- **Back-end:** Node.js, Express
- **Comunicação em Tempo Real:** Socket.io (WebSockets)

---

## 📁 Estrutura do Projeto

```text
game-multiplayer/
├── public/
│   ├── index.html      # Estrutura da interface, modais e elemento <canvas>
│   ├── style.css       # Estilização da arena, placar e telas de login/game over
│   └── client.js       # Captura de controles, câmera, minimapa e renderização 2D
├── server.js           # Servidor Express, física do jogo (60 FPS) e eventos Socket.io
├── package.json        # Dependências e scripts de execução
└── README.md           # Documentação do projeto
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 16 ou superior) instalado.

### Passo a passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/snake-io-multiplayer.git
   cd snake-io-multiplayer
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor:**
   ```bash
   npm start
   ```

4. **Acesse no navegador:**
   Abra `http://localhost:3000`. Para testar o modo multiplayer localmente, abra o mesmo endereço em duas ou mais abas.

---

## 🎮 Controles

| Ação | Mouse | Teclado |
| :--- | :--- | :--- |
| **Direcionar a cobra** | Mover o cursor pela tela | `A` / `D` ou `Seta Esquerda` / `Seta Direita` |
| **Ativar Turbo (Boost)** | Segurar botão esquerdo | Segurar `Espaço` |

*(Nota: O uso do turbo consome pontos gradualmente, deixando orbes para trás).*

---

## ☁️ Deploy (Publicação Gratuita)

O projeto já está configurado com `process.env.PORT` e script `"start": "node server.js"`, pronto para hospedagem em plataformas que suportam WebSockets persistentes, como o **Render**:

1. Suba este repositório para o seu GitHub.
2. Crie um novo **Web Service** no [Render](https://render.com/) conectado ao repositório.
3. Configure:
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Clique em **Create Web Service** e compartilhe o link gerado com seus amigos!

---

## 📄 Licença

Este projeto foi desenvolvido para fins educacionais e está sob a licença MIT.
