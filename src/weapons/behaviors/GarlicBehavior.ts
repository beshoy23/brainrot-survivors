import { IWeaponBehavior, ProjectileFire } from '../IWeaponBehavior';
import { Vector2 } from '../../utils/Vector2';
import { Enemy } from '../../entities/Enemy';
import { Projectile } from '../../entities/Projectile';
import { PoolManager } from '../../managers/PoolManager';

// VS-style Garlic - creates stationary area projectiles around player
export class GarlicBehavior implements IWeaponBehavior {
  constructor(
    private radius: number = 100,
    private projectileCount: number = 8
  ) {}
  
  fire(
    position: Vector2, 
    enemies: Enemy[], 
    projectilePool: PoolManager<Projectile>,
    damage: number,
    range: number
  ): ProjectileFire[] {
    const projectiles: ProjectileFire[] = [];
    
    // Create circular pattern of stationary projectiles
    for (let i = 0; i < this.projectileCount; i++) {
      const angle = (Math.PI * 2 * i) / this.projectileCount;
      const projectile = projectilePool.acquire();
      
      // Position projectiles in a circle around player
      const offsetX = Math.cos(angle) * (this.radius * 0.7);
      const offsetY = Math.sin(angle) * (this.radius * 0.7);
      
      // Target is same as position (stationary)
      const targetX = position.x + offsetX;
      const targetY = position.y + offsetY;
      
      projectiles.push({
        projectile,
        targetX,
        targetY
      });
    }
    
    return projectiles;
  }
  
  getTargets(
    position: Vector2, 
    enemies: Enemy[],
    range: number,
    maxTargets: number
  ): Enemy[] {
    // Garlic hits all enemies within radius
    return enemies
      .filter(enemy => {
        if (!enemy.sprite.active) return false;
        const distance = Math.sqrt(
          Math.pow(enemy.x - position.x, 2) + 
          Math.pow(enemy.y - position.y, 2)
        );
        return distance <= this.radius;
      })
      .slice(0, maxTargets);
  }
  
  getDescription(): string {
    return `Creates damaging aura around player`;
  }
  
  setRadius(radius: number): void {
    this.radius = radius;
  }
}