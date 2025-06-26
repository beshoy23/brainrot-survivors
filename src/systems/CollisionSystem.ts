import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { SpatialGrid } from '../utils/SpatialGrid';
import { GameConfig } from '../config/game';

export class CollisionSystem {
  private spatialGrid: SpatialGrid<Enemy>;
  private lastGlobalDamageTime: number = 0;
  private globalDamageInterval: number = 150; // VS-style: damage every 150ms while touching

  constructor(worldWidth: number, worldHeight: number) {
    this.spatialGrid = new SpatialGrid(64, worldWidth, worldHeight);
  }

  update(currentTime: number, player: Player, enemies: Enemy[]): void {
    // Clear and rebuild spatial grid
    this.spatialGrid.clear();
    let maxEnemyRadius = 0;
    
    enemies.forEach(enemy => {
      if (enemy.sprite.active && !enemy.isDying) {
        this.spatialGrid.insert(enemy);
        // Track the largest enemy radius we've seen
        maxEnemyRadius = Math.max(maxEnemyRadius, enemy.hitboxRadius);
      }
    });
    
    // Check collisions with player (use actual largest enemy radius)
    // Add buffer for safety (in case of new enemy types)
    const searchRadius = GameConfig.player.hitboxRadius + maxEnemyRadius + 10;
    const nearbyEnemies = this.spatialGrid.getNearby(
      player.sprite.x,
      player.sprite.y,
      searchRadius
    );
    
    // VS-style damage: collect ALL colliding enemies, then apply damage globally
    const collidingEnemies: Enemy[] = [];
    for (const enemy of nearbyEnemies) {
      if (!enemy.isDying && this.checkCollision(player, enemy)) {
        collidingEnemies.push(enemy);
      }
    }
    
    // Apply damage from ALL touching enemies on global tick
    if (collidingEnemies.length > 0 && currentTime - this.lastGlobalDamageTime >= this.globalDamageInterval) {
      let totalDamage = 0;
      for (const enemy of collidingEnemies) {
        totalDamage += enemy.damage;
      }
      // VS-style damage applied
      player.takeDamage(totalDamage);
      this.lastGlobalDamageTime = currentTime;
    }
  }

  private checkCollision(player: Player, enemy: Enemy): boolean {
    const dx = player.sprite.x - enemy.sprite.x;
    const dy = player.sprite.y - enemy.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < GameConfig.player.hitboxRadius + enemy.hitboxRadius;
  }
}