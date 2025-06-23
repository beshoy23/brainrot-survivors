import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { SpatialGrid } from '../utils/SpatialGrid';
import { GameConfig } from '../config/game';

export class CollisionSystem {
  private spatialGrid: SpatialGrid<Enemy>;
  private lastDamageTime: Map<string, number> = new Map();
  private damageInterval: number = 500; // Damage every 500ms

  constructor(worldWidth: number, worldHeight: number) {
    this.spatialGrid = new SpatialGrid(64, worldWidth, worldHeight);
  }

  update(currentTime: number, player: Player, enemies: Enemy[]): void {
    // Clear and rebuild spatial grid
    this.spatialGrid.clear();
    enemies.forEach(enemy => {
      if (enemy.sprite.active) {
        this.spatialGrid.insert(enemy);
      }
    });
    
    // Check collisions with player (use largest possible enemy radius)
    const maxEnemyRadius = 24; // Tank enemy has largest hitbox
    const nearbyEnemies = this.spatialGrid.getNearby(
      player.sprite.x,
      player.sprite.y,
      GameConfig.player.hitboxRadius + maxEnemyRadius
    );
    
    for (const enemy of nearbyEnemies) {
      if (this.checkCollision(player, enemy)) {
        // Apply damage with cooldown per enemy
        const lastDamage = this.lastDamageTime.get(enemy.id) || 0;
        if (currentTime - lastDamage >= this.damageInterval) {
          console.log('Collision detected! Applying', enemy.damage, 'damage');
          player.takeDamage(enemy.damage);
          this.lastDamageTime.set(enemy.id, currentTime);
        }
      }
    }
    
    // Clean up old damage times
    for (const [id, time] of this.lastDamageTime.entries()) {
      if (currentTime - time > this.damageInterval * 2) {
        this.lastDamageTime.delete(id);
      }
    }
  }

  private checkCollision(player: Player, enemy: Enemy): boolean {
    const dx = player.sprite.x - enemy.sprite.x;
    const dy = player.sprite.y - enemy.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < GameConfig.player.hitboxRadius + enemy.hitboxRadius;
  }
}