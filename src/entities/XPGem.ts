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
  public isBeingCollected: boolean = false;
  public pushPhase: boolean = false; // VS-style: push when player gets close
  public hasBeenTriggered: boolean = false; // Track if pickup sequence started
  
  private floatOffset: number;
  private baseY: number = 0;
  private sparkleTimer: number = 0;
  private pushDuration: number = 200; // 200ms push phase
  private pushStartTime: number = 0;
  
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
    
    // VS-style gem with glow effect
    this.sprite.fillStyle(0x00ff00, 1);
    this.sprite.lineStyle(1, 0xffffff, 0.8);
    
    // Draw diamond shape
    this.sprite.beginPath();
    this.sprite.moveTo(0, -8);
    this.sprite.lineTo(6, 0);
    this.sprite.lineTo(0, 8);
    this.sprite.lineTo(-6, 0);
    this.sprite.closePath();
    this.sprite.fill();
    this.sprite.stroke();
    
    // Inner highlight with sparkle effect
    this.sprite.fillStyle(0x88ff88, 0.7);
    this.sprite.beginPath();
    this.sprite.moveTo(0, -4);
    this.sprite.lineTo(3, 0);
    this.sprite.lineTo(0, 4);
    this.sprite.lineTo(-3, 0);
    this.sprite.closePath();
    this.sprite.fill();
    
    // Central sparkle point
    this.sprite.fillStyle(0xffffff, 0.9);
    this.sprite.fillCircle(-2, -2, 1.5);
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
    this.isBeingCollected = false;
    this.sparkleTimer = 0;
    this.pushPhase = false;
    this.hasBeenTriggered = false;
    this.pushStartTime = 0;
  }

  update(deltaTime: number, playerX: number, playerY: number, magnetRange: number, playerSpeed: number = 200): void {
    if (!this.sprite.active) return;
    
    this.age += deltaTime;
    
    // Calculate distance to player
    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // VS-style: Check if player is close enough to trigger pickup sequence
    if (!this.hasBeenTriggered && distance < magnetRange && distance > 0) {
      // First time player gets close: start push-then-pull sequence
      this.hasBeenTriggered = true;
      this.pushPhase = true;
      this.pushStartTime = this.age;
      
      // Calculate push direction (away from player)
      const pushForce = 120;
      this.velocity.x = -(dx / distance) * pushForce; // Negative = away from player
      this.velocity.y = -(dy / distance) * pushForce;
      
      // VS-style pickup triggered
    }
    
    if (this.hasBeenTriggered) {
      const timeSincePush = this.age - this.pushStartTime;
      
      if (this.pushPhase && timeSincePush < this.pushDuration) {
        // Push phase: move away from player
        const pushDecay = Math.max(0.2, 1 - (timeSincePush / this.pushDuration));
        const moveX = this.velocity.x * deltaTime / 1000 * pushDecay;
        const moveY = this.velocity.y * deltaTime / 1000 * pushDecay;
        
        this.sprite.x += moveX;
        this.sprite.y += moveY;
        this.baseY = this.sprite.y; // Update base for floating
        
      } else if (this.pushPhase) {
        // End push phase, start magnetic attraction
        this.pushPhase = false;
        this.isMagnetic = true;
        this.velocity.set(0, 0);
        // Push phase ended, gem is now permanently magnetic
      }
      
      if (this.isMagnetic && !this.isBeingCollected) {
        // Recalculate distance after potential push movement
        const newDx = playerX - this.sprite.x;
        const newDy = playerY - this.sprite.y;
        const newDistance = Math.sqrt(newDx * newDx + newDy * newDy);
        
        if (newDistance > 0) {
          // VS-style: Once magnetic, ALWAYS follow player regardless of distance
          // Gem speed is always 20% faster than player's current speed
          const baseSpeed = playerSpeed * 1.2;
          // Optional: add slight speed boost when far away to catch up faster
          const distanceBoost = Math.min(1.5, newDistance / 200); // Up to 50% boost when far
          const speed = baseSpeed * Math.max(1.0, distanceBoost);
          
          // Create curved path by adding some perpendicular force
          const curveForce = Math.sin(this.age / 100) * 15;
          const perpX = -newDy / newDistance;
          const perpY = newDx / newDistance;
          
          this.velocity.x = (newDx / newDistance) * speed + perpX * curveForce;
          this.velocity.y = (newDy / newDistance) * speed + perpY * curveForce;
          
          // Apply velocity
          this.sprite.x += this.velocity.x * deltaTime / 1000;
          this.sprite.y += this.velocity.y * deltaTime / 1000;
          
          // Magnetic sparkle effect
          this.sparkleTimer += deltaTime;
          if (this.sparkleTimer > 100) {
            this.sprite.setScale(0.9 + Math.sin(this.age / 100) * 0.1);
            this.sparkleTimer = 0;
          }
        }
      }
    } else {
      // Not triggered yet: just float in place
      const floatY = Math.sin(this.age / 500 + this.floatOffset) * 3;
      const floatScale = 0.95 + Math.sin(this.age / 800 + this.floatOffset) * 0.05;
      this.sprite.y = this.baseY + floatY;
      this.sprite.setScale(floatScale);
    }
  }

  reset(): void {
    this.sprite.setVisible(false);
    this.sprite.setActive(false);
    this.sprite.setPosition(-100, -100);
    this.velocity.set(0, 0);
    this.isMagnetic = false;
    this.age = 0;
    this.isBeingCollected = false;
    this.sparkleTimer = 0;
    this.pushPhase = false;
    this.hasBeenTriggered = false;
    this.pushStartTime = 0;
    this.sprite.setScale(1);
  }

  collect(): void {
    this.isBeingCollected = true;
    // VS-style: gem zips to player instantly with scale effect
    this.sprite.setScale(1.2);
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
}