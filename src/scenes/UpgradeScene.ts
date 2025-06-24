import { Scene } from 'phaser';
import { UpgradeManager } from '../managers/UpgradeManager';
import { UpgradeDefinition } from '../config/upgrades';
import { WeaponUpgradeDefinition, unlockWeapon } from '../config/weaponUpgrades';

export class UpgradeScene extends Scene {
  private upgradeManager: UpgradeManager;
  private selectedUpgrade?: UpgradeDefinition | WeaponUpgradeDefinition;
  private onUpgradeSelected?: (upgrade: UpgradeDefinition | WeaponUpgradeDefinition) => void;
  private isMobile: boolean = false;
  
  // Upgrade icon mappings
  private getUpgradeIcon(upgrade: UpgradeDefinition | WeaponUpgradeDefinition): { symbol: string, bgColor: number } {
    const isWeapon = 'isWeaponUnlock' in upgrade;
    
    if (isWeapon) {
      // Weapon upgrades already have icons
      const weaponUpgrade = upgrade as WeaponUpgradeDefinition;
      return { symbol: weaponUpgrade.icon, bgColor: 0xff6666 };
    }
    
    // Regular upgrade icons
    const upgradeIcons: Record<string, { symbol: string, bgColor: number }> = {
      // Weapon upgrades
      'damage': { symbol: '⚔️', bgColor: 0xff6666 },
      'fireRate': { symbol: '⚡', bgColor: 0xff6666 },
      'projectileCount': { symbol: '📊', bgColor: 0xff6666 },
      
      // Player upgrades
      'moveSpeed': { symbol: '💨', bgColor: 0x66ff66 },
      'maxHealth': { symbol: '❤️', bgColor: 0x66ff66 },
      'healthRegen': { symbol: '🔄', bgColor: 0x66ff66 },
      
      // Passive upgrades
      'xpMagnet': { symbol: '🧲', bgColor: 0x6666ff },
      'xpBonus': { symbol: '✨', bgColor: 0x6666ff },
      'armor': { symbol: '🛡️', bgColor: 0x6666ff }
    };
    
    return upgradeIcons[upgrade.id] || { symbol: '❓', bgColor: 0x666666 };
  }

  constructor() {
    super({ key: 'UpgradeScene' });
    this.upgradeManager = UpgradeManager.getInstance();
  }

  create(data: { onComplete: (upgrade: UpgradeDefinition | WeaponUpgradeDefinition) => void }): void {
    // Reset selection state
    this.selectedUpgrade = undefined;
    this.onUpgradeSelected = data.onComplete;
    
    // Check if mobile
    this.isMobile = (window as any).isMobile || false;
    
    // Clear any existing content
    this.children.removeAll();
    
    // Dark overlay
    const bg = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.9
    );
    
    // No title - cleaner without it
    
    // Get upgrades
    const upgrades = this.upgradeManager.getRandomUpgrades(3);
    
    // Modern card layout - always centered
    if (this.isMobile) {
      // Mobile: Vertical stack, centered
      const cardWidth = Math.min(this.scale.width - 40, 400);
      const cardHeight = 120;
      const spacing = 20;
      const totalHeight = upgrades.length * cardHeight + (upgrades.length - 1) * spacing;
      const startY = (this.scale.height - totalHeight) / 2;
      
      upgrades.forEach((upgrade, index) => {
        const x = this.scale.width / 2;
        const y = startY + index * (cardHeight + spacing);
        this.createModernCard(x - cardWidth/2, y, cardWidth, cardHeight, upgrade);
      });
    } else {
      // Desktop: Horizontal cards, centered
      const cardWidth = 300;
      const cardHeight = 380;
      const spacing = 40;
      const totalWidth = upgrades.length * cardWidth + (upgrades.length - 1) * spacing;
      const startX = (this.scale.width - totalWidth) / 2;
      const centerY = this.scale.height / 2;
      
      upgrades.forEach((upgrade, index) => {
        const x = startX + index * (cardWidth + spacing);
        const y = centerY - cardHeight / 2;
        this.createModernCard(x, y, cardWidth, cardHeight, upgrade);
      });
    }
    
    // Remove hint - cleaner without it
  }

  private createModernCard(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    upgrade: UpgradeDefinition | WeaponUpgradeDefinition
  ): void {
    // Modern flat card design
    const cardContainer = this.add.container(x + width/2, y + height/2);
    
    // Card background - flat with subtle border
    const card = this.add.graphics();
    card.fillStyle(0x1a1a1a, 1);
    card.fillRect(-width/2, -height/2, width, height);
    cardContainer.add(card);
    
    // Interactive zone
    const hitZone = this.add.rectangle(0, 0, width, height, 0x000000, 0);
    hitZone.setInteractive();
    cardContainer.add(hitZone);
    
    // Current level or weapon unlock
    const isWeapon = 'isWeaponUnlock' in upgrade;
    const currentLevel = isWeapon ? 0 : this.upgradeManager.getUpgradeLevel(upgrade.id);
    const levelText = isWeapon ? 'NEW WEAPON!' : (currentLevel > 0 ? `Lv ${currentLevel}` : 'NEW!');
    
    // Category color
    const categoryColors = {
      weapon: 0xff6666,
      player: 0x66ff66,
      passive: 0x6666ff
    };
    
    // Category accent line - minimal
    const accent = this.add.graphics();
    accent.fillStyle(categoryColors[upgrade.category]);
    accent.fillRect(-width/2, -height/2, 3, height);
    cardContainer.add(accent);
    
    // Perfectly centered content layout
    const padding = 20;
    
    if (this.isMobile) {
      // Mobile: Horizontal layout within card
      
      // Icon/indicator on left
      const iconX = -width/2 + 60;
      const iconInfo = this.getUpgradeIcon(upgrade);
      
      // Icon background circle
      const iconBg = this.add.graphics();
      iconBg.fillStyle(iconInfo.bgColor, 0.2);
      iconBg.fillCircle(iconX, 0, 35);
      iconBg.lineStyle(2, iconInfo.bgColor, 0.6);
      iconBg.strokeCircle(iconX, 0, 35);
      cardContainer.add(iconBg);
      
      // Icon
      const icon = this.add.text(iconX, 0, iconInfo.symbol, {
        fontSize: '32px'
      });
      icon.setOrigin(0.5);
      cardContainer.add(icon);
      
      // Level indicator for non-weapons
      if (!isWeapon) {
        const levelBadge = this.add.graphics();
        levelBadge.fillStyle(iconInfo.bgColor, 0.8);
        levelBadge.fillCircle(iconX + 20, -20, 12);
        cardContainer.add(levelBadge);
        
        const levelText = this.add.text(iconX + 20, -20, currentLevel.toString(), {
          fontSize: '14px',
          color: '#ffffff',
          fontFamily: 'Arial Black'
        });
        levelText.setOrigin(0.5);
        cardContainer.add(levelText);
      }
      
      // Text content on right
      const textX = -width/2 + 120;
      const textWidth = width - 140;
      
      const name = this.add.text(textX, -15, upgrade.name.toUpperCase(), {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Arial Black'
      });
      name.setOrigin(0, 0.5);
      cardContainer.add(name);
      
      const desc = this.add.text(textX, 15, upgrade.description, {
        fontSize: '14px',
        color: '#cccccc',
        fontFamily: 'Arial',
        wordWrap: { width: textWidth }
      });
      desc.setOrigin(0, 0.5);
      cardContainer.add(desc);
      
    } else {
      // Desktop: Vertical centered layout
      
      // Name at top
      const name = this.add.text(0, -height/2 + 60, upgrade.name.toUpperCase(), {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: 'Arial Black'
      });
      name.setOrigin(0.5);
      cardContainer.add(name);
      
      // Status below name
      const statusText = isWeapon ? 'NEW WEAPON' : `LEVEL ${currentLevel}/${upgrade.maxLevel}`;
      const status = this.add.text(0, -height/2 + 90, statusText, {
        fontSize: '14px',
        color: categoryColors[upgrade.category],
        fontFamily: 'Arial'
      });
      status.setOrigin(0.5);
      cardContainer.add(status);
      
      // Description in center
      const desc = this.add.text(0, 0, upgrade.description, {
        fontSize: '16px',
        color: '#cccccc',
        fontFamily: 'Arial',
        wordWrap: { width: width - 40 },
        align: 'center',
        lineSpacing: 8
      });
      desc.setOrigin(0.5);
      cardContainer.add(desc);
      
      // Large icon in center-bottom area
      const iconInfo = this.getUpgradeIcon(upgrade);
      
      // Icon background
      const iconBg = this.add.graphics();
      iconBg.fillStyle(iconInfo.bgColor, 0.15);
      iconBg.fillCircle(0, height/2 - 80, 50);
      iconBg.lineStyle(3, iconInfo.bgColor, 0.5);
      iconBg.strokeCircle(0, height/2 - 80, 50);
      cardContainer.add(iconBg);
      
      // Icon
      const icon = this.add.text(0, height/2 - 80, iconInfo.symbol, {
        fontSize: '48px'
      });
      icon.setOrigin(0.5);
      cardContainer.add(icon);
      
      // Level indicator for non-weapons
      if (!isWeapon) {
        const levelBadge = this.add.graphics();
        levelBadge.fillStyle(iconInfo.bgColor, 0.9);
        levelBadge.fillCircle(35, height/2 - 115, 15);
        cardContainer.add(levelBadge);
        
        const levelText = this.add.text(35, height/2 - 115, currentLevel.toString(), {
          fontSize: '16px',
          color: '#ffffff',
          fontFamily: 'Arial Black'
        });
        levelText.setOrigin(0.5);
        cardContainer.add(levelText);
      }
    }
    
    // REMOVED - Already handled in modern layout
    
    // REMOVED - Handled in modern layout
    
    // Minimal hover effects
    hitZone.on('pointerover', () => {
      if (!this.isMobile) {
        card.clear();
        card.fillStyle(0x2a2a2a, 1);
        card.fillRect(-width/2, -height/2, width, height);
        accent.clear();
        accent.fillStyle(categoryColors[upgrade.category]);
        accent.fillRect(-width/2, -height/2, 5, height);
      }
    });
    
    hitZone.on('pointerout', () => {
      if (!this.isMobile) {
        card.clear();
        card.fillStyle(0x1a1a1a, 1);
        card.fillRect(-width/2, -height/2, width, height);
        accent.clear();
        accent.fillStyle(categoryColors[upgrade.category]);
        accent.fillRect(-width/2, -height/2, 3, height);
      }
    });
    
    // Click to select
    hitZone.on('pointerdown', () => {
      // Flash effect
      card.clear();
      card.fillStyle(0x3a3a3a, 1);
      card.fillRect(-width/2, -height/2, width, height);
      
      // Select immediately
      this.selectUpgrade(upgrade);
    });
  }

  private selectUpgrade(upgrade: UpgradeDefinition | WeaponUpgradeDefinition): void {
    if (this.selectedUpgrade) return; // Prevent multiple selections
    
    this.selectedUpgrade = upgrade;
    
    // Apply the upgrade or unlock weapon
    if ('isWeaponUnlock' in upgrade) {
      unlockWeapon(upgrade.id);
    } else {
      this.upgradeManager.applyUpgrade(upgrade.id);
    }
    
    // Notify the game scene
    if (this.onUpgradeSelected) {
      this.onUpgradeSelected(upgrade);
    }
    
    // Close the scene
    this.scene.stop();
  }
}