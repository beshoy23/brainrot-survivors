import { IWeaponBehavior } from '../weapons/IWeaponBehavior';

export interface WeaponConfig {
  damage: number;
  fireRate: number; // shots per second
  projectileSpeed: number;
  range: number;
  behavior: IWeaponBehavior;
}

export class Weapon {
  public damage: number;
  public fireRate: number;
  public projectileSpeed: number;
  public range: number;
  public behavior: IWeaponBehavior;
  public lastFireTime: number = 0;
  
  constructor(config: WeaponConfig) {
    this.damage = config.damage;
    this.fireRate = config.fireRate;
    this.projectileSpeed = config.projectileSpeed;
    this.range = config.range;
    this.behavior = config.behavior;
  }
  
  canFire(currentTime: number): boolean {
    // Validate inputs
    if (isNaN(currentTime) || !isFinite(currentTime)) {
      console.error('Invalid currentTime in canFire:', currentTime);
      return false;
    }
    
    // Apply fire rate multiplier from upgrades
    const upgradeManager = (window as any).upgradeManager;
    const fireRateMultiplier = upgradeManager && upgradeManager.getUpgradeLevel ? 
      (1 + (upgradeManager.getUpgradeLevel('fireRate') * 0.15)) : 1;
    
    const actualFireRate = this.fireRate * fireRateMultiplier;
    
    // Prevent division by zero or negative fire rates
    if (actualFireRate <= 0 || !isFinite(actualFireRate)) {
      console.warn('Invalid fire rate:', actualFireRate);
      return false; // Can't fire with invalid rate
    }
    
    const fireInterval = 1000 / actualFireRate;
    return currentTime - this.lastFireTime >= fireInterval;
  }
  
  updateFireTime(currentTime: number): void {
    this.lastFireTime = currentTime;
  }
  
  getDamage(): number {
    // Apply damage multiplier from upgrades
    const upgradeManager = (window as any).upgradeManager;
    const damageMultiplier = upgradeManager && upgradeManager.getUpgradeLevel ? 
      (1 + (upgradeManager.getUpgradeLevel('damage') * 0.10)) : 1;
    
    // Apply projectile count penalty (prevents multi-shot from being overpowered)
    const projectileCount = upgradeManager && upgradeManager.getUpgradeLevel ? 
      upgradeManager.getUpgradeLevel('projectileCount') : 0;
    const projectilePenalty = projectileCount > 0 ? Math.pow(0.8, projectileCount) : 1; // 20% reduction per additional projectile
    
    return this.damage * damageMultiplier * projectilePenalty;
  }
  
  setBehavior(behavior: IWeaponBehavior): void {
    this.behavior = behavior;
  }
}