import { IWeaponBehavior, ProjectileFire } from '../IWeaponBehavior';
import { Vector2 } from '../../utils/Vector2';
import { Enemy } from '../../entities/Enemy';
import { Player } from '../../entities/Player';
import { Projectile } from '../../entities/Projectile';
import { PoolManager } from '../../managers/PoolManager';

// VS-style Garlic - creates persistent aura around player
export class GarlicBehavior implements IWeaponBehavior {
  private auraActive: boolean = false;
  private lastDamageTime: number = 0;
  private damageInterval: number = 500; // Damage every 500ms
  
  constructor(
    private radius: number = 100,
    private projectileCount: number = 8 // Not used anymore but kept for compatibility
  ) {}
  
  fire(
    position: Vector2, 
    enemies: Enemy[], 
    projectilePool: PoolManager<Projectile>,
    damage: number,
    range: number,
    player?: Player,
    weaponEffectSystem?: any
  ): ProjectileFire[] {
    const currentTime = Date.now();
    
    // Create visual aura if not active
    if (!this.auraActive && weaponEffectSystem) {
      weaponEffectSystem.createGarlicAura(player, this.radius);
      this.auraActive = true;
    }
    
    // Check if it's time to deal damage
    if (currentTime - this.lastDamageTime < this.damageInterval) {
      return []; // No projectiles, just visual effect
    }
    
    this.lastDamageTime = currentTime;
    
    // Find all enemies within radius and damage them directly
    const enemiesInRange = enemies.filter(enemy => {
      if (!enemy.sprite.active) return false;
      const distance = Math.sqrt(
        Math.pow(enemy.x - position.x, 2) + 
        Math.pow(enemy.y - position.y, 2)
      );
      return distance <= this.radius;
    });
    
    // Create invisible damage projectiles for hit detection
    const projectiles: ProjectileFire[] = [];
    enemiesInRange.forEach(enemy => {
      const projectile = projectilePool.acquire();
      projectiles.push({
        projectile,
        startX: enemy.x,
        startY: enemy.y,
        targetX: enemy.x,
        targetY: enemy.y,
        speed: 0,
        visuals: {
          color: 0x9B30FF,
          shape: 'circle',
          size: 1,
          alpha: 0 // Invisible - just for damage
        }
      });
    });
    
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