import { GameObjects, Scene } from 'phaser';
import { GameConfig } from '../config/game';
import { Vector2 } from '../utils/Vector2';

export class Player {
  public sprite: GameObjects.Sprite;
  public velocity: Vector2 = new Vector2();
  public health: number;
  public maxHealth: number;
  public invulnerable: boolean = false;
  
  // XP and leveling
  public experience: number = 0;
  public level: number = 1;
  public experienceToNext: number;
  
  private keys: any;
  private lastDamageTime: number = 0;
  private invulnerabilityDuration: number = 1000; // 1 second

  constructor(scene: Scene, x: number, y: number) {
    this.sprite = scene.add.sprite(x, y, 'player');
    this.sprite.setDepth(10);
    
    this.health = GameConfig.player.maxHealth;
    this.maxHealth = GameConfig.player.maxHealth;
    
    // Initialize XP
    this.experienceToNext = this.calculateXPRequired(this.level);
    
    // Set up input
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D');
  }

  update(deltaTime: number): void {
    // Handle input
    this.handleMovement();
    
    // Update position
    this.sprite.x += this.velocity.x * deltaTime / 1000;
    this.sprite.y += this.velocity.y * deltaTime / 1000;
    
    // Update invulnerability
    if (this.invulnerable && Date.now() - this.lastDamageTime > this.invulnerabilityDuration) {
      this.invulnerable = false;
      this.sprite.clearTint();
    }
  }

  private handleMovement(): void {
    // Apply speed upgrade multiplier
    const upgradeManager = (window as any).upgradeManager;
    const speedMultiplier = upgradeManager ? 
      (1 + (upgradeManager.getUpgradeLevel('moveSpeed') * 0.1)) : 1;
    
    const speed = GameConfig.player.speed * speedMultiplier;
    this.velocity.set(0, 0);
    
    if (this.keys.A.isDown) this.velocity.x = -speed;
    if (this.keys.D.isDown) this.velocity.x = speed;
    if (this.keys.W.isDown) this.velocity.y = -speed;
    if (this.keys.S.isDown) this.velocity.y = speed;
    
    // Normalize diagonal movement
    if (this.velocity.x !== 0 && this.velocity.y !== 0) {
      this.velocity.multiply(0.707); // 1/sqrt(2)
    }
  }

  takeDamage(amount: number): void {
    if (this.invulnerable) return;
    
    // Apply armor upgrade
    const upgradeManager = (window as any).upgradeManager;
    const damageReduction = upgradeManager ? 
      (1 - (upgradeManager.getUpgradeLevel('armor') * 0.1)) : 1;
    
    const actualDamage = Math.floor(amount * damageReduction);
    
    this.health -= actualDamage;
    this.invulnerable = true;
    this.lastDamageTime = Date.now();
    
    // Visual feedback
    this.sprite.setTint(0xff6666);
    
    if (this.health <= 0) {
      this.health = 0;
      // Game over will be handled by GameScene
    }
  }

  getPosition(): Vector2 {
    return new Vector2(this.sprite.x, this.sprite.y);
  }

  addExperience(amount: number): boolean {
    this.experience += amount;
    
    // Check for level up
    if (this.experience >= this.experienceToNext) {
      this.experience -= this.experienceToNext;
      this.level++;
      this.experienceToNext = this.calculateXPRequired(this.level);
      return true; // Level up!
    }
    
    return false;
  }
  
  private calculateXPRequired(level: number): number {
    return Math.floor(
      GameConfig.progression.baseXPRequired * 
      Math.pow(GameConfig.progression.xpMultiplier, level - 1)
    );
  }
  
  getXPProgress(): number {
    return this.experience / this.experienceToNext;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}