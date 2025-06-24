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
    // Apply fire rate multiplier from upgrades
    const upgradeManager = (window as any).upgradeManager;
    const fireRateMultiplier = upgradeManager ? 
      (1 + (upgradeManager.getUpgradeLevel('fireRate') * 0.2)) : 1;
    
    const actualFireRate = this.fireRate * fireRateMultiplier;
    const fireInterval = 1000 / actualFireRate;
    return currentTime - this.lastFireTime >= fireInterval;
  }
  
  updateFireTime(currentTime: number): void {
    this.lastFireTime = currentTime;
  }
  
  getDamage(): number {
    // Apply damage multiplier from upgrades
    const upgradeManager = (window as any).upgradeManager;
    const damageMultiplier = upgradeManager ? 
      (1 + (upgradeManager.getUpgradeLevel('damage') * 0.25)) : 1;
    
    return this.damage * damageMultiplier;
  }
  
  setBehavior(behavior: IWeaponBehavior): void {
    this.behavior = behavior;
  }
}