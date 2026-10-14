import { CargoItem, ContainerSpec, OptimizationRules, PackedItem, PackedVehicle, RotationPolicy } from '../types/optimizer';

export const CONTAINERS: Record<string, ContainerSpec> = {
  'TIR (Semi-trailer)': { name: 'TIR (Semi-trailer)', L: 1360, W: 245, H: 270, max_weight: 24000 },
  '20FT Standard': { name: '20FT Standard', L: 589, W: 235, H: 239, max_weight: 28000 },
  '40FT Standard': { name: '40FT Standard', L: 1203, W: 235, H: 239, max_weight: 28000 },
  '40HQ (High Cube)': { name: '40HQ (High Cube)', L: 1203, W: 235, H: 269, max_weight: 28000 },
};

export const DEFAULT_RULES: OptimizationRules = {
  rear_buffer_cm: 25.0,
  enable_80cm_rule: true,
  bonus_weight: 50000.0,
  enable_euro_grid: true,
  enable_gravity_slide: true,
  enable_strict_collision: true,
  enable_overhead_protection: true,
};

interface InternalItem {
  id: string;
  name: string;
  originalRef: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  allowedRotations: number[];
  stackable: boolean;
  color: string;
  originalQty: number;
  originalHeight: number;
  originalWeight: number;
  // Placed info
  rotationType: number;
  position: [number, number, number];
  fittedDimension: [number, number, number];
}

interface EuroSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  filled: boolean;
}

function getRotatedDims(length: number, width: number, height: number, rot: number): [number, number, number] {
  // Rotations standard py3dbp:
  // 0: (L, W, H)
  // 1: (W, L, H)
  // 2: (L, H, W)
  // 3: (H, L, W)
  // 4: (W, H, L)
  // 5: (H, W, L)
  switch (rot) {
    case 0: return [length, width, height];
    case 1: return [width, length, height];
    case 2: return [length, height, width];
    case 3: return [height, length, width];
    case 4: return [width, height, length];
    case 5: return [height, width, length];
    default: return [length, width, height];
  }
}

function getAllowedRotations(policy: RotationPolicy): number[] {
  switch (policy) {
    case 'Auto (Horizontal)': return [0, 1];
    case 'Auto (All)': return [0, 1, 2, 3, 4, 5];
    case 'Strict: L -> Length': return [0];
    case 'Strict: W -> Length': return [1];
    default: return [0, 1];
  }
}

function getOptimalEuroSlots(containerName: string): EuroSlot[] {
  const slots: EuroSlot[] = [];
  if (containerName.includes('20FT')) {
    for (let i = 0; i < 7; i++) {
      slots.push({ x: i * 80, y: 0, w: 80, h: 120, filled: false });
    }
    for (let i = 0; i < 4; i++) {
      slots.push({ x: i * 120, y: 120, w: 120, h: 80, filled: false });
    }
  } else if (containerName.includes('40FT') || containerName.includes('40HQ')) {
    for (let i = 0; i < 15; i++) {
      slots.push({ x: i * 80, y: 0, w: 80, h: 120, filled: false });
    }
    for (let i = 0; i < 10; i++) {
      slots.push({ x: i * 120, y: 120, w: 120, h: 80, filled: false });
    }
  } else if (containerName.includes('TIR')) {
    // 11 rows of 3 standard europallets = 33 pallets
    for (let i = 0; i < 11; i++) {
      for (let j = 0; j < 3; j++) {
        slots.push({ x: i * 120, y: j * 80, w: 120, h: 80, filled: false });
      }
    }
  }
  return slots;
}

function checkCollision(
  pivot: [number, number, number],
  dim: [number, number, number],
  placedItems: InternalItem[],
  rules: OptimizationRules
): boolean {
  const [px, py, pz] = pivot;
  const [pw, ph, pd] = dim;

  for (const item of placedItems) {
    const [ix, iy, iz] = item.position;
    const [iw, ih, id] = item.fittedDimension;

    // Strict 3D Non-Overlap
    if (!(px >= ix + iw || px + pw <= ix ||
          py >= iy + ih || py + ph <= iy ||
          pz >= iz + id || pz + pd <= iz)) {
      return true; // collision detected
    }

    // Overhead protection for non-stackable items
    if (rules.enable_overhead_protection && !item.stackable && pz >= iz + id) {
      if (!(px >= ix + iw || px + pw <= ix || py >= iy + ih || py + ph <= iy)) {
        return true; // cannot place on top of non-stackable
      }
    }
  }

  return false;
}

function customPackItemToBin(
  container: ContainerSpec,
  placedItems: InternalItem[],
  item: InternalItem,
  rules: OptimizationRules
): boolean {
  // Generate candidate pivots (Extreme Points)
  const pivotSet = new Map<string, [number, number, number]>();
  pivotSet.set('0,0,0', [0, 0, 0]);

  for (const p of placedItems) {
    const [px, py, pz] = p.position;
    const [pw, ph, pd] = p.fittedDimension;

    const cands: [number, number, number][] = [
      [px + pw, py, pz],
      [px, py + ph, pz],
      [px, py, pz + pd],
    ];

    for (const c of cands) {
      if (c[0] < container.L && c[1] < container.W && c[2] < container.H) {
        pivotSet.set(`${c[0]},${c[1]},${c[2]}`, c);
      }
    }

    for (const q of placedItems) {
      if (p !== q) {
        const [qx, qy] = q.position;
        const [qw, qh] = q.fittedDimension;
        const crossCands: [number, number, number][] = [
          [px + pw, qy, pz],
          [px, qy + qh, pz],
          [qx, py + ph, pz],
          [qx + qw, py + ph, pz],
        ];
        for (const cc of crossCands) {
          if (cc[0] < container.L && cc[1] < container.W && cc[2] < container.H) {
            pivotSet.set(`${cc[0]},${cc[1]},${cc[2]}`, cc);
          }
        }
      }
    }
  }

  const validPivots = Array.from(pivotSet.values());
  // Sort pivots: Z bottom first, then X front first, then Y left first
  validPivots.sort((a, b) => {
    if (a[2] !== b[2]) return a[2] - b[2];
    if (a[0] !== b[0]) return a[0] - b[0];
    return a[1] - b[1];
  });

  const totalCurrentWeight = placedItems.reduce((acc, cur) => acc + cur.weight, 0);

  let bestScore = -Infinity;
  let bestPivot: [number, number, number] | null = null;
  let bestRot: number | null = null;
  let bestDim: [number, number, number] | null = null;

  for (const pivot of validPivots) {
    for (const rot of item.allowedRotations) {
      const dim = getRotatedDims(item.length, item.width, item.height, rot);
      const [w, h, d] = dim;

      if (pivot[0] + w > container.L || pivot[1] + h > container.W || pivot[2] + d > container.H) {
        continue;
      }
      if (totalCurrentWeight + item.weight > container.max_weight) {
        continue;
      }

      if (checkCollision(pivot, dim, placedItems, rules)) {
        continue;
      }

      // Calculate placement score
      let score = 0;

      // Contact with container boundaries
      if (pivot[0] === 0) score += h * d;
      if (pivot[1] === 0) score += w * d;
      if (pivot[2] === 0) score += w * h;
      if (pivot[0] + w === container.L) score += h * d;
      if (pivot[1] + h === container.W) score += w * d;
      if (pivot[2] + d === container.H) score += w * h;

      // Contact with neighboring cargo
      for (const p of placedItems) {
        const [px, py, pz] = p.position;
        const [pw, ph, pd] = p.fittedDimension;

        if (pivot[0] === px + pw || pivot[0] + w === px) {
          const oy = Math.min(pivot[1] + h, py + ph) - Math.max(pivot[1], py);
          const oz = Math.min(pivot[2] + d, pz + pd) - Math.max(pivot[2], pz);
          if (oy > 0 && oz > 0) score += (oy * oz) * 2;
        }
        if (pivot[1] === py + ph || pivot[1] + h === py) {
          const ox = Math.min(pivot[0] + w, px + pw) - Math.max(pivot[0], px);
          const oz = Math.min(pivot[2] + d, pz + pd) - Math.max(pivot[2], pz);
          if (ox > 0 && oz > 0) score += (ox * oz) * 2;
        }
        if (pivot[2] === pz + pd || pivot[2] + d === pz) {
          const ox = Math.min(pivot[0] + w, px + pw) - Math.max(pivot[0], px);
          const oy = Math.min(pivot[1] + h, py + ph) - Math.max(pivot[1], py);
          if (ox > 0 && oy > 0) score += (ox * oy) * 2;
        }
      }

      // Compactness penalty for distance
      score -= (pivot[0] * 0.2 + pivot[1] * 0.1 + pivot[2] * 0.1);

      // RULE: 80cm Width Alignment Rule
      if (rules.enable_80cm_rule) {
        if (Math.abs(h - 80) <= 2 && container.W >= 240) {
          score += rules.bonus_weight;
        }
      }

      // RULE: Rear Door Proximity Penalty ("Instinct de survie")
      if (rules.rear_buffer_cm > 0) {
        const dangerZone = container.L - rules.rear_buffer_cm;
        if (pivot[0] + w > dangerZone) {
          score -= (pivot[0] + w) * 10000;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestPivot = pivot;
        bestRot = rot;
        bestDim = dim;
      }
    }
  }

  if (bestPivot && bestRot !== null && bestDim) {
    item.position = bestPivot;
    item.rotationType = bestRot;
    item.fittedDimension = bestDim;
    placedItems.push(item);
    return true;
  }

  return false;
}

function packWithRules(
  container: ContainerSpec,
  placedItems: InternalItem[],
  item: InternalItem,
  euroSlots: EuroSlot[],
  rules: OptimizationRules
): boolean {
  const isEuro = (Math.abs(item.length - 120) <= 2 && Math.abs(item.width - 80) <= 2) ||
                 (Math.abs(item.length - 80) <= 2 && Math.abs(item.width - 120) <= 2);

  const totalCurrentWeight = placedItems.reduce((acc, cur) => acc + cur.weight, 0);

  if (isEuro && rules.enable_euro_grid && euroSlots.length > 0) {
    for (const slot of euroSlots) {
      if (!slot.filled) {
        if (totalCurrentWeight + item.weight > container.max_weight) continue;
        if (item.height > container.H) continue;

        let assigned = false;
        for (const rot of item.allowedRotations) {
          const dim = getRotatedDims(item.length, item.width, item.height, rot);
          if (Math.abs(dim[0] - slot.w) <= 2 && Math.abs(dim[1] - slot.h) <= 2) {
            let p0 = slot.x;
            const p1 = slot.y;
            const p2 = 0;

            const collision = checkCollision([p0, p1, p2], dim, placedItems, rules);
            if (!collision) {
              // GRAVITY SLIDE (compaction forward along X-axis)
              if (rules.enable_gravity_slide) {
                let minX = 0;
                for (const p of placedItems) {
                  const [ix, iy, iz] = p.position;
                  const [iw, ih, id] = p.fittedDimension;
                  // check if overlapping in Y and Z projection
                  if (!(p1 >= iy + ih || p1 + dim[1] <= iy || p2 >= iz + id || p2 + dim[2] <= iz)) {
                    if (ix + iw <= p0) {
                      minX = Math.max(minX, ix + iw);
                    }
                  }
                }
                p0 = minX;
              }

              item.position = [p0, p1, p2];
              item.rotationType = rot;
              item.fittedDimension = dim;
              placedItems.push(item);
              slot.filled = true;
              assigned = true;
              break;
            }
          }
        }
        if (assigned) return true;
      }
    }
  }

  return customPackItemToBin(container, placedItems, item, rules);
}

export function runCargoOptimization(
  cargoItems: CargoItem[],
  containerType: string,
  maxVehicles: number,
  rules: OptimizationRules
): { vehicles: PackedVehicle[]; unplacedItems: InternalItem[] } {
  const container = CONTAINERS[containerType] || CONTAINERS['TIR (Semi-trailer)'];

  // Sort by priority (1 = highest)
  const sortedCargo = [...cargoItems].sort((a, b) => a.Priority - b.Priority);
  const itemsToPack: InternalItem[] = [];

  // 1. Composite Stacking Logic
  sortedCargo.forEach(cargo => {
    const allowedRotations = getAllowedRotations(cargo.Rotation);
    const isStackable = cargo.Stackable === 'Yes';
    const canRotateHorizontalOnly = cargo.Rotation !== 'Auto (All)';

    let maxStack = 1;
    if (isStackable && canRotateHorizontalOnly) {
      const maxByHeight = Math.floor(container.H / cargo.Height);
      const maxByWeight = cargo.Weight > 0 ? Math.floor(container.max_weight / cargo.Weight) : 999;
      maxStack = Math.max(1, Math.min(maxByHeight, maxByWeight));
    }

    let remainingQty = cargo.Quantity;
    let stackIdx = 0;

    while (remainingQty > 0) {
      const currentStackQty = Math.min(remainingQty, maxStack);
      stackIdx++;
      itemsToPack.push({
        id: `${cargo.id}_stack_${stackIdx}`,
        name: `${cargo.Reference} #Stack${stackIdx}`,
        originalRef: cargo.Reference,
        length: cargo.Length,
        width: cargo.Width,
        height: cargo.Height * currentStackQty,
        weight: cargo.Weight * currentStackQty,
        allowedRotations,
        stackable: isStackable,
        color: cargo.Color,
        originalQty: currentStackQty,
        originalHeight: cargo.Height,
        originalWeight: cargo.Weight,
        rotationType: 0,
        position: [0, 0, 0],
        fittedDimension: [cargo.Length, cargo.Width, cargo.Height * currentStackQty],
      });
      remainingQty -= currentStackQty;
    }
  });

  let remainingQueue = [...itemsToPack];
  const vehicles: PackedVehicle[] = [];

  // 2. Multi-vehicle Packing loop
  for (let vIdx = 0; vIdx < maxVehicles; vIdx++) {
    if (remainingQueue.length === 0) break;

    const placedItems: InternalItem[] = [];
    const euroSlots = getOptimalEuroSlots(container.name);
    const nextQueue: InternalItem[] = [];

    for (const item of remainingQueue) {
      const success = packWithRules(container, placedItems, item, euroSlots, rules);
      if (!success) {
        nextQueue.push(item);
      }
    }

    if (placedItems.length > 0) {
      // 3. Unpack composite stacks into individual boxes
      const finalItems: PackedItem[] = [];
      placedItems.forEach(stackedItem => {
        if (stackedItem.originalQty > 1) {
          const [x, y, z] = stackedItem.position;
          const [dimW, dimH] = [stackedItem.fittedDimension[0], stackedItem.fittedDimension[1]];
          const singleH = stackedItem.originalHeight;
          const singleWgt = stackedItem.originalWeight;

          for (let q = 0; q < stackedItem.originalQty; q++) {
            finalItems.push({
              id: `${stackedItem.id}_unit_${q}`,
              name: `${stackedItem.originalRef} #${q + 1}`,
              originalRef: stackedItem.originalRef,
              position: [x, y, z + q * singleH],
              dimension: [dimW, dimH, singleH],
              weight: singleWgt,
              stackable: stackedItem.stackable,
              color: stackedItem.color,
              rotationType: stackedItem.rotationType,
            });
          }
        } else {
          finalItems.push({
            id: stackedItem.id,
            name: `${stackedItem.originalRef} #1`,
            originalRef: stackedItem.originalRef,
            position: stackedItem.position,
            dimension: stackedItem.fittedDimension,
            weight: stackedItem.weight,
            stackable: stackedItem.stackable,
            color: stackedItem.color,
            rotationType: stackedItem.rotationType,
          });
        }
      });

      const maxOccupiedX = finalItems.length > 0
        ? Math.max(...finalItems.map(i => i.position[0] + i.dimension[0]))
        : 0;
      const remX = Math.max(0, container.L - maxOccupiedX);

      const totalVol = container.L * container.W * container.H;
      const usedVol = finalItems.reduce((acc, i) => acc + (i.dimension[0] * i.dimension[1] * i.dimension[2]), 0);
      const totalWeight = finalItems.reduce((acc, i) => acc + i.weight, 0);

      vehicles.push({
        vehicleId: `v_${vIdx + 1}`,
        name: `${container.name} #${vIdx + 1}`,
        container,
        items: finalItems,
        usedLength: maxOccupiedX,
        remainingLength: remX,
        totalVolume: totalVol,
        usedVolume: usedVol,
        volFillRate: totalVol > 0 ? (usedVol / totalVol) * 100 : 0,
        totalWeight,
        weightFillRate: (totalWeight / container.max_weight) * 100,
      });
    }

    remainingQueue = nextQueue;
  }

  return {
    vehicles,
    unplacedItems: remainingQueue,
  };
}
