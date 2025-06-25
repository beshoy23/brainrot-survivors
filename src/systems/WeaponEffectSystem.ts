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
  
  createWhipSlash(player: Player, direction: number, length: number = 150): string {
    const id = `whip_slash_${Date.now()}`;
    const graphics = this.scene.add.graphics();
    graphics.setDepth(6); // Above most things
    
    const pos = player.getPosition();
    let lifeTime = 0;
    const maxLifeTime = 200; // 200ms fade out
    
    const effect: WeaponEffect = {
      id,
      graphics,
      update: (delta: number) => {
        lifeTime += delta;
        
        if (lifeTime >= maxLifeTime) {
          this.removeEffect(id);
          return;
        }
        
        graphics.clear();
        
        // Calculate fade based on lifetime
        const fadeProgress = lifeTime / maxLifeTime;
        const alpha = 1 - fadeProgress;
        
        // Draw arc slash
        const startAngle = direction > 0 ? -45 : 180 + 45; // Right: -45°, Left: 225°
        const endAngle = direction > 0 ? 45 : 180 - 45; // Right: 45°, Left: 135°
        
        // Multiple arc layers for thickness and glow
        const layers = 3;
        for (let i = 0; i < layers; i++) {
          const layerAlpha = alpha * (1 - i * 0.3);
          const thickness = 8 - i * 2;
          
          graphics.lineStyle(thickness, 0xFFFFFF, layerAlpha);
          graphics.beginPath();
          graphics.arc(
            pos.x,
            pos.y,
            length - i * 10,
            Phaser.Math.DegToRad(startAngle),
            Phaser.Math.DegToRad(endAngle),
            false
          );
          graphics.strokePath();
        }
        
        // Add motion blur effect - trailing lines
        const blurCount = 3;
        for (let i = 1; i <= blurCount; i++) {
          const blurAlpha = alpha * (0.3 / i);
          const blurOffset = direction * i * 8;
          
          graphics.lineStyle(2, 0xFFFFFF, blurAlpha);
          graphics.beginPath();
          graphics.arc(
            pos.x - blurOffset,
            pos.y,
            length,
            Phaser.Math.DegToRad(startAngle),
            Phaser.Math.DegToRad(endAngle),
            false
          );
          graphics.strokePath();
        }
        
        // Add impact particles at the arc end
        if (fadeProgress < 0.3) {
          const particleCount = 3;
          for (let i = 0; i < particleCount; i++) {
            const angle = Phaser.Math.DegToRad(direction > 0 ? 45 - i * 15 : 135 + i * 15);
            const particleX = pos.x + Math.cos(angle) * length;
            const particleY = pos.y + Math.sin(angle) * length;
            const particleSize = 3 * (1 - fadeProgress);
            
            graphics.fillStyle(0xFFFF88, alpha * 0.8);
            graphics.fillCircle(particleX, particleY, particleSize);
          }
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