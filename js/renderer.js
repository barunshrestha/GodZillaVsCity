const Renderer = {
  ctx: null,
  shakeTimer: 0,
  shakeIntensity: 0,

  init(canvas) {
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
  },

  screenShake(intensity) {
    this.shakeTimer = 10;
    this.shakeIntensity = intensity;
  },

  clear() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shakeTimer > 0) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(sx, sy);
      this.shakeTimer--;
    }
    ctx.clearRect(-10, -10, 980, 560);
    ctx.restore();
  },

  drawBackground() {
    const ctx = this.ctx;
    const w = 960;
    const h = 540;

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#0a0a20');
    skyGrad.addColorStop(0.4, '#1a1040');
    skyGrad.addColorStop(0.7, '#3a1850');
    skyGrad.addColorStop(1, '#552020');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Moon
    ctx.fillStyle = '#eeddcc';
    ctx.beginPath();
    ctx.arc(800, 80, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ccbbaa';
    ctx.beginPath();
    ctx.arc(815, 75, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(790, 90, 5, 0, Math.PI * 2);
    ctx.fill();

    // Distant city skyline
    this.drawCityscape(0.3, 280, '#1a1a2a');
    this.drawCityscape(0.6, 320, '#222233');

    // Ground
    const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, h);
    groundGrad.addColorStop(0, '#3a3020');
    groundGrad.addColorStop(0.1, '#2a2518');
    groundGrad.addColorStop(1, '#1a1510');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, GROUND_Y, w, h - GROUND_Y);

    // Ground line
    ctx.strokeStyle = '#554433';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(w, GROUND_Y);
    ctx.stroke();

    // Cracked ground details
    ctx.strokeStyle = '#443322';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const gx = 80 + i * 110;
      ctx.beginPath();
      ctx.moveTo(gx, GROUND_Y);
      ctx.lineTo(gx + 15, GROUND_Y + 8);
      ctx.lineTo(gx + 5, GROUND_Y + 15);
      ctx.stroke();
    }
  },

  drawCityscape(scale, baseY, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    const buildings = [
      { x: 20, w: 40, h: 80 }, { x: 70, w: 30, h: 120 }, { x: 110, w: 50, h: 60 },
      { x: 170, w: 35, h: 100 }, { x: 700, w: 45, h: 90 }, { x: 760, w: 30, h: 130 },
      { x: 800, w: 55, h: 70 }, { x: 870, w: 40, h: 110 }, { x: 920, w: 35, h: 80 },
      { x: 400, w: 60, h: 50 }, { x: 480, w: 40, h: 70 }, { x: 530, w: 50, h: 45 },
    ];
    buildings.forEach((b, bi) => {
      const h = b.h * scale;
      ctx.fillRect(b.x, baseY - h, b.w, h);
      ctx.fillStyle = '#ffcc0044';
      for (let wy = baseY - h + 8; wy < baseY - 10; wy += 14) {
        for (let wx = b.x + 5; wx < b.x + b.w - 5; wx += 10) {
          if ((wx * 7 + wy * 3 + bi) % 5 !== 0) ctx.fillRect(wx, wy, 4, 6);
        }
      }
      ctx.fillStyle = color;
    });
  },

  drawFighter(fighter) {
    const ctx = this.ctx;
    const { data, x, y, facing, state, animFrame, invincible } = fighter;
    const c = data.colors;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);

    // Flash when invincible
    if (invincible > 0 && Math.floor(animFrame / 3) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    const bobY = state === FighterState.WALK ? Math.sin(animFrame * 0.3) * 2 : 0;
    const crouchY = (state === FighterState.CROUCH || state === FighterState.BLOCK) ? 20 : 0;

    ctx.translate(0, bobY + crouchY);

    this.drawKaijuBody(ctx, data, state, animFrame, crouchY > 0);

    // Attack effects
    if (state === FighterState.PUNCH && fighter.attackBox) {
      this.drawPunchEffect(ctx, fighter);
    }
    if (state === FighterState.KICK && fighter.attackBox) {
      this.drawKickEffect(ctx, fighter);
    }
    if (state === FighterState.SPECIAL) {
      this.drawSpecialEffect(ctx, fighter);
    }

    ctx.restore();

    // Projectiles (drawn in world space)
    fighter.projectiles.forEach((p) => this.drawProjectile(p));
  },

  drawKaijuBody(ctx, data, state, frame, crouching) {
    const c = data.colors;
    const id = data.id;

    if (id === 'gorath') this.drawGorath(ctx, c, state, frame, crouching);
    else if (id === 'mothra') this.drawMothra(ctx, c, state, frame, crouching);
    else if (id === 'kraken') this.drawKraken(ctx, c, state, frame, crouching);
    else if (id === 'mech') this.drawMech(ctx, c, state, frame, crouching);
  },

  drawGorath(ctx, c, state, frame, crouching) {
    const h = crouching ? -70 : -100;

    // Tail
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(-30, h + 60);
    ctx.quadraticCurveTo(-55, h + 40, -50, h + 20);
    ctx.lineTo(-35, h + 50);
    ctx.fill();

    // Legs
    ctx.fillStyle = c.body;
    ctx.fillRect(-22, h + 55, 18, 45);
    ctx.fillRect(4, h + 55, 18, 45);

    // Body
    ctx.fillStyle = c.body;
    ctx.fillRect(-28, h + 10, 56, 55);

    // Belly
    ctx.fillStyle = c.belly;
    ctx.fillRect(-18, h + 25, 36, 35);

    // Spikes on back
    ctx.fillStyle = c.spikes;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-20 + i * 10, h + 10);
      ctx.lineTo(-15 + i * 10, h - 5);
      ctx.lineTo(-10 + i * 10, h + 10);
      ctx.fill();
    }

    // Head
    ctx.fillStyle = c.body;
    ctx.fillRect(-22, h - 25, 44, 38);

    // Eye
    ctx.fillStyle = c.eye;
    ctx.fillRect(5, h - 18, 10, 8);

    // Mouth
    ctx.fillStyle = '#111';
    ctx.fillRect(10, h - 5, 14, 6);

    // Arms
    const armExtend = state === FighterState.PUNCH ? 20 : 0;
    ctx.fillStyle = c.body;
    ctx.fillRect(15 + armExtend, h + 15, 25, 14);
    ctx.fillRect(-40 - armExtend, h + 15, 25, 14);

    // Kick leg
    if (state === FighterState.KICK) {
      ctx.fillStyle = c.body;
      ctx.fillRect(20, h + 50, 35, 16);
    }
  },

  drawMothra(ctx, c, state, frame, crouching) {
    const h = crouching ? -60 : -85;
    const wingFlap = Math.sin(frame * 0.2) * 8;

    // Wings
    ctx.fillStyle = c.wing || c.spikes;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, h + 20);
    ctx.lineTo(-50, h - 20 + wingFlap);
    ctx.lineTo(-40, h + 40);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, h + 20);
    ctx.lineTo(50, h - 20 + wingFlap);
    ctx.lineTo(40, h + 40);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Body (fuzzy oval)
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.ellipse(0, h + 30, 22, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = c.belly;
    ctx.beginPath();
    ctx.ellipse(0, h + 35, 14, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = c.body;
    ctx.fillRect(-12, h - 5, 24, 20);

    // Antennae
    ctx.strokeStyle = c.claw;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, h - 5);
    ctx.lineTo(-15, h - 25);
    ctx.moveTo(8, h - 5);
    ctx.lineTo(15, h - 25);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = c.eye;
    ctx.fillRect(-8, h, 6, 6);
    ctx.fillRect(2, h, 6, 6);

    // Legs
    ctx.fillStyle = c.claw;
    for (let i = -1; i <= 1; i++) {
      ctx.fillRect(i * 12 - 3, h + 55, 6, 20);
    }

    // Arms
    const armExtend = state === FighterState.PUNCH ? 15 : 0;
    ctx.fillStyle = c.body;
    ctx.fillRect(12 + armExtend, h + 20, 18, 10);
    ctx.fillRect(-30 - armExtend, h + 20, 18, 10);
  },

  drawKraken(ctx, c, state, frame, crouching) {
    const h = crouching ? -65 : -95;

    // Tentacles
    ctx.fillStyle = c.tentacle || c.body;
    for (let i = 0; i < 4; i++) {
      const wave = Math.sin(frame * 0.15 + i) * 5;
      ctx.beginPath();
      ctx.moveTo(-20 + i * 14, h + 60);
      ctx.quadraticCurveTo(-30 + i * 14 + wave, h + 80, -25 + i * 14, h + 95);
      ctx.lineWidth = 8;
      ctx.strokeStyle = c.tentacle || c.body;
      ctx.stroke();
    }

    // Body
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.ellipse(0, h + 30, 30, 35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = c.belly;
    ctx.beginPath();
    ctx.ellipse(0, h + 35, 20, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = c.body;
    ctx.fillRect(-25, h - 15, 50, 30);

    // Eyes
    ctx.fillStyle = c.eye;
    ctx.fillRect(-18, h - 8, 12, 12);
    ctx.fillRect(6, h - 8, 12, 12);
    ctx.fillStyle = '#000';
    ctx.fillRect(-14, h - 4, 5, 5);
    ctx.fillRect(10, h - 4, 5, 5);

    // Beak
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.moveTo(0, h + 5);
    ctx.lineTo(-6, h + 15);
    ctx.lineTo(6, h + 15);
    ctx.fill();

    // Arms/claws
    const armExtend = state === FighterState.PUNCH ? 18 : 0;
    ctx.fillStyle = c.claw;
    ctx.fillRect(18 + armExtend, h + 10, 22, 12);
    ctx.fillRect(-40 - armExtend, h + 10, 22, 12);
  },

  drawMech(ctx, c, state, frame, crouching) {
    const h = crouching ? -68 : -98;

    // Legs (mechanical)
    ctx.fillStyle = c.metal || c.body;
    ctx.fillRect(-24, h + 55, 20, 45);
    ctx.fillRect(4, h + 55, 20, 45);
    ctx.fillStyle = c.spikes;
    ctx.fillRect(-22, h + 70, 16, 8);
    ctx.fillRect(6, h + 70, 16, 8);

    // Body chassis
    ctx.fillStyle = c.body;
    ctx.fillRect(-30, h + 10, 60, 50);
    ctx.fillStyle = c.metal || c.belly;
    ctx.fillRect(-22, h + 18, 44, 30);

    // Chest reactor
    ctx.fillStyle = c.eye;
    ctx.beginPath();
    ctx.arc(0, h + 33, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, h + 33, 4, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = c.body;
    ctx.fillRect(-20, h - 22, 40, 35);
    ctx.fillStyle = c.eye;
    ctx.fillRect(-12, h - 15, 24, 6);

    // Shoulder pads
    ctx.fillStyle = c.metal || c.spikes;
    ctx.fillRect(-35, h + 5, 12, 20);
    ctx.fillRect(23, h + 5, 12, 20);

    // Arms
    const armExtend = state === FighterState.PUNCH ? 22 : 0;
    ctx.fillStyle = c.body;
    ctx.fillRect(18 + armExtend, h + 12, 28, 16);
    ctx.fillRect(-46 - armExtend, h + 12, 28, 16);

    // Fist details
    ctx.fillStyle = c.claw;
    ctx.fillRect(40 + armExtend, h + 10, 10, 20);
    ctx.fillRect(-56 - armExtend, h + 10, 10, 20);

    if (state === FighterState.KICK) {
      ctx.fillStyle = c.metal || c.body;
      ctx.fillRect(22, h + 50, 38, 18);
    }
  },

  drawPunchEffect(ctx, fighter) {
    if (!fighter.attackBox) return;
    ctx.fillStyle = 'rgba(255, 255, 100, 0.6)';
    ctx.fillRect(30, -fighter.data.height + 20, 20, 20);
  },

  drawKickEffect(ctx, fighter) {
    if (!fighter.attackBox) return;
    ctx.fillStyle = 'rgba(255, 150, 50, 0.6)';
    ctx.fillRect(25, -30, 40, 18);
  },

  drawSpecialEffect(ctx, fighter) {
    const id = fighter.data.id;
    const frame = fighter.stateTimer;

    if (id === 'gorath' && frame > 20) {
      ctx.fillStyle = 'rgba(255, 100, 0, 0.8)';
      ctx.fillRect(15, -60, 30, 10);
    }
    if (id === 'kraken' && frame <= 30 && frame >= 15) {
      ctx.fillStyle = 'rgba(50, 100, 255, 0.5)';
      ctx.fillRect(-45, -55, 90, 50);
    }
  },

  drawProjectile(p) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);

    if (p.type === 'fire') {
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
      grad.addColorStop(0, '#ffff00');
      grad.addColorStop(0.5, '#ff4400');
      grad.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(-30, -10, 60, 20);
    } else if (p.type === 'dust') {
      ctx.fillStyle = 'rgba(180, 80, 220, 0.7)';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'rocket') {
      ctx.fillStyle = '#888';
      ctx.fillRect(-15, -15, 30, 30);
      ctx.fillStyle = '#ff4400';
      ctx.fillRect(-20, -5, 8, 10);
    }

    ctx.restore();
  },

  drawKaijuPortrait(ctx, kaijuId, size) {
    const data = KAIJU[kaijuId];
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size - 10);
    ctx.scale(0.55, 0.55);
    this.drawKaijuBody(ctx, data, FighterState.IDLE, 0, false);
    ctx.restore();
  },

  drawHitSpark(x, y) {
    const ctx = this.ctx;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 4, y - 4, 8, 8);
    ctx.fillStyle = '#ff0';
    ctx.fillRect(x - 8, y, 4, 4);
    ctx.fillRect(x + 4, y, 4, 4);
    ctx.fillRect(x, y - 8, 4, 4);
    ctx.fillRect(x, y + 4, 4, 4);
  },
};
