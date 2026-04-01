const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.static(__dirname + '/public'));
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Tinybird Host and Token
const TINYBIRD_TOKEN = process.env.TINYBIRD_TOKEN;
// Use correct host from the JWT host claim "gcp-europe-west2"
const TINYBIRD_HOST = 'https://api.tinybird.co';

async function sendAnalyticsEvent(playerName, eventType, details) {
  if (!TINYBIRD_TOKEN) return;

  const event = {
    timestamp: new Date().toISOString(),
    player_name: playerName,
    event_type: eventType,
    details: details
  };

  try {
    await fetch(`${TINYBIRD_HOST}/v0/events?name=player_events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });
  } catch (err) {
    console.error('Failed to send Tinybird event:', err.message);
  }
}

// Game State
const players = {};
const projectiles = [];
const bots = [];
const config = {
  width: 2000,
  height: 2000,
  playerSpeed: 300, 
  botSpeed: 100,
  projectileSpeed: 800,
  playerRadius: 20,
  fireCooldown: 150,
  obstacles: []
};

// Generate random obstacles
for (let i = 0; i < 30; i++) {
  config.obstacles.push({
    x: Math.random() * (config.width - 200) + 100,
    y: Math.random() * (config.height - 200) + 100,
    w: Math.random() * 100 + 50,
    h: Math.random() * 100 + 50
  });
}


function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// Spawn some initial bots

const COOL_NAMES = ['Zero', 'Phantom', 'Ghost', 'Viper', 'Nova', 'Rex', 'Kratos', 'Apollo', 'Blade', 'Shadow', 'Reaper', 'Titan', 'Apex', 'Maverick'];
const TEAMS = ['red', 'blue', 'green', 'yellow'];

function getRandomName() {
  return COOL_NAMES[Math.floor(Math.random() * COOL_NAMES.length)] + '_' + Math.floor(Math.random() * 999);
}

function getRandomTeam() {
  return TEAMS[Math.floor(Math.random() * TEAMS.length)];
}

function createBot() {
  const typeRoll = Math.random();
  let botType = 'standard';
  let speed = config.botSpeed;
  let maxHealth = 100;
  let attackType = 'shoot';
  if (typeRoll < 0.3) {
    botType = 'melee';
    speed = config.botSpeed * 1.5;
    maxHealth = 80;
    attackType = 'melee';
  } else if (typeRoll < 0.6) {
    botType = 'heavy';
    speed = config.botSpeed * 0.6;
    maxHealth = 250;
    attackType = 'shotgun';
  }

  return {
    id: 'bot_' + generateId(),
    username: getRandomName(),
    team: getRandomTeam(),
    botType: botType,
    attackType: attackType,
    x: Math.random() * config.width,
    y: Math.random() * config.height,
    vx: (Math.random() - 0.5) * speed,
    vy: (Math.random() - 0.5) * speed,
    health: maxHealth,
    maxHealth: maxHealth,
    radius: config.playerRadius * (botType === 'heavy' ? 1.5 : (botType === 'melee' ? 0.8 : 1)),
    lastFired: 0,
      lastDashed: 0,
    speed: speed
  };
}

// Spawn some initial bots
for (let i = 0; i < 25; i++) {
  bots.push(createBot());
}


// DB Helpers
async function loadOrCreateUser(username) {
  try {
    let res = await pool.query('SELECT * FROM players WHERE username = $1', [username]);
    if (res.rows.length > 0) return res.rows[0];

    res = await pool.query(
      'INSERT INTO players (username) VALUES ($1) RETURNING *',
      [username]
    );
    return res.rows[0];
  } catch (err) {
    console.error('DB Error:', err);
    return null;
  }
}

async function updateUserStats(username, kills, deaths, score) {
  try {
    await pool.query(
      'UPDATE players SET kills = kills + $1, deaths = deaths + $2, score = score + $3 WHERE username = $4',
      [kills, deaths, score, username]
    );
  } catch (err) {
    console.error('DB Error updating stats:', err);
  }
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('join', async (username) => {
    const user = await loadOrCreateUser(username);
    
    const team = getRandomTeam();
    players[socket.id] = {
      id: socket.id,
      username: username,
      team: team,
      x: Math.random() * config.width,
      y: Math.random() * config.height,
      vx: 0,
      vy: 0,
      targetX: 0,
      targetY: 0,
      health: 100,
      score: 0,
      kills: 0,
      deaths: 0,
      lastFired: 0,
      radius: config.playerRadius,
      dbUser: user
    };


    socket.emit('init', {
      id: socket.id,
      players,
      bots,
      config,
      userStats: user
    });
    
    socket.broadcast.emit('playerJoined', players[socket.id]);
    sendAnalyticsEvent(username, 'join', `Player joined`);
  });

  socket.on('input', (data) => {
    if (!players[socket.id]) return;
    const p = players[socket.id];
    
    let mag = Math.sqrt(data.dx * data.dx + data.dy * data.dy);
    if (mag > 0) {
      p.vx = (data.dx / mag) * config.playerSpeed;
      p.vy = (data.dy / mag) * config.playerSpeed;
    } else {
      p.vx = 0;
      p.vy = 0;
    }

    p.targetX = data.mouseX;
    p.targetY = data.mouseY;
  });

  socket.on('dash', () => {
    if (!players[socket.id]) return;
    const p = players[socket.id];
    const now = Date.now();

    // 3 second cooldown
    if (now - p.lastDashed < 3000) return;

    // Calculate current movement direction (or aim direction if not moving)
    let mag = Math.hypot(p.vx, p.vy);
    let dirX = 0, dirY = 0;
    if (mag > 0) {
      dirX = p.vx / mag;
      dirY = p.vy / mag;
    } else {
      // Dash towards mouse if standing still
      const aimAngle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
      dirX = Math.cos(aimAngle);
      dirY = Math.sin(aimAngle);
    }
    // Apply huge velocity burst that will naturally decay over a few frames
    // To make it easy, we just apply a massive speed for one frame
    p.x += dirX * 300;
    p.y += dirY * 300;
    // Check bounds & obstacles immediately so they don't dash out of map
    p.x = Math.max(p.radius, Math.min(config.width - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(config.height - p.radius, p.y));
    for (const obs of config.obstacles) {
      const col = circleRectCollide(p.x, p.y, p.radius, obs.x, obs.y, obs.w, obs.h);
      if (col.hit) {
         p.x = col.resolveX;
         p.y = col.resolveY;
      }
    }
    p.lastDashed = now;
  });

  socket.on('shoot', (data) => {
    if (!players[socket.id]) return;
    const p = players[socket.id];
    const now = Date.now();

    if (now - p.lastFired < config.fireCooldown) return;
    p.lastFired = now;

    const angle = Math.atan2(data.mouseY - p.y, data.mouseX - p.x);
    projectiles.push({
      id: generateId(),
      ownerId: socket.id,
      ownerType: 'player',
      ownerTeam: p.team,
      x: p.x,
      y: p.y,
      vx: Math.cos(angle) * config.projectileSpeed,
      vy: Math.sin(angle) * config.projectileSpeed,
      life: 2000,
      born: now
    });

  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    if (players[socket.id]) {
      sendAnalyticsEvent(players[socket.id].username, 'leave', `Player left`);
      updateUserStats(
        players[socket.id].username,
        players[socket.id].kills,
        players[socket.id].deaths,
        players[socket.id].score
      );
      delete players[socket.id];
      io.emit('playerLeft', socket.id);
    }
  });
});


function circleRectCollide(cx, cy, radius, rx, ry, rw, rh) {
  let testX = cx;
  let testY = cy;

  if (cx < rx) testX = rx;
  else if (cx > rx + rw) testX = rx + rw;

  if (cy < ry) testY = ry;
  else if (cy > ry + rh) testY = ry + rh;

  let distX = cx - testX;
  let distY = cy - testY;
  let distance = Math.sqrt((distX*distX) + (distY*distY));

  if (distance <= radius) {
    // Resolve collision
    const overlap = radius - distance;
    if (distance === 0) return { hit: false }; // Center of circle exactly on edge, ignore
    return {
      hit: true,
      resolveX: cx + (distX / distance) * overlap,
      resolveY: cy + (distY / distance) * overlap
    };
  }
  return { hit: false };
}

const TICK_RATE = 30; // 30 ticks per second
const dt = 1 / TICK_RATE;

setInterval(() => {
  const now = Date.now();

  // Update players
  for (const id in players) {
    const p = players[id];
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.x = Math.max(p.radius, Math.min(config.width - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(config.height - p.radius, p.y));

    // Obstacle collision
    for (const obs of config.obstacles) {
      const col = circleRectCollide(p.x, p.y, p.radius, obs.x, obs.y, obs.w, obs.h);
      if (col.hit) {
        p.x = col.resolveX;
        p.y = col.resolveY;
      }
    }

  }

  // Update bots
  bots.forEach(b => {
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.x <= b.radius || b.x >= config.width - b.radius) b.vx *= -1;
    if (b.y <= b.radius || b.y >= config.height - b.radius) b.vy *= -1;

    for (const obs of config.obstacles) {
      const col = circleRectCollide(b.x, b.y, b.radius, obs.x, obs.y, obs.w, obs.h);
      if (col.hit) {
        b.x = col.resolveX;
        b.y = col.resolveY;
        b.vx *= -1;
        b.vy *= -1;
      }
    }


    let closestPlayer = null;
    let closestDist = 800;
    for (const pid in players) {
      const p = players[pid];
      const dist = Math.hypot(p.x - b.x, p.y - b.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestPlayer = p;
>>>>>>> origin/main
      }
    }


    let closestEnemy = null;
    let closestDist = b.botType === 'melee' ? 1500 : 800;

    // Find enemy players
    for (const pid in players) {
      const p = players[pid];
      if (p.team === b.team) continue; // Don't target teammates
      const dist = Math.hypot(p.x - b.x, p.y - b.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestEnemy = p;
      }
    }

    // Find enemy bots
    bots.forEach(otherBot => {
      if (otherBot.id === b.id || otherBot.team === b.team) return;
      const dist = Math.hypot(otherBot.x - b.x, otherBot.y - b.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestEnemy = otherBot;
      }
    });

    if (closestEnemy) {
      // Move towards enemy if melee
      if (b.botType === 'melee') {
        const angle = Math.atan2(closestEnemy.y - b.y, closestEnemy.x - b.x);
        b.vx = Math.cos(angle) * b.speed;
        b.vy = Math.sin(angle) * b.speed;

        // Melee attack logic
        if (closestDist < b.radius + closestEnemy.radius + 10 && now - b.lastFired > 1000) {
           b.lastFired = now;
           closestEnemy.health -= 30; // Instant damage
        }
      } else {
        // Ranged attacks
        if (now - b.lastFired > (b.botType === 'heavy' ? 2000 : 1500)) {
          b.lastFired = now;
          const angle = Math.atan2(closestEnemy.y - b.y, closestEnemy.x - b.x);

          if (b.botType === 'heavy') {
            // Shotgun (3 pellets)
            for (let i = -1; i <= 1; i++) {
              const spread = angle + (i * 0.2);
              projectiles.push({
                id: generateId(), ownerId: b.id, ownerType: 'bot', ownerTeam: b.team,
                x: b.x, y: b.y, vx: Math.cos(spread) * config.projectileSpeed * 0.6, vy: Math.sin(spread) * config.projectileSpeed * 0.6,
                life: 1500, born: now
              });
            }
          } else {
            // Standard
            projectiles.push({
              id: generateId(), ownerId: b.id, ownerType: 'bot', ownerTeam: b.team,
              x: b.x, y: b.y, vx: Math.cos(angle) * config.projectileSpeed * 0.4, vy: Math.sin(angle) * config.projectileSpeed * 0.4,
              life: 2000, born: now
            });
          }
        }
      }
    }
  });

  // Update projectiles and check collisions
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;

    let hit = false;
    let removeProj = false;

    // Projectile vs Bots
    for (let j = bots.length - 1; j >= 0; j--) {
      const b = bots[j];
      if (proj.ownerTeam === b.team) continue; // Friendly fire off
      if (Math.hypot(proj.x - b.x, proj.y - b.y) < b.radius + 10) {
        b.health -= (proj.ownerType === 'player' ? 50 : 35); // Bots do less damage to bots
        hit = true;
        removeProj = true;
        if (b.health <= 0) {
          bots.splice(j, 1);
          if (proj.ownerType === 'player' && players[proj.ownerId]) {
            players[proj.ownerId].kills++;
            players[proj.ownerId].score += 10;
            io.emit('killEvent', { killer: proj.ownerId, victim: 'bot', x: b.x, y: b.y });
          }
          setTimeout(() => { bots.push(createBot()); }, 3000);
        }
        break;
      }
    }

    // Projectile vs Players
    if (!hit) {
      for (const pid in players) {
        if (pid === proj.ownerId) continue;
        const p = players[pid];
        if (proj.ownerTeam === p.team) continue; // Friendly fire off
        if (Math.hypot(proj.x - p.x, proj.y - p.y) < p.radius + 10) {
          p.health -= 20;
          hit = true;
          removeProj = true;

          if (p.health <= 0) {
            p.deaths++;
            let killerName = 'bot';
            if (proj.ownerType === 'player' && players[proj.ownerId]) {
              players[proj.ownerId].kills++;
              players[proj.ownerId].score += 50;
              killerName = players[proj.ownerId].username;
            }

            sendAnalyticsEvent(p.username, 'death', `Killed by ${killerName}`);
            io.emit('killEvent', { killer: proj.ownerId, victim: pid, x: p.x, y: p.y });

            p.x = Math.random() * config.width;
            p.y = Math.random() * config.height;
            p.health = 100;
          }
          break;
        }
      }
    }

    if (removeProj || now - proj.born > proj.life || proj.x < 0 || proj.x > config.width || proj.y < 0 || proj.y > config.height) {
      projectiles.splice(i, 1);
    }
  }

  // Broadcast state
  io.emit('state', {
    players,
    bots,
    projectiles
  });

}, 1000 / TICK_RATE);

// Graceful shutdown to save stats
process.on('SIGINT', async () => {
  console.log('Shutting down, saving stats...');
  for (const id in players) {
    const p = players[id];
    await updateUserStats(p.username, p.kills, p.deaths, p.score);
  }
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
