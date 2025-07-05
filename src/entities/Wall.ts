import { GameObjects, Scene } from 'phaser';
import { Vector2 } from '../utils/Vector2';

export class Wall {
  public sprite: GameObjects.Rectangle;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public bounds: { left: number; right: number; top: number; bottom: number };

  constructor(scene: Scene, x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    
    // Create visual representation - SUPER VISIBLE for debugging
    this.sprite = scene.add.rectangle(x, y, width, height, 0xff0000, 0.8); // RED and semi-transparent
    this.sprite.setStrokeStyle(5, 0x000000); // BLACK thick border
    this.sprite.setDepth(100); // Highest depth possible
    
    console.log('🧱 RED WALL created at:', x, y, 'size:', width, height);
    
    // Calculate bounds for collision detection
    this.bounds = {
      left: x - width / 2,
      right: x + width / 2,
      top: y - height / 2,
      bottom: y + height / 2
    };
  }
  
  // Check if a point is inside the wall
  containsPoint(x: number, y: number): boolean {
    return x >= this.bounds.left && 
           x <= this.bounds.right && 
           y >= this.bounds.top && 
           y <= this.bounds.bottom;
  }
  
  // Check if a circle (entity) overlaps with this wall
  overlapsCircle(centerX: number, centerY: number, radius: number): boolean {
    // Find the closest point on the rectangle to the circle center
    const closestX = Math.max(this.bounds.left, Math.min(centerX, this.bounds.right));
    const closestY = Math.max(this.bounds.top, Math.min(centerY, this.bounds.bottom));
    
    // Check if the distance to the closest point is less than the radius
    const dx = centerX - closestX;
    const dy = centerY - closestY;
    const distanceSquared = dx * dx + dy * dy;
    
    return distanceSquared <= (radius * radius);
  }
  
  // Get the collision normal for bouncing
  getCollisionNormal(fromX: number, fromY: number): Vector2 {
    const centerX = this.x;
    const centerY = this.y;
    
    // Determine which edge was hit based on the approach direction
    const dx = fromX - centerX;
    const dy = fromY - centerY;
    
    // Calculate relative position within the rectangle
    const relativeX = dx / (this.width / 2);
    const relativeY = dy / (this.height / 2);
    
    // Return normal based on the dominant axis
    if (Math.abs(relativeX) > Math.abs(relativeY)) {
      // Hit left or right edge
      return new Vector2(relativeX > 0 ? 1 : -1, 0);
    } else {
      // Hit top or bottom edge
      return new Vector2(0, relativeY > 0 ? 1 : -1);
    }
  }
  
  // Push an entity outside the wall bounds
  pushEntityOut(entityX: number, entityY: number, entityRadius: number): Vector2 {
    const closestX = Math.max(this.bounds.left, Math.min(entityX, this.bounds.right));
    const closestY = Math.max(this.bounds.top, Math.min(entityY, this.bounds.bottom));
    
    const dx = entityX - closestX;
    const dy = entityY - closestY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) {
      // Entity is inside the wall, push it out in the shortest direction
      const pushLeft = entityX - this.bounds.left;
      const pushRight = this.bounds.right - entityX;
      const pushUp = entityY - this.bounds.top;
      const pushDown = this.bounds.bottom - entityY;
      
      const minPush = Math.min(pushLeft, pushRight, pushUp, pushDown);
      
      if (minPush === pushLeft) return new Vector2(this.bounds.left - entityRadius, entityY);
      if (minPush === pushRight) return new Vector2(this.bounds.right + entityRadius, entityY);
      if (minPush === pushUp) return new Vector2(entityX, this.bounds.top - entityRadius);
      return new Vector2(entityX, this.bounds.bottom + entityRadius);
    }
    
    // Push entity away from the wall
    const pushDistance = entityRadius - distance;
    const pushX = entityX + (dx / distance) * pushDistance;
    const pushY = entityY + (dy / distance) * pushDistance;
    
    return new Vector2(pushX, pushY);
  }
  
  destroy(): void {
    this.sprite.destroy();
  }
}