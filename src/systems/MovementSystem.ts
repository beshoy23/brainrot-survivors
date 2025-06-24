import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

export class MovementSystem {
  update(deltaTime: number, player: Player, enemies: Enemy[]): void {
    // Update player
    player.update(deltaTime);
    
    // Update all active enemies - VS style with no enemy collision
    const playerPos = player.getPosition();
    const activeEnemies = enemies.filter(e => e.sprite.active);
    
    // O(n) performance - each enemy only calculates toward player
    activeEnemies.forEach(enemy => {
      enemy.update(deltaTime, playerPos);
    });
  }
}