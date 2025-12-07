import { Room } from '@/lib/canvas/types';

export interface WastageSuggestionInput {
  totalAreaM2: number;
  roomCount: number;
  averageRoomAreaM2: number;
  totalVertices: number;
  totalHoles: number;
  totalDoors: number;
}

export interface WastageSuggestion {
  suggestedPercent: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  factors: {
    areaFactor: number;
    roomSizeFactor: number;
    complexityFactor: number;
    cutoutFactor: number;
  };
}

export interface ComplexityMetrics {
  totalAreaM2: number;
  roomCount: number;
  averageRoomAreaM2: number;
  totalVertices: number;
  averageVerticesPerRoom: number;
  totalHoles: number;
  totalDoors: number;
  isSimple: boolean; // mostly rectangular rooms
}

/**
 * Analyze room complexity for wastage calculation
 */
export function analyzeRoomComplexity(
  rooms: Room[],
  materialId: string,
  getAreaM2: (room: Room) => number
): ComplexityMetrics {
  const relevantRooms = rooms.filter(r => r.materialId === materialId);
  
  if (relevantRooms.length === 0) {
    return {
      totalAreaM2: 0,
      roomCount: 0,
      averageRoomAreaM2: 0,
      totalVertices: 0,
      averageVerticesPerRoom: 0,
      totalHoles: 0,
      totalDoors: 0,
      isSimple: true,
    };
  }
  
  const totalAreaM2 = relevantRooms.reduce((sum, room) => sum + getAreaM2(room), 0);
  const totalVertices = relevantRooms.reduce((sum, room) => sum + room.points.length, 0);
  const totalHoles = relevantRooms.reduce((sum, room) => sum + room.holes.length, 0);
  const totalDoors = relevantRooms.reduce((sum, room) => sum + room.doors.length, 0);
  
  const averageVerticesPerRoom = totalVertices / relevantRooms.length;
  const isSimple = averageVerticesPerRoom <= 5; // 4-5 vertices = rectangular or simple
  
  return {
    totalAreaM2,
    roomCount: relevantRooms.length,
    averageRoomAreaM2: totalAreaM2 / relevantRooms.length,
    totalVertices,
    averageVerticesPerRoom,
    totalHoles,
    totalDoors,
    isSimple,
  };
}

/**
 * Calculate intelligent wastage percentage based on project characteristics
 * 
 * Base: 7% (industry standard for typical residential)
 * Range: 3.5% minimum → 15% maximum
 */
export function suggestWastePercent(input: WastageSuggestionInput): WastageSuggestion {
  const BASE_WASTE = 7;
  const MIN_WASTE = 3.5;
  const MAX_WASTE = 15;
  
  // Factor 1: Total Area (larger projects = more efficient cutting)
  let areaFactor = 0;
  if (input.totalAreaM2 >= 1000) {
    areaFactor = -2.5; // Very large: -2.5%
  } else if (input.totalAreaM2 >= 500) {
    areaFactor = -1.5; // Large: -1.5%
  } else if (input.totalAreaM2 >= 200) {
    areaFactor = -0.5; // Medium: -0.5%
  } else if (input.totalAreaM2 >= 50) {
    areaFactor = 0.5; // Small: +0.5%
  } else if (input.totalAreaM2 >= 20) {
    areaFactor = 1.5; // Very small: +1.5%
  } else {
    areaFactor = 3; // Tiny: +3%
  }
  
  // Factor 2: Average Room Size (larger rooms = less edge waste)
  let roomSizeFactor = 0;
  if (input.averageRoomAreaM2 >= 100) {
    roomSizeFactor = -1.5; // Very large rooms
  } else if (input.averageRoomAreaM2 >= 50) {
    roomSizeFactor = -1; // Large rooms
  } else if (input.averageRoomAreaM2 >= 25) {
    roomSizeFactor = -0.5; // Medium rooms
  } else if (input.averageRoomAreaM2 >= 10) {
    roomSizeFactor = 0.5; // Small rooms
  } else if (input.averageRoomAreaM2 >= 5) {
    roomSizeFactor = 1.5; // Very small rooms
  } else {
    roomSizeFactor = 2.5; // Tiny rooms (bathrooms, closets)
  }
  
  // Factor 3: Shape Complexity (more vertices = more cuts = more waste)
  const avgVertices = input.roomCount > 0 ? input.totalVertices / input.roomCount : 4;
  let complexityFactor = 0;
  if (avgVertices <= 4) {
    complexityFactor = -0.5; // Simple rectangles
  } else if (avgVertices <= 6) {
    complexityFactor = 0; // L-shapes, simple polygons
  } else if (avgVertices <= 8) {
    complexityFactor = 1; // Moderately complex
  } else if (avgVertices <= 12) {
    complexityFactor = 2; // Complex shapes
  } else {
    complexityFactor = 3; // Very complex
  }
  
  // Factor 4: Cutouts (holes and doors add waste)
  const totalCutouts = input.totalHoles + input.totalDoors;
  let cutoutFactor = 0;
  if (totalCutouts === 0) {
    cutoutFactor = -0.5;
  } else if (totalCutouts <= 2) {
    cutoutFactor = 0;
  } else if (totalCutouts <= 5) {
    cutoutFactor = 0.5;
  } else if (totalCutouts <= 10) {
    cutoutFactor = 1;
  } else {
    cutoutFactor = 1.5;
  }
  
  // Calculate final percentage
  const totalAdjustment = areaFactor + roomSizeFactor + complexityFactor + cutoutFactor;
  const rawPercent = BASE_WASTE + totalAdjustment;
  const suggestedPercent = Math.max(MIN_WASTE, Math.min(MAX_WASTE, rawPercent));
  
  // Determine confidence based on data quality
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (input.roomCount >= 3 && input.totalAreaM2 >= 50) {
    confidence = 'high';
  } else if (input.roomCount < 2 || input.totalAreaM2 < 20) {
    confidence = 'low';
  }
  
  // Generate reasoning
  const reasoning = generateReasoning(input, suggestedPercent, {
    areaFactor,
    roomSizeFactor,
    complexityFactor,
    cutoutFactor,
  });
  
  return {
    suggestedPercent: Math.round(suggestedPercent * 10) / 10, // Round to 1 decimal
    confidence,
    reasoning,
    factors: {
      areaFactor,
      roomSizeFactor,
      complexityFactor,
      cutoutFactor,
    },
  };
}

function generateReasoning(
  input: WastageSuggestionInput,
  percent: number,
  factors: WastageSuggestion['factors']
): string {
  const parts: string[] = [];
  
  // Area description
  if (input.totalAreaM2 >= 500) {
    parts.push('large project area');
  } else if (input.totalAreaM2 < 50) {
    parts.push('small project area');
  }
  
  // Room size description
  if (input.averageRoomAreaM2 >= 50) {
    parts.push('open layouts');
  } else if (input.averageRoomAreaM2 < 10) {
    parts.push('compact rooms');
  }
  
  // Complexity description
  const avgVertices = input.roomCount > 0 ? input.totalVertices / input.roomCount : 4;
  if (avgVertices <= 4) {
    parts.push('simple rectangular shapes');
  } else if (avgVertices > 8) {
    parts.push('complex room shapes');
  }
  
  // Cutouts description
  const totalCutouts = input.totalHoles + input.totalDoors;
  if (totalCutouts > 5) {
    parts.push('many cutouts');
  } else if (totalCutouts === 0) {
    parts.push('no cutouts');
  }
  
  if (parts.length === 0) {
    return 'Standard project characteristics';
  }
  
  const prefix = percent <= 5 ? 'Low waste due to' : 
                 percent >= 10 ? 'Higher waste due to' : 
                 'Moderate waste based on';
  
  return `${prefix} ${parts.join(', ')}`;
}

export type WasteOverrides = Record<string, number>; // materialId -> waste%
