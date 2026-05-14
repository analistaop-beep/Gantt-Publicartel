/**
 * Converts an image file to WebP format.
 * @param file The image file to convert.
 * @param quality Quality of the output WebP (0 to 1).
 * @returns A promise that resolves to a Blob in WebP format.
 */
export const convertToWebP = (file: File, quality: number = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas toBlob failed'));
                        }
                    },
                    'image/webp',
                    quality
                );
            };
            img.onerror = () => reject(new Error('Image loading failed'));
            img.src = event.target?.result as string;
        };
        reader.onerror = () => reject(new Error('File reading failed'));
        reader.readAsDataURL(file);
    });
};
