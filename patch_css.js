const fs = require('fs');
const path = 'src/public/style.css';
let content = fs.readFileSync(path, 'utf8');

const newCSS = `
@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap');

body, html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #222;
  color: #fff;
  font-family: 'Fredoka One', cursive, sans-serif;
  user-select: none;
}

canvas {
  display: block;
}

/* UI Overlays */
#login-screen {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.login-box {
  background: #cbd5e1; /* Light grey metal look */
  padding: 40px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 10px 0px rgba(0,0,0,0.4);
  border: 6px solid #1e293b;
  width: 400px;
}

.login-box h1 {
  margin-top: 0;
  color: #e62429; /* Red imposter color */
  text-transform: uppercase;
  letter-spacing: 2px;
  text-shadow: 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000;
  font-size: 36px;
}

.login-box p {
  color: #1e293b;
  font-size: 18px;
}

input {
  width: 80%;
  padding: 15px;
  margin: 20px 0;
  border: 4px solid #1e293b;
  background: #f8fafc;
  color: #1e293b;
  font-family: 'Fredoka One', cursive, sans-serif;
  font-size: 20px;
  border-radius: 8px;
  outline: none;
  box-shadow: inset 0 3px 0 rgba(0,0,0,0.1);
}

button {
  padding: 15px 30px;
  background: #22c55e; /* Green go button */
  border: 4px solid #1e293b;
  border-radius: 8px;
  color: #fff;
  font-family: 'Fredoka One', cursive, sans-serif;
  font-size: 24px;
  text-transform: uppercase;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
  box-shadow: 0 6px 0 #15803d;
  text-shadow: 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000;
}

button:active {
  transform: translateY(6px);
  box-shadow: 0 0 0 #15803d;
}

#game-ui {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none;
  z-index: 10;
}

#stats {
  position: absolute;
  top: 20px;
  left: 20px;
  font-size: 20px;
  background: #cbd5e1;
  color: #1e293b;
  padding: 10px 20px;
  border-radius: 12px;
  border: 4px solid #1e293b;
  box-shadow: 0 6px 0 rgba(0,0,0,0.3);
}

#health-bar-container {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  width: 400px;
  height: 30px;
  background: #64748b;
  border: 4px solid #1e293b;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 6px 0 rgba(0,0,0,0.4);
}

#health-bar {
  width: 100%;
  height: 100%;
  background: #22c55e;
  transition: width 0.1s linear, background-color 0.2s;
}

#leaderboard {
  position: absolute;
  top: 20px;
  right: 20px;
  background: #cbd5e1;
  color: #1e293b;
  padding: 15px;
  border-radius: 12px;
  width: 220px;
  border: 4px solid #1e293b;
  box-shadow: 0 6px 0 rgba(0,0,0,0.3);
}

#leaderboard h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
  color: #e62429;
  text-transform: uppercase;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
}

#leaderboard ul {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 16px;
}

#leaderboard li {
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  border-bottom: 2px dashed #94a3b8;
  padding-bottom: 4px;
}
`;

fs.writeFileSync(path, newCSS, 'utf8');
console.log('css patched');
