const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Load Images
const bunnyImg = new Image();
bunnyImg.src = 'bunny.png';
const carrotImg = new Image();
carrotImg.src = 'carrot.png';
const rockImg = new Image();
rockImg.src = 'rock.png';

// Audio Context
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

const sounds = {
    jump: () => playTone(400, 'square', 0.1),
    collect: () => playTone(800, 'sine', 0.1),
    gameOver: () => playTone(150, 'sawtooth', 0.5)
};

function playTone(freq, type, duration) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// Game State
let gameRunning = false;
let score = 0;
let highScore = localStorage.getItem('bunnyHopHighScore') || 0;
let animationId;

// Game Objects
const bunny = {
    x: canvas.width / 2 - 16,
    y: canvas.height - 40,
    width: 32,
    height: 32,
    speed: 5,
    dx: 0
};

const items = []; // Carrots and Rocks
const particles = []; // Particle effects
const itemSpeed = 3;
const spawnRate = 60; // Frames
let frameCount = 0;

// Input Handling
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') {
        if (!gameRunning) {
            startGame();
        } else if (document.getElementById('game-over-screen').classList.contains('hidden') === false) {
            startGame();
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 1.0,
            color: color
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;
        particles[i].life -= 0.05;
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
        ctx.globalAlpha = 1.0;
    });
}

function startGame() {
    if (gameRunning) return;

    // Reset
    score = 0;
    items.length = 0;
    particles.length = 0;
    bunny.x = canvas.width / 2 - 16;
    gameRunning = true;

    // UI
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('score').innerText = `Score: ${score}`;
    document.getElementById('high-score').innerText = `High Score: ${highScore}`;

    if (audioCtx.state === 'suspended') audioCtx.resume();

    animate();
}

function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    sounds.gameOver();

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('bunnyHopHighScore', highScore);
    }

    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = `Score: ${score}`;
    document.getElementById('final-high-score').innerText = `High Score: ${highScore}`;
}

function update() {
    // Bunny Movement
    if (keys['ArrowLeft']) bunny.x -= bunny.speed;
    if (keys['ArrowRight']) bunny.x += bunny.speed;

    // Hopping Animation
    const hopOffset = Math.sin(frameCount * 0.2) * 3;

    // Boundaries
    if (bunny.x < 0) bunny.x = 0;
    if (bunny.x + bunny.width > canvas.width) bunny.x = canvas.width - bunny.width;

    // Difficulty Scaling
    if (frameCount % 600 === 0) { // Every ~10 seconds
        // itemSpeed += 0.5; // This is a const, need to change to let
        // Actually let's just increase speed of new items or change global speed if I make it a let.
        // Let's change itemSpeed to let at the top first.
    }

    // Spawn Items
    frameCount++;
    if (frameCount % spawnRate === 0) {
        const isCarrot = Math.random() > 0.3; // 70% carrots, 30% rocks
        items.push({
            x: Math.random() * (canvas.width - 32),
            y: -32,
            width: 32,
            height: 32,
            type: isCarrot ? 'carrot' : 'rock',
            img: isCarrot ? carrotImg : rockImg,
            speed: itemSpeed + (score / 100) // Increase speed with score
        });
    }

    updateParticles();

    // Update Items
    for (let i = items.length - 1; i >= 0; i--) {
        items[i].y += items[i].speed;

        // Collision Detection
        if (
            bunny.x < items[i].x + items[i].width &&
            bunny.x + bunny.width > items[i].x &&
            bunny.y + hopOffset < items[i].y + items[i].height &&
            bunny.y + hopOffset + bunny.height > items[i].y
        ) {
            if (items[i].type === 'carrot') {
                score += 10;
                document.getElementById('score').innerText = `Score: ${score}`;
                createParticles(items[i].x + 16, items[i].y + 16, '#ffa500');
                sounds.collect();
                items.splice(i, 1);
            } else {
                createParticles(bunny.x + 16, bunny.y + 16, '#ff0000');
                gameOver();
            }
            continue;
        }

        // Remove off-screen
        if (items[i].y > canvas.height) {
            items.splice(i, 1);
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Hopping Offset for Draw
    const hopOffset = gameRunning ? Math.sin(frameCount * 0.2) * 3 : 0;

    // Draw Bunny
    ctx.drawImage(bunnyImg, bunny.x, bunny.y + hopOffset, bunny.width, bunny.height);

    // Draw Items
    items.forEach(item => {
        ctx.drawImage(item.img, item.x, item.y, item.width, item.height);
    });

    drawParticles();
}

function animate() {
    if (!gameRunning) return;
    update();
    draw();
    animationId = requestAnimationFrame(animate);
}

// Initial Draw
draw();
