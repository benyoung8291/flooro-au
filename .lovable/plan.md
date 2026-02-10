

# Fix PDF Floor Plans Not Rendering After Upload

## Problem

When a user uploads a PDF floor plan, the system:
1. Uploads the PDF to storage (works)
2. Analyzes pages with AI (works)
3. User selects a page (works)
4. Sets the **raw PDF URL** as the canvas background image (broken)

The canvas uses `new Image()` to load backgrounds, which cannot render PDF files. The user sees a blank canvas with the "Floor Plan" controls visible but no image displayed -- exactly what the screenshots show.

## Solution

Add client-side PDF-to-PNG rendering using `pdfjs-dist`. When a user selects a PDF page, the app will:

1. Load the PDF in the browser using pdf.js
2. Render the selected page to a temporary canvas at high resolution
3. Convert the canvas to a PNG blob
4. Upload the PNG to the `floor_plan_images` bucket
5. Use the PNG URL as the background image (which the canvas can render natively)

This keeps the edge function as-is (AI analysis only) and solves the rendering problem entirely on the client.

## Flow After Fix

```text
PDF Upload --> Storage --> AI Analysis --> Page Selector Dialog
                                                  |
                                          User clicks "Use Page X"
                                                  |
                                          pdf.js renders page to canvas
                                                  |
                                          Canvas --> PNG blob --> Upload to storage
                                                  |
                                          PNG URL set as background image
                                                  |
                                          Canvas renders the PNG (works!)
```

## Changes

### 1. Install `pdfjs-dist` dependency

Add `pdfjs-dist` package for client-side PDF rendering.

### 2. New utility: `src/lib/pdf/renderPdfPage.ts`

A small helper that:
- Loads a PDF from a URL using pdf.js
- Renders a specific page number to an offscreen canvas (at 2x scale for quality)
- Returns the result as a PNG Blob

### 3. Modify: `src/components/editor/FloorPlanUpload.tsx`

Update `handlePdfPageSelect` to:
- Show a "Processing..." state on the page selector button
- Call `renderPdfPage(pdfUrl, pageNumber)` to get a PNG blob
- Upload the PNG blob to `floor_plan_images` storage bucket
- Use the resulting PNG public URL (not the PDF URL) as the background image
- Pass the `isProcessing` prop to `PdfPageSelector` to disable buttons during rendering

Also update the fallback path (when AI analysis fails) to render page 1 of the PDF to PNG before setting as background.

### 4. `PdfPageSelector` already supports `isProcessing` prop

The component already has an `isProcessing` prop that disables buttons and shows a spinner -- we just need to pass it from the parent.

## Technical Notes

- **pdf.js worker**: Will use the CDN-hosted worker to avoid bundling issues
- **Render scale**: 2x for crisp rendering on retina displays, producing images around 2000-3000px wide (typical for A3/A1 floor plans)
- **Memory**: The offscreen canvas is created and discarded per render, no memory leaks
- **File size**: Rendered PNGs of floor plans are typically 1-5MB, well within the 20MB limit
- **No edge function changes needed**: The `parse-pdf` function continues to handle AI analysis only

