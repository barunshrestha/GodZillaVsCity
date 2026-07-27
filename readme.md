# Godzilla vs City

A lightweight browser game where Godzilla stomps through downtown and smashes every building before time runs out.

## Run the game

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

You can also run it without npm:

```bash
python3 -m http.server 3000
```

## How to play

- Move with `WASD` or the arrow keys.
- Smash nearby buildings with `Space`, click, or tap.
- Restart with `R`.
- Win by clearing every building before the timer reaches zero.
- Avoid helicopter fire to keep Godzilla's health above zero.

## Game states

- **Loading:** city and Godzilla are prepared before play starts.
- **Success / empty:** all buildings are destroyed and no city targets remain.
- **Error:** the browser does not support Canvas.
- **Game over:** health reaches zero or time runs out.
