import { Enemy } from '../entities/Enemy';
import { Vector2 } from '../utils/Vector2';

export class EnemyCollisionSystem {
  private cellSize: number = 60; // Spatial partitioning cell size
  private separationForce: number = 50; // How hard enemies push apart
  
  constructor() {
    console.log('🤝 EnemyCollisionSystem initialized');
  }
  
  // Main collision update - call this in MovementSystem
  updateCollisions(enemies: Enemy[], deltaTime: number): void {
    // Only process active, non-dying enemies
    const activeEnemies = enemies.filter(e => 
      e.sprite.active && !e.isDying && !e.isKnockedBack
    );
    
    // Skip if too few enemies to collide
    if (activeEnemies.length < 2) return;
    
    // Use spatial partitioning for performance
    const spatialGrid = this.createSpatialGrid(activeEnemies);
    
    // Check collisions within each cell and neighboring cells
    for (const [cellKey, cellEnemies] of spatialGrid) {
      if (cellEnemies.length < 2) continue;
      
      // Check collisions within this cell
      this.resolveCollisionsInCell(cellEnemies, deltaTime);
      
      // Check collisions with neighboring cells
      this.checkNeighboringCells(spatialGrid, cellKey, cellEnemies, deltaTime);
    }
  }
  
  private createSpatialGrid(enemies: Enemy[]): Map<string, Enemy[]> {
    const grid = new Map<string, Enemy[]>();
    
    enemies.forEach(enemy => {
      const cellX = Math.floor(enemy.x / this.cellSize);
      const cellY = Math.floor(enemy.y / this.cellSize);
      const cellKey = `${cellX},${cellY}`;
      
      if (!grid.has(cellKey)) {
        grid.set(cellKey, []);
      }
      grid.get(cellKey)!.push(enemy);
    });
    
    return grid;
  }
  
  private resolveCollisionsInCell(enemies: Enemy[], deltaTime: number): void {
    for (let i = 0; i < enemies.length; i++) {
      for (let j = i + 1; j < enemies.length; j++) {
        this.resolveCollision(enemies[i], enemies[j], deltaTime);
      }
    }
  }
  
  private checkNeighboringCells(
    grid: Map<string, Enemy[]>, 
    cellKey: string, 
    cellEnemies: Enemy[], 
    deltaTime: number
  ): void {
    const [cellX, cellY] = cellKey.split(',').map(Number);
    
    // Check 4 neighboring cells (right, down, diagonal down-right, diagonal down-left)
    const neighbors = [
      `${cellX + 1},${cellY}`,     // Right
      `${cellX},${cellY + 1}`,     // Down
      `${cellX + 1},${cellY + 1}`, // Diagonal down-right
      `${cellX - 1},${cellY + 1}`  // Diagonal down-left
    ];
    
    neighbors.forEach(neighborKey => {
      const neighborEnemies = grid.get(neighborKey);
      if (!neighborEnemies) return;
      
      // Check collisions between this cell and neighbor cell
      cellEnemies.forEach(enemy1 => {
        neighborEnemies.forEach(enemy2 => {
          this.resolveCollision(enemy1, enemy2, deltaTime);
        });
      });
    });
  }
  
  private resolveCollision(enemy1: Enemy, enemy2: Enemy, deltaTime: number): void {
    const dx = enemy2.x - enemy1.x;
    const dy = enemy2.y - enemy1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate minimum separation distance
    const minDistance = enemy1.hitboxRadius + enemy2.hitboxRadius + 5; // 5px buffer
    
    if (distance < minDistance && distance > 0) {
      // Calculate overlap amount
      const overlap = minDistance - distance;
      
      // Calculate separation direction (unit vector)
      const separationX = dx / distance;
      const separationY = dy / distance;
      
      // Calculate separation force (stronger for more overlap)
      const force = this.separationForce * (overlap / minDistance) * (deltaTime / 1000);
      
      // Apply separation force to both enemies (half each)
      const halfForceX = separationX * force * 0.5;
      const halfForceY = separationY * force * 0.5;
      
      // Move enemies apart
      enemy1.setPosition(enemy1.x - halfForceX, enemy1.y - halfForceY);
      enemy2.setPosition(enemy2.x + halfForceX, enemy2.y + halfForceY);
      
      // Optional: Add slight velocity damping for smoother separation
      this.dampVelocity(enemy1, 0.95);
      this.dampVelocity(enemy2, 0.95);
    }
  }
  
  private dampVelocity(enemy: Enemy, dampingFactor: number): void {
    // If the enemy has velocity properties, damp them slightly
    const enemyAny = enemy as any;
    if (enemyAny.velocity) {
      enemyAny.velocity.x *= dampingFactor;
      enemyAny.velocity.y *= dampingFactor;
    }
  }
  
  // Debug visualization (optional)
  drawDebugGrid(scene: Phaser.Scene, enemies: Enemy[]): void {
    const graphics = scene.add.graphics();
    graphics.lineStyle(1, 0x00ff00, 0.3);
    
    enemies.forEach(enemy => {
      const cellX = Math.floor(enemy.x / this.cellSize);
      const cellY = Math.floor(enemy.y / this.cellSize);
      
      const x = cellX * this.cellSize;
      const y = cellY * this.cellSize;
      
      graphics.strokeRect(x, y, this.cellSize, this.cellSize);
    });
    
    // Auto-destroy after 1 frame
    scene.time.delayedCall(16, () => graphics.destroy());
  }
}