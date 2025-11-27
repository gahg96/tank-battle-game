export class Bullet {
    x: number;
    y: number;
    vx: number;
    vy: number;
    speed: number;
    radius: number;
    active: boolean;
    type: 'cannon' | 'mg' | 'molotov' | 'shotgunPellet' | 'mine' | 'railgun' | 'missile';
    damage: number;
    angle: number; // Added angle property

    // For Molotov
    targetX?: number;
    targetY?: number;
    startX?: number;
    startY?: number;
    startTime?: number;
    rotation: number = 0;
    owner: 'player' | 'enemy';
    creationTime: number; // Add this

    constructor(x: number, y: number, angle: number, owner: 'player' | 'enemy', type: 'cannon' | 'mg' | 'molotov' | 'shotgunPellet' | 'mine' | 'railgun' | 'missile' = 'cannon', targetX?: number, targetY?: number) {
        this.x = x;
        this.y = y;
        this.angle = angle; // Storing angle
        this.owner = owner;
        this.type = type;
        this.targetX = targetX;
        this.targetY = targetY;
        this.creationTime = Date.now(); // Initialize

        if (type === 'mg') {
            this.speed = 15;
            this.radius = 2;
            this.damage = 5;
        } else if (type === 'molotov') {
            this.speed = 0; // Handled by arc
            this.radius = 5;
            this.damage = 0; // Area damage
            this.startX = x;
            this.startY = y;
            this.startTime = Date.now();
        } else if (type === 'shotgunPellet') {
            this.speed = 12;
            this.radius = 4;
            this.damage = 15;
            // Add some randomness to speed for spread effect
            this.speed += Math.random() * 2;
        } else if (type === 'mine') {
            this.speed = 0;
            this.radius = 10;
            this.damage = 100; // High damage
        } else if (type === 'railgun') {
            this.speed = 40; // Very fast
            this.radius = 3;
            this.damage = 100; // One shot kill for most
        } else if (type === 'missile') {
            this.speed = 8; // Slower
            this.radius = 8;
            this.damage = 80; // High damage
            // Missile starts slow and accelerates in update
        } else { // cannon (default)
            this.speed = 20;
            this.radius = 5;
            this.damage = 25;
        }

        this.vx = Math.cos(angle - Math.PI / 2) * this.speed;
        this.vy = Math.sin(angle - Math.PI / 2) * this.speed;
        this.active = true;
    }

    update() {
        if (this.type === 'missile') {
            this.speed = Math.min(this.speed + 0.5, 25); // Accelerate
            this.vx = Math.cos(this.angle - Math.PI / 2) * this.speed;
            this.vy = Math.sin(this.angle - Math.PI / 2) * this.speed;
        }
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += 0.2; // Spin
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (this.type === 'molotov') {
            this.drawMolotov(ctx);
            return;
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

        if (this.type === 'mine') {
            ctx.fillStyle = '#FF0000'; // Red for mine
            ctx.fill();
            // Blinking light
            if (Math.floor(Date.now() / 200) % 2 === 0) {
                ctx.fillStyle = '#FFFF00'; // Yellow light
                ctx.beginPath();
                ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.type === 'railgun') {
            // Railgun Trail
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.fillStyle = '#00FFFF';
            ctx.fillRect(-2, -20, 4, 40); // Long beam-like projectile
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00FFFF';
            ctx.fill();
            ctx.restore();
        } else if (this.type === 'missile') {
            // Missile
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);

            // Body
            ctx.fillStyle = '#808080';
            ctx.fillRect(-4, -10, 8, 20);
            // Nose
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.moveTo(-4, -10);
            ctx.lineTo(4, -10);
            ctx.lineTo(0, -18);
            ctx.fill();
            // Fins
            ctx.fillStyle = '#404040';
            ctx.fillRect(-6, 5, 2, 5);
            ctx.fillRect(4, 5, 2, 5);

            ctx.restore();
        } else {
            // For cannon, mg, shotgunPellet
            ctx.fillStyle = this.owner === 'player' ? '#FFFF00' : '#FF4500'; // Yellow for player, Orange-Red for enemy
            ctx.fill();
        }
    }

    drawMolotov(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Bottle Body
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Neck
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(-2, -12, 4, 6);

        // Rag (Fire)
        ctx.fillStyle = '#FF4500';
        ctx.beginPath();
        ctx.arc(0, -12, 3 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    isOutOfBounds(width: number, height: number) {
        return this.x < 0 || this.x > width || this.y < 0 || this.y > height;
    }
}
