import { GameObjects, Scene } from 'phaser';
import { GameConfig } from '../config/game';
import { Vector2 } from '../utils/Vector2';
import { EnemyTypeConfig } from '../enemies/EnemyType';
import { ENEMY_TYPES } from '../config/enemyTypes';
import { NoiseGenerator } from '../utils/NoiseGenerator';
import { EnemyVariationConfig as VariationConfig } from '../config/enemyVariations';

export class Enemy {
  public sprite: GameObjects.Graphics;
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
    this.sprite = scene.add.graphics();
    this.sprite.setVisible(false);
    this.sprite.setActive(false);
    
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
    
    this.sprite.setPosition(x, y);
    this.sprite.setVisible(true);
    this.sprite.setActive(true);
    this.sprite.setDepth(8); // Below player (10) but visible
    
    // Apply scale
    this.sprite.setScale(this.variations.scale);
    
    // Draw enemy based on type
    this.drawEnemy();
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
  
  drawEnemy(): void {
    this.sprite.clear();
    
    // Apply color variations using consistent HSV
    const baseColor = Phaser.Display.Color.IntegerToColor(this.enemyType.color);
    const hsv = Phaser.Display.Color.RGBToHSV(baseColor.red / 255, baseColor.green / 255, baseColor.blue / 255);
    
    // Apply variations with proper bounds checking
    hsv.h = (hsv.h + this.variations.hue * VariationConfig.color.hueShiftRange + 1) % 1; // Hue shift with proper wrapping
    hsv.s = Math.max(0, Math.min(1, hsv.s * this.variations.saturation)); // Saturation clamped to [0,1]
    hsv.v = Math.max(0, Math.min(1, hsv.v * this.variations.brightness)); // Value/Brightness clamped to [0,1]
    
    // More aggressive = darker and more saturated (not redder to avoid confusion)
    if (this.variations.aggression > VariationConfig.color.aggressionThreshold) {
      hsv.s = Math.min(1, hsv.s * VariationConfig.color.aggressionSatBoost); // More saturated
      hsv.v = Math.max(0.3, hsv.v * VariationConfig.color.aggressionBrightness); // Darker
    }
    
    const variedColor = Phaser.Display.Color.HSVToRGB(hsv.h, hsv.s, hsv.v);
    const finalColor = Phaser.Display.Color.GetColor(
      Math.floor(variedColor.r * 255),
      Math.floor(variedColor.g * 255),
      Math.floor(variedColor.b * 255)
    );
    
    this.sprite.fillStyle(finalColor, 1);
    this.sprite.lineStyle(2, 0xffffff, 0.3); // White outline
    
    const size = this.enemyType.size;
    const halfSize = size / 2;
    
    switch (this.enemyType.shape) {
      case 'square':
        this.sprite.fillRect(-halfSize, -halfSize, size, size);
        this.sprite.strokeRect(-halfSize, -halfSize, size, size);
        break;
        
      case 'circle':
        this.sprite.fillCircle(0, 0, halfSize);
        this.sprite.strokeCircle(0, 0, halfSize);
        break;
        
      case 'diamond':
        this.sprite.beginPath();
        this.sprite.moveTo(0, -halfSize);
        this.sprite.lineTo(halfSize, 0);
        this.sprite.lineTo(0, halfSize);
        this.sprite.lineTo(-halfSize, 0);
        this.sprite.closePath();
        this.sprite.fill();
        this.sprite.stroke();
        break;
        
      case 'triangle':
        this.sprite.beginPath();
        this.sprite.moveTo(0, -halfSize);
        this.sprite.lineTo(halfSize, halfSize);
        this.sprite.lineTo(-halfSize, halfSize);
        this.sprite.closePath();
        this.sprite.fill();
        this.sprite.stroke();
        break;
    }
    
    // Add variation-based features
    this.drawVariationFeatures();
    
    // Add biome-based visual effects
    this.drawBiomeEffects();
  }
  
  private drawVariationFeatures(): void {
    const size = this.enemyType.size;
    const halfSize = size / 2;
    
    // Feature intensity based on variation
    const featureAlpha = 0.3 + this.variations.features * 0.4;
    
    switch (this.enemyType.id) {
      case 'basic':
        // Battle scars for basic enemies
        if (this.variations.features > 0.5) {
          this.sprite.lineStyle(1, 0x000000, featureAlpha);
          this.sprite.beginPath();
          this.sprite.moveTo(-halfSize * 0.7, -halfSize * 0.7);
          this.sprite.lineTo(-halfSize * 0.3, -halfSize * 0.3);
          this.sprite.strokePath();
        }
        break;
        
      case 'fast':
        // Ghostly trail effect
        if (this.variations.features > 0.3) {
          this.sprite.fillStyle(0x00ff00, featureAlpha * 0.3);
          this.sprite.fillCircle(-halfSize * 0.3, 0, halfSize * 0.4);
          this.sprite.fillCircle(-halfSize * 0.6, 0, halfSize * 0.3);
        }
        break;
        
      case 'tank':
        // Armor plating
        if (this.variations.features > 0.4) {
          this.sprite.lineStyle(1, 0x400000, featureAlpha);
          // Draw armor lines
          for (let i = 0; i < 3; i++) {
            const y = -halfSize * 0.5 + (i * halfSize * 0.5);
            this.sprite.moveTo(-halfSize * 0.8, y);
            this.sprite.lineTo(halfSize * 0.8, y);
          }
          this.sprite.strokePath();
        }
        // Rust spots
        if (this.variations.features > 0.7) {
          this.sprite.fillStyle(0x8B4513, featureAlpha * 0.5);
          this.sprite.fillCircle(halfSize * 0.5, -halfSize * 0.3, 3);
          this.sprite.fillCircle(-halfSize * 0.4, halfSize * 0.4, 2);
        }
        break;
        
      case 'swarm':
        // Pack markings - synchronized glow using cached phase
        if (this.variations.aggression > 0.6) {
          const glowIntensity = Math.sin((Date.now() * 0.003) + this.variations.glowPhase) * 0.5 + 0.5;
          this.sprite.fillStyle(0xffff00, glowIntensity * featureAlpha);
          this.sprite.fillCircle(0, 0, halfSize * 0.3);
        }
        break;
        
      case 'elite':
        // Intimidation aura
        this.sprite.lineStyle(3, 0x9400D3, featureAlpha * 0.7);
        this.sprite.strokeCircle(0, 0, halfSize + 4);
        // Power crystals
        if (this.variations.features > 0.5) {
          this.sprite.fillStyle(0xE6E6FA, featureAlpha);
          const crystalSize = 3;
          this.sprite.fillRect(-halfSize - crystalSize, -halfSize * 0.5, crystalSize, crystalSize * 2);
          this.sprite.fillRect(halfSize, -halfSize * 0.5, crystalSize, crystalSize * 2);
        }
        break;
    }
  }
  
  private drawBiomeEffects(): void {
    // Use cached biome value
    const biomeValue = this.variations.biomeValue;
    const size = this.enemyType.size;
    const halfSize = size / 2;
    
    if (biomeValue > 0.6) {
      // Rocky biome - dust particles
      this.sprite.fillStyle(0xC4A484, 0.3);
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + this.variations.features;
        const dist = halfSize * 0.8;
        this.sprite.fillCircle(
          Math.cos(angle) * dist,
          Math.sin(angle) * dist,
          1.5
        );
      }
    } else if (biomeValue < 0.3) {
      // Wet biome - water droplets/shine
      this.sprite.fillStyle(0xADD8E6, 0.4);
      this.sprite.fillCircle(-halfSize * 0.3, -halfSize * 0.3, 2);
      // Glossy highlight
      this.sprite.lineStyle(1, 0xE0FFFF, 0.3);
      this.sprite.strokeCircle(0, 0, halfSize * 0.9);
    }
  }

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