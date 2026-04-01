const fs = require('fs');
const path = 'src/server.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Generate obstacles in config
const configInjection = `const config = {
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
`;
content = content.replace(/const config = {[\s\S]*?fireCooldown: 150\n\};/, configInjection);


// Helper for circle-rect collision
const collisionHelper = `
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
`;

content = content.replace("const TICK_RATE = 30;", collisionHelper + "\nconst TICK_RATE = 30;");


// Player collision with obstacles
const playerCollision = `
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
`;
content = content.replace(/p\.x = Math\.max\(p\.radius, Math\.min\(config\.width - p\.radius, p\.x\)\);\n    p\.y = Math\.max\(p\.radius, Math\.min\(config\.height - p\.radius, p\.y\)\);/, playerCollision);

// Bot collision with obstacles
const botCollision = `
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
`;
content = content.replace(/if \(b\.x <= b\.radius \|\| b\.x >= config\.width - b\.radius\) b\.vx \*= -1;\n    if \(b\.y <= b\.radius \|\| b\.y >= config\.height - b\.radius\) b\.vy \*= -1;/, botCollision);

// Projectile collision with obstacles
const projCollision = `
    // Projectile vs Obstacles
    if (!hit) {
      for (const obs of config.obstacles) {
        if (proj.x >= obs.x && proj.x <= obs.x + obs.w &&
            proj.y >= obs.y && proj.y <= obs.y + obs.h) {
          hit = true;
          removeProj = true;
          break;
        }
      }
    }

    // Projectile vs Players
`;
content = content.replace("// Projectile vs Players", projCollision);

fs.writeFileSync(path, content, 'utf8');
console.log('server obstacles patched');
