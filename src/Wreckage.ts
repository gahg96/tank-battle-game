
import { Tank } from './Tank';

export class Wreckage {
    x: number;
    y: number;
    rotation: number;
    hullImage: HTMLImageElement | null;
    turretImage: HTMLImageElement | null;
    turretRotation: number;

    constructor(tank: Tank) {
        this.x = tank.x;
        this.y = tank.y;
        this.rotation = tank.bodyRotation;
        this.hullImage = tank.hullImage;
        this.turretImage = tank.turretImage;
        this.turretRotation = tank.turretRotation;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw darkened hull
        ctx.save();
        ctx.rotate(this.rotation);
        ctx.filter = 'grayscale(100%) brightness(40%) sepia(50%)'; // Burnt look
        if (this.hullImage) {
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(this.hullImage, -45, -60, 90, 120); // Hardcoded size for now
        }
        ctx.restore();

        // Draw darkened turret (disconnected slightly?)
        ctx.save();
        ctx.rotate(this.turretRotation);
        ctx.filter = 'grayscale(100%) brightness(40%) sepia(50%)';
        if (this.turretImage) {
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(this.turretImage, -45, -60, 90, 120);
        }
        ctx.restore();

        ctx.restore();
    }
}
