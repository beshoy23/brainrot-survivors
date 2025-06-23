import { GameObjects, Scene } from 'phaser';
import { Vector2 } from '../utils/Vector2';

export class Projectile {
  public sprite: GameObjects.Graphics;
  public velocity: Vector2 = new Vector2();
  public damage: number = 10;
  public speed: number = 500;
  public lifespan: number = 2000;
  public age: number = 0;
  public id: string;
  
  constructor(scene: Scene) {
    this.sprite = scene.add.graphics();
    this.sprite.fillStyle(0xffff00); // Yellow projectile
    this.sprite.fillCircle(0, 0, 4);
    this.sprite.setVisible(false);
    this.sprite.setActive(false);
    this.id = Math.random().toString(36);
  }

  fire(x: number, y: number, targetX: number, targetY: number, damage: number = 10): void {
    this.sprite.setPosition(x, y);
    this.sprite.setVisible(true);
    this.sprite.setActive(true);
    this.sprite.setDepth(5);
    
    // Calculate direction
    const dx = targetX - x;
    const dy = targetY - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      this.velocity.x = (dx / distance) * this.speed;
      this.velocity.y = (dy / distance) * this.speed;
    }
    
    this.damage = damage;
    this.age = 0;
  }

  update(deltaTime: number): boolean {
    if (!this.sprite.active) return false;
    
    // Update position
    this.sprite.x += this.velocity.x * deltaTime / 1000;
    this.sprite.y += this.velocity.y * deltaTime / 1000;
    
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
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
}