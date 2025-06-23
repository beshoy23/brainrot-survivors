# Game Balance Guide for Brainrot Survivors

## How to Use Balance Tools

Open your browser console (F12) while the game is running and use these commands:

```javascript
// Full balance report
balanceReport()

// Check balance at specific time (in seconds)
balanceCheck(120)  // Check at 2 minutes

// Show ASCII balance chart
balanceChart()

// Export balance data as JSON
exportBalance()
```

## Standard Approach to Balancing Survivor-like Games

### 1. **The Core Balance Equation**

```
Player Power Growth Rate ≈ Enemy Difficulty Growth Rate
```

- If player grows faster → Game becomes too easy
- If enemies grow faster → Game becomes impossible
- The "sweet spot" maintains tension throughout

### 2. **Key Metrics to Track**

#### Enemy Pressure
- **Spawn Rate**: How fast enemies appear
- **Enemy Density**: How many on screen at once
- **Incoming DPS**: Total damage player faces per second

#### Player Progression
- **XP Rate**: How fast player gains levels
- **Power Scaling**: DPS growth per upgrade
- **Survivability**: Effective HP considering armor/regen

### 3. **The Difficulty Curve**

```
Early Game (0-2 min):
- Learning phase
- Player should feel slightly overpowered
- Balance Ratio: 1.2-1.5

Mid Game (2-5 min):
- Challenge ramps up
- Upgrades become crucial
- Balance Ratio: 0.9-1.2

Late Game (5+ min):
- Survival becomes difficult
- Optimal play required
- Balance Ratio: 0.7-1.0

End Game (10+ min):
- Only skilled players with good builds survive
- Balance Ratio: 0.5-0.8
```

### 4. **Balancing Process**

1. **Run Balance Analysis**
   ```
   balanceReport()
   ```

2. **Identify Problem Areas**
   - Is XP gain too slow/fast?
   - Do enemies overwhelm too early?
   - Are certain upgrades too weak/strong?

3. **Adjust Constants**
   - `GameConfig.spawning` - Enemy spawn rates
   - `GameConfig.progression` - XP requirements
   - `UPGRADES` - Upgrade effectiveness
   - `ENEMY_TYPES` - Enemy stats

4. **Test Changes**
   - Run game for 5-10 minutes
   - Check balance ratios at key times
   - Ensure smooth progression

### 5. **Common Balance Issues & Solutions**

**Issue: Game too easy late game**
- Reduce spawn rate acceleration
- Add harder enemy types
- Reduce upgrade effectiveness
- Increase XP requirements

**Issue: Game too hard early**
- Increase base player stats
- Reduce early enemy health
- Increase XP drops
- Start with slower spawn rate

**Issue: Certain upgrades never picked**
- Buff weak upgrades
- Nerf overpowered alternatives
- Add synergies with other upgrades

**Issue: Players hit power plateau**
- Add weapon evolutions
- Introduce rare/legendary upgrades
- Scale enemies more gradually

### 6. **The "30 Second Rule"**

Every 30 seconds should feel different:
- New enemy types appear
- Spawn patterns change
- Player gains ~1 level
- Visible power increase

### 7. **Testing Checklist**

- [ ] Can new player survive 1 minute?
- [ ] Does skilled player feel challenged at 5 minutes?
- [ ] Are there multiple viable build paths?
- [ ] Does each upgrade feel impactful?
- [ ] Is the difficulty curve smooth (no sudden spikes)?
- [ ] Do players want "just one more run"?

## Current Balance Analysis

Based on the current configuration:

### Strengths:
- Good spawn rate acceleration (0.98)
- Reasonable XP curve (1.5x multiplier)
- Enemy variety with time gates
- Multiple upgrade paths

### Potential Issues:
- Health regen might be too weak (0.2 HP/s per level)
- Tank enemies might be too tanky for early weapons
- Multi-shot might be overpowered compared to alternatives

### Recommended Tweaks:
1. Buff health regen to 0.5 HP/s per level
2. Reduce tank enemy health from 50 to 40
3. Add diminishing returns to multi-shot
4. Consider adding more enemy types at 7-8 minutes

## Mathematical Formulas

### XP Required for Level
```
XP(level) = baseXP * (multiplier ^ (level - 1))
XP(level) = 10 * (1.5 ^ (level - 1))
```

### Spawn Rate Over Time
```
spawnRate(t) = baseRate * (acceleration ^ spawns)
spawnRate(t) = 1000ms * (0.98 ^ spawns)
```

### Player DPS
```
DPS = baseDamage * damageMultiplier * fireRate * fireRateMultiplier * projectileCount
```

### Enemy Pressure
```
pressure = (enemiesPerSecond * avgEnemyDamage) / 2
```

## Quick Reference

### Console Commands
- `balanceReport()` - Full analysis
- `balanceCheck(seconds)` - Time-specific check
- `balanceChart()` - Visual balance curve
- `exportBalance()` - Export JSON data

### Key Files to Edit
- `/src/config/game.ts` - Core game constants
- `/src/config/enemyTypes.ts` - Enemy definitions
- `/src/config/upgrades.ts` - Upgrade definitions

### Important Ratios
- Balance Ratio < 0.5 = Too Hard
- Balance Ratio 0.8-1.2 = Balanced
- Balance Ratio > 1.5 = Too Easy

Remember: The goal is not perfect balance, but a satisfying difficulty curve that keeps players engaged!