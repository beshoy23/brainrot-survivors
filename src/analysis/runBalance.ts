import { GameBalanceAnalyzer } from './GameBalance';
import { WeaponBalanceAnalyzer } from './WeaponBalance';
import { StatBalanceAnalyzer } from './StatBalance';

// Run all balance analyses and output report
export function runFullBalanceReport(): void {
  console.log('='.repeat(60));
  console.log('BRAINROT SURVIVORS - FULL BALANCE ANALYSIS');
  console.log('='.repeat(60));
  console.log();
  
  // Game Balance
  console.log(GameBalanceAnalyzer.generateDifficultyReport());
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Weapon Balance
  console.log(WeaponBalanceAnalyzer.getWeaponProgressionGuide());
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Weapon Comparison at different upgrade levels
  console.log('WEAPON COMPARISONS AT DIFFERENT STAGES:\n');
  
  const upgradeScenarios = [
    { damage: 0, fireRate: 0, projectileCount: 0 },
    { damage: 2, fireRate: 1, projectileCount: 1 },
    { damage: 5, fireRate: 3, projectileCount: 3 }
  ];
  
  upgradeScenarios.forEach((scenario, index) => {
    console.log(`Stage ${index + 1}:`);
    console.log(WeaponBalanceAnalyzer.compareWeapons(scenario));
    console.log();
  });
  
  console.log('='.repeat(60) + '\n');
  
  // Stat Balance
  console.log(StatBalanceAnalyzer.generateBalanceReport());
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Tuning Recommendations
  console.log('TUNING RECOMMENDATIONS:\n');
  const recommendations = StatBalanceAnalyzer.generateTuningRecommendations();
  if (recommendations.length === 0) {
    console.log('Game appears well balanced!');
  } else {
    recommendations.forEach(rec => console.log(rec));
  }
  
  console.log('\n' + '='.repeat(60));
}

// Quick balance check for specific time
export function checkBalanceAtTime(seconds: number): void {
  console.log(`\nBALANCE CHECK AT ${seconds}s (${Math.floor(seconds/60)}m ${seconds%60}s):\n`);
  
  // Enemy pressure
  const enemies = GameBalanceAnalyzer.calculateEnemiesSpawned(seconds);
  const pressure = GameBalanceAnalyzer.calculateEnemyPressure(seconds);
  
  console.log('Enemy Situation:');
  console.log(`  Total spawned: ${enemies.total}`);
  console.log(`  On screen: ${pressure.averageOnScreen}`);
  console.log(`  Incoming DPS: ${pressure.dpsIncoming}`);
  
  // Player progression
  const xp = StatBalanceAnalyzer.analyzeXPEconomy(seconds);
  console.log('\nPlayer Progression:');
  console.log(`  Level: ${xp.levelsGained}`);
  console.log(`  Total XP: ${xp.totalXP}`);
  
  // Required vs actual DPS
  const required = WeaponBalanceAnalyzer.calculateRequiredDPS(seconds);
  const playerPower = GameBalanceAnalyzer.calculatePlayerPower({
    damage: Math.floor(xp.levelsGained * 0.3),
    fireRate: Math.floor(xp.levelsGained * 0.2),
    projectileCount: Math.floor(xp.levelsGained * 0.1)
  });
  
  console.log('\nDPS Analysis:');
  console.log(`  Required DPS: ${required.recommendedDPS}`);
  console.log(`  Player DPS: ${playerPower.dps}`);
  console.log(`  Status: ${playerPower.dps >= required.recommendedDPS ? 'GOOD' : 'UNDERPOWERED'}`);
}

// Export for use in game
(window as any).balanceReport = runFullBalanceReport;
(window as any).balanceCheck = checkBalanceAtTime;

console.log('Balance analysis tools loaded!');
console.log('Use balanceReport() for full report');
console.log('Use balanceCheck(seconds) for specific time check');