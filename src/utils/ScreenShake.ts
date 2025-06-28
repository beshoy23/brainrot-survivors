import { Scene } from 'phaser';

export class ScreenShake {
  private scene: Scene;
  private shakeIntensity: number = 0;
  private shakeDuration: number = 0;
  private shakeDecay: number = 0.9;
  private originalCameraX: number = 0;
  private originalCameraY: number = 0;
  private isShaking: boolean = false;
  
  constructor(scene: Scene) {
    this.scene = scene;
  }
  
  shake(intensity: number = 5, duration: number = 200): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    
    if (!this.isShaking) {
      this.isShaking = true;
      this.originalCameraX = this.scene.cameras.main.scrollX;
      this.originalCameraY = this.scene.cameras.main.scrollY;
      this.startShakeLoop();
    }
  }
  
  private startShakeLoop(): void {
    if (this.shakeDuration <= 0) {
      this.stopShake();
      return;
    }
    
    // Random shake offset
    const offsetX = (Math.random() - 0.5) * this.shakeIntensity;
    const offsetY = (Math.random() - 0.5) * this.shakeIntensity;
    
    // Apply shake to camera
    this.scene.cameras.main.setScroll(
      this.originalCameraX + offsetX,
      this.originalCameraY + offsetY
    );
    
    // Decay intensity
    this.shakeIntensity *= this.shakeDecay;
    this.shakeDuration -= 16; // Assume ~60fps
    
    // Continue shake
    this.scene.time.delayedCall(16, () => {
      this.startShakeLoop();
    });
  }
  
  private stopShake(): void {
    this.isShaking = false;
    this.shakeIntensity = 0;
    // Reset camera position - use follow target if available
    const camera = this.scene.cameras.main;
    if (camera.followTarget) {
      // Camera will automatically return to following the target
    } else {
      camera.setScroll(this.originalCameraX, this.originalCameraY);
    }
  }
  
  isActive(): boolean {
    return this.isShaking;
  }
}