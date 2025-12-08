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

    const systemPrompt = `You are an expert floor plan analyzer. Your task is to analyze floor plan images and extract room boundaries, doors, and scale information.

CRITICAL INSTRUCTIONS:
1. Analyze the floor plan image carefully to identify all distinct rooms/spaces
2. For each room, trace the boundary as a polygon with x,y coordinates
3. Identify doors as openings in walls - note their position and approximate width
4. Look for scale indicators (dimension lines with measurements) to determine real-world scale
5. Use the image coordinate system where (0,0) is top-left, x increases rightward, y increases downward
6. Room polygons should be closed (first and last points don't need to repeat)
7. Name rooms based on their apparent purpose (Living Room, Bedroom, Kitchen, Bathroom, etc.) or use generic names (Room 1, Room 2) if unclear
8. Coordinates should be in pixel units relative to the image dimensions

COORDINATE GUIDELINES:
- Assume the image is approximately 1000x1000 pixels for coordinate estimation
- Trace room boundaries clockwise starting from the top-left corner of each room
- Door positions should be on the wall segment, with wallIndex indicating which wall (0-indexed)
- Door widths are typically 750-1000mm for standard doors

SCALE DETECTION:
- Look for dimension lines with measurements like "3.5m", "12'-6\"", "4000mm"
- Identify the pixel length of the dimension line and its real-world measurement
- Convert all measurements to millimeters for consistency`;

    const userPrompt = `Analyze this floor plan image and extract all room boundaries, doors, and scale information.

Return a JSON object with this exact structure:
{
  "rooms": [
    {
      "name": "Living Room",
      "points": [{"x": 100, "y": 100}, {"x": 400, "y": 100}, {"x": 400, "y": 300}, {"x": 100, "y": 300}],
      "doors": [{"position": {"x": 250, "y": 100}, "width": 900, "wallIndex": 0}]
    }
  ],
  "scale": {
    "pixelLength": 200,
    "realWorldLengthMm": 3000,
    "label": "3m"
  },
  "confidence": 0.85,
  "notes": ["Detected 4 rooms", "Scale determined from dimension line"]
}

Be thorough - detect ALL visible rooms, even small ones like closets, hallways, and bathrooms. If you cannot determine the scale, omit the scale field but still provide room boundaries.`;

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
              description: 'Extract room boundaries, doors, and scale from a floor plan image',
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
                          description: 'Polygon points defining room boundary'
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
                              width: { type: 'number', description: 'Door width in mm' },
                              wallIndex: { type: 'number', description: 'Index of wall the door is on (0-indexed)' }
                            },
                            required: ['position', 'width', 'wallIndex']
                          }
                        }
                      },
                      required: ['name', 'points', 'doors']
                    }
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
                  confidence: { type: 'number', description: 'Confidence score 0-1' },
                  notes: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Notes about the detection process'
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
            return new Response(
              JSON.stringify(parsed),
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
    console.log(`Detected ${result.rooms.length} rooms with confidence ${result.confidence}`);

    return new Response(
      JSON.stringify(result),
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
