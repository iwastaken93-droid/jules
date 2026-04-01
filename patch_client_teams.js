const fs = require('fs');
const path = 'src/public/game.js';
let content = fs.readFileSync(path, 'utf8');

const drawTeamBots = `
  // Draw Bots
  serverState.bots.forEach(b => {
    const botAngle = Math.atan2(b.vy, b.vx);
    let color = b.team === 'red' ? '#ef4444' : b.team === 'blue' ? '#3b82f6' : b.team === 'green' ? '#22c55e' : '#eab308';

    // Different visuals for bot types
    if (b.botType === 'heavy') color = '#94a3b8'; // Grey tank
    if (b.botType === 'melee') color = '#fbbf24'; // Fast yellow

    drawCrewmate(ctx, b.x - camera.x, b.y - camera.y, b.radius, color, botAngle, true);

    // Name tag
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 12px Fredoka One';
    ctx.textAlign = 'center';
    const nameY = b.y - camera.y - b.radius * 2.5;
    ctx.strokeText(b.username, b.x - camera.x, nameY);
    ctx.fillText(b.username, b.x - camera.x, nameY);

    // Health
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    const hpW = b.radius * 2.5;
    const hpH = 8;
    const hpX = b.x - camera.x - hpW/2;
    const hpY = b.y - camera.y - b.radius * 2.2;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(hpX, hpY, hpW, hpH, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(hpX, hpY, hpW * (b.health/b.maxHealth), hpH, 2);
      ctx.fill();
    } else {
      ctx.strokeRect(hpX, hpY, hpW, hpH);
      ctx.fillRect(hpX, hpY, hpW * (b.health/b.maxHealth), hpH);
    }
  });

  // Draw Players
  for (const id in serverState.players) {
    const p = serverState.players[id];
    const isMe = id === myId;

    const aimAngle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
    // Use team colors
    let teamColor = p.team === 'red' ? '#ef4444' : p.team === 'blue' ? '#3b82f6' : p.team === 'green' ? '#22c55e' : '#eab308';
    const color = isMe ? '#ffffff' : teamColor; // Me is white so you stand out
    drawCrewmate(ctx, p.x - camera.x, p.y - camera.y, p.radius, color, aimAngle, false);

    // Name tag
    ctx.fillStyle = teamColor;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 16px Fredoka One';
    ctx.textAlign = 'center';
    const nameY = p.y - camera.y - p.radius * 2.5;
    ctx.strokeText(p.username, p.x - camera.x, nameY);
    ctx.fillText(p.username, p.x - camera.x, nameY);
  }
`;

content = content.replace(/\/\/ Draw Bots[\s\S]*?\}\n  \}/, drawTeamBots);

fs.writeFileSync(path, content, 'utf8');
console.log('client teams patched');
