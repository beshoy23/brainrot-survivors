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
  // Add x, y, radius getters for GridEntity interface
  public get x(): number { return this.sprite.x; }
  public get y(): number { return this.sprite.y; }
  public get radius(): number { return this.hitboxRadius; }
  
  public setPosition(x: number, y: number): void {
    this.sprite.x = x;
    this.sprite.y = y;
  }
  public movementType: 'homing' | 'straight'; // VS-style: swarm moves straight, others home
  public movementAngle: number; // For straight-line movement
  public spawnTime: number; // Track when spawned for despawning
  public isDying: boolean = false; // Track if enemy is playing death animation
  // Knockback properties
  public knockbackVelocity: Vector2 = new Vector2();
  public knockbackDecay: number = 0.94; // Slower decay for longer flying distance
  public isKnockedBack: boolean = false; // Can this enemy hit other enemies?
  private knockbackThreshold: number = 80; // Lower threshold for longer projectile state
  
  // Visual trail for knocked-back enemies
  private trailPoints: Array<{x: number, y: number, alpha: number}> = [];
  private lastTrailTime: number = 0;
  private trailGraphics?: GameObjects.Graphics;
  
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
    this.sprite = scene.add.sprite(0, 0, 'zombie-male-idle', 0);
    this.sprite.setVisible(false);
    this.sprite.setActive(false);
    this.sprite.setScale(0.8); // Scale down slightly from 64px
    
    // Create trail graphics
    this.trailGraphics = scene.add.graphics();
    this.trailGraphics.setVisible(false);
    this.trailGraphics.setDepth(this.sprite.depth - 1); // Behind enemy
    
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
    // Set sprite texture based on enemy type - mix of zombies and medieval warriors
    let idleTexture: string;
    
    switch (this.enemyType.id) {
      case 'basic':
        idleTexture = 'zombie-male-idle';     // Male zombie for basic
        break;
      case 'fast':
        idleTexture = 'zombie-female-idle';   // Female zombie for fast
        break;
      case 'tank':
        idleTexture = 'black-warrior-idle';   // Black warrior for tank (armored)
        break;
      case 'elite':
        idleTexture = 'red-lancer-idle';      // Red lancer for elite (imposing)
        break;
      case 'swarm':
        idleTexture = 'yellow-monk-idle';     // Yellow monk for swarm (agile)
        break;
      default:
        idleTexture = 'zombie-male-idle';
    }
    
    this.sprite.setTexture(idleTexture, 0);
    this.createEnemyAnimations();
    this.applyEnemyTinting();
  }
  
  private getBaseScale(): number {
    // Different base scales for different enemy sprites
    switch (this.enemyType.id) {
      case 'basic':
        return 0.8;  // Male zombie: normal size (53×64)
      case 'fast':
        return 0.7;  // Female zombie: smaller/faster (58×64)
      case 'tank':
        return 0.4;  // Black warrior: large but scaled down (192×192)
      case 'elite':
        return 0.25; // Red lancer: very large sprite, scale way down (320×320)
      case 'swarm':
        return 0.3;  // Yellow monk: medium sprite, scale down (192×192)
      default:
        return 0.8;
    }
  }
  
  private createEnemyAnimations(): void {
    const scene = this.scene;
    const enemyId = this.enemyType.id;
    
    // Determine sprite type and configurations
    const spriteConfig = this.getSpriteConfig();
    
    // Create animations for this enemy type
    const animations = ['idle', 'walk'];
    
    animations.forEach(anim => {
      const animKey = `${enemyId}-${anim}-anim`;
      
      if (!scene.anims.exists(animKey)) {
        let spriteKey: string;
        let frameCount: number;
        let frameRate: number;
        
        if (anim === 'idle') {
          spriteKey = spriteConfig.idleTexture;
          frameCount = spriteConfig.idleFrames - 1; // Convert to 0-based
          frameRate = spriteConfig.idleFrameRate;
        } else { // walk
          spriteKey = spriteConfig.walkTexture;
          frameCount = spriteConfig.walkFrames - 1; // Convert to 0-based
          frameRate = spriteConfig.walkFrameRate;
        }
        
        scene.anims.create({
          key: animKey,
          frames: scene.anims.generateFrameNumbers(spriteKey, { 
            start: 0, 
            end: frameCount 
          }),
          frameRate: frameRate,
          repeat: -1 // All animations loop
        });
      }
    });
  }
  
  private getSpriteConfig() {
    // Return sprite configuration based on enemy type
    switch (this.enemyType.id) {
      case 'basic':
        return {
          idleTexture: 'zombie-male-idle',
          walkTexture: 'zombie-male-walk',
          idleFrames: 15,
          walkFrames: 10,
          idleFrameRate: 4,
          walkFrameRate: 8
        };
      case 'fast':
        return {
          idleTexture: 'zombie-female-idle',
          walkTexture: 'zombie-female-walk',
          idleFrames: 15,
          walkFrames: 10,
          idleFrameRate: 4,
          walkFrameRate: 8
        };
      case 'tank':
        return {
          idleTexture: 'black-warrior-idle',
          walkTexture: 'black-warrior-run',
          idleFrames: 8,
          walkFrames: 8,
          idleFrameRate: 3,
          walkFrameRate: 6
        };
      case 'elite':
        return {
          idleTexture: 'red-lancer-idle',
          walkTexture: 'red-lancer-run',
          idleFrames: 12,
          walkFrames: 12,
          idleFrameRate: 3,
          walkFrameRate: 8
        };
      case 'swarm':
        return {
          idleTexture: 'yellow-monk-idle',
          walkTexture: 'yellow-monk-run',
          idleFrames: 6,
          walkFrames: 6,
          idleFrameRate: 4,
          walkFrameRate: 10
        };
      default:
        return {
          idleTexture: 'zombie-male-idle',
          walkTexture: 'zombie-male-walk',
          idleFrames: 15,
          walkFrames: 10,
          idleFrameRate: 4,
          walkFrameRate: 8
        };
    }
  }
  
  private applyEnemyTinting(): void {
    // Apply subtle color tints to enhance visual distinction
    switch (this.enemyType.id) {
      case 'basic':
        // Basic zombies: slight red tint
        this.sprite.setTint(0xffdddd);
        break;
      case 'fast':
        // Fast zombies: cyan tint (avoid gem color confusion)
        this.sprite.setTint(0xddffff);
        break;
      case 'tank':
        // Tank warriors: darker to emphasize armor
        this.sprite.setTint(0x999999);
        break;
      case 'elite':
        // Elite lancers: purple tint for elite status
        this.sprite.setTint(0xffddff);
        break;
      case 'swarm':
        // Swarm monks: light yellow for visibility
        this.sprite.setTint(0xffffdd);
        break;
      default:
        // No tint for default
        this.sprite.clearTint();
    }
  }
  
  private playIdleAnimation(): void {
    const animKey = `${this.enemyType.id}-idle-anim`;
    this.sprite.play(animKey);
  }
  
  // Removed graphics drawing methods - now using animated sprites

  applyKnockback(forceX: number, forceY: number): void {
    // Apply knockback force
    this.knockbackVelocity.x = forceX;
    this.knockbackVelocity.y = forceY;
    
    // Check if knockback is strong enough to make this enemy a projectile
    const knockbackMagnitude = Math.sqrt(forceX * forceX + forceY * forceY);
    this.isKnockedBack = knockbackMagnitude > this.knockbackThreshold;
  }
  
  private renderTrail(): void {
    if (!this.trailGraphics) return;
    
    this.trailGraphics.clear();
    
    if (this.trailPoints.length > 1) {
      this.trailGraphics.setVisible(true);
      
      // Draw trail as connected circles with fading alpha
      for (let i = 0; i < this.trailPoints.length; i++) {
        const point = this.trailPoints[i];
        const size = 3 + (i / this.trailPoints.length) * 2; // Growing size
        
        this.trailGraphics.fillStyle(0xFF6600, point.alpha); // Orange trail
        this.trailGraphics.fillCircle(point.x, point.y, size);
      }
    } else {
      this.trailGraphics.setVisible(false);
    }
  }

  update(deltaTime: number, playerPos: Vector2): void {
    if (!this.sprite.active) return;
    
    // ALWAYS apply knockback effects (even for dying enemies!)
    if (this.knockbackVelocity.x !== 0 || this.knockbackVelocity.y !== 0) {
      // Apply knockback to position
      this.sprite.x += this.knockbackVelocity.x * deltaTime / 1000;
      this.sprite.y += this.knockbackVelocity.y * deltaTime / 1000;
      
      // Create trail effect for knocked-back enemies
      if (this.isKnockedBack && Date.now() - this.lastTrailTime > 50) { // Every 50ms
        this.trailPoints.push({
          x: this.sprite.x,
          y: this.sprite.y,
          alpha: 0.8
        });
        this.lastTrailTime = Date.now();
        
        // Limit trail length
        if (this.trailPoints.length > 8) {
          this.trailPoints.shift();
        }
      }
      
      // Decay knockback over time
      this.knockbackVelocity.x *= this.knockbackDecay;
      this.knockbackVelocity.y *= this.knockbackDecay;
      
      // Stop knockback when it's negligible
      if (Math.abs(this.knockbackVelocity.x) < 1 && Math.abs(this.knockbackVelocity.y) < 1) {
        this.knockbackVelocity.set(0, 0);
        this.isKnockedBack = false; // No longer a projectile
        this.trailPoints = []; // Clear trail
      }
      
      // Check if still fast enough to be a projectile
      const currentMagnitude = Math.sqrt(this.knockbackVelocity.x * this.knockbackVelocity.x + 
                                        this.knockbackVelocity.y * this.knockbackVelocity.y);
      if (currentMagnitude < this.knockbackThreshold) {
        this.isKnockedBack = false;
        this.trailPoints = []; // Clear trail
      }
    }
    
    // Update trail alpha decay and render
    this.trailPoints.forEach(point => {
      point.alpha *= 0.95; // Fade trail points
    });
    this.trailPoints = this.trailPoints.filter(point => point.alpha > 0.1);
    
    // Render trail
    this.renderTrail();
    
    // Skip normal AI movement if dying (but knockback still works!)
    if (this.isDying) return;
    
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
    
    // Play walk animation when moving, idle when stopped
    const isMoving = moveX !== 0 || moveY !== 0;
    const currentAnim = this.sprite.anims.currentAnim?.key;
    const idleKey = `${this.enemyType.id}-idle-anim`;
    const walkKey = `${this.enemyType.id}-walk-anim`;
    
    if (isMoving && currentAnim !== walkKey) {
      this.sprite.play(walkKey);
    } else if (!isMoving && currentAnim !== idleKey) {
      this.sprite.play(idleKey);
    }
  }


  takeDamage(amount: number): boolean {
    if (this.isDying) return true; // Already dying, don't take more damage
    
    this.health -= amount;
    const isDeath = this.health <= 0;
    
    if (isDeath) {
      this.isDying = true;
      this.playDeathAnimation();
    }
    
    return isDeath;
  }
  
  private playDeathAnimation(): void {
    // Stop movement during death
    this.velocity.set(0, 0);
    
    // Only zombies have death animations
    if (this.enemyType.id === 'basic' || this.enemyType.id === 'fast') {
      const deathKey = `${this.enemyType.id}-dead-anim`;
      
      // Create death animation if it doesn't exist
      this.createDeathAnimation();
      
      // Switch to death texture and play animation
      const spriteConfig = this.getSpriteConfig();
      const deathTexture = spriteConfig.idleTexture.replace('-idle', '-dead');
      
      this.sprite.setTexture(deathTexture, 0);
      this.sprite.play(deathKey);
      
      // Reset after death animation
      this.scene.time.delayedCall(1500, () => {
        this.reset();
      });
    } else {
      // Medieval warriors just fade out quickly
      this.sprite.setAlpha(0.7);
      this.scene.time.delayedCall(500, () => {
        this.reset();
      });
    }
  }
  
  private createDeathAnimation(): void {
    const scene = this.scene;
    const enemyId = this.enemyType.id;
    const deathKey = `${enemyId}-dead-anim`;
    
    if (!scene.anims.exists(deathKey) && (enemyId === 'basic' || enemyId === 'fast')) {
      const spriteConfig = this.getSpriteConfig();
      const deathTexture = spriteConfig.idleTexture.replace('-idle', '-dead');
      
      scene.anims.create({
        key: deathKey,
        frames: scene.anims.generateFrameNumbers(deathTexture, { 
          start: 0, 
          end: 11 // 12 frames for death
        }),
        frameRate: 10,
        repeat: 0 // Play once
      });
    }
  }

  reset(): void {
    this.sprite.setVisible(false);
    this.sprite.setActive(false);
    this.sprite.setPosition(-100, -100);
    this.velocity.set(0, 0);
    this.movementType = 'homing';
    this.movementAngle = 0;
    this.spawnTime = 0;
    this.isDying = false; // Reset death state
    this.sprite.setScale(1); // Reset scale
    this.sprite.setAlpha(1); // Reset alpha for medieval warriors
    
    // Reset knockback and trail
    this.knockbackVelocity.set(0, 0);
    this.isKnockedBack = false;
    this.trailPoints = [];
    if (this.trailGraphics) {
      this.trailGraphics.clear();
      this.trailGraphics.setVisible(false);
    }
    
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
}