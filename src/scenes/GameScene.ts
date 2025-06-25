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
  private accumulatedTime: number = 0; // For timing-based systems
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
  private pauseButtonHitArea!: Phaser.GameObjects.Shape;
  
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
    
    // Create a much larger, more interesting world (8x screen size)
    const worldWidth = this.scale.width * 8;
    const worldHeight = this.scale.height * 8;
    
    this.createInterestingBackground(worldWidth, worldHeight);
    
    // Initialize player at center of the larger world
    this.player = new Player(this, worldWidth / 2, worldHeight / 2);
    
    // Initialize systems with larger world
    this.movementSystem = new MovementSystem();
    this.spawnSystem = new SpawnSystem(this);
    this.collisionSystem = new CollisionSystem(worldWidth, worldHeight);
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
    
    // Set up camera to follow player in the larger world
    this.cameras.main.startFollow(this.player.sprite, true, 
      GameConfig.camera.smoothFactor, 
      GameConfig.camera.smoothFactor
    );
    this.cameras.main.setDeadzone(50, 50);
    
    // Set camera bounds for the much larger world
    const margin = 200; // Larger margin for the bigger world
    this.cameras.main.setBounds(
      -margin, 
      -margin, 
      worldWidth + margin * 2, 
      worldHeight + margin * 2
    );
    
    // Create UI (but not pause button yet)
    this.createUI();
    
    // Create mobile controls if needed
    if (this.isMobile) {
      this.createMobileControls();
    }
    
    // Create pause button LAST to ensure highest input priority
    this.createPauseButton();
    
    // Reset survival time
    this.survivalTime = 0;
    this.accumulatedTime = 0;
    
    // Set up scene resume handler to restore button functionality
    this.events.on('resume', () => {
      this.setupPauseButtonEvents();
      // Re-enable virtual joystick after resume
      if (this.virtualJoystick) {
        this.virtualJoystick.setEnabled(true);
      }
    });
    
    // Game scene initialization complete
  }

  private createInterestingBackground(worldWidth: number, worldHeight: number): void {
    // Create a more interesting, varied background inspired by VS
    
    // Base background - lighter gray for visibility
    const bg = this.add.rectangle(0, 0, worldWidth, worldHeight, 0x3a3a3a);
    bg.setOrigin(0, 0);
    bg.setDepth(-20); // Ensure it's behind everything
    
    // Create multiple background layers for depth
    this.createBackgroundTerrain(worldWidth, worldHeight);
    this.createBackgroundGrid(worldWidth, worldHeight);
    this.createBackgroundDetails(worldWidth, worldHeight);
  }
  
  private createBackgroundTerrain(worldWidth: number, worldHeight: number): void {
    // Create more visible terrain variations
    const graphics = this.add.graphics();
    graphics.setDepth(-10);
    
    // Generate organic-looking ground patches with better visibility
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * worldWidth;
      const y = Math.random() * worldHeight;
      const size = 60 + Math.random() * 150;
      
      // Much lighter and more visible colors
      const colors = [0x5a5a5a, 0x656565, 0x707070, 0x6d6d6d];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      graphics.fillStyle(color, 0.8 + Math.random() * 0.2); // Very high opacity
      graphics.fillCircle(x, y, size);
    }
  }
  
  private createBackgroundGrid(worldWidth: number, worldHeight: number): void {
    // More visible grid pattern for spatial reference
    const graphics = this.add.graphics();
    graphics.setDepth(-8);
    graphics.lineStyle(2, 0x808080, 0.6); // Much brighter and more visible
    
    const gridSize = 128; // Larger grid for bigger world
    
    // Vertical lines
    for (let x = 0; x < worldWidth; x += gridSize) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, worldHeight);
    }
    
    // Horizontal lines  
    for (let y = 0; y < worldHeight; y += gridSize) {
      graphics.moveTo(0, y);
      graphics.lineTo(worldWidth, y);
    }
    
    graphics.strokePath();
  }
  
  private createBackgroundDetails(worldWidth: number, worldHeight: number): void {
    // Add more visible scattered decorative elements
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * worldWidth;
      const y = Math.random() * worldHeight;
      
      // Random decorative elements with better visibility
      const type = Math.floor(Math.random() * 3);
      const graphics = this.add.graphics();
      graphics.setPosition(x, y);
      graphics.setDepth(-5);
      graphics.setAlpha(0.7 + Math.random() * 0.3); // Much higher visibility
      
      switch(type) {
        case 0: // Bigger, more visible rocks
          graphics.fillStyle(0x999999);
          graphics.fillCircle(0, 0, 3 + Math.random() * 6);
          break;
          
        case 1: // More visible debris crosses
          graphics.lineStyle(3, 0x888888);
          graphics.beginPath();
          graphics.moveTo(-4, 0);
          graphics.lineTo(4, 0);
          graphics.moveTo(0, -4);
          graphics.lineTo(0, 4);
          graphics.strokePath();
          break;
          
        case 2: // Bigger patches
          graphics.fillStyle(0xaaaaaa);
          graphics.fillRect(-3, -2, 6, 4);
          break;
      }
    }
  }

  update(time: number, delta: number): void {
    // Stop all updates if game is over
    if (this.isGameOver) return;
    
    if (this.player.health <= 0) {
      this.gameOver();
      return;
    }
    
    // Update survival time and accumulated time
    this.survivalTime += delta;
    this.accumulatedTime += delta;
    this.updateUI();
    
    // Update systems
    const enemies = this.spawnSystem.getActiveEnemies();
    this.movementSystem.update(delta, this.player, enemies);
    this.spawnSystem.update(this.survivalTime, this.player.getPosition());
    this.collisionSystem.update(this.accumulatedTime, this.player, enemies);
    this.weaponSystem.update(delta, this.accumulatedTime, this.player, enemies);
    
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
    
    // REMOVED - Cleanup complete
  }

  private updateUI(): void {
    // Clean, minimal UI updates
    const padding = 16;
    
    // Update health bar - prominent bar under HP text
    this.healthBar.clear();
    const healthPercent = this.player.health / this.player.maxHealth;
    const barWidth = this.isMobile ? 120 : 100;
    const barHeight = this.isMobile ? 6 : 4;
    const barY = padding + 22;
    
    // HP bar background - dark with border
    this.healthBar.fillStyle(0x333333, 0.8);
    this.healthBar.fillRect(padding, barY, barWidth, barHeight);
    this.healthBar.lineStyle(1, 0x666666, 0.8);
    this.healthBar.strokeRect(padding, barY, barWidth, barHeight);
    
    // HP bar fill with color coding
    if (healthPercent > 0) {
      const color = healthPercent > 0.6 ? 0x00ff00 : healthPercent > 0.3 ? 0xffff00 : 0xff0000;
      this.healthBar.fillStyle(color, 1.0);
      this.healthBar.fillRect(padding + 1, barY + 1, (barWidth - 2) * healthPercent, barHeight - 2);
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
    
    // Update XP bar - prominent bar at bottom of screen
    this.xpBar.clear();
    const xpPercent = this.player.getXPProgress();
    const xpHeight = this.isMobile ? 8 : 6; // Thicker for mobile
    const xpY = this.scale.height - xpHeight;
    
    // XP bar background - dark with border
    this.xpBar.fillStyle(0x333333, 0.8);
    this.xpBar.fillRect(0, xpY, this.scale.width, xpHeight);
    this.xpBar.lineStyle(1, 0x666666, 0.8);
    this.xpBar.strokeRect(0, xpY, this.scale.width, xpHeight);
    
    // XP fill - bright cyan with glow effect
    if (xpPercent > 0) {
      this.xpBar.fillStyle(0x00ffff, 1.0);
      this.xpBar.fillRect(1, xpY + 1, (this.scale.width - 2) * xpPercent, xpHeight - 2);
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
    // Mobile-friendly pause button with better positioning
    const baseSize = this.isMobile ? 64 : 30; // Even larger for mobile
    const padding = this.isMobile ? 32 : 16; // More padding on mobile
    
    // Position with generous safe area consideration for mobile
    const safeAreaTop = this.isMobile ? 50 : 0; // Account for notches and status bar
    const xPos = this.scale.width - padding - baseSize/2;
    const yPos = padding + baseSize/2 + safeAreaTop;
    
    this.pauseButton = this.add.container(xPos, yPos);
    
    // Much larger invisible hit area for easier tapping
    const hitAreaSize = this.isMobile ? baseSize * 1.5 : baseSize; // 50% larger hit area on mobile
    this.pauseButtonHitArea = this.add.circle(0, 0, hitAreaSize/2, 0x000000, 0);
    this.pauseButtonHitArea.setInteractive({ useHandCursor: !this.isMobile });
    
    // Background circle for better visibility on mobile
    if (this.isMobile) {
      const background = this.add.circle(0, 0, baseSize/2, 0x000000, 0.3);
      background.setStrokeStyle(2, 0xffffff, 0.5);
      this.pauseButton.add(background);
    }
    
    // Pause icon - scaled appropriately
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, this.isMobile ? 0.9 : 0.7);
    
    // Scale icon with button size
    const iconScale = baseSize / 30;
    const lineWidth = Math.max(2, 3 * iconScale);
    const lineHeight = Math.max(12, 16 * iconScale);
    const lineSpacing = Math.max(4, 5 * iconScale);
    
    graphics.fillRect(-lineSpacing, -lineHeight/2, lineWidth, lineHeight);
    graphics.fillRect(lineSpacing - lineWidth, -lineHeight/2, lineWidth, lineHeight);
    
    this.pauseButton.add([this.pauseButtonHitArea, graphics]);
    this.pauseButton.setScrollFactor(0);
    this.pauseButton.setDepth(1000); // Highest possible depth for touch priority
    this.pauseButton.setAlpha(this.isMobile ? 0.8 : 0.5);
    
    // Set up pause button events
    this.setupPauseButtonEvents();
    
    // ESC key handler - only set up once
    this.input.keyboard!.off('keydown-ESC'); // Remove any existing handlers
    this.input.keyboard!.on('keydown-ESC', () => {
      this.pauseGame();
    });
  }
  
  private setupPauseButtonEvents(): void {
    // Clear any existing events
    this.pauseButtonHitArea.removeAllListeners();
    
    // Remove scene-level handlers to avoid duplicates
    this.input.off('pointerdown', this.handlePauseButtonTouch, this);
    
    // Add scene-level pointer handler for highest priority
    this.input.on('pointerdown', this.handlePauseButtonTouch, this);
    
    // Backup: Also set up object-level events
    this.pauseButtonHitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.triggerPause(pointer);
    });
    
    // Remove hover effects for mobile reliability
    if (!this.isMobile) {
      this.pauseButtonHitArea.on('pointerover', () => {
        this.pauseButton.setAlpha(1);
      });
      
      this.pauseButtonHitArea.on('pointerout', () => {
        this.pauseButton.setAlpha(0.5);
      });
    }
  }
  
  private handlePauseButtonTouch = (pointer: Phaser.Input.Pointer) => {
    // Check if touch is within pause button area
    const buttonX = this.pauseButton.x;
    const buttonY = this.pauseButton.y;
    const hitRadius = this.isMobile ? 48 : 24; // Match hit area size
    
    const distance = Math.sqrt(
      Math.pow(pointer.x - buttonX, 2) + 
      Math.pow(pointer.y - buttonY, 2)
    );
    
    if (distance <= hitRadius) {
      // Stop event propagation
      pointer.event?.stopPropagation();
      this.triggerPause(pointer);
    }
  }
  
  private triggerPause(pointer: Phaser.Input.Pointer): void {
    // Prevent event bubbling
    pointer.event?.stopPropagation();
    
    // Visual feedback
    this.pauseButton.setAlpha(1);
    this.pauseButton.setScale(0.9);
    
    // Immediate pause - no delay needed
    this.pauseGame();
    
    // Reset visual state after a moment
    this.time.delayedCall(100, () => {
      this.pauseButton.setScale(1);
      this.pauseButton.setAlpha(this.isMobile ? 0.8 : 0.5);
    });
  }
  
  private pauseGame(): void {
    // Disable virtual joystick to prevent interference
    if (this.virtualJoystick) {
      this.virtualJoystick.setEnabled(false);
    }
    
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
        // Increase max health and heal the difference (VS-style)
        const healthBonus = upgradeManager.getUpgradeLevel('maxHealth') * 25;
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