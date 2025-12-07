import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Extracting product from URL:', url);

    // Fetch the webpage content
    let pageContent = '';
    try {
      const pageResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      pageContent = await pageResponse.text();
      // Limit content length for AI processing
      pageContent = pageContent.substring(0, 15000);
    } catch (fetchError) {
      console.error('Failed to fetch URL:', fetchError);
      // Continue with URL-only extraction
    }

    // Use AI to extract product information
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a flooring product data extractor. Extract structured product information from the provided webpage content or URL. 

Return a JSON object with these fields (use null for unknown values):
- name: Product name (string)
- type: "tile", "roll", or "linear" 
- subtype: one of "carpet_tile", "ceramic_tile", "vinyl_plank", "lvt", "broadloom_carpet", "sheet_vinyl", "baseboard", "transition_strip"
- widthMm: Tile/plank width in millimeters (number)
- lengthMm: Tile/plank length in millimeters (number)  
- rollWidthMm: Roll width in millimeters (number, for roll goods)
- rollLengthM: Roll length in meters (number, for roll goods)
- pricePerM2: Price per square meter (number)
- pricePerRoll: Full roll price (number, for roll goods)
- manufacturer: Brand/manufacturer name (string)
- sku: Product SKU or code (string)
- imageUrl: Main product image URL (string)
- description: Brief product description (string)

Common flooring dimensions to consider:
- Carpet tiles: typically 500x500mm, 610x610mm, or 1000x250mm planks
- Ceramic tiles: 300x300mm, 300x600mm, 600x600mm, 1200x600mm
- LVT/Vinyl planks: various sizes like 152x914mm, 178x1219mm
- Sheet vinyl: 2m, 3m, or 4m wide rolls
- Broadloom carpet: typically 3.66m (12ft) or 4m wide

Only return valid JSON, no other text.`
          },
          {
            role: 'user',
            content: `Extract flooring product details from this URL: ${url}\n\nPage content:\n${pageContent || 'Unable to fetch page content. Please extract what you can from the URL pattern.'}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_product',
              description: 'Extract structured flooring product information',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Product name' },
                  type: { type: 'string', enum: ['tile', 'roll', 'linear'] },
                  subtype: { 
                    type: 'string', 
                    enum: ['carpet_tile', 'ceramic_tile', 'vinyl_plank', 'lvt', 'broadloom_carpet', 'sheet_vinyl', 'baseboard', 'transition_strip']
                  },
                  widthMm: { type: 'number', description: 'Width in mm for tiles' },
                  lengthMm: { type: 'number', description: 'Length in mm for tiles' },
                  rollWidthMm: { type: 'number', description: 'Roll width in mm' },
                  rollLengthM: { type: 'number', description: 'Roll length in meters' },
                  pricePerM2: { type: 'number', description: 'Price per m²' },
                  pricePerRoll: { type: 'number', description: 'Full roll price' },
                  manufacturer: { type: 'string' },
                  sku: { type: 'string' },
                  imageUrl: { type: 'string' },
                  description: { type: 'string' }
                },
                required: ['name', 'type']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_product' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('Failed to extract product data');
    }

    const aiResponse = await response.json();
    console.log('AI response:', JSON.stringify(aiResponse, null, 2));
    
    // Extract the tool call arguments
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('No product data extracted');
    }

    const product = JSON.parse(toolCall.function.arguments);
    console.log('Extracted product:', product);

    return new Response(
      JSON.stringify({ product }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Extract product error:', error);
    const message = error instanceof Error ? error.message : 'Failed to extract product';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
