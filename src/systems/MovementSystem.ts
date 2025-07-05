import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { WallSystem } from './WallSystem';
import { EnemyCollisionSystem } from './EnemyCollisionSystem';

export class MovementSystem {
  private enemyCollisionSystem: EnemyCollisionSystem;
  
  constructor() {
    this.enemyCollisionSystem = new EnemyCollisionSystem();
  }
  
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
      // Store previous position for continuous collision detection
      const prevX = enemy.x;
      const prevY = enemy.y;
      
      enemy.update(scaledDeltaTime, finalPlayerPos);
      
      // Handle wall interactions - different behavior for knocked-back vs normal enemies
      if (wallSystem) {
        const enemyRadius = enemy.hitboxRadius || 15;
        
        // Check collision at new position
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
            // Normal wall collision - revert to previous position and try alternative movement
            enemy.setPosition(prevX, prevY);
            
            // Try moving around the wall by adjusting direction
            this.moveAroundWall(enemy, finalPlayerPos, wallSystem, enemyRadius, scaledDeltaTime);
          }
        }
      }
    });
    
    // Apply enemy-to-enemy collision detection (realistic physics)
    this.enemyCollisionSystem.updateCollisions(activeEnemies, deltaTime);
  }
  
  private moveAroundWall(enemy: Enemy, playerPos: Vector2, wallSystem: WallSystem, radius: number, deltaTime: number): void {
    // Calculate direction to player
    const dx = playerPos.x - enemy.x;
    const dy = playerPos.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;
    
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Get enemy speed
    const speed = enemy.enemyType.speed;
    const moveDistance = speed * deltaTime / 1000;
    
    // Try alternative directions: perpendicular to the wall
    const alternatives = [
      { x: dirX * 0.7 + dirY * 0.7, y: dirY * 0.7 - dirX * 0.7 }, // 45° left
      { x: dirX * 0.7 - dirY * 0.7, y: dirY * 0.7 + dirX * 0.7 }, // 45° right
      { x: dirY, y: -dirX }, // 90° left
      { x: -dirY, y: dirX }, // 90° right
      { x: dirX * 0.5, y: dirY * 0.5 } // Half speed forward
    ];
    
    // Try each alternative direction
    for (const alt of alternatives) {
      const magnitude = Math.sqrt(alt.x * alt.x + alt.y * alt.y);
      if (magnitude === 0) continue;
      
      const normalizedX = alt.x / magnitude;
      const normalizedY = alt.y / magnitude;
      
      const testX = enemy.x + normalizedX * moveDistance;
      const testY = enemy.y + normalizedY * moveDistance;
      
      // Check if this direction is clear
      if (!wallSystem.checkCollision(testX, testY, radius)) {
        enemy.setPosition(testX, testY);
        return;
      }
    }
    
    // If no direction works, just stay put (better than tunneling)
  }
}