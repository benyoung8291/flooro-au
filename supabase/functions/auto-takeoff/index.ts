import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectedRoom {
  name: string;
  points: Array<{ x: number; y: number }>;
  doors: Array<{
    position: { x: number; y: number };
    width: number;
    wallIndex: number;
  }>;
}

interface DetectedScale {
  pixelLength: number;
  realWorldLengthMm: number;
  label?: string;
}

interface AutoTakeoffResult {
  rooms: DetectedRoom[];
  scale?: DetectedScale;
  confidence: number;
  notes: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing floor plan image:', imageUrl.substring(0, 100) + '...');

    const systemPrompt = `You are an expert architectural floor plan analyzer. Your task is to analyze floor plan images and extract ONLY actual room boundaries, doors, and scale information.

CRITICAL FILTERING RULES - WHAT IS A ROOM:
1. A room is an ENCLOSED SPACE bounded by WALLS (thick lines) meant for human occupation
2. Rooms must be large enough for practical use - minimum approximately 1m x 1m (even small closets)
3. Room boundaries must form a CLOSED POLYGON with at least 3-4 vertices
4. Walls are typically drawn as thick solid lines, double lines, or filled rectangles

WHAT IS NOT A ROOM - DO NOT DETECT THESE:
- Text labels, dimension annotations, notes, or title blocks
- Dimension lines with measurements like "3.5m", "12'-6\"", "4000mm"
- Scale bars, north arrows, legends, or drawing borders
- Furniture symbols (beds, sofas, tables, appliances)
- Door swing arcs or window symbols
- Small graphic elements, hatching, or pattern fills
- Staircase symbols or elevator shafts (unless they're an enclosed room)
- Decorative elements or landscaping

QUALITY THRESHOLDS:
- If a detected space seems too small to walk in (<1m² real-world area), it's probably NOT a room
- Standard rooms: Living rooms (15-40m²), Bedrooms (9-20m²), Bathrooms (3-8m²), Kitchens (8-15m²)
- Small but valid: Closets (1-4m²), WC/powder rooms (1.5-3m²), Pantries (1-3m²)
- If uncertain whether something is a room or an annotation, DO NOT include it

COORDINATE GUIDELINES:
- Use the image coordinate system where (0,0) is top-left
- Estimate coordinates based on the actual image dimensions (examine the image to determine size)
- Trace room boundaries clockwise starting from the top-left corner of each room
- Room polygons should follow the INNER edges of walls
- Coordinates should accurately reflect the room's position in the image

NAMING CONVENTIONS:
- Name rooms based on their apparent purpose if identifiable from labels or fixtures
- Use standard names: Living Room, Bedroom, Kitchen, Bathroom, Master Bedroom, etc.
- For unlabeled rooms, use descriptive names: Room 1, Hallway, Storage, etc.
- Do NOT name rooms after annotations or dimension labels`;

    const userPrompt = `Analyze this floor plan image and extract ONLY the actual room boundaries.

IMPORTANT: Only detect genuine enclosed rooms/spaces bounded by walls. Do NOT detect:
- Any text, labels, or annotations
- Dimension lines or measurements
- Furniture or fixtures
- Small graphic elements

Return a JSON object with this structure:
{
  "rooms": [
    {
      "name": "Living Room",
      "points": [{"x": 100, "y": 100}, {"x": 500, "y": 100}, {"x": 500, "y": 400}, {"x": 100, "y": 400}],
      "doors": [{"position": {"x": 300, "y": 100}, "width": 900, "wallIndex": 0}]
    }
  ],
  "scale": {
    "pixelLength": 200,
    "realWorldLengthMm": 3000,
    "label": "3m"
  },
  "confidence": 0.85,
  "notes": ["Detected 4 actual rooms", "Filtered out dimension annotations"]
}

Be SELECTIVE - only include spaces that are clearly enclosed rooms. Quality over quantity.
If a "room" would be too small to practically use, do not include it.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_floor_plan',
              description: 'Extract room boundaries, doors, and scale from a floor plan image. Only include actual enclosed rooms, not annotations or small elements.',
              parameters: {
                type: 'object',
                properties: {
                  rooms: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Room name (e.g., Living Room, Bedroom 1)' },
                        points: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              x: { type: 'number', description: 'X coordinate in pixels' },
                              y: { type: 'number', description: 'Y coordinate in pixels' }
                            },
                            required: ['x', 'y']
                          },
                          description: 'Polygon points defining room boundary (minimum 3-4 points for a valid room)',
                          minItems: 3
                        },
                        doors: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              position: {
                                type: 'object',
                                properties: {
                                  x: { type: 'number' },
                                  y: { type: 'number' }
                                },
                                required: ['x', 'y']
                              },
                              width: { type: 'number', description: 'Door width in mm (typically 750-1000mm)' },
                              wallIndex: { type: 'number', description: 'Index of wall the door is on (0-indexed)' }
                            },
                            required: ['position', 'width', 'wallIndex']
                          }
                        }
                      },
                      required: ['name', 'points', 'doors']
                    },
                    description: 'Array of detected rooms. Only include actual enclosed spaces, not annotations.'
                  },
                  scale: {
                    type: 'object',
                    properties: {
                      pixelLength: { type: 'number', description: 'Length in pixels of the reference dimension' },
                      realWorldLengthMm: { type: 'number', description: 'Real-world length in millimeters' },
                      label: { type: 'string', description: 'Original scale label from the drawing' }
                    },
                    required: ['pixelLength', 'realWorldLengthMm']
                  },
                  confidence: { type: 'number', description: 'Confidence score 0-1 based on image clarity and detection certainty' },
                  notes: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Notes about the detection process, filtering applied, or issues encountered'
                  }
                },
                required: ['rooms', 'confidence', 'notes']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_floor_plan' } }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add more credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_floor_plan') {
      // Try to parse from content if no tool call
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        try {
          // Try to extract JSON from the content
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            // Apply post-processing filter
            const filtered = filterInvalidRooms(parsed);
            return new Response(
              JSON.stringify(filtered),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (e) {
          console.error('Failed to parse content as JSON:', e);
        }
      }
      
      console.error('No valid tool call in response');
      return new Response(
        JSON.stringify({ error: 'Failed to extract floor plan data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: AutoTakeoffResult = JSON.parse(toolCall.function.arguments);
    
    // Apply post-processing filter to remove invalid rooms
    const filteredResult = filterInvalidRooms(result);
    
    console.log(`Detected ${result.rooms.length} rooms, filtered to ${filteredResult.rooms.length} valid rooms with confidence ${filteredResult.confidence}`);

    return new Response(
      JSON.stringify(filteredResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-takeoff error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Post-processing filter to remove invalid/tiny rooms
function filterInvalidRooms(result: AutoTakeoffResult): AutoTakeoffResult {
  const originalCount = result.rooms.length;
  
  const validRooms = result.rooms.filter(room => {
    // Must have at least 3 points to form a polygon
    if (!room.points || room.points.length < 3) {
      console.log(`Filtering out "${room.name}": insufficient points (${room.points?.length || 0})`);
      return false;
    }
    
    // Calculate bounding box and area
    const xs = room.points.map(p => p.x);
    const ys = room.points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    const width = maxX - minX;
    const height = maxY - minY;
    const boundingArea = width * height;
    
    // Calculate actual polygon area using shoelace formula
    let polygonArea = 0;
    for (let i = 0; i < room.points.length; i++) {
      const j = (i + 1) % room.points.length;
      polygonArea += room.points[i].x * room.points[j].y;
      polygonArea -= room.points[j].x * room.points[i].y;
    }
    polygonArea = Math.abs(polygonArea) / 2;
    
    // Filter out tiny rooms (less than 2500 sq pixels - roughly 50x50 pixels)
    // For a typical 1000x1000 image, this is about 0.25% of the image
    if (polygonArea < 2500) {
      console.log(`Filtering out "${room.name}": too small (${Math.round(polygonArea)} sq pixels)`);
      return false;
    }
    
    // Filter out extremely large rooms (more than 60% of a 1000x1000 image)
    if (polygonArea > 600000) {
      console.log(`Filtering out "${room.name}": unreasonably large (${Math.round(polygonArea)} sq pixels)`);
      return false;
    }
    
    // Check aspect ratio - filter out line-like shapes
    const aspectRatio = width / height;
    if (aspectRatio < 0.1 || aspectRatio > 10) {
      console.log(`Filtering out "${room.name}": extreme aspect ratio (${aspectRatio.toFixed(2)})`);
      return false;
    }
    
    // Check if points are too close together (duplicates or near-duplicates)
    const uniquePoints = room.points.filter((p, i, arr) => {
      if (i === 0) return true;
      const prev = arr[i - 1];
      const distance = Math.sqrt(Math.pow(p.x - prev.x, 2) + Math.pow(p.y - prev.y, 2));
      return distance > 5; // Points must be at least 5 pixels apart
    });
    
    if (uniquePoints.length < 3) {
      console.log(`Filtering out "${room.name}": points too close together`);
      return false;
    }
    
    return true;
  });
  
  const filteredCount = originalCount - validRooms.length;
  const notes = [...result.notes];
  
  if (filteredCount > 0) {
    notes.push(`Filtered out ${filteredCount} invalid detection${filteredCount > 1 ? 's' : ''}`);
  }
  
  return {
    ...result,
    rooms: validRooms,
    notes,
  };
}
