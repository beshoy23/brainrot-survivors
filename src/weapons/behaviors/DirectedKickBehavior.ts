import { IWeaponBehavior, ProjectileFire } from '../IWeaponBehavior';
import { Vector2 } from '../../utils/Vector2';
import { Enemy } from '../../entities/Enemy';
import { Player } from '../../entities/Player';
import { Projectile } from '../../entities/Projectile';
import { PoolManager } from '../../managers/PoolManager';

export class DirectedKickBehavior implements IWeaponBehavior {
  private targetDirection: Vector2 = new Vector2();
  private isDirectional: boolean = false;
  
  // Set the direction for the next kick
  setDirection(direction: Vector2): void {
    this.targetDirection.set(direction.x, direction.y);
    this.isDirectional = true;
  }
  
  // Clear directional mode (return to auto-targeting)
  clearDirection(): void {
    this.isDirectional = false;
  }
  
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
    
    let targets: Enemy[] = [];
    
    if (this.isDirectional) {
      // Directional kick mode - find enemies in the target direction
      targets = this.getTargetsInDirection(position, enemies, range, maxTargets, this.targetDirection);
      // Clear direction after use
      this.clearDirection();
    } else {
      // Fallback to normal targeting if no direction set
      targets = this.getTargets(position, enemies, range, maxTargets);
    }
    
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
  
  private getTargetsInDirection(
    position: Vector2, 
    enemies: Enemy[], 
    range: number, 
    maxTargets: number,
    direction: Vector2
  ): Enemy[] {
    // Normalize direction vector
    const normalizedDirection = new Vector2(direction.x, direction.y);
    const magnitude = normalizedDirection.magnitude();
    
    if (magnitude === 0) {
      // No direction specified, fall back to normal targeting
      return this.getTargets(position, enemies, range, maxTargets);
    }
    
    normalizedDirection.divide(magnitude);
    
    // Filter enemies in the direction cone
    const candidates = enemies
      .filter(enemy => enemy.sprite.active && !enemy.isDying)
      .map(enemy => {
        const enemyPos = new Vector2(enemy.sprite.x, enemy.sprite.y);
        const distance = position.distanceTo(enemyPos);
        
        // Calculate direction to enemy
        const toEnemy = enemyPos.subtract(position);
        if (toEnemy.magnitude() === 0) return null;
        
        toEnemy.normalize();
        
        // Calculate dot product (cosine of angle between vectors)
        const dot = normalizedDirection.dot(toEnemy);
        
        return {
          enemy,
          distance,
          alignment: dot // How well aligned the enemy is with target direction
        };
      })
      .filter(candidate => 
        candidate !== null && 
        candidate.distance <= range && 
        candidate.alignment > 0.5 // Within ~60 degree cone
      ) as Array<{enemy: Enemy, distance: number, alignment: number}>;
    
    // Sort by alignment (prefer enemies more aligned with direction), then by distance
    candidates.sort((a, b) => {
      const alignmentDiff = b.alignment - a.alignment;
      if (Math.abs(alignmentDiff) > 0.1) {
        return alignmentDiff; // Significant alignment difference
      }
      return a.distance - b.distance; // Similar alignment, prefer closer
    });
    
    return candidates
      .slice(0, maxTargets)
      .map(candidate => candidate.enemy);
  }
  
  private getTargets(
    position: Vector2, 
    enemies: Enemy[], 
    range: number, 
    maxTargets: number
  ): Enemy[] {
    // Standard closest-enemy targeting (fallback behavior)
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
    return 'Directional kick that can target enemies in a specific direction or auto-target closest enemies';
  }
}