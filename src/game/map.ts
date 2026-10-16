/**
 * Asylum Map & Collision Grid
 * 21x21 layout with multiple themed wards, corridors, prop placements,
 * keycards, battery pickups, and patrol waypoints.
 */

export const TILE_SIZE = 3.0; // 3 meters per tile
export const WALL_HEIGHT = 3.2;

// Tile types
export enum TileType {
  FLOOR = 0,
  WALL = 1,
  PLAYER_START = 2,
  EXIT_DOOR = 3,
  KEY_1 = 4,
  KEY_2 = 5,
  KEY_3 = 6,
  KEY_4 = 7,
  BATTERY = 8,
  PROP_GURNEY = 9,
  PROP_WHEELCHAIR = 10,
  PROP_LOCKER = 11,
  MONSTER_SPAWN = 12,
}

// 21 x 21 Asylum Layout
// 1 = Wall, 0 = Walkable Floor
export const ASYLUM_LAYOUT: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 4, 0, 9, 1, 0, 0, 0, 1, 6, 0, 8, 1, 0, 0, 0, 1, 9, 0, 7, 1],
  [1, 0, 0, 0, 1, 0, 11, 0, 1, 0, 0, 0, 1, 0, 11, 0, 1, 0, 0, 0, 1],
  [1, 0, 10, 0, 8, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 8, 0, 10, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
  [1, 8, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 8, 1],
  [1, 0, 11, 0, 9, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 9, 0, 11, 0, 1],
  [1, 0, 8, 0, 0, 0, 0, 0, 1, 3, 3, 3, 1, 0, 0, 0, 0, 0, 8, 0, 1],
  [1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 1, 0, 8, 0, 2, 0, 8, 0, 1, 0, 1, 0, 0, 0, 1],
  [1, 0, 10, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 10, 0, 1],
  [1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 1],
  [1, 0, 9, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 9, 0, 1],
  [1, 8, 0, 0, 1, 5, 0, 0, 1, 0, 0, 0, 1, 0, 0, 8, 1, 0, 0, 8, 1],
  [1, 0, 11, 0, 1, 0, 0, 0, 1, 0, 12, 0, 1, 0, 0, 0, 1, 0, 11, 0, 1],
  [1, 0, 8, 0, 0, 0, 10, 0, 0, 0, 8, 0, 0, 0, 10, 0, 0, 0, 8, 0, 1],
  [1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
  [1, 0, 0, 8, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 8, 0, 0, 1],
  [1, 8, 0, 9, 0, 0, 11, 0, 0, 0, 8, 0, 0, 0, 11, 0, 9, 0, 0, 8, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export interface CollisionBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Waypoint {
  x: number;
  z: number;
}

export class MapData {
  public static readonly gridWidth = ASYLUM_LAYOUT[0].length;
  public static readonly gridHeight = ASYLUM_LAYOUT.length;

  public static readonly originX = -((ASYLUM_LAYOUT[0].length * TILE_SIZE) / 2);
  public static readonly originZ = -((ASYLUM_LAYOUT.length * TILE_SIZE) / 2);

  /**
   * Convert grid coords (gx, gz) to 3D world center (x, z)
   */
  public static gridToWorld(gx: number, gz: number): { x: number; z: number } {
    return {
      x: this.originX + (gx + 0.5) * TILE_SIZE,
      z: this.originZ + (gz + 0.5) * TILE_SIZE,
    };
  }

  /**
   * Convert world coords (x, z) to grid coords (gx, gz)
   */
  public static worldToGrid(x: number, z: number): { gx: number; gz: number } {
    const gx = Math.floor((x - this.originX) / TILE_SIZE);
    const gz = Math.floor((z - this.originZ) / TILE_SIZE);
    return { gx, gz };
  }

  /**
   * Check if a tile is a solid wall or obstruction
   */
  public static isWall(gx: number, gz: number): boolean {
    if (gx < 0 || gx >= this.gridWidth || gz < 0 || gz >= this.gridHeight) {
      return true;
    }
    const val = ASYLUM_LAYOUT[gz][gx];
    return val === TileType.WALL || val === TileType.PROP_LOCKER;
  }

  /**
   * Build list of static collision bounding boxes
   */
  public static getCollisionBoxes(): CollisionBox[] {
    const boxes: CollisionBox[] = [];

    for (let gz = 0; gz < this.gridHeight; gz++) {
      for (let gx = 0; gx < this.gridWidth; gx++) {
        const val = ASYLUM_LAYOUT[gz][gx];
        if (val === TileType.WALL || val === TileType.PROP_LOCKER) {
          const world = this.gridToWorld(gx, gz);
          const half = TILE_SIZE * 0.5;
          boxes.push({
            minX: world.x - half,
            maxX: world.x + half,
            minZ: world.z - half,
            maxZ: world.z + half,
          });
        }
      }
    }

    return boxes;
  }

  /**
   * Resolve circle-vs-AABB collisions for player movement (sliding against walls)
   */
  public static resolveCircleCollision(
    x: number,
    z: number,
    radius: number,
    boxes: CollisionBox[]
  ): { x: number; z: number } {
    let resolvedX = x;
    let resolvedZ = z;

    // Broadphase: Only test boxes within active reach (radius + 2m)
    const reach = radius + 2.0;
    const nearbyBoxes = boxes.filter(
      (b) =>
        resolvedX >= b.minX - reach &&
        resolvedX <= b.maxX + reach &&
        resolvedZ >= b.minZ - reach &&
        resolvedZ <= b.maxZ + reach
    );

    // Two relaxation iterations for corner / seam sliding stability
    for (let pass = 0; pass < 2; pass++) {
      for (const box of nearbyBoxes) {
        const closestX = Math.max(box.minX, Math.min(resolvedX, box.maxX));
        const closestZ = Math.max(box.minZ, Math.min(resolvedZ, box.maxZ));

        const dx = resolvedX - closestX;
        const dz = resolvedZ - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < radius * radius && distSq > 0.00001) {
          const dist = Math.sqrt(distSq);
          const overlap = radius - dist;
          resolvedX += (dx / dist) * overlap;
          resolvedZ += (dz / dist) * overlap;
        } else if (distSq <= 0.00001) {
          // Inside box: push out along nearest exterior edge
          const left = resolvedX - box.minX;
          const right = box.maxX - resolvedX;
          const top = resolvedZ - box.minZ;
          const bottom = box.maxZ - resolvedZ;
          const minEdge = Math.min(left, right, top, bottom);

          if (minEdge === left) resolvedX = box.minX - radius;
          else if (minEdge === right) resolvedX = box.maxX + radius;
          else if (minEdge === top) resolvedZ = box.minZ - radius;
          else resolvedZ = box.maxZ + radius;
        }
      }
    }

    return { x: resolvedX, z: resolvedZ };
  }

  /**
   * Waypoints for monster patrol navigation
   */
  public static getPatrolWaypoints(): Waypoint[] {
    const waypoints: Waypoint[] = [];
    for (let gz = 1; gz < this.gridHeight - 1; gz += 2) {
      for (let gx = 1; gx < this.gridWidth - 1; gx += 2) {
        if (!this.isWall(gx, gz)) {
          waypoints.push(this.gridToWorld(gx, gz));
        }
      }
    }
    return waypoints;
  }

  /**
   * Check line of sight between two world positions (Bresenham ray on tile grid)
   */
  public static hasLineOfSight(x1: number, z1: number, x2: number, z2: number): boolean {
    const start = this.worldToGrid(x1, z1);
    const end = this.worldToGrid(x2, z2);

    let x = start.gx;
    let y = start.gz;
    const dx = Math.abs(end.gx - start.gx);
    const dy = Math.abs(end.gz - start.gz);
    const sx = start.gx < end.gx ? 1 : -1;
    const sy = start.gz < end.gz ? 1 : -1;
    let err = dx - dy;

    while (x !== end.gx || y !== end.gz) {
      if (this.isWall(x, y)) {
        return false;
      }
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return true;
  }
}
