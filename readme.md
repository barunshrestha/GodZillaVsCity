## Godzilla vs City (Kid-Friendly)

A small kid-friendly browser game where **Godzilla emerges from the ocean**, attacks New York, and you control a **tank** to stop him.

### Story / Plot

- Godzilla emerges from the ocean and walks toward New York City.
- The city buildings get damaged as Godzilla moves through them.
- You control a tank to defend the city:
  - **Tank health starts at 100%**
  - **Godzilla health starts at 100%**
- If Godzilla’s health reaches **0%**, he **flees back to the ocean** (you win).
- If the tank’s health reaches **0%**, **Godzilla wins** (game over).

### Controls

- **Move**: Arrow keys (← ↑ ↓ →)
- **Shoot**: Spacebar
- **Touch devices**: Use the on-screen arrows + **Shoot** button

### How to Run

This is a static website (no install needed).

- Open `index.html` in a browser, or
- Serve the folder locally (recommended so some browsers don’t restrict file loading):

```bash
cd /workspace
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

### Files

- `index.html`: Page + UI
- `styles.css`: Styling
- `game.js`: Game logic + rendering
