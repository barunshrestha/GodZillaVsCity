const GameState = {
  TITLE: 'title',
  SELECT: 'select',
  ANNOUNCE: 'announce',
  FIGHT: 'fight',
  KO: 'ko',
  GAMEOVER: 'gameover',
};

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.state = GameState.TITLE;
    this.p1Kaiju = 'gorath';
    this.p2Kaiju = 'mothra';
    this.p1SelectIndex = 0;
    this.p2SelectIndex = 1;
    this.round = 1;
    this.timer = ROUND_TIME;
    this.timerInterval = null;
    this.announceTimer = 0;
    this.koTimer = 0;
    this.winner = null;
    this.fightStarted = false;
    this.p1Wins = 0;
    this.p2Wins = 0;

    this.p1 = null;
    this.p2 = null;

    this.screens = {
      title: document.getElementById('screen-title'),
      select: document.getElementById('screen-select'),
      gameover: document.getElementById('screen-gameover'),
    };
    this.hud = document.getElementById('hud');
    this.announcement = document.getElementById('announcement');
    this.announceText = document.getElementById('announce-text');

    Renderer.init(this.canvas);
    Input.init();
    this.setupCharacterSelect();
    this.drawPreviewPortraits();
    this.loop();
  }

  drawPreviewPortraits() {
    document.querySelectorAll('.preview-canvas').forEach((canvas) => {
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      Renderer.drawKaijuPortrait(ctx, canvas.dataset.kaiju, 80);
    });
  }

  setupCharacterSelect() {
    document.querySelectorAll('.char-grid').forEach((grid) => {
      const player = grid.dataset.player;
      KAIJU_LIST.forEach((id, index) => {
        const option = document.createElement('div');
        option.className = 'char-option' + (index === (player === '1' ? 0 : 1) ? ' selected' : '');
        option.dataset.kaiju = id;
        option.dataset.index = index;

        const canvas = document.createElement('canvas');
        canvas.width = 60;
        canvas.height = 60;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        Renderer.drawKaijuPortrait(ctx, id, 60);

        option.appendChild(canvas);
        grid.appendChild(option);
      });
    });
  }

  updateSelectUI() {
    document.querySelectorAll('.char-grid[data-player="1"] .char-option').forEach((el, i) => {
      el.classList.toggle('selected', i === this.p1SelectIndex);
    });
    document.querySelectorAll('.char-grid[data-player="2"] .char-option').forEach((el, i) => {
      el.classList.toggle('selected', i === this.p2SelectIndex);
    });
    document.getElementById('p1-name').textContent = KAIJU[KAIJU_LIST[this.p1SelectIndex]].name;
    document.getElementById('p2-name').textContent = KAIJU[KAIJU_LIST[this.p2SelectIndex]].name;
  }

  showScreen(name) {
    Object.values(this.screens).forEach((s) => s.classList.remove('active'));
    if (name && this.screens[name]) {
      this.screens[name].classList.add('active');
    }
  }

  startFight() {
    this.p1Kaiju = KAIJU_LIST[this.p1SelectIndex];
    this.p2Kaiju = KAIJU_LIST[this.p2SelectIndex];

    this.p1 = new Fighter(this.p1Kaiju, 1, 250);
    this.p2 = new Fighter(this.p2Kaiju, 2, 710);

    document.getElementById('hud-p1-name').textContent = KAIJU[this.p1Kaiju].name;
    document.getElementById('hud-p2-name').textContent = KAIJU[this.p2Kaiju].name;

    this.showScreen(null);
    this.hud.classList.remove('hidden');
    this.state = GameState.ANNOUNCE;
    this.announceText.textContent = `ROUND ${this.round}`;
    this.announcement.classList.remove('hidden');
    this.announceTimer = 90;
    this.fightStarted = false;
    this.timer = ROUND_TIME;
    this.updateHealthBars();
  }

  startRoundTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.state === GameState.FIGHT && this.fightStarted) {
        this.timer--;
        document.getElementById('timer').textContent = this.timer;
        if (this.timer <= 0) {
          this.endRoundByTimeout();
        }
      }
    }, 1000);
  }

  endRoundByTimeout() {
    if (this.p1.health > this.p2.health) this.winner = 1;
    else if (this.p2.health > this.p1.health) this.winner = 2;
    else this.winner = 0;
    this.goToGameOver();
  }

  goToGameOver() {
    this.state = GameState.GAMEOVER;
    clearInterval(this.timerInterval);
    this.hud.classList.add('hidden');

    let text;
    if (this.winner === 1) {
      text = `${KAIJU[this.p1Kaiju].name} WINS!`;
      this.p1Wins++;
    } else if (this.winner === 2) {
      text = `${KAIJU[this.p2Kaiju].name} WINS!`;
      this.p2Wins++;
    } else {
      text = 'DRAW!';
    }
    document.getElementById('winner-text').textContent = text;
    this.showScreen('gameover');
  }

  updateHealthBars() {
    document.getElementById('p1-health').style.width = this.p1.getHealthPercent() + '%';
    document.getElementById('p2-health').style.width = this.p2.getHealthPercent() + '%';
  }

  handleTitleInput() {
    if (Input.justPressed('Enter')) {
      this.showScreen('select');
      this.state = GameState.SELECT;
      this.updateSelectUI();
    }
  }

  handleSelectInput() {
    if (Input.justPressed('KeyA')) {
      this.p1SelectIndex = (this.p1SelectIndex - 1 + KAIJU_LIST.length) % KAIJU_LIST.length;
      this.updateSelectUI();
    }
    if (Input.justPressed('KeyD')) {
      this.p1SelectIndex = (this.p1SelectIndex + 1) % KAIJU_LIST.length;
      this.updateSelectUI();
    }
    if (Input.justPressed('ArrowLeft')) {
      this.p2SelectIndex = (this.p2SelectIndex - 1 + KAIJU_LIST.length) % KAIJU_LIST.length;
      this.updateSelectUI();
    }
    if (Input.justPressed('ArrowRight')) {
      this.p2SelectIndex = (this.p2SelectIndex + 1) % KAIJU_LIST.length;
      this.updateSelectUI();
    }
    if (Input.justPressed('Enter')) {
      this.startFight();
    }
  }

  handleGameOverInput() {
    if (Input.justPressed('Enter')) {
      this.round = 1;
      this.showScreen('select');
      this.state = GameState.SELECT;
      this.updateSelectUI();
    }
  }

  updateFight() {
    if (this.state === GameState.ANNOUNCE) {
      this.announceTimer--;
      if (this.announceTimer <= 30) {
        this.announceText.textContent = 'FIGHT!';
      }
      if (this.announceTimer <= 0) {
        this.announcement.classList.add('hidden');
        this.state = GameState.FIGHT;
        this.fightStarted = true;
        this.startRoundTimer();
      }
      return;
    }

    if (this.state !== GameState.FIGHT || !this.fightStarted) return;

    const p1Input = Input.getPlayerInput(1);
    const p2Input = Input.getPlayerInput(2);

    this.p1.update(p1Input, this.p2, 1);
    this.p2.update(p2Input, this.p1, 1);

    this.p1.checkHitOpponent(this.p2);
    this.p2.checkHitOpponent(this.p1);

    // Screen shake on heavy hits
    if (this.p1.state === FighterState.HIT || this.p2.state === FighterState.HIT) {
      if (this.p1.invincible === 20 || this.p2.invincible === 20) {
        Renderer.screenShake(6);
      }
    }

    this.updateHealthBars();

    // Check KO
    if (this.p1.state === FighterState.KO || this.p2.state === FighterState.KO) {
      this.state = GameState.KO;
      this.koTimer = 120;
      this.fightStarted = false;
      clearInterval(this.timerInterval);

      if (this.p1.state === FighterState.KO) this.winner = 2;
      else this.winner = 1;

      this.announceText.textContent = 'K.O.!';
      this.announcement.classList.remove('hidden');
    }
  }

  updateKO() {
    this.koTimer--;
    // Slow-mo fall animation
    this.p1.y += 0.5;
    this.p2.y += 0.5;

    if (this.koTimer <= 0) {
      this.announcement.classList.add('hidden');
      this.goToGameOver();
    }
  }

  render() {
    Renderer.clear();
    Renderer.drawBackground();

    if (this.p1 && this.p2 && [GameState.FIGHT, GameState.KO, GameState.ANNOUNCE].includes(this.state)) {
      // Draw fighters back-to-front based on y
      const fighters = [this.p1, this.p2].sort((a, b) => a.y - b.y);
      fighters.forEach((f) => Renderer.drawFighter(f));
    }

    // Title screen background animation
    if (this.state === GameState.TITLE) {
      Renderer.drawBackground();
      this.drawTitleKaiju();
    }
  }

  drawTitleKaiju() {
    const ctx = Renderer.ctx;
    const frame = Date.now() / 1000;

    ctx.save();
    ctx.translate(200 + Math.sin(frame) * 20, GROUND_Y);
    ctx.scale(1.2, 1.2);
    Renderer.drawKaijuBody(ctx, KAIJU.gorath, FighterState.IDLE, frame * 10, false);
    ctx.restore();

    ctx.save();
    ctx.translate(760 + Math.sin(frame + 1) * 20, GROUND_Y);
    ctx.scale(-1.2, 1.2);
    Renderer.drawKaijuBody(ctx, KAIJU.mothra, FighterState.IDLE, frame * 10, false);
    ctx.restore();
  }

  loop() {
    switch (this.state) {
      case GameState.TITLE:
        this.handleTitleInput();
        break;
      case GameState.SELECT:
        this.handleSelectInput();
        break;
      case GameState.FIGHT:
      case GameState.ANNOUNCE:
        this.updateFight();
        break;
      case GameState.KO:
        this.updateKO();
        break;
      case GameState.GAMEOVER:
        this.handleGameOverInput();
        break;
    }

    this.render();
    Input.update();
    requestAnimationFrame(() => this.loop());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
