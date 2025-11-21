
export class FireZone {
    x: number;
    y: number;
    radius: number;
    life: number;
    maxLife: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.radius = 40;
        this.life = 300; // 5 seconds (60fps)
        this.maxLife = 300;
    }

    update() {
        this.life--;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.globalAlpha = (this.life / this.maxLife) * 0.6;
        ctx.fillStyle = '#FF4500';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner core
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
