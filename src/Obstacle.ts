import { resourceManager } from './ResourceManager';

export class Obstacle {
    x: number;
    y: number;
    width: number;
    height: number;
    image: HTMLImageElement | null = null;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 50;
        this.image = resourceManager.getImage('crate');
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (this.image) {
            ctx.drawImage(this.image, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        } else {
            ctx.fillStyle = '#8D6E63';
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        }
    }
}
