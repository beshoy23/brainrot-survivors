import { IWeaponBehavior, ProjectileFire } from '../IWeaponBehavior';
import { Vector2 } from '../../utils/Vector2';
import { Enemy } from '../../entities/Enemy';
import { Player } from '../../entities/Player';
import { Projectile } from '../../entities/Projectile';
import { PoolManager } from '../../managers/PoolManager';

export class BrAttackBehavior implements IWeaponBehavior {
  fire(
    position: Vector2, 
    enemies: Enemy[], 
    projectilePool: PoolManager<Projectile>,
    damage: number,
    range: number,
    player?: Player,
    weaponEffectSystem?: any
  ): ProjectileFire[] {
    // Check for multi-kick upgrade
    const upgradeManager = (window as any).upgradeManager;
    const additionalTargets = upgradeManager ? 
      upgradeManager.getUpgradeLevel('multiKick') : 0;
    const maxTargets = 1 + additionalTargets;
    
    // Find enemies to target
    const targets = this.getTargets(position, enemies, range, maxTargets);
    if (targets.length === 0) return [];
    
    // Trigger player attack animation
    if (player) {
      player.playAttackAnimation();
    }
    
    // Create projectiles for all targets
    const projectileFires = [];
    for (const target of targets) {
      const projectile = projectilePool.acquire();
      
      // Mark this as a BrAttack projectile for knockback effects
      projectile.weaponType = 'brattack';
      
      // Create invisible projectile (attack is just character animation)
      projectileFires.push({
        projectile,
        targetX: target.sprite.x,
        targetY: target.sprite.y,
        visuals: {
          color: 0x000000,
          shape: 'circle',
          size: 1,
          alpha: 0 // Invisible projectile
        }
      });
    }
    
    return projectileFires;
  }
  
  getTargets(
    position: Vector2, 
    enemies: Enemy[], 
    range: number, 
    maxTargets: number
  ): Enemy[] {
    // Filter active, non-dying enemies within range
    return enemies
      .filter(enemy => enemy.sprite.active && !enemy.isDying)
      .map(enemy => ({
        enemy,
        distance: position.distanceTo(new Vector2(enemy.sprite.x, enemy.sprite.y))
      }))
      .filter(({ distance }) => distance <= range)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxTargets)
      .map(({ enemy }) => enemy);
  }
  
  getDescription(): string {
    return 'Launches a powerful punch attack that damages and knocks back enemies';
  }
}