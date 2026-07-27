"use strict";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const hud = {
  health: document.querySelector("#health"),
  buildings: document.querySelector("#buildings"),
  score: document.querySelector("#score"),
  time: document.querySelector("#time"),
};

const overlay = document.querySelector("#overlay");
const stateKicker = document.querySelector("#state-kicker");
const stateTitle = document.querySelector("#state-title");
const stateMessage = document.querySelector("#state-message");
const primaryAction = document.querySelector("#primary-action");
const emptyMessage = document.querySelector("#empty-message");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GAME_SECONDS = 75;
const PLAYER_SPEED = 230;
const ATTACK_RADIUS = 78;

const keys = new Set();
let animationFrameId = 0;
let lastTimestamp = 0;

const game = {
  mode: "loading",
  player: createPlayer(),
  buildings: [],
  helicopters: [],
  projectiles: [],
  particles: [],
  score: 0,
  health: 100,
  timeLeft: GAME_SECONDS,
  attackCooldown: 0,
  attackPulse: 0,
  screenShake: 0,
};

function createPlayer() {
  return {
    x: 118,
    y: 438,
    radius: 28,
    direction: 1,
  };
}

function createBuildings() {
  const buildings = [];
  const rows = [
    { y: 404, count: 8, x: 250, gap: 76, minHeight: 78 },
    { y: 320, count: 7, x: 284, gap: 82, minHeight: 64 },
    { y: 242, count: 6, x: 322, gap: 88, minHeight: 56 },
  ];

  rows.forEach((row, rowIndex) => {
    for (let index = 0; index < row.count; index += 1) {
      const width = 42 + ((index + rowIndex) % 3) * 9;
      const height = row.minHeight + ((index * 23 + rowIndex * 17) % 58);
      buildings.push({
        x: row.x + index * row.gap,
        y: row.y - height,
        width,
        height,
        maxHealth: 90,
        health: 90,
        color: rowIndex === 0 ? "#5f7ea6" : rowIndex === 1 ? "#7898bd" : "#93aec9",
      });
    }
  });

  return buildings;
}

function createHelicopters() {
  return [
    { x: 220, y: 84, speed: 72, shotTimer: 0.8 },
    { x: 760, y: 132, speed: -88, shotTimer: 1.5 },
  ];
}

function resetGame() {
  game.mode = "playing";
  game.player = createPlayer();
  game.buildings = createBuildings();
  game.helicopters = createHelicopters();
  game.projectiles = [];
  game.particles = [];
  game.score = 0;
  game.health = 100;
  game.timeLeft = GAME_SECONDS;
  game.attackCooldown = 0;
  game.attackPulse = 0;
  game.screenShake = 0;
  emptyMessage.hidden = true;
  hideOverlay();
  updateHud();
}

function showOverlay(kicker, title, message, buttonText, buttonEnabled = true) {
  stateKicker.textContent = kicker;
  stateTitle.textContent = title;
  stateMessage.textContent = message;
  primaryAction.textContent = buttonText;
  primaryAction.disabled = !buttonEnabled;
  primaryAction.hidden = !buttonText;
  overlay.hidden = false;
}

function hideOverlay() {
  overlay.hidden = true;
}

function updateHud() {
  const remainingBuildings = game.buildings.filter((building) => building.health > 0).length;
  hud.health.textContent = Math.max(0, Math.ceil(game.health)).toString();
  hud.buildings.textContent = remainingBuildings.toString();
  hud.score.textContent = game.score.toString();
  hud.time.textContent = Math.max(0, Math.ceil(game.timeLeft)).toString();
}

function setReadyState() {
  game.mode = "ready";
  game.buildings = createBuildings();
  game.helicopters = createHelicopters();
  showOverlay(
    "Ready",
    "Godzilla is awake",
    "Smash every building while dodging helicopter fire.",
    "Start game",
  );
  updateHud();
}

function setErrorState(message) {
  game.mode = "error";
  showOverlay("Error", "The game cannot start", message, "", false);
}

function finishGame(mode) {
  game.mode = mode;
  updateHud();

  if (mode === "empty") {
    emptyMessage.hidden = false;
    showOverlay(
      "Success",
      "City cleared!",
      "Empty state reached: every building has been reduced to rubble.",
      "Play again",
    );
    return;
  }

  showOverlay(
    "Game over",
    game.health <= 0 ? "Godzilla retreated" : "Time ran out",
    "The city defenses held this round. Try a faster route through downtown.",
    "Try again",
  );
}

function attack() {
  if (game.mode !== "playing" || game.attackCooldown > 0) {
    return;
  }

  game.attackCooldown = 0.45;
  game.attackPulse = 0.22;
  game.screenShake = 0.16;

  let destroyedCount = 0;
  game.buildings.forEach((building) => {
    if (building.health <= 0 || !isBuildingInAttackRange(building)) {
      return;
    }

    building.health -= 45;
    createDebris(building.x + building.width / 2, building.y + building.height * 0.55, building.color);

    if (building.health <= 0) {
      destroyedCount += 1;
      game.score += 100;
      createDebris(building.x + building.width / 2, building.y + building.height / 2, "#ffd166", 16);
    } else {
      game.score += 20;
    }
  });

  if (destroyedCount > 0) {
    game.health = Math.min(100, game.health + destroyedCount * 2);
  }
}

function isBuildingInAttackRange(building) {
  const closestX = clamp(game.player.x, building.x, building.x + building.width);
  const closestY = clamp(game.player.y, building.y, building.y + building.height);
  return distance(game.player.x, game.player.y, closestX, closestY) <= ATTACK_RADIUS;
}

function update(timestamp) {
  const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000 || 0, 0.05);
  lastTimestamp = timestamp;

  if (game.mode === "playing") {
    updatePlayer(deltaSeconds);
    updateHelicopters(deltaSeconds);
    updateProjectiles(deltaSeconds);
    updateParticles(deltaSeconds);

    game.timeLeft -= deltaSeconds;
    game.attackCooldown = Math.max(0, game.attackCooldown - deltaSeconds);
    game.attackPulse = Math.max(0, game.attackPulse - deltaSeconds);
    game.screenShake = Math.max(0, game.screenShake - deltaSeconds);

    const remainingBuildings = game.buildings.some((building) => building.health > 0);
    if (!remainingBuildings) {
      finishGame("empty");
    } else if (game.health <= 0 || game.timeLeft <= 0) {
      finishGame("lost");
    }
  } else {
    updateParticles(deltaSeconds);
  }

  draw();
  animationFrameId = window.requestAnimationFrame(update);
}

function updatePlayer(deltaSeconds) {
  let inputX = 0;
  let inputY = 0;

  if (keys.has("arrowleft") || keys.has("a")) inputX -= 1;
  if (keys.has("arrowright") || keys.has("d")) inputX += 1;
  if (keys.has("arrowup") || keys.has("w")) inputY -= 1;
  if (keys.has("arrowdown") || keys.has("s")) inputY += 1;

  if (inputX !== 0 || inputY !== 0) {
    const magnitude = Math.hypot(inputX, inputY);
    game.player.x += (inputX / magnitude) * PLAYER_SPEED * deltaSeconds;
    game.player.y += (inputY / magnitude) * PLAYER_SPEED * deltaSeconds;
    game.player.direction = inputX < 0 ? -1 : inputX > 0 ? 1 : game.player.direction;
  }

  game.player.x = clamp(game.player.x, 36, WIDTH - 36);
  game.player.y = clamp(game.player.y, 158, HEIGHT - 44);
}

function updateHelicopters(deltaSeconds) {
  game.helicopters.forEach((helicopter) => {
    helicopter.x += helicopter.speed * deltaSeconds;

    if (helicopter.x < 90 || helicopter.x > WIDTH - 90) {
      helicopter.speed *= -1;
    }

    helicopter.shotTimer -= deltaSeconds;
    if (helicopter.shotTimer <= 0) {
      shootAtPlayer(helicopter);
      helicopter.shotTimer = 1.35 + Math.random() * 1.25;
    }
  });
}

function shootAtPlayer(helicopter) {
  const angle = Math.atan2(game.player.y - helicopter.y, game.player.x - helicopter.x);
  game.projectiles.push({
    x: helicopter.x,
    y: helicopter.y + 12,
    velocityX: Math.cos(angle) * 195,
    velocityY: Math.sin(angle) * 195,
    radius: 5,
  });
}

function updateProjectiles(deltaSeconds) {
  game.projectiles = game.projectiles.filter((projectile) => {
    projectile.x += projectile.velocityX * deltaSeconds;
    projectile.y += projectile.velocityY * deltaSeconds;

    const hitPlayer =
      distance(projectile.x, projectile.y, game.player.x, game.player.y) <= game.player.radius + projectile.radius;

    if (hitPlayer) {
      game.health -= 8;
      game.screenShake = 0.18;
      createDebris(projectile.x, projectile.y, "#ff6b5e", 8);
      return false;
    }

    return projectile.x > -20 && projectile.x < WIDTH + 20 && projectile.y > -20 && projectile.y < HEIGHT + 20;
  });
}

function createDebris(x, y, color, count = 8) {
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 120;
    game.particles.push({
      x,
      y,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      life: 0.45 + Math.random() * 0.45,
      color,
      size: 2 + Math.random() * 4,
    });
  }
}

function updateParticles(deltaSeconds) {
  game.particles = game.particles.filter((particle) => {
    particle.x += particle.velocityX * deltaSeconds;
    particle.y += particle.velocityY * deltaSeconds;
    particle.velocityY += 180 * deltaSeconds;
    particle.life -= deltaSeconds;
    return particle.life > 0;
  });
}

function draw() {
  const shakeX = game.screenShake > 0 ? (Math.random() - 0.5) * 8 : 0;
  const shakeY = game.screenShake > 0 ? (Math.random() - 0.5) * 8 : 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawSky();
  drawRoad();
  drawBuildings();
  drawHelicopters();
  drawProjectiles();
  drawPlayer();
  drawParticles();
  ctx.restore();
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#111d35");
  gradient.addColorStop(0.58, "#182d48");
  gradient.addColorStop(1, "#26364e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "rgba(255, 209, 102, 0.18)";
  ctx.beginPath();
  ctx.arc(815, 88, 42, 0, Math.PI * 2);
  ctx.fill();
}

function drawRoad() {
  ctx.fillStyle = "#222a35";
  ctx.fillRect(0, 454, WIDTH, 86);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
  ctx.setLineDash([22, 18]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 496);
  ctx.lineTo(WIDTH, 496);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBuildings() {
  game.buildings.forEach((building) => {
    if (building.health <= 0) {
      drawRubble(building);
      return;
    }

    const damageRatio = building.health / building.maxHealth;
    ctx.fillStyle = building.color;
    ctx.fillRect(building.x, building.y, building.width, building.height);

    ctx.fillStyle = "rgba(7, 17, 31, 0.36)";
    for (let y = building.y + 12; y < building.y + building.height - 8; y += 18) {
      for (let x = building.x + 8; x < building.x + building.width - 8; x += 16) {
        ctx.fillRect(x, y, 7, 8);
      }
    }

    // Damage is shown visually so players can prioritize one more smash instead of guessing.
    if (damageRatio < 0.75) {
      ctx.strokeStyle = damageRatio < 0.35 ? "#ff6b5e" : "#ffd166";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(building.x + 8, building.y + 12);
      ctx.lineTo(building.x + building.width - 10, building.y + building.height * 0.45);
      ctx.moveTo(building.x + building.width - 8, building.y + 20);
      ctx.lineTo(building.x + 12, building.y + building.height * 0.72);
      ctx.stroke();
    }
  });
}

function drawRubble(building) {
  ctx.fillStyle = "#5d5148";
  ctx.fillRect(building.x - 3, building.y + building.height - 10, building.width + 6, 10);
  ctx.fillRect(building.x + 5, building.y + building.height - 20, building.width * 0.45, 12);
  ctx.fillRect(building.x + building.width * 0.52, building.y + building.height - 16, building.width * 0.38, 8);
}

function drawHelicopters() {
  game.helicopters.forEach((helicopter) => {
    ctx.save();
    ctx.translate(helicopter.x, helicopter.y);
    ctx.fillStyle = "#d8e2ef";
    ctx.fillRect(-22, -8, 44, 16);
    ctx.fillRect(18, -4, 28, 8);
    ctx.fillStyle = "#8ee36d";
    ctx.fillRect(-10, -5, 14, 8);
    ctx.strokeStyle = "#f5f7fb";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-30, -14);
    ctx.lineTo(30, -14);
    ctx.moveTo(42, -12);
    ctx.lineTo(42, 12);
    ctx.stroke();
    ctx.restore();
  });
}

function drawProjectiles() {
  ctx.fillStyle = "#ff6b5e";
  game.projectiles.forEach((projectile) => {
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPlayer() {
  const player = game.player;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.scale(player.direction, 1);

  ctx.fillStyle = "#4fb264";
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 38, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8ee36d";
  ctx.beginPath();
  ctx.arc(8, -38, 21, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f5f7fb";
  ctx.beginPath();
  ctx.arc(15, -43, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#07111f";
  ctx.fillRect(19, -34, 12, 4);

  ctx.fillStyle = "#376f45";
  for (let index = 0; index < 5; index += 1) {
    ctx.beginPath();
    ctx.moveTo(-12 + index * 6, -34 + index * 8);
    ctx.lineTo(-2 + index * 4, -22 + index * 8);
    ctx.lineTo(-18 + index * 5, -20 + index * 8);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#4fb264";
  ctx.fillRect(-42, -2, 24, 12);
  ctx.fillRect(16, -2, 28, 12);
  ctx.fillRect(-18, 30, 13, 22);
  ctx.fillRect(8, 30, 13, 22);
  ctx.restore();

  if (game.attackPulse > 0) {
    ctx.strokeStyle = `rgba(142, 227, 109, ${game.attackPulse / 0.22})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, ATTACK_RADIUS * (1.1 - game.attackPulse), 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawParticles() {
  game.particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    ctx.globalAlpha = 1;
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);

  if (key === " " || key === "spacebar") {
    event.preventDefault();
    attack();
  }

  if (key === "r") {
    resetGame();
  }
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("pointerdown", () => {
  if (game.mode === "playing") {
    attack();
  }
});

primaryAction.addEventListener("click", resetGame);

if (!ctx) {
  setErrorState("Your browser does not support Canvas. Please try a modern browser.");
} else {
  showOverlay("Loading", "Preparing the city...", "Drawing buildings and waking up Godzilla.", "", false);
  game.buildings = createBuildings();
  game.helicopters = createHelicopters();
  updateHud();
  draw();
  window.setTimeout(setReadyState, 500);
  animationFrameId = window.requestAnimationFrame(update);
}

window.addEventListener("beforeunload", () => {
  window.cancelAnimationFrame(animationFrameId);
});
