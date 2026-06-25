const Input = {
  keys: {},
  prevKeys: {},

  init() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    window.addEventListener('blur', () => {
      this.keys = {};
    });
  },

  update() {
    this.prevKeys = { ...this.keys };
  },

  isDown(code) {
    return !!this.keys[code];
  },

  justPressed(code) {
    return this.keys[code] && !this.prevKeys[code];
  },

  getPlayerInput(playerNum) {
    if (playerNum === 1) {
      return {
        left: this.isDown('KeyA'),
        right: this.isDown('KeyD'),
        up: this.isDown('KeyW'),
        down: this.isDown('KeyS'),
        punch: this.justPressed('KeyQ'),
        kick: this.justPressed('KeyE'),
        special: this.justPressed('KeyR'),
      };
    }
    return {
      left: this.isDown('ArrowLeft'),
      right: this.isDown('ArrowRight'),
      up: this.isDown('ArrowUp'),
      down: this.isDown('ArrowDown'),
      punch: this.justPressed('KeyU'),
      kick: this.justPressed('KeyI'),
      special: this.justPressed('KeyO'),
    };
  },
};
