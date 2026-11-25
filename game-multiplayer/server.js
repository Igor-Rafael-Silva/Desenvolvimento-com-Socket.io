const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const TICK_RATE = 60;

const BASE_SPEED = 3.2;
const BOOST_SPEED = 5.8;
const TURN_SPEED = 0.085;
const HEAD_RADIUS = 13;
const SEGMENT_SPACING = 3; // Distância de amostras no histórico entre segmentos
const INITIAL_LENGTH = 10;
const MAX_FOOD = 55;

const players = {};
let foods = [];

function getRandomColor() {
  const colors = ['#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#A855F7', '#FF924C', '#2DD4BF', '#F472B6'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function createFood(x, y, value = 1, color = null) {
  const margin = 30;
  return {
    id: Math.random().toString(36).slice(2, 9),
    x: x ?? Math.floor(Math.random() * (CANVAS_WIDTH - margin * 2)) + margin,
    y: y ?? Math.floor(Math.random() * (CANVAS_HEIGHT - margin * 2)) + margin,
    value,
    radius: value > 1 ? 8 : 5,
    color: color || getRandomColor()
  };
}

// Popula a arena inicialmente com comidas
for (let i = 0; i < MAX_FOOD; i++) {
  foods.push(createFood());
}

function spawnSnake(id, name, color) {
  const startX = Math.floor(Math.random() * (CANVAS_WIDTH - 240)) + 120;
  const startY = Math.floor(Math.random() * (CANVAS_HEIGHT - 240)) + 120;
  const startAngle = Math.random() * Math.PI * 2;

  const pathHistory = [];
  const totalPoints = INITIAL_LENGTH * SEGMENT_SPACING;
  for (let i = 0; i <= totalPoints; i++) {
    pathHistory.push({
      x: startX - Math.cos(startAngle) * i * BASE_SPEED,
      y: startY - Math.sin(startAngle) * i * BASE_SPEED
    });
  }

  return {
    id,
    name,
    color: color || getRandomColor(),
    x: startX,
    y: startY,
    angle: startAngle,
    targetAngle: startAngle,
    length: INITIAL_LENGTH,
    score: 0,
    boosting: false,
    turnLeft: false,
    turnRight: false,
    pathHistory,
    segments: buildSegments(pathHistory, INITIAL_LENGTH)
  };
}

function buildSegments(pathHistory, length) {
  const segments = [];
  for (let i = 0; i < length; i++) {
    const index = Math.min(i * SEGMENT_SPACING, pathHistory.length - 1);
    segments.push(pathHistory[index]);
  }
  return segments;
}

function killPlayer(player, reason) {
  // Transforma o corpo da cobra derrotada em comida
  player.segments.forEach((seg, idx) => {
    if (idx % 2 === 0) {
      foods.push(createFood(seg.x, seg.y, 2, player.color));
    }
  });

  io.to(player.id).emit('gameOver', { score: player.score, reason });
  delete players[player.id];
  io.emit('playersListUpdated', getLeaderboardData());
}

function getLeaderboardData() {
  return Object.values(players).map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    score: p.score
  }));
}

io.on('connection', (socket) => {
  socket.on('joinGame', (nickname) => {
    const cleanName = (nickname || '').trim().slice(0, 14) || `Snake_${socket.id.slice(0, 4)}`;
    players[socket.id] = spawnSnake(socket.id, cleanName);

    socket.emit('init', {
      id: socket.id,
      arena: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
      foods
    });
    io.emit('playersListUpdated', getLeaderboardData());
  });

  // Direção via mouse
  socket.on('mouseAngle', (angle) => {
    const p = players[socket.id];
    if (p && typeof angle === 'number') {
      p.targetAngle = angle;
      p.useMouse = true;
    }
  });

  // Direção via teclado (A/D ou Setas) e Turbo
  socket.on('keyInput', ({ turnLeft, turnRight, boosting }) => {
    const p = players[socket.id];
    if (!p) return;
    if (turnLeft || turnRight) p.useMouse = false;
    p.turnLeft = !!turnLeft;
    p.turnRight = !!turnRight;
    p.boosting = !!boosting;
  });

  socket.on('disconnect', () => {
    if (players[socket.id]) {
      delete players[socket.id];
      io.emit('playersListUpdated', getLeaderboardData());
    }
  });
});

// Loop Principal (60 FPS)
setInterval(() => {
  const playerList = Object.values(players);
  let leaderboardDirty = false;

  // Repõe comidas até o limite mínimo
  while (foods.length < MAX_FOOD) {
    foods.push(createFood());
  }

  for (const p of playerList) {
    // 1. Atualização do ângulo de direção
    if (p.useMouse) {
      let diff = p.targetAngle - p.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      if (Math.abs(diff) < TURN_SPEED) {
        p.angle = p.targetAngle;
      } else {
        p.angle += Math.sign(diff) * TURN_SPEED;
      }
    } else {
      if (p.turnLeft) p.angle -= TURN_SPEED;
      if (p.turnRight) p.angle += TURN_SPEED;
    }

    // 2. Controle de Turbo (Boost)
    const isBoosting = p.boosting && p.score > 0;
    const speed = isBoosting ? BOOST_SPEED : BASE_SPEED;

    if (isBoosting) {
      p.boostCounter = (p.boostCounter || 0) + 1;
      if (p.boostCounter >= 15) {
        p.boostCounter = 0;
        p.score = Math.max(0, p.score - 1);
        p.length = INITIAL_LENGTH + Math.floor(p.score / 2);
        const tail = p.segments[p.segments.length - 1];
        if (tail) foods.push(createFood(tail.x, tail.y, 1, p.color));
        leaderboardDirty = true;
      }
    }

    // 3. Movimento contínuo da cabeça
    p.x += Math.cos(p.angle) * speed;
    p.y += Math.sin(p.angle) * speed;

    // 4. Colisão com as bordas da arena
    if (
      p.x < HEAD_RADIUS ||
      p.x > CANVAS_WIDTH - HEAD_RADIUS ||
      p.y < HEAD_RADIUS ||
      p.y > CANVAS_HEIGHT - HEAD_RADIUS
    ) {
      killPlayer(p, 'Você bateu na parede da arena!');
      continue;
    }

    // 5. Atualiza o histórico de posições e reconstrói os segmentos do corpo
    p.pathHistory.unshift({ x: p.x, y: p.y });
    const maxHistory = p.length * SEGMENT_SPACING + 5;
    if (p.pathHistory.length > maxHistory) {
      p.pathHistory.length = maxHistory;
    }
    p.segments = buildSegments(p.pathHistory, p.length);

    // 6. Coleta de comida
    for (let i = foods.length - 1; i >= 0; i--) {
      const f = foods[i];
      const dist = Math.hypot(p.x - f.x, p.y - f.y);
      if (dist < HEAD_RADIUS + f.radius) {
        p.score += f.value;
        p.length = INITIAL_LENGTH + Math.floor(p.score / 2);
        foods.splice(i, 1);
        leaderboardDirty = true;
      }
    }
  }

  // 7. Colisão entre cabeças e corpos de outras cobras
  const alivePlayers = Object.values(players);
  for (const p1 of alivePlayers) {
    if (!players[p1.id]) continue;

    for (const p2 of alivePlayers) {
      if (p1.id === p2.id || !players[p2.id]) continue;

      // Verifica se a cabeça de p1 bateu em algum segmento de p2
      for (let s = 0; s < p2.segments.length; s++) {
        const seg = p2.segments[s];
        const dist = Math.hypot(p1.x - seg.x, p1.y - seg.y);
        if (dist < HEAD_RADIUS * 1.65) {
          killPlayer(p1, `Você colidiu com ${p2.name}!`);
          break;
        }
      }
      if (!players[p1.id]) break;
    }
  }

  // Envia estado enxuto para renderização suave
  const renderState = {};
  for (const [id, p] of Object.entries(players)) {
    renderState[id] = {
      id: p.id,
      name: p.name,
      color: p.color,
      angle: p.angle,
      boosting: p.boosting && p.score > 0,
      segments: p.segments
    };
  }

  io.emit('stateUpdate', { players: renderState, foods });
  if (leaderboardDirty) {
    io.emit('playersListUpdated', getLeaderboardData());
  }
}, 1000 / TICK_RATE);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Snake.io rodando em http://localhost:${PORT}`);
});