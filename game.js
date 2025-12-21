/* Kid-friendly Godzilla vs City mini-game (no external assets).
   Controls: Arrow keys to move, Space to shoot. Touch buttons supported.
*/

(() => {
  "use strict";

  /** @type {HTMLCanvasElement} */
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });

  const startBtn = document.getElementById("startBtn");
  const restartBtn = document.getElementById("restartBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayBody = document.getElementById("overlayBody");
  const overlayStart = document.getElementById("overlayStart");
  const tankBar = document.getElementById("tankBar");
  const gBar = document.getElementById("gBar");
  const tankPct = document.getElementById("tankPct");
  const gPct = document.getElementById("gPct");

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const dist2 = (ax, ay, bx, by) => {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  };

  const W = () => canvas.width;
  const H = () => canvas.height;

  // ----- Input -----
  const input = {
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false,
  };

  function setAction(action, active) {
    if (action in input) input[action] = active;
  }

  window.addEventListener(
    "keydown",
    (e) => {
      const key = e.key;
      if (key === "ArrowLeft") setAction("left", true);
      if (key === "ArrowRight") setAction("right", true);
      if (key === "ArrowUp") setAction("up", true);
      if (key === "ArrowDown") setAction("down", true);
      if (key === " ") setAction("shoot", true);

      if (
        key === "ArrowLeft" ||
        key === "ArrowRight" ||
        key === "ArrowUp" ||
        key === "ArrowDown" ||
        key === " "
      ) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  window.addEventListener(
    "keyup",
    (e) => {
      const key = e.key;
      if (key === "ArrowLeft") setAction("left", false);
      if (key === "ArrowRight") setAction("right", false);
      if (key === "ArrowUp") setAction("up", false);
      if (key === "ArrowDown") setAction("down", false);
      if (key === " ") setAction("shoot", false);
    },
    { passive: true }
  );

  // Touch buttons
  for (const btn of document.querySelectorAll("[data-action]")) {
    const action = btn.getAttribute("data-action");
    const down = (e) => {
      e.preventDefault();
      setAction(action, true);
    };
    const up = (e) => {
      e.preventDefault();
      setAction(action, false);
    };
    btn.addEventListener("pointerdown", down, { passive: false });
    btn.addEventListener("pointerup", up, { passive: false });
    btn.addEventListener("pointercancel", up, { passive: false });
    btn.addEventListener("pointerleave", up, { passive: false });
  }

  // ----- Game state -----
  const GamePhase = Object.freeze({
    idle: "idle",
    running: "running",
    paused: "paused",
    winFlee: "winFlee",
    winDone: "winDone",
    lose: "lose",
  });

  /** @type {{phase: string, time: number, lastTs: number, started: boolean}} */
  const game = {
    phase: GamePhase.idle,
    time: 0,
    lastTs: 0,
    started: false,
  };

  const world = {
    shorelineX: 0,
    groundY: 0,
    cityLeft: 0,
    cityRight: 0,
  };

  /** @type {{x:number,y:number,w:number,h:number,speed:number,hp:number,fireCd:number}} */
  let tank;
  /** @type {{x:number,y:number,w:number,h:number,hp:number,state:"emerging"|"rampage"|"flee",t:number,fireCd:number}} */
  let godzilla;
  /** @type {Array<{x:number,y:number,w:number,h:number,hp:number,maxHp:number,hitFlash:number,winCols:number,winRows:number,winLit:boolean[]}>} */
  let buildings = [];
  /** @type {Array<{x:number,y:number,vx:number,vy:number,r:number,ttl:number}>} */
  let missiles = [];
  /** @type {Array<{x1:number,y1:number,x2:number,y2:number,w:number,ttl:number}>} */
  let heatRays = [];
  /** @type {Array<{x:number,y:number,r:number,t:number,ttl:number,color:string}>} */
  let explosions = [];

  function recomputeWorld() {
    world.shorelineX = Math.floor(W() * 0.22);
    world.groundY = Math.floor(H() * 0.78);
    world.cityLeft = world.shorelineX + 34;
    world.cityRight = W() - 18;
  }

  function createBuildings() {
    buildings = [];
    const left = world.cityLeft;
    const right = world.cityRight;
    const skylineTop = Math.floor(H() * 0.28);
    const baseY = world.groundY;

    const count = Math.floor(clamp(W() / 70, 9, 14));
    const gap = 10;
    const available = right - left - gap * (count - 1);
    const baseW = available / count;

    let x = left;
    for (let i = 0; i < count; i++) {
      const w = clamp(baseW * rand(0.72, 1.12), 34, 90);
      const h = clamp(rand(baseY - skylineTop, baseY - skylineTop + 110), 90, baseY - 70);
      const y = baseY - h;
      const maxHp = Math.round(clamp(h * 0.6, 70, 170));
      const winCols = Math.max(2, Math.floor(w / 14));
      const winRows = Math.max(4, Math.floor(h / 18));
      const winLit = [];
      for (let k = 0; k < winCols * winRows; k++) {
        // Deterministic-ish: stable windows pattern per building.
        const t = (i * 997 + k * 131) % 1000;
        winLit.push(t / 1000 < 0.62);
      }
      buildings.push({ x, y, w, h, hp: maxHp, maxHp, hitFlash: 0, winCols, winRows, winLit });
      x += w + gap;
    }
  }

  function resetGame() {
    recomputeWorld();
    createBuildings();
    missiles = [];
    heatRays = [];
    explosions = [];

    tank = {
      x: W() * 0.78,
      y: world.groundY - 22,
      w: 44,
      h: 26,
      speed: 265,
      hp: 100,
      fireCd: 0,
    };

    godzilla = {
      x: world.shorelineX * 0.48,
      y: world.groundY + 140, // start below ground (ocean emerge)
      w: 86,
      h: 128,
      hp: 100,
      state: "emerging",
      t: 0,
      fireCd: 0.85,
    };

    game.time = 0;
    game.lastTs = 0;
  }

  function setOverlay(visible, title, body, actionLabel = "Start Game") {
    overlayTitle.textContent = title;
    overlayBody.innerHTML = body;
    overlayStart.textContent = actionLabel;
    overlay.classList.toggle("hidden", !visible);
  }

  function setButtons({ canStart, canRestart, canPause, pauseLabel }) {
    startBtn.disabled = !canStart;
    restartBtn.disabled = !canRestart;
    pauseBtn.disabled = !canPause;
    pauseBtn.textContent = pauseLabel ?? "Pause";
  }

  function updateHUD() {
    const t = clamp(tank.hp, 0, 100);
    const g = clamp(godzilla.hp, 0, 100);
    tankBar.style.width = `${t}%`;
    gBar.style.width = `${g}%`;
    tankPct.textContent = `${Math.round(t)}%`;
    gPct.textContent = `${Math.round(g)}%`;
  }

  function circleHitsRect(cx, cy, r, rx, ry, rw, rh) {
    const closestX = clamp(cx, rx, rx + rw);
    const closestY = clamp(cy, ry, ry + rh);
    return dist2(cx, cy, closestX, closestY) <= r * r;
  }

  // ----- Drawing -----
  function drawBackground() {
    // Sky gradient
    const grd = ctx.createLinearGradient(0, 0, 0, H());
    grd.addColorStop(0, "#071338");
    grd.addColorStop(0.55, "#0a1b3d");
    grd.addColorStop(1, "#08142f");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W(), H());

    // Moon
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(W() * 0.84, H() * 0.17, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Ocean
    ctx.fillStyle = "#063250";
    ctx.fillRect(0, world.groundY, world.shorelineX, H() - world.groundY);
    // Ocean waves
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "#7be7ff";
    for (let i = 0; i < 6; i++) {
      const y = world.groundY + 10 + i * 14;
      ctx.beginPath();
      ctx.moveTo(6, y);
      ctx.quadraticCurveTo(world.shorelineX * 0.33, y - 7, world.shorelineX * 0.65, y);
      ctx.quadraticCurveTo(world.shorelineX * 0.83, y + 7, world.shorelineX - 10, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Ground
    ctx.fillStyle = "#1d3b2e";
    ctx.fillRect(world.shorelineX, world.groundY, W() - world.shorelineX, H() - world.groundY);

    // Shoreline strip
    ctx.fillStyle = "rgba(255, 234, 184, 0.65)";
    ctx.fillRect(world.shorelineX - 8, world.groundY - 2, 18, 6);
  }

  function drawBuilding(b) {
    const damage = 1 - b.hp / b.maxHp;
    const base = lerp(26, 10, damage);
    const r = Math.round(base);
    const g = Math.round(40 - damage * 22);
    const bl = Math.round(70 - damage * 36);
    ctx.fillStyle = `rgb(${r},${g},${bl})`;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    // Windows
    const cols = b.winCols;
    const rows = b.winRows;
    const litChance = 0.7 - damage * 0.45;
    const total = Math.max(1, cols * rows);
    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        const idx = iy * cols + ix;
        const wx = b.x + 5 + (ix * (b.w - 10)) / cols;
        const wy = b.y + 8 + (iy * (b.h - 16)) / rows;
        const ww = Math.max(3, b.w / (cols * 2.6));
        const wh = Math.max(4, b.h / (rows * 2.7));
        // Deterministic: as damage increases, fewer windows stay lit.
        const lit = b.winLit[idx] && idx / total < litChance;
        ctx.fillStyle = lit ? "rgba(255,240,170,0.45)" : "rgba(0,0,0,0.22)";
        ctx.fillRect(wx, wy, ww, wh);
      }
    }

    if (b.hitFlash > 0) {
      ctx.globalAlpha = clamp(b.hitFlash, 0, 1);
      ctx.fillStyle = "rgba(255,120,90,0.55)";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.globalAlpha = 1;
    }

    // Rubble if destroyed
    if (b.hp <= 0) {
      ctx.fillStyle = "rgba(120,120,120,0.55)";
      const rubbleY = world.groundY - 8;
      ctx.fillRect(b.x, rubbleY, b.w, 8);
    }
  }

  function drawCity() {
    for (const b of buildings) drawBuilding(b);

    // Simple "smoke" columns where buildings are destroyed
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#cbd5e1";
    for (const b of buildings) {
      if (b.hp > 0) continue;
      const sx = b.x + b.w * 0.5;
      const top = world.groundY - 70;
      ctx.beginPath();
      ctx.ellipse(sx, top, 14, 28, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTank() {
    // Body
    ctx.fillStyle = "#9aa4b2";
    ctx.fillRect(tank.x, tank.y, tank.w, tank.h);
    // Treads
    ctx.fillStyle = "#2b2f36";
    ctx.fillRect(tank.x - 3, tank.y + tank.h - 7, tank.w + 6, 9);
    // Turret
    ctx.fillStyle = "#b8c0cc";
    ctx.fillRect(tank.x + 11, tank.y - 8, 22, 12);
    // Barrel
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(tank.x + 30, tank.y - 5, 18, 4);

    // Health glow when low
    if (tank.hp < 35) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#ff4d6d";
      ctx.fillRect(tank.x - 4, tank.y - 10, tank.w + 8, tank.h + 14);
      ctx.globalAlpha = 1;
    }
  }

  function drawGodzilla() {
    const gx = godzilla.x;
    const gy = godzilla.y;
    const w = godzilla.w;
    const h = godzilla.h;

    // Shadow on ground (unless still below ground)
    const shadowAlpha = clamp((world.groundY - gy + h * 0.6) / 120, 0, 1);
    ctx.globalAlpha = 0.25 * shadowAlpha;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(gx + w * 0.45, world.groundY + 3, w * 0.42, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Body silhouette (black/dark Godzilla)
    ctx.fillStyle = "#0b0f14";
    ctx.beginPath();
    ctx.roundRect(gx, gy, w * 0.68, h, 18);
    ctx.fill();

    // Head
    ctx.fillStyle = "#121821";
    ctx.beginPath();
    ctx.roundRect(gx + w * 0.45, gy + 12, w * 0.44, 34, 14);
    ctx.fill();

    // Eye
    ctx.fillStyle = "#e2f2ff";
    ctx.beginPath();
    ctx.arc(gx + w * 0.78, gy + 28, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#062a1a";
    ctx.beginPath();
    ctx.arc(gx + w * 0.79, gy + 28, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Dorsal spikes (glowy blue)
    ctx.fillStyle = "#66f2ff";
    for (let i = 0; i < 6; i++) {
      const px = gx + 8 + i * 10;
      const py = gy + 8 + i * 12;
      ctx.beginPath();
      ctx.moveTo(px, py + 18);
      ctx.lineTo(px + 8, py);
      ctx.lineTo(px + 16, py + 18);
      ctx.closePath();
      ctx.fill();
    }

    // Arms
    ctx.fillStyle = "#0f141b";
    ctx.beginPath();
    ctx.roundRect(gx + 10, gy + 44, 22, 18, 8);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(gx + 18, gy + 64, 22, 18, 8);
    ctx.fill();

    // Tail
    ctx.strokeStyle = "#0f141b";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(gx + 10, gy + h - 18);
    ctx.quadraticCurveTo(gx - 34, gy + h - 34, gx - 64, gy + h - 10);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function drawProjectiles() {
    // Missiles
    for (const m of missiles) {
      ctx.fillStyle = "#cfe7ff";
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
      // Trail
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "#7be7ff";
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.vx * 0.03, m.y - m.vy * 0.03);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Heat rays (beam). "Longer but half length" => beam style, length ~ half screen.
    for (const r of heatRays) {
      const p = clamp(r.ttl / 0.45, 0, 1);
      const width = r.w * lerp(0.75, 1, p);

      // Glow underlay
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = "rgba(120, 230, 255, 1)";
      ctx.lineWidth = width * 2.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(r.x1, r.y1);
      ctx.lineTo(r.x2, r.y2);
      ctx.stroke();

      // Core beam
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "rgba(220, 250, 255, 1)";
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(r.x1, r.y1);
      ctx.lineTo(r.x2, r.y2);
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
    }
  }

  function drawExplosions() {
    for (const ex of explosions) {
      const p = clamp(ex.t / ex.ttl, 0, 1);
      const r = lerp(ex.r * 0.4, ex.r, p);
      ctx.globalAlpha = (1 - p) * 0.9;
      ctx.fillStyle = ex.color;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawUIHints() {
    if (game.phase !== GamePhase.running && game.phase !== GamePhase.paused) return;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "700 12px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText("Ocean", 10, world.groundY + 18);
    ctx.fillText("New York City", world.cityLeft + 6, world.groundY + 18);
  }

  // ----- Simulation -----
  function spawnMissile() {
    const startX = tank.x + tank.w + 4;
    const startY = tank.y - 3;
    const targetX = godzilla.x + godzilla.w * 0.55;
    const targetY = godzilla.y + godzilla.h * 0.38;
    let dx = targetX - startX;
    let dy = targetY - startY;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    const speed = 540;
    missiles.push({
      x: startX,
      y: startY,
      vx: dx * speed,
      vy: dy * speed,
      r: 4,
      ttl: 2.2,
    });
  }

  function spawnFireball() {
    // (removed) replaced by heat ray
  }

  function spawnHeatRay() {
    const startX = godzilla.x + godzilla.w * 0.86;
    const startY = godzilla.y + 34;

    const targetX = tank.x + tank.w * 0.5;
    const targetY = tank.y + tank.h * 0.5;

    let dx = targetX - startX;
    let dy = targetY - startY;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    const maxLen = W() * 0.5; // half-screen length
    const endX = startX + dx * maxLen;
    const endY = startY + dy * maxLen;

    heatRays.push({
      x1: startX,
      y1: startY,
      x2: endX,
      y2: endY,
      w: 7,
      ttl: 0.45,
    });
  }

  function boom(x, y, r, color) {
    explosions.push({ x, y, r, t: 0, ttl: 0.32, color });
  }

  function updateBuildings(dt) {
    for (const b of buildings) {
      if (b.hitFlash > 0) b.hitFlash = Math.max(0, b.hitFlash - dt * 3.2);

      if (b.hp <= 0) continue;
      if (godzilla.state !== "rampage") continue;

      // If Godzilla overlaps the building, it takes damage.
      const gRect = {
        x: godzilla.x,
        y: godzilla.y,
        w: godzilla.w * 0.74,
        h: godzilla.h,
      };
      const overlap =
        gRect.x < b.x + b.w &&
        gRect.x + gRect.w > b.x &&
        gRect.y < b.y + b.h &&
        gRect.y + gRect.h > b.y;
      if (!overlap) continue;

      b.hp = Math.max(0, b.hp - dt * 42);
      b.hitFlash = 0.8;
      if (Math.random() < 0.08) boom(b.x + b.w * rand(0.2, 0.8), b.y + b.h * rand(0.2, 0.9), 18, "rgba(255,130,90,0.7)");
    }
  }

  function updateTank(dt) {
    const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const mag = Math.hypot(dx, dy) || 1;
    const vx = (dx / mag) * tank.speed;
    const vy = (dy / mag) * tank.speed;

    tank.x += vx * dt;
    tank.y += vy * dt;

    // Keep tank on the land (not in the ocean) and inside the canvas.
    const minX = world.shorelineX + 10;
    const maxX = W() - tank.w - 10;
    const minY = Math.floor(H() * 0.28);
    const maxY = world.groundY - tank.h + 1;
    tank.x = clamp(tank.x, minX, maxX);
    tank.y = clamp(tank.y, minY, maxY);

    // Fire
    tank.fireCd = Math.max(0, tank.fireCd - dt);
    if (input.shoot && tank.fireCd <= 0) {
      spawnMissile();
      tank.fireCd = 0.24;
    }
  }

  function updateGodzilla(dt) {
    godzilla.t += dt;

    if (godzilla.state === "emerging") {
      // Rise up from the ocean, then step onto land.
      const riseTarget = world.groundY - godzilla.h + 6;
      godzilla.y = lerp(godzilla.y, riseTarget, clamp(dt * 1.7, 0, 1));
      godzilla.x = lerp(godzilla.x, world.shorelineX + 16, clamp(dt * 0.55, 0, 1));
      if (Math.abs(godzilla.y - riseTarget) < 1.2 && godzilla.t > 1.8) {
        godzilla.state = "rampage";
        godzilla.t = 0;
      }
      return;
    }

    if (godzilla.state === "rampage") {
      // Move into the city (toward the middle).
      const targetX = W() * 0.55;
      const speed = 58;
      const dir = Math.sign(targetX - godzilla.x);
      godzilla.x += dir * speed * dt;

      // Heat ray at the tank.
      godzilla.fireCd = Math.max(0, godzilla.fireCd - dt);
      if (godzilla.fireCd <= 0) {
        spawnHeatRay();
        godzilla.fireCd = rand(1.0, 1.45);
      }
      return;
    }

    if (godzilla.state === "flee") {
      // Run back to the ocean.
      const fleeSpeed = 170;
      const dir = -1;
      godzilla.x += dir * fleeSpeed * dt;
      // Sink slightly near the shoreline for a "back to ocean" feel.
      if (godzilla.x < world.shorelineX * 0.65) {
        godzilla.y = lerp(godzilla.y, world.groundY + 130, clamp(dt * 0.8, 0, 1));
      }
    }
  }

  function updateProjectiles(dt) {
    // Missiles
    for (const m of missiles) {
      // slight homing to feel fun for kids
      const tx = godzilla.x + godzilla.w * 0.55;
      const ty = godzilla.y + godzilla.h * 0.4;
      const toX = tx - m.x;
      const toY = ty - m.y;
      const len = Math.hypot(toX, toY) || 1;
      const ax = (toX / len) * 55;
      const ay = (toY / len) * 55;
      m.vx += ax * dt;
      m.vy += ay * dt;

      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.ttl -= dt;
    }

    // Heat rays
    for (const r of heatRays) {
      r.ttl -= dt;
    }

    // Explosions
    for (const ex of explosions) ex.t += dt;

    missiles = missiles.filter((m) => m.ttl > 0 && m.x > -40 && m.x < W() + 40 && m.y > -40 && m.y < H() + 40);
    heatRays = heatRays.filter((r) => r.ttl > 0);
    explosions = explosions.filter((ex) => ex.t < ex.ttl);
  }

  function segmentHitsRectWithRadius(x1, y1, x2, y2, radius, rx, ry, rw, rh) {
    // Sample points along the segment and treat them as circles.
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const steps = Math.max(8, Math.floor(len / 24));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      if (circleHitsRect(px, py, radius, rx, ry, rw, rh)) return true;
    }
    return false;
  }

  function handleHits(dt) {
    if (game.phase !== GamePhase.running && game.phase !== GamePhase.winFlee) return;

    // Missiles hit Godzilla
    const gx = godzilla.x + godzilla.w * 0.5;
    const gy = godzilla.y + godzilla.h * 0.55;
    const gR = Math.max(godzilla.w, godzilla.h) * 0.34;

    for (const m of missiles) {
      if (dist2(m.x, m.y, gx, gy) <= (m.r + gR) * (m.r + gR)) {
        m.ttl = -1;
        boom(m.x, m.y, 26, "rgba(120,255,215,0.7)");
        godzilla.hp = Math.max(0, godzilla.hp - 6);
      }
    }

    // Heat rays hit Tank (damage while active)
    for (const r of heatRays) {
      const hit = segmentHitsRectWithRadius(
        r.x1,
        r.y1,
        r.x2,
        r.y2,
        r.w * 0.55,
        tank.x,
        tank.y,
        tank.w,
        tank.h
      );
      if (hit) {
        // Gentle-but-dangerous continuous damage.
        tank.hp = Math.max(0, tank.hp - 26 * dt);
        if (Math.random() < 0.12) boom(tank.x + tank.w * 0.5, tank.y + tank.h * 0.5, 16, "rgba(120,230,255,0.55)");
      }
    }
  }

  function maybeEndGame() {
    if (game.phase !== GamePhase.running && game.phase !== GamePhase.winFlee) return;

    if (tank.hp <= 0 && game.phase !== GamePhase.lose) {
      game.phase = GamePhase.lose;
      setButtons({ canStart: false, canRestart: true, canPause: false, pauseLabel: "Pause" });
      setOverlay(
        true,
        "Game Over!",
        "Godzilla wins this time. The tank ran out of health.<br><br>Press <b>Restart</b> to try again.",
        "Restart"
      );
      return;
    }

    if (godzilla.hp <= 0 && game.phase === GamePhase.running) {
      // Trigger flee animation instead of instant win.
      godzilla.state = "flee";
      game.phase = GamePhase.winFlee;
      godzilla.fireCd = 999;
      setOverlay(true, "You did it!", "Godzilla is fleeing back to the ocean… keep watching!", "Restart");
      setButtons({ canStart: false, canRestart: true, canPause: false, pauseLabel: "Pause" });
      return;
    }

    if (game.phase === GamePhase.winFlee && godzilla.x < -140) {
      game.phase = GamePhase.winDone;
      setOverlay(
        true,
        "City Saved!",
        "Godzilla fled to the ocean. New York is safe (for now).<br><br>Press <b>Restart</b> to play again.",
        "Restart"
      );
      return;
    }
  }

  function step(dt) {
    game.time += dt;

    if (game.phase === GamePhase.running) {
      updateTank(dt);
      updateGodzilla(dt);
      updateBuildings(dt);
      updateProjectiles(dt);
      handleHits(dt);
      maybeEndGame();
    } else if (game.phase === GamePhase.winFlee) {
      // No more tank controls after win; just play the flee animation.
      updateGodzilla(dt);
      updateBuildings(dt);
      updateProjectiles(dt);
      handleHits(dt);
      maybeEndGame();
    }

    // When paused/idle/lose/winDone: keep it visually alive a tiny bit (explosions fade)
    if (game.phase !== GamePhase.running) {
      updateProjectiles(dt);
      updateBuildings(dt);
    }

    updateHUD();
  }

  function render() {
    drawBackground();
    drawCity();
    drawGodzilla();
    drawTank();
    drawProjectiles();
    drawExplosions();
    drawUIHints();

    // Subtle vignette
    ctx.globalAlpha = 0.25;
    const v = ctx.createRadialGradient(W() / 2, H() / 2, 50, W() / 2, H() / 2, Math.max(W(), H()) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W(), H());
    ctx.globalAlpha = 1;
  }

  function loop(ts) {
    if (!game.lastTs) game.lastTs = ts;
    const rawDt = (ts - game.lastTs) / 1000;
    game.lastTs = ts;
    const dt = clamp(rawDt, 0, 0.033); // cap for stability

    if (game.phase !== GamePhase.paused) step(dt);
    render();
    requestAnimationFrame(loop);
  }

  // ----- UI actions -----
  function startGame() {
    if (!game.started) {
      resetGame();
      game.started = true;
    }
    game.phase = GamePhase.running;
    setButtons({ canStart: false, canRestart: true, canPause: true, pauseLabel: "Pause" });
    setOverlay(false, "", "");
  }

  function restartGame() {
    resetGame();
    game.started = true;
    game.phase = GamePhase.running;
    setButtons({ canStart: false, canRestart: true, canPause: true, pauseLabel: "Pause" });
    setOverlay(false, "", "");
  }

  function togglePause() {
    if (game.phase !== GamePhase.running && game.phase !== GamePhase.paused) return;
    if (game.phase === GamePhase.running) {
      game.phase = GamePhase.paused;
      setButtons({ canStart: false, canRestart: true, canPause: true, pauseLabel: "Resume" });
      setOverlay(true, "Paused", "Take a quick break. Press <b>Resume</b> to continue.", "Resume");
    } else {
      game.phase = GamePhase.running;
      setButtons({ canStart: false, canRestart: true, canPause: true, pauseLabel: "Pause" });
      setOverlay(false, "", "");
    }
  }

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", restartGame);
  pauseBtn.addEventListener("click", togglePause);
  overlayStart.addEventListener("click", () => {
    if (game.phase === GamePhase.paused) togglePause();
    else if (game.phase === GamePhase.lose || game.phase === GamePhase.winDone || game.phase === GamePhase.winFlee) restartGame();
    else startGame();
  });

  // Keep layout stable if resized (canvas remains fixed resolution; we only recompute gameplay bounds)
  window.addEventListener("resize", () => {
    recomputeWorld();
  });

  // Initial UI
  resetGame();
  updateHUD();
  setButtons({ canStart: true, canRestart: false, canPause: false, pauseLabel: "Pause" });
  setOverlay(
    true,
    "Ready?",
    "Godzilla is about to emerge from the ocean and attack New York.<br><br><b>Arrow keys</b> move • <b>Space</b> shoots missiles.",
    "Start Game"
  );

  // Polyfill for roundRect (some older browsers)
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, w, h, r) {
      const radius = Array.isArray(r) ? r : [r, r, r, r];
      const [r1, r2, r3, r4] = radius.map((v) => Math.max(0, Math.min(v, Math.min(w, h) / 2)));
      this.beginPath();
      this.moveTo(x + r1, y);
      this.arcTo(x + w, y, x + w, y + h, r2);
      this.arcTo(x + w, y + h, x, y + h, r3);
      this.arcTo(x, y + h, x, y, r4);
      this.arcTo(x, y, x + w, y, r1);
      this.closePath();
      return this;
    };
  }

  requestAnimationFrame(loop);
})();

