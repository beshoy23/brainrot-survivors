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
  
  createKickFlash(player: Player, direction: number, range: number = 30): string {
    const id = `kick_flash_${++this.effectCounter}`;
    const graphics = this.scene.add.graphics();
    graphics.setDepth(6); // Above most things
    
    let lifeTime = 0;
    const maxLifeTime = 100; // Quick 100ms flash for snappy kicks
    
    const effect: WeaponEffect = {
      id,
      graphics,
      update: (delta: number, player: Player) => {
        lifeTime += delta;
        
        if (lifeTime >= maxLifeTime) {
          this.removeEffect(id);
          return;
        }
        
        graphics.clear();
        
        const currentPos = player.getPosition();
        const fadeProgress = lifeTime / maxLifeTime;
        const alpha = Math.max(0, 1 - fadeProgress);
        
        // Draw kick flash effect - simple arc in front of player
        const startAngle = direction - 45; // 90 degree arc
        const endAngle = direction + 45;
        
        graphics.fillStyle(0xFFFF00, alpha * 0.6);
        graphics.beginPath();
        graphics.arc(currentPos.x, currentPos.y, range, 
          startAngle * Math.PI / 180, endAngle * Math.PI / 180);
        graphics.lineTo(currentPos.x, currentPos.y);
        graphics.closePath();
        graphics.fillPath();
        
        // Add border
        graphics.lineStyle(2, 0xFFD700, alpha);
        graphics.strokePath();
      },
      destroy: () => {
        graphics.destroy();
      }
    };
    
    this.effects.set(id, effect);
    return id;
  }
  
  createSpinningKickEffect(player: Player, radius: number = 50): string {
    const id = `spinning_kick_${++this.effectCounter}`;
    const graphics = this.scene.add.graphics();
    graphics.setDepth(6); // Above most things
    
    let lifeTime = 0;
    const maxLifeTime = 200; // Longer for spinning effect
    
    const effect: WeaponEffect = {
      id,
      graphics,
      update: (delta: number, player: Player) => {
        lifeTime += delta;
        
        if (lifeTime >= maxLifeTime) {
          this.removeEffect(id);
          return;
        }
        
        graphics.clear();
        
        const currentPos = player.getPosition();
        const fadeProgress = lifeTime / maxLifeTime;
        const alpha = Math.max(0, 1 - fadeProgress);
        const spinProgress = (lifeTime / maxLifeTime) * 360;
        
        // Draw spinning kick effect - rotating arcs
        for (let i = 0; i < 3; i++) {
          const rotation = (spinProgress + i * 120) * Math.PI / 180;
          const startAngle = rotation - 0.5;
          const endAngle = rotation + 0.5;
          
          graphics.lineStyle(4, 0x00FF00, alpha);
          graphics.beginPath();
          graphics.arc(currentPos.x, currentPos.y, radius, startAngle, endAngle);
          graphics.strokePath();
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