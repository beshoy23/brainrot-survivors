import { GameObjects, Scene } from 'phaser';
import { GameConfig } from '../config/game';
import { Vector2 } from '../utils/Vector2';
import { EnemyTypeConfig } from '../enemies/EnemyType';
import { ENEMY_TYPES } from '../config/enemyTypes';

export class Enemy {
  public sprite: GameObjects.Graphics;
  public velocity: Vector2 = new Vector2();
  public health: number;
  public maxHealth: number;
  public damage: number;
  public speed: number;
  public id: string;
  public enemyType: EnemyTypeConfig;
  public hitboxRadius: number;
  public movementType: 'homing' | 'straight'; // VS-style: swarm moves straight, others home
  public movementAngle: number; // For straight-line movement
  public spawnTime: number; // Track when spawned for despawning
  
  private scene: Scene;
  
  constructor(scene: Scene) {
    this.scene = scene;
    this.sprite = scene.add.graphics();
    this.sprite.setVisible(false);
    this.sprite.setActive(false);
    
    // Default to basic enemy
    this.enemyType = ENEMY_TYPES.basic;
    this.health = this.enemyType.health;
    this.maxHealth = this.enemyType.health;
    this.damage = this.enemyType.damage;
    this.speed = this.enemyType.speed;
    this.hitboxRadius = this.enemyType.size / 2;
    this.id = Math.random().toString(36);
    this.movementType = 'homing'; // Default behavior
    this.movementAngle = 0;
    this.spawnTime = 0;
  }

  spawn(x: number, y: number, enemyType: EnemyTypeConfig, movementAngle?: number): void {
    this.enemyType = enemyType;
    this.health = enemyType.health;
    this.maxHealth = enemyType.health;
    this.damage = enemyType.damage;
    this.speed = enemyType.speed;
    this.hitboxRadius = enemyType.size / 2;
    this.spawnTime = Date.now();
    
    // VS-style: swarm enemies move in straight lines, others home to player
    if (enemyType.id === 'swarm') {
      this.movementType = 'straight';
      // Use provided angle for coordinated swarm movement, or random if not provided
      this.movementAngle = movementAngle !== undefined ? movementAngle : Math.random() * Math.PI * 2;
    } else {
      this.movementType = 'homing';
    }
    
    this.sprite.setPosition(x, y);
    this.sprite.setVisible(true);
    this.sprite.setActive(true);
    this.sprite.setDepth(8); // Below player (10) but visible
    
    // Draw enemy based on type
    this.drawEnemy();
  }
  
  drawEnemy(): void {
    this.sprite.clear();
    this.sprite.fillStyle(this.enemyType.color, 1);
    this.sprite.lineStyle(2, 0xffffff, 0.3); // White outline
    
    const size = this.enemyType.size;
    const halfSize = size / 2;
    
    switch (this.enemyType.shape) {
      case 'square':
        this.sprite.fillRect(-halfSize, -halfSize, size, size);
        this.sprite.strokeRect(-halfSize, -halfSize, size, size);
        break;
        
      case 'circle':
        this.sprite.fillCircle(0, 0, halfSize);
        this.sprite.strokeCircle(0, 0, halfSize);
        break;
        
      case 'diamond':
        this.sprite.beginPath();
        this.sprite.moveTo(0, -halfSize);
        this.sprite.lineTo(halfSize, 0);
        this.sprite.lineTo(0, halfSize);
        this.sprite.lineTo(-halfSize, 0);
        this.sprite.closePath();
        this.sprite.fill();
        this.sprite.stroke();
        break;
        
      case 'triangle':
        this.sprite.beginPath();
        this.sprite.moveTo(0, -halfSize);
        this.sprite.lineTo(halfSize, halfSize);
        this.sprite.lineTo(-halfSize, halfSize);
        this.sprite.closePath();
        this.sprite.fill();
        this.sprite.stroke();
        break;
    }
  }

  update(deltaTime: number, playerPos: Vector2): void {
    if (!this.sprite.active) return;
    
    // VS-style: Swarm enemies despawn after 10 seconds if they haven't died
    if (this.movementType === 'straight' && Date.now() - this.spawnTime > 10000) {
      this.reset();
      return;
    }
    
    let moveX = 0;
    let moveY = 0;
    
    if (this.movementType === 'straight') {
      // VS-style straight-line movement for swarm enemies
      moveX = Math.cos(this.movementAngle) * this.speed * deltaTime / 1000;
      moveY = Math.sin(this.movementAngle) * this.speed * deltaTime / 1000;
      
      this.velocity.x = moveX * 1000 / deltaTime;
      this.velocity.y = moveY * 1000 / deltaTime;
      
      // Move in straight line regardless of player position
      this.sprite.x += moveX;
      this.sprite.y += moveY;
    } else {
      // Homing behavior for other enemy types
      const dx = playerPos.x - this.sprite.x;
      const dy = playerPos.y - this.sprite.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Stop at collision distance to prevent overlap with player
      const stopDistance = GameConfig.player.hitboxRadius + this.hitboxRadius - 2;
      
      if (distance > stopDistance) {
        // Normalize and apply speed toward player
        moveX = (dx / distance) * this.speed * deltaTime / 1000;
        moveY = (dy / distance) * this.speed * deltaTime / 1000;
        
        this.velocity.x = moveX * 1000 / deltaTime;
        this.velocity.y = moveY * 1000 / deltaTime;
        
        // Update position directly - enemies can overlap each other like VS
        this.sprite.x += moveX;
        this.sprite.y += moveY;
      } else {
        // Stop at player collision boundary
        this.velocity.x = 0;
        this.velocity.y = 0;
      }
    }
  }


  takeDamage(amount: number): boolean {
    this.health -= amount;
    return this.health <= 0;
  }

  reset(): void {
    this.sprite.setVisible(false);
    this.sprite.setActive(false);
    this.sprite.setPosition(-100, -100);
    this.velocity.set(0, 0);
    this.movementType = 'homing';
    this.movementAngle = 0;
    this.spawnTime = 0;
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
}