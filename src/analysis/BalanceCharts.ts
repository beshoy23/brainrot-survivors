import { GameBalanceAnalyzer } from './GameBalance';
import { WeaponBalanceAnalyzer } from './WeaponBalance';
import { StatBalanceAnalyzer } from './StatBalance';

export class BalanceChartGenerator {
  
  // Generate CSV data for enemy spawn curve
  static generateSpawnCurveCSV(): string {
    const headers = ['Time(s)', 'Total Spawned', 'Spawn Rate(ms)', 'On Screen', 'Incoming DPS'];
    const rows: string[] = [headers.join(',')];
    
    // Generate data points every 10 seconds up to 10 minutes
    for (let seconds = 0; seconds <= 600; seconds += 10) {
      const spawn = GameBalanceAnalyzer.calculateEnemiesSpawned(seconds);
      const pressure = GameBalanceAnalyzer.calculateEnemyPressure(seconds);
      
      rows.push([
        seconds,
        spawn.total,
        spawn.spawnRate,
        pressure.averageOnScreen,
        pressure.dpsIncoming
      ].join(','));
    }
    
    return rows.join('\n');
  }
  
  // Generate CSV data for player power progression
  static generatePowerCurveCSV(): string {
    const headers = ['Time(s)', 'Level', 'Base DPS', 'With Upgrades DPS', 'Survivability', 'Required DPS'];
    const rows: string[] = [headers.join(',')];
    
    for (let seconds = 0; seconds <= 600; seconds += 10) {
      const xp = StatBalanceAnalyzer.analyzeXPEconomy(seconds);
      const basePower = GameBalanceAnalyzer.calculatePlayerPower({});
      
      // Assume balanced upgrade distribution
      const upgrades = {
        damage: Math.floor(xp.levelsGained * 0.3),
        fireRate: Math.floor(xp.levelsGained * 0.2),
        maxHealth: Math.floor(xp.levelsGained * 0.2),
        armor: Math.floor(xp.levelsGained * 0.1)
      };
      
      const upgradedPower = GameBalanceAnalyzer.calculatePlayerPower(upgrades);
      const required = WeaponBalanceAnalyzer.calculateRequiredDPS(seconds);
      
      rows.push([
        seconds,
        xp.levelsGained,
        basePower.dps,
        upgradedPower.dps,
        upgradedPower.survivability,
        required.recommendedDPS
      ].join(','));
    }
    
    return rows.join('\n');
  }
  
  // Generate data for plotting difficulty vs power
  static generateBalanceCurveData(): {
    labels: number[];
    enemyDifficulty: number[];
    playerPower: number[];
    balanceRatio: number[];
  } {
    const labels: number[] = [];
    const enemyDifficulty: number[] = [];
    const playerPower: number[] = [];
    const balanceRatio: number[] = [];
    
    for (let seconds = 30; seconds <= 600; seconds += 30) {
      labels.push(seconds);
      
      // Enemy difficulty (normalized)
      const pressure = GameBalanceAnalyzer.calculateEnemyPressure(seconds);
      enemyDifficulty.push(pressure.dpsIncoming);
      
      // Player power (normalized)
      const xp = StatBalanceAnalyzer.analyzeXPEconomy(seconds);
      const upgrades = {
        damage: Math.floor(xp.levelsGained * 0.3),
        fireRate: Math.floor(xp.levelsGained * 0.2),
        projectileCount: Math.floor(xp.levelsGained * 0.1)
      };
      const power = GameBalanceAnalyzer.calculatePlayerPower(upgrades);
      playerPower.push(power.dps);
      
      // Balance ratio
      balanceRatio.push(power.dps / pressure.dpsIncoming);
    }
    
    return { labels, enemyDifficulty, playerPower, balanceRatio };
  }
  
  // Generate console-friendly ASCII chart
  static printBalanceChart(): void {
    const data = this.generateBalanceCurveData();
    const maxValue = Math.max(...data.playerPower, ...data.enemyDifficulty);
    const chartHeight = 20;
    const chartWidth = 50;
    
    console.log('\nDIFFICULTY vs POWER CHART:');
    console.log('P = Player Power, E = Enemy Difficulty\n');
    
    // Create chart
    for (let row = chartHeight; row >= 0; row--) {
      const value = (row / chartHeight) * maxValue;
      let line = value.toFixed(0).padStart(5) + ' |';
      
      for (let col = 0; col < data.labels.length; col++) {
        const xPos = Math.floor((col / data.labels.length) * chartWidth);
        
        if (Math.abs(data.playerPower[col] - value) < maxValue / chartHeight) {
          line += 'P';
        } else if (Math.abs(data.enemyDifficulty[col] - value) < maxValue / chartHeight) {
          line += 'E';
        } else {
          line += ' ';
        }
      }
      
      console.log(line);
    }
    
    // X-axis
    console.log('     +' + '-'.repeat(chartWidth));
    console.log('     0' + ' '.repeat(Math.floor(chartWidth/2) - 2) + '300' + ' '.repeat(Math.floor(chartWidth/2) - 3) + '600');
    console.log('     Time (seconds)');
    
    // Balance assessment
    console.log('\nBalance Ratios:');
    data.labels.forEach((time, index) => {
      const ratio = data.balanceRatio[index];
      const assessment = ratio < 0.5 ? 'TOO HARD' :
                        ratio < 0.8 ? 'Challenging' :
                        ratio < 1.2 ? 'BALANCED' :
                        ratio < 1.5 ? 'Easy' : 'TOO EASY';
      
      console.log(`  ${time}s: ${ratio.toFixed(2)} (${assessment})`);
    });
  }
  
  // Export all data as JSON for external tools
  static exportBalanceData(): string {
    const data = {
      gameInfo: {
        analysisDate: new Date().toISOString(),
        version: '1.0.0'
      },
      
      spawnCurve: [],
      powerCurve: [],
      balanceMetrics: [],
      
      config: {
        spawning: GameConfig.spawning,
        weapons: GameConfig.weapons,
        progression: GameConfig.progression
      }
    };
    
    // Collect data points
    for (let seconds = 0; seconds <= 600; seconds += 30) {
      const spawn = GameBalanceAnalyzer.calculateEnemiesSpawned(seconds);
      const pressure = GameBalanceAnalyzer.calculateEnemyPressure(seconds);
      const xp = StatBalanceAnalyzer.analyzeXPEconomy(seconds);
      
      data.spawnCurve.push({
        time: seconds,
        totalSpawned: spawn.total,
        onScreen: pressure.averageOnScreen,
        incomingDPS: pressure.dpsIncoming
      });
      
      const upgrades = {
        damage: Math.floor(xp.levelsGained * 0.3),
        fireRate: Math.floor(xp.levelsGained * 0.2)
      };
      const power = GameBalanceAnalyzer.calculatePlayerPower(upgrades);
      
      data.powerCurve.push({
        time: seconds,
        level: xp.levelsGained,
        dps: power.dps,
        survivability: power.survivability
      });
      
      data.balanceMetrics.push({
        time: seconds,
        balanceRatio: power.dps / pressure.dpsIncoming,
        xpPerMinute: xp.xpPerMinute
      });
    }
    
    return JSON.stringify(data, null, 2);
  }
}

// Add to window for console access
(window as any).balanceChart = () => BalanceChartGenerator.printBalanceChart();
(window as any).exportBalance = () => {
  const data = BalanceChartGenerator.exportBalanceData();
  console.log('Balance data exported. Copy the following JSON:');
  console.log(data);
  return data;
};

console.log('Chart tools loaded! Use balanceChart() for ASCII chart');