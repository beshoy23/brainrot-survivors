import { GameObjects, Scene } from 'phaser';
import { GameConfig } from '../config/game';
import { Vector2 } from '../utils/Vector2';
import { EnemyTypeConfig } from '../enemies/EnemyType';
import { ENEMY_TYPES } from '../config/enemyTypes';
import { NoiseGenerator } from '../utils/NoiseGenerator';
import { EnemyVariationConfig as VariationConfig } from '../config/enemyVariations';

export class Enemy {
  public sprite: GameObjects.Sprite;
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
  
  // Visual variation properties
  private variations: {
    hue: number;        // Color hue shift (-1 to 1)
    saturation: number; // Color saturation multiplier (0.5 to 1.5)
    brightness: number; // Color brightness multiplier (0.8 to 1.2)
    scale: number;      // Size multiplier (0.9 to 1.1)
    aggression: number; // Behavior modifier (0 to 1)
    features: number;   // Feature variation seed (0 to 1)
    biomeValue: number; // Cached biome value at spawn location
    glowPhase: number;  // Cached animation phase for swarm
  } = {
    hue: 0,
    saturation: 1,
    brightness: 1,
    scale: 1,
    aggression: 0.5,
    features: 0,
    biomeValue: 0.5,
    glowPhase: 0
  };
  
  // Static noise generator for all enemies
  private static noise: NoiseGenerator = new NoiseGenerator(42);
  
  constructor(scene: Scene) {
    this.scene = scene;
    this.sprite = scene.add.sprite(0, 0, 'red-warrior-idle', 0);
    this.sprite.setVisible(false);
    this.sprite.setActive(false);
    this.sprite.setScale(0.15); // Scale down from 192px to ~29px
    
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
    
    // Generate variations using noise
    this.generateVariations(x, y);
    
    // Apply scale variation to hitbox
    this.hitboxRadius *= this.variations.scale;
    
    // Apply aggression to stats
    this.speed *= (1 + this.variations.aggression * 0.2); // Up to 20% faster
    this.damage = Math.ceil(this.damage * (1 + this.variations.aggression * 0.1)); // Up to 10% more damage
    
    // Set up sprite based on enemy type
    this.setupEnemySprite();
    
    this.sprite.setPosition(x, y);
    this.sprite.setVisible(true);
    this.sprite.setActive(true);
    this.sprite.setDepth(8); // Below player (10) but visible
    
    // Apply scale with base sprite scale
    const baseScale = this.getBaseScale();
    this.sprite.setScale(baseScale * this.variations.scale);
    
    // Start idle animation
    this.playIdleAnimation();
  }
  
  private generateVariations(x: number, y: number): void {
    // Use position and time as noise inputs for unique variations
    const timeNoise = this.spawnTime * VariationConfig.noise.timeScale;
    const posScale = VariationConfig.noise.positionScale;
    
    // Color variations using config values
    this.variations.hue = Enemy.noise.octaveNoise(x * posScale, y * posScale, 2, 0.5, 0.1) * 2 - 1;
    this.variations.saturation = VariationConfig.color.saturationMin + 
      Enemy.noise.octaveNoise(x * posScale * 2, timeNoise, 1, 0.5, 0.1) * 
      (VariationConfig.color.saturationMax - VariationConfig.color.saturationMin);
    this.variations.brightness = VariationConfig.color.brightnessMin + 
      Enemy.noise.octaveNoise(timeNoise, y * posScale * 2, 1, 0.5, 0.1) * 
      (VariationConfig.color.brightnessMax - VariationConfig.color.brightnessMin);
    
    // Size variation (subtle)
    const sizeNoise = Enemy.noise.octaveNoise(x * posScale * 3, y * posScale * 3, 1, 0.5, 0.2);
    this.variations.scale = VariationConfig.size.scaleMin + 
      sizeNoise * (VariationConfig.size.scaleMax - VariationConfig.size.scaleMin);
    
    // Aggression (affects behavior and appearance)
    this.variations.aggression = Enemy.noise.octaveNoise(x * posScale, timeNoise * 2, 2, 0.5, 0.05);
    
    // Features seed for visual details
    this.variations.features = Enemy.noise.octaveNoise(timeNoise * 3, y * posScale, 1, 0.5, 0.3);
    
    // Biome-based adaptations (cache the biome value at spawn)
    this.variations.biomeValue = Enemy.noise.octaveNoise(
      x * VariationConfig.noise.biomeScale, 
      y * VariationConfig.noise.biomeScale, 
      2, 0.5, 0.01
    );
    
    if (this.variations.biomeValue > VariationConfig.biome.rockyThreshold) {
      // Rocky/desert biome - more armored appearance
      this.variations.brightness *= VariationConfig.biome.rockyBrightness;
      this.variations.saturation *= VariationConfig.biome.rockySaturation;
      this.variations.features = Math.max(0.5, this.variations.features); // More likely to have features
    } else if (this.variations.biomeValue < VariationConfig.biome.wetThreshold) {
      // Wet/swamp biome - glossy appearance
      this.variations.brightness *= VariationConfig.biome.wetBrightness;
      this.variations.saturation *= VariationConfig.biome.wetSaturation;
      this.variations.hue += VariationConfig.biome.wetHueShift;
    }
    
    // Cache animation phase for swarm enemies
    if (this.enemyType.id === 'swarm') {
      // Use noise for consistent group behavior
      const phaseNoise = Enemy.noise.octaveNoise(x * 0.01, y * 0.01, 1, 0.5, 0.1);
      this.variations.glowPhase = phaseNoise * Math.PI * 2; // Noise-based starting phase
    }
    
    // Enemy type specific variations
    switch (this.enemyType.id) {
      case 'swarm':
        // Swarm enemies have more synchronized variations
        const swarmSizeVariation = Enemy.noise.octaveNoise(x * 0.05, y * 0.05, 1, 0.5, 0.3);
        this.variations.scale *= 0.8 + swarmSizeVariation * 0.4; // More size variety using noise
        break;
      case 'tank':
        // Tanks have less size variation but stay bulky
        this.variations.scale = VariationConfig.size.tankScaleBase + 
          (this.variations.scale - VariationConfig.size.scaleMin) * 0.5;
        this.variations.hue *= 0.5; // Less color variety to maintain tank identity
        this.variations.brightness = Math.max(0.7, this.variations.brightness * 0.9); // Always dark
        break;
      case 'elite':
        // Elites are always imposing and distinct
        this.variations.scale = Math.max(VariationConfig.size.eliteMinScale, this.variations.scale);
        this.variations.aggression = Math.max(VariationConfig.color.aggressionThreshold, this.variations.aggression);
        this.variations.hue *= 0.3; // Minimal color variation to keep purple identity
        break;
      case 'basic':
        // Basic enemies maintain red identity
        this.variations.hue *= 0.7; // Reduce hue variation to stay reddish
        break;
      case 'fast':
        // Fast enemies stay greenish
        this.variations.hue *= 0.5; // Reduce hue variation
        this.variations.brightness = Math.min(1.3, this.variations.brightness * 1.1); // Slightly brighter
        break;
    }
  }
  
  private setupEnemySprite(): void {
    // Set sprite texture based on enemy type
    let idleTexture: string;
    
    switch (this.enemyType.id) {
      case 'basic':
        idleTexture = 'red-warrior-idle';
        break;
      case 'fast':
        idleTexture = 'red-archer-idle';
        break;
      case 'tank':
        idleTexture = 'red-lancer-idle';
        break;
      case 'elite':
        idleTexture = 'black-warrior-idle';
        break;
      case 'swarm':
        idleTexture = 'yellow-monk-idle';
        break;
      default:
        idleTexture = 'red-warrior-idle';
    }
    
    this.sprite.setTexture(idleTexture, 0);
    this.createEnemyAnimations();
  }
  
  private getBaseScale(): number {
    // Different base scales for different enemy types
    switch (this.enemyType.id) {
      case 'basic':
        return 0.15; // Red warrior: 192px -> ~29px
      case 'fast':
        return 0.12; // Red archer: smaller/faster
      case 'tank':
        return 0.12; // Red lancer: 320px -> ~38px 
      case 'elite':
        return 0.18; // Black warrior: larger/imposing
      case 'swarm':
        return 0.1;  // Yellow monk: smallest
      default:
        return 0.15;
    }
  }
  
  private createEnemyAnimations(): void {
    const scene = this.scene;
    const enemyId = this.enemyType.id;
    
    // Create idle animation for this enemy type
    const idleKey = `${enemyId}-idle-anim`;
    const runKey = `${enemyId}-run-anim`;
    
    if (!scene.anims.exists(idleKey)) {
      let spriteKey: string;
      let frameCount: number;
      
      switch (enemyId) {
        case 'basic':
          spriteKey = 'red-warrior-idle';
          frameCount = 7; // 8 frames (0-7)
          break;
        case 'fast':
          spriteKey = 'red-archer-idle';
          frameCount = 5; // 6 frames (0-5)
          break;
        case 'tank':
          spriteKey = 'red-lancer-idle';
          frameCount = 11; // 12 frames (0-11)
          break;
        case 'elite':
          spriteKey = 'black-warrior-idle';
          frameCount = 7; // 8 frames (0-7)
          break;
        case 'swarm':
          spriteKey = 'yellow-monk-idle';
          frameCount = 7; // 8 frames (0-7)
          break;
        default:
          spriteKey = 'red-warrior-idle';
          frameCount = 7;
      }
      
      scene.anims.create({
        key: idleKey,
        frames: scene.anims.generateFrameNumbers(spriteKey, { 
          start: 0, 
          end: frameCount 
        }),
        frameRate: 6,
        repeat: -1
      });
    }
    
    // Create run animation (simplified - using idle for now)
    if (!scene.anims.exists(runKey)) {
      let runSpriteKey: string;
      let runFrameCount: number;
      
      switch (enemyId) {
        case 'basic':
          runSpriteKey = 'red-warrior-run';
          runFrameCount = 7;
          break;
        case 'fast':
          runSpriteKey = 'red-archer-run';
          runFrameCount = 5;
          break;
        case 'tank':
          runSpriteKey = 'red-lancer-run';
          runFrameCount = 11;
          break;
        case 'elite':
          runSpriteKey = 'black-warrior-run';
          runFrameCount = 7;
          break;
        case 'swarm':
          runSpriteKey = 'yellow-monk-run';
          runFrameCount = 7;
          break;
        default:
          runSpriteKey = 'red-warrior-run';
          runFrameCount = 7;
      }
      
      scene.anims.create({
        key: runKey,
        frames: scene.anims.generateFrameNumbers(runSpriteKey, { 
          start: 0, 
          end: runFrameCount 
        }),
        frameRate: 10,
        repeat: -1
      });
    }
  }
  
  private playIdleAnimation(): void {
    const animKey = `${this.enemyType.id}-idle-anim`;
    this.sprite.play(animKey);
  }
  
  // Removed graphics drawing methods - now using animated sprites

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
    
    // Update animations and facing direction
    this.updateEnemyAnimation(moveX, moveY);
  }
  
  private updateEnemyAnimation(moveX: number, moveY: number): void {
    // Update facing direction
    if (moveX > 0) {
      this.sprite.setFlipX(false); // Face right
    } else if (moveX < 0) {
      this.sprite.setFlipX(true);  // Face left
    }
    
    // Play running animation when moving, idle when stopped
    const isMoving = moveX !== 0 || moveY !== 0;
    const currentAnim = this.sprite.anims.currentAnim?.key;
    const idleKey = `${this.enemyType.id}-idle-anim`;
    const runKey = `${this.enemyType.id}-run-anim`;
    
    if (isMoving && currentAnim !== runKey) {
      this.sprite.play(runKey);
    } else if (!isMoving && currentAnim !== idleKey) {
      this.sprite.play(idleKey);
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
    this.sprite.setScale(1); // Reset scale
    
    // Reset variations
    this.variations = {
      hue: 0,
      saturation: 1,
      brightness: 1,
      scale: 1,
      aggression: 0.5,
      features: 0,
      biomeValue: 0.5,
      glowPhase: 0
    };
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
}