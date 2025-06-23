import { GameObjects, Scene } from 'phaser';
import { Vector2 } from '../utils/Vector2';

export class XPGem {
  public sprite: GameObjects.Graphics;
  public value: number = 1;
  public velocity: Vector2 = new Vector2();
  public isMagnetic: boolean = false;
  public magnetSpeed: number = 300;
  public id: string;
  public age: number = 0;
  
  private floatOffset: number;
  private baseY: number = 0;
  
  constructor(scene: Scene) {
    this.sprite = scene.add.graphics();
    this.sprite.setVisible(false);
    this.sprite.setActive(false);
    this.id = Math.random().toString(36);
    this.floatOffset = Math.random() * Math.PI * 2;
    
    this.drawGem();
  }
  
  private drawGem(): void {
    this.sprite.clear();
    this.sprite.fillStyle(0x00ff00, 1);
    
    // Draw diamond shape
    this.sprite.beginPath();
    this.sprite.moveTo(0, -8);
    this.sprite.lineTo(6, 0);
    this.sprite.lineTo(0, 8);
    this.sprite.lineTo(-6, 0);
    this.sprite.closePath();
    this.sprite.fill();
    
    // Inner highlight
    this.sprite.fillStyle(0x66ff66, 0.5);
    this.sprite.beginPath();
    this.sprite.moveTo(0, -4);
    this.sprite.lineTo(3, 0);
    this.sprite.lineTo(0, 4);
    this.sprite.lineTo(-3, 0);
    this.sprite.closePath();
    this.sprite.fill();
  }

  spawn(x: number, y: number, value: number = 1): void {
    this.sprite.setPosition(x, y);
    this.sprite.setVisible(true);
    this.sprite.setActive(true);
    this.sprite.setDepth(3);
    this.sprite.setScale(1);
    
    this.value = value;
    this.baseY = y;
    this.isMagnetic = false;
    this.velocity.set(0, 0);
    this.age = 0;
  }

  update(deltaTime: number, playerX: number, playerY: number, magnetRange: number): void {
    if (!this.sprite.active) return;
    
    this.age += deltaTime;
    
    // Calculate distance to player
    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Once magnetic, always magnetic until collected
    if (!this.isMagnetic && distance < magnetRange && distance > 0) {
      this.isMagnetic = true;
    }
    
    if (this.isMagnetic && distance > 0) {
      // Continuously update velocity toward player
      this.velocity.x = (dx / distance) * this.magnetSpeed;
      this.velocity.y = (dy / distance) * this.magnetSpeed;
      
      // Apply velocity
      this.sprite.x += this.velocity.x * deltaTime / 1000;
      this.sprite.y += this.velocity.y * deltaTime / 1000;
    } else if (!this.isMagnetic) {
      // Float animation when not magnetic
      const floatY = Math.sin(this.age / 500 + this.floatOffset) * 3;
      this.sprite.y = this.baseY + floatY;
    }
  }

  reset(): void {
    this.sprite.setVisible(false);
    this.sprite.setActive(false);
    this.sprite.setPosition(-100, -100);
    this.velocity.set(0, 0);
    this.isMagnetic = false;
    this.age = 0;
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
}