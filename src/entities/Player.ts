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
  
  // Attack animation state
  private isAttacking: boolean = false;
  private attackAnimationDuration: number = 300; // ms
  
  // Kick direction state
  private kickDirection: Vector2 | null = null;
  private shouldReturnToMovementFacing: boolean = false;

  constructor(scene: Scene, x: number, y: number) {
    // Create player as animated sprite
    this.sprite = scene.add.sprite(x, y, 'patapim-idle', 0);
    this.sprite.setScale(0.4); // Scale down from 192x192 to ~77x77 (larger than zombies)
    this.sprite.setDepth(GameConfig.player.depth);
    
    // Create animations
    this.createPatapimAnimations(scene);
    this.sprite.play('patapim-idle-anim');
    
    this.health = GameConfig.player.maxHealth;
    this.maxHealth = GameConfig.player.maxHealth;
    
    // Initialize XP
    this.experienceToNext = this.calculateXPRequired(this.level);
    
    // Check if mobile
    this.isMobile = (window as any).isMobile || false;
    
    // Always set up keyboard controls (WASD + Arrow keys work on all platforms)
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
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
      // Use keyboard movement (WASD + Arrow keys work on all platforms)
      if (this.keys.A.isDown || this.keys.LEFT.isDown) this.velocity.x = -speed;
      if (this.keys.D.isDown || this.keys.RIGHT.isDown) this.velocity.x = speed;
      if (this.keys.W.isDown || this.keys.UP.isDown) this.velocity.y = -speed;
      if (this.keys.S.isDown || this.keys.DOWN.isDown) this.velocity.y = speed;
      
      // Normalize diagonal movement
      if (this.velocity.x !== 0 && this.velocity.y !== 0) {
        this.velocity.multiply(0.707); // 1/sqrt(2)
      }
    }
  }

  takeDamage(amount: number): void {
    // Apply percentage-based armor reduction (fixed from game-breaking flat reduction)
    const upgradeManager = (window as any).upgradeManager;
    const armorLevel = upgradeManager ? upgradeManager.getUpgradeLevel('armor') : 0;
    
    // Percentage-based damage reduction with 60% cap and minimum 1 damage
    const damageReduction = Math.min(armorLevel * 0.15, 0.6); // 15% per level, max 60%
    const actualDamage = Math.max(1, Math.floor(amount * (1 - damageReduction)));
    
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
  
  setPosition(x: number, y: number): void {
    this.sprite.x = x;
    this.sprite.y = y;
  }
  
  setVirtualJoystick(joystick: VirtualJoystick): void {
    this.virtualJoystick = joystick;
  }
  
  playAttackAnimation(kickDirection?: Vector2): void {
    this.isAttacking = true;
    this.sprite.play('patapim-attack-anim');
    
    // Store kick direction for facing
    if (kickDirection) {
      this.kickDirection = kickDirection.clone();
      this.shouldReturnToMovementFacing = true;
      
      // Face the kick direction immediately
      this.faceDirection(kickDirection);
    }
    
    // Reset attack state after animation completes
    this.sprite.scene.time.delayedCall(this.attackAnimationDuration, () => {
      this.isAttacking = false;
      
      // Return to movement-based facing after a short delay
      if (this.shouldReturnToMovementFacing) {
        this.sprite.scene.time.delayedCall(100, () => {
          this.shouldReturnToMovementFacing = false;
          this.kickDirection = null;
        });
      }
    });
  }
  
  private faceDirection(direction: Vector2): void {
    // Face the direction based on horizontal component
    if (direction.x > 0) {
      this.sprite.setFlipX(false); // Face right
    } else if (direction.x < 0) {
      this.sprite.setFlipX(true);  // Face left
    }
    // If purely vertical, keep current facing
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

  private createPatapimAnimations(scene: Scene): void {
    // Create idle animation
    if (!scene.anims.exists('patapim-idle-anim')) {
      scene.anims.create({
        key: 'patapim-idle-anim',
        frames: scene.anims.generateFrameNumbers('patapim-idle', { 
          start: 0, 
          end: 7  // 8 frames (0-7)
        }),
        frameRate: 6, // Slower for idle
        repeat: -1
      });
    }
    
    // Create run animation
    if (!scene.anims.exists('patapim-run-anim')) {
      scene.anims.create({
        key: 'patapim-run-anim',
        frames: scene.anims.generateFrameNumbers('patapim-run', { 
          start: 0, 
          end: 5  // 6 frames (0-5)
        }),
        frameRate: 10, // Faster for running
        repeat: -1
      });
    }
    
    // Create attack animation
    if (!scene.anims.exists('patapim-attack-anim')) {
      scene.anims.create({
        key: 'patapim-attack-anim',
        frames: scene.anims.generateFrameNumbers('patapim-attack', { 
          start: 0, 
          end: 3  // 4 frames (0-3)
        }),
        frameRate: 12, // Fast for attack
        repeat: 0 // Play once, don't loop
      });
    }
  }
  
  private updateAnimation(): void {
    // Update facing direction - prioritize kick direction over movement
    if (this.shouldReturnToMovementFacing && this.kickDirection) {
      // During kick, face the kick direction
      this.faceDirection(this.kickDirection);
    } else {
      // Normal movement-based facing
      if (this.velocity.x > 0) {
        this.sprite.setFlipX(false); // Face right
      } else if (this.velocity.x < 0) {
        this.sprite.setFlipX(true);  // Face left (flip horizontally)
      }
      // If only moving vertically, keep current facing direction
    }
    
    // Priority: Attack animation > Movement animations
    if (this.isAttacking) {
      // Attack animation is playing, don't override it
      return;
    }
    
    // Switch between idle and running animations
    if (this.isMoving) {
      if (this.sprite.anims.currentAnim?.key !== 'patapim-run-anim') {
        this.sprite.play('patapim-run-anim');
      }
    } else {
      if (this.sprite.anims.currentAnim?.key !== 'patapim-idle-anim') {
        this.sprite.play('patapim-idle-anim');
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