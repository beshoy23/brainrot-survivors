import { Scene } from 'phaser';
import { Player } from '../entities/Player';
import { MovementSystem } from '../systems/MovementSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { WeaponSystem } from '../systems/WeaponSystem';
import { PickupSystem } from '../systems/PickupSystem';
import { GameConfig } from '../config/game';
import { UpgradeManager } from '../managers/UpgradeManager';

export class GameScene extends Scene {
  private player!: Player;
  private movementSystem!: MovementSystem;
  private spawnSystem!: SpawnSystem;
  private collisionSystem!: CollisionSystem;
  private weaponSystem!: WeaponSystem;
  private pickupSystem!: PickupSystem;
  
  // UI elements
  private healthBar!: Phaser.GameObjects.Graphics;
  private healthText!: Phaser.GameObjects.Text;
  private xpBar!: Phaser.GameObjects.Graphics;
  private xpText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private survivalTime: number = 0;
  private timeText!: Phaser.GameObjects.Text;
  private enemyCountText!: Phaser.GameObjects.Text;
  private debugText!: Phaser.GameObjects.Text;
  private balanceText!: Phaser.GameObjects.Text;
  
  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Initialize upgrade manager globally
    (window as any).upgradeManager = UpgradeManager.getInstance();
    
    // Add a background so we can see the game area
    this.add.rectangle(0, 0, this.scale.width * 2, this.scale.height * 2, 0x1a1a1a)
      .setOrigin(0, 0);
    
    // Add grid pattern for visual reference
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x333333, 0.5);
    
    // Draw grid
    const gridSize = 64;
    for (let x = 0; x < this.scale.width * 2; x += gridSize) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, this.scale.height * 2);
    }
    for (let y = 0; y < this.scale.height * 2; y += gridSize) {
      graphics.moveTo(0, y);
      graphics.lineTo(this.scale.width * 2, y);
    }
    graphics.strokePath();
    
    // Initialize player at center
    this.player = new Player(this, this.scale.width / 2, this.scale.height / 2);
    
    // Initialize systems
    this.movementSystem = new MovementSystem();
    this.spawnSystem = new SpawnSystem(this);
    this.collisionSystem = new CollisionSystem(this.scale.width * 2, this.scale.height * 2);
    this.weaponSystem = new WeaponSystem(this);
    this.pickupSystem = new PickupSystem(this);
    
    // Set up weapon system callback for gem drops
    this.weaponSystem.onEnemyDeath = (x: number, y: number) => {
      if (Math.random() <= GameConfig.progression.xpGemDropChance) {
        this.pickupSystem.spawnGem(x, y, 1);
      }
    };
    
    // Set up camera to follow player
    this.cameras.main.startFollow(this.player.sprite, true, 
      GameConfig.camera.smoothFactor, 
      GameConfig.camera.smoothFactor
    );
    this.cameras.main.setDeadzone(100, 100);
    this.cameras.main.setBounds(0, 0, this.scale.width * 2, this.scale.height * 2);
    
    // Create UI
    this.createUI();
    
    // Reset survival time
    this.survivalTime = 0;
    
    // Debug: Log that scene started
    console.log('Game scene started. Player at:', this.player.sprite.x, this.player.sprite.y);
  }

  update(time: number, delta: number): void {
    // Stop all updates if game is over
    if (this.isGameOver) return;
    
    if (this.player.health <= 0) {
      this.gameOver();
      return;
    }
    
    // Update survival time
    this.survivalTime += delta;
    this.updateUI();
    
    // Update systems
    const enemies = this.spawnSystem.getActiveEnemies();
    this.movementSystem.update(delta, this.player, enemies);
    this.spawnSystem.update(time, this.player.getPosition());
    this.collisionSystem.update(time, this.player, enemies);
    this.weaponSystem.update(delta, time, this.player, enemies);
    
    // Update pickups and check for level up
    const xpCollected = this.pickupSystem.update(delta, this.player);
    if (xpCollected > 0) {
      // Apply XP bonus upgrade
      const upgradeManager = UpgradeManager.getInstance();
      const xpMultiplier = 1 + (upgradeManager.getUpgradeLevel('xpBonus') * 0.2);
      const actualXP = Math.floor(xpCollected * xpMultiplier);
      
      const leveledUp = this.player.addExperience(actualXP);
      if (leveledUp) {
        this.onLevelUp();
      }
    }
  }

  private createUI(): void {
    // Health bar background
    this.healthBar = this.add.graphics();
    this.healthBar.setScrollFactor(0);
    this.healthBar.setDepth(100);
    
    // Health text
    this.healthText = this.add.text(16, 16, '', {
      fontSize: '20px',
      color: '#ffffff'
    });
    this.healthText.setScrollFactor(0);
    this.healthText.setDepth(101);
    
    // Time survived
    this.timeText = this.add.text(16, 50, '', {
      fontSize: '18px',
      color: '#ffffff'
    });
    this.timeText.setScrollFactor(0);
    this.timeText.setDepth(101);
    
    // Enemy count
    this.enemyCountText = this.add.text(16, 80, '', {
      fontSize: '18px',
      color: '#ffffff'
    });
    this.enemyCountText.setScrollFactor(0);
    this.enemyCountText.setDepth(101);
    
    // XP bar
    this.xpBar = this.add.graphics();
    this.xpBar.setScrollFactor(0);
    this.xpBar.setDepth(100);
    
    // XP text
    this.xpText = this.add.text(16, 110, '', {
      fontSize: '16px',
      color: '#ffffff'
    });
    this.xpText.setScrollFactor(0);
    this.xpText.setDepth(101);
    
    // Level text
    this.levelText = this.add.text(this.scale.width - 16, 16, '', {
      fontSize: '24px',
      color: '#ffff00'
    });
    this.levelText.setOrigin(1, 0);
    this.levelText.setScrollFactor(0);
    this.levelText.setDepth(101);
    
    // Debug text for upgrades
    this.debugText = this.add.text(16, 140, '', {
      fontSize: '14px',
      color: '#00ff00'
    });
    this.debugText.setScrollFactor(0);
    this.debugText.setDepth(101);
    
    // Balance text
    this.balanceText = this.add.text(16, 170, '', {
      fontSize: '12px',
      color: '#ffaa00'
    });
    this.balanceText.setScrollFactor(0);
    this.balanceText.setDepth(101);
  }

  private updateUI(): void {
    // Update health bar
    this.healthBar.clear();
    
    // Background
    this.healthBar.fillStyle(0x222222);
    this.healthBar.fillRect(16, 16, 200, 24);
    
    // Health fill
    const healthPercent = this.player.health / this.player.maxHealth;
    this.healthBar.fillStyle(healthPercent > 0.3 ? 0x00ff00 : 0xff0000);
    this.healthBar.fillRect(18, 18, 196 * healthPercent, 20);
    
    // Update texts
    this.healthText.setText(`HP: ${Math.ceil(this.player.health)}/${this.player.maxHealth}`);
    this.timeText.setText(`Time: ${Math.floor(this.survivalTime / 1000)}s`);
    this.enemyCountText.setText(`Enemies: ${this.spawnSystem.getActiveEnemies().length}`);
    
    // Update XP bar
    this.xpBar.clear();
    
    // XP bar background
    this.xpBar.fillStyle(0x222222);
    this.xpBar.fillRect(16, 110, 200, 16);
    
    // XP fill
    const xpPercent = this.player.getXPProgress();
    this.xpBar.fillStyle(0x00ffff);
    this.xpBar.fillRect(18, 112, 196 * xpPercent, 12);
    
    // Update XP and level texts
    this.xpText.setText(`XP: ${this.player.experience}/${this.player.experienceToNext}`);
    this.levelText.setText(`Level ${this.player.level}`);
    
    // Update debug text with upgrade info
    const upgradeManager = UpgradeManager.getInstance();
    const upgrades = [
      `DMG: x${(1 + upgradeManager.getUpgradeLevel('damage') * 0.25).toFixed(2)}`,
      `SPD: x${(1 + upgradeManager.getUpgradeLevel('moveSpeed') * 0.1).toFixed(2)}`,
      `FIRE: x${(1 + upgradeManager.getUpgradeLevel('fireRate') * 0.2).toFixed(2)}`,
      `MAG: x${(1 + upgradeManager.getUpgradeLevel('xpMagnet') * 0.3).toFixed(2)}`
    ];
    this.debugText.setText('Upgrades: ' + upgrades.join(' | '));
    
    // Update balance text with proper calculations
    const timeSeconds = this.survivalTime / 1000;
    const enemies = this.spawnSystem.getActiveEnemies();
    
    // Calculate actual enemy threat (health * damage / expected kill time)
    let enemyThreat = 0;
    enemies.forEach(enemy => {
      const enemyDPS = enemy.damage; // Damage per collision
      const enemyHP = enemy.health;
      enemyThreat += enemyHP + enemyDPS * 2; // Weight both HP and damage
    });
    
    // Calculate player power more accurately
    const baseDPS = 10; // Base weapon DPS
    const damageMultiplier = 1 + (upgradeManager.getUpgradeLevel('damage') * 0.25);
    const fireRateMultiplier = 1 + (upgradeManager.getUpgradeLevel('fireRate') * 0.2);
    const projectileCount = 1 + upgradeManager.getUpgradeLevel('projectileCount');
    const playerDPS = baseDPS * damageMultiplier * fireRateMultiplier * projectileCount;
    
    // Balance ratio: higher = easier for player
    const balanceRatio = enemyThreat > 0 ? playerDPS / (enemyThreat / 10) : 2; // Normalize threat
    
    // More nuanced status with hysteresis to prevent flickering
    let status = 'BALANCED';
    if (balanceRatio > 2.0) status = 'EASY';
    else if (balanceRatio > 1.3) status = 'GOOD';
    else if (balanceRatio < 0.6) status = 'HARD';
    else if (balanceRatio < 0.8) status = 'TOUGH';
    
    this.balanceText.setText(`Balance: ${balanceRatio.toFixed(1)} (${status}) | DPS: ${playerDPS.toFixed(0)} | Threat: ${(enemyThreat/10).toFixed(0)}`);
  }

  private isGameOver: boolean = false;
  
  private gameOver(): void {
    if (this.isGameOver) return; // Prevent multiple game over calls
    
    this.isGameOver = true;
    
    // Stop all systems
    this.physics.pause();
    this.scene.pause(); // This stops the update loop
    
    // Stop health regen if active
    if (this.healthRegenTimer) {
      this.healthRegenTimer.destroy();
      this.healthRegenTimer = undefined;
    }
    
    // Show game over text
    const gameOverText = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      `GAME OVER\nSurvived: ${Math.floor(this.survivalTime / 1000)}s\nPress R to restart`,
      {
        fontSize: '48px',
        color: '#ff0000',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    gameOverText.setOrigin(0.5);
    gameOverText.setScrollFactor(0);
    gameOverText.setDepth(200);
    
    // Listen for restart
    this.input.keyboard!.once('keydown-R', () => {
      this.isGameOver = false;
      this.scene.restart();
    });
  }
  
  private onLevelUp(): void {
    // Pause the game
    this.physics.pause();
    this.scene.pause();
    
    // Stop and restart upgrade scene to ensure clean state
    this.scene.stop('UpgradeScene');
    
    // Launch upgrade scene
    this.scene.launch('UpgradeScene', {
      onComplete: (upgrade: any) => {
        // Stop the upgrade scene
        this.scene.stop('UpgradeScene');
        
        // Resume the game
        this.scene.resume();
        this.physics.resume();
        
        // Apply upgrade effects
        this.applyUpgradeEffects(upgrade);
        
        // Show feedback
        this.showUpgradeNotification(upgrade);
      }
    });
  }
  
  private applyUpgradeEffects(upgrade: any): void {
    // Handle specific upgrade effects that need immediate application
    const upgradeManager = UpgradeManager.getInstance();
    
    switch(upgrade.id) {
      case 'maxHealth':
        // Increase max health and heal the difference
        const healthBonus = upgradeManager.getUpgradeLevel('maxHealth') * 20;
        const oldMax = this.player.maxHealth;
        this.player.maxHealth = GameConfig.player.maxHealth + healthBonus;
        this.player.health += (this.player.maxHealth - oldMax);
        break;
        
      case 'healthRegen':
        // Start health regeneration if not already active
        this.startHealthRegen();
        break;
        
      case 'projectileCount':
        // Update weapon system for multi-shot
        this.weaponSystem.updateWeaponsForUpgrades();
        break;
    }
    
    console.log('Applied upgrade:', upgrade.name);
  }
  
  private healthRegenTimer?: Phaser.Time.TimerEvent;
  
  private startHealthRegen(): void {
    const upgradeManager = UpgradeManager.getInstance();
    const regenLevel = upgradeManager.getUpgradeLevel('healthRegen');
    
    if (regenLevel > 0 && !this.healthRegenTimer) {
      this.healthRegenTimer = this.time.addEvent({
        delay: 1000, // Every second
        callback: () => {
          const currentRegenLevel = upgradeManager.getUpgradeLevel('healthRegen');
          const regenAmount = currentRegenLevel / 5; // HP per second
          if (this.player.health < this.player.maxHealth) {
            this.player.health = Math.min(
              this.player.health + regenAmount,
              this.player.maxHealth
            );
          }
        },
        loop: true
      });
    }
  }
  
  private showUpgradeNotification(upgrade: any): void {
    const notification = this.add.text(
      this.scale.width / 2,
      100,
      `${upgrade.name} acquired!`,
      {
        fontSize: '32px',
        color: '#00ff00',
        stroke: '#000000',
        strokeThickness: 3
      }
    );
    notification.setOrigin(0.5);
    notification.setScrollFactor(0);
    notification.setDepth(200);
    
    // Animate and remove
    this.tweens.add({
      targets: notification,
      y: notification.y - 30,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => notification.destroy()
    });
  }
}