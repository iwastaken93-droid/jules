const fs = require('fs');
const path = 'src/public/index.html';
let content = fs.readFileSync(path, 'utf8');

const dashHTML = `
    <div id="dash-bar-container" style="position: absolute; bottom: 70px; left: 50%; transform: translateX(-50%); width: 300px; height: 15px; background: #64748b; border: 4px solid #1e293b; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 0 rgba(0,0,0,0.4);">
      <div id="dash-bar" style="width: 100%; height: 100%; background: #fbbf24; transition: width 0.1s linear, background-color 0.2s;"></div>
      <div style="position: absolute; top: -2px; left: 50%; transform: translateX(-50%); color: #fff; font-size: 12px; font-family: 'Fredoka One'; text-shadow: 1px 1px 0 #000;">DASH (SPACE)</div>
    </div>
    <div id="health-bar-container">
`;

content = content.replace('<div id="health-bar-container">', dashHTML);
fs.writeFileSync(path, content, 'utf8');
console.log('html dash patched');
