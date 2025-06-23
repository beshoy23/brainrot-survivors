import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

export class MovementSystem {
  update(deltaTime: number, player: Player, enemies: Enemy[]): void {
    // Update player
    player.update(deltaTime);
    
    // Update all active enemies
    const playerPos = player.getPosition();
    const activeEnemies = enemies.filter(e => e.sprite.active);
    
    activeEnemies.forEach(enemy => {
      enemy.update(deltaTime, playerPos, activeEnemies);
    });
  }
}