import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { WallSystem } from './WallSystem';

export class MovementSystem {
  update(deltaTime: number, player: Player, enemies: Enemy[], timeScale: number = 1.0, wallSystem?: WallSystem): void {
    // Update player (player movement not affected by time dilation for responsive controls)
    player.update(deltaTime);
    
    // Check and resolve player wall collisions
    if (wallSystem) {
      const playerPos = player.getPosition();
      const playerRadius = 20; // Player collision radius
      const collision = wallSystem.checkCollision(playerPos.x, playerPos.y, playerRadius);
      if (collision) {
        const correctedPos = wallSystem.resolveCollision(playerPos.x, playerPos.y, playerRadius);
        player.setPosition(correctedPos.x, correctedPos.y);
      }
    }
    
    // Update all active enemies - VS style with no enemy collision
    const finalPlayerPos = player.getPosition(); // Get updated position after wall collision
    const activeEnemies = enemies.filter(e => e.sprite.active);
    
    // Apply time dilation to enemy movement
    const scaledDeltaTime = deltaTime * timeScale;
    
    // O(n) performance - each enemy only calculates toward player
    activeEnemies.forEach(enemy => {
      enemy.update(scaledDeltaTime, finalPlayerPos);
      
      // Handle wall interactions - different behavior for knocked-back vs normal enemies
      if (wallSystem) {
        const enemyRadius = enemy.hitboxRadius || 15;
        const collision = wallSystem.checkCollision(enemy.x, enemy.y, enemyRadius);
        
        if (collision) {
          if (enemy.isKnockedBack) {
            // Bouncing physics for flying enemies - creates awesome chain reactions!
            const bounceVector = wallSystem.getBounceVector(
              enemy.x, 
              enemy.y, 
              (enemy as any).knockbackVelocity.x, 
              (enemy as any).knockbackVelocity.y, 
              enemyRadius
            );
            
            if (bounceVector) {
              // Apply bounce with 70% velocity retention for realistic physics
              (enemy as any).knockbackVelocity.x = bounceVector.x * 0.7;
              (enemy as any).knockbackVelocity.y = bounceVector.y * 0.7;
              
              // Push enemy out of wall after bounce
              const correctedPos = wallSystem.resolveCollision(enemy.x, enemy.y, enemyRadius);
              enemy.setPosition(correctedPos.x, correctedPos.y);
            }
          } else {
            // Normal wall collision - push enemy out (creates funneling behavior)
            const correctedPos = wallSystem.resolveCollision(enemy.x, enemy.y, enemyRadius);
            enemy.setPosition(correctedPos.x, correctedPos.y);
          }
        }
      }
    });
  }
}