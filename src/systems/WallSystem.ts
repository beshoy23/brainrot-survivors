import { Scene } from 'phaser';
import { Wall } from '../entities/Wall';
import { Vector2 } from '../utils/Vector2';

export class WallSystem {
  private walls: Wall[] = [];
  private scene: Scene;
  
  constructor(scene: Scene) {
    this.scene = scene;
  }
  
  // Add a wall to the system
  addWall(x: number, y: number, width: number, height: number): Wall {
    const wall = new Wall(this.scene, x, y, width, height);
    this.walls.push(wall);
    return wall;
  }
  
  // Remove a wall from the system
  removeWall(wall: Wall): void {
    const index = this.walls.indexOf(wall);
    if (index !== -1) {
      this.walls.splice(index, 1);
      wall.destroy();
    }
  }
  
  // Check if a position collides with any wall
  checkCollision(x: number, y: number, radius: number): Wall | null {
    for (const wall of this.walls) {
      if (wall.overlapsCircle(x, y, radius)) {
        return wall;
      }
    }
    return null;
  }
  
  // Get all walls that an entity collides with
  getCollidingWalls(x: number, y: number, radius: number): Wall[] {
    return this.walls.filter(wall => wall.overlapsCircle(x, y, radius));
  }
  
  // Resolve collision by pushing entity out of wall
  resolveCollision(x: number, y: number, radius: number): Vector2 {
    const collidingWalls = this.getCollidingWalls(x, y, radius);
    
    if (collidingWalls.length === 0) {
      return new Vector2(x, y);
    }
    
    // For simplicity, resolve against the first colliding wall
    // In a more complex system, you'd resolve against all walls
    const wall = collidingWalls[0];
    return wall.pushEntityOut(x, y, radius);
  }
  
  // Get bounce vector for a moving entity hitting a wall
  getBounceVector(currentX: number, currentY: number, velocityX: number, velocityY: number, radius: number): Vector2 | null {
    const collidingWalls = this.getCollidingWalls(currentX, currentY, radius);
    
    if (collidingWalls.length === 0) {
      return null;
    }
    
    // Get the normal from the first colliding wall
    const wall = collidingWalls[0];
    const normal = wall.getCollisionNormal(currentX, currentY);
    
    // Reflect velocity vector off the normal
    const velocity = new Vector2(velocityX, velocityY);
    const dotProduct = velocity.dot(normal);
    
    // Reflection formula: v' = v - 2(v·n)n
    const reflection = velocity.clone();
    reflection.subtract(normal.clone().multiply(2 * dotProduct));
    
    return reflection;
  }
  
  // Create some test wall layouts
  createTestWalls(): void {
    const centerX = 400;
    const centerY = 300;
    
    // Create a corner formation - forces enemies to line up
    this.addWall(centerX - 100, centerY - 100, 20, 200); // Left wall
    this.addWall(centerX - 100, centerY - 100, 200, 20); // Top wall
    
    // Create a corridor - creates funnel effect
    this.addWall(centerX + 50, centerY - 150, 20, 100); // Upper corridor wall
    this.addWall(centerX + 50, centerY + 150, 20, 100); // Lower corridor wall
    
    // Create scattered obstacles - forces interesting pathfinding
    this.addWall(centerX - 200, centerY + 100, 40, 40); // Bottom left obstacle
    this.addWall(centerX + 200, centerY - 50, 60, 30); // Right obstacle
  }
  
  // Create a simple maze layout
  createMaze(): void {
    const centerX = 400;
    const centerY = 300;
    
    // Outer walls
    this.addWall(centerX, centerY - 180, 400, 20); // Top
    this.addWall(centerX, centerY + 180, 400, 20); // Bottom
    this.addWall(centerX - 180, centerY, 20, 400); // Left
    this.addWall(centerX + 180, centerY, 20, 400); // Right
    
    // Inner maze walls
    this.addWall(centerX - 60, centerY - 60, 20, 100); // Top left vertical
    this.addWall(centerX + 60, centerY - 60, 20, 100); // Top right vertical
    this.addWall(centerX - 60, centerY + 60, 20, 100); // Bottom left vertical
    this.addWall(centerX + 60, centerY + 60, 20, 100); // Bottom right vertical
    
    this.addWall(centerX - 60, centerY, 100, 20); // Left horizontal
    this.addWall(centerX + 60, centerY, 100, 20); // Right horizontal
  }
  
  // Get all walls (for debugging or advanced collision checks)
  getAllWalls(): Wall[] {
    return [...this.walls];
  }
  
  // Clear all walls
  clearWalls(): void {
    this.walls.forEach(wall => wall.destroy());
    this.walls = [];
  }
  
  // Destroy the system
  destroy(): void {
    this.clearWalls();
  }
}