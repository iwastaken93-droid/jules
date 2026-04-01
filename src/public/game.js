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
const dashBar = document.getElementById('dash-bar');
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
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x - cx, this.y - cy, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// Visual Effects
function drawGrid(cx, cy) {
  const gridSize = 100; // bigger tiles for floor
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;

  const startX = cx - (cx % gridSize);
  const startY = cy - (cy % gridSize);

  // Draw floor tiles
  ctx.fillStyle = '#4a5568'; // metallic blue-grey
  ctx.fillRect(0, 0, width, height);

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

  // Draw some simple tile details (rivets/crosses) to look like a spaceship floor
  ctx.fillStyle = '#2d3748';
  for (let x = startX; x < cx + width; x += gridSize) {
    for (let y = startY; y < cy + height; y += gridSize) {
      // Small dots in corners
      ctx.fillRect(x - cx + 5, y - cy + 5, 4, 4);
      ctx.fillRect(x - cx + gridSize - 9, y - cy + 5, 4, 4);
      ctx.fillRect(x - cx + 5, y - cy + gridSize - 9, 4, 4);
      ctx.fillRect(x - cx + gridSize - 9, y - cy + gridSize - 9, 4, 4);
    }
  }

  // Draw world bounds (thick caution tape style border)
  if (config.width) {
    const bw = 10;
    ctx.strokeStyle = '#eab308'; // yellow
    ctx.lineWidth = bw;
    ctx.strokeRect(-cx - bw/2, -cy - bw/2, config.width + bw, config.height + bw);

    // Black dashes over yellow line for caution stripe look
    ctx.strokeStyle = '#000000';
    ctx.setLineDash([20, 20]);
    ctx.strokeRect(-cx - bw/2, -cy - bw/2, config.width + bw, config.height + bw);
    ctx.setLineDash([]);
  }
}

function createExplosion(x, y, color, amount) {
  camera.shake = 15; // slightly more shake
  for (let i = 0; i < amount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 250 + 100;
    particles.push(new Particle(
      x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      color,
      Math.random() * 400 + 200, // slightly shorter life, punchier
      Math.random() * 6 + 4      // chunkier pieces
    ));
  }
}



// Input handling
const keys = { w: false, a: false, s: false, d: false, ' ': false };
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


  if (keys[' '] && !mouse.dashedThisPress) {
    socket.emit('dash');
    mouse.dashedThisPress = true; // prevent holding space
  }
  if (!keys[' ']) {
    mouse.dashedThisPress = false;
  }

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


  // Update UI Dash Cooldown
  const now = Date.now();
  const timeSinceDash = now - (me.lastDashed || 0);
  const dashPct = Math.min(100, (timeSinceDash / 3000) * 100);
  if (dashBar) {
    dashBar.style.width = dashPct + '%';
    dashBar.style.backgroundColor = dashPct >= 100 ? '#fbbf24' : '#94a3b8'; // yellow when ready
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


  // Draw particles (underneath players)
  particles.forEach(p => p.draw(ctx, camera.x, camera.y));

  // Draw Obstacles (Space Crates)
  if (config.obstacles) {
    config.obstacles.forEach(obs => {
      ctx.fillStyle = '#64748b'; // metal crate color
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;

      const ox = obs.x - camera.x;
      const oy = obs.y - camera.y;

      // Base crate
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(ox, oy, obs.w, obs.h, 8);
      } else {
        ctx.rect(ox, oy, obs.w, obs.h);
      }
      ctx.fill();
      ctx.stroke();

      // Crate details (X mark across it)
      ctx.beginPath();
      ctx.moveTo(ox + 8, oy + 8);
      ctx.lineTo(ox + obs.w - 8, oy + obs.h - 8);
      ctx.moveTo(ox + obs.w - 8, oy + 8);
      ctx.lineTo(ox + 8, oy + obs.h - 8);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 6;
      ctx.stroke();
    });
  }

  // Draw Bots

  serverState.bots.forEach(b => {
    const botAngle = Math.atan2(b.vy, b.vx);
    drawCrewmate(ctx, b.x - camera.x, b.y - camera.y, b.radius, '#c5c6c7', botAngle, true);

    // Health
    ctx.fillStyle = '#e76f51';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    const hpW = b.radius * 2.5;
    const hpH = 8;
    const hpX = b.x - camera.x - hpW/2;
    const hpY = b.y - camera.y - b.radius * 2.2;
    ctx.strokeRect(hpX, hpY, hpW, hpH);
    ctx.fillRect(hpX, hpY, hpW * (b.health/100), hpH);
  });

  // Draw Players
  for (const id in serverState.players) {
    const p = serverState.players[id];
    const isMe = id === myId;

    const aimAngle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
    // Use bright distinct colors
    const color = isMe ? '#e62429' : (p.color || '#3b82f6');
    drawCrewmate(ctx, p.x - camera.x, p.y - camera.y, p.radius, color, aimAngle, false);

    // Name tag
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 16px Arial'; // more legible cartoon font
    ctx.textAlign = 'center';
    const nameY = p.y - camera.y - p.radius * 2.2;
    ctx.strokeText(p.username, p.x - camera.x, nameY);
    ctx.fillText(p.username, p.x - camera.x, nameY);
  }

  // Draw Projectiles
  serverState.projectiles.forEach(proj => {
    // bright yellow/orange bullet
    ctx.fillStyle = proj.ownerType === 'player' ? '#fbbf24' : '#ef4444';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;

    // Chunkier particle trail
    if (Math.random() > 0.6) {
      particles.push(new Particle(proj.x, proj.y, -proj.vx*0.2, -proj.vy*0.2, '#ffffff', 200, 3));
    }

    ctx.save();
    ctx.translate(proj.x - camera.x, proj.y - camera.y);
    const angle = Math.atan2(proj.vy, proj.vx);
    ctx.rotate(angle);

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-10, -4, 20, 8, 4);
    } else {
      ctx.rect(-10, -4, 20, 8);
    }
    ctx.fill();
    ctx.stroke();

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
