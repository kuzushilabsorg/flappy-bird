// Game constants
const GRAVITY = 0.37;  // More challenging gravity
const FLAP_FORCE = -2.0;  // Balanced flap force
const PIPE_SPEED = 2.0;  // Good challenge speed
const PIPE_SPACING = 250;  // Good pipe spacing
const PIPE_GAP = 150;  // Larger gap for better playability
const MAX_VELOCITY = 4.0;  // Balanced max velocity
const MIN_VELOCITY = -2.5;  // Balanced min velocity
const FLOAT_AMPLITUDE = 0.1;  // Smooth float amplitude
const FLOAT_SPEED = 0.002;  // Good float speed

// Colors for night theme
const SKY_COLOR = 0x1a237e;  // Deep blue night sky
const GROUND_COLOR = 0x2e7d32;  // Dark green ground

// Classic Flappy Bird pipe colors
const PIPE_COLOR = {
    base: 0x74BF2E,    // Bright green
    accent: 0x4AA825   // Slightly darker green for cap
};

// Key state tracking
const keyState = {
    isFlapping: false,
    lastFlapTime: 0,
    flapInterval: 250  // Minimum time between flaps in ms
};

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB, 1);
        document.body.appendChild(this.renderer.domElement);

        // Game state
        this.score = 0;
        this.gameStarted = false;
        this.gameOver = false;
        this.bird = null;
        this.pipes = [];
        this.velocity = 0;

        // UI elements
        this.scoreElement = document.getElementById('score');
        this.gameOverElement = document.getElementById('gameOver');
        this.startPromptElement = document.getElementById('startPrompt');

        this.setupScene();
        this.setupControls();
        this.animate();
    }

    setupScene() {
        // Camera position
        this.camera.position.z = 400;
        this.camera.position.y = 0;
        this.camera.position.x = 0;

        // Create improved cartoon bird
        this.bird = new THREE.Group();

        // Create main body - slightly oval shape
        const bodyGeometry = new THREE.CircleGeometry(15, 32);
        const bodyMaterial = new THREE.MeshBasicMaterial({
            color: 0xFDD835, // Warmer yellow
            side: THREE.DoubleSide
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.scale.x = 1.2; // Make slightly oval
        this.bird.add(body);

        // Add wing
        const wingGeometry = new THREE.CircleGeometry(8, 32, 0, Math.PI);
        const wingMaterial = new THREE.MeshBasicMaterial({
            color: 0xF57F17, // Darker orange-yellow
            side: THREE.DoubleSide
        });
        const wing = new THREE.Mesh(wingGeometry, wingMaterial);
        wing.position.set(-5, -2, 0.1);
        wing.rotation.z = Math.PI / 6;
        this.bird.add(wing);

        // Add eye with white background
        const eyeBackGeometry = new THREE.CircleGeometry(4, 32);
        const eyeBackMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF // White
        });
        const eyeBack = new THREE.Mesh(eyeBackGeometry, eyeBackMaterial);
        eyeBack.position.set(7, 3, 0.1);
        this.bird.add(eyeBack);

        const eyeGeometry = new THREE.CircleGeometry(2.5, 32);
        const eyeMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000 // Black
        });
        const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        eye.position.set(7, 3, 0.2);
        this.bird.add(eye);

        // Add beak
        const beakGeometry = new THREE.ConeGeometry(3.5, 10, 32);
        const beakMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF6F00 // Deeper orange
        });
        const beak = new THREE.Mesh(beakGeometry, beakMaterial);
        beak.rotation.z = -Math.PI / 2;
        beak.position.set(14, 0, 0);
        this.bird.add(beak);

        this.bird.position.set(-150, 0, 0);
        this.scene.add(this.bird);

        // Create sky background
        this.createSkyBackground();

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(ambientLight);
    }

    createPipe() {
        const pipeWidth = 30;  // Thinner pipes
        const pipeHeight = 800;  // Slightly shorter pipes
        const gap = PIPE_GAP;
        const randomY = Math.random() * 200 - 100; // Wider range for more varied gaps

        // Create a group for each pipe pair
        const pipeGroup = new THREE.Group();

        // Function to create a simple pipe
        const createPipe = (isTop) => {
            const pipeGroup = new THREE.Group();
            
            // Main pipe body - thinner and more classic looking
            const pipeGeometry = new THREE.BoxGeometry(pipeWidth, pipeHeight, 20);
            const pipeMaterial = new THREE.MeshBasicMaterial({
                color: PIPE_COLOR.base
            });
            const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
            pipeGroup.add(pipe);

            // Add pipe cap - slightly wider than pipe
            const capGeometry = new THREE.BoxGeometry(pipeWidth + 10, 20, 20);
            const capMaterial = new THREE.MeshBasicMaterial({
                color: PIPE_COLOR.accent
            });
            const cap = new THREE.Mesh(capGeometry, capMaterial);
            cap.position.y = isTop ? -pipeHeight/2 : pipeHeight/2;
            pipeGroup.add(cap);
            return pipeGroup;
        };

        // Create top and bottom pipes
        const topPipe = createPipe(true);
        topPipe.position.set(350, randomY + gap/2 + pipeHeight/2, 0);
        
        const bottomPipe = createPipe(false);
        bottomPipe.position.set(350, randomY - gap/2 - pipeHeight/2, 0);

        this.scene.add(topPipe);
        this.scene.add(bottomPipe);
        this.pipes.push({ top: topPipe, bottom: bottomPipe, passed: false });
    }

    setupControls() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                e.preventDefault();
                if (!this.gameStarted) {
                    this.startGame();
                } else if (!this.gameOver) {
                    keyState.isFlapping = true;
                    this.handleFlap();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                keyState.isFlapping = false;
            }
        });

        // Add touch events for mobile support
        window.addEventListener('touchstart', (e) => {
            e.preventDefault();
            keyState.isFlapping = true;
            if (!this.gameStarted) {
                this.startGame();
            } else if (!this.gameOver) {
                this.handleFlap();
            } else {
                this.resetGame();
            }
        });

        // Add click handler for game restart
        window.addEventListener('click', () => {
            if (this.gameOver) {
                this.resetGame();
            } else if (!this.gameStarted) {
                this.startGame();
            }
        });

        window.addEventListener('touchend', () => {
            keyState.isFlapping = false;
        });



        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    startGame() {
        this.gameStarted = true;
        this.startPromptElement.style.display = 'none';
        this.createPipe();
    }

    handleFlap() {
        const currentTime = Date.now();
        if (currentTime - keyState.lastFlapTime >= keyState.flapInterval) {
            // Much smoother velocity change with gentler response
            const targetVelocity = Math.max(this.velocity + FLAP_FORCE, MIN_VELOCITY);
            this.velocity = THREE.MathUtils.lerp(this.velocity, targetVelocity, 0.15);  // Much slower lerp for smoother response
            keyState.lastFlapTime = currentTime;
        }
    }

    flap() {
        this.handleFlap();
    }

    checkCollision(bird, pipe) {
        // Get bird's core position
        const birdCenter = new THREE.Vector3();
        bird.getWorldPosition(birdCenter);
        
        // Create a more accurate hitbox for the bird
        const birdWidth = 12;   // Slightly larger hitbox
        const birdHeight = 10;  // Slightly larger hitbox
        const birdBox = new THREE.Box3(
            new THREE.Vector3(birdCenter.x - birdWidth, birdCenter.y - birdHeight, birdCenter.z - birdWidth),
            new THREE.Vector3(birdCenter.x + birdWidth, birdCenter.y + birdHeight, birdCenter.z + birdWidth)
        );
        
        // Get pipe boundaries
        const topPipeBox = new THREE.Box3().setFromObject(pipe.top);
        const bottomPipeBox = new THREE.Box3().setFromObject(pipe.bottom);
        
        // Make pipe hitboxes slightly smaller than visual size
        const pipeBuffer = 5; // Smaller buffer for more accurate collisions
        topPipeBox.min.add(new THREE.Vector3(pipeBuffer, pipeBuffer, pipeBuffer));
        topPipeBox.max.sub(new THREE.Vector3(pipeBuffer, pipeBuffer, pipeBuffer));
        bottomPipeBox.min.add(new THREE.Vector3(pipeBuffer, pipeBuffer, pipeBuffer));
        bottomPipeBox.max.sub(new THREE.Vector3(pipeBuffer, pipeBuffer, pipeBuffer));
        
        // Check vertical bounds
        if (bird.position.y > 200 || bird.position.y < -200) {
            return true;
        }
        
        // Check for actual collision with pipes
        const hitsPipe = birdBox.intersectsBox(topPipeBox) || birdBox.intersectsBox(bottomPipeBox);
        return hitsPipe;
    }

    createSkyBackground() {
        // Create sky background with gradient colors
        const skyGeometry = new THREE.PlaneGeometry(2000, 1000);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x4FC3F7,  // Light blue
            side: THREE.DoubleSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        sky.position.z = -100;
        this.scene.add(sky);

        // Add darker blue at the top
        const topSkyGeometry = new THREE.PlaneGeometry(2000, 400);
        const topSkyMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a237e,  // Deep blue
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const topSky = new THREE.Mesh(topSkyGeometry, topSkyMaterial);
        topSky.position.z = -99;
        topSky.position.y = 300;
        this.scene.add(topSky);

        // Create ground with gradient
        const groundGeometry = new THREE.PlaneGeometry(2000, 200);
        const groundMaterial = new THREE.MeshBasicMaterial({
            color: 0x2E7D32,  // Dark green
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.position.y = -200;
        ground.position.z = -50;
        this.scene.add(ground);

        // Add lighter green overlay for grass effect
        const grassGeometry = new THREE.PlaneGeometry(2000, 50);
        const grassMaterial = new THREE.MeshBasicMaterial({
            color: 0x388E3C,  // Lighter green
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const grass = new THREE.Mesh(grassGeometry, grassMaterial);
        grass.position.y = -175;
        grass.position.z = -49;
        this.scene.add(grass);
    }

    updateGame() {
        if (!this.gameStarted || this.gameOver) return;

        // Update bird with smooth physics
        const deltaTime = 1/60;  // Assuming 60fps
        
        // Add natural floating motion when holding flap
        if (keyState.isFlapping) {
            const floatOffset = Math.sin(Date.now() * FLOAT_SPEED) * FLOAT_AMPLITUDE;
            const targetVelocity = -1.2 + floatOffset;  // Gentle upward velocity
            this.velocity = THREE.MathUtils.lerp(this.velocity, targetVelocity, 0.03);  // Smooth transition
        } else {
            const nextVelocity = Math.min(this.velocity + GRAVITY, MAX_VELOCITY);
            this.velocity = THREE.MathUtils.lerp(this.velocity, nextVelocity, 0.06);  // Smooth falling
        }
        
        // Update bird position and rotation
        const newY = this.bird.position.y - this.velocity * deltaTime * 60;
        // Ensure bird stays within reasonable bounds
        this.bird.position.y = THREE.MathUtils.clamp(newY, -250, 250);
        
        // Add smooth bird rotation based on velocity
        const targetRotation = THREE.MathUtils.clamp(this.velocity * 0.3, -0.6, 0.6);
        this.bird.rotation.z = THREE.MathUtils.lerp(this.bird.rotation.z, targetRotation, 0.1);
        


        // Check if bird hits the boundaries
        if (this.bird.position.y > 300 || this.bird.position.y < -300) {
            this.endGame();
            return;
        }

        // Update pipes
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.top.position.x -= PIPE_SPEED;
            pipe.bottom.position.x -= PIPE_SPEED;

            // Check collision
            if (this.checkCollision(this.bird, pipe)) {
                this.endGame();
                return;
            }

            // Update score
            if (!pipe.passed && pipe.top.position.x < this.bird.position.x) {
                pipe.passed = true;
                this.score++;
                this.scoreElement.textContent = `Score: ${this.score}`;
            }

            // Remove pipes that are off screen
            if (pipe.top.position.x < -400) {
                this.scene.remove(pipe.top);
                this.scene.remove(pipe.bottom);
                this.pipes.splice(i, 1);
            }
        }

        // Create new pipes
        if (this.pipes.length === 0 || 
            this.pipes[this.pipes.length - 1].top.position.x < 400 - PIPE_SPACING) {
            this.createPipe();
        }
    }

    endGame() {
        this.gameOver = true;
        this.gameOverElement.style.display = 'block';
    }

    resetGame() {
        // Reset game state
        this.score = 0;
        this.velocity = 0;
        this.gameOver = false;
        this.gameStarted = false;
        this.bird.position.set(-100, 0, 0);

        // Reset UI
        this.scoreElement.textContent = 'Score: 0';
        this.gameOverElement.style.display = 'none';
        this.startPromptElement.style.display = 'block';

        // Remove all pipes
        this.pipes.forEach(pipe => {
            this.scene.remove(pipe.top);
            this.scene.remove(pipe.bottom);
        });
        this.pipes = [];
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.bird && this.gameStarted && !this.gameOver) {
            // Add slight rotation based on velocity for more dynamic movement
            const targetRotation = THREE.MathUtils.clamp(this.velocity * 0.05, -Math.PI / 4, Math.PI / 4);
            this.bird.rotation.z = THREE.MathUtils.lerp(this.bird.rotation.z, targetRotation, 0.1);

            // Handle continuous flapping if key is held
            if (keyState.isFlapping) {
                this.handleFlap();
            }


        }
        
        this.updateGame();
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game
new Game();
