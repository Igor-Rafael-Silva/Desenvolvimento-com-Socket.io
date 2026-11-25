const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreList = document.getElementById('scoreList');

const loginOverlay = document.getElementById('loginOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const joinForm = document.getElementById('joinForm');
const nicknameInput = document.getElementById('nicknameInput');
const respawnBtn = document.getElementById('respawnBtn');
const deathReasonEl = document.getElementById('deathReason');
const finalScoreEl = document.getElementById('finalScore');

let myId = null;
let myNickname = '';
let arena = { width: 1200, height: 800 };
let players = {};
let foods = [];

const keyState = {
  turnLeft: false,
  turnRight: false,
  boosting: false
};

// Entrar no jogo
joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  myNickname = nicknameInput.value.trim();
  if (!myNickname) return;

  socket.emit('joinGame', myNickname);
  loginOverlay.classList.add('hidden');
});

// Jogar novamente após morrer
respawnBtn.addEventListener('click', () => {
  gameOverOverlay.classList.add('hidden');
  socket.emit('joinGame', myNickname);
});

// Eventos do Servidor
socket.on('init', (data) => {
  myId = data.id;
  arena = data.arena;
  foods = data.foods;
});

socket.on('stateUpdate', (data) => {
  players = data.players;
  foods = data.foods;
});

socket.on('playersListUpdated', (leaderboard) => {
  updateScoreboard(leaderboard);
});

socket.on('gameOver', ({ score, reason }) => {
  myId = null;
  deathReasonEl.textContent = reason;
  finalScoreEl.textContent = score;
  gameOverOverlay.classList.remove('hidden');
});

// Controle pelo Mouse (aponta a cabeça da cobra)
canvas.addEventListener('mousemove', (e) => {
  if (!myId || !players[myId]) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Como a câmera centraliza na cobra, o centro do canvas é a cabeça dela
  const angle = Math.atan2(mouseY - canvas.height / 2, mouseX - canvas.width / 2);
  socket.emit('mouseAngle', angle);
});

canvas.addEventListener('mousedown', () => {
  if (!myId) return;
  keyState.boosting = true;
  socket.emit('keyInput', keyState);
});

window.addEventListener('mouseup', () => {
  if (!myId) return;
  keyState.boosting = false;
  socket.emit('keyInput', keyState);
});

// Controle alternativo pelo Teclado (A/D ou Setas + Espaço para turbo)
function handleKeyboard(code, isDown) {
  if (!myId) return;
  let changed = false;

  if ((code === 'ArrowLeft' || code === 'KeyA') && keyState.turnLeft !== isDown) {
    keyState.turnLeft = isDown;
    changed = true;
  }
  if ((code === 'ArrowRight' || code === 'KeyD') && keyState.turnRight !== isDown) {
    keyState.turnRight = isDown;
    changed = true;
  }
  if (code === 'Space' && keyState.boosting !== isDown) {
    keyState.boosting = isDown;
    changed = true;
  }

  if (changed) {
    socket.emit('keyInput', keyState);
  }
}

window.addEventListener('keydown', (e) => handleKeyboard(e.code, true));
window.addEventListener('keyup', (e) => handleKeyboard(e.code, false));

function updateScoreboard(leaderboard) {
  scoreList.innerHTML = '';
  const sorted = [...leaderboard].sort((a, b) => b.score - a.score);

  sorted.forEach((p, idx) => {
    const li = document.createElement('li');
    const crown = idx === 0 && p.score > 0 ? '👑 ' : '';
    const meTag = p.id === myId ? ' (Você)' : '';

    li.innerHTML = `
      <span style="color: ${p.color}; font-weight: bold;">
        ${crown}${p.name}${meTag}
      </span>
      <strong>${p.score}</strong>
    `;
    scoreList.appendChild(li);
  });
}

function drawArenaBackground() {
  // Grade hexagonal/quadriculada
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  const step = 40;

  for (let x = 0; x <= arena.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, arena.height);
    ctx.stroke();
  }

  for (let y = 0; y <= arena.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
    ctx.stroke();
  }

  // Parede vermelha da arena
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, arena.width, arena.height);
}

function drawSnake(snake) {
  const segs = snake.segments;
  if (!segs || segs.length === 0) return;

  // Desenha da cauda para a cabeça para sobreposição correta
  for (let i = segs.length - 1; i >= 0; i--) {
    const seg = segs[i];
    const isHead = i === 0;
    const radius = isHead ? 14 : Math.max(9, 13 - (i / segs.length) * 3);

    ctx.beginPath();
    ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2);

    // Efeito listrado e brilho no turbo
    ctx.fillStyle = i % 2 === 0 ? snake.color : shadeColor(snake.color, -20);
    if (snake.boosting) {
      ctx.shadowColor = snake.color;
      ctx.shadowBlur = 14;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    if (isHead) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.stroke();
      drawSnakeEyes(seg.x, seg.y, snake.angle);
    }
  }

  // Nickname acima da cabeça
  const head = segs[0];
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(snake.name, head.x, head.y - 22);
}

function drawSnakeEyes(x, y, angle) {
  const eyeOffsetForward = 6;
  const eyeOffsetSide = 5;

  const leftEyeX = x + Math.cos(angle) * eyeOffsetForward - Math.sin(angle) * eyeOffsetSide;
  const leftEyeY = y + Math.sin(angle) * eyeOffsetForward + Math.cos(angle) * eyeOffsetSide;

  const rightEyeX = x + Math.cos(angle) * eyeOffsetForward + Math.sin(angle) * eyeOffsetSide;
  const rightEyeY = y + Math.sin(angle) * eyeOffsetForward - Math.cos(angle) * eyeOffsetSide;

  [
    { ex: leftEyeX, ey: leftEyeY },
    { ex: rightEyeX, ey: rightEyeY }
  ].forEach(({ ex, ey }) => {
    // Parte branca
    ctx.beginPath();
    ctx.arc(ex, ey, 3.8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Pupila
    ctx.beginPath();
    ctx.arc(ex + Math.cos(angle) * 1.4, ey + Math.sin(angle) * 1.4, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
  });
}

function drawMinimap() {
  const mapW = 140;
  const mapH = (arena.height / arena.width) * mapW;
  const pad = 14;
  const startX = canvas.width - mapW - pad;
  const startY = canvas.height - mapH - pad;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.fillRect(startX, startY, mapW, mapH);
  ctx.strokeRect(startX, startY, mapW, mapH);

  Object.values(players).forEach((p) => {
    const head = p.segments?.[0];
    if (!head) return;

    const mx = startX + (head.x / arena.width) * mapW;
    const my = startY + (head.y / arena.height) * mapH;

    ctx.beginPath();
    ctx.arc(mx, my, p.id === myId ? 3.5 : 2.5, 0, Math.PI * 2);
    ctx.fillStyle = p.id === myId ? '#ffffff' : p.color;
    ctx.fill();
  });
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Calcula posição da câmera focada na cabeça do jogador atual
  const me = players[myId];
  const head = me?.segments?.[0];
  const camX = head ? head.x - canvas.width / 2 : (arena.width - canvas.width) / 2;
  const camY = head ? head.y - canvas.height / 2 : (arena.height - canvas.height) / 2;

  ctx.save();
  ctx.translate(-camX, -camY);

  drawArenaBackground();

  // Desenha os orbes de comida
  const pulse = Math.sin(Date.now() / 180) * 1.2;
  for (const f of foods) {
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.radius + pulse, 0, Math.PI * 2);
    ctx.fillStyle = f.color;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 8;
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Desenha todas as cobras
  Object.values(players).forEach((p) => drawSnake(p));

  ctx.restore();

  // HUD fixo na tela
  drawMinimap();

  requestAnimationFrame(render);
}

requestAnimationFrame(render);