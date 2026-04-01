const fs = require('fs');
const path = 'src/server.js';
let content = fs.readFileSync(path, 'utf8');

// Bot names and types
const botNamesAndTypes = `
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
    speed: speed
  };
}

// Spawn some initial bots
for (let i = 0; i < 25; i++) {
  bots.push(createBot());
}
`;

// Replace old bot spawn
content = content.replace(/for \(let i = 0; i < 25; i\+\+\) \{[\s\S]*?bots\.push\(\{[\s\S]*?lastFired: 0\n  \}\);\n\}/, botNamesAndTypes);

// Update Player join to assign a team
const playerJoinTeam = `
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
`;
content = content.replace(/players\[socket\.id\] = \{[\s\S]*?dbUser: user\n    \};/, playerJoinTeam);


// Update Bot behavior (target players AND other bots)
const botLogic = `
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
`;
content = content.replace(/let closestPlayer = null;[\s\S]*?\}\n    \}\n  \}\);/, botLogic + "\n  });");

// Update player shooting to include team
const playerShoot = `
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
`;
content = content.replace(/const angle = Math\.atan2\(data\.mouseY - p\.y, data\.mouseX - p\.x\);\n    projectiles\.push\(\{[\s\S]*?born: now\n    \}\);/, playerShoot);


// Friendly fire check in collision
const collisionLogic = `
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
`;

content = content.replace(/\/\/ Projectile vs Bots\n    if \(proj.ownerType === 'player'\) \{[\s\S]*?\/\/ Projectile vs Players/, collisionLogic + "\n    // Projectile vs Players");

fs.writeFileSync(path, content, 'utf8');
console.log('teams patched');
