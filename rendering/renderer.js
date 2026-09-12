import { W, H, COLORS, VIEW_SCALE, ROAD_Y } from '../data/config.js';

const px = (ctx, x, y, w, h, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
};

export class Renderer {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.scale(VIEW_SCALE, VIEW_SCALE);
    this.shake = 0;
  }

  draw(state) {
    const c = this.ctx;
    c.save();
    if (this.shake > 0) {
      c.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
      this.shake *= 0.86;
    }
    
    this.background(c, state.time, state.cameraX);
    
    // Apply camera translation for world objects
    c.save();
    c.translate(-Math.round(state.cameraX), 0);
    
    for (const p of state.particles) this.particle(c, p);
    
    const labelPlaced = [];
    for (const e of state.enemies) {
      if (e.lifecycle !== 'active' && e.lifecycle !== 'dying') continue;
      
      let labelY = e.y - 18;
      const width = Math.max(22, e.name.length * 3 + 4);
      for (const prior of labelPlaced) {
        if (Math.abs(e.x - prior.x) < (width + prior.width) * .5 + 3 && Math.abs(labelY - prior.y) < 8) labelY = prior.y - 9;
      }
      e.labelY = labelY;
      labelPlaced.push({ x: e.x, y: e.labelY, width });
      this.enemy(c, e);
    }
    
    for (const b of state.projectiles) this.projectile(c, b);
    this.player(c, state.player);
    
    c.restore(); // restore from camera translation
    
    this.hud(c, state);
    if (state.mode === 'gameover') this.overlay(c, state);
    c.restore();
  }

  background(c, time, cameraX) {
    px(c, 0, 0, W, H, '#050916');
    
    // sparse star field (parallax 0.1) + subtle time scroll
    const stars = [[18, 8], [43, 14], [70, 5], [96, 11], [119, 19], [148, 6], [177, 13], [205, 8], [233, 18], [265, 6], [288, 15]];
    for (const [sx, sy] of stars) {
      let x = (sx - cameraX * 0.1 - time * 2) % W;
      if (x < 0) x += W;
      px(c, x, sy, 1, 1, '#77829f');
    }
    
    // rain (parallax 0.15)
    for (let i = 0; i < 7; i++) {
      const x = (i * 47 - Math.floor(time * (i + 2) * 3) - cameraX * 0.15) % (W + 20);
      if (x > -5) px(c, x < 0 ? x + W + 20 : x, 10 + i * 4, 1, 5, '#27324e');
    }
    
    // layered, blocky skyline (parallax 0.3) + subtle time scroll
    const buildings = [[0, 25, 15], [11, 17, 12], [25, 28, 14], [39, 22, 10], [50, 14, 12], [63, 25, 16], [78, 20, 12], [91, 29, 15], [106, 16, 11], [119, 23, 14], [135, 12, 9], [146, 26, 16], [162, 19, 12], [176, 28, 13], [190, 14, 11], [203, 23, 15], [219, 17, 11], [231, 27, 17], [248, 20, 12], [261, 25, 15], [279, 16, 14], [291, 24, 12]];
    let totalBuildingWidth = 320;
    for (const [bx, top, width] of buildings) {
      let x = (bx - cameraX * 0.3 - time * 4) % totalBuildingWidth;
      if (x < -width) x += totalBuildingWidth;
      
      px(c, x, top, width, 79 - top, bx % 2 ? '#0c1428' : '#101a2d');
      for (let y = top + 5; y < 77; y += 7) {
        if ((bx + y + Math.floor(time * 2)) % 17 < 8) px(c, x + 3, y, 1, 1, '#46d7d2');
        if ((bx + y) % 23 === 0) px(c, x + width - 3, y, 1, 1, '#53617d');
      }
      if (width > 10 && top < 21) { px(c, x + width / 2, top - 5, 1, 5, '#485267'); px(c, x + width / 2 - 1, top - 6, 2, 2, '#f6a623'); }
    }
    
    px(c, 0, 62, W, 3, '#4b5260');
    px(c, 0, 65, W, 1, '#181e2b');
    px(c, 0, ROAD_Y + 1, W, H - ROAD_Y - 1, '#0f121d');
    px(c, 0, ROAD_Y, W, 1, '#42ff91');
    
    // road markings perfectly mapped to world
    for (let markX = 0; markX < W + 64; markX += 32) {
       let x = (markX - Math.round(cameraX) % 32);
       px(c, x - 32, ROAD_Y + 3, 8, 1, '#70778a');
    }
    
    // Only display this sign at the very beginning
    if (cameraX < 300) {
      c.fillStyle = '#2bba68';
      c.font = '4px monospace';
      c.textAlign = 'center';
      c.fillText('BUILD IT. BREAK IT. UNDERSTAND IT. BUILD IT BETTER.', 150 - cameraX, 97);
      c.textAlign = 'left';
    }
  }

  player(c, p) {
    const x = p.x, y = p.y;
    const tint = p.dead ? '#e33e52' : null;
    const falling = p.dead ? p.deathPhase : 0;
    c.save();
    if (falling > 0) {
      c.translate(x, y + falling * 10);
      c.rotate(falling * 1.35);
      c.translate(-x, -y);
    }
    
    let backpackOnGround = false;
    let headYOffset = 0;
    let showWeapon = p.equipState === 'none' || p.equipState === 'rpg_aftermath';
    
    if (p.equipState === 'equipping_rpg' || p.equipState === 'unequipping_rpg' || p.equipState === 'equipping_code') {
      backpackOnGround = true;
      let duration = p.equipState === 'equipping_rpg' ? 1.0 : (p.equipState === 'equipping_code' ? 0.8 : 1.0);
      let progress = 1 - Math.abs(p.equipTimer - duration/2) / (duration/2);
      if (progress > 0) headYOffset = progress * 4;
    }
    
    if (backpackOnGround) px(c, x + 6, ROAD_Y - 7, 6, 7, '#9b3d2d');
    else px(c, x - 6, y, 2, 7, tint || '#9b3d2d');

    px(c, x - 3, y - 9 + headYOffset, 6, 3, tint || '#35251f'); // head
    px(c, x - 3, y - 6 + headYOffset, 6, 5, tint || '#e3aa7f'); // neck/chest
    px(c, x - 2, y - 3, 4, 2, tint || '#111827');
    px(c, x - 4, y - 1, 8, 8, tint || '#28629a');
    
    const frame = p.walking ? p.gaitFrame : 0;
    if (frame === 1) {
      px(c, x + 1, y + 7, 2, 5, tint || '#172238');
      px(c, x, y + 12, 3, 2, tint || '#f4f4ec');
      px(c, x - 6, y + 6, 2, 4, tint || '#172238');
      px(c, x - 7, y + 9, 3, 2, tint || '#f4f4ec');
    } else if (frame === 3) {
      px(c, x - 3, y + 7, 2, 5, tint || '#172238');
      px(c, x - 4, y + 12, 3, 2, tint || '#f4f4ec');
      px(c, x + 4, y + 6, 2, 4, tint || '#172238');
      px(c, x + 4, y + 9, 3, 2, tint || '#f4f4ec');
    } else {
      px(c, x - 3, y + 7, 2, 5, tint || '#172238');
      px(c, x + 1, y + 7, 2, 5, tint || '#172238');
      px(c, x - 4, y + 12, 3, 2, tint || '#f4f4ec');
      px(c, x + 1, y + 12, 3, 2, tint || '#f4f4ec');
    }
    px(c, x - 5, y, 2, 4, tint || '#28629a');
    
    if (showWeapon) {
      c.save(); c.translate(x, y + headYOffset); c.rotate(p.dead ? p.deathAimAngle : p.aimAngle);
      if (p.weapon === 'RPG') { px(c, 2, -2, 9, 4, '#8a5c3b'); px(c, 10, -2, 5, 3, '#c9d0d4'); px(c, 5, 2, 3, 4, '#4a3028'); }
      else { px(c, 2, -2, 10, 3, '#4b5e68'); px(c, 11, -3, 4, 3, '#d5edf2'); px(c, 4, 1, 4, 3, '#263945'); }
      c.restore();
    }
    c.restore();
  }

  enemy(c, e) {
    const color = e.flash > 0 ? '#fff' : e.color, x = e.x, y = e.y;
    
    let yOffset = 0;
    let rot = 0;
    if (e.attackAnimPhase > 0) {
      rot = -0.2; // slight lunge/tilt
      yOffset = -1;
    }
    
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    
    if (e.type === 'malware') { 
      px(c, -5, -5+yOffset, 10, 10, color);
      px(c, -8, -2+yOffset, 3, 4, color); px(c, 5, -2+yOffset, 3, 4, color); 
      px(c, -2, -8+yOffset, 4, 3, color); px(c, -2, 5+yOffset, 4, 3, color); 
      px(c, -3, -1+yOffset, 2, 1, '#fff'); px(c, 1, -1+yOffset, 2, 1, '#fff'); 
      px(c, -3, 2+yOffset, 6, 1, '#fff'); 
    }
    else if (e.type === 'memory') { 
      px(c, -7, -8+yOffset, 14, 16, color);
      px(c, -6, 6+yOffset, 2, 2, '#ffcc00'); px(c, -2, 6+yOffset, 2, 2, '#ffcc00'); px(c, 2, 6+yOffset, 2, 2, '#ffcc00');
      px(c, -5, -6+yOffset, 4, 3, '#111'); px(c, 1, -6+yOffset, 4, 3, '#111');
      px(c, -5, -1+yOffset, 4, 3, '#111'); px(c, 1, -1+yOffset, 4, 3, '#111');
      px(c, -4, 9+yOffset, 2, 2, '#56d9ff'); px(c, 3, 11+yOffset, 2, 2, '#56d9ff');
    }
    else if (e.type === 'segfault') { 
      px(c, -7, -8+yOffset, 8, 8, color); 
      px(c, 1, -6+yOffset, 7, 7, color);  
      px(c, -9, 2+yOffset, 9, 6, color);  
      px(c, 2, 0+yOffset, 6, 8, color);   
      px(c, -2, 0+yOffset, 4, 2, '#fff'); 
    }
    else if (e.type === 'error') { 
      px(c, -7, -8+yOffset, 14, 16, color); 
      px(c, -1, -5+yOffset, 2, 6, '#fff0a8'); 
      px(c, -1, 3+yOffset, 2, 2, '#fff0a8'); 
    }
    else if (e.type === 'bug') { 
      px(c, -4, -6+yOffset, 1, 2, color); px(c, 3, -6+yOffset, 1, 2, color);
      px(c, -5, -4+yOffset, 10, 6, color);
      px(c, -7, -3+yOffset, 2, 1, color); px(c, -8, -1+yOffset, 3, 1, color); px(c, -7, 1+yOffset, 2, 1, color);
      px(c, 5, -3+yOffset, 2, 1, color); px(c, 5, -1+yOffset, 3, 1, color); px(c, 5, 1+yOffset, 2, 1, color);
      px(c, -3, -2+yOffset, 2, 2, '#050916'); px(c, 1, -2+yOffset, 2, 2, '#050916');
    }
    else if (e.type === 'teleport') { 
      px(c, -8, -6+yOffset, 16, 12, color);
      px(c, -8, 6+yOffset, 4, 3, color); px(c, -2, 6+yOffset, 4, 3, color); px(c, 4, 6+yOffset, 4, 3, color); 
      px(c, -6, -3+yOffset, 1, 3, '#000'); px(c, -6, -1+yOffset, 3, 1, '#000'); px(c, -4, -4+yOffset, 1, 5, '#000');
      px(c, -1, -4+yOffset, 2, 5, '#000');
      px(c, 3, -3+yOffset, 1, 3, '#000'); px(c, 3, -1+yOffset, 3, 1, '#000'); px(c, 5, -4+yOffset, 1, 5, '#000');
    }
    else if (e.type === 'nullpointer') { 
      px(c, -2, -9+yOffset, 4, 10, color); 
      px(c, -5, 1+yOffset, 10, 2, color);  
      px(c, -3, 3+yOffset, 6, 2, color); 
      px(c, -1, 5+yOffset, 2, 2, color);
      px(c, -2, 9+yOffset, 4, 2, '#000');
    }
    else { px(c, -e.radius, -e.radius + yOffset, e.radius * 2, e.radius * 2, color); }
    px(c, -2, -1 + yOffset, 1, 1, '#050916'); px(c, 1, -1 + yOffset, 1, 1, '#050916');
    
    if (e.elite) { c.strokeStyle = '#f8e46b'; c.strokeRect(-e.radius - 2, -e.radius - 2 + yOffset, e.radius * 2 + 4, e.radius * 2 + 4); }
    
    c.restore();

    const labelWidth = Math.max(22, e.name.length * 3 + 4);
    const labelX = x;
    const labelY = e.labelY || y - 18;
    c.fillStyle = '#02050dee'; c.fillRect(labelX - labelWidth / 2, labelY - 7, labelWidth, 10);
    c.fillStyle = '#182033'; c.fillRect(labelX - 10, labelY + 2, 20, 2);
    c.fillStyle = '#7dff9a'; c.fillRect(labelX - 10, labelY + 2, 20 * Math.max(0, e.hp / e.maxHp), 2);
    c.font = 'bold 5px monospace'; c.textAlign = 'center'; c.fillStyle = '#f4fff6'; c.fillText(e.name, labelX, labelY); c.textAlign = 'left';
  }

  projectile(c, b) {
    if (b.weapon === 'RPG') { px(c, b.x - 2, b.y - 2, 5, 3, '#ff9f43'); px(c, b.x - 4, b.y - 1, 2, 1, '#fff06a'); }
    else px(c, b.x - b.radius, b.y - b.radius, b.radius * 2 + 1, b.radius * 2 + 1, '#56d9ff');
  }

  particle(c, p) {
    c.globalAlpha = Math.max(0, p.life / p.max);
    px(c, p.x, p.y, 1, 1, p.color);
    if (p.text) { c.font = '4px monospace'; c.fillStyle = p.color; c.fillText(p.text, p.x + 2, p.y); }
    c.globalAlpha = 1;
  }

  hud(c, s) {
    c.strokeStyle = '#1b2235'; c.strokeRect(3, 2, 72, 15);
    c.font = '4px monospace'; c.fillStyle = COLORS.green; c.fillText('VIVASWAN.EXE', 4, 7);
    c.fillStyle = '#ef476f'; c.fillText('HP', 4, 11); c.fillStyle = '#39c6df'; c.fillText('XP', 4, 15);
    px(c, 11, 9, 28, 2, '#de3d67'); px(c, 11, 13, 28, 2, '#31bdd7');
    px(c, 11, 9, 28 * s.player.hp / s.player.maxHp, 2, '#f45b78'); px(c, 11, 13, 28 * s.xp / s.nextXp, 2, '#54dff0');
    c.fillStyle = COLORS.green; c.fillText(`LVL ${s.level}`, 4, 19);
    
    // Warning UI if there are many enemies
    if (s.enemies.length >= 6) {
      c.fillStyle = (Math.floor(s.time * 4) % 2 === 0) ? '#ff4f9a' : '#ffcf5a';
      c.textAlign = 'center';
      c.fillText('!!! WARNING: OVERWHELMING THREAT !!!', W / 2, 12);
      c.textAlign = 'left';
    }

    c.fillStyle = COLORS.green;
    c.fillText('STATUS: ONLINE', 225, 6); c.fillText('MODE: SURVIVAL', 225, 10); c.fillText(`WEAPON: ${s.player.weapon}`, 225, 14);
    c.fillStyle = '#ffcf5a'; c.fillText(`RPG AMMO: ${s.rpgAmmo}`, 225, 19);
  }

  overlay(c, s) {
    c.fillStyle = '#050916dd'; c.fillRect(75, 32, 150, 34); c.strokeStyle = COLORS.green; c.strokeRect(75, 32, 150, 34);
    c.textAlign = 'center'; c.fillStyle = COLORS.green; c.font = '7px monospace';
    c.fillText('GAME OVER // SYSTEM FAILURE', 150, 43);
    c.font = '4px monospace';
    c.fillText(`FINAL SCORE ${s.score}`, 150, 52); c.fillText('PRESS ENTER TO REBOOT SYSTEM', 150, 60);
    c.textAlign = 'left';
  }
}
