import { W, H, ENEMIES, UPGRADES, WAVE_FORMULA, ROAD_Y, WEAPONS } from '../data/config.js';
import { Player, Enemy, Projectile, Particle } from './entities.js';
import { Renderer } from '../rendering/renderer.js';

const canvas = document.querySelector('#game'), renderer = new Renderer(canvas);
const input = { up: false, down: false, left: false, right: false, fire: false, mouseX: W / 2, mouseY: ROAD_Y };
const state = {
  mode: 'play', time: 0, wave: 1, score: 0, kills: 0, codeKills: 0, rpgAmmo: 0,
  xp: 0, level: 21, nextXp: 35, spawnClock: 0, player: new Player(),
  enemies: [], projectiles: [], particles: [], upgrades: [], mouse: input,
  cameraX: 0
};
let nextEnemyId = 1;
const keyMap = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' };

addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (keyMap[k]) input[keyMap[k]] = true;
  if (k === ' ') input.fire = true;
  if (k === 'r' && state.mode === 'play' && state.player.equipState === 'none') {
    if (state.player.weapon === 'CODE') {
      state.player.equipState = 'equipping_rpg';
      state.player.equipTimer = 1.0;
    } else {
      state.player.equipState = 'equipping_code';
      state.player.equipTimer = 0.8;
    }
  }
  if (k === 'enter' && state.mode === 'gameover') reboot();
  e.preventDefault();
});
addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (keyMap[k]) input[keyMap[k]] = false; if (k === ' ') input.fire = false; });
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  input.mouseX = (e.clientX - r.left) / r.width * W; input.mouseY = (e.clientY - r.top) / r.height * H;
});
canvas.addEventListener('mousedown', () => input.fire = true);
addEventListener('mouseup', () => input.fire = false);

function roster() {
  return state.wave < 2 ? ['bug', 'error', 'memory', 'teleport'] :
    ['bug', 'error', 'memory', 'segfault', 'malware', 'teleport', 'nullpointer'];
}
function spawnEnemy(forceAerial = false) {
  if (state.enemies.length >= 12) return;
  const types = roster(), type = types[Math.floor(Math.random() * types.length)];
  const aerial = forceAerial || Math.random() < .27;
  const radius = ENEMIES[type].radius;
  // Spawn in world coordinates relative to camera
  const x = state.cameraX + W + 28 + Math.random() * 45;
  const y = aerial ? 10 + Math.random() * 20 : ROAD_Y - radius;
  const origin = aerial ? 'front-top-right' : 'front-right-road';
  const laneCount = state.enemies.filter(e => e.aerial === aerial).length;
  if (laneCount >= (aerial ? 6 : 12)) return;
  if (state.enemies.some(e => Math.abs(e.x - x) < 42 && Math.abs(e.y - y) < 28)) return;
  const enemy = new Enemy(type, x, y, state.wave, false, aerial, origin);
  enemy.id = nextEnemyId++;
  state.enemies.push(enemy);
}
function seedOpening() {
  state.enemies.length = 0;
  spawnEnemy(false); spawnEnemy(true); spawnEnemy(false);
  state.enemies[0].x = 240; state.enemies[0].y = ROAD_Y - state.enemies[0].radius; state.enemies[0].origin = 'reference-front-right';
  state.enemies[0].type = 'error'; Object.assign(state.enemies[0], ENEMIES.error);
  state.enemies[0].maxHp = state.enemies[0].hp; state.enemies[0].aerial = false;
}
function shoot() {
  const p = state.player;
  if (p.cooldown > 0 || p.equipState !== 'none') return;
  if (p.weapon === 'RPG' && state.rpgAmmo <= 0) { p.weapon = 'CODE'; return; }
  const weapon = p.weapon;
  
  const waveMult = 1 + (state.wave - 1) * 0.15;
  p.cooldown = 1 / ((weapon === 'CODE' ? p.fireRate : WEAPONS.RPG.fireRate) * waveMult);
  
  if (weapon === 'RPG') state.rpgAmmo--;
  const aimX = p.x + Math.cos(p.aimAngle) * 100, aimY = p.y + Math.sin(p.aimAngle) * 100;
  state.projectiles.push(new Projectile(p.x, p.y, aimX, aimY, weapon, p, state.wave));
  state.particles.push(new Particle(p.x, p.y, weapon === 'RPG' ? '#ff9f43' : '#56d9ff'));
  if (weapon === 'RPG') {
    p.equipState = 'rpg_aftermath';
    p.equipTimer = 1.0;
  }
}
function awardKill(e, source) {
  if (e.lifecycle !== 'active') return;
  e.lifecycle = 'dying'; e.deathTimer = .18; state.kills++; state.score += e.score; state.xp += e.xp;
  if (source === 'CODE') { state.codeKills++; if (state.codeKills % 10 === 0) state.rpgAmmo++; }
  state.particles.push(new Particle(e.x, e.y, e.color, `+${e.xp}XP`));
  if (e.type === 'nullpointer') for (let i = 0; i < 2; i++) {
    const split = new Enemy('bug', e.x + (i ? 5 : -5), ROAD_Y - 4, state.wave, false, false, 'null-pointer-split');
    split.id = nextEnemyId++; state.enemies.push(split);
  }
}
function explode(x, y, b) {
  renderer.shake = 8; // RPG causes big shake
  const blastRadius = 60; // large blast radius
  for (let i = 0; i < 24; i++) state.particles.push(new Particle(x, y, i % 2 ? '#ff9f43' : '#fff06a'));
  for (const e of state.enemies) if (e.lifecycle === 'active') {
    const distance = Math.hypot(e.x - x, e.y - y);
    if (distance < blastRadius) {
      const falloff = 1 - distance / blastRadius;
      e.hp -= b.damage * (0.65 + falloff * 0.85);
      e.flash = .2;
      if (e.hp <= 0) awardKill(e, 'RPG');
    }
  }
}
function collide() {
  for (const b of state.projectiles) {
    for (const e of state.enemies) {
      if (!b.dead && e.lifecycle === 'active') {
        const hit = Math.abs(b.x - e.x) < b.radius + e.radius &&
                    Math.abs(b.y - e.y) < b.radius + (e.height || e.radius * 2) / 2;
        if (hit) {
          if (b.weapon === 'RPG') { b.dead = true; explode(b.x, b.y, b); }
          else { e.hp -= b.damage; e.flash = .08; b.pierce--; if (b.pierce < 0) b.dead = true; if (e.hp <= 0) awardKill(e, 'CODE'); }
        }
      }
    }
  }
}
function levelCheck() {
  if (state.xp >= state.nextXp) {
    state.xp -= state.nextXp; state.level++; state.nextXp = Math.floor(state.nextXp * 1.35);
    const upgrade = UPGRADES[Math.floor(Math.random() * UPGRADES.length)];
    upgrade[2](state.player);
    state.particles.push(new Particle(state.player.x, state.player.y - 12, '#72ff99', `PATCH ${upgrade[0]}`));
  }
}
function reboot() {
  Object.assign(state, { mode: 'play', time: 0, wave: 1, score: 0, kills: 0, codeKills: 0, rpgAmmo: 0, xp: 0, level: 21, nextXp: 35, spawnClock: 0, player: new Player(), enemies: [], projectiles: [], particles: [], cameraX: 0 });
  seedOpening();
}
function update(dt) {
  if (state.mode !== 'play') return;
  state.time += dt; state.wave = 1 + Math.floor(state.time / 20);
  
  const baseScrollSpeed = state.player.equipState === 'none' ? 20 : 0;
  state.cameraX += baseScrollSpeed * dt;

  // Aim angle needs to consider camera
  const worldMouseX = input.mouseX + state.cameraX;
  state.player.aimAngle = Math.atan2(input.mouseY - state.player.y, worldMouseX - state.player.x);

  state.spawnClock -= dt;
  if (state.spawnClock <= 0) { spawnEnemy(state.time > 8 && Math.random() < .32); state.spawnClock = Math.max(0.95, 1.3 - state.wave * 0.02); }
  for (const p of state.particles) p.update(dt); state.particles = state.particles.filter(p => p.life > 0);
  
  state.player.update(dt, input, baseScrollSpeed, state.cameraX); 
  if (input.fire) shoot();
  
  for (const e of state.enemies) e.update(dt, state.player, state.time);
  
  // Enqueue enemies to prevent overlaps and walking through the player
  state.enemies.sort((a, b) => a.x - b.x);
  for (let i = 0; i < state.enemies.length; i++) {
    const a = state.enemies[i];
    if (a.lifecycle !== 'active') continue;
    
    const playerBarrier = state.player.x + state.player.radius + (a.attackRange || 8) + a.radius;
    let isBlocked = false;
    
    // Stop at attack range
    if (a.x <= playerBarrier + 0.1) {
      a.x = playerBarrier;
      a.attackState = 'attacking';
      isBlocked = true;
    } else {
      a.attackState = 'approaching';
    }
    
    // Queue others behind it
    for (let j = i + 1; j < state.enemies.length; j++) {
      const b = state.enemies[j];
      if (b.lifecycle !== 'active') continue;
      
      const labelWidth = Math.max(a.name.length, b.name.length) * 2.8;
      const minSep = a.radius + b.radius + Math.max(12, labelWidth);
      if (b.x < a.x + minSep) {
        b.x = a.x + minSep;
        b.isBlockedByQueue = true;
      }
    }
    
    // Animation and attack logic
    if (Math.abs(a.x - a.previousX) < 0.1 || isBlocked || a.isBlockedByQueue) {
      a.walking = false;
    } else {
      a.walking = true;
    }
    
    if (a.attackState === 'attacking') {
      a.attackCooldown -= dt;
      if (a.attackCooldown <= 0) {
        a.attackCooldown = 1.0;
        a.attackAnimPhase = 0.3; // Animation length
        if (!state.player.invulnerable) {
          state.player.hp -= a.damage || 4;
          state.player.invulnerable = 0.55;
          renderer.shake = 3;
        }
      }
    } else {
      a.attackCooldown = 0;
    }
    
    if (a.attackAnimPhase > 0) a.attackAnimPhase -= dt;
    a.isBlockedByQueue = false;
  }
  
  for (const b of state.projectiles) b.update(dt);
  collide(); state.projectiles = state.projectiles.filter(b => !b.dead);
  
  for (const e of state.enemies) {
    if (e.lifecycle === 'dying') { e.deathTimer -= dt; if (e.deathTimer <= 0) e.lifecycle = 'dead'; }
  }
  
  // Only remove enemies that are truly dead
  state.enemies = state.enemies.filter(e => e.lifecycle !== 'dead');
  
  levelCheck(); if (state.player.hp <= 0) { state.player.dead = true; state.player.deathAimAngle = state.player.aimAngle; state.mode = 'death'; state.player.deathPhase = 0; }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (state.mode === 'death') { state.player.updateDeath(dt); if (state.player.deathPhase >= 1) state.mode = 'gameover'; }
  else update(dt);
  renderer.draw(state); requestAnimationFrame(frame);
}
seedOpening(); requestAnimationFrame(frame);
