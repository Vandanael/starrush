# STAR RUSH

**Capture the Sun before the AI does.**

A minimalist real-time strategy game. The Sun is dying, and you have 3 minutes to build a Dyson Sphere before the AI does.

---

## Pitch

The Sun is dying. You have 3 minutes to capture it by building 8 sphere segments. The AI is racing against you. First to 8 segments wins. Click planets to attack, manage your energy, and capture the Sun before time runs out.

---

## Quick Start

### Installation

```bash
npm install
```

### Run

```bash
npm run dev
```

The game will be available at `http://localhost:5173` (or the port shown in the terminal).

---

## Tech Stack

- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **PixiJS 7** - High-performance 2D WebGL renderer
- **Zustand** - Lightweight state management
- **Canvas 2D** - Native canvas rendering (via PixiJS)

**Bundle Size**: ~200 KB gzipped

---

## Game Modes

- **Classic** - 2 minutes, 5 planets to unlock Sun
- **Quick Match** - 1 minute, 4 planets to unlock Sun
- **Time Attack** - Race against the clock (30s, 60s, 90s, 120s)

---

**Version**: MVP 0.1.0  
**License**: MIT
