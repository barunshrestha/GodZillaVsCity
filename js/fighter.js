const FighterState = {
  IDLE: 'idle',
  WALK: 'walk',
  JUMP: 'jump',
  CROUCH: 'crouch',
  PUNCH: 'punch',
  KICK: 'kick',
  SPECIAL: 'special',
  HIT: 'hit',
  BLOCK: 'block',
  KO: 'ko',
};

class Fighter {
  constructor(kaijuId, playerNum, startX) {
    const data = KAIJU[kaijuId];
    this.data = data;
    this.playerNum = playerNum;
    this.name = data.name;

    this.x = startX;
    this.y = GROUND_Y;
    this.vx = 0;
    this.vy = 0;
    this.facing = playerNum === 1 ? 1 : -1;
    this.grounded = true;

    this.maxHealth = data.stats.health;
    this.health = this.maxHealth;
    this.state = FighterState.IDLE;
    this.stateTimer = 0;
    this.animFrame = 0;

    this.hitbox = { x: 0, y: 0, w: 0, h: 0 };
    this.hurtbox = { x: 0, y: 0, w: data.width, h: data.height };
    this.attackBox = null;

    this.invincible = 0;
    this.blocking = false;
    this.combo = 0;
    this.hasHitThisAttack = false;

    this.projectiles = [];
  }

  reset(startX) {
    this.x = startX;
    this.y = GROUND_Y;
    this.vx = 0;
    this.vy = 0;
    this.facing = this.playerNum === 1 ? 1 : -1;
    this.grounded = true;
    this.health = this.maxHealth;
    this.state = FighterState.IDLE;
    this.stateTimer = 0;
    this.animFrame = 0;
    this.invincible = 0;
    this.blocking = false;
    this.attackBox = null;
    this.projectiles = [];
    this.hasHitThisAttack = false;
  }

  update(input, opponent, dt) {
    if (this.state === FighterState.KO) return;

    this.animFrame++;
    if (this.invincible > 0) this.invincible--;

    // Face opponent
    if (this.state !== FighterState.HIT && this.state !== FighterState.KO) {
      if (opponent.x > this.x) this.facing = 1;
      else if (opponent.x < this.x) this.facing = -1;
    }

    // State machine
    switch (this.state) {
      case FighterState.IDLE:
      case FighterState.WALK:
      case FighterState.CROUCH:
        this.handleMovement(input);
        this.handleAttacks(input);
        break;
      case FighterState.JUMP:
        this.handleAirMovement(input);
        this.handleAirAttacks(input);
        this.applyGravity();
        break;
      case FighterState.PUNCH:
      case FighterState.KICK:
      case FighterState.SPECIAL:
        this.stateTimer--;
        this.updateAttackBox();
        if (this.stateTimer <= 0) {
          this.state = FighterState.IDLE;
          this.attackBox = null;
        }
        break;
      case FighterState.HIT:
        this.stateTimer--;
        this.vx *= 0.85;
        this.applyGravity();
        if (this.stateTimer <= 0) {
          this.state = FighterState.IDLE;
          this.vx = 0;
        }
        break;
      case FighterState.BLOCK:
        this.blocking = true;
        this.handleBlockMovement(input);
        if (!input.down) {
          this.state = FighterState.IDLE;
          this.blocking = false;
        }
        break;
    }

    // Apply velocity
    this.x += this.vx;
    this.y += this.vy;

    // Ground collision
    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = 0;
      this.grounded = true;
      if (this.state === FighterState.JUMP) {
        this.state = FighterState.IDLE;
      }
    } else {
      this.grounded = false;
    }

    // Stage bounds
    const halfW = this.data.width / 2;
    this.x = Math.max(STAGE_LEFT + halfW, Math.min(STAGE_RIGHT - halfW, this.x));

    // Update hurtbox
    const crouchOffset = this.state === FighterState.CROUCH || this.state === FighterState.BLOCK ? 25 : 0;
    this.hurtbox.w = this.data.width;
    this.hurtbox.h = this.data.height - crouchOffset;
    this.hurtbox.x = this.x - this.hurtbox.w / 2;
    this.hurtbox.y = this.y - this.hurtbox.h;

    // Update projectiles
    this.updateProjectiles(opponent);
  }

  handleMovement(input) {
    const speed = this.data.stats.speed;

    if (input.down && this.grounded) {
      this.state = FighterState.BLOCK;
      this.blocking = true;
      this.vx = 0;
      return;
    }

    this.blocking = false;

    if (input.left) {
      this.vx = -speed;
      this.state = FighterState.WALK;
    } else if (input.right) {
      this.vx = speed;
      this.state = FighterState.WALK;
    } else {
      this.vx = 0;
      this.state = FighterState.IDLE;
    }

    if (input.up && this.grounded) {
      this.vy = this.data.stats.jump;
      this.grounded = false;
      this.state = FighterState.JUMP;
    }
  }

  handleBlockMovement(input) {
    const speed = this.data.stats.speed * 0.4;
    if (input.left) this.vx = -speed;
    else if (input.right) this.vx = speed;
    else this.vx = 0;
  }

  handleAirMovement(input) {
    const speed = this.data.stats.speed * 0.7;
    if (input.left) this.vx = -speed;
    else if (input.right) this.vx = speed;
    else this.vx *= 0.9;
  }

  handleAttacks(input) {
    if (input.punch) this.startAttack(FighterState.PUNCH, 18, this.data.stats.punchDmg, 50, 30);
    else if (input.kick) this.startAttack(FighterState.KICK, 24, this.data.stats.kickDmg, 60, 25);
    else if (input.special) this.startSpecial();
  }

  handleAirAttacks(input) {
    if (input.punch) this.startAttack(FighterState.PUNCH, 20, this.data.stats.punchDmg * 1.2, 45, 35);
    else if (input.kick) this.startAttack(FighterState.KICK, 26, this.data.stats.kickDmg * 1.3, 55, 30);
  }

  startAttack(type, duration, damage, reach, height) {
    this.state = type;
    this.stateTimer = duration;
    this.vx = 0;
    this.hasHitThisAttack = false;
    this.attackDamage = damage;
    this.attackReach = reach;
    this.attackHeight = height;
    this.attackActiveFrame = Math.floor(duration * 0.3);
    this.attackEndFrame = Math.floor(duration * 0.7);
    this.attackBox = null;
  }

  startSpecial() {
    this.state = FighterState.SPECIAL;
    this.stateTimer = 40;
    this.vx = 0;
    this.hasHitThisAttack = false;
    this.attackDamage = this.data.stats.specialDmg;

    if (this.data.id === 'gorath') {
      this.projectiles.push({
        x: this.x + this.facing * 40,
        y: this.y - 50,
        vx: this.facing * 8,
        vy: 0,
        w: 60,
        h: 20,
        damage: this.attackDamage,
        life: 60,
        type: 'fire',
        owner: this,
        hit: false,
      });
    } else if (this.data.id === 'mothra') {
      for (let i = 0; i < 5; i++) {
        this.projectiles.push({
          x: this.x + (Math.random() - 0.5) * 80,
          y: this.y - 80 - i * 15,
          vx: (Math.random() - 0.5) * 3,
          vy: 2 + Math.random() * 2,
          w: 16,
          h: 16,
          damage: this.attackDamage * 0.4,
          life: 50,
          type: 'dust',
          owner: this,
          hit: false,
        });
      }
    } else if (this.data.id === 'kraken') {
      this.attackReach = 90;
      this.attackHeight = 60;
      this.attackActiveFrame = 15;
      this.attackEndFrame = 30;
    } else if (this.data.id === 'mech') {
      this.projectiles.push({
        x: this.x + this.facing * 50,
        y: this.y - 40,
        vx: this.facing * 10,
        vy: -2,
        w: 30,
        h: 30,
        damage: this.attackDamage,
        life: 45,
        type: 'rocket',
        owner: this,
        hit: false,
      });
    }
  }

  updateAttackBox() {
    const inActiveFrame = this.stateTimer <= this.attackEndFrame &&
      this.stateTimer >= this.attackActiveFrame;

    if (inActiveFrame && (this.state === FighterState.PUNCH || this.state === FighterState.KICK)) {
      const reach = this.attackReach || 50;
      const height = this.attackHeight || 30;
      this.attackBox = {
        x: this.facing > 0 ? this.x : this.x - reach,
        y: this.y - this.data.height + 10,
        w: reach,
        h: height,
        damage: this.attackDamage,
      };
    } else if (this.state === FighterState.SPECIAL && this.data.id === 'kraken') {
      const inSlam = this.stateTimer <= 30 && this.stateTimer >= 15;
      if (inSlam) {
        this.attackBox = {
          x: this.x + this.facing * 20 - 45,
          y: this.y - 60,
          w: 90,
          h: 60,
          damage: this.attackDamage,
        };
      } else {
        this.attackBox = null;
      }
    } else if (this.state !== FighterState.SPECIAL) {
      this.attackBox = null;
    }
  }

  updateProjectiles(opponent) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      if (p.type === 'dust') p.vy += 0.05;

      if (p.life <= 0 || p.x < 0 || p.x > 960) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (!p.hit && this.checkProjectileHit(p, opponent)) {
        p.hit = true;
      }
    }
  }

  checkProjectileHit(projectile, opponent) {
    const box = {
      x: projectile.x - projectile.w / 2,
      y: projectile.y - projectile.h / 2,
      w: projectile.w,
      h: projectile.h,
    };
    if (this.boxOverlap(box, opponent.hurtbox) && opponent.invincible <= 0) {
      const blocked = opponent.blocking && opponent.facing !== this.facing;
      const dmg = blocked ? projectile.damage * 0.2 : projectile.damage;
      opponent.takeHit(dmg, this.facing, blocked ? 2 : 5);
      return true;
    }
    return false;
  }

  takeHit(damage, attackerFacing, knockback) {
    if (this.state === FighterState.KO || this.invincible > 0) return;

    this.health = Math.max(0, this.health - damage);

    if (this.health <= 0) {
      this.state = FighterState.KO;
      this.vx = attackerFacing * 6;
      this.vy = -8;
      return;
    }

    this.state = FighterState.HIT;
    this.stateTimer = 15;
    this.vx = attackerFacing * knockback;
    this.vy = -3;
    this.attackBox = null;
    this.invincible = 20;
    this.blocking = false;
  }

  checkHitOpponent(opponent) {
    if (!this.attackBox || this.hasHitThisAttack) return;
    if (this.boxOverlap(this.attackBox, opponent.hurtbox) && opponent.invincible <= 0) {
      const blocked = opponent.blocking && opponent.facing !== this.facing;
      const dmg = blocked ? this.attackBox.damage * 0.15 : this.attackBox.damage;
      opponent.takeHit(dmg, this.facing, blocked ? 1 : 6);
      this.hasHitThisAttack = true;
    }
  }

  boxOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  applyGravity() {
    this.vy += GRAVITY;
  }

  getHealthPercent() {
    return (this.health / this.maxHealth) * 100;
  }
}
