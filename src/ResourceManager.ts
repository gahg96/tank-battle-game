
export class ResourceManager {
    images: { [key: string]: HTMLImageElement } = {};

    async loadImages(sources: { [key: string]: string }): Promise<void> {
        const promises = Object.entries(sources).map(([key, src]) => {
            return new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.src = src;
                img.onload = () => {
                    this.images[key] = this.processImage(img);
                    resolve();
                };
                img.onerror = reject;
            });
        });
        await Promise.all(promises);
    }

    getImage(key: string): HTMLImageElement {
        return this.images[key];
    }

    // Helper to remove white background
    processImage(img: HTMLImageElement): HTMLImageElement {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // If pixel is white (or close to white), make it transparent
            if (r > 240 && g > 240 && b > 240) {
                data[i + 3] = 0;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        const newImg = new Image();
        newImg.src = canvas.toDataURL();
        return newImg;
    }
}

export const resourceManager = new ResourceManager();
