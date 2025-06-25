import { Scene, GameObjects } from 'phaser';
import { Player } from '../entities/Player';

interface WeaponEffect {
  id: string;
  graphics: GameObjects.Graphics;
  update: (delta: number, player: Player) => void;
  destroy: () => void;
}

export class WeaponEffectSystem {
  private scene: Scene;
  private effects: Map<string, WeaponEffect> = new Map();
  
  constructor(scene: Scene) {
    this.scene = scene;
  }
  
  createGarlicAura(player: Player, radius: number = 100): string {
    const id = 'garlic_aura';
    
    // Remove existing garlic aura if any
    if (this.effects.has(id)) {
      this.removeEffect(id);
    }
    
    const graphics = this.scene.add.graphics();
    graphics.setDepth(4); // Below player but above ground
    
    let pulseTime = 0;
    
    const effect: WeaponEffect = {
      id,
      graphics,
      update: (delta: number, player: Player) => {
        const pos = player.getPosition();
        graphics.clear();
        
        // Update pulse animation
        pulseTime += delta;
        const pulseFactor = 0.9 + Math.sin(pulseTime * 0.003) * 0.1; // 90% to 110% size
        const currentRadius = radius * pulseFactor;
        
        // Draw gradient-like effect with multiple circles
        const layers = 5;
        for (let i = layers; i > 0; i--) {
          const layerRadius = (currentRadius / layers) * i;
          const alpha = 0.15 * (1 - (i - 1) / layers); // Fade from center to edge
          
          graphics.fillStyle(0x9B30FF, alpha);
          graphics.fillCircle(pos.x, pos.y, layerRadius);
        }
        
        // Add outer glow ring
        graphics.lineStyle(2, 0xDA70D6, 0.4);
        graphics.strokeCircle(pos.x, pos.y, currentRadius);
        
        // Add inner bright core
        graphics.fillStyle(0xE6E6FA, 0.3);
        graphics.fillCircle(pos.x, pos.y, currentRadius * 0.2);
      },
      destroy: () => {
        graphics.destroy();
      }
    };
    
    this.effects.set(id, effect);
    return id;
  }
  
  createWhipSlash(player: Player, direction: number, length: number = 70): string {
    const id = `whip_slash_${Date.now()}`;
    const graphics = this.scene.add.graphics();
    graphics.setDepth(6); // Above most things
    
    // CAPTURE POSITION ONCE - fixed position, doesn't follow player
    const fixedPos = player.getPosition();
    let lifeTime = 0;
    const maxLifeTime = 150; // Quick 150ms flash
    
    // Draw the whip arc ONCE at creation
    const arcAngle = 35; // Small 35-degree arc
    const baseAngle = direction > 0 ? 0 : 180; // Right: 0°, Left: 180°
    const startAngle = baseAngle - arcAngle/2;
    const endAngle = baseAngle + arcAngle/2;
    
    // Create curved slash using connected line segments
    const segments = 4;
    const points = [];
    
    // Start from player position and curve outward
    for (let i = 0; i <= segments; i++) {
      const progress = i / segments;
      const angle = Phaser.Math.DegToRad(startAngle + (endAngle - startAngle) * progress);
      const distance = 20 + (length - 20) * progress; // Start close, extend outward
      
      const x = fixedPos.x + Math.cos(angle) * distance;
      const y = fixedPos.y + Math.sin(angle) * distance;
      points.push({x, y});
    }
    
    // Draw the arc shape ONCE at creation time
    graphics.lineStyle(6, 0xFFFFFF, 1);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.strokePath();
    
    const effect: WeaponEffect = {
      id,
      graphics,
      update: (delta: number) => {
        lifeTime += delta;
        
        if (lifeTime >= maxLifeTime) {
          this.removeEffect(id);
          return;
        }
        
        // ONLY UPDATE ALPHA - don't redraw anything
        const fadeProgress = lifeTime / maxLifeTime;
        const alpha = 1 - fadeProgress;
        graphics.alpha = alpha;
      },
      destroy: () => {
        graphics.destroy();
      }
    };
    
    this.effects.set(id, effect);
    return id;
  }
  
  update(delta: number, player: Player): void {
    this.effects.forEach(effect => {
      effect.update(delta, player);
    });
  }
  
  removeEffect(id: string): void {
    const effect = this.effects.get(id);
    if (effect) {
      effect.destroy();
      this.effects.delete(id);
    }
  }
  
  reset(): void {
    this.effects.forEach(effect => effect.destroy());
    this.effects.clear();
  }
}