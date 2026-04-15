# 🎱 Bingo Game — Local WebSocket Edition

Real-time Bingo with a **TV display** (cast screen) and a **host controller** (phone or laptop), connected over your local Wi-Fi using WebSockets.

---

## Quick Start

### 1. Install Node.js (if not already installed)
Download from https://nodejs.org — version 18 or higher recommended.

### 2. Open Terminal and navigate to this folder
```bash
cd path/to/standalone
```

### 3. Install dependencies (one time only)
```bash
npm install
```

### 4. Start the server
```bash
npm start
```

You'll see output like:
```
✅  Server running on port 3000
   Controller : http://192.168.1.42:3000/controller
   TV Display : http://192.168.1.42:3000/display
```

### 5. Open the pages
| Device | URL |
|--------|-----|
| **Host / Controller** | `http://YOUR-IP:3000/controller` |
| **TV Display** | `http://YOUR-IP:3000/display` |

- The **Controller** page shows a QR code — scan it on your TV or phone to open the Display page.
- Cast the **Display** tab to your TV using Chrome's cast feature (⋮ → Cast…) or open it directly in your TV's browser.

---

## Features

### TV Display
- Large animated current ball with letter (B/I/N/G/O) color coding
- Full 75-ball BINGO board — called balls highlight with glow
- Last 5 drawn balls shown as mini bubbles
- Ball announcement via Web Speech API ("B seven", "O sixty-four")
- Chime sound on every draw
- Confetti + fanfare when all 75 balls are called
- Auto-reconnects if the connection drops

### Host Controller
- Big **DRAW** button for manual draws
- **Auto-draw** toggle with 5 / 10 / 15 / 20 / 30 second intervals
- Live countdown bar showing when the next auto-draw fires
- QR code linking directly to the TV display URL
- Stats: balls called, remaining, % complete
- Chip log of all called balls (newest first)
- Reset button (requires double-tap to prevent accidents)

---

## Changing the port
Set the `PORT` environment variable:
```bash
PORT=8080 npm start
```

---

## Troubleshooting

**TV can't reach the display URL?**
- Make sure your phone/TV and computer are on the same Wi-Fi network.
- Check your computer's firewall — allow port 3000 for inbound connections.

**No sound?**
- Both pages require a user interaction (tap/click) before audio can play — this is a browser requirement.
- On the Display page, tap anywhere once to unlock audio.

**QR code not showing?**
- The controller page loads the QR code from a CDN. Make sure you have internet access when opening it.
