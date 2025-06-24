import { GameObjects, Scene } from 'phaser';
import { Vector2 } from '../utils/Vector2';

export interface ProjectileVisuals {
  color: number;
  shape: 'circle' | 'rectangle' | 'diamond';
  size: number;
  width?: number; // For rectangles
  height?: number; // For rectangles
  alpha?: number; // Transparency
  rotating?: boolean; // For spinning projectiles
}

export interface FollowTarget {
  x: number;
  y: number;
}

export interface LiveTarget {
  getPosition(): { x: number; y: number };
}

export class Projectile {
  public sprite: GameObjects.Graphics;
  public velocity: Vector2 = new Vector2();
  public damage: number = 10;
  public speed: number = 500;
  public lifespan: number = 2000;
  public age: number = 0;
  public id: string;
  private rotating: boolean = false;
  private rotationSpeed: number = 360; // degrees per second
  private followTarget?: FollowTarget;
  private liveTarget?: LiveTarget;
  private followOffset: Vector2 = new Vector2();
  
  constructor(private scene: Scene) {
    this.sprite = scene.add.graphics();
    this.sprite.setVisible(false);
    this.sprite.setActive(false);
    this.id = Math.random().toString(36);
  }

  fire(x: number, y: number, targetX: number, targetY: number, damage: number = 10, visuals?: ProjectileVisuals, speed?: number, followTarget?: FollowTarget, liveTarget?: LiveTarget): void {
    this.sprite.setPosition(x, y);
    this.sprite.setVisible(true);
    this.sprite.setActive(true);
    this.sprite.setDepth(5);
    
    // Apply visuals
    if (visuals) {
      this.applyVisuals(visuals);
    } else {
      // Default yellow circle
      this.sprite.clear();
      this.sprite.fillStyle(0xffff00);
      this.sprite.fillCircle(0, 0, 4);
    }
    
    // Use provided speed or default
    this.speed = speed !== undefined ? speed : 500;
    
    // Set up follow target if provided
    this.followTarget = followTarget;
    this.liveTarget = liveTarget;
    
    if (liveTarget) {
      // Calculate offset from live target's current position
      const currentPos = liveTarget.getPosition();
      this.followOffset.x = x - currentPos.x;
      this.followOffset.y = y - currentPos.y;
    } else if (followTarget) {
      // Calculate offset from static target
      this.followOffset.x = x - followTarget.x;
      this.followOffset.y = y - followTarget.y;
    }
    
    // Calculate direction
    const dx = targetX - x;
    const dy = targetY - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      this.velocity.x = (dx / distance) * this.speed;
      this.velocity.y = (dy / distance) * this.speed;
      this.lifespan = 2000; // Normal lifespan for moving projectiles
    } else {
      // Stationary projectile (for Garlic)
      this.velocity.x = 0;
      this.velocity.y = 0;
      // Shorter lifespan for stationary projectiles
      this.lifespan = 400; // 0.4 seconds
    }
    
    this.damage = damage;
    this.age = 0;
  }
  
  private applyVisuals(visuals: ProjectileVisuals): void {
    this.sprite.clear();
    this.sprite.fillStyle(visuals.color, visuals.alpha || 1);
    
    switch (visuals.shape) {
      case 'circle':
        this.sprite.fillCircle(0, 0, visuals.size);
        break;
        
      case 'rectangle':
        const width = visuals.width || visuals.size * 2;
        const height = visuals.height || visuals.size;
        this.sprite.fillRect(-width/2, -height/2, width, height);
        break;
        
      case 'diamond':
        this.sprite.beginPath();
        this.sprite.moveTo(0, -visuals.size);
        this.sprite.lineTo(visuals.size, 0);
        this.sprite.lineTo(0, visuals.size);
        this.sprite.lineTo(-visuals.size, 0);
        this.sprite.closePath();
        this.sprite.fill();
        break;
    }
    
    this.rotating = visuals.rotating || false;
  }

  update(deltaTime: number): boolean {
    if (!this.sprite.active) return false;
    
    // Update position
    if (this.liveTarget) {
      // Follow live target maintaining offset
      const currentPos = this.liveTarget.getPosition();
      this.sprite.x = currentPos.x + this.followOffset.x;
      this.sprite.y = currentPos.y + this.followOffset.y;
    } else if (this.followTarget) {
      // Follow static target maintaining offset
      this.sprite.x = this.followTarget.x + this.followOffset.x;
      this.sprite.y = this.followTarget.y + this.followOffset.y;
    } else {
      // Normal projectile movement
      this.sprite.x += this.velocity.x * deltaTime / 1000;
      this.sprite.y += this.velocity.y * deltaTime / 1000;
    }
    
    // Update rotation if needed
    if (this.rotating) {
      this.sprite.rotation += (this.rotationSpeed * Math.PI / 180) * deltaTime / 1000;
    }
    
    // Update age
    this.age += deltaTime;
    
    // Check if projectile should expire
    return this.age >= this.lifespan;
  }

  reset(): void {
    this.sprite.setVisible(false);
    this.sprite.setActive(false);
    this.sprite.setPosition(-100, -100);
    this.velocity.set(0, 0);
    this.age = 0;
    this.followTarget = undefined;
    this.liveTarget = undefined;
    this.followOffset.set(0, 0);
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
}