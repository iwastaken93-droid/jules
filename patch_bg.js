const fs = require('fs');
const path = 'src/public/game.js';
let content = fs.readFileSync(path, 'utf8');

const newDrawGrid = `
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
`;

content = content.replace(/function drawGrid\(cx, cy\) \{[\s\S]*?\}\n\}/, newDrawGrid);
fs.writeFileSync(path, content, 'utf8');
console.log('bg patched');
