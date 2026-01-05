import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
// We need to use the worker from the installed package
// In a Vite environment, we can use the ?url import query
// Note: We're using a direct import path to the worker file in node_modules
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Converts a PDF file into an array of images (one per page).
 * Returns an array of Blob objects (image/jpeg).
 */
export async function processPdfFile(
  file: File,
  maxWidth: number = 800,
  quality: number = 0.85
): Promise<Blob[]> {
    const arrayBuffer = await file.arrayBuffer();

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const imageBlobs: Blob[] = [];
    const pageCount = pdf.numPages;
    let targetWidth = maxWidth;
    let targetQuality = quality;

    // Scale down large PDFs to avoid huge per-page files.
    if (pageCount > 60) {
        targetWidth = Math.min(targetWidth, 1200);
        targetQuality = Math.min(targetQuality, 0.88);
    } else if (pageCount > 20) {
        targetWidth = Math.min(targetWidth, 1400);
        targetQuality = Math.min(targetQuality, 0.92);
    }

    // Iterate through all pages
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        // Calculate viewport (target width, keep height proportional)
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = baseViewport.width > 0 ? targetWidth / baseViewport.width : 1;
        const viewport = page.getViewport({ scale });

        // Create a canvas to render the page
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
            console.error(`Failed to get 2D context for page ${i}`);
            continue;
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page into canvas context with a slight contrast bump
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.filter = 'contrast(115%)';
        const renderContext = {
            canvas,
            viewport,
        };

        await page.render(renderContext).promise;
        context.filter = 'none';

        // Convert canvas to Blob
        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), 'image/jpeg', targetQuality);
        });

        if (blob) {
            imageBlobs.push(blob);
        }
    }

    return imageBlobs;
}

export async function processPdfPreview(
  file: File,
  maxWidth: number = 800,
  quality: number = 0.85
): Promise<{ blob: Blob | null; totalPages: number }> {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const totalPages = pdf.numPages;
    let targetWidth = maxWidth;
    let targetQuality = quality;

    if (totalPages > 60) {
        targetWidth = Math.min(targetWidth, 1200);
        targetQuality = Math.min(targetQuality, 0.88);
    } else if (totalPages > 20) {
        targetWidth = Math.min(targetWidth, 1400);
        targetQuality = Math.min(targetQuality, 0.92);
    }

    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = baseViewport.width > 0 ? targetWidth / baseViewport.width : 1;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
        console.error('Failed to get 2D context for PDF preview');
        return { blob: null, totalPages };
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.filter = 'contrast(115%)';
    const renderContext = {
        canvas,
        viewport,
    };

    await page.render(renderContext).promise;
    context.filter = 'none';

    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', targetQuality);
    });

    return { blob, totalPages };
}
