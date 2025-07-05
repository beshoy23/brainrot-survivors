import { GameObjects, Scene } from 'phaser';
import { Vector2 } from '../utils/Vector2';

export class Ball {
  public sprite: GameObjects.Graphics;
  public velocity: Vector2 = new Vector2();
  public radius: number = 8;
  public active: boolean = false;
  public lifetime: number = 8000; // 8 seconds max (longer momentum)
  public timeAlive: number = 0;
  public bounceCount: number = 0;
  public maxBounces: number = 8; // More bounces for more momentum
  public damage: number = 35; // Higher damage for more impact
  public knockbackForce: number = 600; // Stronger knockback force
  
  // Physics properties - MORE MOMENTUM!
  public friction: number = 0.995; // Much less friction (more momentum)
  public bounceDamping: number = 0.9; // Less energy loss on bounce (90% retained)
  public minVelocity: number = 30; // Lower minimum velocity (keeps moving longer)
  
  private scene: Scene;
  private trail: Array<{x: number, y: number, alpha: number}> = [];
  private lastTrailTime: number = 0;
  
  constructor(scene: Scene) {
    this.scene = scene;
    
    // Create ball as a graphics object (bright orange circle)
    this.sprite = scene.add.graphics();
    this.sprite.setDepth(60); // Above most game objects
    this.drawBall();
    this.sprite.setVisible(false);
  }
  
  private drawBall(): void {
    this.sprite.clear();
    
    // Draw main ball (bright orange)
    this.sprite.fillStyle(0xff6600, 1);
    this.sprite.fillCircle(0, 0, this.radius);
    
    // Draw highlight (lighter orange)
    this.sprite.fillStyle(0xff8800, 0.8);
    this.sprite.fillCircle(-2, -2, this.radius * 0.4);
    
    // Draw border (darker orange)
    this.sprite.lineStyle(2, 0xcc4400);
    this.sprite.strokeCircle(0, 0, this.radius);
  }
  
  // Fire the ball from a position in a direction
  fire(startX: number, startY: number, direction: Vector2, speed: number = 300): void {
    this.active = true;
    this.timeAlive = 0;
    this.bounceCount = 0;
    
    // Set position
    this.sprite.x = startX;
    this.sprite.y = startY;
    this.sprite.setVisible(true);
    
    // Set velocity
    const magnitude = direction.magnitude();
    if (magnitude > 0) {
      this.velocity.x = (direction.x / magnitude) * speed;
      this.velocity.y = (direction.y / magnitude) * speed;
    }
    
    // Clear trail
    this.trail = [];
    
    console.log('🏀 Ball fired from:', startX, startY, 'velocity:', this.velocity.x, this.velocity.y);
  }
  
  // Update ball physics
  update(deltaTime: number): boolean {
    if (!this.active) return false;
    
    this.timeAlive += deltaTime;
    
    // Check lifetime
    if (this.timeAlive >= this.lifetime) {
      this.deactivate();
      return true;
    }
    
    // Check max bounces
    if (this.bounceCount >= this.maxBounces) {
      this.deactivate();
      return true;
    }
    
    // Apply physics
    const dt = deltaTime / 1000;
    
    // Update position
    this.sprite.x += this.velocity.x * dt;
    this.sprite.y += this.velocity.y * dt;
    
    // Apply friction
    this.velocity.x *= this.friction;
    this.velocity.y *= this.friction;
    
    // Check minimum velocity
    const currentSpeed = this.velocity.magnitude();
    if (currentSpeed < this.minVelocity) {
      this.deactivate();
      return true;
    }
    
    // Update trail
    this.updateTrail();
    
    return false; // Not expired
  }
  
  private updateTrail(): void {
    // Add trail point every 30ms (more frequent for faster balls)
    if (Date.now() - this.lastTrailTime > 30) {
      this.trail.push({
        x: this.sprite.x,
        y: this.sprite.y,
        alpha: 1.0
      });
      this.lastTrailTime = Date.now();
      
      // Longer trail for more momentum feel
      if (this.trail.length > 12) {
        this.trail.shift();
      }
    }
    
    // Fade trail points slower for longer trail
    this.trail.forEach(point => {
      point.alpha *= 0.94;
    });
    
    // Remove very faded points
    this.trail = this.trail.filter(point => point.alpha > 0.05);
    
    // Draw trail
    this.drawTrail();
  }
  
  private drawTrail(): void {
    // Trail is drawn as part of the main graphics object
    // Clear and redraw the ball with trail
    this.sprite.clear();
    
    // Draw trail first (behind ball)
    this.trail.forEach((point, index) => {
      const size = (this.radius * 0.5) * (index / this.trail.length);
      const alpha = point.alpha * 0.6;
      
      this.sprite.fillStyle(0xff6600, alpha);
      this.sprite.fillCircle(
        point.x - this.sprite.x, 
        point.y - this.sprite.y, 
        size
      );
    });
    
    // Draw main ball on top
    this.drawBall();
  }
  
  // Handle wall bounce
  bounceOffWall(normal: Vector2): void {
    if (!this.active) return;
    
    // Reflect velocity off the normal
    const dotProduct = this.velocity.dot(normal);
    this.velocity.x -= 2 * dotProduct * normal.x;
    this.velocity.y -= 2 * dotProduct * normal.y;
    
    // Apply damping
    this.velocity.x *= this.bounceDamping;
    this.velocity.y *= this.bounceDamping;
    
    this.bounceCount++;
    
    // Visual effect for bounce
    this.createBounceEffect();
    
    console.log('🏀 Ball bounced! Count:', this.bounceCount, 'New velocity:', this.velocity.x, this.velocity.y);
  }
  
  private createBounceEffect(): void {
    // Create a bigger explosion effect for more momentum feel
    const effect = this.scene.add.graphics();
    effect.setPosition(this.sprite.x, this.sprite.y);
    effect.setDepth(70);
    
    // Draw bigger bounce effect with sparks
    effect.fillStyle(0xffff00, 0.9);
    effect.fillCircle(0, 0, this.radius * 3); // Bigger effect
    
    // Add sparks around the bounce
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const sparkX = Math.cos(angle) * this.radius * 2;
      const sparkY = Math.sin(angle) * this.radius * 2;
      effect.fillStyle(0xffffff, 0.7);
      effect.fillCircle(sparkX, sparkY, 2);
    }
    
    // Animate and destroy with more dramatic effect
    this.scene.tweens.add({
      targets: effect,
      alpha: 0,
      scaleX: 3,
      scaleY: 3,
      duration: 300,
      ease: 'Power2',
      onComplete: () => effect.destroy()
    });
  }
  
  // Hit an enemy
  hitEnemy(): void {
    if (!this.active) return;
    
    // Create hit effect
    const effect = this.scene.add.graphics();
    effect.setPosition(this.sprite.x, this.sprite.y);
    effect.setDepth(70);
    
    // Draw hit effect (bigger than bounce)
    effect.fillStyle(0xff0000, 0.9);
    effect.fillCircle(0, 0, this.radius * 3);
    
    // Animate and destroy
    this.scene.tweens.add({
      targets: effect,
      alpha: 0,
      scaleX: 3,
      scaleY: 3,
      duration: 300,
      ease: 'Power2',
      onComplete: () => effect.destroy()
    });
    
    // Ball continues after hitting enemy (doesn't stop)
    console.log('🏀 Ball hit enemy!');
  }
  
  // Get current position
  getPosition(): Vector2 {
    return new Vector2(this.sprite.x, this.sprite.y);
  }
  
  // Deactivate the ball
  deactivate(): void {
    this.active = false;
    this.sprite.setVisible(false);
    this.velocity.set(0, 0);
    this.trail = [];
    console.log('🏀 Ball deactivated');
  }
  
  // Reset for object pooling
  reset(): void {
    this.deactivate();
    this.timeAlive = 0;
    this.bounceCount = 0;
  }
  
  // Cleanup
  destroy(): void {
    this.sprite.destroy();
  }
}