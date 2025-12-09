import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfUrl, extractDimensions } = await req.json();

    if (!pdfUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'PDF URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing PDF:', pdfUrl);

    // Download the PDF and convert to base64
    console.log('Downloading PDF...');
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF: ${pdfResponse.status}`);
    }
    
    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = base64Encode(pdfArrayBuffer);
    
    console.log('PDF downloaded, size:', pdfArrayBuffer.byteLength, 'bytes');

    const systemPrompt = `You are an expert architectural drawing analyzer. Analyze this PDF floor plan document and extract:

1. **Page Analysis**: For each page, determine:
   - Page number
   - Whether it contains a floor plan (true/false)
   - Brief description of what's on the page
   - Quality/clarity rating (1-5)

2. **Dimension Extraction** (if extractDimensions is true):
   - All dimension labels visible (e.g., "12'-6\"", "3.8m", "4500mm")
   - Scale indicators (e.g., "1/4\" = 1'-0\"", "1:100")
   - North arrow orientation if present

3. **Drawing Details**:
   - Drawing type (floor plan, elevation, section, site plan)
   - Approximate number of rooms visible
   - Notable features (doors, windows, stairs, etc.)

Return your analysis as JSON with this structure:
{
  "totalPages": number,
  "pages": [
    {
      "pageNumber": number,
      "hasFloorPlan": boolean,
      "description": "string",
      "qualityRating": number,
      "drawingType": "floor_plan" | "elevation" | "section" | "site_plan" | "other",
      "roomCount": number,
      "dimensions": ["12'-6\"", "10'-0\"", ...] (if extractDimensions),
      "scale": "1/4\" = 1'-0\"" or null,
      "features": ["doors", "windows", ...]
    }
  ],
  "recommendedPage": number (the best page for auto-takeoff),
  "overallScale": "string or null",
  "units": "imperial" | "metric" | "unknown"
}`;

    // Send PDF as base64 data URL with correct mime type
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
              {
                type: 'text',
                text: `Analyze this PDF floor plan document. ${extractDimensions ? 'Extract all visible dimensions.' : 'Focus on page structure.'}`
              },
              {
                type: 'image_url',
                image_url: { 
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('AI response received, parsing...');

    // Extract JSON from response
    let analysisResult;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      const jsonStr = jsonMatch[1] || content;
      analysisResult = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Return a basic structure if parsing fails
      analysisResult = {
        totalPages: 1,
        pages: [{
          pageNumber: 1,
          hasFloorPlan: true,
          description: 'Floor plan document',
          qualityRating: 3,
          drawingType: 'floor_plan',
          roomCount: 0,
          dimensions: [],
          scale: null,
          features: []
        }],
        recommendedPage: 1,
        overallScale: null,
        units: 'unknown'
      };
    }

    console.log('PDF analysis complete:', analysisResult.totalPages, 'pages found');

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: analysisResult,
        pdfUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-pdf function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to parse PDF' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
