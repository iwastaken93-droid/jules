const fs = require('fs');
const path = 'src/public/game.js';
let content = fs.readFileSync(path, 'utf8');

// Patch createExplosion to use larger chunky particles
const oldExplosion = /function createExplosion\([\s\S]*?\}\n\}/;
const newExplosion = `
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
`;
content = content.replace(oldExplosion, newExplosion);

// Patch particle draw to have black outline for the cartoon look
const oldParticleDraw = /draw\(ctx, cx, cy\) \{[\s\S]*?\}\n  \}/;
const newParticleDraw = `draw(ctx, cx, cy) {
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
  }`;
content = content.replace(oldParticleDraw, newParticleDraw);

// Patch projectile rendering (thick borders, pill shape)
const oldProjDraw = `
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
`;

const newProjDraw = `
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
`;
content = content.replace(oldProjDraw, newProjDraw);

fs.writeFileSync(path, content, 'utf8');
console.log('particles patched');
