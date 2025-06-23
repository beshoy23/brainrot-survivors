export interface GridEntity {
  x: number;
  y: number;
  id: string;
}

export class SpatialGrid<T extends GridEntity> {
  private grid: Map<string, Set<T>> = new Map();
  private entityCells: Map<string, Set<string>> = new Map();

  constructor(
    private cellSize: number,
    private width: number,
    private height: number
  ) {}

  insert(entity: T): void {
    const cells = this.getCellsForEntity(entity);
    
    // Track which cells this entity is in
    this.entityCells.set(entity.id, new Set(cells));
    
    // Add entity to each cell
    for (const cell of cells) {
      if (!this.grid.has(cell)) {
        this.grid.set(cell, new Set());
      }
      this.grid.get(cell)!.add(entity);
    }
  }

  remove(entity: T): void {
    const cells = this.entityCells.get(entity.id);
    if (!cells) return;
    
    // Remove from all cells
    for (const cell of cells) {
      this.grid.get(cell)?.delete(entity);
    }
    
    this.entityCells.delete(entity.id);
  }

  update(entity: T): void {
    this.remove(entity);
    this.insert(entity);
  }

  getNearby(x: number, y: number, radius: number): T[] {
    const nearby = new Set<T>();
    const cells = this.getCellsInRadius(x, y, radius);
    
    for (const cell of cells) {
      const entities = this.grid.get(cell);
      if (entities) {
        entities.forEach(e => nearby.add(e));
      }
    }
    
    return Array.from(nearby);
  }

  clear(): void {
    this.grid.clear();
    this.entityCells.clear();
  }

  private getCellsForEntity(entity: T): string[] {
    const x = Math.floor(entity.x / this.cellSize);
    const y = Math.floor(entity.y / this.cellSize);
    return [this.getCellKey(x, y)];
  }

  private getCellsInRadius(x: number, y: number, radius: number): string[] {
    const cells: string[] = [];
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);
    
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        cells.push(this.getCellKey(cx, cy));
      }
    }
    
    return cells;
  }

  private getCellKey(x: number, y: number): string {
    return `${x},${y}`;
  }
}