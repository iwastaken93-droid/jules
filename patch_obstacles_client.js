const fs = require('fs');
const path = 'src/public/game.js';
let content = fs.readFileSync(path, 'utf8');

const drawObstacles = `
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
`;
content = content.replace("// Draw Bots", drawObstacles);

fs.writeFileSync(path, content, 'utf8');
console.log('client obstacles patched');
