
import { resourceManager } from './ResourceManager';

export class Tank {
    x: number;
    y: number;
    bodyRotation: number;
    turretRotation: number = 0;
    speed: number;
    maxSpeed: number;
    rotationSpeed: number;
    width: number;
    height: number;

    hullImage: HTMLImageElement | null = null;
    turretImage: HTMLImageElement | null = null;
    crewImage: HTMLImageElement | null = null;

    // Weapons
    lastShotTime: number = 0;
    fireRate: number = 1000; // ms

    lastMGTime: number = 0;
    mgFireRate: number = 100;

    lastMolotovTime: number = 0;
    molotovCooldown: number = 5000;

    lastShotgunTime: number = 0;
    shotgunCooldown: number = 3000;

    lastMineTime: number = 0;
    mineCooldown: number = 5000;

    health: number = 500;
    maxHealth: number = 500;

    constructor(x: number, y: number, hullKey: string, turretKey: string) {
        this.x = x;
        this.y = y;
        this.bodyRotation = 0;
        this.speed = 0;
        this.maxSpeed = 3; // Increased max speed
        this.rotationSpeed = 0.15; // Much faster turning (was 0.1)
        this.width = 90;
        this.height = 120;

        this.hullImage = resourceManager.getImage(hullKey);
        this.turretImage = resourceManager.getImage(turretKey);
        this.crewImage = resourceManager.getImage('crew_gunner');
    }

    update(keys: Set<string>, mouseX: number, mouseY: number) {
        // Rotation
        if (keys.has('a') || keys.has('A') || keys.has('ArrowLeft')) {
            this.bodyRotation -= this.rotationSpeed;
        }
        if (keys.has('d') || keys.has('D') || keys.has('ArrowRight')) {
            this.bodyRotation += this.rotationSpeed;
        }

        // Movement
        if (keys.has('w') || keys.has('W') || keys.has('ArrowUp')) {
            this.speed = Math.min(this.speed + 0.1, this.maxSpeed);
        } else if (keys.has('s') || keys.has('S') || keys.has('ArrowDown')) {
            this.speed = Math.max(this.speed - 0.1, -this.maxSpeed / 2);
        } else {
            // Friction
            if (this.speed > 0) this.speed = Math.max(0, this.speed - 0.05);
            if (this.speed < 0) this.speed = Math.min(0, this.speed + 0.05);
        }

        this.x += Math.sin(this.bodyRotation) * this.speed;
        this.y -= Math.cos(this.bodyRotation) * this.speed;

        // Turret Rotation (Follow Mouse)
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        this.turretRotation = Math.atan2(dy, dx) + Math.PI / 2;
    }

    fire(): any { // Returns Bullet config or null
        const now = Date.now();
        if (now - this.lastShotTime > this.fireRate) {
            this.lastShotTime = now;
            // Calculate barrel position
            const barrelLen = 85; // Increased from 60 to clear the tank body/circle
            return {
                x: this.x + Math.cos(this.turretRotation - Math.PI / 2) * barrelLen,
                y: this.y + Math.sin(this.turretRotation - Math.PI / 2) * barrelLen,
                angle: this.turretRotation,
                type: 'cannon'
            };
        }
        return null;
    }

    fireMG(): any {
        const now = Date.now();
        if (now - this.lastMGTime > this.mgFireRate) {
            this.lastMGTime = now;
            // Slight offset for MG
            const barrelLen = 80; // Increased from 60
            const offset = 10;
            return {
                x: this.x + Math.cos(this.turretRotation - Math.PI / 2) * barrelLen + Math.cos(this.turretRotation) * offset,
                y: this.y + Math.sin(this.turretRotation - Math.PI / 2) * barrelLen + Math.sin(this.turretRotation) * offset,
                angle: this.turretRotation + (Math.random() - 0.5) * 0.1, // Slight spread
                type: 'mg'
            };
        }
        return null;
    }

    throwMolotov(targetX: number, targetY: number) {
        const now = Date.now();
        if (now - this.lastMolotovTime > this.molotovCooldown) {
            this.lastMolotovTime = now;

            // Calculate distance and cap it
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 800; // Increased range (was implicit/short)

            const scale = Math.min(dist, maxDist) / dist;
            const finalX = this.x + dx * scale;
            const finalY = this.y + dy * scale;

            return {
                x: this.x,
                y: this.y,
                angle: this.turretRotation,
                type: 'molotov',
                targetX: finalX,
                targetY: finalY
            };
        }
        return null;
    }

    fireShotgun() {
        const now = Date.now();
        if (now - this.lastShotgunTime > this.shotgunCooldown) {
            this.lastShotgunTime = now;

            const barrelLen = 80; // Increased from 60
            const baseX = this.x + Math.cos(this.turretRotation - Math.PI / 2) * barrelLen;
            const baseY = this.y + Math.sin(this.turretRotation - Math.PI / 2) * barrelLen;

            return [
                { x: baseX, y: baseY, angle: this.turretRotation, type: 'shotgunPellet' },
                { x: baseX, y: baseY, angle: this.turretRotation - 0.2, type: 'shotgunPellet' },
                { x: baseX, y: baseY, angle: this.turretRotation + 0.2, type: 'shotgunPellet' }
            ];
        }
        return null;
    }

    dropMine() {
        const now = Date.now();
        if (now - this.lastMineTime > this.mineCooldown) {
            this.lastMineTime = now;
            // Drop behind the tank
            const dropDist = -50;
            return {
                x: this.x + Math.sin(this.bodyRotation) * dropDist,
                y: this.y - Math.cos(this.bodyRotation) * dropDist,
                type: 'mine'
            };
        }
        return null;
    }

    takeDamage(amount: number): boolean {
        this.health = Math.max(0, this.health - amount);
        return this.health <= 0; // Returns true if destroyed
    }

    isDestroyed(): boolean {
        return this.health <= 0;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw Body
        ctx.save();
        ctx.rotate(this.bodyRotation);
        if (this.hullImage) {
            // Draw image centered, rotated by 90 degrees if needed (assuming assets point up)
            // Adjust rotation offset based on asset orientation. Assuming assets point UP (0 deg).
            // Canvas 0 deg is RIGHT. So we might need + 90 deg (PI/2).
            // Let's assume assets are pointing UP.
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(this.hullImage, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            // Fallback
            ctx.fillStyle = 'green';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }
        ctx.restore();

        // Draw Turret
        ctx.save();
        ctx.rotate(this.turretRotation);
        if (this.turretImage) {
            ctx.rotate(Math.PI / 2);
            // Turret might need different dimensions or offset
            ctx.drawImage(this.turretImage, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            // Fallback
            ctx.fillStyle = '#2E7D32';
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1B5E20';
            ctx.fillRect(-4, -40, 8, 40);
        }

        // Draw Crew (Gunner)
        if (this.crewImage) {
            // Draw on top of turret, slightly offset
            const crewSize = 40;
            // Rotate back 90 deg because asset is top down facing up, but canvas rotation is already applied
            // Actually let's just draw it.
            ctx.drawImage(this.crewImage, 10, -20, crewSize, crewSize);
        }

        ctx.restore();

        ctx.restore();

        // Draw Health Bar
        this.drawHealthBar(ctx);
    }

    drawHealthBar(ctx: CanvasRenderingContext2D) {
        const barWidth = this.width;
        const barHeight = 6;
        const barY = -this.height / 2 - 15; // Above tank

        ctx.save();
        ctx.translate(this.x, this.y);

        // Background (red)
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

        // Health (green)
        const healthWidth = (this.health / this.maxHealth) * barWidth;
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(-barWidth / 2, barY, healthWidth, barHeight);

        // Border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);

        ctx.restore();
    }
}
