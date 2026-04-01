const fs = require('fs');

const path = 'src/public/game.js';
let content = fs.readFileSync(path, 'utf8');

// Helper function to draw an Among Us character
const drawCharacterCode = `
function drawCrewmate(ctx, x, y, radius, color, aimAngle, isBot = false) {
  ctx.save();
  ctx.translate(x, y);

  // Determine direction based on aimAngle
  // -PI/2 to PI/2 is facing right
  const facingRight = Math.abs(aimAngle) < Math.PI / 2;
  const flip = facingRight ? 1 : -1;

  ctx.scale(flip, 1);

  const w = radius * 1.5;
  const h = radius * 1.8;
  const bw = 6; // border width

  // Set styles
  ctx.fillStyle = color;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = bw;
  ctx.lineJoin = 'round';

  // Backpack
  ctx.beginPath();
  ctx.roundRect(-w*0.8, -h*0.3, w*0.6, h*0.8, w*0.3);
  ctx.fill();
  ctx.stroke();

  // Left Leg (Back)
  ctx.beginPath();
  ctx.roundRect(-w*0.3, h*0.2, w*0.4, h*0.7, w*0.2);
  ctx.fill();
  ctx.stroke();

  // Right Leg (Front)
  ctx.beginPath();
  ctx.roundRect(w*0.1, h*0.2, w*0.4, h*0.7, w*0.2);
  ctx.fill();
  ctx.stroke();

  // Main Body
  ctx.beginPath();
  ctx.roundRect(-w*0.5, -h*0.8, w, h*1.4, w*0.5);
  ctx.fill();
  ctx.stroke();

  // Visor
  ctx.fillStyle = '#9bd8e0'; // Light blue visor
  ctx.beginPath();
  ctx.roundRect(0, -h*0.5, w*0.8, h*0.5, h*0.25);
  ctx.fill();
  ctx.stroke();

  // Visor highlight
  ctx.fillStyle = '#e1f4f6';
  ctx.beginPath();
  ctx.roundRect(w*0.2, -h*0.4, w*0.4, h*0.15, h*0.1);
  ctx.fill();

  ctx.restore();

  // Draw floating hand/gun
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(aimAngle);

  // Hand distance from center
  const handDist = radius * 1.5;

  // Hand
  ctx.fillStyle = color;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = bw - 2;
  ctx.beginPath();
  ctx.arc(handDist, 0, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Gun
  ctx.fillStyle = '#666';
  ctx.beginPath();
  ctx.roundRect(handDist + radius * 0.2, -radius*0.2, radius*0.8, radius*0.4, 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}
`;

content = content.replace('// Visual Effects', drawCharacterCode + '\n// Visual Effects');

// Replace bot drawing
const oldBotDraw = `
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
`;

const newBotDraw = `
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
`;

content = content.replace(oldBotDraw, newBotDraw);

// Replace player drawing
const oldPlayerDraw = `
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
`;

const newPlayerDraw = `
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
`;

content = content.replace(oldPlayerDraw, newPlayerDraw);

fs.writeFileSync(path, content, 'utf8');
console.log('patched');
