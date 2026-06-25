import * as THREE from "three";

// ─── Constants ───────────────────────────────────────────────────────────────
const TOTAL_LAPS = 3;
const TRACK_OUTER = 70;
const TRACK_INNER = 48;
const TRACK_WIDTH = TRACK_OUTER - TRACK_INNER;
const KART_COLORS = [0xff2222, 0x2266ff, 0x22cc44, 0xffaa00];
const KART_NAMES = ["You", "Red Shell", "Green Machine", "Gold Star"];

// ─── Input ───────────────────────────────────────────────────────────────────
const keys = { up: false, down: false, left: false, right: false };

document.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault();
  }
  if (e.key === "ArrowUp") keys.up = true;
  if (e.key === "ArrowDown") keys.down = true;
  if (e.key === "ArrowLeft") keys.left = true;
  if (e.key === "ArrowRight") keys.right = true;
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowUp") keys.up = false;
  if (e.key === "ArrowDown") keys.down = false;
  if (e.key === "ArrowLeft") keys.left = false;
  if (e.key === "ArrowRight") keys.right = false;
});

// ─── DOM refs ────────────────────────────────────────────────────────────────
const canvas = document.getElementById("game-canvas");
const startScreen = document.getElementById("start-screen");
const countdownEl = document.getElementById("countdown");
const countdownText = document.getElementById("countdown-text");
const hud = document.getElementById("hud");
const finishScreen = document.getElementById("finish-screen");
const finishTitle = document.getElementById("finish-title");
const finishMessage = document.getElementById("finish-message");
const finishTime = document.getElementById("finish-time");
const lapDisplay = document.getElementById("lap-display");
const timeDisplay = document.getElementById("time-display");
const positionDisplay = document.getElementById("position-display");
const speedDisplay = document.getElementById("speed-display");

// ─── Three.js setup ──────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4488cc);
scene.fog = new THREE.Fog(0x4488cc, 80, 220);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);

// Lighting — flat N64-style
const ambient = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(40, 80, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
scene.add(sun);

// ─── Track helpers ───────────────────────────────────────────────────────────
function isOnTrack(x, z) {
  const dist = Math.sqrt(x * x + z * z);
  return dist >= TRACK_INNER && dist <= TRACK_OUTER;
}

function getTrackCenterAngle(x, z) {
  return Math.atan2(z, x);
}

function clampToTrack(x, z) {
  const dist = Math.sqrt(x * x + z * z);
  if (dist < 0.01) return { x: (TRACK_INNER + TRACK_OUTER) / 2, z: 0 };
  const mid = (TRACK_INNER + TRACK_OUTER) / 2;
  const half = TRACK_WIDTH / 2 - 1.5;
  const clamped = Math.max(TRACK_INNER + 1.5, Math.min(TRACK_OUTER - 1.5, dist));
  return { x: (x / dist) * clamped, z: (z / dist) * clamped };
}

function buildTrack() {
  // Grass
  const grassGeo = new THREE.CircleGeometry(120, 32);
  const grassMat = new THREE.MeshLambertMaterial({ color: 0x2d8a2d });
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  scene.add(grass);

  // Dirt infield
  const dirtGeo = new THREE.CircleGeometry(TRACK_INNER - 2, 32);
  const dirtMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });
  const dirt = new THREE.Mesh(dirtGeo, dirtMat);
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = 0.01;
  scene.add(dirt);

  // Track surface (ring)
  const trackShape = new THREE.Shape();
  trackShape.absarc(0, 0, TRACK_OUTER, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, TRACK_INNER, 0, Math.PI * 2, true);
  trackShape.holes.push(hole);
  const trackGeo = new THREE.ShapeGeometry(trackShape, 64);
  const trackMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
  const track = new THREE.Mesh(trackGeo, trackMat);
  track.rotation.x = -Math.PI / 2;
  track.position.y = 0.05;
  track.receiveShadow = true;
  scene.add(track);

  // Kerbs (red/white stripes on inner and outer edges)
  addKerbs(TRACK_INNER, 0xff2222, 0xffffff);
  addKerbs(TRACK_OUTER, 0xff2222, 0xffffff);

  // Barriers
  addBarriers(TRACK_INNER - 1.2, 0xcc0000);
  addBarriers(TRACK_OUTER + 1.2, 0xffffff);

  // Start line
  const midR = (TRACK_INNER + TRACK_OUTER) / 2;
  const lineGeo = new THREE.PlaneGeometry(TRACK_WIDTH - 2, 2);
  const lineMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const startLine = new THREE.Mesh(lineGeo, lineMat);
  startLine.rotation.x = -Math.PI / 2;
  startLine.position.set(midR, 0.06, 0);
  scene.add(startLine);

  // Checkered pattern on start line
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 2; j++) {
      if ((i + j) % 2 === 0) continue;
      const sq = new THREE.Mesh(
        new THREE.PlaneGeometry(TRACK_WIDTH / 8, 1),
        new THREE.MeshLambertMaterial({ color: 0x111111 })
      );
      sq.rotation.x = -Math.PI / 2;
      sq.position.set(
        midR - TRACK_WIDTH / 2 + (i + 0.5) * (TRACK_WIDTH / 8),
        0.07,
        j === 0 ? -0.5 : 0.5
      );
      scene.add(sq);
    }
  }

  // Decorative trees
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const r = TRACK_OUTER + 8 + Math.random() * 15;
    addTree(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + 0.2;
    const r = TRACK_INNER - 8 - Math.random() * 8;
    if (r > 5) addTree(Math.cos(angle) * r, Math.sin(angle) * r);
  }
}

function addKerbs(radius, c1, c2) {
  const segments = 64;
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    const color = i % 2 === 0 ? c1 : c2;
    const geo = new THREE.BufferGeometry();
    const hw = 0.6;
    const pts = [
      new THREE.Vector3(Math.cos(a1) * (radius - hw), 0.08, Math.sin(a1) * (radius - hw)),
      new THREE.Vector3(Math.cos(a1) * (radius + hw), 0.08, Math.sin(a1) * (radius + hw)),
      new THREE.Vector3(Math.cos(a2) * (radius + hw), 0.08, Math.sin(a2) * (radius + hw)),
      new THREE.Vector3(Math.cos(a2) * (radius - hw), 0.08, Math.sin(a2) * (radius - hw)),
    ];
    geo.setFromPoints(pts);
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
    scene.add(mesh);
  }
}

function addBarriers(radius, color) {
  const segments = 48;
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const barrier = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1.2, 0.4),
      new THREE.MeshLambertMaterial({ color })
    );
    barrier.position.set(x, 0.6, z);
    barrier.rotation.y = -angle + Math.PI / 2;
    barrier.castShadow = true;
    scene.add(barrier);
  }
}

function addTree(x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.4, 2, 6),
    new THREE.MeshLambertMaterial({ color: 0x6b3a1f })
  );
  trunk.position.set(x, 1, z);
  trunk.castShadow = true;
  scene.add(trunk);

  const foliage = new THREE.Mesh(
    new THREE.ConeGeometry(1.8, 3.5, 6),
    new THREE.MeshLambertMaterial({ color: 0x1a6b1a })
  );
  foliage.position.set(x, 3.2, z);
  foliage.castShadow = true;
  scene.add(foliage);
}

// ─── Kart ────────────────────────────────────────────────────────────────────
function createKartMesh(color) {
  const group = new THREE.Group();

  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.5, 2.4),
    new THREE.MeshLambertMaterial({ color })
  );
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);

  // Cockpit
  const cockpit = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.35, 0.8),
    new THREE.MeshLambertMaterial({ color: 0x222222 })
  );
  cockpit.position.set(0, 0.75, -0.2);
  group.add(cockpit);

  // Nose
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.3, 0.6),
    new THREE.MeshLambertMaterial({ color: 0xdddddd })
  );
  nose.position.set(0, 0.4, 1.3);
  group.add(nose);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 8);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const positions = [
    [-0.85, 0.35, 0.8], [0.85, 0.35, 0.8],
    [-0.85, 0.35, -0.8], [0.85, 0.35, -0.8],
  ];
  for (const [wx, wy, wz] of positions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    group.add(wheel);
  }

  // Spoiler
  const spoiler = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.1, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x333333 })
  );
  spoiler.position.set(0, 0.9, -1.1);
  group.add(spoiler);

  return group;
}

class Kart {
  constructor(color, isPlayer = false, aiSpeed = 1.0) {
    this.mesh = createKartMesh(color);
    scene.add(this.mesh);

    this.isPlayer = isPlayer;
    this.aiSpeed = aiSpeed;
    this.speed = 0;
    this.maxSpeed = isPlayer ? 0.55 : 0.42 + aiSpeed * 0.08;
    this.acceleration = 0.012;
    this.brake = 0.025;
    this.friction = 0.004;
    this.steerSpeed = 0.035;
    this.angle = -Math.PI / 2;
    this.lap = 0;
    this.lastCheckpoint = -1;
    this.finished = false;
    this.finishTime = 0;
    this.progress = 0; // for position ranking
  }

  reset(x, z, angle) {
    this.mesh.position.set(x, 0, z);
    this.angle = angle;
    this.speed = 0;
    this.lap = 0;
    this.lastCheckpoint = -1;
    this._currentCp = -1;
    this.finished = false;
    this.finishTime = 0;
    this.progress = 0;
    this.mesh.rotation.y = this.angle;
  }

  update(dt, raceTime) {
    if (this.finished) return;

    if (this.isPlayer) {
      this.updatePlayer();
    } else {
      this.updateAI(dt);
    }

    // Move
    const dx = Math.sin(this.angle) * this.speed;
    const dz = Math.cos(this.angle) * this.speed;
    let nx = this.mesh.position.x + dx;
    let nz = this.mesh.position.z + dz;

    // Track collision
    if (!isOnTrack(nx, nz)) {
      const clamped = clampToTrack(nx, nz);
      nx = clamped.x;
      nz = clamped.z;
      this.speed *= 0.5; // bounce off wall
    }

    this.mesh.position.x = nx;
    this.mesh.position.z = nz;
    this.mesh.rotation.y = this.angle;

    // Checkpoint / lap logic
    this.updateCheckpoint(raceTime);

    // Progress for ranking (lap + checkpoint + angle fraction)
    const trackAngle = getTrackCenterAngle(this.mesh.position.x, this.mesh.position.z);
    this.progress = this.lap * 4 + Math.max(0, this.lastCheckpoint) + (trackAngle + Math.PI) / (Math.PI * 2);
  }

  updatePlayer() {
    if (keys.up) this.speed = Math.min(this.speed + this.acceleration, this.maxSpeed);
    else if (keys.down) this.speed = Math.max(this.speed - this.brake, -this.maxSpeed * 0.3);
    else {
      if (this.speed > 0) this.speed = Math.max(0, this.speed - this.friction);
      else if (this.speed < 0) this.speed = Math.min(0, this.speed + this.friction);
    }

    const steerFactor = Math.min(Math.abs(this.speed) / this.maxSpeed, 1);
    if (keys.left) this.angle += this.steerSpeed * steerFactor;
    if (keys.right) this.angle -= this.steerSpeed * steerFactor;
  }

  updateAI() {
    const x = this.mesh.position.x;
    const z = this.mesh.position.z;
    const dist = Math.sqrt(x * x + z * z);

    // Counter-clockwise tangent on the oval
    const targetAngle = -Math.atan2(z, x);
    let angleDiff = targetAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.steerSpeed * 0.8);

    // Stay near center of track
    const mid = (TRACK_INNER + TRACK_OUTER) / 2;
    const offset = dist - mid;
    this.angle += offset * 0.002;

    this.speed = Math.min(this.speed + this.acceleration * 0.8, this.maxSpeed);
    this.angle += (Math.random() - 0.5) * 0.004;
  }

  updateCheckpoint(raceTime) {
    const x = this.mesh.position.x;
    const z = this.mesh.position.z;
    const trackAngle = getTrackCenterAngle(x, z);

    // Four checkpoints around the track (0=right, 1=bottom, 2=left, 3=top)
    let cp = 0;
    if (trackAngle >= -Math.PI / 4 && trackAngle < Math.PI / 4) cp = 0;
    else if (trackAngle >= Math.PI / 4 && trackAngle < (3 * Math.PI) / 4) cp = 1;
    else if (trackAngle >= (-3 * Math.PI) / 4 && trackAngle < -Math.PI / 4) cp = 3;
    else cp = 2;

    if (cp !== this._currentCp) {
      const expected = (this.lastCheckpoint + 1) % 4;
      if (this.lastCheckpoint === -1 && cp === 0) {
        this.lastCheckpoint = 0;
      } else if (cp === expected) {
        if (cp === 0 && this.lastCheckpoint === 3) {
          this.lap++;
          if (this.lap >= TOTAL_LAPS && !this.finished) {
            this.finished = true;
            this.finishTime = raceTime;
          }
        }
        this.lastCheckpoint = cp;
      }
      this._currentCp = cp;
    }
  }
}

// ─── Game state ──────────────────────────────────────────────────────────────
let karts = [];
let raceState = "menu"; // menu | countdown | racing | finished
let raceTime = 0;
let countdownValue = 3;
let countdownTimer = 0;
let clock = new THREE.Clock();
let finishPending = false;

function initKarts() {
  karts.forEach((k) => scene.remove(k.mesh));
  karts = [];

  const midR = (TRACK_INNER + TRACK_OUTER) / 2;
  const grid = [
    { x: midR, z: -3, angle: 0, player: true },
    { x: midR, z: -7, angle: 0, ai: 0.9 },
    { x: midR - 3, z: -3, angle: 0, ai: 1.0 },
    { x: midR + 3, z: -7, angle: 0, ai: 0.85 },
  ];

  grid.forEach((g, i) => {
    const kart = new Kart(KART_COLORS[i], g.player, g.ai ?? 1);
    kart.reset(g.x, g.z, g.angle);
    kart._currentCp = -1;
    karts.push(kart);
  });
}

function getRankings() {
  return [...karts].sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.progress - a.progress;
  });
}

function updateHUD() {
  const player = karts[0];
  const rankings = getRankings();
  const pos = rankings.indexOf(player) + 1;

  lapDisplay.textContent = `${Math.min(player.lap + 1, TOTAL_LAPS)} / ${TOTAL_LAPS}`;
  timeDisplay.textContent = formatTime(raceTime);
  positionDisplay.textContent = `${pos} / ${karts.length}`;
  speedDisplay.textContent = Math.round(Math.abs(player.speed) * 180);
}

function formatTime(t) {
  const min = Math.floor(t / 60);
  const sec = Math.floor(t % 60);
  const ms = Math.floor((t % 1) * 10);
  return `${min}:${sec.toString().padStart(2, "0")}.${ms}`;
}

function updateCamera() {
  const player = karts[0];
  const px = player.mesh.position.x;
  const pz = player.mesh.position.z;
  const behind = 8;
  const height = 5;

  const cx = px - Math.sin(player.angle) * behind;
  const cz = pz - Math.cos(player.angle) * behind;

  camera.position.lerp(new THREE.Vector3(cx, height, cz), 0.1);
  camera.lookAt(px, 1, pz);
}

function startCountdown() {
  raceState = "countdown";
  countdownValue = 3;
  countdownTimer = 0;
  finishPending = false;
  startScreen.classList.add("hidden");
  finishScreen.classList.add("hidden");
  countdownEl.classList.remove("hidden");
  hud.classList.add("hidden");
  countdownText.textContent = "3";
  initKarts();
  raceTime = 0;
}

function startRace() {
  raceState = "racing";
  countdownEl.classList.add("hidden");
  hud.classList.remove("hidden");
}

function endRace() {
  raceState = "finished";
  hud.classList.add("hidden");
  finishScreen.classList.remove("hidden");

  const rankings = getRankings();
  const playerRank = rankings.indexOf(karts[0]) + 1;

  if (playerRank === 1) {
    finishTitle.textContent = "1st PLACE!";
    finishTitle.style.color = "#ffcc00";
    finishMessage.textContent = "You won the race!";
  } else if (playerRank === 2) {
    finishTitle.textContent = "2nd PLACE";
    finishTitle.style.color = "#cccccc";
    finishMessage.textContent = "So close! Try again!";
  } else {
    finishTitle.textContent = `${playerRank}th PLACE`;
    finishTitle.style.color = "#ff6644";
    finishMessage.textContent = "Better luck next time!";
  }
  finishTime.textContent = `Final time: ${formatTime(karts[0].finishTime)}`;
}

// ─── Main loop ───────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  if (raceState === "countdown") {
    countdownTimer += dt;
    if (countdownTimer >= 1) {
      countdownTimer = 0;
      countdownValue--;
      if (countdownValue > 0) {
        countdownText.textContent = countdownValue;
      } else if (countdownValue === 0) {
        countdownText.textContent = "GO!";
      } else {
        startRace();
      }
    }
  }

  if (raceState === "racing") {
    raceTime += dt;
    karts.forEach((k) => k.update(dt, raceTime));
    updateHUD();
    updateCamera();

    const player = karts[0];
    if (player.finished && !finishPending) {
      finishPending = true;
      setTimeout(() => {
        if (raceState === "racing") endRace();
      }, 1500);
    }
  }

  if (raceState === "menu") {
    // Orbit camera for menu
    const t = Date.now() * 0.0003;
    camera.position.set(Math.cos(t) * 90, 50, Math.sin(t) * 90);
    camera.lookAt(0, 0, 0);
  }

  renderer.render(scene, camera);
}

// ─── Init ────────────────────────────────────────────────────────────────────
buildTrack();
initKarts();

document.getElementById("start-btn").addEventListener("click", startCountdown);
document.getElementById("restart-btn").addEventListener("click", startCountdown);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
