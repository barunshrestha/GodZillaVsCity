const KAIJU = {
  gorath: {
    id: 'gorath',
    name: 'GORATH',
    tagline: 'King of Monsters',
    colors: {
      body: '#2d6b2d',
      belly: '#4a9040',
      spikes: '#1a401a',
      eye: '#ff2200',
      claw: '#888844',
    },
    stats: { speed: 3.2, jump: -13, health: 100, punchDmg: 8, kickDmg: 12, specialDmg: 22 },
    specialName: 'ATOMIC BREATH',
    width: 70,
    height: 100,
  },
  mothra: {
    id: 'mothra',
    name: 'MOTHRA-X',
    tagline: 'Guardian of the Skies',
    colors: {
      body: '#cc88cc',
      belly: '#eeddee',
      spikes: '#884488',
      eye: '#00ccff',
      claw: '#aa66aa',
      wing: '#9966bb',
    },
    stats: { speed: 3.8, jump: -14, health: 90, punchDmg: 6, kickDmg: 10, specialDmg: 18 },
    specialName: 'POISON DUST',
    width: 65,
    height: 85,
  },
  kraken: {
    id: 'kraken',
    name: 'KRAKEN',
    tagline: 'Terror of the Deep',
    colors: {
      body: '#2244aa',
      belly: '#3366cc',
      spikes: '#112266',
      eye: '#ffff00',
      claw: '#113355',
      tentacle: '#1a3388',
    },
    stats: { speed: 2.8, jump: -11, health: 110, punchDmg: 10, kickDmg: 14, specialDmg: 20 },
    specialName: 'TENTACLE SLAM',
    width: 75,
    height: 95,
  },
  mech: {
    id: 'mech',
    name: 'MECH-KAI',
    tagline: 'Built to Destroy',
    colors: {
      body: '#555566',
      belly: '#777788',
      spikes: '#333344',
      eye: '#ff4400',
      claw: '#999999',
      metal: '#aaaabb',
    },
    stats: { speed: 3.0, jump: -12, health: 105, punchDmg: 9, kickDmg: 13, specialDmg: 25 },
    specialName: 'ROCKET FIST',
    width: 68,
    height: 98,
  },
};

const KAIJU_LIST = ['gorath', 'mothra', 'kraken', 'mech'];

const GRAVITY = 0.55;
const GROUND_Y = 420;
const STAGE_LEFT = 40;
const STAGE_RIGHT = 920;
const ROUND_TIME = 99;
