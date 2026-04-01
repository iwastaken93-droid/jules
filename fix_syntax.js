const fs = require('fs');
const path = 'src/server.js';
let content = fs.readFileSync(path, 'utf8');

// The regex replacement duplicated the Projectile vs Players section and left unclosed braces. Let's fix it.
const broken = `    // Projectile vs Players
    if (!hit) {
      for (const pid in players) {
        if (pid === proj.ownerId) continue;
        const p = players[pid];
        if (proj.ownerTeam === p.team) continue; // Friendly fire off

    // Projectile vs Players

    if (!hit) {
      for (const pid in players) {
        if (pid === proj.ownerId) continue;
        const p = players[pid];
        if (Math.hypot(proj.x - p.x, proj.y - p.y) < p.radius + 10) {`;

const fixed = `    // Projectile vs Players
    if (!hit) {
      for (const pid in players) {
        if (pid === proj.ownerId) continue;
        const p = players[pid];
        if (proj.ownerTeam === p.team) continue; // Friendly fire off

        if (Math.hypot(proj.x - p.x, proj.y - p.y) < p.radius + 10) {`;

content = content.replace(broken, fixed);

fs.writeFileSync(path, content, 'utf8');
console.log('fixed');
