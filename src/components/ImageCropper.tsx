// src/components/ImageCropper.tsx
import { useState, useRef, useCallback, useEffect } from 'react';
import type { Theme } from '../themes';

interface ImageCropperProps {
    imageUrl: string;
    onSave: (croppedImageData: string) => void;
    onClose: () => void;
    theme: Theme;
}

interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

export const ImageCropper = ({ imageUrl, onSave, onClose, theme }: ImageCropperProps) => {
    const [cropArea, setCropArea] = useState<CropArea>({ x: 50, y: 50, width: 200, height: 200 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setIsDragging(true);
        setDragStart({ x, y });
        setCropArea({ x, y, width: 0, height: 0 });
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        const width = currentX - dragStart.x;
        const height = currentY - dragStart.y;

        setCropArea({
            x: width < 0 ? currentX : dragStart.x,
            y: height < 0 ? currentY : dragStart.y,
            width: Math.abs(width),
            height: Math.abs(height),
        });
    }, [isDragging, dragStart]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleCrop = useCallback(() => {
        if (!imageRef.current || !containerRef.current) return;

        const img = imageRef.current;

        // Calculate scale between displayed image and actual image
        const scaleX = img.naturalWidth / img.width;
        const scaleY = img.naturalHeight / img.height;

        // Create canvas for cropping
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to crop area
        canvas.width = cropArea.width * scaleX;
        canvas.height = cropArea.height * scaleY;

        // Draw cropped image
        ctx.drawImage(
            img,
            cropArea.x * scaleX,
            cropArea.y * scaleY,
            cropArea.width * scaleX,
            cropArea.height * scaleY,
            0,
            0,
            canvas.width,
            canvas.height
        );

        // Convert to data URL
        const croppedImageData = canvas.toDataURL('image/png');
        console.log('Cropped image data length:', croppedImageData.length);
        onSave(croppedImageData);
    }, [cropArea, onSave]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'Enter' && cropArea.width > 10 && cropArea.height > 10) {
                handleCrop();
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [cropArea, handleCrop, onClose]);

    return (
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80"
            onClick={onClose}
        >
            <div
                className="relative max-w-4xl max-h-[90vh] overflow-auto rounded-lg p-4"
                style={{ backgroundColor: theme.node.bg }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold mb-4" style={{ color: theme.node.text }}>
                    Beskär bild
                </h2>

                <div className="mb-4 text-sm opacity-70" style={{ color: theme.node.text }}>
                    Dra över bilden för att välja område att beskära
                </div>

                <div
                    ref={containerRef}
                    className="relative inline-block cursor-crosshair select-none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <img
                        ref={imageRef}
                        src={imageUrl}
                        alt="Crop"
                        className="max-w-full max-h-[60vh] pointer-events-none"
                        draggable={false}
                    />

                    {/* Crop overlay */}
                    {cropArea.width > 0 && cropArea.height > 0 && (
                        <>
                            {/* Darkened areas outside crop */}
                            <div
                                className="absolute inset-0 bg-black/50 pointer-events-none"
                                style={{
                                    clipPath: `polygon(
    0 0,
    100 % 0,
    100 % 100 %,
    0 100 %,
    0 0,
    ${cropArea.x}px ${cropArea.y}px,
    ${cropArea.x}px ${cropArea.y + cropArea.height}px,
    ${cropArea.x + cropArea.width}px ${cropArea.y + cropArea.height}px,
    ${cropArea.x + cropArea.width}px ${cropArea.y}px,
    ${cropArea.x}px ${cropArea.y}px
)`
                                }}
                            />

                            {/* Crop box border */}
                            <div
                                className="absolute border-2 border-white pointer-events-none"
                                style={{
                                    left: cropArea.x,
                                    top: cropArea.y,
                                    width: cropArea.width,
                                    height: cropArea.height,
                                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
                                }}
                            />
                        </>
                    )}
                </div>

                <div className="flex gap-3 mt-4">
                    <button
                        onClick={handleCrop}
                        className="px-4 py-2 rounded font-semibold transition-all"
                        style={{
                            backgroundColor: theme.node.selectedBg,
                            color: theme.node.text,
                            opacity: (cropArea.width > 10 && cropArea.height > 10) ? 1 : 0.3,
                            cursor: (cropArea.width > 10 && cropArea.height > 10) ? 'pointer' : 'not-allowed',
                        }}
                    >
                        Beskär & Spara
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded"
                        style={{
                            backgroundColor: theme.node.border,
                            color: theme.node.text,
                        }}
                    >
                        Avbryt
                    </button>
                </div>
            </div>
        </div>
    );
};
