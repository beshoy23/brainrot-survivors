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
  private effectCounter: number = 0;
  
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
    const id = `whip_slash_${++this.effectCounter}`;
    const graphics = this.scene.add.graphics();
    graphics.setDepth(6); // Above most things
    
    let lifeTime = 0;
    const maxLifeTime = 150; // Quick 150ms flash
    
    // Store whip parameters for redrawing
    const arcAngle = 60; // Wider 60-degree arc for more whip-like appearance
    const baseAngle = direction > 0 ? -10 : 170; // Slight downward angle
    const startAngle = baseAngle - arcAngle/2;
    const endAngle = baseAngle + arcAngle/2;
    const segments = 6; // More segments for smoother curve
    
    const effect: WeaponEffect = {
      id,
      graphics,
      update: (delta: number, player: Player) => {
        lifeTime += delta;
        
        if (lifeTime >= maxLifeTime) {
          this.removeEffect(id);
          return;
        }
        
        // Clear and redraw at player's current position
        graphics.clear();
        
        const currentPos = player.getPosition();
        const points = [];
        
        // Calculate whip arc from player's current position
        for (let i = 0; i <= segments; i++) {
          const progress = i / segments;
          const angle = (startAngle + (endAngle - startAngle) * progress) * Math.PI / 180;
          const distance = 20 + (length - 20) * progress;
          
          const x = currentPos.x + Math.cos(angle) * distance;
          const y = currentPos.y + Math.sin(angle) * distance;
          points.push({x, y});
        }
        
        // Simple fade effect - no complex layering to avoid timing issues
        const fadeProgress = lifeTime / maxLifeTime;
        const alpha = Math.max(0, 1 - fadeProgress);
        
        // Draw single whip slash with consistent timing
        graphics.lineStyle(6, 0xFFFFFF, alpha);
        graphics.beginPath();
        graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          graphics.lineTo(points[i].x, points[i].y);
        }
        graphics.strokePath();
        
        // Simple tip highlight
        if (points.length > 0 && alpha > 0.5) {
          const tipPoint = points[points.length - 1];
          graphics.fillStyle(0xFFD700);
          graphics.alpha = alpha;
          graphics.fillCircle(tipPoint.x, tipPoint.y, 4);
        }
      },
      destroy: () => {
        graphics.destroy();
      }
    };
    
    this.effects.set(id, effect);
    return id;
  }
  
  update(delta: number, player: Player): void {
    // Use Array.from to avoid iterator invalidation when effects are removed during update
    const effectsArray = Array.from(this.effects.values());
    effectsArray.forEach(effect => {
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