
import { Tank } from './Tank';
import { Bullet } from './Bullet';
import { Particle } from './Particle';
import { resourceManager } from './ResourceManager';
import { Obstacle } from './Obstacle';
import { FireZone } from './FireZone';
import { soundManager } from './SoundManager';
import { Wreckage } from './Wreckage';

export class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;

    playerSquad: Tank[] = []; // Initialized in spawnSquad
    playerIndex: number = 0;
    enemies: Tank[] = [];
    bullets: Bullet[] = [];
    particles: Particle[];
    obstacles: Obstacle[];
    fireZones: FireZone[];
    wreckages: Wreckage[];
    keys: Set<string>;
    mouseX: number;
    mouseY: number;

    cameraMode: 'follow' | 'cockpit' = 'follow';
    cameraX: number = 0;
    cameraY: number = 0;
    cameraRotation: number = 0;

    loaded: boolean = false;
    gameStarted: boolean = false;
    paused: boolean = false;
    playerDead: boolean = false;

    // Map Size
    mapWidth: number = 2000;
    mapHeight: number = 2000;

    playerFaction: 'ussr' | 'germany' = 'ussr';
    score: number = 0;
    level: number = 1;
    killsForNextLevel: number = 5;

    // Ultimate Ability
    lastUltimateTime: number = 0;
    ultimateCooldown: number = 30000; // 30 seconds

    backgroundImage: HTMLImageElement | null = null;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d')!;
        document.getElementById('app')!.appendChild(this.canvas);

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.keys = new Set();
        this.mouseX = 0;
        this.mouseY = 0;

        this.bullets = [];
        this.particles = [];
        this.obstacles = [];
        this.fireZones = [];
        this.wreckages = [];
        this.enemies = [];

        this.setupInputs();
        this.resize();

        window.addEventListener('resize', () => this.resize());

        this.init();

        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    async init() {
        await resourceManager.loadImages({
            't34_hull': './assets/t34_hull.png',
            't34_turret': './assets/t34_turret.png',
            'tiger_hull': './assets/tiger_hull.png',
            'tiger_turret': './assets/tiger_turret.png',
            'grass': './assets/grass_ground.png',
            'crate': './assets/wooden_crate.png',
            'crew_gunner': './assets/crew_gunner.png'
        });

        this.backgroundImage = resourceManager.getImage('grass');
        this.loaded = true;
    }

    startGame(faction: 'ussr' | 'germany') {
        this.playerFaction = faction;
        this.score = 0;
        this.level = 1;
        this.killsForNextLevel = 5;
        this.playerDead = false;
        this.wreckages = [];
        this.bullets = [];
        this.fireZones = [];
        this.lastUltimateTime = -30000; // Ready immediately

        this.spawnSquad();
        this.spawnEnemies();
        this.initLevel();

        this.gameStarted = true;
        this.paused = false;
    }

    spawnSquad() {
        this.playerSquad = [];
        const squadSize = 3;

        const hull = this.playerFaction === 'ussr' ? 't34_hull' : 'tiger_hull';
        const turret = this.playerFaction === 'ussr' ? 't34_turret' : 'tiger_turret';

        for (let i = 0; i < squadSize; i++) {
            const tank = new Tank(0, 0, hull, turret);
            // Spawn in formation around center
            tank.x = this.mapWidth / 2 + (i - 1) * 100;
            tank.y = this.mapHeight / 2;
            tank.health = 500;
            tank.maxHealth = 500;
            this.playerSquad.push(tank);
        }

        this.playerIndex = 0;
        this.playerDead = false;
    }

    get player(): Tank {
        return this.playerSquad[this.playerIndex];
    }

    spawnEnemies() {
        this.enemies = [];
        // Number of enemies increases with level
        const count = 1 + Math.ceil(this.level / 2);

        for (let i = 0; i < count; i++) {
            this.spawnSingleEnemy();
        }
    }

    spawnSingleEnemy() {
        // Enemy is opposite faction
        const enemyFaction = this.playerFaction === 'ussr' ? 'germany' : 'ussr';
        const hull = enemyFaction === 'germany' ? 'tiger_hull' : 't34_hull';
        const turret = enemyFaction === 'germany' ? 'tiger_turret' : 't34_turret';

        const enemy = new Tank(100, 100, hull, turret);

        // Random position away from player squad center
        let x, y, dist;
        const centerX = this.mapWidth / 2;
        const centerY = this.mapHeight / 2;
        do {
            x = Math.random() * this.mapWidth;
            y = Math.random() * this.mapHeight;
            dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        } while (dist < 500); // Keep safe distance

        enemy.x = x;
        enemy.y = y;
        enemy.bodyRotation = Math.random() * Math.PI * 2;

        // Increase difficulty based on level
        enemy.maxSpeed = 1.5 + this.level * 0.2; // Slower than player initially
        enemy.fireRate = Math.max(500, 1500 - this.level * 100);
        enemy.health = 100 + this.level * 20; // Enemies get tougher
        enemy.maxHealth = enemy.health;

        this.enemies.push(enemy);
    }

    initLevel() {
        // Initialize Obstacles based on level
        this.obstacles = [];
        const obstacleCount = 10 + this.level * 5; // More obstacles on larger map
        for (let i = 0; i < obstacleCount; i++) {
            const x = Math.random() * this.mapWidth;
            const y = Math.random() * this.mapHeight;
            // Avoid spawn area
            if (Math.abs(x - this.mapWidth / 2) > 200 || Math.abs(y - this.mapHeight / 2) > 200) {
                this.obstacles.push(new Obstacle(x, y));
            }
        }
    }

    setupInputs() {
        window.addEventListener('keydown', (e) => {
            this.keys.add(e.key);

            if (!this.gameStarted) {
                if (e.key === '1') this.startGame('ussr');
                if (e.key === '2') this.startGame('germany');
                return;
            }

            if (this.playerDead) {
                if (e.key === 'F1') {
                    this.spawnSquad();
                }
                return;
            }

            // Switch Tank (TAB)
            if (e.key === 'Tab') {
                e.preventDefault();
                this.switchTank();
            }

            // Pause (ESC)
            if (e.key === 'Escape') {
                this.paused = !this.paused;
            }

            if (this.paused) return;

            // Fire on spacebar
            if (e.key === ' ' || e.key === 'Spacebar') {
                const bulletConfig = this.player.fire();
                if (bulletConfig) {
                    this.bullets.push(new Bullet(bulletConfig.x, bulletConfig.y, bulletConfig.angle, 'player', 'cannon'));
                    soundManager.playShoot();
                    // Muzzle Flash
                    for (let i = 0; i < 5; i++) {
                        this.particles.push(new Particle(bulletConfig.x, bulletConfig.y, '#FFA500', Math.random() * 2, 20));
                    }
                }
            }

            // Toggle Camera
            if (e.key === 'c' || e.key === 'C') {
                this.cameraMode = this.cameraMode === 'follow' ? 'cockpit' : 'follow';
            }

            // Throw Molotov (F)
            if (e.key === 'f' || e.key === 'F') {
                let worldMouseX = this.mouseX;
                let worldMouseY = this.mouseY;

                if (this.cameraMode === 'follow') {
                    worldMouseX = this.mouseX - this.cameraX;
                    worldMouseY = this.mouseY - this.cameraY;
                }

                // Recalculate for cockpit if needed, but for now use simple logic or just the calculated worldMouseX/Y
                if (this.cameraMode === 'follow') {
                    const config = this.player.throwMolotov(worldMouseX, worldMouseY);
                    if (config) {
                        this.bullets.push(new Bullet(config.x, config.y, config.angle, 'player', 'molotov', config.targetX, config.targetY));
                    }
                } else {
                    // Cockpit mode fallback: throw in direction of turret
                    const config = this.player.throwMolotov(this.player.x + Math.cos(this.player.turretRotation) * 500, this.player.y + Math.sin(this.player.turretRotation) * 500);
                    if (config) {
                        this.bullets.push(new Bullet(config.x, config.y, config.angle, 'player', 'molotov', config.targetX, config.targetY));
                    }
                }
            }

            // Shotgun (Q)
            if (e.key === 'q' || e.key === 'Q') {
                const configs = this.player.fireShotgun();
                if (configs) {
                    configs.forEach(cfg => {
                        this.bullets.push(new Bullet(cfg.x, cfg.y, cfg.angle, 'player', 'shotgunPellet'));
                    });
                    soundManager.playShoot();
                }
            }

            // Mine (E)
            if (e.key === 'e' || e.key === 'E') {
                const config = this.player.dropMine();
                if (config) {
                    this.bullets.push(new Bullet(config.x, config.y, 0, 'player', 'mine'));
                }
            }

            // Ultimate (R)
            if (e.key === 'r' || e.key === 'R') {
                const now = Date.now();
                if (now - this.lastUltimateTime > this.ultimateCooldown) {
                    this.triggerUltimate();
                    this.lastUltimateTime = now;
                }
            }
        });
        window.addEventListener('keyup', (e) => this.keys.delete(e.key));
        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        // Machine Gun (Hold V or Right Click) - handled in update
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    switchTank() {
        // Find next alive tank
        let nextIndex = this.playerIndex;
        for (let i = 0; i < this.playerSquad.length; i++) {
            nextIndex = (nextIndex + 1) % this.playerSquad.length;
            if (!this.playerSquad[nextIndex].isDestroyed()) {
                this.playerIndex = nextIndex;
                return;
            }
        }
    }

    update() {
        if (!this.loaded || !this.gameStarted || this.paused) return;

        // Check if all players dead
        if (this.playerSquad.every(t => t.isDestroyed())) {
            this.playerDead = true;
        } else if (this.player.isDestroyed()) {
            // Auto switch if current tank died
            this.switchTank();
        }

        if (this.playerDead) {
            // Only update particles and camera?
            this.particles.forEach((p, index) => {
                p.update();
                if (p.life <= 0) this.particles.splice(index, 1);
            });
            return;
        }

        // Machine Gun Input
        if (this.keys.has('v') || this.keys.has('V')) {
            const config = this.player.fireMG();
            if (config) {
                this.bullets.push(new Bullet(config.x, config.y, config.angle, 'player', 'mg'));
                soundManager.playMG();
            }
        }

        // Update Camera
        if (this.cameraMode === 'follow') {
            this.cameraX = this.width / 2 - this.player.x;
            this.cameraY = this.height / 2 - this.player.y;
            this.cameraRotation = 0;
        } else if (this.cameraMode === 'cockpit') {
            this.cameraX = this.width / 2;
            this.cameraY = this.height / 2;
            this.cameraRotation = -this.player.bodyRotation; // Rotate world opposite to player
        }

        // Adjust mouse for tank aiming
        let worldMouseX = this.mouseX;
        let worldMouseY = this.mouseY;

        if (this.cameraMode === 'follow') {
            worldMouseX = this.mouseX - this.cameraX;
            worldMouseY = this.mouseY - this.cameraY;
        } else if (this.cameraMode === 'cockpit') {
            // Aiming in cockpit mode: Mouse relative to center is direction relative to tank heading
            // We need to calculate the absolute angle.
            // Tank is at center.
            const dx = this.mouseX - this.width / 2;
            const dy = this.mouseY - this.height / 2;
            // This vector (dx, dy) is in the ROTATED screen space.
            // To get world space vector, we rotate it back by -cameraRotation (which is +playerRotation)
            const rot = -this.cameraRotation;
            const rdx = dx * Math.cos(rot) - dy * Math.sin(rot);
            const rdy = dx * Math.sin(rot) + dy * Math.cos(rot);

            worldMouseX = this.player.x + rdx;
            worldMouseY = this.player.y + rdy;
        }

        // Update Player Squad
        this.playerSquad.forEach((tank, index) => {
            if (tank.isDestroyed()) return;

            if (index === this.playerIndex) {
                // Player Control
                tank.update(this.keys, worldMouseX, worldMouseY);
            } else {
                // AI Teammate Logic
                // Follow player if far, attack enemy if close
                const leader = this.player;
                const distToLeader = Math.sqrt((tank.x - leader.x) ** 2 + (tank.y - leader.y) ** 2);

                // Find nearest enemy
                let nearestEnemy: Tank | null = null;
                let minDist = 10000;
                for (const e of this.enemies) {
                    const d = Math.sqrt((tank.x - e.x) ** 2 + (tank.y - e.y) ** 2);
                    if (d < minDist) {
                        minDist = d;
                        nearestEnemy = e;
                    }
                }

                if (nearestEnemy && minDist < 600) {
                    // Attack Enemy
                    const angleToEnemy = Math.atan2(nearestEnemy.y - tank.y, nearestEnemy.x - tank.x);
                    tank.turretRotation = angleToEnemy - Math.PI / 2;

                    // Stop and shoot
                    tank.speed = 0;

                    // Fire
                    const bulletConfig = tank.fire();
                    if (bulletConfig) {
                        this.bullets.push(new Bullet(bulletConfig.x, bulletConfig.y, bulletConfig.angle, 'player', 'cannon'));
                        soundManager.playShoot();
                    }
                } else if (distToLeader > 150) {
                    // Follow Leader
                    const angleToLeader = Math.atan2(leader.y - tank.y, leader.x - tank.x);
                    const angleDiff = angleToLeader - tank.bodyRotation;
                    let normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

                    if (Math.abs(normalizedDiff) > 0.1) {
                        if (normalizedDiff > 0) tank.bodyRotation += tank.rotationSpeed;
                        else tank.bodyRotation -= tank.rotationSpeed;
                    }
                    tank.speed = tank.maxSpeed;
                    tank.turretRotation = tank.bodyRotation;
                } else {
                    tank.speed = 0;
                }

                tank.update(new Set(), 0, 0);
            }

            // Boundaries
            tank.x = Math.max(50, Math.min(this.mapWidth - 50, tank.x));
            tank.y = Math.max(50, Math.min(this.mapHeight - 50, tank.y));
        });

        // Tank-Tank Collision (Squad vs Enemies)
        this.playerSquad.forEach(pTank => {
            if (pTank.isDestroyed()) return;
            this.enemies.forEach(enemy => {
                const distTanks = Math.sqrt((pTank.x - enemy.x) ** 2 + (pTank.y - enemy.y) ** 2);
                const minDist = pTank.width / 2 + enemy.width / 2;
                if (distTanks < minDist) {
                    // Push apart
                    const angle = Math.atan2(pTank.y - enemy.y, pTank.x - enemy.x);
                    const push = 2;
                    pTank.x += Math.cos(angle) * push;
                    pTank.y += Math.sin(angle) * push;
                    enemy.x -= Math.cos(angle) * push;
                    enemy.y -= Math.sin(angle) * push;
                }
            });
        });

        // Squad vs Squad Collision (avoid stacking)
        for (let i = 0; i < this.playerSquad.length; i++) {
            for (let j = i + 1; j < this.playerSquad.length; j++) {
                const t1 = this.playerSquad[i];
                const t2 = this.playerSquad[j];
                if (t1.isDestroyed() || t2.isDestroyed()) continue;

                const dist = Math.sqrt((t1.x - t2.x) ** 2 + (t1.y - t2.y) ** 2);
                if (dist < t1.width) {
                    const angle = Math.atan2(t1.y - t2.y, t1.x - t2.x);
                    const push = 1;
                    t1.x += Math.cos(angle) * push;
                    t1.y += Math.sin(angle) * push;
                    t2.x -= Math.cos(angle) * push;
                    t2.y -= Math.sin(angle) * push;
                }
            }
        }

        // Enemies vs Enemies Collision
        for (let i = 0; i < this.enemies.length; i++) {
            for (let j = i + 1; j < this.enemies.length; j++) {
                const e1 = this.enemies[i];
                const e2 = this.enemies[j];
                const dist = Math.sqrt((e1.x - e2.x) ** 2 + (e1.y - e2.y) ** 2);
                if (dist < e1.width) { // Approximate
                    const angle = Math.atan2(e1.y - e2.y, e1.x - e2.x);
                    const push = 1;
                    e1.x += Math.cos(angle) * push;
                    e1.y += Math.sin(angle) * push;
                    e2.x -= Math.cos(angle) * push;
                    e2.y -= Math.sin(angle) * push;
                }
            }
        }

        // Update Enemies
        this.enemies.forEach(enemy => {
            // Target nearest player tank
            let target = this.player; // Default
            let minDist = 10000;

            this.playerSquad.forEach(pTank => {
                if (pTank.isDestroyed()) return;
                const d = Math.sqrt((pTank.x - enemy.x) ** 2 + (pTank.y - enemy.y) ** 2);
                if (d < minDist) {
                    minDist = d;
                    target = pTank;
                }
            });

            const dx = target.x - enemy.x;
            const dy = target.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angleToPlayer = Math.atan2(dy, dx);

            // AI: Aggressive - Move towards player, stop only if very close

            const angleDiff = angleToPlayer - enemy.bodyRotation;
            let normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

            if (Math.abs(normalizedDiff) > 0.1) {
                if (normalizedDiff > 0) enemy.bodyRotation += enemy.rotationSpeed;
                else enemy.bodyRotation -= enemy.rotationSpeed;
            }

            // Move if facing roughly player and far away
            // Reduced stop distance to 100 to be more aggressive
            if (dist > 100 && Math.abs(normalizedDiff) < 0.5) {
                enemy.speed = enemy.maxSpeed;
            } else {
                enemy.speed = 0; // Stop to shoot
            }

            // Turret always aims at player
            enemy.turretRotation = angleToPlayer - Math.PI / 2;

            enemy.update(new Set(), 0, 0); // AI controls update manually above

            // Enemy Boundaries
            enemy.x = Math.max(50, Math.min(this.mapWidth - 50, enemy.x));
            enemy.y = Math.max(50, Math.min(this.mapHeight - 50, enemy.y));

            // Enemy Fire
            if (dist < 600 && !this.playerDead) {
                const bulletConfig = enemy.fire();
                if (bulletConfig) {
                    // Enemy damage reduced
                    const b = new Bullet(bulletConfig.x, bulletConfig.y, bulletConfig.angle, 'enemy', 'cannon');
                    b.damage = 10; // Reduced damage (was 25)
                    this.bullets.push(b);
                    soundManager.playShoot();
                    // Flash
                    for (let i = 0; i < 5; i++) {
                        this.particles.push(new Particle(bulletConfig.x, bulletConfig.y, '#FFA500', Math.random() * 2, 20));
                    }
                }
            }
        });

        // Tank Collision with Obstacles (Player)
        this.obstacles.forEach(obs => {
            this.playerSquad.forEach(pTank => {
                if (pTank.isDestroyed()) return;
                const dist = Math.sqrt((pTank.x - obs.x) ** 2 + (pTank.y - obs.y) ** 2);
                if (dist < pTank.width / 2 + obs.width / 2) {
                    // Simple push back
                    const angle = Math.atan2(pTank.y - obs.y, pTank.x - obs.x);
                    pTank.x = obs.x + Math.cos(angle) * (pTank.width / 2 + obs.width / 2 + 1);
                    pTank.y = obs.y + Math.sin(angle) * (pTank.width / 2 + obs.width / 2 + 1);
                }
            });
        });

        // Update Bullets
        this.bullets.forEach((bullet, index) => {
            bullet.update();

            // Safe time: don't check collisions for first 100ms to prevent self-collision
            if (Date.now() - bullet.creationTime < 100) return;

            let hit = false;

            // Check collision with obstacles
            for (const obs of this.obstacles) {
                const dist = Math.sqrt((bullet.x - obs.x) ** 2 + (bullet.y - obs.y) ** 2);
                if (dist < obs.width / 2 + bullet.radius) {
                    if (bullet.type === 'molotov') {
                        this.fireZones.push(new FireZone(bullet.x, bullet.y));
                    }
                    this.bullets.splice(index, 1);
                    // Particles
                    for (let i = 0; i < 5; i++) {
                        this.particles.push(new Particle(bullet.x, bullet.y, '#8D6E63', Math.random() * 3, 15));
                    }
                    hit = true;
                    break;
                }
            }

            if (hit) return;

            // Check collision with enemy
            if (bullet.owner === 'player') {
                for (let i = 0; i < this.enemies.length; i++) {
                    const enemy = this.enemies[i];
                    const dx = bullet.x - enemy.x;
                    const dy = bullet.y - enemy.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < enemy.width / 2 + bullet.radius) {
                        if (bullet.type === 'molotov') {
                            this.fireZones.push(new FireZone(bullet.x, bullet.y));
                            this.bullets.splice(index, 1);
                            return;
                        }

                        // Hit!
                        this.bullets.splice(index, 1);

                        // Damage
                        if (enemy.takeDamage(bullet.damage)) {
                            // Enemy Destroyed!
                            this.score++;
                            soundManager.playExplosion();

                            // Add Wreckage
                            this.wreckages.push(new Wreckage(enemy));
                            if (this.wreckages.length > 5) this.wreckages.shift(); // Allow more wreckage

                            // Remove enemy
                            this.enemies.splice(i, 1);

                            // Check Level Up
                            if (this.score >= this.killsForNextLevel) {
                                this.level++;
                                this.killsForNextLevel += 5 + this.level * 2;
                                // Heal squad
                                this.playerSquad.forEach(t => {
                                    if (!t.isDestroyed()) t.health = Math.min(t.maxHealth, t.health + 200);
                                });
                                this.initLevel();
                                // Spawn new wave
                                this.spawnEnemies();
                            } else if (this.enemies.length === 0) {
                                // Spawn replacement if all dead but level not over?
                                // Or just spawn one replacement
                                this.spawnSingleEnemy();
                            }
                        }

                        // Explosion Effects
                        for (let k = 0; k < 5; k++) {
                            this.particles.push(new Particle(bullet.x, bullet.y, '#FF4500', Math.random() * 5, 30));
                        }

                        // Push enemy back slightly (impact)
                        enemy.x += bullet.vx * 0.05;
                        enemy.y += bullet.vy * 0.05;
                        return;
                    }
                }
            } else if (bullet.owner === 'enemy') {
                // Check collision with player squad
                for (let i = 0; i < this.playerSquad.length; i++) {
                    const pTank = this.playerSquad[i];
                    if (pTank.isDestroyed()) continue;

                    const dx = bullet.x - pTank.x;
                    const dy = bullet.y - pTank.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < pTank.width / 2 + bullet.radius) {
                        this.bullets.splice(index, 1);
                        if (pTank.takeDamage(bullet.damage)) {
                            // Tank Destroyed
                            soundManager.playExplosion();
                            this.wreckages.push(new Wreckage(pTank));
                        }
                        // Explosion Effects
                        for (let k = 0; k < 5; k++) {
                            this.particles.push(new Particle(bullet.x, bullet.y, '#FF4500', Math.random() * 5, 30));
                        }
                        return;
                    }
                }
            }

            if (bullet.isOutOfBounds(this.width, this.height) && bullet.type !== 'molotov') {
                this.bullets.splice(index, 1);
            } else if (bullet.type === 'molotov') {
                // Check if reached target
                if (bullet.targetX !== undefined && bullet.targetY !== undefined) {
                    const distToTarget = Math.sqrt((bullet.x - bullet.targetX) ** 2 + (bullet.y - bullet.targetY) ** 2);
                    if (distToTarget < 10) {
                        // Reached target
                        this.fireZones.push(new FireZone(bullet.x, bullet.y));
                        soundManager.playGlassBreak();
                        this.bullets.splice(index, 1);
                    }
                }
            }
        });

        // Update Fire Zones
        this.fireZones.forEach((zone, index) => {
            zone.update();
            if (zone.life <= 0) {
                this.fireZones.splice(index, 1);
            } else {
                // Damage Enemies
                this.enemies.forEach(enemy => {
                    const dx = zone.x - enemy.x;
                    const dy = zone.y - enemy.y;
                    if (Math.sqrt(dx * dx + dy * dy) < zone.radius + enemy.width / 2) {
                        enemy.takeDamage(0.5); // DoT
                    }
                });
            }
        });

        // Update Particles
        this.particles.forEach((p, index) => {
            p.update();
            if (p.life <= 0) {
                this.particles.splice(index, 1);
            }
        });
    }

    draw() {
        if (!this.loaded) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '30px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Loading Assets...', this.width / 2, this.height / 2);
            return;
        }

        if (!this.gameStarted) {
            this.drawStartScreen();
            return;
        }

        this.ctx.save();

        // Apply Camera Transform
        if (this.cameraMode === 'cockpit') {
            // Move to center of screen
            this.ctx.translate(this.width / 2, this.height / 2);
            // Rotate world
            this.ctx.rotate(this.cameraRotation);
            // Move world so player is at center
            this.ctx.translate(-this.player.x, -this.player.y);
        } else {
            this.ctx.translate(this.cameraX, this.cameraY);
        }

        // Clear screen (Draw huge background or tile it based on camera)
        // For simplicity, we just draw a large tiled background covering visible area

        // Draw Background Pattern
        if (this.backgroundImage) {
            const ptrn = this.ctx.createPattern(this.backgroundImage, 'repeat');
            if (ptrn) {
                this.ctx.fillStyle = ptrn;
                // Draw map area
                this.ctx.fillRect(0, 0, this.mapWidth, this.mapHeight);
            }
        } else {
            this.ctx.fillStyle = '#3e3e3e';
            this.ctx.fillRect(0, 0, this.mapWidth, this.mapHeight);
        }

        // Draw Electric Fence (Boundaries)
        this.ctx.strokeStyle = '#00FFFF';
        this.ctx.lineWidth = 5;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#00FFFF';
        this.ctx.strokeRect(0, 0, this.mapWidth, this.mapHeight);
        this.ctx.shadowBlur = 0; // Reset

        this.wreckages.forEach(w => w.draw(this.ctx));
        this.fireZones.forEach(z => z.draw(this.ctx));

        this.playerSquad.forEach((tank, index) => {
            if (!tank.isDestroyed()) {
                tank.draw(this.ctx);
                // Draw indicator for controlled tank
                if (index === this.playerIndex) {
                    this.ctx.save();
                    this.ctx.translate(tank.x, tank.y);

                    // Green Circle
                    this.ctx.strokeStyle = '#00FF00';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, 60, 0, Math.PI * 2);
                    this.ctx.stroke();

                    // "PLAYER" Label
                    this.ctx.fillStyle = '#00FF00';
                    this.ctx.font = 'bold 16px Inter, sans-serif';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('PLAYER', 0, -70);

                    this.ctx.restore();
                }
            }
        });

        this.enemies.forEach(enemy => enemy.draw(this.ctx));

        this.obstacles.forEach(obs => obs.draw(this.ctx));

        this.bullets.forEach(bullet => bullet.draw(this.ctx));
        this.particles.forEach(p => p.draw(this.ctx));

        if (!this.playerDead) this.drawCrosshair();

        this.ctx.restore(); // Restore camera transform for UI

        this.drawUI();
        this.drawRadar();
    }

    drawCrosshair() {
        // Calculate crosshair position based on turret direction
        const crosshairDistance = 150; // Distance from tank
        const crosshairX = this.player.x + Math.cos(this.player.turretRotation - Math.PI / 2) * crosshairDistance;
        const crosshairY = this.player.y + Math.sin(this.player.turretRotation - Math.PI / 2) * crosshairDistance;

        this.ctx.save();
        this.ctx.strokeStyle = '#00FF00'; // Green crosshair
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.8;

        // Outer circle
        this.ctx.beginPath();
        this.ctx.arc(crosshairX, crosshairY, 20, 0, Math.PI * 2);
        this.ctx.stroke();

        // Inner dot
        this.ctx.beginPath();
        this.ctx.arc(crosshairX, crosshairY, 2, 0, Math.PI * 2);
        this.ctx.fillStyle = '#00FF00';
        this.ctx.fill();

        // Crosshair lines
        this.ctx.beginPath();
        this.ctx.moveTo(crosshairX - 25, crosshairY);
        this.ctx.lineTo(crosshairX - 10, crosshairY);
        this.ctx.moveTo(crosshairX + 25, crosshairY);
        this.ctx.lineTo(crosshairX + 10, crosshairY);
        this.ctx.moveTo(crosshairX, crosshairY - 25);
        this.ctx.lineTo(crosshairX, crosshairY - 10);
        this.ctx.moveTo(crosshairX, crosshairY + 25);
        this.ctx.lineTo(crosshairX, crosshairY + 10);
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawStartScreen() {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';

        this.ctx.font = '48px Inter, sans-serif';
        this.ctx.fillText('IRON CLASH: EASTERN FRONT', this.width / 2, this.height / 2 - 100);

        this.ctx.font = '24px Inter, sans-serif';
        this.ctx.fillText('Select Your Faction:', this.width / 2, this.height / 2);

        this.ctx.fillStyle = '#4CAF50'; // Green
        this.ctx.fillText('Press [1] for USSR (T-34)', this.width / 2, this.height / 2 + 50);

        this.ctx.fillStyle = '#9E9E9E'; // Grey
        this.ctx.fillText('Press [2] for Germany (Tiger I)', this.width / 2, this.height / 2 + 100);
    }

    drawUI() {
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Inter, sans-serif';
        this.ctx.fillText('WASD Move | SPACE Cannon | V MG | F Molotov | Q Shotgun | E Mine | TAB Switch | C Camera', 20, 30);
        this.ctx.fillText(`Camera: ${this.cameraMode === 'follow' ? 'TOP-DOWN' : 'COCKPIT'}`, 20, 55);
        this.ctx.fillText(`Squad: ${this.playerSquad.filter(t => !t.isDestroyed()).length}/${this.playerSquad.length}`, 20, 80);

        // Ultimate Status
        const now = Date.now();
        const timeLeft = Math.max(0, this.ultimateCooldown - (now - this.lastUltimateTime));
        if (timeLeft === 0) {
            this.ctx.fillStyle = '#00FF00';
            this.ctx.fillText('ULTIMATE READY [R]', 20, 105);
        } else {
            this.ctx.fillStyle = '#FF0000';
            this.ctx.fillText(`ULTIMATE: ${(timeLeft / 1000).toFixed(1)}s`, 20, 105);
        }

        // Score & Level
        this.ctx.font = 'bold 24px Inter, sans-serif';
        this.ctx.fillStyle = '#FFD700';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Level: ${this.level}`, this.width - 20, 40);
        this.ctx.fillText(`Kills: ${this.score} / ${this.killsForNextLevel}`, this.width - 20, 70);

        if (this.playerDead) {
            this.ctx.fillStyle = 'red';
            this.ctx.font = 'bold 48px Inter, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('YOU DIED', this.width / 2, this.height / 2);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '24px Inter, sans-serif';
            this.ctx.fillText('Press [F1] to Respawn', this.width / 2, this.height / 2 + 50);
        }

        if (this.paused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 48px Inter, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.width / 2, this.height / 2);
            this.ctx.font = '24px Inter, sans-serif';
            this.ctx.fillStyle = 'white';
            this.ctx.fillText('Press [ESC] to Resume', this.width / 2, this.height / 2 + 50);
        }
    }

    drawRadar() {
        const radarSize = 200;
        const radarX = this.width - radarSize - 20;
        const radarY = this.height - radarSize - 20;
        const scale = radarSize / this.mapWidth;

        this.ctx.save();
        this.ctx.translate(radarX, radarY);

        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(0, 0, radarSize, radarSize);
        this.ctx.strokeRect(0, 0, radarSize, radarSize);

        // Draw Player Squad (Green)
        this.ctx.fillStyle = '#00FF00';
        this.playerSquad.forEach((tank, index) => {
            if (tank.isDestroyed()) return;
            const x = tank.x * scale;
            const y = tank.y * scale;

            this.ctx.beginPath();
            this.ctx.arc(x, y, index === this.playerIndex ? 4 : 2, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Draw Enemies (Red)
        this.ctx.fillStyle = '#FF0000';
        this.enemies.forEach(tank => {
            const x = tank.x * scale;
            const y = tank.y * scale;

            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Draw Viewport Rect
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 1;
        const viewX = (this.cameraX * -1) * scale;
        const viewY = (this.cameraY * -1) * scale;
        const viewW = this.width * scale;
        const viewH = this.height * scale;
        this.ctx.strokeRect(viewX, viewY, viewW, viewH);

        this.ctx.restore();
    }

    triggerUltimate() {
        // Kill all enemies
        soundManager.playExplosion();

        // Flash effect (simple white rect for 1 frame? handled by particles mostly)
        // Create massive explosions at each enemy
        this.enemies.forEach(enemy => {
            this.score++;
            this.wreckages.push(new Wreckage(enemy));
            for (let i = 0; i < 20; i++) {
                this.particles.push(new Particle(enemy.x, enemy.y, '#FF4500', Math.random() * 10, 50));
            }
        });

        this.enemies = [];

        // Check Level Up logic (simplified)
        if (this.score >= this.killsForNextLevel) {
            this.level++;
            this.killsForNextLevel += 5 + this.level * 2;
            // Heal squad
            this.playerSquad.forEach(t => {
                if (!t.isDestroyed()) t.health = Math.min(t.maxHealth, t.health + 200);
            });
            this.initLevel();
            this.spawnEnemies();
        } else {
            // Spawn new wave immediately to keep action going
            setTimeout(() => this.spawnEnemies(), 1000);
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 1;
        const gridSize = 100;

        for (let x = 0; x < this.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        for (let y = 0; y < this.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }
}
