import { Scene } from 'phaser';

export class BootScene extends Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // We'll create graphics in the create method instead
  }

  create(): void {
    // Create placeholder graphics
    this.createPlaceholderGraphics();
    
    // Start game scene
    this.scene.start('GameScene');
  }

  private createPlaceholderGraphics(): void {
    // Player (blue square)
    const playerGraphics = this.add.graphics();
    playerGraphics.fillStyle(0x0066ff);
    playerGraphics.fillRect(0, 0, 32, 32);
    playerGraphics.generateTexture('player', 32, 32);
    
    // Enemies are now drawn dynamically based on type
    
    // Gem (green diamond)
    const gemGraphics = this.add.graphics();
    gemGraphics.fillStyle(0x00ff00);
    gemGraphics.fillRect(0, 0, 16, 16);
    gemGraphics.generateTexture('gem', 16, 16);
    
    // Clean up
    playerGraphics.destroy();
    gemGraphics.destroy();
  }
}