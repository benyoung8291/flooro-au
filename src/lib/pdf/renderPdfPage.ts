import * as pdfjsLib from 'pdfjs-dist';

// Use the CDN-hosted worker to avoid bundling issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Renders a specific page of a PDF to a PNG blob.
 * Uses an offscreen canvas at 2x scale for retina quality.
 */
export async function renderPdfPage(
  pdfUrl: string,
  pageNumber: number = 1,
  scale: number = 2
): Promise<Blob> {
  console.log(`renderPdfPage: Loading PDF from ${pdfUrl}, page ${pageNumber}`);

  const loadingTask = pdfjsLib.getDocument({
    url: pdfUrl,
    cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;

  if (pageNumber < 1 || pageNumber > pdf.numPages) {
    throw new Error(`Page ${pageNumber} out of range (1-${pdf.numPages})`);
  }

  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not get 2D canvas context');
  }

  await page.render({ canvasContext: context, viewport }).promise;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob returned null'))),
      'image/png'
    );
  });

  console.log(`renderPdfPage: Rendered page ${pageNumber} as PNG (${(blob.size / 1024).toFixed(0)}KB)`);

  // Cleanup
  page.cleanup();
  pdf.destroy();

  return blob;
}
