import { W, H, ENEMIES, WAVE_FORMULA, ROAD_Y, WEAPONS } from '../data/config.js';

export class Player {
  constructor() {
    this.x = 59; this.y = ROAD_Y - 14; this.radius = 3; this.speed = 54; this.vx = 0; this.acceleration = 260; this.maxSpeed = 54;
    this.walking = false; this.walkPhase = 0; this.gaitFrame = 0; this.hp = 30; this.maxHp = 30; this.damage = 2;
    this.fireRate = WEAPONS.CODE.fireRate; this.cooldown = 0; this.weapon = 'CODE'; this.aimAngle = 0; this.deathAimAngle = 0;
    this.invulnerable = 0; this.deathPhase = 0; this.pierce = 0; this.rocketDamage = 12;
    this.equipState = 'none'; this.equipTimer = 0;
  }
  update(dt, input, baseScrollSpeed, cameraX) {
    if (this.equipState !== 'none') {
      this.equipTimer -= dt;
      this.vx = 0;
      this.walking = false;
      this.walkPhase = 0;
      this.gaitFrame = 0;
      this.x += baseScrollSpeed * dt;
      if (this.equipTimer <= 0) {
        if (this.equipState === 'equipping_rpg') {
          this.weapon = 'RPG';
          this.equipState = 'none';
        } else if (this.equipState === 'unequipping_rpg' || this.equipState === 'equipping_code') {
          this.weapon = 'CODE';
          this.equipState = 'none';
        } else if (this.equipState === 'rpg_aftermath') {
          this.equipState = 'unequipping_rpg';
          this.equipTimer = 1.0; // 1s to unequip
        }
      }
      this.cooldown -= dt; this.invulnerable = Math.max(0, this.invulnerable - dt);
      return;
    }

    const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const target = dx * this.maxSpeed;
    const delta = target - this.vx;
    const step = this.acceleration * dt;
    this.vx += Math.max(-step, Math.min(step, delta));
    this.x += (baseScrollSpeed + this.vx) * dt;
    this.x = Math.max(cameraX + 12, Math.min(cameraX + W - 12, this.x)); 
    this.y = ROAD_Y - 14;

    const moving = (baseScrollSpeed > 0) || input.left || input.right || Math.abs(this.vx) > 1;
    this.walking = moving && !this.dead;
    if (this.walking) this.walkPhase = (this.walkPhase + dt * 8) % 4;
    else this.walkPhase = 0;
    this.gaitFrame = Math.floor(this.walkPhase) % 4;
    this.cooldown -= dt; this.invulnerable = Math.max(0, this.invulnerable - dt);
  }
  updateDeath(dt) { this.deathPhase = Math.min(1, this.deathPhase + dt / .72); }
}

export class Enemy {
  constructor(type, x, y, wave = 1, elite = false, aerial = false, origin = 'front-right') {
    Object.assign(this, ENEMIES[type]); this.type = type; this.x = x; this.y = y; this.elite = elite; this.aerial = aerial;
    const scale = WAVE_FORMULA.hp(wave), speedScale = WAVE_FORMULA.speed(wave);
    const gentle = 1 + Math.min(.35, wave * .01);
    this.hp *= scale * gentle * (elite ? 2.2 : 1); this.speed *= speedScale * (elite ? 1.12 : 1); this.maxHp = this.hp;
    this.dead = false; this.lifecycle = 'active'; this.deathTimer = 0; this.flash = 0; this.attackCooldown = 0; 
    this.phase = Math.random() * 9; this.behaviorTimer = 1 + Math.random() * 2; this.dash = 0;
    this.origin = origin; this.spawnX = x; this.spawnY = y; this.previousX = x; this.previousY = y;
    this.attackState = 'approaching'; this.attackAnimPhase = 0; this.walking = true; this.isBlockedByQueue = false;
  }
  update(dt, player, time) {
    if (this.lifecycle !== 'active') return;
    dt = Math.min(.05, Math.max(0, dt));
    this.previousX = this.x; this.previousY = this.y;
    
    // Always calculate angle towards player, but we only move left in this simplified 2D lane setup
    const a = Math.atan2(player.y - this.y, player.x - this.x); 
    let speed = this.speed;
    
    this.behaviorTimer -= dt;
    if (this.type === 'bug') speed *= 1 + Math.sin(time * 5 + this.phase) * .25;
    if (this.type === 'memory') speed *= .45 + Math.min(1.8, time / 35);
    if (this.type === 'segfault' && this.behaviorTimer <= 0) { this.dash = .28; this.behaviorTimer = 2.6; }
    if (this.dash > 0) { this.dash -= dt; speed *= 3.5; }
    if (this.type === 'teleport' && this.behaviorTimer <= 0) { this.origin = 'front-right-404'; this.behaviorTimer = 3.5; }
    
    this.x += Math.cos(a) * speed * dt;
    
    if (this.aerial) {
      this.y += Math.max(8, Math.sin(a) * speed * .35) * dt;
      if (this.y > ROAD_Y - this.radius - 5) this.aerial = false;
    } else {
      this.y = ROAD_Y - this.radius;
    }
    
    if (!Number.isFinite(this.x) || !Number.isFinite(this.y)) { this.x = this.spawnX; this.y = this.spawnY; }
    this.flash = Math.max(0, this.flash - dt);
  }
}

export class Projectile {
  constructor(x, y, tx, ty, weapon, player, wave = 1) {
    this.x = x; this.y = y; this.weapon = weapon; this.dead = false; this.life = WEAPONS[weapon].life;
    const a = Math.atan2(ty - y, tx - x);
    const waveMult = 1 + (wave - 1) * 0.15;
    const speed = WEAPONS[weapon].speed * waveMult;
    this.vx = Math.cos(a) * speed; this.vy = Math.sin(a) * speed; 
    this.damage = weapon === 'RPG' ? player.rocketDamage : player.damage;
    this.radius = weapon === 'RPG' ? 3 : 1; this.pierce = weapon === 'RPG' ? 99 : player.pierce;
  }
  update(dt) { 
    this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt; 
    if (this.life <= 0) this.dead = true; 
  }
}

export class Particle {
  constructor(x, y, color, text = '') { this.x = x; this.y = y; this.color = color; this.text = text; this.life = .55; this.max = this.life; this.vx = (Math.random() - .5) * 30; this.vy = -Math.random() * 28; }
  update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.vy += 45 * dt; this.life -= dt; }
}
