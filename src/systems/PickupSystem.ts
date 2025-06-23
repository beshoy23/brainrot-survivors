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
    
    // Update all active gems
    const gemsToRemove: XPGem[] = [];
    
    nearbyGems.forEach(gem => {
      if (!gem.sprite.active) return;
      
      // Update gem movement and magnetism
      gem.update(deltaTime, playerX, playerY, magnetRange);
      
      // Check collection
      const dx = playerX - gem.x;
      const dy = playerY - gem.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < collectRadius) {
        xpCollected += gem.value;
        gemsToRemove.push(gem);
        
        // Collection effect
        this.createCollectionEffect(gem.x, gem.y);
      }
    });
    
    // Update non-nearby gems (just floating animation)
    this.activeGems.forEach(gem => {
      if (!nearbyGems.includes(gem) && gem.sprite.active) {
        gem.update(deltaTime, playerX, playerY, 0); // 0 range = no magnetism
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
    // Simple collection visual effect
    const effect = this.scene.add.graphics();
    effect.fillStyle(0x00ff00, 0.5);
    effect.fillCircle(0, 0, 15);
    effect.setPosition(x, y);
    effect.setDepth(4);
    
    // Fade out and scale up
    this.scene.tweens.add({
      targets: effect,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => effect.destroy()
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