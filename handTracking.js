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
    // Request webcam access using getUserMedia
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
    });
    // TODO: Step 3b - Request Webcam Access
    // Connect the stream to the video element:
    // Connect the stream to the video element
    video.srcObject = stream;
    await video.play();
    // TODO: Step 4a - Load MediaPipe Hands Model
    // Configure and load the model:
    // Load MediaPipe Hands model
    const model = window.handPoseDetection.SupportedModels.MediaPipeHands;
    const detectorConfig = {
      runtime: "mediapipe",
      solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
      maxHands: 2,
      modelType: "full",
    };

    // TODO: Step 4b - Load MediaPipe Hands Model
    // Create the detector:
    // Create the detector
    detector = await window.handPoseDetection.createDetector(model, detectorConfig);

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
    // Run hand detection on current video frame
    const hands = await detector.estimateHands(video);
    // TODO: Step 6a - Transform Hand Landmarks to Coordinates
    // Transform hand landmarks to canvas coordinates:
    // Transform hand landmarks to canvas coordinates
    const handPositions = hands.map((hand) => {
      // Get palm center (average of wrist and thumb 4 points)
      const palmBase = [0, 5, 9, 13, 17].map((i) => hand.keypoints[i]);
      const avgX = palmBase.reduce((sum, kp) => sum + kp.x, 0) / palmBase.length;
      const avgY = palmBase.reduce((sum, kp) => sum + kp.y, 0) / palmBase.length;

      return {
        x: 640 - avgX, // Mirror x coordinate; 640 is our video resolution width dimension when we initialize the video feed
        y: avgY,
      };
    });
    // TODO: Step 6b - Transform Hand Landmarks to Coordinates
    // Call sendHandsCallback with hand positions:
      // Call sendHandsCallback with new hand positions
    if (sendHandsCallback) {
      sendHandsCallback(handPositions);
    }
    
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
