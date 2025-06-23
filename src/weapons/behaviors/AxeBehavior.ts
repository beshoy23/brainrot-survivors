import { IWeaponBehavior, ProjectileFire } from '../IWeaponBehavior';
import { Vector2 } from '../../utils/Vector2';
import { Enemy } from '../../entities/Enemy';
import { Projectile } from '../../entities/Projectile';
import { PoolManager } from '../../managers/PoolManager';

// VS-style Axe weapon - throws in arc, high damage
export class AxeBehavior implements IWeaponBehavior {
  constructor(
    private baseAngle: number = 0,
    private throwDistance: number = 200
  ) {}
  
  fire(
    position: Vector2, 
    enemies: Enemy[], 
    projectilePool: PoolManager<Projectile>,
    damage: number,
    range: number
  ): ProjectileFire[] {
    const projectiles: ProjectileFire[] = [];
    
    // Throw axe in rotating arc pattern
    this.baseAngle += Math.PI / 4; // Rotate 45 degrees each throw
    
    const projectile = projectilePool.acquire();
    
    // Calculate throw target
    const targetX = position.x + Math.cos(this.baseAngle) * this.throwDistance;
    const targetY = position.y + Math.sin(this.baseAngle) * this.throwDistance;
    
    projectiles.push({
      projectile,
      targetX,
      targetY,
      visuals: {
        color: 0x8B4513, // Brown
        shape: 'rectangle',
        size: 8,
        width: 16,
        height: 8,
        rotating: true
      }
    });
    
    return projectiles;
  }
  
  getTargets(
    position: Vector2, 
    enemies: Enemy[],
    range: number,
    maxTargets: number
  ): Enemy[] {
    // Axe doesn't target specific enemies, it throws in a pattern
    return [];
  }
  
  getDescription(): string {
    return 'Throws axes in a rotating pattern';
  }
}