# Kaiju Clash

A retro-style two-player fighting game featuring giant monster (kaiju) characters.

## Play

Open `index.html` in a browser, or start the local server:

```bash
./serve.sh
```

This always uses port 8080 and stops any stale server that is still running.

To use a different port:

```bash
./serve.sh 3000
```

**Do not run** `python3 -m http.server 8080` directly — if a previous server is still running you will get `Address already in use`. Use `./serve.sh` instead.

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
