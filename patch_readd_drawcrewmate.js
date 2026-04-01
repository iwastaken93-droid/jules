const fs = require('fs');
const path = 'src/public/game.js';
let content = fs.readFileSync(path, 'utf8');

const helperFunctions = `
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
  const bw = 4; // border width

  // Set styles
  ctx.fillStyle = color;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = bw;
  ctx.lineJoin = 'round';

  // Draw Backpack
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(-w*0.8, -h*0.3, w*0.4, h*0.8, w*0.2);
  } else {
    ctx.rect(-w*0.8, -h*0.3, w*0.4, h*0.8); // fallback
  }
  ctx.fill();
  ctx.stroke();

  // Draw Legs
  // Back leg
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(-w*0.3, h*0.2, w*0.35, h*0.7, w*0.15);
  } else {
    ctx.rect(-w*0.3, h*0.2, w*0.35, h*0.7);
  }
  ctx.fill();
  ctx.stroke();

  // Front leg
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(w*0.1, h*0.2, w*0.35, h*0.7, w*0.15);
  } else {
    ctx.rect(w*0.1, h*0.2, w*0.35, h*0.7);
  }
  ctx.fill();
  ctx.stroke();

  // Main Body
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(-w*0.5, -h*0.8, w*1.1, h*1.4, w*0.5);
  } else {
    ctx.rect(-w*0.5, -h*0.8, w*1.1, h*1.4);
  }
  ctx.fill();
  ctx.stroke();

  // Visor
  ctx.fillStyle = '#9bd8e0'; // Light blue visor
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(w*0.1, -h*0.5, w*0.8, h*0.5, h*0.25);
  } else {
    ctx.rect(w*0.1, -h*0.5, w*0.8, h*0.5);
  }
  ctx.fill();
  ctx.stroke();

  // Visor highlight
  ctx.fillStyle = '#e1f4f6';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(w*0.3, -h*0.4, w*0.4, h*0.15, h*0.1);
  } else {
    ctx.rect(w*0.3, -h*0.4, w*0.4, h*0.15);
  }
  ctx.fill();

  ctx.restore();

  // Draw floating hand/gun pointing exactly at target
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(aimAngle);

  // Hand distance from center
  const handDist = radius * 1.5;

  // Gun barrel
  ctx.fillStyle = '#444';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = bw;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(handDist + radius*0.2, -radius*0.3, radius, radius*0.6, 2);
  } else {
    ctx.rect(handDist + radius*0.2, -radius*0.3, radius, radius*0.6);
  }
  ctx.fill();
  ctx.stroke();

  // Hand (circle holding gun)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(handDist, 0, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawGrid`;

content = content.replace("function drawGrid", helperFunctions);
fs.writeFileSync(path, content, 'utf8');
console.log('drawCrewmate added back');
