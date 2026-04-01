const fs = require('fs');
const path = 'src/server.js';
let content = fs.readFileSync(path, 'utf8');

// Add lastDashed to player init
content = content.replace("lastFired: 0,", "lastFired: 0,\n      lastDashed: 0,");

// Handle Dash Input
const dashInput = `
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
`;

content = content.replace("socket.on('shoot', (data) => {", dashInput + "\n  socket.on('shoot', (data) => {");

fs.writeFileSync(path, content, 'utf8');
console.log('server dash patched');
