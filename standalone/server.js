/**
 * 🎱 Bingo Game Server
 * Real-time WebSocket server for a TV-display / host-controller Bingo game.
 * Run: node server.js
 */

const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LETTER = n =>
  n <= 15 ? 'B' : n <= 30 ? 'I' : n <= 45 ? 'N' : n <= 60 ? 'G' : 'O';

const makeBall = n => ({
  num: n,
  letter: LETTER(n),
  label: `${LETTER(n)}-${n}`,
  drawnAt: null,
});

const ALL_BALLS = Array.from({ length: 75 }, (_, i) => makeBall(i + 1));

function getLocalIP() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return 'localhost';
}

// ─── Game State ───────────────────────────────────────────────────────────────
let state = createFreshState();

function createFreshState() {
  return {
    calledBalls: [],      // array of ball objects in draw order
    currentBall: null,    // most recent ball
    status: 'waiting',    // 'waiting' | 'playing' | 'finished'
    autoSpeed: 0,         // 0 = off; else milliseconds between auto-draws
    startedAt: null,
    finishedAt: null,
  };
}

let autoTimer = null;

function drawNextBall() {
  const called = new Set(state.calledBalls.map(b => b.num));
  const remaining = ALL_BALLS.filter(b => !called.has(b.num));
  if (!remaining.length) return null;

  const ball = { ...remaining[Math.floor(Math.random() * remaining.length)] };
  ball.drawnAt = Date.now();
  state.calledBalls.push(ball);
  state.currentBall = ball;
  return ball;
}

function resetGame() {
  stopAutoTimer();
  state = createFreshState();
}

function stopAutoTimer() {
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
  }
}

function startAutoTimer(speed) {
  stopAutoTimer();
  if (speed <= 0) return;
  autoTimer = setInterval(() => {
    const ball = drawNextBall();
    if (!ball) {
      state.status = 'finished';
      state.finishedAt = Date.now();
      stopAutoTimer();
      broadcast({ type: 'gameOver', state: publicState() });
    } else {
      state.status = 'playing';
      broadcast({ type: 'ballDrawn', ball, state: publicState() });
    }
  }, speed);
}

// ─── Public state (safe to send to clients) ───────────────────────────────────
function publicState() {
  return {
    calledBalls: state.calledBalls,
    currentBall: state.currentBall,
    status: state.status,
    autoSpeed: state.autoSpeed,
    totalCalled: state.calledBalls.length,
    remaining: 75 - state.calledBalls.length,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
  };
}

// ─── WebSocket ────────────────────────────────────────────────────────────────
const clients = new Set();

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const ws of clients) {
    if (ws.readyState === 1 /* OPEN */) ws.send(msg);
  }
}

wss.on('connection', ws => {
  clients.add(ws);

  // Send full current state immediately on connect
  ws.send(JSON.stringify({ type: 'state', state: publicState() }));

  ws.on('message', raw => {
    try {
      handleMessage(JSON.parse(raw.toString()), ws);
    } catch (e) {
      console.error('WS parse error:', e.message);
    }
  });

  ws.on('close', () => clients.delete(ws));
  ws.on('error', err => console.error('WS client error:', err.message));
});

function handleMessage(msg, ws) {
  switch (msg.type) {

    // ── Draw a ball ──
    case 'draw': {
      if (state.status === 'finished') break;
      if (!state.startedAt) state.startedAt = Date.now();
      state.status = 'playing';

      const ball = drawNextBall();
      if (!ball) {
        state.status = 'finished';
        state.finishedAt = Date.now();
        stopAutoTimer();
        broadcast({ type: 'gameOver', state: publicState() });
      } else {
        broadcast({ type: 'ballDrawn', ball, state: publicState() });
      }
      break;
    }

    // ── Set auto-draw speed ──
    case 'autoSpeed': {
      const speed = Number(msg.speed) || 0;
      state.autoSpeed = speed;

      if (speed > 0 && state.status !== 'finished') {
        if (!state.startedAt) state.startedAt = Date.now();
        startAutoTimer(speed);
      } else {
        stopAutoTimer();
      }
      broadcast({ type: 'autoSpeed', speed });
      break;
    }

    // ── Reset game ──
    case 'reset': {
      resetGame();
      broadcast({ type: 'reset', state: publicState() });
      break;
    }

    // ── Client requests full state sync ──
    case 'getState': {
      ws.send(JSON.stringify({ type: 'state', state: publicState() }));
      break;
    }
  }
}

// ─── REST endpoints ───────────────────────────────────────────────────────────
app.get('/api/state', (_, res) => res.json(publicState()));

app.get('/api/info', (_, res) => {
  const ip = getLocalIP();
  res.json({ ip, port: PORT, localUrl: `http://${ip}:${PORT}` });
});

// Friendly routes so you can navigate to /display or /controller
app.get('/display', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'display.html'))
);
app.get('/controller', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'controller.html'))
);
app.get('/', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'controller.html'))
);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║         🎱  Bingo Game Server  🎱        ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n  ✅  Server running on port ${PORT}`);
  console.log('\n  ── Open these URLs in your browsers ──────');
  console.log(`  🎮  Controller : http://${ip}:${PORT}/controller`);
  console.log(`  📺  TV Display : http://${ip}:${PORT}/display`);
  console.log('\n  ── Or on this machine ─────────────────────');
  console.log(`  🎮  Controller : http://localhost:${PORT}/controller`);
  console.log(`  📺  TV Display : http://localhost:${PORT}/display`);
  console.log('\n  Cast the Display URL to your TV/Chromecast.');
  console.log('  Use the Controller on your phone or laptop.');
  console.log('──────────────────────────────────────────────\n');
});
