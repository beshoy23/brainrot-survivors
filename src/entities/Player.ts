import { GameObjects, Scene } from 'phaser';
import { GameConfig } from '../config/game';
import { Vector2 } from '../utils/Vector2';
import { VirtualJoystick } from '../mobile/VirtualJoystick';

export class Player {
  public sprite: GameObjects.Sprite;
  public velocity: Vector2 = new Vector2();
  public health: number;
  public maxHealth: number;
  // XP and leveling
  public experience: number = 0;
  public level: number = 1;
  public experienceToNext: number;
  
  private keys: any;
  private lastDamageTime: number = 0;
  private damageFlashDuration: number = 100; // Brief visual feedback only
  
  // Mobile controls
  private virtualJoystick?: VirtualJoystick;
  private isMobile: boolean;
  
  // Afterimage trail effect
  private afterimagePool: GameObjects.Graphics[] = [];
  private lastAfterimageTime: number = 0;
  private afterimageInterval: number = 50; // ms between afterimages
  private isMoving: boolean = false;

  constructor(scene: Scene, x: number, y: number) {
    // Create player as animated sprite
    this.sprite = scene.add.sprite(x, y, 'warrior-idle', 0);
    this.sprite.setScale(0.25); // Scale down from 192x192 to ~48x48
    this.sprite.setDepth(GameConfig.player.depth);
    
    // Create animations
    this.createWarriorAnimations(scene);
    this.sprite.play('warrior-idle-anim');
    
    this.health = GameConfig.player.maxHealth;
    this.maxHealth = GameConfig.player.maxHealth;
    
    // Initialize XP
    this.experienceToNext = this.calculateXPRequired(this.level);
    
    // Check if mobile
    this.isMobile = (window as any).isMobile || false;
    
    // Always set up keyboard controls (WASD works on all platforms)
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D');
  }

  update(deltaTime: number): void {
    // Handle input
    this.handleMovement();
    
    // Check if moving
    this.isMoving = this.velocity.x !== 0 || this.velocity.y !== 0;
    
    // Update position
    this.sprite.x += this.velocity.x * deltaTime / 1000;
    this.sprite.y += this.velocity.y * deltaTime / 1000;
    
    // Create afterimage trail when moving
    if (this.isMoving) {
      this.updateAfterimage();
    }
    
    // Update animation based on movement
    this.updateAnimation();
    
    // Keep player within the larger world bounds (with some margin)
    const margin = 100;
    const worldWidth = this.sprite.scene.scale.width * 8;
    const worldHeight = this.sprite.scene.scale.height * 8;
    
    // Clamp position to world bounds
    this.sprite.x = Phaser.Math.Clamp(this.sprite.x, margin, worldWidth - margin);
    this.sprite.y = Phaser.Math.Clamp(this.sprite.y, margin, worldHeight - margin);
    
    // Update damage flash (visual feedback only)
    if (Date.now() - this.lastDamageTime > this.damageFlashDuration) {
      this.sprite.clearAlpha();
      this.sprite.setAlpha(1);
    }
  }

  private handleMovement(): void {
    // Apply speed upgrade multiplier
    const upgradeManager = (window as any).upgradeManager;
    const speedMultiplier = upgradeManager ? 
      (1 + (upgradeManager.getUpgradeLevel('moveSpeed') * 0.1)) : 1;
    
    const speed = GameConfig.player.speed * speedMultiplier;
    this.velocity.set(0, 0);
    
    // Check joystick first (if available)
    if (this.virtualJoystick && this.virtualJoystick.isActive()) {
      // Use joystick movement
      const joystickVelocity = this.virtualJoystick.getVelocity(speed);
      this.velocity.x = joystickVelocity.x;
      this.velocity.y = joystickVelocity.y;
    } else if (this.keys) {
      // Use keyboard movement (works on all platforms)
      if (this.keys.A.isDown) this.velocity.x = -speed;
      if (this.keys.D.isDown) this.velocity.x = speed;
      if (this.keys.W.isDown) this.velocity.y = -speed;
      if (this.keys.S.isDown) this.velocity.y = speed;
      
      // Normalize diagonal movement
      if (this.velocity.x !== 0 && this.velocity.y !== 0) {
        this.velocity.multiply(0.707); // 1/sqrt(2)
      }
    }
  }

  takeDamage(amount: number): void {
    // Apply flat armor reduction (VS-style)
    const upgradeManager = (window as any).upgradeManager;
    const flatArmor = upgradeManager ? 
      (upgradeManager.getUpgradeLevel('armor') * 2) : 0;
    
    // Flat damage reduction with minimum 1 damage
    const actualDamage = Math.max(1, Math.floor(amount - flatArmor));
    
    this.health -= actualDamage;
    this.lastDamageTime = Date.now();
    
    // Brief visual feedback (no invulnerability) - red tint effect
    this.sprite.setAlpha(0.6);
    
    // Add red overlay for damage flash
    const scene = this.sprite.scene;
    const redFlash = scene.add.graphics();
    redFlash.setPosition(this.sprite.x, this.sprite.y);
    redFlash.fillStyle(0xff0000, 0.4);
    redFlash.fillCircle(0, 0, 14);
    redFlash.setDepth(this.sprite.depth + 1);
    
    // Remove the red flash after damage flash duration
    scene.time.delayedCall(this.damageFlashDuration, () => {
      redFlash.destroy();
    });
    
    if (this.health <= 0) {
      this.health = 0;
      // Game over will be handled by GameScene
    }
  }

  getPosition(): Vector2 {
    return new Vector2(this.sprite.x, this.sprite.y);
  }
  
  setVirtualJoystick(joystick: VirtualJoystick): void {
    this.virtualJoystick = joystick;
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

  private createWarriorAnimations(scene: Scene): void {
    // Create idle animation
    if (!scene.anims.exists('warrior-idle-anim')) {
      scene.anims.create({
        key: 'warrior-idle-anim',
        frames: scene.anims.generateFrameNumbers('warrior-idle', { 
          start: 0, 
          end: 7  // 8 frames (0-7)
        }),
        frameRate: 6, // Slower for idle
        repeat: -1
      });
    }
    
    // Create run animation
    if (!scene.anims.exists('warrior-run-anim')) {
      scene.anims.create({
        key: 'warrior-run-anim',
        frames: scene.anims.generateFrameNumbers('warrior-run', { 
          start: 0, 
          end: 5  // 6 frames (0-5)
        }),
        frameRate: 10, // Faster for running
        repeat: -1
      });
    }
  }
  
  private updateAnimation(): void {
    // Update facing direction based on horizontal movement
    if (this.velocity.x > 0) {
      this.sprite.setFlipX(false); // Face right
    } else if (this.velocity.x < 0) {
      this.sprite.setFlipX(true);  // Face left (flip horizontally)
    }
    // If only moving vertically, keep current facing direction
    
    // Switch between idle and running animations
    if (this.isMoving) {
      if (this.sprite.anims.currentAnim?.key !== 'warrior-run-anim') {
        this.sprite.play('warrior-run-anim');
      }
    } else {
      if (this.sprite.anims.currentAnim?.key !== 'warrior-idle-anim') {
        this.sprite.play('warrior-idle-anim');
      }
    }
  }

  private updateAfterimage(): void {
    const now = Date.now();
    if (now - this.lastAfterimageTime < this.afterimageInterval) {
      return;
    }
    
    this.lastAfterimageTime = now;
    this.createAfterimage();
  }
  
  private createAfterimage(): void {
    const scene = this.sprite.scene;
    
    // Create afterimage graphics
    const afterimage = scene.add.graphics();
    afterimage.setPosition(this.sprite.x, this.sprite.y);
    afterimage.setDepth(this.sprite.depth - 1);
    
    // Copy player appearance but with reduced opacity and blue tint
    afterimage.fillGradientStyle(0x4a90e2, 0x2c5aa0, 0x1e3a8a, 0x4a90e2, 0.3);
    afterimage.fillCircle(0, 0, 12);
    
    afterimage.fillStyle(0x87ceeb, 0.2);
    afterimage.fillCircle(0, 0, 8);
    
    // Fade out and destroy
    scene.tweens.add({
      targets: afterimage,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        afterimage.destroy();
      }
    });
  }
  
  destroy(): void {
    this.afterimagePool.forEach(afterimage => afterimage.destroy());
    this.afterimagePool = [];
    this.sprite.destroy();
  }
}