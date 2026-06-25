# Kaiju Clash

A retro-style two-player fighting game featuring giant monster (kaiju) characters.

## Play

Open `index.html` in a browser, or run a local server:

```bash
./serve.sh
```

Or manually:

```bash
python3 -m http.server 8080
```

If you see `Address already in use`, port 8080 is taken — use `./serve.sh` (picks a free port) or stop the other process:

```bash
lsof -i :8080   # find the PID
kill <PID>      # stop it, then retry
```

## Controls

### Player 1
| Key | Action |
|-----|--------|
| A / D | Move left / right |
| W | Jump |
| S | Block |
| Q | Punch |
| E | Kick |
| R | Special attack |

### Player 2
| Key | Action |
|-----|--------|
| ← / → | Move left / right |
| ↑ | Jump |
| ↓ | Block |
| U | Punch |
| I | Kick |
| O | Special attack |

## Kaiju Roster

- **GORATH** — Atomic breath special
- **MOTHRA-X** — Poison dust special
- **KRAKEN** — Tentacle slam special
- **MECH-KAI** — Rocket fist special

## How to Play

1. Press **Enter** on the title screen
2. Each player selects a kaiju (P1: A/D, P2: ←/→)
3. Press **Enter** to start the fight
4. Reduce your opponent's health to zero before time runs out
5. Press **Enter** after the match for a rematch
