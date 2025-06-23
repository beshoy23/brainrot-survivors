import { IWeaponBehavior, ProjectileFire } from '../IWeaponBehavior';
import { Vector2 } from '../../utils/Vector2';
import { Enemy } from '../../entities/Enemy';
import { Projectile } from '../../entities/Projectile';
import { PoolManager } from '../../managers/PoolManager';

// VS-style Garlic - area damage around player
export class GarlicBehavior implements IWeaponBehavior {
  private lastDamageTime: Map<string, number> = new Map();
  private damageInterval: number = 500; // Damage every 500ms
  
  constructor(
    private radius: number = 100,
    private instantDamage: boolean = true
  ) {}
  
  fire(
    position: Vector2, 
    enemies: Enemy[], 
    projectilePool: PoolManager<Projectile>,
    damage: number,
    range: number
  ): ProjectileFire[] {
    // Garlic doesn't use projectiles, it damages directly
    if (!this.instantDamage) return [];
    
    const currentTime = Date.now();
    
    // Find all enemies within garlic radius
    for (const enemy of enemies) {
      if (!enemy.sprite.active) continue;
      
      const distance = Math.sqrt(
        Math.pow(enemy.x - position.x, 2) + 
        Math.pow(enemy.y - position.y, 2)
      );
      
      if (distance <= this.radius) {
        // Check damage cooldown per enemy
        const lastDamage = this.lastDamageTime.get(enemy.id) || 0;
        
        if (currentTime - lastDamage >= this.damageInterval) {
          // Apply damage directly
          const isDead = enemy.takeDamage(damage);
          this.lastDamageTime.set(enemy.id, currentTime);
          
          // Clean up old entries
          if (isDead || currentTime - lastDamage > this.damageInterval * 10) {
            this.lastDamageTime.delete(enemy.id);
          }
        }
      }
    }
    
    return [];
  }
  
  getDescription(): string {
    return `Damages all enemies within ${this.radius} range`;
  }
  
  setRadius(radius: number): void {
    this.radius = radius;
  }
}