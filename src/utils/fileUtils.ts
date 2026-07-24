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

export interface OrderAttachment {
    url: string;
    name: string;
}

export const getFileUrl = (file: string | OrderAttachment | null | undefined): string => {
    if (!file) return '';
    return typeof file === 'string' ? file : file.url || '';
};

export const getFileName = (file: string | OrderAttachment | null | undefined): string => {
    if (!file) return 'Archivo adjunto';
    if (typeof file === 'string') {
        const clean = file.split('?')[0];
        const name = clean.split('/').pop();
        return name || file;
    }
    return file.name || getFileUrl(file).split('/').pop() || 'Archivo adjunto';
};

export const isImageFile = (file: string | OrderAttachment | null | undefined): boolean => {
    const url = getFileUrl(file).toLowerCase();
    const name = getFileName(file).toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const extUrl = url.split('.').pop()?.split('?')[0] || '';
    const extName = name.split('.').pop() || '';
    return imageExtensions.includes(extUrl) || imageExtensions.includes(extName);
};
