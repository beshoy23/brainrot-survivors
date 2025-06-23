import { Scene } from 'phaser';
import { UpgradeManager } from '../managers/UpgradeManager';
import { UpgradeDefinition } from '../config/upgrades';

export class UpgradeScene extends Scene {
  private upgradeManager: UpgradeManager;
  private selectedUpgrade?: UpgradeDefinition;
  private onUpgradeSelected?: (upgrade: UpgradeDefinition) => void;

  constructor() {
    super({ key: 'UpgradeScene' });
    this.upgradeManager = UpgradeManager.getInstance();
  }

  create(data: { onComplete: (upgrade: UpgradeDefinition) => void }): void {
    // Reset selection state
    this.selectedUpgrade = undefined;
    this.onUpgradeSelected = data.onComplete;
    
    // Clear any existing content
    this.children.removeAll();
    
    // Semi-transparent background
    const bg = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.7
    );
    
    // Title
    const title = this.add.text(
      this.scale.width / 2,
      100,
      'CHOOSE AN UPGRADE',
      {
        fontSize: '48px',
        color: '#ffff00',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    title.setOrigin(0.5);
    
    // Get 3-4 random upgrades
    const upgrades = this.upgradeManager.getRandomUpgrades(3);
    
    // Create upgrade cards
    const cardWidth = 200;
    const cardHeight = 250;
    const spacing = 50;
    const totalWidth = upgrades.length * cardWidth + (upgrades.length - 1) * spacing;
    const startX = (this.scale.width - totalWidth) / 2 + cardWidth / 2;
    
    upgrades.forEach((upgrade, index) => {
      const x = startX + index * (cardWidth + spacing);
      const y = this.scale.height / 2;
      
      this.createUpgradeCard(x, y, cardWidth, cardHeight, upgrade);
    });
    
    // Instructions
    const instructions = this.add.text(
      this.scale.width / 2,
      this.scale.height - 50,
      'Click to select an upgrade',
      {
        fontSize: '24px',
        color: '#ffffff'
      }
    );
    instructions.setOrigin(0.5);
  }

  private createUpgradeCard(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    upgrade: UpgradeDefinition
  ): void {
    // Card background
    const card = this.add.rectangle(x, y, width, height, 0x333333);
    card.setStrokeStyle(3, 0xffffff);
    card.setInteractive();
    
    // Current level
    const currentLevel = this.upgradeManager.getUpgradeLevel(upgrade.id);
    const levelText = currentLevel > 0 ? `Lv ${currentLevel}` : 'NEW!';
    
    // Category color
    const categoryColors = {
      weapon: 0xff6666,
      player: 0x66ff66,
      passive: 0x6666ff
    };
    
    // Category badge
    const categoryBadge = this.add.rectangle(
      x, 
      y - height/2 + 30,
      width - 20,
      30,
      categoryColors[upgrade.category]
    );
    
    // Upgrade name
    const name = this.add.text(x, y - height/2 + 30, upgrade.name, {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    name.setOrigin(0.5);
    
    // Level indicator
    const level = this.add.text(x, y - height/2 + 60, levelText, {
      fontSize: '16px',
      color: '#ffff00'
    });
    level.setOrigin(0.5);
    
    // Description
    const desc = this.add.text(x, y, upgrade.description, {
      fontSize: '16px',
      color: '#ffffff',
      wordWrap: { width: width - 20 },
      align: 'center'
    });
    desc.setOrigin(0.5);
    
    // Max level indicator
    const maxLevel = this.add.text(
      x, 
      y + height/2 - 30,
      `Max: ${currentLevel}/${upgrade.maxLevel}`,
      {
        fontSize: '14px',
        color: '#999999'
      }
    );
    maxLevel.setOrigin(0.5);
    
    // Hover effect
    card.on('pointerover', () => {
      card.setFillStyle(0x444444);
      card.setScale(1.05);
    });
    
    card.on('pointerout', () => {
      card.setFillStyle(0x333333);
      card.setScale(1);
    });
    
    // Click to select
    card.on('pointerdown', () => {
      this.selectUpgrade(upgrade);
    });
  }

  private selectUpgrade(upgrade: UpgradeDefinition): void {
    if (this.selectedUpgrade) return; // Prevent multiple selections
    
    this.selectedUpgrade = upgrade;
    
    // Apply the upgrade
    this.upgradeManager.applyUpgrade(upgrade.id);
    
    // Notify the game scene
    if (this.onUpgradeSelected) {
      this.onUpgradeSelected(upgrade);
    }
    
    // Close the scene
    this.scene.stop();
  }
}