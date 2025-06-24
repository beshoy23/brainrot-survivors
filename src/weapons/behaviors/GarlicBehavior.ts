import { IWeaponBehavior, ProjectileFire } from '../IWeaponBehavior';
import { Vector2 } from '../../utils/Vector2';
import { Enemy } from '../../entities/Enemy';
import { Player } from '../../entities/Player';
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
    range: number,
    player?: Player
  ): ProjectileFire[] {
    const projectiles: ProjectileFire[] = [];
    
    // Create circular pattern of projectiles that follow player
    for (let i = 0; i < this.projectileCount; i++) {
      const angle = (Math.PI * 2 * i) / this.projectileCount;
      const projectile = projectilePool.acquire();
      
      // Position projectiles in a circle around player
      const offsetX = Math.cos(angle) * (this.radius * 0.7);
      const offsetY = Math.sin(angle) * (this.radius * 0.7);
      
      // Projectiles spawn AT circle position and follow player
      const spawnX = position.x + offsetX;
      const spawnY = position.y + offsetY;
      
      projectiles.push({
        projectile,
        startX: spawnX,
        startY: spawnY,
        targetX: spawnX, // Same as start (stationary)
        targetY: spawnY,
        speed: 0, // No movement
        liveTarget: player, // Follow the player object directly
        visuals: {
          color: 0x9B30FF, // Purple
          shape: 'circle',
          size: 12,
          alpha: 0.6 // Transparent for aura effect
        }
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