const socket = io();

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

// Resize handling
window.addEventListener('resize', () => {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
});

// UI Elements
const loginScreen = document.getElementById('login-screen');
const gameUi = document.getElementById('game-ui');
const usernameInput = document.getElementById('username');
const joinBtn = document.getElementById('join-btn');
const uiScore = document.getElementById('ui-score');
const uiKills = document.getElementById('ui-kills');
const uiDeaths = document.getElementById('ui-deaths');
const healthBar = document.getElementById('health-bar');
const leaderboardList = document.getElementById('leaderboard-list');

let myId = null;
let username = '';

// Game State
let serverState = { players: {}, bots: [], projectiles: [] };
let config = {};
let myUserStats = null;

// Camera
const camera = { x: 0, y: 0, shake: 0 };

// Particle system
let particles = [];
class Particle {
  constructor(x, y, vx, vy, color, life, size) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = size;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt * 1000;
  }
  draw(ctx, cx, cy) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x - cx, this.y - cy, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Visual Effects
function createExplosion(x, y, color, amount) {
  camera.shake = 10;
  for (let i = 0; i < amount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 200 + 50;
    particles.push(new Particle(
      x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      color,
      Math.random() * 500 + 300,
      Math.random() * 3 + 1
    ));
  }
}

function drawGrid(cx, cy) {
  const gridSize = 50;
  ctx.strokeStyle = '#1f2833';
  ctx.lineWidth = 1;
  
  const startX = cx - (cx % gridSize);
  const startY = cy - (cy % gridSize);

  ctx.beginPath();
  for (let x = startX; x < cx + width; x += gridSize) {
    ctx.moveTo(x - cx, 0);
    ctx.lineTo(x - cx, height);
  }
  for (let y = startY; y < cy + height; y += gridSize) {
    ctx.moveTo(0, y - cy);
    ctx.lineTo(width, y - cy);
  }
  ctx.stroke();

  // Draw world bounds
  if (config.width) {
    ctx.strokeStyle = '#c5c6c7';
    ctx.lineWidth = 4;
    ctx.strokeRect(-cx, -cy, config.width, config.height);
  }
}

// Input handling
const keys = { w: false, a: false, s: false, d: false };
const mouse = { x: 0, y: 0, down: false };

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (keys.hasOwnProperty(k)) keys[k] = true;
});
window.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (keys.hasOwnProperty(k)) keys[k] = false;
});
window.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener('mousedown', e => { if(e.button === 0) mouse.down = true; });
window.addEventListener('mouseup', e => { if(e.button === 0) mouse.down = false; });

// Join Game
joinBtn.addEventListener('click', () => {
  const name = usernameInput.value.trim();
  if (name) {
    username = name;
    loginScreen.style.display = 'none';
    gameUi.style.display = 'block';
    socket.emit('join', username);
  }
});

usernameInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') joinBtn.click();
});

// Socket Events
socket.on('init', data => {
  myId = data.id;
  config = data.config;
  serverState.players = data.players;
  serverState.bots = data.bots;
  myUserStats = data.userStats;
});

socket.on('state', data => {
  serverState = data;
});

socket.on('killEvent', data => {
  // Sparkles at the death location
  createExplosion(data.x, data.y, data.victim === 'bot' ? '#c5c6c7' : '#45a29e', 50);
});

// Main Loop
let lastTime = performance.now();

function update(dt) {
  if (!myId || !serverState.players[myId]) return;

  const me = serverState.players[myId];

  // Camera follow & shake
  camera.x += ((me.x - width / 2) - camera.x) * 10 * dt;
  camera.y += ((me.y - height / 2) - camera.y) * 10 * dt;

  if (camera.shake > 0) {
    camera.x += (Math.random() - 0.5) * camera.shake;
    camera.y += (Math.random() - 0.5) * camera.shake;
    camera.shake -= dt * 30;
  }

  // Send input
  let dx = 0, dy = 0;
  if (keys.w) dy -= 1;
  if (keys.s) dy += 1;
  if (keys.a) dx -= 1;
  if (keys.d) dx += 1;

  socket.emit('input', {
    dx, dy,
    mouseX: camera.x + mouse.x,
    mouseY: camera.y + mouse.y
  });

  if (mouse.down) {
    socket.emit('shoot', {
      mouseX: camera.x + mouse.x,
      mouseY: camera.y + mouse.y
    });
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update(dt);
    if (particles[i].life <= 0) particles.splice(i, 1);
  }

  // Update UI
  uiScore.innerText = me.score;
  uiKills.innerText = me.kills;
  uiDeaths.innerText = me.deaths;

  const healthPct = Math.max(0, me.health);
  healthBar.style.width = healthPct + '%';
  healthBar.style.backgroundColor = healthPct > 50 ? '#66fcf1' : healthPct > 25 ? '#e9c46a' : '#e76f51';

  // Leaderboard
  const allEntities = Object.values(serverState.players);
  allEntities.sort((a, b) => b.score - a.score);
  leaderboardList.innerHTML = allEntities.slice(0, 5).map(p => 
    `<li><span>${p.username}</span> <span>${p.score}</span></li>`
  ).join('');
}

function render() {
  // Clear background
  ctx.fillStyle = '#0b0c10';
  ctx.fillRect(0, 0, width, height);

  if (!myId) return;

  drawGrid(camera.x, camera.y);

  // Draw particles (underneath players)
  particles.forEach(p => p.draw(ctx, camera.x, camera.y));

  // Draw Bots
  serverState.bots.forEach(b => {
    // Body
    ctx.fillStyle = '#c5c6c7';
    ctx.beginPath();
    ctx.arc(b.x - camera.x, b.y - camera.y, b.radius, 0, Math.PI * 2);
    ctx.fill();

    // Eye (points forward)
    const angle = Math.atan2(b.vy, b.vx);
    ctx.fillStyle = '#0b0c10';
    ctx.beginPath();
    ctx.arc(b.x - camera.x + Math.cos(angle) * b.radius * 0.5, b.y - camera.y + Math.sin(angle) * b.radius * 0.5, b.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Health
    ctx.fillStyle = '#e76f51';
    ctx.fillRect(b.x - camera.x - b.radius, b.y - camera.y - b.radius - 10, (b.radius * 2) * (b.health/100), 4);
  });

  // Draw Players
  for (const id in serverState.players) {
    const p = serverState.players[id];
    const isMe = id === myId;

    // Body
    ctx.fillStyle = isMe ? '#66fcf1' : '#45a29e';
    
    // Draw polygon instead of circle for players
    ctx.save();
    ctx.translate(p.x - camera.x, p.y - camera.y);
    const aimAngle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
    ctx.rotate(aimAngle);

    ctx.beginPath();
    ctx.moveTo(p.radius, 0); // nose
    ctx.lineTo(-p.radius, -p.radius * 0.8);
    ctx.lineTo(-p.radius * 0.5, 0);
    ctx.lineTo(-p.radius, p.radius * 0.8);
    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#c5c6c7';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Name tag
    ctx.fillStyle = '#c5c6c7';
    ctx.font = '12px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText(p.username, p.x - camera.x, p.y - camera.y - p.radius - 15);
  }

  // Draw Projectiles
  serverState.projectiles.forEach(proj => {
    ctx.fillStyle = proj.ownerType === 'player' ? '#66fcf1' : '#e76f51';
    
    // Add small particle trail
    if (Math.random() > 0.5) {
      particles.push(new Particle(proj.x, proj.y, -proj.vx*0.2, -proj.vy*0.2, ctx.fillStyle, 150, 2));
    }

    ctx.save();
    ctx.translate(proj.x - camera.x, proj.y - camera.y);
    const angle = Math.atan2(proj.vy, proj.vx);
    ctx.rotate(angle);
    ctx.fillRect(-10, -2, 20, 4);
    ctx.restore();
  });
}

function loop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(dt);
  render();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
