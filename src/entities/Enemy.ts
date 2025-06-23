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
  }

  spawn(x: number, y: number, enemyType: EnemyTypeConfig): void {
    this.enemyType = enemyType;
    this.health = enemyType.health;
    this.maxHealth = enemyType.health;
    this.damage = enemyType.damage;
    this.speed = enemyType.speed;
    this.hitboxRadius = enemyType.size / 2;
    
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

  update(deltaTime: number, playerPos: Vector2, allEnemies?: Enemy[]): void {
    if (!this.sprite.active) return;
    
    // Calculate direction to player
    const dx = playerPos.x - this.sprite.x;
    const dy = playerPos.y - this.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Stop at collision distance to prevent overlap with player
    const stopDistance = GameConfig.player.hitboxRadius + this.hitboxRadius - 2; // -2 to ensure collision
    
    // Calculate movement toward player
    let moveX = 0;
    let moveY = 0;
    
    if (distance > stopDistance) {
      // Normalize and apply speed toward player
      moveX = (dx / distance) * this.speed;
      moveY = (dy / distance) * this.speed;
    }
    
    // Apply enemy-to-enemy separation force
    if (allEnemies) {
      const separationForce = this.calculateSeparationForce(allEnemies);
      moveX += separationForce.x;
      moveY += separationForce.y;
    }
    
    // Prevent movement that would push enemy into player
    const newX = this.sprite.x + (moveX * deltaTime / 1000);
    const newY = this.sprite.y + (moveY * deltaTime / 1000);
    const newDx = playerPos.x - newX;
    const newDy = playerPos.y - newY;
    const newDistance = Math.sqrt(newDx * newDx + newDy * newDy);
    
    // Only move if it doesn't bring enemy too close to player
    if (newDistance >= stopDistance) {
      this.velocity.x = moveX;
      this.velocity.y = moveY;
      
      // Update position
      this.sprite.x = newX;
      this.sprite.y = newY;
    } else {
      // Stop completely if trying to get too close
      this.velocity.x = 0;
      this.velocity.y = 0;
    }
  }

  private calculateSeparationForce(allEnemies: Enemy[]): Vector2 {
    const separationForce = new Vector2();
    const separationRadius = this.hitboxRadius * 3; // Increased radius
    const separationStrength = this.speed * 1.2; // Stronger separation
    
    for (const other of allEnemies) {
      if (other === this || !other.sprite.active) continue;
      
      const dx = this.sprite.x - other.sprite.x;
      const dy = this.sprite.y - other.sprite.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < separationRadius && distance > 0) {
        // Calculate separation force (stronger when closer)
        const force = separationStrength * (1 - distance / separationRadius);
        const normalizedX = dx / distance;
        const normalizedY = dy / distance;
        
        separationForce.x += normalizedX * force;
        separationForce.y += normalizedY * force;
      }
    }
    
    return separationForce;
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
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
}