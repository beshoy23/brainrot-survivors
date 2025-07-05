import { Scene } from 'phaser';

export class TimeDilationManager {
  private scene: Scene;
  private normalTimeScale: number = 1.0;
  private dilatedTimeScale: number = 0.25;
  private currentTimeScale: number = 1.0;
  private isDilated: boolean = false;
  
  // Transition properties
  private transitionDuration: number = 150; // ms
  private transitionTween?: Phaser.Tweens.Tween;
  
  // Systems that need time scaling
  private weaponSystem?: any;
  private spawnSystem?: any;
  private movementSystem?: any;
  private enemyUpdateCallbacks: Array<(timeScale: number) => void> = [];
  
  constructor(scene: Scene) {
    this.scene = scene;
  }
  
  // Register systems that need time scaling
  registerWeaponSystem(weaponSystem: any): void {
    this.weaponSystem = weaponSystem;
  }
  
  registerSpawnSystem(spawnSystem: any): void {
    this.spawnSystem = spawnSystem;
  }
  
  registerMovementSystem(movementSystem: any): void {
    this.movementSystem = movementSystem;
  }
  
  registerEnemyUpdateCallback(callback: (timeScale: number) => void): void {
    this.enemyUpdateCallbacks.push(callback);
  }
  
  // Enter time dilation mode
  enterDilation(): void {
    if (this.isDilated) return;
    
    this.isDilated = true;
    this.transitionToTimeScale(this.dilatedTimeScale);
  }
  
  // Exit time dilation mode
  exitDilation(): void {
    if (!this.isDilated) return;
    
    this.isDilated = false;
    this.transitionToTimeScale(this.normalTimeScale);
  }
  
  // Get current time scale
  getCurrentTimeScale(): number {
    return this.currentTimeScale;
  }
  
  // Check if currently dilated
  isDilationActive(): boolean {
    return this.isDilated;
  }
  
  // Smooth transition between time scales
  private transitionToTimeScale(targetScale: number): void {
    if (this.transitionTween) {
      this.transitionTween.stop();
    }
    
    const startScale = this.currentTimeScale;
    
    this.transitionTween = this.scene.tweens.add({
      targets: this,
      duration: this.transitionDuration,
      ease: 'Power2',
      onUpdate: (tween) => {
        const progress = tween.progress;
        this.currentTimeScale = startScale + (targetScale - startScale) * progress;
        this.updateSystemsTimeScale();
      },
      onComplete: () => {
        this.currentTimeScale = targetScale;
        this.updateSystemsTimeScale();
        this.transitionTween = undefined;
      }
    });
  }
  
  // Update all registered systems with new time scale
  private updateSystemsTimeScale(): void {
    // Update global physics time scale
    if (this.scene.physics && this.scene.physics.world) {
      this.scene.physics.world.timeScale = this.currentTimeScale;
    }
    
    // Update enemy movement callbacks
    this.enemyUpdateCallbacks.forEach(callback => {
      callback(this.currentTimeScale);
    });
    
    // Update particle effects time scale
    if (this.scene.tweens) {
      this.scene.tweens.timeScale = this.currentTimeScale;
    }
  }
  
  // Force immediate time scale change (no transition)
  forceTimeScale(scale: number): void {
    this.currentTimeScale = scale;
    this.updateSystemsTimeScale();
  }
  
  // Reset to normal time immediately
  reset(): void {
    this.isDilated = false;
    this.forceTimeScale(this.normalTimeScale);
    
    if (this.transitionTween) {
      this.transitionTween.stop();
      this.transitionTween = undefined;
    }
  }
  
  // Cleanup
  destroy(): void {
    if (this.transitionTween) {
      this.transitionTween.stop();
    }
    this.enemyUpdateCallbacks = [];
    this.weaponSystem = undefined;
    this.spawnSystem = undefined;
    this.movementSystem = undefined;
  }
}