import { IWeaponBehavior, ProjectileFire } from '../IWeaponBehavior';
import { Vector2 } from '../../utils/Vector2';
import { Enemy } from '../../entities/Enemy';
import { Player } from '../../entities/Player';
import { Projectile } from '../../entities/Projectile';
import { PoolManager } from '../../managers/PoolManager';

export class UppercutBehavior implements IWeaponBehavior {
  fire(
    position: Vector2, 
    enemies: Enemy[], 
    projectilePool: PoolManager<Projectile>,
    damage: number,
    range: number,
    player?: Player,
    weaponEffectSystem?: any
  ): ProjectileFire[] {
    // Find closest enemy for uppercut target
    const target = this.getClosestTarget(position, enemies, range);
    if (!target) return [];
    
    // Trigger player attack animation
    if (player) {
      player.playAttackAnimation();
    }
    
    // Create uppercut projectile
    const projectile = projectilePool.acquire();
    projectile.weaponType = 'uppercut';
    
    // Create visual effect for uppercut (upward swoosh)
    const projectileFire: ProjectileFire = {
      projectile,
      targetX: target.sprite.x,
      targetY: target.sprite.y,
      visuals: {
        color: 0x00FFFF, // Cyan for uppercut
        shape: 'circle',
        size: 3,
        alpha: 0.8,
        trail: true
      }
    };
    
    return [projectileFire];
  }
  
  getClosestTarget(
    position: Vector2, 
    enemies: Enemy[], 
    range: number
  ): Enemy | null {
    let closestEnemy: Enemy | null = null;
    let closestDistance = Infinity;
    
    for (const enemy of enemies) {
      if (!enemy.sprite.active || enemy.isDying) continue;
      
      const distance = position.distanceTo(new Vector2(enemy.sprite.x, enemy.sprite.y));
      if (distance <= range && distance < closestDistance) {
        closestDistance = distance;
        closestEnemy = enemy;
      }
    }
    
    return closestEnemy;
  }
  
  getDescription(): string {
    return 'Uppercut attack that launches enemies high into the air with a parabolic trajectory';
  }
}