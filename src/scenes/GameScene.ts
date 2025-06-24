import { Scene } from 'phaser';
import { Player } from '../entities/Player';
import { MovementSystem } from '../systems/MovementSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { WeaponSystem } from '../systems/WeaponSystem';
import { PickupSystem } from '../systems/PickupSystem';
import { GameConfig } from '../config/game';
import { UpgradeManager } from '../managers/UpgradeManager';
import { WeaponFactory } from '../weapons/WeaponFactory';
import { VirtualJoystick } from '../mobile/VirtualJoystick';
import { TouchInputManager } from '../mobile/TouchInputManager';
import { DeviceDetection } from '../mobile/DeviceDetection';
import { MobileConfig, getMobileUIScale } from '../mobile/MobileConfig';
import { SoundManager } from '../audio/SoundManager';

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
  
  // Game stats for pause menu
  private enemiesKilled: number = 0;
  private totalXP: number = 0;
  private damageDealt: number = 0;
  
  // Pause button
  private pauseButton!: Phaser.GameObjects.Container;
  
  // Mobile controls
  private virtualJoystick?: VirtualJoystick;
  private touchInputManager?: TouchInputManager;
  private isMobile: boolean = false;
  private uiScale: number = 1;
  
  // Audio
  private soundManager!: SoundManager;
  
  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Initialize upgrade manager globally
    (window as any).upgradeManager = UpgradeManager.getInstance();
    
    // Check if mobile
    this.isMobile = (window as any).isMobile || false;
    this.uiScale = this.isMobile ? getMobileUIScale() : 1;
    
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
    
    // Initialize audio
    this.soundManager = new SoundManager(this);
    
    // Set up weapon system callbacks
    this.weaponSystem.onEnemyDeath = (x: number, y: number) => {
      this.enemiesKilled++; // Track kills
      this.soundManager.play('death', { volume: 0.2 });
      if (Math.random() <= GameConfig.progression.xpGemDropChance) {
        // VS-style: gems sit still until player approaches
        this.pickupSystem.spawnGem(x, y, 1);
      }
    };
    
    this.weaponSystem.onDamageDealt = (damage: number) => {
      this.damageDealt += damage; // Track total damage
    };
    
    // Set up camera to follow player
    this.cameras.main.startFollow(this.player.sprite, true, 
      GameConfig.camera.smoothFactor, 
      GameConfig.camera.smoothFactor
    );
    this.cameras.main.setDeadzone(50, 50);
    
    // Set camera bounds with margin to keep player visible
    const margin = 100; // Keep player at least 100px from edge
    this.cameras.main.setBounds(
      -margin, 
      -margin, 
      this.scale.width * 2 + margin * 2, 
      this.scale.height * 2 + margin * 2
    );
    
    // Create UI
    this.createUI();
    
    // Create mobile controls if needed
    if (this.isMobile) {
      this.createMobileControls();
    }
    
    // Reset survival time
    this.survivalTime = 0;
    
    // Game scene initialization complete
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
      this.soundManager.play('pickup', { volume: 0.3 });
      // Apply XP bonus upgrade
      const upgradeManager = UpgradeManager.getInstance();
      const xpMultiplier = 1 + (upgradeManager.getUpgradeLevel('xpBonus') * 0.2);
      const actualXP = Math.floor(xpCollected * xpMultiplier);
      
      const leveledUp = this.player.addExperience(actualXP);
      this.totalXP += actualXP; // Track total XP
      if (leveledUp) {
        this.soundManager.play('levelup', { volume: 0.5 });
        this.onLevelUp();
      }
    }
  }

  private createUI(): void {
    // Clean, minimal HUD design
    const padding = 16;
    const barHeight = 4;
    const fontSize = this.isMobile ? '18px' : '16px';
    
    // HP Bar - Top left, minimal
    this.healthBar = this.add.graphics();
    this.healthBar.setScrollFactor(0);
    this.healthBar.setDepth(100);
    
    // HP Text - small and clean
    this.healthText = this.add.text(padding, padding, '', {
      fontSize: fontSize,
      color: '#ffffff',
      fontFamily: 'monospace'
    });
    this.healthText.setScrollFactor(0);
    this.healthText.setDepth(101);
    this.healthText.setAlpha(0.9);
    
    // XP Bar - Bottom of screen, full width
    this.xpBar = this.add.graphics();
    this.xpBar.setScrollFactor(0);
    this.xpBar.setDepth(100);
    
    // Level indicator - top right, minimal
    this.levelText = this.add.text(this.scale.width - padding, padding, '', {
      fontSize: fontSize,
      color: '#ffffff',
      fontFamily: 'monospace'
    });
    this.levelText.setOrigin(1, 0);
    this.levelText.setScrollFactor(0);
    this.levelText.setDepth(101);
    this.levelText.setAlpha(0.9);
    
    // Time - center top, large and clean
    this.timeText = this.add.text(this.scale.width / 2, padding, '', {
      fontSize: this.isMobile ? '24px' : '20px',
      color: '#ffffff',
      fontFamily: 'monospace'
    });
    this.timeText.setOrigin(0.5, 0);
    this.timeText.setScrollFactor(0);
    this.timeText.setDepth(101);
    
    // Hide enemy count and XP text - too cluttered
    this.enemyCountText = this.add.text(0, 0, '');
    this.enemyCountText.setVisible(false);
    this.xpText = this.add.text(0, 0, '');
    this.xpText.setVisible(false);
    
    // Debug text - hide completely
    this.debugText = this.add.text(0, 0, '');
    this.debugText.setVisible(false);
    this.balanceText = this.add.text(0, 0, '');
    this.balanceText.setVisible(false);
    
    // Pause button - clean minimal design
    this.createPauseButton();
    
    // REMOVED - Cleanup complete
  }

  private updateUI(): void {
    // Clean, minimal UI updates
    const padding = 16;
    
    // Update health bar - thin line under HP text
    this.healthBar.clear();
    const healthPercent = this.player.health / this.player.maxHealth;
    const barWidth = 100;
    const barHeight = 3;
    const barY = padding + 20;
    
    // HP bar background
    this.healthBar.fillStyle(0x333333, 0.5);
    this.healthBar.fillRect(padding, barY, barWidth, barHeight);
    
    // HP bar fill
    if (healthPercent > 0) {
      this.healthBar.fillStyle(healthPercent > 0.3 ? 0x00ff00 : 0xff0000);
      this.healthBar.fillRect(padding, barY, barWidth * healthPercent, barHeight);
    }
    
    // Update texts - minimal info
    this.healthText.setText(`${Math.ceil(this.player.health)}`);  // Just the number
    
    // Time display - clean format
    const totalSeconds = Math.floor(this.survivalTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    this.timeText.setText(timeStr);
    
    // Level display - just the number
    this.levelText.setText(`${this.player.level}`);
    
    // Update XP bar - thin line at bottom of screen
    this.xpBar.clear();
    const xpPercent = this.player.getXPProgress();
    const xpHeight = 3;
    const xpY = this.scale.height - xpHeight;
    
    // XP fill only, no background
    if (xpPercent > 0) {
      this.xpBar.fillStyle(0x00ffff, 0.8);
      this.xpBar.fillRect(0, xpY, this.scale.width * xpPercent, xpHeight);
    }
    
    // REMOVED - Keep UI minimal
  }

  private isGameOver: boolean = false;
  
  private createMobileControls(): void {
    // Create virtual joystick
    this.virtualJoystick = new VirtualJoystick(this);
    this.player.setVirtualJoystick(this.virtualJoystick);
    
    // Create touch input manager
    this.touchInputManager = new TouchInputManager(this);
    
    // Remove double tap pause - it's annoying
    // Users should use the pause button or ESC key
    
    // Vibration feedback
    if (MobileConfig.platform.vibrationEnabled) {
      // Vibrate on level up
      this.events.on('levelup', () => {
        DeviceDetection.getInstance().vibrate(MobileConfig.platform.vibrationPatterns.levelUp);
      });
    }
  }

  private createPauseButton(): void {
    // Minimal pause button - just two vertical lines
    const size = 30;
    const padding = 16;
    this.pauseButton = this.add.container(this.scale.width - padding - size/2, padding + size/2);
    
    // Invisible hit area
    const hitArea = this.add.circle(0, 0, size/2, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: !this.isMobile });
    
    // Pause icon - two minimal lines
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 0.7);
    graphics.fillRect(-4, -8, 3, 16);
    graphics.fillRect(1, -8, 3, 16);
    
    this.pauseButton.add([hitArea, graphics]);
    this.pauseButton.setScrollFactor(0);
    this.pauseButton.setDepth(102);
    this.pauseButton.setAlpha(0.5);
    
    // Button interactions
    hitArea.on('pointerover', () => {
      this.pauseButton.setAlpha(1);
    });
    
    hitArea.on('pointerout', () => {
      this.pauseButton.setAlpha(0.5);
    });
    
    hitArea.on('pointerdown', () => {
      this.pauseGame();
    });
    
    // ESC key handler
    this.input.keyboard!.on('keydown-ESC', () => {
      this.pauseGame();
    });
  }
  
  private pauseGame(): void {
    // Collect current stats
    const stats = {
      survivalTime: this.survivalTime,
      playerLevel: this.player.level,
      enemiesKilled: this.enemiesKilled,
      totalXP: this.totalXP,
      damageDealt: this.damageDealt,
      activeEnemies: this.spawnSystem.getActiveEnemies().length
    };
    
    // Launch pause scene
    this.scene.launch('PauseScene', stats);
    this.scene.pause();
  }

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
    // Check if it's a weapon unlock
    if (upgrade.isWeaponUnlock) {
      // Add the new weapon to the weapon system
      const weapon = WeaponFactory.createWeapon(upgrade.weaponType);
      this.weaponSystem.addWeapon(weapon);
      return;
    }
    
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
    
    // Upgrade applied successfully
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