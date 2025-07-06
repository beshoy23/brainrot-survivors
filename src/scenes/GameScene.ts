import { Scene } from 'phaser';
import { Player } from '../entities/Player';
import { MovementSystem } from '../systems/MovementSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { WeaponSystem } from '../systems/WeaponSystem';
import { PickupSystem } from '../systems/PickupSystem';
import { WeaponEffectSystem } from '../systems/WeaponEffectSystem';
import { GameConfig } from '../config/game';
import { UpgradeManager } from '../managers/UpgradeManager';
import { WeaponFactory } from '../weapons/WeaponFactory';
import { VirtualJoystick } from '../mobile/VirtualJoystick';
import { TouchInputManager } from '../mobile/TouchInputManager';
import { DeviceDetection } from '../mobile/DeviceDetection';
import { MobileConfig, getMobileUIScale } from '../mobile/MobileConfig';
import { SoundManager } from '../audio/SoundManager';
import { NoiseGenerator } from '../utils/NoiseGenerator';
import { ENEMY_TYPES } from '../config/enemyTypes';
import { ScreenShake } from '../utils/ScreenShake';
import { ParticleEffects } from '../utils/ParticleEffects';
import { DiscoveryChest } from '../entities/DiscoveryChest';
import { ProgressionBalanceTester } from '../tests/ProgressionBalanceTest';
import { WeaponBalanceTester } from '../tests/WeaponBalanceTest';
import { TimeDilationManager } from '../systems/TimeDilationManager';
import { InputModeManager } from '../systems/InputModeManager';
import { AimingInputHandler } from '../systems/AimingInputHandler';
import { AimingVisualizer } from '../systems/AimingVisualizer';
import { WallSystem } from '../systems/WallSystem';
import { BallSystem } from '../systems/BallSystem';

console.log('🎯 GameScene: All imports loaded successfully');

export class GameScene extends Scene {
  private player!: Player;
  private movementSystem!: MovementSystem;
  private spawnSystem!: SpawnSystem;
  private collisionSystem!: CollisionSystem;
  private weaponSystem!: WeaponSystem;
  private pickupSystem!: PickupSystem;
  private weaponEffectSystem!: WeaponEffectSystem;
  private timeDilationManager!: TimeDilationManager;
  private inputModeManager!: InputModeManager;
  private aimingInputHandler?: AimingInputHandler;
  private aimingVisualizer?: AimingVisualizer;
  private wallSystem!: WallSystem;
  private ballSystem!: BallSystem;
  
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
  
  // Visual effects
  private screenShake!: ScreenShake;
  private particleEffects!: ParticleEffects;
  
  // Discovery objects
  private discoveryChest?: DiscoveryChest;
  
  constructor() {
    super({ key: 'GameScene' });
    console.log('🎯 GameScene: Constructor called');
  }

  preload(): void {
    // Load beautiful farm character spritesheets
    this.load.spritesheet('farm-char-idle', 'Character/Idle.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet('farm-char-walk', 'Character/Walk.png', {
      frameWidth: 16, 
      frameHeight: 16
    });
    // Use idle frames for attack animation
    this.load.spritesheet('farm-char-attack', 'Character/Idle.png', {
      frameWidth: 16, 
      frameHeight: 16
    });
    
    // Load weapon textures
    this.load.image('brbrattack1', 'brbrattack1.png');
    
    // Load beautiful farm animal enemies
    // Red Chickens (Fast/Swarm Enemies)
    this.load.spritesheet('chicken-red', 'Farm Animals/Chicken Red.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet('chicken-blonde', 'Farm Animals/Chicken Blonde  Green.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet('baby-chicken', 'Farm Animals/Baby Chicken Yellow.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    // Brown Cows (Tank/Elite Enemies)
    this.load.spritesheet('cow-female', 'Farm Animals/Female Cow Brown.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet('cow-male', 'Farm Animals/Male Cow Brown.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    
    // Load beautiful farm environment assets
    this.load.image('farm-house', 'Objects/House.png');
    this.load.image('maple-tree', 'Objects/Maple Tree.png');
    this.load.image('spring-crops', 'Objects/Spring Crops.png');
    this.load.image('farm-fence', 'Objects/Fence\'s copiar.png');
    this.load.image('farm-interior', 'Objects/Interior.png');
    this.load.image('farm-plates', 'Objects/Plates.png');
    this.load.image('farm-road', 'Objects/Road copiar.png');
    
    // Load tileset for beautiful farm background
    this.load.image('tileset-spring', 'Tileset/Tileset Spring.png');
    this.load.image('walls-floors', 'Tileset/Walls and Floors copiar.png');
  }

  create(): void {
    console.log('🎯 GameScene: create() called');
    
    // Initialize upgrade manager globally
    (window as any).upgradeManager = UpgradeManager.getInstance();
    
    // Check if mobile
    this.isMobile = (window as any).isMobile || false;
    console.log('🎯 Device detection: isMobile =', this.isMobile);
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
    this.weaponEffectSystem = new WeaponEffectSystem(this);
    this.wallSystem = new WallSystem(this, worldWidth, worldHeight);
    this.ballSystem = new BallSystem(this);
    
    // Create test walls to experiment with positioning strategy
    this.wallSystem.createTestWalls();
    
    // Connect weapon effect system to weapon system
    this.weaponSystem.setWeaponEffectSystem(this.weaponEffectSystem);
    
    // Initialize audio
    this.soundManager = new SoundManager(this);
    
    // Initialize visual effects
    this.screenShake = new ScreenShake(this);
    this.particleEffects = new ParticleEffects(this);
    
    // Connect visual effects to weapon system
    this.weaponSystem.setVisualEffects(this.screenShake, this.particleEffects);
    
    // Initialize time dilation manager
    this.timeDilationManager = new TimeDilationManager(this);
    
    // Initialize clean input mode architecture
    this.inputModeManager = new InputModeManager(this);
    
    // Initialize aiming components for both mobile and desktop
    console.log('🎯 Initializing aiming systems, isMobile:', this.isMobile);
    
    if (!this.isMobile) {
      console.log('🎯 Creating TouchInputManager for desktop');
      this.touchInputManager = new TouchInputManager(this);
    }
    
    // Always initialize aiming for testing (will be created in mobile section too)
    console.log('🎯 Creating aiming components, touchInputManager exists:', !!this.touchInputManager);
    this.aimingInputHandler = new AimingInputHandler(this);
    this.aimingVisualizer = new AimingVisualizer(this);
    this.setupAimingEventListeners();
    console.log('🎯 Clean aiming architecture initialized!');
    
    // Set up weapon system callbacks
    this.weaponSystem.onEnemyDeath = (x: number, y: number) => {
      this.enemiesKilled++; // Track kills
      
      // SATISFYING KILL FEEDBACK!
      this.screenShake.shake(3, 150); // Light screen shake
      this.particleEffects.createDeathExplosion(x, y, 0xff0000);
      this.particleEffects.createXPBurst(x, y);
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
    
    // EXPLOSIVE START: Spawn 3-4 enemies immediately for instant action
    this.spawnInitialEnemies();
    
    // Create mysterious discovery chest for exploration hook
    this.createDiscoveryChest(worldWidth, worldHeight);
    
    // Set up scene resume handler to restore button functionality
    this.events.on('resume', () => {
      this.setupPauseButtonEvents();
      // Re-enable virtual joystick after resume
      if (this.virtualJoystick) {
        this.virtualJoystick.setEnabled(true);
      }
    });
    
    // Game scene initialization complete
    
    // Expose balance testing in development (browser console access)
    if (typeof window !== 'undefined') {
      (window as any).testProgression = () => ProgressionBalanceTester.quickBalanceCheck();
      (window as any).testWeapons = () => WeaponBalanceTester.quickWeaponTest();
      console.log('🧪 Balance testing available!');
      console.log('  📈 testProgression() - Test XP and enemy balance');
      console.log('  ⚔️ testWeapons() - Test weapon DPS and effectiveness');
    }
  }

  private createInterestingBackground(worldWidth: number, worldHeight: number): void {
    // Create a more interesting, varied background inspired by VS
    
    // Base background - lighter gray for visibility
    const bg = this.add.rectangle(0, 0, worldWidth, worldHeight, 0x3a3a3a);
    bg.setOrigin(0, 0);
    bg.setDepth(-20); // Ensure it's behind everything
    
    // Pre-generate entire background into a texture for efficiency
    this.generateBackgroundTexture(worldWidth, worldHeight);
    
    // Add beautiful farm environmental elements
    this.createFarmEnvironment(worldWidth, worldHeight);
  }
  
  private generateBackgroundTexture(worldWidth: number, worldHeight: number): void {
    // Create render texture for the background
    const rt = this.add.renderTexture(0, 0, worldWidth, worldHeight);
    rt.setOrigin(0, 0);
    rt.setDepth(-15);
    
    // Use smaller tiles for better detail density
    const tileSize = 32; // Smaller tiles = more detail
    const tilesX = Math.ceil(worldWidth / tileSize);
    const tilesY = Math.ceil(worldHeight / tileSize);
    
    // Initialize noise generators once
    const elevationNoise = new NoiseGenerator(12345);
    const biomeNoise = new NoiseGenerator(54321);
    const detailNoise = new NoiseGenerator(99999);
    
    // Pre-calculate and cache all noise values
    const noiseCache = {
      elevation: new Float32Array(tilesX * tilesY),
      biome: new Float32Array(tilesX * tilesY),
      detail: new Float32Array(tilesX * tilesY)
    };
    
    // Fill cache in one pass
    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        const idx = y * tilesX + x;
        noiseCache.elevation[idx] = elevationNoise.octaveNoise(x, y, 3, 0.6, 0.02);
        noiseCache.biome[idx] = biomeNoise.octaveNoise(x, y, 2, 0.5, 0.01);
        noiseCache.detail[idx] = detailNoise.octaveNoise(x, y, 1, 0.5, 0.1);
      }
    }
    
    // Create temporary graphics for drawing
    const tempGraphics = this.add.graphics();
    
    // Draw terrain layer
    this.drawCachedTerrain(tempGraphics, tilesX, tilesY, tileSize, noiseCache);
    rt.draw(tempGraphics);
    tempGraphics.clear();
    
    // Draw grid layer
    this.drawCachedGrid(tempGraphics, worldWidth, worldHeight, tileSize, noiseCache);
    rt.draw(tempGraphics);
    tempGraphics.clear();
    
    // Draw details layer
    this.drawCachedDetails(tempGraphics, tilesX, tilesY, tileSize, noiseCache);
    rt.draw(tempGraphics);
    tempGraphics.clear();
    
    // Draw medium details layer (8-16 pixel features)
    this.drawMediumDetails(tempGraphics, tilesX, tilesY, tileSize, noiseCache);
    rt.draw(tempGraphics);
    tempGraphics.clear();
    
    // Draw fine details layer (2-4 pixel features)
    this.drawFineDetails(tempGraphics, tilesX, tilesY, tileSize, noiseCache);
    rt.draw(tempGraphics);
    tempGraphics.clear();
    
    // Draw ambient effects layer (shadows, light patches)
    this.drawAmbientEffects(tempGraphics, tilesX, tilesY, tileSize, noiseCache);
    rt.draw(tempGraphics);
    
    // Clean up temporary graphics
    tempGraphics.destroy();
    
    // Save the texture so it never needs to be regenerated
    rt.saveTexture('background-texture');
  }
  
  private drawCachedTerrain(graphics: Phaser.GameObjects.Graphics, tilesX: number, tilesY: number, 
                           tileSize: number, cache: any): void {
    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        const idx = y * tilesX + x;
        const elevation = cache.elevation[idx];
        const biome = cache.biome[idx];
        
        // Skip low areas
        if (elevation < 0.25) continue;
        
        // Determine color from cached values
        let color;
        if (biome > 0.6) {
          // Rocky biome
          color = elevation > 0.7 ? 0x8a7a6a : elevation > 0.5 ? 0x6a5a4a : 0x5a4a3a;
        } else if (biome > 0.3) {
          // Standard terrain  
          color = elevation > 0.7 ? 0x7a7a7a : elevation > 0.5 ? 0x5a5a5a : 0x4a4a4a;
        } else {
          // Wet biome
          color = elevation > 0.7 ? 0x6a7a7a : elevation > 0.5 ? 0x4a5a5a : 0x3a4a4a;
        }
        
        const alpha = 0.3 + (elevation * 0.5);
        graphics.fillStyle(color, alpha);
        graphics.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
  }
  
  private drawCachedGrid(graphics: Phaser.GameObjects.Graphics, worldWidth: number, 
                        worldHeight: number, tileSize: number, cache: any): void {
    const gridSize = 128;
    const tilesX = Math.ceil(worldWidth / tileSize);
    
    // Draw grid with cached elevation values
    for (let x = 0; x < worldWidth; x += gridSize) {
      for (let y = 0; y < worldHeight; y += gridSize) {
        // Get cached elevation
        const tileX = Math.floor(x / tileSize);
        const tileY = Math.floor(y / tileSize);
        const idx = tileY * tilesX + tileX;
        const elevation = cache.elevation[idx] || 0.5;
        
        const opacity = 0.1 + (elevation * 0.4);
        graphics.lineStyle(2, 0x808080, opacity);
        
        // Draw grid segments
        if (x + gridSize <= worldWidth) {
          graphics.moveTo(x, y);
          graphics.lineTo(x + gridSize, y);
        }
        if (y + gridSize <= worldHeight) {
          graphics.moveTo(x, y);
          graphics.lineTo(x, y + gridSize);
        }
      }
    }
    graphics.strokePath();
  }
  
  private drawCachedDetails(graphics: Phaser.GameObjects.Graphics, tilesX: number, tilesY: number,
                           tileSize: number, cache: any): void {
    // Place details based on cached noise
    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        const idx = y * tilesX + x;
        const detail = cache.detail[idx];
        
        // Lower threshold for more details
        if (detail < 0.5) continue; // 50% chance instead of 20%
        
        const elevation = cache.elevation[idx];
        const biome = cache.biome[idx];
        
        // Position with some randomness
        const worldX = x * tileSize + tileSize/2 + (Math.random() - 0.5) * 20;
        const worldY = y * tileSize + tileSize/2 + (Math.random() - 0.5) * 20;
        
        graphics.save();
        graphics.translateCanvas(worldX, worldY);
        
        // Draw appropriate detail with more variety
        if (biome > 0.6) {
          // Rocky biome details
          if (detail > 0.8 && elevation > 0.5) {
            // Large rocks
            graphics.fillStyle(0x8a7a6a, 0.6 + elevation * 0.3);
            const size = 4 + elevation * 8;
            graphics.fillCircle(0, 0, size);
            // Shadow
            graphics.fillStyle(0x000000, 0.15);
            graphics.fillEllipse(2, size, size * 1.2, size * 0.4);
          } else if (detail > 0.65) {
            // Medium stones
            graphics.fillStyle(0x7a6a5a, 0.5);
            for (let i = 0; i < 2; i++) {
              graphics.fillCircle(i * 4 - 2, i * 2 - 1, 2 + i);
            }
          } else {
            // Small pebbles
            graphics.fillStyle(0x6a5a4a, 0.4);
            graphics.fillCircle(0, 0, 1);
            graphics.fillCircle(2, -1, 1.5);
          }
        } else if (biome < 0.3) {
          // Wet biome details
          if (detail > 0.8 && elevation > 0.4) {
            // Puddles
            graphics.fillStyle(0x4a6a8a, 0.5 + elevation * 0.3);
            graphics.fillEllipse(0, 0, 8, 6);
            // Reflection
            graphics.fillStyle(0x6a8aaa, 0.3);
            graphics.fillEllipse(-2, -2, 3, 2);
          } else if (detail > 0.65) {
            // Water plants
            graphics.fillStyle(0x3a5a4a, 0.6);
            graphics.fillRect(-1, -3, 2, 6);
            graphics.fillCircle(0, -4, 2);
          } else {
            // Wet spots
            graphics.fillStyle(0x5a7a8a, 0.3);
            graphics.fillCircle(0, 0, 3);
          }
        } else {
          // Standard biome details
          if (detail > 0.8 && elevation > 0.6) {
            // Grass patches
            graphics.fillStyle(0x4a6a4a, 0.5);
            for (let i = 0; i < 3; i++) {
              const x = i * 2 - 2;
              graphics.fillRect(x, -2, 1, 4);
            }
          } else if (detail > 0.65) {
            // Small vegetation
            graphics.fillStyle(0x5a7a5a, 0.4);
            graphics.fillCircle(0, 0, 2);
            graphics.fillStyle(0x6a8a6a, 0.3);
            graphics.fillCircle(1, -1, 1.5);
          } else {
            // Dirt spots
            graphics.fillStyle(0x5a4a3a, 0.3);
            graphics.fillEllipse(0, 0, 4, 2);
          }
        }
        
        graphics.restore();
      }
    }
  }
  
  private drawMediumDetails(graphics: Phaser.GameObjects.Graphics, tilesX: number, tilesY: number,
                           tileSize: number, cache: any): void {
    // Medium-scale details for visual richness
    for (let x = 0; x < tilesX; x += 2) { // Every other tile for performance
      for (let y = 0; y < tilesY; y += 2) {
        const idx = y * tilesX + x;
        const detail = cache.detail[idx];
        const elevation = cache.elevation[idx];
        const biome = cache.biome[idx];
        
        // Medium detail threshold
        if (detail < 0.35 || detail > 0.65) continue;
        
        const worldX = x * tileSize + tileSize;
        const worldY = y * tileSize + tileSize;
        
        graphics.save();
        graphics.translateCanvas(worldX, worldY);
        
        // Draw medium-scale features
        if (biome > 0.6 && elevation > 0.5) {
          // Rocky outcroppings
          graphics.fillStyle(0x7a6a5a, 0.4);
          graphics.beginPath();
          graphics.moveTo(-8, 4);
          graphics.lineTo(-4, -8);
          graphics.lineTo(6, -6);
          graphics.lineTo(8, 2);
          graphics.lineTo(2, 8);
          graphics.closePath();
          graphics.fill();
        } else if (biome < 0.3) {
          // Mud patches
          graphics.fillStyle(0x4a3a2a, 0.35);
          graphics.fillEllipse(0, 0, 12, 8);
          graphics.fillStyle(0x5a4a3a, 0.25);
          graphics.fillEllipse(4, 3, 8, 6);
        } else {
          // Grass clumps
          graphics.fillStyle(0x4a5a3a, 0.4);
          for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const dist = 6 + Math.random() * 3;
            graphics.fillRect(
              Math.cos(angle) * dist - 1,
              Math.sin(angle) * dist - 3,
              2, 6
            );
          }
        }
        
        graphics.restore();
      }
    }
  }
  
  private drawFineDetails(graphics: Phaser.GameObjects.Graphics, tilesX: number, tilesY: number,
                         tileSize: number, cache: any): void {
    // Fine details for texture and depth
    const dotSize = 1.5;
    
    for (let x = 0; x < tilesX; x += 3) { // Every third tile
      for (let y = 0; y < tilesY; y += 3) {
        const idx = y * tilesX + x;
        const detail = cache.detail[idx];
        const biome = cache.biome[idx];
        
        if (detail < 0.3) continue;
        
        const baseX = x * tileSize;
        const baseY = y * tileSize;
        
        // Scatter fine details within tile
        for (let i = 0; i < 4; i++) {
          const offsetX = Math.random() * tileSize;
          const offsetY = Math.random() * tileSize;
          
          if (biome > 0.7) {
            // Sand/dust particles
            graphics.fillStyle(0xC4A484, 0.2 + detail * 0.2);
            graphics.fillCircle(baseX + offsetX, baseY + offsetY, dotSize);
          } else if (biome < 0.2) {
            // Water droplets
            graphics.fillStyle(0x7a9aaa, 0.3);
            graphics.fillCircle(baseX + offsetX, baseY + offsetY, dotSize * 0.8);
          } else {
            // Dirt specks
            graphics.fillStyle(0x5a4a3a, 0.25);
            graphics.fillRect(baseX + offsetX, baseY + offsetY, dotSize, dotSize);
          }
        }
      }
    }
  }
  
  private drawAmbientEffects(graphics: Phaser.GameObjects.Graphics, tilesX: number, tilesY: number,
                            tileSize: number, cache: any): void {
    // Large-scale ambient lighting and shadows
    const lightSize = tileSize * 4;
    
    for (let x = 0; x < tilesX; x += 8) { // Large spacing
      for (let y = 0; y < tilesY; y += 8) {
        const idx = y * tilesX + x;
        const elevation = cache.elevation[idx];
        const detail = cache.detail[idx];
        
        const centerX = x * tileSize + lightSize / 2;
        const centerY = y * tileSize + lightSize / 2;
        
        if (elevation > 0.7 && detail > 0.6) {
          // Bright spots on high ground - use multiple circles for gradient effect
          for (let r = lightSize; r > 0; r -= lightSize / 8) {
            const alpha = 0.1 * (1 - r / lightSize);
            graphics.fillStyle(0xffffcc, alpha);
            graphics.fillCircle(centerX, centerY, r);
          }
        } else if (elevation < 0.4) {
          // Dark shadows in low areas - use multiple circles
          const shadowSize = lightSize * 0.8;
          for (let r = shadowSize; r > 0; r -= shadowSize / 6) {
            const alpha = 0.15 * (1 - r / shadowSize);
            graphics.fillStyle(0x000000, alpha);
            graphics.fillCircle(centerX, centerY, r);
          }
        }
      }
    }
  }
  
  private spawnInitialEnemies(): void {
    // Spawn 3-4 enemies immediately around the player for instant action
    const playerPos = this.player.getPosition();
    const enemyCount = 3 + Math.floor(Math.random() * 2); // 3-4 enemies
    
    // Get basic enemy type for initial spawn
    const basicEnemyType = ENEMY_TYPES.basic;
    
    for (let i = 0; i < enemyCount; i++) {
      // Spawn at close but safe distance (visible but not overlapping)
      const angle = (i / enemyCount) * Math.PI * 2;
      const distance = 150 + Math.random() * 50; // 150-200 pixels away
      
      const x = playerPos.x + Math.cos(angle) * distance;
      const y = playerPos.y + Math.sin(angle) * distance;
      
      // Manually spawn enemy using spawn system
      const enemy = this.spawnSystem.spawnEnemyAt(x, y, basicEnemyType);
    }
  }
  
  private createDiscoveryChest(worldWidth: number, worldHeight: number): void {
    // Place chest at an interesting but reachable location
    // Position it northeast of spawn point - visible but requires exploration
    const playerStartX = worldWidth / 2;
    const playerStartY = worldHeight / 2;
    
    const chestX = playerStartX + 200; // 200 pixels northeast 
    const chestY = playerStartY - 150;
    
    this.discoveryChest = new DiscoveryChest(this, chestX, chestY);
  }
  
  // Old methods removed - now using optimized texture generation

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
    const timeScale = this.timeDilationManager.getCurrentTimeScale();
    this.movementSystem.update(delta, this.player, enemies, timeScale, this.wallSystem);
    this.spawnSystem.update(this.survivalTime, this.player.getPosition());
    this.collisionSystem.update(this.accumulatedTime, this.player, enemies);
    this.weaponSystem.update(delta, this.accumulatedTime, this.player, enemies);
    this.weaponEffectSystem.update(delta, this.player);
    this.ballSystem.update(delta, this.player, enemies, this.wallSystem);
    
    // Update discovery chest
    if (this.discoveryChest && !this.discoveryChest.isCollected) {
      this.discoveryChest.update(delta);
      
      // Check if player is near chest
      if (this.discoveryChest.isPlayerNear(this.player.getPosition())) {
        this.discoveryChest.collect(() => {
          // Resume game when reward window closes
          this.scene.resume();
          this.onDiscoveryChestCollected();
        });
      }
    }
    
    // New clean architecture is mostly event-driven, minimal update needed
    // Input handler updates automatically via Phaser input events
    
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
    
    // HP Text - small and clean with safe area support
    const safeAreaTop = this.isMobile ? MobileConfig.ui.safeAreaInsets.top : 0;
    this.healthText = this.add.text(padding, padding + safeAreaTop, '', {
      fontSize: fontSize,
      color: '#F5DEB3', // Warm wheat color for farm theme
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
      color: '#F5DEB3', // Warm wheat color for farm theme
      fontFamily: 'monospace'
    });
    this.levelText.setOrigin(1, 0);
    this.levelText.setScrollFactor(0);
    this.levelText.setDepth(101);
    this.levelText.setAlpha(0.9);
    
    // Time - center top, large and clean
    this.timeText = this.add.text(this.scale.width / 2, padding, '', {
      fontSize: this.isMobile ? '24px' : '20px',
      color: '#F5DEB3', // Warm wheat color for farm theme
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
    
    // Update health bar - prominent bar under HP text with safe area support
    this.healthBar.clear();
    const healthPercent = this.player.health / this.player.maxHealth;
    const barWidth = this.isMobile ? 120 : 100;
    const barHeight = this.isMobile ? 6 : 4;
    const safeAreaTop = this.isMobile ? MobileConfig.ui.safeAreaInsets.top : 0;
    const barY = padding + 22 + safeAreaTop;
    
    // HP bar background - warm farm-themed colors
    this.healthBar.fillStyle(0x8B4513, 0.8); // Brown farm background
    this.healthBar.fillRect(padding, barY, barWidth, barHeight);
    this.healthBar.lineStyle(1, 0xA0522D, 0.8); // Lighter brown border
    this.healthBar.strokeRect(padding, barY, barWidth, barHeight);
    
    // HP bar fill with farm-themed color coding
    if (healthPercent > 0) {
      const color = healthPercent > 0.6 ? 0x228B22 : healthPercent > 0.3 ? 0xFFD700 : 0xDC143C; // Forest green, gold, crimson
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
    
    // Update XP bar - prominent bar at bottom of screen with safe area support
    this.xpBar.clear();
    const xpPercent = this.player.getXPProgress();
    const xpHeight = this.isMobile ? MobileConfig.ui.xpBarHeight : 6;
    
    // Account for mobile safe area bottom inset
    const safeAreaBottom = this.isMobile ? MobileConfig.ui.safeAreaInsets.bottom : 0;
    const xpY = this.scale.height - xpHeight - safeAreaBottom;
    
    // XP bar background - warm farm-themed colors
    this.xpBar.fillStyle(0x8B4513, 0.8); // Brown farm background
    this.xpBar.fillRect(0, xpY, this.scale.width, xpHeight);
    this.xpBar.lineStyle(1, 0xA0522D, 0.8); // Lighter brown border
    this.xpBar.strokeRect(0, xpY, this.scale.width, xpHeight);
    
    // XP fill - golden harvest color with warm glow
    if (xpPercent > 0) {
      this.xpBar.fillStyle(0xFFD700, 1.0); // Golden yellow for farm experience
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
    
    // Initialize clean aiming architecture for mobile
    this.aimingInputHandler = new AimingInputHandler(this);
    this.aimingVisualizer = new AimingVisualizer(this);
    this.setupAimingEventListeners();
    console.log('Clean aiming architecture initialized for mobile!');
    
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
        // Instant heal + start regeneration if not already active
        this.player.health = Math.min(this.player.health + 10, this.player.maxHealth);
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
          const regenAmount = currentRegenLevel * 1.0; // 1 HP per second per level
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
  
  private onDiscoveryChestCollected(): void {
    // Apply the actual rewards (XP and health were already applied in the reward window)
    const rewardXP = this.player.experienceToNext * 0.5; // 50% of current level XP requirement
    this.player.addExperience(Math.floor(rewardXP));
    this.totalXP += Math.floor(rewardXP);
    
    // Health boost
    this.player.health = Math.min(this.player.maxHealth, this.player.health + 20);
    
    // Discovery chest rewards applied successfully
  }
  
  // Clean event-driven communication setup
  private setupAimingEventListeners(): void {
    if (!this.aimingInputHandler || !this.aimingVisualizer || !this.inputModeManager) {
      console.log('❌ Missing components for aiming setup:', {
        aimingInputHandler: !!this.aimingInputHandler,
        aimingVisualizer: !!this.aimingVisualizer,
        inputModeManager: !!this.inputModeManager
      });
      return;
    }
    
    console.log('🎯 Setting up aiming event listeners');
    
    // Input handler → Mode manager (start aiming)
    this.aimingInputHandler.on('aim-start', (startPos) => {
      console.log('🎯 GameScene: Received aim-start event');
      
      // Get actual weapon range and update visualizer
      const weaponRange = this.getKickWeaponRange();
      this.aimingVisualizer?.updateRange(weaponRange);
      
      this.inputModeManager.switchToAiming();
      this.timeDilationManager.enterDilation();
      this.aimingVisualizer?.showAiming();
    });
    
    // Input handler → Visualizer (update direction)
    this.aimingInputHandler.on('aim-update', (direction, startPos) => {
      const playerPos = this.player.getPosition();
      const enemies = this.spawnSystem.getActiveEnemies();
      this.aimingVisualizer?.updateAimingVisuals(playerPos, startPos, direction, enemies);
      this.inputModeManager.setAimDirection(direction);
    });
    
    // Input handler → Mode manager (complete aiming)
    this.aimingInputHandler.on('aim-complete', (direction) => {
      this.inputModeManager.requestManualFire(direction);
    });
    
    // Input handler → Mode manager (cancel aiming)
    this.aimingInputHandler.on('aim-cancel', () => {
      this.inputModeManager.switchToAutoTarget();
      this.timeDilationManager.exitDilation();
      this.aimingVisualizer?.hideAiming();
    });
    
    // Mode manager → Weapon system (mode changes)
    this.inputModeManager.on('mode-changed', (mode) => {
      this.weaponSystem.setInputMode(mode);
      if (mode === 'AUTO_TARGET') {
        this.timeDilationManager.exitDilation();
        this.aimingVisualizer?.hideAiming();
      }
    });
    
    // Mode manager → Weapon system (manual fire)
    this.inputModeManager.on('manual-fire-requested', (direction) => {
      const enemies = this.spawnSystem.getActiveEnemies();
      this.weaponSystem.fireInDirection(direction, this.player, enemies);
    });
  }
  
  private getKickWeaponRange(): number {
    // Get the first available kick weapon range
    const weapons = (this.weaponSystem as any).weapons;
    if (weapons && weapons.length > 0) {
      const kickWeapon = weapons.find((weapon: any) => {
        const behaviorName = weapon.behavior.constructor.name;
        return behaviorName === 'DirectedKickBehavior' || behaviorName === 'BrAttackBehavior';
      });
      if (kickWeapon) {
        return kickWeapon.range;
      }
    }
    // Fallback to basic kick range
    return 30;
  }
  
  private createFarmEnvironment(worldWidth: number, worldHeight: number): void {
    // Create beautiful farm environment with houses, trees, and crops
    const environmentSpacing = 200; // Space between major elements
    
    // Add farm houses scattered throughout the world
    for (let x = 300; x < worldWidth - 300; x += environmentSpacing * 2) {
      for (let y = 300; y < worldHeight - 300; y += environmentSpacing * 2) {
        // Add some randomness to positioning
        const offsetX = (Math.random() - 0.5) * 100;
        const offsetY = (Math.random() - 0.5) * 100;
        
        const house = this.add.image(x + offsetX, y + offsetY, 'farm-house');
        house.setScale(3); // Scale up the 16px house
        house.setDepth(-5); // Behind entities but in front of background
      }
    }
    
    // Add maple trees throughout the world
    for (let x = 150; x < worldWidth - 150; x += environmentSpacing) {
      for (let y = 150; y < worldHeight - 150; y += environmentSpacing) {
        // Add randomness to tree positioning
        const offsetX = (Math.random() - 0.5) * 80;
        const offsetY = (Math.random() - 0.5) * 80;
        
        const tree = this.add.image(x + offsetX, y + offsetY, 'maple-tree');
        tree.setScale(4); // Scale up the 16px tree
        tree.setDepth(-3); // In front of houses but behind entities
      }
    }
    
    // Add spring crops in patches
    for (let x = 400; x < worldWidth - 400; x += environmentSpacing * 1.5) {
      for (let y = 400; y < worldHeight - 400; y += environmentSpacing * 1.5) {
        // Create crop patches (3x3 grid of crops)
        for (let cropX = -1; cropX <= 1; cropX++) {
          for (let cropY = -1; cropY <= 1; cropY++) {
            const offsetX = (Math.random() - 0.5) * 30;
            const offsetY = (Math.random() - 0.5) * 30;
            
            const crop = this.add.image(
              x + cropX * 40 + offsetX, 
              y + cropY * 40 + offsetY, 
              'spring-crops'
            );
            crop.setScale(2.5); // Scale up the 16px crops
            crop.setDepth(-8); // Behind everything except background
          }
        }
      }
    }
    
    // Add decorative fences
    for (let x = 250; x < worldWidth - 250; x += environmentSpacing * 3) {
      for (let y = 250; y < worldHeight - 250; y += environmentSpacing * 3) {
        const offsetX = (Math.random() - 0.5) * 150;
        const offsetY = (Math.random() - 0.5) * 150;
        
        const fence = this.add.image(x + offsetX, y + offsetY, 'farm-fence');
        fence.setScale(3);
        fence.setDepth(-6);
      }
    }
    
    // Add interior decorations near houses
    for (let x = 350; x < worldWidth - 350; x += environmentSpacing * 2.5) {
      for (let y = 350; y < worldHeight - 350; y += environmentSpacing * 2.5) {
        const offsetX = (Math.random() - 0.5) * 60;
        const offsetY = (Math.random() - 0.5) * 60;
        
        if (Math.random() > 0.6) { // 40% chance for interior items
          const interior = this.add.image(x + offsetX, y + offsetY, 'farm-interior');
          interior.setScale(2.5);
          interior.setDepth(-7);
        }
        
        if (Math.random() > 0.7) { // 30% chance for plates
          const plates = this.add.image(x + offsetX + 30, y + offsetY + 30, 'farm-plates');
          plates.setScale(2);
          plates.setDepth(-7);
        }
      }
    }
    
    console.log('🚜 Beautiful farm environment created with houses, trees, crops, and decorations!');
  }
}