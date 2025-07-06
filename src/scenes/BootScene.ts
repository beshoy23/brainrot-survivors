import { Scene } from 'phaser';

export class BootScene extends Scene {
  constructor() {
    super({ key: 'BootScene' });
    console.log('🚀 BootScene: Constructor called');
  }

  preload(): void {
    // We'll create graphics in the create method instead
  }

  create(): void {
    console.log('🚀 BootScene: create() called');
    
    // Create placeholder graphics
    this.createPlaceholderGraphics();
    
    console.log('🚀 BootScene: Starting GameScene...');
    // Start game scene
    this.scene.start('GameScene');
  }

  private createPlaceholderGraphics(): void {
    // Farm-themed player (brown farmer)
    const playerGraphics = this.add.graphics();
    playerGraphics.fillStyle(0x8B4513); // Brown farmer color
    playerGraphics.fillRect(0, 0, 32, 32);
    playerGraphics.generateTexture('player', 32, 32);
    
    // Farm animals are now drawn dynamically based on type
    
    // Farm gem (golden corn/wheat)
    const gemGraphics = this.add.graphics();
    gemGraphics.fillStyle(0xFFD700); // Golden yellow for farm produce
    gemGraphics.fillRect(0, 0, 16, 16);
    gemGraphics.generateTexture('gem', 16, 16);
    
    // Clean up
    playerGraphics.destroy();
    gemGraphics.destroy();
  }
}