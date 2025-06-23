import { Scene } from 'phaser';
import { Enemy } from '../entities/Enemy';
import { PoolManager } from '../managers/PoolManager';
import { GameConfig } from '../config/game';
import { Vector2 } from '../utils/Vector2';
import { getAvailableEnemyTypes, getRandomEnemyType, ENEMY_TYPES } from '../config/enemyTypes';
import { EnemyTypeId } from '../enemies/EnemyType';
import { getWaveConfig, WaveConfig } from '../config/waveConfig';

export class SpawnSystem {
  private lastSpawnTime: number = 0;
  private enemyPool: PoolManager<Enemy>;
  private survivalTime: number = 0;
  private lastEliteSpawn: number = 0;
  private eliteSpawnInterval: number = 60000; // 60 seconds
  private currentWave: WaveConfig;
  private rapidSpawnMode: boolean = false;
  private lastRapidSpawn: number = 0;
  private rapidSpawnInterval: number = 100; // 100ms for quota filling

  constructor(private scene: Scene) {
    // Create enemy pool
    this.enemyPool = new PoolManager(
      () => new Enemy(scene),
      (enemy) => enemy.reset(),
      300 // Increased for wave system
    );
    
    // Initialize with first wave
    this.currentWave = getWaveConfig(0);
  }

  update(currentTime: number, playerPos: Vector2): void {
    this.survivalTime = currentTime;
    
    // Update current wave based on time
    const currentMinute = Math.floor(this.survivalTime / 60000);
    this.currentWave = getWaveConfig(currentMinute);
    
    // Get active enemy count
    const activeEnemies = this.getActiveEnemies().length;
    
    // VS-style spawn logic
    if (activeEnemies < this.currentWave.minEnemies) {
      // RAPID SPAWN MODE - fill quota quickly
      this.rapidSpawnMode = true;
      if (currentTime - this.lastRapidSpawn >= this.rapidSpawnInterval) {
        this.lastRapidSpawn = currentTime;
        this.spawnEnemy(playerPos);
      }
    } else {
      // NORMAL SPAWN MODE - respects wave interval
      this.rapidSpawnMode = false;
      if (currentTime - this.lastSpawnTime >= this.currentWave.spawnInterval) {
        this.lastSpawnTime = currentTime;
        this.spawnWaveEnemies(playerPos);
      }
    }
    
    // Boss spawns at minute marks
    if (this.currentWave.bossSpawn && currentTime - this.lastEliteSpawn >= this.eliteSpawnInterval) {
      this.lastEliteSpawn = currentTime;
      this.spawnElite(playerPos);
    }
    
    // Clean up dead enemies
    const enemies = this.getActiveEnemies();
    enemies.forEach(enemy => {
      if (enemy.sprite.active && enemy.health <= 0) {
        this.releaseEnemy(enemy);
      }
    });
  }

  private spawnEnemy(playerPos: Vector2): void {
    // Single enemy spawn for rapid mode
    const availableTypes = this.getAvailableTypesForWave();
    if (availableTypes.length === 0) return;
    
    const enemyType = getRandomEnemyType(availableTypes);
    this.spawnSingleEnemy(playerPos, enemyType);
  }
  
  private spawnWaveEnemies(playerPos: Vector2): void {
    // Normal spawn - pick ONE random type from the wave
    const availableTypes = this.getAvailableTypesForWave();
    if (availableTypes.length === 0) return;
    
    // VS actually spawns ONE enemy type at a time when above minimum
    const enemyType = getRandomEnemyType(availableTypes);
    
    // For swarm, spawn smaller groups
    const spawnCount = enemyType.id === EnemyTypeId.SWARM ? 3 : 1;
    
    for (let i = 0; i < spawnCount; i++) {
      this.spawnSingleEnemy(playerPos, enemyType);
    }
  }
  
  private getAvailableTypesForWave(): any[] {
    // Get enemy types based on current wave config
    return this.currentWave.types
      .map(typeName => {
        // Map wave type names to actual enemy configs
        switch(typeName) {
          case 'basic': return ENEMY_TYPES.basic;
          case 'fast': return ENEMY_TYPES.fast;
          case 'swarm': return ENEMY_TYPES.swarm;
          case 'tank': return ENEMY_TYPES.tank;
          default: return null;
        }
      })
      .filter(type => type !== null);
  }
  
  private spawnSingleEnemy(playerPos: Vector2, enemyType: any): void {
    const enemy = this.enemyPool.acquire();
    
    // Calculate spawn position (off-screen)
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(this.scene.scale.width, this.scene.scale.height) / 2 + 
                    GameConfig.spawning.spawnDistance;
    
    // Add some randomness for swarm spawns
    const offsetAngle = (Math.random() - 0.5) * 0.3;
    const finalAngle = angle + offsetAngle;
    
    const x = playerPos.x + Math.cos(finalAngle) * distance;
    const y = playerPos.y + Math.sin(finalAngle) * distance;
    
    enemy.spawn(x, y, enemyType);
  }
  
  private spawnElite(playerPos: Vector2): void {
    // Spawn an elite enemy
    this.spawnSingleEnemy(playerPos, ENEMY_TYPES.elite);
    
    // Visual/audio feedback for elite spawn could go here
    console.log('Elite enemy spawned!');
  }

  getActiveEnemies(): Enemy[] {
    return this.enemyPool.getActive();
  }

  releaseEnemy(enemy: Enemy): void {
    this.enemyPool.release(enemy);
  }

  reset(): void {
    this.enemyPool.releaseAll();
    this.lastSpawnTime = 0;
    this.currentWave = getWaveConfig(0);
    this.rapidSpawnMode = false;
  }
}