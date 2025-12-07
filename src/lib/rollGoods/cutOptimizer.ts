import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { calculateBoundingBox, calculateStripPlan, extractRollMaterialSpecs } from './greedyStrip';
import {
  RollMaterialSpecs,
  StripPlanResult,
  StripPlanOptions,
  Strip,
} from './types';

/**
 * Represents a usable offcut/drop piece from a roll
 */
export interface DropPiece {
  id: string;
  sourceRoomId: string;
  sourceRoomName: string;
  sourceStripId: string;
  length: number;        // Length in mm (remaining usable length)
  width: number;         // Roll width in mm
  patternOffset: number; // Pattern offset for matching
  cost: number;          // Allocated cost for this piece
  isUsed: boolean;       // Whether this piece has been allocated
  usedByRoomId?: string; // Room that uses this piece
}

/**
 * Represents how a drop piece is reused
 */
export interface ReusedPiece {
  pieceId: string;
  fromRoomId: string;
  fromRoomName: string;
  toRoomId: string;
  toRoomName: string;
  lengthUsed: number;    // mm
  lengthRemaining: number; // mm left after use
  costSaved: number;
}

/**
 * A bin representing a roll of material
 */
interface RollBin {
  id: string;
  rollLengthMm: number;     // Total roll length
  usedLengthMm: number;     // Amount used
  remainingMm: number;      // Amount remaining
  cuts: BinCut[];           // Cuts made from this roll
}

/**
 * A cut from a roll bin
 */
interface BinCut {
  id: string;
  roomId: string;
  roomName: string;
  stripId: string;
  lengthMm: number;
  startPosition: number;    // Position on roll where cut starts
}

/**
 * Result of cross-room optimization
 */
export interface OptimizedCutPlan {
  // Individual room plans (original, for reference)
  originalRoomPlans: StripPlanResult[];
  
  // Optimized results
  optimizedRoomPlans: StripPlanResult[];
  
  // Cross-room optimization details
  drops: DropPiece[];
  reusedPieces: ReusedPiece[];
  rollBins: RollBin[];
  
  // Totals (optimized)
  totalRollsNeeded: number;
  totalRollLengthM: number;
  rollUtilization: number;  // Percentage
  totalWasteM2: number;
  totalCost: number;
  
  // Comparison to non-optimized
  originalTotalCost: number;
  originalWasteM2: number;
  originalRollsNeeded: number;
  wasteSavedM2: number;
  costSaved: number;
  rollsSaved: number;
  
  // Summary
  optimizationPercent: number; // How much waste was reduced
}

/**
 * Options for cross-room optimization
 */
export interface OptimizationOptions extends StripPlanOptions {
  // Minimum usable drop length (mm) - drops shorter than this are waste
  minDropLength?: number;
  
  // Whether to allow pattern mismatch for small areas (closets, etc)
  allowPatternMismatch?: boolean;
  
  // Maximum pattern offset difference for matching
  maxPatternOffsetDiff?: number;
  
  // Prioritize certain rooms (e.g., visible areas first)
  roomPriority?: string[]; // Room IDs in priority order
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Sort rooms by area (largest first) for optimal bin packing
 */
function sortRoomsByArea(rooms: Room[], scale: ScaleCalibration | null): Room[] {
  return [...rooms].sort((a, b) => {
    const bboxA = calculateBoundingBox(a.points, scale);
    const bboxB = calculateBoundingBox(b.points, scale);
    return (bboxB.width * bboxB.height) - (bboxA.width * bboxA.height);
  });
}

/**
 * Calculate the effective roll length needed for a strip
 */
function getStripRollLength(strip: Strip, patternRepeat: number): number {
  if (patternRepeat > 0) {
    // Round up to pattern repeat for clean cuts
    return Math.ceil(strip.length / patternRepeat) * patternRepeat;
  }
  return strip.length;
}

/**
 * Best-Fit Decreasing (BFD) bin packing algorithm
 * Allocates strips to rolls, minimizing waste
 */
function packStripsIntoBins(
  strips: Array<{ strip: Strip; roomId: string; roomName: string }>,
  material: RollMaterialSpecs,
  options: OptimizationOptions
): { bins: RollBin[]; drops: DropPiece[] } {
  const rollLengthMm = (material.rollLengthM || 30) * 1000; // Default 30m rolls
  const minDropLength = options.minDropLength || 500; // Default 500mm minimum usable
  
  // Sort strips by length (longest first) for better packing
  const sortedStrips = [...strips].sort((a, b) => b.strip.length - a.strip.length);
  
  const bins: RollBin[] = [];
  const drops: DropPiece[] = [];
  
  for (const { strip, roomId, roomName } of sortedStrips) {
    const stripLength = getStripRollLength(strip, material.patternRepeat);
    
    // Find best-fit bin (bin with least remaining space that still fits)
    let bestBin: RollBin | null = null;
    let bestFit = Infinity;
    
    for (const bin of bins) {
      if (bin.remainingMm >= stripLength) {
        const fit = bin.remainingMm - stripLength;
        if (fit < bestFit) {
          bestFit = fit;
          bestBin = bin;
        }
      }
    }
    
    if (bestBin) {
      // Add to existing bin
      const cut: BinCut = {
        id: generateId('cut'),
        roomId,
        roomName,
        stripId: strip.id,
        lengthMm: stripLength,
        startPosition: bestBin.usedLengthMm,
      };
      
      bestBin.cuts.push(cut);
      bestBin.usedLengthMm += stripLength;
      bestBin.remainingMm -= stripLength;
    } else {
      // Create new bin (roll)
      const newBin: RollBin = {
        id: generateId('roll'),
        rollLengthMm,
        usedLengthMm: stripLength,
        remainingMm: rollLengthMm - stripLength,
        cuts: [{
          id: generateId('cut'),
          roomId,
          roomName,
          stripId: strip.id,
          lengthMm: stripLength,
          startPosition: 0,
        }],
      };
      bins.push(newBin);
    }
  }
  
  // Generate drops from remaining bin space
  for (const bin of bins) {
    if (bin.remainingMm >= minDropLength) {
      // This is a usable drop
      const lastCut = bin.cuts[bin.cuts.length - 1];
      drops.push({
        id: generateId('drop'),
        sourceRoomId: lastCut.roomId,
        sourceRoomName: lastCut.roomName,
        sourceStripId: lastCut.stripId,
        length: bin.remainingMm,
        width: material.width,
        patternOffset: 0, // Would need more complex tracking for pattern
        cost: 0, // Will be calculated based on pricing
        isUsed: false,
      });
    }
  }
  
  return { bins, drops };
}

/**
 * Try to match drops to smaller room strips
 */
function matchDropsToStrips(
  drops: DropPiece[],
  strips: Array<{ strip: Strip; roomId: string; roomName: string }>,
  material: RollMaterialSpecs,
  options: OptimizationOptions
): ReusedPiece[] {
  const reused: ReusedPiece[] = [];
  const minDropLength = options.minDropLength || 500;
  
  // Sort strips by length (shortest first) for drop matching
  const sortedStrips = [...strips].sort((a, b) => a.strip.length - b.strip.length);
  
  // Sort drops by length (longest first) 
  const sortedDrops = [...drops].sort((a, b) => b.length - a.length);
  
  for (const { strip, roomId, roomName } of sortedStrips) {
    const stripLength = getStripRollLength(strip, material.patternRepeat);
    
    // Find a drop that can cover this strip
    for (const drop of sortedDrops) {
      if (!drop.isUsed && drop.length >= stripLength) {
        // Check pattern compatibility if applicable
        if (material.patternRepeat > 0 && !options.allowPatternMismatch) {
          const offsetDiff = Math.abs(drop.patternOffset - strip.patternOffset);
          const maxDiff = options.maxPatternOffsetDiff || material.patternRepeat / 4;
          if (offsetDiff > maxDiff && offsetDiff < material.patternRepeat - maxDiff) {
            continue; // Pattern doesn't match
          }
        }
        
        // Use this drop
        drop.isUsed = true;
        drop.usedByRoomId = roomId;
        
        const lengthRemaining = drop.length - stripLength;
        
        // Calculate cost saved (proportional to length used)
        const pricePerMm = material.pricePerLinearM 
          ? material.pricePerLinearM / 1000
          : material.pricePerM2 
            ? (material.pricePerM2 * material.width / 1000) / 1000
            : 0;
        const costSaved = stripLength * pricePerMm;
        
        reused.push({
          pieceId: drop.id,
          fromRoomId: drop.sourceRoomId,
          fromRoomName: drop.sourceRoomName,
          toRoomId: roomId,
          toRoomName: roomName,
          lengthUsed: stripLength,
          lengthRemaining,
          costSaved,
        });
        
        // If there's enough remaining, create a new drop
        if (lengthRemaining >= minDropLength) {
          drops.push({
            id: generateId('drop'),
            sourceRoomId: roomId,
            sourceRoomName: roomName,
            sourceStripId: strip.id,
            length: lengthRemaining,
            width: material.width,
            patternOffset: (drop.patternOffset + stripLength) % (material.patternRepeat || 1),
            cost: 0,
            isUsed: false,
          });
        }
        
        break; // Move to next strip
      }
    }
  }
  
  return reused;
}

/**
 * Cross-room optimization using best-fit bin packing and drop reuse
 */
export function optimizeCutPlan(
  rooms: Room[],
  material: RollMaterialSpecs,
  scale: ScaleCalibration | null,
  options: OptimizationOptions = {}
): OptimizedCutPlan {
  // Step 1: Calculate original (non-optimized) plans for comparison
  const originalRoomPlans = rooms.map(room => 
    calculateStripPlan(room, material, scale, options)
  );
  
  const originalTotalCost = originalRoomPlans.reduce((sum, p) => sum + p.materialCost, 0);
  const originalWasteM2 = originalRoomPlans.reduce((sum, p) => sum + p.wasteAreaM2, 0);
  const originalTotalLengthM = originalRoomPlans.reduce((sum, p) => sum + p.totalRollLengthM, 0);
  const rollLengthM = material.rollLengthM || 30;
  const originalRollsNeeded = Math.ceil(originalTotalLengthM / rollLengthM);
  
  // Step 2: Sort rooms by area (largest first for better packing)
  const sortedRooms = sortRoomsByArea(rooms, scale);
  
  // Step 3: Collect all strips from all rooms
  const allStrips: Array<{ strip: Strip; roomId: string; roomName: string }> = [];
  
  for (const room of sortedRooms) {
    const plan = originalRoomPlans.find(p => p.roomId === room.id);
    if (plan) {
      for (const strip of plan.strips) {
        allStrips.push({
          strip,
          roomId: room.id,
          roomName: room.name,
        });
      }
    }
  }
  
  // Step 4: Pack strips into bins (rolls)
  const { bins, drops } = packStripsIntoBins(allStrips, material, options);
  
  // Step 5: Try to reuse drops for smaller strips
  const reusedPieces = matchDropsToStrips(drops, allStrips, material, options);
  
  // Step 6: Calculate optimized totals
  const totalRollsNeeded = bins.length;
  const totalUsedLengthMm = bins.reduce((sum, b) => sum + b.usedLengthMm, 0);
  const totalRollLengthM = totalUsedLengthMm / 1000;
  
  // Calculate waste from unused portions of rolls
  const totalWasteLengthMm = bins.reduce((sum, b) => {
    // Only count remaining space as waste if it's not a usable drop
    const unusedDrop = drops.find(d => 
      !d.isUsed && 
      d.sourceStripId === b.cuts[b.cuts.length - 1]?.stripId
    );
    return sum + (unusedDrop ? 0 : b.remainingMm);
  }, 0);
  
  const rollWidthM = material.width / 1000;
  const totalWasteM2 = (totalWasteLengthMm / 1000) * rollWidthM;
  
  // Calculate roll utilization
  const totalRollCapacityMm = bins.length * (material.rollLengthM || 30) * 1000;
  const rollUtilization = totalRollCapacityMm > 0 
    ? (totalUsedLengthMm / totalRollCapacityMm) * 100 
    : 0;
  
  // Calculate optimized cost
  let totalCost = 0;
  if (material.pricePerRoll) {
    totalCost = totalRollsNeeded * material.pricePerRoll;
  } else if (material.pricePerLinearM) {
    totalCost = totalRollLengthM * material.pricePerLinearM;
  } else if (material.pricePerM2) {
    totalCost = totalRollLengthM * rollWidthM * material.pricePerM2;
  }
  
  // Account for cost saved from drop reuse
  const costFromReuse = reusedPieces.reduce((sum, r) => sum + r.costSaved, 0);
  
  // Calculate savings
  const wasteSavedM2 = originalWasteM2 - totalWasteM2;
  const costSaved = originalTotalCost - totalCost + costFromReuse;
  const rollsSaved = originalRollsNeeded - totalRollsNeeded;
  
  const optimizationPercent = originalWasteM2 > 0 
    ? (wasteSavedM2 / originalWasteM2) * 100 
    : 0;
  
  return {
    originalRoomPlans,
    optimizedRoomPlans: originalRoomPlans, // For now, same plans with shared resources
    
    drops,
    reusedPieces,
    rollBins: bins,
    
    totalRollsNeeded,
    totalRollLengthM,
    rollUtilization,
    totalWasteM2: Math.max(0, totalWasteM2),
    totalCost,
    
    originalTotalCost,
    originalWasteM2,
    originalRollsNeeded,
    wasteSavedM2: Math.max(0, wasteSavedM2),
    costSaved: Math.max(0, costSaved),
    rollsSaved: Math.max(0, rollsSaved),
    
    optimizationPercent: Math.max(0, optimizationPercent),
  };
}

/**
 * Get a summary of the optimization for display
 */
export function getOptimizationSummary(plan: OptimizedCutPlan): {
  headline: string;
  details: string[];
  savings: { label: string; value: string }[];
} {
  const details: string[] = [];
  const savings: { label: string; value: string }[] = [];
  
  if (plan.rollsSaved > 0) {
    details.push(`Reduced from ${plan.originalRollsNeeded} to ${plan.totalRollsNeeded} rolls`);
    savings.push({ label: 'Rolls Saved', value: plan.rollsSaved.toString() });
  }
  
  if (plan.wasteSavedM2 > 0) {
    details.push(`Waste reduced by ${plan.wasteSavedM2.toFixed(2)} m²`);
    savings.push({ label: 'Waste Saved', value: `${plan.wasteSavedM2.toFixed(2)} m²` });
  }
  
  if (plan.costSaved > 0) {
    savings.push({ label: 'Cost Saved', value: `$${plan.costSaved.toFixed(2)}` });
  }
  
  if (plan.reusedPieces.length > 0) {
    details.push(`${plan.reusedPieces.length} drop pieces reused across rooms`);
  }
  
  savings.push({ label: 'Utilization', value: `${plan.rollUtilization.toFixed(1)}%` });
  
  const headline = plan.optimizationPercent > 0
    ? `Optimization reduced waste by ${plan.optimizationPercent.toFixed(1)}%`
    : 'Rooms are already optimally arranged';
  
  return { headline, details, savings };
}
