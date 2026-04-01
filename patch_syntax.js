const fs = require('fs');
const path = 'src/public/game.js';
let content = fs.readFileSync(path, 'utf8');

// The drawGrid function got swallowed inside the Particle class in my previous patch due to bad regex replacement! Let's extract it and fix the Particle class.

const brokenParticleCode = `  draw(ctx, cx, cy) {
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
}`;

const fixedParticleCode = `  draw(ctx, cx, cy) {
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
`;

content = content.replace(brokenParticleCode, fixedParticleCode);
fs.writeFileSync(path, content, 'utf8');
console.log('syntax fixed');
