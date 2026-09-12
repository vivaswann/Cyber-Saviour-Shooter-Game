export const W = 300, H = 100;
export const VIEW_SCALE = 2;
export const ROAD_Y = 78;
export const WEAPONS = {
  CODE: { fireRate: 1.98, speed: 145, life: 4.5 },
  RPG: { fireRate: 1.056, speed: 55, life: 4.8 }
};
export const COLORS = {
  bg: '#07100d', grid: '#123324', green: '#72ff99', dim: '#2c9a5c',
  cyan: '#56d9ff', orange: '#ff9f43', pink: '#ff4f9a', red: '#ff5264',
  yellow: '#f8e46b', white: '#d7ffe0', purple: '#b47aff'
};
export const ENEMIES = {
  malware: { name: 'MALWARE', hp: 10, speed: 7, radius: 9, height: 16, attackRange: 9, color: COLORS.red, xp: 15, score: 60 },
  memory: { name: 'MEMORY_LEAK', hp: 6, speed: 10, radius: 7, height: 22, attackRange: 8, color: COLORS.yellow, xp: 10, score: 35 },
  segfault: { name: 'SEGFAULT', hp: 8, speed: 14, radius: 9, height: 16, attackRange: 9, color: COLORS.orange, xp: 12, score: 45 },
  error: { name: 'ERROR', hp: 5, speed: 15, radius: 7, height: 16, attackRange: 9, color: COLORS.orange, xp: 8, score: 25 },
  bug: { name: 'BUG', hp: 2, speed: 25, radius: 8, height: 8, attackRange: 10, color: COLORS.pink, xp: 4, score: 10 },
  teleport: { name: '404', hp: 5, speed: 12, radius: 8, height: 16, attackRange: 9, color: COLORS.cyan, xp: 10, score: 40 },
  nullpointer: { name: 'NULL POINTER', hp: 12, speed: 8, radius: 6, height: 20, attackRange: 10, color: COLORS.purple, xp: 18, score: 70 },
  bot: { name: 'BOTNET', hp: 22, speed: 6, radius: 12, height: 16, color: COLORS.purple, xp: 28, score: 120 },
  boss: { name: 'KERNEL PANIC', hp: 120, speed: 5, radius: 20, height: 32, color: COLORS.red, xp: 140, score: 1000 }
};
export const WAVE_FORMULA = {
  count: wave => wave === 1 ? 3 : wave === 2 ? 5 : wave === 3 ? 6 : wave === 4 ? 8 : wave === 5 ? 10 : 10 + (wave - 5) * 3,
  hp: wave => Math.pow(1.10, wave - 1),
  speed: wave => 1 + (wave - 1) * 0.024,
  elite: wave => wave % 5 === 0,
  boss: wave => wave % 10 === 0
};
export const UPGRADES = [
  ['OVER_CLOCK', 'fire rate +18%', p => p.fireRate *= 1.18],
  ['GIT_PUSH', 'damage +1', p => p.damage += 1],
  ['STACK_TRACE', 'max HP +12', p => { p.maxHp += 12; p.hp += 12; }],
  ['HOT_RELOAD', 'move speed +12%', p => p.speed *= 1.12],
  ['MEMORY_LEAK', 'piercing rounds', p => p.pierce += 1],
  ['ROOT_ACCESS', 'RPG blast +20%', p => p.rocketDamage *= 1.2]
];
