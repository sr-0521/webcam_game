// Game configuration
const config = {
  ballCount: 1,
  ballRadius: 20,
  gravity: 0.35,
  bounceVelocity: -10,
  handRadius: 50,
  countdownTime: 3,
  particleCount: 15,
  challengeInterval: 30, // New challenge every 30 seconds
};

// Challenge types
const CHALLENGES = {
  SPEED_UP: 'speedUp',
  MULTI_BALL: 'multiBall',
  BARRIERS: 'barriers'
};

// Barrier class
class Barrier {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = 'rgba(139, 92, 246, 0.6)';
  }

  draw(ctx) {
    // Outer glow
    ctx.shadowColor = 'rgba(139, 92, 246, 0.8)';
    ctx.shadowBlur = 20;
    
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Reset shadow
    ctx.shadowBlur = 0;
    
    // Border with electric effect
    ctx.strokeStyle = 'rgba(167, 139, 250, 1)';
    ctx.lineWidth = 3;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    
    // Electric zigzag pattern
    ctx.strokeStyle = 'rgba(196, 181, 253, 0.6)';
    ctx.lineWidth = 2;
    for (let i = 0; i < this.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(this.x + i, this.y);
      ctx.lineTo(this.x + i + 10, this.y + this.height / 2);
      ctx.lineTo(this.x + i + 5, this.y + this.height);
      ctx.stroke();
    }
  }

  checkCollision(ball) {
    // Check if ball intersects with barrier
    const closestX = Math.max(this.x, Math.min(ball.x, this.x + this.width));
    const closestY = Math.max(this.y, Math.min(ball.y, this.y + this.height));
    
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < ball.radius;
  }

  bounceOff(ball) {
    // Determine which side was hit
    const ballCenterX = ball.x;
    const ballCenterY = ball.y;
    
    const left = this.x;
    const right = this.x + this.width;
    const top = this.y;
    const bottom = this.y + this.height;
    
    // Calculate distances to each edge
    const distToLeft = Math.abs(ballCenterX - left);
    const distToRight = Math.abs(ballCenterX - right);
    const distToTop = Math.abs(ballCenterY - top);
    const distToBottom = Math.abs(ballCenterY - bottom);
    
    const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
    
    // Bounce based on closest edge
    if (minDist === distToLeft || minDist === distToRight) {
      ball.vx *= -0.9;
      if (minDist === distToLeft) ball.x = left - ball.radius;
      else ball.x = right + ball.radius;
    } else {
      ball.vy *= -0.9;
      if (minDist === distToTop) ball.y = top - ball.radius;
      else ball.y = bottom + ball.radius;
    }
  }
}

// Particle class
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8 - 2;
    this.life = 1.0;
    this.decay = Math.random() * 0.02 + 0.01;
    this.size = Math.random() * 4 + 2;
    this.color = color;
    this.gravity = 0.15;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.life -= this.decay;
    return this.life > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;
    
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2);
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

// Game state
let gameState = {
  balls: [],
  hands: [],
  particles: [],
  barriers: [],
  score: 0,
  highScore: 0,
  gameOver: false,
  startTime: null,
  animationId: null,
  countdown: 0,
  isCountingDown: false,
  isNewHighScore: false,
  lastChallengeTime: 0,
  activeChallenges: [],
  currentGravity: config.gravity,
  challengeNotification: null,
  notificationTimer: 0,
};

// Canvas setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// UI elements
const overlay = document.getElementById("overlay");
const startButton = document.getElementById("startButton");
const scoreDisplay = document.getElementById("score");
const highScoreDisplay = document.getElementById("highScore");
const overlayMessage = document.getElementById("overlayMessage");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingStatus = document.getElementById("loadingStatus");

// Load high score from storage
async function loadHighScore() {
  try {
    const result = await window.storage.get('stormKeeperHighScore');
    if (result && result.value) {
      gameState.highScore = parseInt(result.value);
      highScoreDisplay.textContent = gameState.highScore;
    }
  } catch (error) {
    console.log('No high score found, starting fresh');
    gameState.highScore = 0;
  }
}

// Save high score to storage
async function saveHighScore(score) {
  try {
    await window.storage.set('stormKeeperHighScore', score.toString());
    console.log('High score saved:', score);
  } catch (error) {
    console.error('Error saving high score:', error);
  }
}

// Show challenge notification
function showChallengeNotification(message) {
  gameState.challengeNotification = message;
  gameState.notificationTimer = 3; // Show for 3 seconds
}

// Add a new challenge
function addChallenge() {
  const availableChallenges = Object.values(CHALLENGES);
  const randomChallenge = availableChallenges[Math.floor(Math.random() * availableChallenges.length)];
  
  gameState.activeChallenges.push(randomChallenge);
  
  switch (randomChallenge) {
    case CHALLENGES.SPEED_UP:
      gameState.currentGravity += 0.15;
      showChallengeNotification('⚡ STORM INTENSIFIES!');
      createParticleBurst(canvas.width / 2, 50, 'rgba(255, 255, 100, 0.8)');
      break;
      
    case CHALLENGES.MULTI_BALL:
      addNewBall();
      showChallengeNotification('💧 ANOTHER ORB FALLS!');
      break;
      
    case CHALLENGES.BARRIERS:
      addBarriers();
      showChallengeNotification('🌩️ LIGHTNING STRIKES!');
      break;
  }
}

// Add a new ball
function addNewBall() {
  const stormColors = ['rgba(96, 165, 250, 0.9)', 'rgba(147, 197, 253, 0.9)', 'rgba(59, 130, 246, 0.9)', 'rgba(125, 211, 252, 0.9)'];
  const colorIndex = gameState.balls.length % stormColors.length;
  gameState.balls.push({
    x: canvas.width / 2,
    y: 100,
    vx: (Math.random() - 0.5) * 4,
    vy: 2,
    radius: config.ballRadius,
    color: stormColors[colorIndex],
  });
  
  // Particle burst for new ball
  createParticleBurst(canvas.width / 2, 100, stormColors[colorIndex]);
}

// Add random barriers
function addBarriers() {
  const numBarriers = Math.floor(Math.random() * 2) + 2; // 2-3 barriers
  
  for (let i = 0; i < numBarriers; i++) {
    const width = Math.random() * 80 + 60;
    const height = 20;
    const x = Math.random() * (canvas.width - width);
    const y = Math.random() * (canvas.height * 0.6) + canvas.height * 0.2; // Middle 60% of screen
    
    gameState.barriers.push(new Barrier(x, y, width, height));
  }
}

// Create particle burst at position
function createParticleBurst(x, y, color) {
  for (let i = 0; i < config.particleCount; i++) {
    gameState.particles.push(new Particle(x, y, color));
  }
}

// Update all particles
function updateParticles() {
  gameState.particles = gameState.particles.filter(particle => particle.update());
}

// Draw all particles
function drawParticles() {
  gameState.particles.forEach(particle => particle.draw(ctx));
}

// Initialize balls
function initBalls() {
  gameState.balls = [];
  const stormColors = ['rgba(96, 165, 250, 0.9)', 'rgba(147, 197, 253, 0.9)', 'rgba(59, 130, 246, 0.9)'];
  for (let i = 0; i < config.ballCount; i++) {
    gameState.balls.push({
      x: canvas.width / 2,
      y: 100,
      vx: 0,
      vy: 0,
      radius: config.ballRadius,
      color: stormColors[i % stormColors.length],
    });
  }
}

// Update ball physics
function updateBalls() {
  gameState.balls.forEach((ball) => {
    // Apply gravity (affected by challenges)
    ball.vy += gameState.currentGravity;

    // Update position
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Check barrier collisions
    gameState.barriers.forEach(barrier => {
      if (barrier.checkCollision(ball)) {
        barrier.bounceOff(ball);
        createParticleBurst(ball.x, ball.y, 'rgba(167, 139, 250, 0.8)');
      }
    });

    // Bounce off left/right walls
    if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
      ball.vx *= -1;
      ball.x =
        ball.x < canvas.width / 2 ? ball.radius : canvas.width - ball.radius;
      
      createParticleBurst(ball.x, ball.y, 'rgba(147, 197, 253, 0.7)');
    }

    // Bounce off top
    if (ball.y - ball.radius < 0) {
      ball.vy *= -1;
      ball.y = ball.radius;
      
      createParticleBurst(ball.x, ball.y, 'rgba(147, 197, 253, 0.7)');
    }
  });
}

// Check collisions between balls and hands
function checkCollisions() {
  gameState.balls.forEach((ball) => {
    gameState.hands.forEach((hand) => {
      const dx = ball.x - hand.x;
      const dy = ball.y - hand.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < ball.radius + config.handRadius) {
        const collisionX = hand.x + (dx / distance) * config.handRadius;
        const collisionY = hand.y + (dy / distance) * config.handRadius;
        
        createParticleBurst(collisionX, collisionY, ball.color);
        
        ball.vy = config.bounceVelocity;
        ball.vx += dx * 0.1;

        const angle = Math.atan2(dy, dx);
        const targetX =
          hand.x + Math.cos(angle) * (ball.radius + config.handRadius);
        const targetY =
          hand.y + Math.sin(angle) * (ball.radius + config.handRadius);
        ball.x = targetX;
        ball.y = targetY;
      }
    });
  });
}

// Check if any ball fell off screen
function checkGameOver() {
  return gameState.balls.some((ball) => ball.y - ball.radius > canvas.height);
}

// Update score and check for challenges
function updateScore() {
  if (gameState.startTime && !gameState.gameOver) {
    gameState.score = Math.floor((Date.now() - gameState.startTime) / 1000);
    scoreDisplay.textContent = gameState.score;
    
    // Check if new high score
    if (gameState.score > gameState.highScore) {
      gameState.isNewHighScore = true;
      gameState.highScore = gameState.score;
      highScoreDisplay.textContent = gameState.highScore;
      highScoreDisplay.classList.add('beating-record');
    }
    
    // Check if it's time for a new challenge
    if (gameState.score > 0 && gameState.score % config.challengeInterval === 0 && 
        gameState.score !== gameState.lastChallengeTime) {
      gameState.lastChallengeTime = gameState.score;
      addChallenge();
    }
  }
}

// Draw challenge notification
function drawNotification() {
  if (gameState.notificationTimer > 0) {
    gameState.notificationTimer -= 1/60;
    
    const alpha = Math.min(gameState.notificationTimer, 1);
    
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(canvas.width / 2 - 150, 80, 300, 60);
    
    // Border with glow
    ctx.shadowColor = 'rgba(147, 197, 253, 0.8)';
    ctx.shadowBlur = 15;
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.8)';
    ctx.lineWidth = 3;
    ctx.strokeRect(canvas.width / 2 - 150, 80, 300, 60);
    ctx.shadowBlur = 0;
    
    // Text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'bold 22px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
    ctx.shadowBlur = 10;
    ctx.fillText(gameState.challengeNotification, canvas.width / 2, 110);
    
    ctx.restore();
  }
}

// Render everything
function render() {
  // Draw video feed
  const webcam = document.getElementById("webcam");
  if (webcam && webcam.readyState === webcam.HAVE_ENOUGH_DATA) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(webcam, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Draw particles
  drawParticles();

  // Draw barriers
  gameState.barriers.forEach(barrier => barrier.draw(ctx));

  // Draw balls
  gameState.balls.forEach((ball) => {
    // Outer glow (large)
    const outerGlow = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius * 2.5);
    outerGlow.addColorStop(0, ball.color.replace('0.9)', '0.4)'));
    outerGlow.addColorStop(0.5, ball.color.replace('0.9)', '0.1)'));
    outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Ball shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(ball.x, ball.y + ball.radius + 5, ball.radius * 0.8, ball.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main ball with gradient
    const ballGradient = ctx.createRadialGradient(
      ball.x - ball.radius * 0.3, 
      ball.y - ball.radius * 0.3, 
      0, 
      ball.x, 
      ball.y, 
      ball.radius
    );
    ballGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    ballGradient.addColorStop(0.3, ball.color);
    ballGradient.addColorStop(1, ball.color.replace('0.9)', '0.6)'));
    
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Electric outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Bright shine spot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(ball.x - ball.radius * 0.4, ball.y - ball.radius * 0.4, ball.radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw hand zones
  gameState.hands.forEach((hand, index) => {
    const glowGradient = ctx.createRadialGradient(hand.x, hand.y, 0, hand.x, hand.y, config.handRadius * 1.5);
    glowGradient.addColorStop(0, 'rgba(147, 197, 253, 0.4)');
    glowGradient.addColorStop(0.5, 'rgba(96, 165, 250, 0.2)');
    glowGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, config.handRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(147, 197, 253, 0.9)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, config.handRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(96, 165, 250, 0.3)";
    ctx.fill();

    // Inner bright ring
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, config.handRadius * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(147, 197, 253, 1)";
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "bold 14px Inter";
    ctx.textAlign = "center";
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(`Hand ${index + 1}`, hand.x, hand.y - config.handRadius - 10);
    ctx.shadowBlur = 0;
  });

  // Draw challenge notification
  drawNotification();

  // Draw countdown
  if (gameState.isCountingDown) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#93c5fd";
    ctx.font = "bold 72px Inter";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
    ctx.shadowBlur = 20;
    ctx.fillText(
      Math.ceil(gameState.countdown),
      canvas.width / 2,
      canvas.height / 2,
    );

    ctx.font = "bold 24px Inter";
    ctx.fillStyle = "#94a3b8";
    ctx.shadowBlur = 10;
    ctx.fillText("The Storm Approaches...", canvas.width / 2, canvas.height / 2 + 60);
    ctx.shadowBlur = 0;
  }
}

// Main game loop
function gameLoop() {
  if (gameState.gameOver) return;

  if (gameState.isCountingDown) {
    gameState.countdown -= 1 / 60;

    if (gameState.countdown <= 0) {
      gameState.isCountingDown = false;
      gameState.startTime = Date.now();
    }
  } else {
    updateBalls();
    checkCollisions();
    updateParticles();
    updateScore();

    if (checkGameOver()) {
      endGame();
      return;
    }
  }

  render();
  gameState.animationId = requestAnimationFrame(gameLoop);
}

// Start game
async function startGame() {
  gameState.gameOver = false;
  gameState.startTime = null;
  gameState.score = 0;
  gameState.hands = [];
  gameState.particles = [];
  gameState.barriers = [];
  gameState.countdown = config.countdownTime;
  gameState.isCountingDown = true;
  gameState.isNewHighScore = false;
  gameState.lastChallengeTime = 0;
  gameState.activeChallenges = [];
  gameState.currentGravity = config.gravity;
  gameState.challengeNotification = null;
  gameState.notificationTimer = 0;
  
  highScoreDisplay.classList.remove('beating-record');

  initBalls();

  if (!window.handTrackingInitialized) {
    loadingOverlay.classList.remove("hidden");
    loadingStatus.textContent = "Requesting camera access...";

    const webcam = document.getElementById("webcam");
    loadingStatus.textContent = "Loading MediaPipe Hands model...";

    const success = await window.handTracking.setupHandTracking(
      webcam,
      function receiveHands(hands) {
        gameState.hands = hands;
      },
    );

    loadingOverlay.classList.add("hidden");

    if (!success) {
      endGame();
      overlayMessage.textContent = "Camera access required to play!";
      return;
    }

    window.handTracking.startDetection();
    window.handTrackingInitialized = true;
  }
  overlay.classList.add("hidden");
  gameLoop();
}

// End game
async function endGame() {
  gameState.gameOver = true;
  cancelAnimationFrame(gameState.animationId);

  if (gameState.isNewHighScore) {
    await saveHighScore(gameState.highScore);
  }

  let emoji, message, extraMessage;
  
  if (gameState.isNewHighScore) {
    emoji = "🏆";
    message = "NEW HIGH SCORE!";
    extraMessage = `You survived ${gameState.score} seconds!`;
  } else if (gameState.score > 30) {
    emoji = "🎉";
    message = "Amazing!";
    extraMessage = `You survived ${gameState.score} seconds`;
  } else if (gameState.score > 15) {
    emoji = "👍";
    message = "Great Job!";
    extraMessage = `You survived ${gameState.score} seconds`;
  } else {
    emoji = "💪";
    message = "Game Over!";
    extraMessage = `You survived ${gameState.score} seconds`;
  }

  overlayMessage.innerHTML = `
    <div style="font-size: 3rem; margin-bottom: 0.5rem;">${emoji}</div>
    <div style="font-size: 2rem; margin-bottom: 0.5rem;">${message}</div>
    <div style="font-size: 1.2rem; color: #666; font-family: 'Poppins', sans-serif; font-weight: 600;">
      ${extraMessage}
    </div>
    ${gameState.highScore > 0 ? `
      <div style="font-size: 1rem; color: #999; margin-top: 0.5rem;">
        High Score: ${gameState.highScore}s
      </div>
    ` : ''}
  `;
  
  startButton.textContent = "Play Again";
  overlay.classList.remove("hidden");
}

// Event listeners
startButton.addEventListener("click", startGame);

// Check if TensorFlow.js is loaded
function checkTensorFlowLoaded() {
  if (typeof tf !== "undefined" && typeof handPoseDetection !== "undefined") {
    loadingOverlay.classList.add("hidden");
  } else {
    setTimeout(checkTensorFlowLoaded, 100);
  }
}

// Start checking once DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", async () => {
    checkTensorFlowLoaded();
    await loadHighScore();
  });
} else {
  checkTensorFlowLoaded();
  loadHighScore();
}

// Initial render
render();