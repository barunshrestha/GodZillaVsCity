# Kart 64 — Retro 64-bit Kart Racing

A browser-based 3D kart racing game inspired by classic N64-era racers. Low-poly graphics, vibrant colors, and simple arcade physics.

## How to Play

1. Open `index.html` in a modern browser, or run a local server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`

2. Click **START RACE** and complete **3 laps** before your opponents.

### Controls

| Key | Action |
|-----|--------|
| ↑ | Accelerate |
| ↓ | Brake / Reverse |
| ← | Steer left |
| → | Steer right |

## Features

- N64-style low-poly 3D graphics with flat shading
- Oval race track with kerbs, barriers, and scenery
- 4 karts (you + 3 AI opponents)
- Lap counter, speedometer, position, and race timer
- Countdown start and finish screen

## Tech Stack

- **Three.js** — 3D rendering
- **Vanilla JavaScript** — game logic and physics
- **HTML / CSS** — UI and HUD

No build step required. Works in any modern browser with WebGL support.
