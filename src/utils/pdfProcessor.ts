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
export async function processPdfFile(file: File, scale: number = 2.0): Promise<Blob[]> {
    const arrayBuffer = await file.arrayBuffer();

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const imageBlobs: Blob[] = [];

    // Iterate through all pages
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        // Calculate viewport
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

        // Render PDF page into canvas context
        const renderContext = {
            canvasContext: context,
            viewport: viewport,
        };

        await page.render(renderContext as any).promise;

        // Convert canvas to Blob
        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95);
        });

        if (blob) {
            imageBlobs.push(blob);
        }
    }

    return imageBlobs;
}
