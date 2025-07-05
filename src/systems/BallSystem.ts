import { Scene } from 'phaser';
import { Ball } from '../entities/Ball';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { WallSystem } from './WallSystem';
import { Vector2 } from '../utils/Vector2';
import { PoolManager } from '../managers/PoolManager';

export class BallSystem {
  private ballPool: PoolManager<Ball>;
  private activeBalls: Set<Ball> = new Set();
  private scene: Scene;
  private lastShotTime: number = 0;
  private shootCooldown: number = 300; // 300ms between shots (faster for momentum feel)
  
  // Ball behavior configuration
  private ballBounceOffEnemies: boolean = true; // true = bounce, false = penetrate
  
  // Input handling
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private shootButton?: Phaser.GameObjects.Container;
  
  constructor(scene: Scene) {
    this.scene = scene;
    
    // Initialize ball pool
    this.ballPool = new PoolManager(
      () => new Ball(scene),
      (ball) => ball.reset(),
      20 // Max 20 balls
    );
    
    // Set up keyboard input
    this.spaceKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // Set up mobile shoot button
    this.createMobileShootButton();
    
    console.log('🏀 BallSystem initialized');
  }
  
  private createMobileShootButton(): void {
    const isMobile = (window as any).isMobile || false;
    if (!isMobile) return;
    
    // Create mobile shoot button with larger touch area
    const buttonSize = 80; // Increased from 60
    const margin = 30; // Increased from 20 for better spacing
    
    this.shootButton = this.scene.add.container(
      this.scene.scale.width - buttonSize - margin,
      this.scene.scale.height - buttonSize - margin
    );
    
    // Button background with larger touch area
    const bg = this.scene.add.circle(0, 0, buttonSize / 2, 0x000000, 0.5);
    const border = this.scene.add.circle(0, 0, buttonSize / 2, 0xff6600).setStrokeStyle(3, 0xff6600);
    border.setFillStyle();
    
    // Button icon (ball symbol)
    const icon = this.scene.add.graphics();
    icon.fillStyle(0xff6600);
    icon.fillCircle(0, 0, 15); // Slightly larger icon
    icon.fillStyle(0xff8800, 0.8);
    icon.fillCircle(-4, -4, 6);
    
    // Button label
    const label = this.scene.add.text(0, 25, 'KICK', {
      fontSize: '12px',
      color: '#ff6600',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.shootButton.add([bg, border, icon, label]);
    this.shootButton.setDepth(200); // Very high depth
    this.shootButton.setScrollFactor(0); // Fixed to camera
    
    // Make interactive with larger touch area
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => this.handleShootInput());
    
    console.log('🏀 Mobile kick button created with larger touch area');
  }
  
  update(deltaTime: number, player: Player, enemies: Enemy[], wallSystem?: WallSystem): void {
    // Handle input
    this.handleInput(player);
    
    // Update all active balls
    const ballsToRemove: Ball[] = [];
    
    this.activeBalls.forEach(ball => {
      const expired = ball.update(deltaTime);
      
      if (expired || !ball.active) {
        ballsToRemove.push(ball);
      } else {
        // Check wall collisions
        if (wallSystem) {
          this.checkWallCollisions(ball, wallSystem);
        }
        
        // Check enemy collisions
        this.checkEnemyCollisions(ball, enemies);
      }
    });
    
    // Remove expired balls
    ballsToRemove.forEach(ball => {
      this.activeBalls.delete(ball);
      this.ballPool.release(ball);
    });
  }
  
  private handleInput(player: Player): void {
    // Check for shoot input
    const shouldShoot = this.spaceKey?.isDown || false;
    
    if (shouldShoot) {
      this.handleShootInput(player);
    }
  }
  
  private handleShootInput(player?: Player): void {
    const currentTime = Date.now();
    
    // Check cooldown
    if (currentTime - this.lastShotTime < this.shootCooldown) {
      return;
    }
    
    // Get player reference if not provided
    if (!player) {
      // For mobile button, we need to get player from scene
      const gameScene = this.scene as any;
      player = gameScene.player;
      if (!player) return;
    }
    
    this.lastShotTime = currentTime;
    
    // Calculate shoot direction
    const shootDirection = this.calculateShootDirection(player);
    
    // Calculate ball spawn position (slightly in front of player)
    const playerPos = player.getPosition();
    const dirClone = shootDirection.clone();
    const magnitude = dirClone.magnitude();
    
    // Only apply offset if we have a valid direction
    const spawnPos = playerPos.clone();
    if (magnitude > 0) {
      dirClone.normalize();
      const spawnOffset = 25; // pixels in front of player
      spawnPos.x += dirClone.x * spawnOffset;
      spawnPos.y += dirClone.y * spawnOffset;
    }
    
    // Fire ball with kick animation - INCREASED SPEED for more momentum!
    this.fireBall(spawnPos, shootDirection, 600, player);
  }
  
  private calculateShootDirection(player: Player): Vector2 {
    // For now, shoot towards mouse/touch position
    // Later can be integrated with aiming system
    
    const pointer = this.scene.input.activePointer;
    const camera = this.scene.cameras.main;
    
    // Get world position of pointer
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;
    
    const playerPos = player.getPosition();
    const direction = new Vector2(worldX - playerPos.x, worldY - playerPos.y);
    
    // Fallback: shoot right if no valid direction
    if (direction.magnitude() < 10) {
      return new Vector2(1, 0);
    }
    
    return direction;
  }
  
  private fireBall(startPos: Vector2, direction: Vector2, speed: number = 400, player?: Player): void {
    const ball = this.ballPool.acquire();
    if (!ball) return;
    
    ball.fire(startPos.x, startPos.y, direction, speed);
    this.activeBalls.add(ball);
    
    // Play kick animation with directional facing
    if (player) {
      player.playAttackAnimation(direction);
    }
    
    console.log('🏀 Ball fired with directional kick animation! Active balls:', this.activeBalls.size);
  }
  
  private checkWallCollisions(ball: Ball, wallSystem: WallSystem): void {
    const ballPos = ball.getPosition();
    const collision = wallSystem.checkCollision(ballPos.x, ballPos.y, ball.radius);
    
    if (collision) {
      // Get bounce normal
      const normal = collision.getCollisionNormal(ballPos.x, ballPos.y);
      
      // Move ball out of wall
      const correctedPos = wallSystem.resolveCollision(ballPos.x, ballPos.y, ball.radius);
      ball.sprite.x = correctedPos.x;
      ball.sprite.y = correctedPos.y;
      
      // Apply bounce
      ball.bounceOffWall(normal);
    }
  }
  
  private checkEnemyCollisions(ball: Ball, enemies: Enemy[]): void {
    const ballPos = ball.getPosition();
    
    enemies.forEach(enemy => {
      if (!enemy.sprite.active || enemy.isDying) return;
      
      const dx = ballPos.x - enemy.x;
      const dy = ballPos.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const collisionDistance = ball.radius + enemy.hitboxRadius;
      
      if (distance < collisionDistance && distance > 0) {
        // Apply damage
        const isDead = enemy.takeDamage(ball.damage);
        
        // Apply knockback to enemy
        const knockbackDirection = new Vector2(dx / distance, dy / distance);
        const knockbackX = knockbackDirection.x * ball.knockbackForce;
        const knockbackY = knockbackDirection.y * ball.knockbackForce;
        enemy.applyKnockback(knockbackX, knockbackY);
        
        // Ball behavior: bounce or penetrate
        if (this.ballBounceOffEnemies) {
          // Ball bounces off enemy (realistic physics)
          const ballDirection = new Vector2(-dx / distance, -dy / distance); // Opposite direction
          ball.bounceOffWall(ballDirection); // Reuse wall bounce logic
          console.log('🏀 Ball hit enemy and bounced! Damage:', ball.damage, 'Dead:', isDead);
        } else {
          // Ball penetrates through enemy (keeps going)
          console.log('🏀 Ball hit enemy and penetrated! Damage:', ball.damage, 'Dead:', isDead);
        }
        
        // Ball hit effect
        ball.hitEnemy();
      }
    });
  }
  
  // Get all active balls (for debugging)
  getActiveBalls(): Ball[] {
    return Array.from(this.activeBalls);
  }
  
  // Toggle ball behavior
  setBallBounceOffEnemies(shouldBounce: boolean): void {
    this.ballBounceOffEnemies = shouldBounce;
    console.log('🏀 Ball behavior changed:', shouldBounce ? 'BOUNCE off enemies' : 'PENETRATE through enemies');
  }
  
  // Clear all balls
  clearAllBalls(): void {
    this.activeBalls.forEach(ball => {
      ball.deactivate();
      this.ballPool.release(ball);
    });
    this.activeBalls.clear();
  }
  
  // Cleanup
  destroy(): void {
    this.clearAllBalls();
    this.shootButton?.destroy();
  }
}