import { Scene } from 'phaser';
import { Player } from '../entities/Player';
import { XPGem } from '../entities/XPGem';
import { PoolManager } from '../managers/PoolManager';
import { GameConfig } from '../config/game';
import { SpatialGrid } from '../utils/SpatialGrid';

export class PickupSystem {
  private gemPool: PoolManager<XPGem>;
  private activeGems: Set<XPGem> = new Set();
  private spatialGrid: SpatialGrid<XPGem>;

  constructor(private scene: Scene) {
    // Initialize gem pool
    this.gemPool = new PoolManager(
      () => new XPGem(scene),
      (gem) => gem.reset(),
      100
    );
    
    // Initialize spatial grid for efficient pickup detection
    this.spatialGrid = new SpatialGrid(64, scene.scale.width * 2, scene.scale.height * 2);
  }

  spawnGem(x: number, y: number, value: number = 1): void {
    const gem = this.gemPool.acquire();
    gem.spawn(x, y, value);
    this.activeGems.add(gem);
  }

  update(deltaTime: number, player: Player): number {
    let xpCollected = 0;
    const playerX = player.sprite.x;
    const playerY = player.sprite.y;
    
    // Apply magnet range upgrade
    const upgradeManager = (window as any).upgradeManager;
    const magnetMultiplier = upgradeManager ? 
      (1 + (upgradeManager.getUpgradeLevel('xpMagnet') * 0.3)) : 1;
    
    const magnetRange = GameConfig.pickups.xpGem.magnetRange * magnetMultiplier;
    const collectRadius = GameConfig.pickups.xpGem.collectRadius;
    
    // Update spatial grid
    this.spatialGrid.clear();
    this.activeGems.forEach(gem => {
      if (gem.sprite.active) {
        this.spatialGrid.insert(gem);
      }
    });
    
    // Get gems near player
    const nearbyGems = this.spatialGrid.getNearby(playerX, playerY, magnetRange);
    
    // Calculate player's current speed (with upgrades)
    const speedMultiplier = upgradeManager ? 
      (1 + (upgradeManager.getUpgradeLevel('moveSpeed') * 0.1)) : 1;
    const playerSpeed = GameConfig.player.speed * speedMultiplier;
    
    // Update all active gems
    const gemsToRemove: XPGem[] = [];
    
    nearbyGems.forEach(gem => {
      if (!gem.sprite.active) return;
      
      // Check actual distance to player (spatial grid returns cells, not exact distance)
      const dx = playerX - gem.x;
      const dy = playerY - gem.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Fix for tab switch bug: Reset magnetic state for gems that are too far
      if (distance > magnetRange && gem.isMagnetic) {
        gem.resetMagneticState();
      }
      
      // Only update with magnetism if actually within range
      if (distance <= magnetRange) {
        gem.update(deltaTime, playerX, playerY, magnetRange, playerSpeed);
      } else {
        gem.update(deltaTime, playerX, playerY, 0, playerSpeed); // No magnetism
      }
      
      // Check collection
      if (distance < collectRadius) {
        gem.collect(); // Mark as being collected
        xpCollected += gem.value;
        gemsToRemove.push(gem);
        
        // VS-style collection effects
        this.createCollectionEffect(gem.x, gem.y);
        this.createXPPopup(gem.x, gem.y, gem.value);
      }
    });
    
    // Update non-nearby gems (just floating animation)
    this.activeGems.forEach(gem => {
      if (!nearbyGems.includes(gem) && gem.sprite.active) {
        // Fix for tab switch bug: Reset magnetic state for gems that are definitely far
        if (gem.isMagnetic) {
          gem.resetMagneticState();
        }
        gem.update(deltaTime, playerX, playerY, 0, playerSpeed); // 0 range = no magnetism
      }
    });
    
    // Remove collected gems
    gemsToRemove.forEach(gem => {
      this.activeGems.delete(gem);
      this.gemPool.release(gem);
    });
    
    return xpCollected;
  }

  private createCollectionEffect(x: number, y: number): void {
    // VS-style collection burst effect
    const effect = this.scene.add.graphics();
    effect.fillStyle(0x00ff00, 0.8);
    effect.lineStyle(2, 0xffffff, 1);
    effect.fillCircle(0, 0, 8);
    effect.strokeCircle(0, 0, 8);
    effect.setPosition(x, y);
    effect.setDepth(4);
    
    // VS-style: quick expand with bright flash
    this.scene.tweens.add({
      targets: effect,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => effect.destroy()
    });
    
    // Create sparkle particles
    for (let i = 0; i < 4; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(0xffffff, 1);
      particle.fillCircle(0, 0, 2);
      particle.setPosition(x, y);
      particle.setDepth(5);
      
      const angle = (i / 4) * Math.PI * 2;
      const distance = 20 + Math.random() * 10;
      
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }
  
  private createXPPopup(x: number, y: number, value: number): void {
    // VS-style XP number popup
    const text = this.scene.add.text(x, y, `+${value}`, {
      fontSize: '14px',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 2,
      fontFamily: 'Arial'
    });
    text.setOrigin(0.5);
    text.setDepth(6);
    
    // Float up and fade
    this.scene.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 600,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });
  }

  getActiveGemCount(): number {
    return this.activeGems.size;
  }

  reset(): void {
    this.activeGems.forEach(gem => {
      this.gemPool.release(gem);
    });
    this.activeGems.clear();
    this.spatialGrid.clear();
  }
}