export type RotationPolicy = 
  | 'Auto (Horizontal)' 
  | 'Auto (All)' 
  | 'Strict: L -> Length' 
  | 'Strict: W -> Length';

export interface CargoItem {
  id: string;
  Priority: number;
  Reference: string;
  Quantity: number;
  Length: number; // in cm
  Width: number;  // in cm
  Height: number; // in cm
  Weight: number; // in kg
  Rotation: RotationPolicy;
  Stackable: 'Yes' | 'No';
  Color: string;
}

export interface OptimizationRules {
  rear_buffer_cm: number;
  enable_80cm_rule: boolean;
  bonus_weight: number;
  enable_euro_grid: boolean;
  enable_gravity_slide: boolean;
  enable_strict_collision: boolean;
  enable_overhead_protection: boolean;
}

export interface ContainerSpec {
  name: string;
  L: number;
  W: number;
  H: number;
  max_weight: number;
}

export interface PackedItem {
  id: string;
  name: string;
  originalRef: string;
  position: [number, number, number]; // [x, y, z] in cm
  dimension: [number, number, number]; // [w, h, d] -> [length, width, height]
  weight: number;
  stackable: boolean;
  color: string;
  rotationType: number;
}

export interface PackedVehicle {
  vehicleId: string;
  name: string;
  container: ContainerSpec;
  items: PackedItem[];
  usedLength: number;
  remainingLength: number;
  totalVolume: number;
  usedVolume: number;
  volFillRate: number;
  totalWeight: number;
  weightFillRate: number;
}
