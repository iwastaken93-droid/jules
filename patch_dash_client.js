const fs = require('fs');
const path = 'src/public/game.js';
let content = fs.readFileSync(path, 'utf8');

// Add Spacebar to keys
content = content.replace("keys = { w: false, a: false, s: false, d: false };", "keys = { w: false, a: false, s: false, d: false, ' ': false };");

// Update Input Handling for Dash
const dashInput = `
  if (keys[' '] && !mouse.dashedThisPress) {
    socket.emit('dash');
    mouse.dashedThisPress = true; // prevent holding space
  }
  if (!keys[' ']) {
    mouse.dashedThisPress = false;
  }
`;
content = content.replace("socket.emit('input', {", dashInput + "\n  socket.emit('input', {");

// Add Cooldown UI element mapping
const uiMap = `const healthBar = document.getElementById('health-bar');
const dashBar = document.getElementById('dash-bar');`;
content = content.replace("const healthBar = document.getElementById('health-bar');", uiMap);

// Add Cooldown calculation
const dashUpdate = `
  // Update UI Dash Cooldown
  const now = Date.now();
  const timeSinceDash = now - (me.lastDashed || 0);
  const dashPct = Math.min(100, (timeSinceDash / 3000) * 100);
  if (dashBar) {
    dashBar.style.width = dashPct + '%';
    dashBar.style.backgroundColor = dashPct >= 100 ? '#fbbf24' : '#94a3b8'; // yellow when ready
  }
`;

content = content.replace("// Update UI\n  uiScore.innerText = me.score;", dashUpdate + "\n  // Update UI\n  uiScore.innerText = me.score;");

fs.writeFileSync(path, content, 'utf8');
console.log('client dash patched');
