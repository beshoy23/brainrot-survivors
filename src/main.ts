import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UpgradeScene } from './scenes/UpgradeScene';
import { PauseScene } from './scenes/PauseScene';
import { ChestRewardScene } from './scenes/ChestRewardScene';
import { DeviceDetection } from './mobile/DeviceDetection';
import { MobileConfig } from './mobile/MobileConfig';
import './analysis/runBalance'; // Load balance tools
import './analysis/BalanceCharts'; // Load chart tools

// Get device info
const device = DeviceDetection.getInstance();
const deviceInfo = device.getDeviceInfo();

// Calculate responsive dimensions
function getGameDimensions() {
  const isMobile = deviceInfo.isMobile || deviceInfo.isTablet;
  
  if (isMobile) {
    // For mobile, use full screen
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  } else {
    // For desktop, use fixed size
    return {
      width: 1024,
      height: 768
    };
  }
}

const dimensions = getGameDimensions();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: dimensions.width,
  height: dimensions.height,
  parent: 'game-container',
  backgroundColor: '#2a2a2a',
  pixelArt: true,
  scale: {
    mode: deviceInfo.isMobile || deviceInfo.isTablet ? 
      Phaser.Scale.RESIZE : Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game-container',
    width: dimensions.width,
    height: dimensions.height
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [BootScene, GameScene, UpgradeScene, PauseScene, ChestRewardScene],
  input: {
    activePointers: deviceInfo.hasTouch ? 4 : 1
  }
};

// Handle orientation changes and window resize
if (deviceInfo.isMobile || deviceInfo.isTablet) {
  window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  });
  
  // Handle safe areas for devices with notches
  document.documentElement.style.setProperty('--sat', `${device.getSafeAreaInsets().top}px`);
  document.documentElement.style.setProperty('--sar', `${device.getSafeAreaInsets().right}px`);
  document.documentElement.style.setProperty('--sab', `${device.getSafeAreaInsets().bottom}px`);
  document.documentElement.style.setProperty('--sal', `${device.getSafeAreaInsets().left}px`);
}

console.log('🚀 Creating Phaser game with config:', config);
const game = new Phaser.Game(config);
console.log('🚀 Phaser game created:', game);

// Store device info globally for easy access
(window as any).deviceInfo = deviceInfo;
(window as any).isMobile = deviceInfo.isMobile || deviceInfo.isTablet;