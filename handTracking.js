// Hand tracking state
let detector = null;
let video = null;
let isDetecting = false;
let sendHandsCallback = null;

/**
 * Setup hand tracking with MediaPipe Hands
 * @param {HTMLVideoElement} videoElement - Video element for webcam
 * @param {Function} sendHands - Called with hand positions [{x, y}]
 */
async function setupHandTracking(videoElement, sendHands) {
  video = videoElement;
  sendHandsCallback = sendHands;

  try {
    // TODO: Step 3a - Request Webcam Access
    // Request webcam access using getUserMedia:

    // TODO: Step 3b - Request Webcam Access
    // Connect the stream to the video element:

    // TODO: Step 4a - Load MediaPipe Hands Model
    // Configure and load the model:

    // TODO: Step 4b - Load MediaPipe Hands Model
    // Create the detector:

    console.log("Hand tracking initialized successfully");
    return true;
  } catch (error) {
    console.error("Error setting up hand tracking:", error);
    alert(
      "Could not access webcam. Please ensure you have granted camera permissions.",
    );
    return false;
  }
}

/**
 * Start hand detection loop
 */
function startDetection() {
  if (!detector || !video) {
    console.error("Hand tracking not initialized");
    return;
  }

  isDetecting = true;
  detectHands();
}

/**
 * Stop hand detection loop
 */
function stopDetection() {
  isDetecting = false;
}

/**
 * Detect hands and call sendHandsCallback with positions
 */
async function detectHands() {
  if (!isDetecting) return;

  try {
    // TODO: Step 5 - Detect Hands in Real-Time
    // Run hand detection on current video frame:

    // TODO: Step 6a - Transform Hand Landmarks to Coordinates
    // Transform hand landmarks to canvas coordinates:

    // TODO: Step 6b - Transform Hand Landmarks to Coordinates
    // Call sendHandsCallback with hand positions:

  } catch (error) {
    console.error("Error detecting hands:", error);
  }

  // Continue detection loop (~30 FPS)
  setTimeout(() => detectHands(), 33);
}

// Export functions (if using modules, otherwise they're global)
window.handTracking = {
  setupHandTracking,
  startDetection,
  stopDetection,
};
