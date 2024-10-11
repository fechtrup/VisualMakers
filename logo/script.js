// UI Element References
const rotateX = document.getElementById('rotateX');
const rotateY = document.getElementById('rotateY');
const rotateZ = document.getElementById('rotateZ');

const rotateXNum = document.getElementById('rotateXNum');
const rotateYNum = document.getElementById('rotateYNum');
const rotateZNum = document.getElementById('rotateZNum');

const container = document.getElementById('animationContainer');
const playButton = document.getElementById('playButton');
const downloadButton = document.getElementById('downloadButton');

const timeline = document.getElementById('timeline');
const timelinePointer = document.getElementById('timelinePointer');
const timelineLabels = document.getElementById('timelineLabels');

const addKeypointX = document.getElementById('addKeypointX');
const addKeypointY = document.getElementById('addKeypointY');
const addKeypointZ = document.getElementById('addKeypointZ');

const easingPreset = document.getElementById('easingPreset');
const easingCurveCanvas = document.getElementById('easingCurveCanvas');
const easingEditorContainer = document.getElementById('easingEditorContainer');
const easingHint = document.getElementById('easingHint');
const ctx = easingCurveCanvas.getContext('2d');

// Timeline Configuration
let timelineDuration = 10;
let isDragging = false;

// Keypoints Data Structures
let keypoints = {
  x: [],
  y: [],
  z: []
};

let isAnimating = false; 
let animationFrameId = null; 
let keypointIdCounter = 0; 

// Easing Functions
const easingFunctions = {
  'linear': function(t) { return t; },
  'ease-in': function(t) { return t * t; },
  'ease-out': function(t) { return t * (2 - t); },
  'ease-in-out': function(t) {
    return t < 0.5 ? (2 * t * t) : (-1 + (4 - 2 * t) * t);
  },
};

// Transformation Functions
function updateTransform(rotation) {
  container.style.transform = `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`;
}

function getCurrentRotation() {
  return {
    x: parseInt(rotateX.value),
    y: parseInt(rotateY.value),
    z: parseInt(rotateZ.value)
  };
}

function interpolate(a, b, t, easing) {
  let easedT;
  if (Array.isArray(easing)) {
    const [p1, p2] = easing;
    easedT = cubicBezier(t, 0, p1.x, p2.x, 1);
    const bezierY = cubicBezier(easedT, 0, p1.y, p2.y, 1);
    easedT = bezierY;
  } else {
    const easeFunc = easingFunctions[easing] || easingFunctions['linear'];
    easedT = easeFunc(t);
  }
  return a + (b - a) * easedT;
}

function getRotationAtTime(time) {
  const rotation = { x: 0, y: 0, z: 0 };

  ['x', 'y', 'z'].forEach(axis => {
    if (keypoints[axis].length === 0) {
      rotation[axis] = 0;
      return;
    }

    const sortedKeypoints = keypoints[axis].slice().sort((a, b) => a.time - b.time);

    if (time <= sortedKeypoints[0].time) {
      rotation[axis] = sortedKeypoints[0].value;
      return;
    }

    if (time >= sortedKeypoints[sortedKeypoints.length - 1].time) {
      rotation[axis] = sortedKeypoints[sortedKeypoints.length - 1].value;
      return;
    }

    for (let i = 0; i < sortedKeypoints.length - 1; i++) {
      const currentKp = sortedKeypoints[i];
      const nextKp = sortedKeypoints[i + 1];
      if (time >= currentKp.time && time <= nextKp.time) {
        const t = (time - currentKp.time) / (nextKp.time - currentKp.time);

        let easing = nextKp.easing || 'linear';
        if (nextKp.easingFunction) {
          easing = nextKp.easingFunction;
        }

        rotation[axis] = interpolate(currentKp.value, nextKp.value, t, easing);
        return;
      }
    }
  });

  return rotation;
}

function updateControls(time) {
  const rotation = getRotationAtTime(time);
  rotateX.value = rotation.x;
  rotateY.value = rotation.y;
  rotateZ.value = rotation.z;

  rotateXNum.value = rotation.x;
  rotateYNum.value = rotation.y;
  rotateZNum.value = rotation.z;

  updateTransform(rotation);
}

// Event Listeners for Rotation Controls (X, Y, Z)
// X-axis
rotateX.addEventListener('input', () => {
  rotateXNum.value = rotateX.value;
  if (!isAnimating) {
    updateTransform(getCurrentRotation());
  }
});

rotateXNum.addEventListener('input', () => {
  rotateX.value = rotateXNum.value;
  if (!isAnimating) {
    updateTransform(getCurrentRotation());
  }
});

rotateXNum.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    rotateX.value = rotateXNum.value;
    if (!isAnimating) {
      updateTransform(getCurrentRotation());
    }
    addKeypoint('x');
  }
});

// Y-axis
rotateY.addEventListener('input', () => {
  rotateYNum.value = rotateY.value;
  if (!isAnimating) {
    updateTransform(getCurrentRotation());
  }
});

rotateYNum.addEventListener('input', () => {
  rotateY.value = rotateYNum.value;
  if (!isAnimating) {
    updateTransform(getCurrentRotation());
  }
});

rotateYNum.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    rotateY.value = rotateYNum.value;
    if (!isAnimating) {
      updateTransform(getCurrentRotation());
    }
    addKeypoint('y');
  }
});

// Z-axis
rotateZ.addEventListener('input', () => {
  rotateZNum.value = rotateZ.value;
  if (!isAnimating) {
    updateTransform(getCurrentRotation());
  }
});

rotateZNum.addEventListener('input', () => {
  rotateZ.value = rotateZNum.value;
  if (!isAnimating) {
    updateTransform(getCurrentRotation());
  }
});

rotateZNum.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    rotateZ.value = rotateZNum.value;
    if (!isAnimating) {
      updateTransform(getCurrentRotation());
    }
    addKeypoint('z');
  }
});

// Keypoint Functions
function addKeypoint(axis) {
  const pointerPosition = parseFloat(timelinePointer.style.left) / timeline.offsetWidth * timelineDuration;

  const snappedTime = Math.round(pointerPosition / 0.2) * 0.2;

  const currentRotation = getCurrentRotation();
  let value = currentRotation[axis];

  const keypoint = {
    id: `kp-${keypointIdCounter++}`,
    time: parseFloat(snappedTime.toFixed(1)),
    value: value,
    easing: 'linear',
    easingFunction: null
  };

  keypoints[axis].push(keypoint);
  keypoints[axis].sort((a, b) => a.time - b.time);

  renderKeypoints(axis);
  updateTimelineDuration(false);
}

addKeypointX.addEventListener('click', () => addKeypoint('x'));
addKeypointY.addEventListener('click', () => addKeypoint('y'));
addKeypointZ.addEventListener('click', () => addKeypoint('z'));

function deleteKeypoint(axis, id) {
  keypoints[axis] = keypoints[axis].filter(kp => kp.id !== id);
  renderKeypoints(axis);
  updateTimelineDuration();
  if (selectedKeypoint && selectedKeypoint.id === id) {
    selectedKeypoint = null;
    updateSelectedKeypointUI();
    hideEasingEditor();
  }
}

function getKeypointById(axis, id) {
  return keypoints[axis].find(kp => kp.id === id);
}

// Timeline Functions
function renderKeypoints(axis) {
  const existingMarkers = document.querySelectorAll(`.keypoint-marker-${axis}`);
  existingMarkers.forEach(marker => marker.remove());

  const existingLines = document.querySelectorAll(`.keypoint-line-${axis}`);
  existingLines.forEach(line => line.remove());

  const axisColor = {
    'x': '#0053C4',
    'y': '#FF661A',
    'z': '#FFC812'
  };

  const sortedKeypoints = keypoints[axis].slice().sort((a, b) => a.time - b.time);

  for (let i = 0; i < sortedKeypoints.length; i++) {
    const kp = sortedKeypoints[i];

    // Create keypoint marker
    const marker = document.createElement('div');
    marker.classList.add('keypoint-marker', `keypoint-marker-${axis}`, `keypoint-${axis}`);
    marker.setAttribute('data-id', kp.id);

    const positionPercent = (kp.time / timelineDuration) * 100;
    marker.style.left = `calc(${positionPercent}% )`;

    // Add delete button
    const deleteBtn = document.createElement('div');
    deleteBtn.classList.add('delete-button');
    deleteBtn.textContent = '+';
    marker.appendChild(deleteBtn);

    // Event listeners
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteKeypoint(axis, kp.id);
    });

    marker.addEventListener('click', (e) => {
      if (e.target === deleteBtn) return;
      selectKeypoint(axis, kp.id);
    });

    marker.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target === deleteBtn) return;
      startDrag(e, axis, kp.id);
    });

    marker.title = `Easing: ${kp.easing}`;

    timeline.appendChild(marker);

    // Draw line to next keypoint
    if (i < sortedKeypoints.length - 1) {
      const nextKp = sortedKeypoints[i + 1];
      const line = document.createElement('div');
      line.classList.add('keypoint-line', `keypoint-line-${axis}`);

      const startPercent = (kp.time / timelineDuration) * 100;
      const endPercent = (nextKp.time / timelineDuration) * 100;

      line.style.left = `calc(${startPercent}% )`;
      line.style.width = `calc(${endPercent - startPercent}% )`;

      const lineTopPositions = {
        'x': '20px',
        'y': '50px',
        'z': '80px'
      };
      line.style.top = lineTopPositions[axis];
      line.style.height = '0';

      const easing = nextKp.easing || 'linear';
      let borderStyle = 'solid';
      if (easing === 'ease-in') {
        borderStyle = 'dotted';
      } else if (easing === 'ease-out') {
        borderStyle = 'dashed';
      } else if (easing === 'ease-in-out') {
        borderStyle = 'double';
      }

      line.style.borderTop = `2px ${borderStyle} ${axisColor[axis]}`;

      timeline.appendChild(line);
    }
  }

  updateSelectedKeypointUI();
}

function addTimelineLabels() {
  timelineLabels.innerHTML = '';
  for (let t = 0; t <= timelineDuration; t += 0.2) {
    const label = document.createElement('div');
    label.classList.add('timeline-label');
    label.textContent = t.toFixed(1);
    const positionPercent = (t / timelineDuration) * 100;
    label.style.left = `calc(${positionPercent}% )`;
    timelineLabels.appendChild(label);
  }
}

addTimelineLabels();

function updateTimelineDuration(shouldResetPointer = true) {
  let maxTime = timelineDuration;
  ['x', 'y', 'z'].forEach(axis => {
    keypoints[axis].forEach(kp => {
      if (kp.time > maxTime) {
        maxTime = kp.time;
      }
    });
  });

  maxTime = Math.max(maxTime, 2);
  timelineDuration = maxTime;

  if (shouldResetPointer && !isDragging && !isAnimating) {
    timelinePointer.style.left = '0px';
    updateControls(0);
  }

  addTimelineLabels();

  ['x', 'y', 'z'].forEach(axis => {
    const markers = document.querySelectorAll(`.keypoint-marker-${axis}`);
    markers.forEach(marker => {
      const kpId = marker.getAttribute('data-id');
      const kp = keypoints[axis].find(k => k.id === kpId);
      if (kp) {
        const positionPercent = (kp.time / timelineDuration) * 100;
        marker.style.left = `calc(${positionPercent}% )`;
      }
    });
  });
}

// Timeline Pointer Movement
timelinePointer.style.left = '0px';

timeline.addEventListener('mousedown', (e) => {
  isDragging = true;
  movePointer(e);
});

document.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    let currentTime = (parseFloat(timelinePointer.style.left) / timeline.offsetWidth) * timelineDuration;

    if (currentTime < 0.1) {
      currentTime = 0;
    } else {
      currentTime = Math.round(currentTime / 0.2) * 0.2;
    }

    const x = (currentTime / timelineDuration) * timeline.offsetWidth;
    timelinePointer.style.left = `${x}px`;

    updateControls(currentTime);
  }
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    movePointer(e);
  }
});

function movePointer(e) {
  const rect = timeline.getBoundingClientRect();
  let x = e.clientX - rect.left;
  x = Math.max(0, Math.min(x, rect.width));

  let currentTime = (x / rect.width) * timelineDuration;

  if (currentTime < 0.1) {
    currentTime = 0;
  } else {
    currentTime = Math.round(currentTime / 0.2) * 0.2;
  }

  x = (currentTime / timelineDuration) * rect.width;

  timelinePointer.style.left = `${x}px`;

  updateControls(currentTime);
}

// Animation Functions
playButton.addEventListener('click', () => {
  if (isAnimating) {
    stopAnimation(true);
  } else {
    const totalKeypoints = keypoints.x.length + keypoints.y.length + keypoints.z.length;
    if (totalKeypoints < 2) {
      console.warn('Add at least two keypoints to start the animation.');
      return;
    }
    timelinePointer.style.left = '0px';
    updateControls(0);
    playAnimation();
  }
});

function playAnimation() {
  isAnimating = true;
  playButton.classList.add('red');
  playButton.innerHTML = '<img src="stop.svg" alt="Stop">';

  const lastKeyframeTime = getLastKeyframeTime();
  const animationDuration = lastKeyframeTime;

  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = (currentTime - startTime) / 1000;

    if (elapsed >= animationDuration) {
      const finalRotation = getRotationAtTime(animationDuration);
      updateTransform(finalRotation);
      updateTimelinePointer(animationDuration);

      stopAnimation(false);
      return;
    }

    const currentRotation = getRotationAtTime(elapsed);

    updateTransform(currentRotation);

    rotateX.value = currentRotation.x;
    rotateY.value = currentRotation.y;
    rotateZ.value = currentRotation.z;

    rotateXNum.value = currentRotation.x;
    rotateYNum.value = currentRotation.y;
    rotateZNum.value = currentRotation.z;

    updateTimelinePointer(elapsed);

    animationFrameId = requestAnimationFrame(animate);
  }

  animationFrameId = requestAnimationFrame(animate);
}

function stopAnimation(resetToZero = true) {
  isAnimating = false;
  playButton.classList.remove('red');
  playButton.innerHTML = '<img src="start.svg" alt="Start">';
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  if (resetToZero) {
    timelinePointer.style.left = '0px';
    updateControls(0);
  }
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (isAnimating) {
      stopAnimation(true);
    } else {
      const totalKeypoints = keypoints.x.length + keypoints.y.length + keypoints.z.length;
      if (totalKeypoints < 2) {
        console.warn('Add at least two keypoints to start the animation.');
        return;
      }
      timelinePointer.style.left = '0px';
      updateControls(0);
      playAnimation();
    }
  }
});

function updateTimelinePointer(elapsed) {
  const positionPercent = (elapsed / timelineDuration) * 100;
  timelinePointer.style.left = `calc(${positionPercent}% )`;
}

function getLastKeyframeTime() {
  let maxTime = 0;
  ['x', 'y', 'z'].forEach(axis => {
    keypoints[axis].forEach(kp => {
      if (kp.time > maxTime) {
        maxTime = kp.time;
      }
    });
  });
  return maxTime;
}

function handlePointerMoveOutsideAnimation() {
  if (!isAnimating) {
    let currentTime = (parseFloat(timelinePointer.style.left) / timeline.offsetWidth) * timelineDuration;

    if (currentTime < 0.1) {
      currentTime = 0;
    } else {
      currentTime = Math.round(currentTime / 0.2) * 0.2;
    }

    updateControls(currentTime);
  }
}

timelinePointer.addEventListener('mouseup', handlePointerMoveOutsideAnimation);

// Initial Transformation
updateTransform({ x: 0, y: 0, z: 0 });

// Drag-and-Drop Functions for Keypoints
let draggingKeypoint = null;
let dragAxis = null;
let dragId = null;

function startDrag(e, axis, id) {
  draggingKeypoint = e.target;
  dragAxis = axis;
  dragId = id;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
}

function onDrag(e) {
  if (!draggingKeypoint) return;

  const rect = timeline.getBoundingClientRect();
  let x = e.clientX - rect.left;
  x = Math.max(0, Math.min(x, rect.width));

  let newTime = (x / rect.width) * timelineDuration;

  if (newTime < 0.1) {
    newTime = 0;
  } else {
    newTime = Math.round(newTime / 0.2) * 0.2;
  }

  x = (newTime / timelineDuration) * rect.width;

  draggingKeypoint.style.left = `${(x / rect.width) * 100}%`;

  const kpIndex = keypoints[dragAxis].findIndex(kp => kp.id === dragId);
  if (kpIndex !== -1) {
    keypoints[dragAxis][kpIndex].time = parseFloat(newTime.toFixed(1));
    keypoints[dragAxis].sort((a, b) => a.time - b.time);
    renderKeypoints(dragAxis);
    updateTimelineDuration(false);
  }
}

function stopDrag() {
  draggingKeypoint = null;
  dragAxis = null;
  dragId = null;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

// Keypoint Selection
let selectedKeypoint = null;

function selectKeypoint(axis, id) {
  selectedKeypoint = { axis, id };
  updateSelectedKeypointUI();
}

function updateSelectedKeypointUI() {
  const allMarkers = document.querySelectorAll('.keypoint-marker');
  allMarkers.forEach(marker => marker.classList.remove('selected-keypoint'));

  if (selectedKeypoint) {
    const { axis, id } = selectedKeypoint;
    const marker = document.querySelector(`.keypoint-marker-${axis}[data-id='${id}']`);
    if (marker) {
      marker.classList.add('selected-keypoint');
      showEasingCurveEditor();
    }
  } else {
    hideEasingEditor();
  }
}

// Easing Curve Editor
easingPreset.addEventListener('change', () => {
  if (selectedKeypoint) {
    const kp = getKeypointById(selectedKeypoint.axis, selectedKeypoint.id);
    if (kp) {
      kp.easing = easingPreset.value;
      kp.easingFunction = null;
      updateEasingCurveEditor(kp.easing);
      renderKeypoints(selectedKeypoint.axis);
    }
  }
});

let controlPoints = [{ x: 0.25, y: 0.25 }, { x: 0.75, y: 0.75 }];

function showEasingCurveEditor() {
  const kp = getKeypointById(selectedKeypoint.axis, selectedKeypoint.id);
  if (kp) {
    easingPreset.value = kp.easing || 'linear';
    updateEasingCurveEditor(kp.easing);
    easingHint.style.display = 'none';
    easingCurveCanvas.style.display = 'block';
  }
}

function hideEasingEditor() {
  easingHint.style.display = 'block';
  easingCurveCanvas.style.display = 'none';
}

function updateEasingCurveEditor(easing) {
  switch (easing) {
    case 'linear':
      controlPoints = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
      break;
    case 'ease-in':
      controlPoints = [{ x: 0.42, y: 0 }, { x: 1, y: 1 }];
      break;
    case 'ease-out':
      controlPoints = [{ x: 0, y: 0 }, { x: 0.58, y: 1 }];
      break;
    case 'ease-in-out':
      controlPoints = [{ x: 0.42, y: 0 }, { x: 0.58, y: 1 }];
      break;
    default:
      controlPoints = [{ x: 0.25, y: 0.25 }, { x: 0.75, y: 0.75 }];
      break;
  }

  if (selectedKeypoint) {
    const kp = getKeypointById(selectedKeypoint.axis, selectedKeypoint.id);
    if (kp && kp.easingFunction) {
      controlPoints = kp.easingFunction.slice();
    }
  }

  drawEasingCurve();
}

function drawEasingCurve() {
  const padding = 10;
  const canvasWidth = easingCurveCanvas.width - padding * 2;
  const canvasHeight = easingCurveCanvas.height - padding * 2;

  ctx.clearRect(0, 0, easingCurveCanvas.width, easingCurveCanvas.height);
  ctx.strokeStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(padding, canvasHeight + padding);

  for (let t = 0; t <= 1; t += 0.01) {
    const x = cubicBezier(t, 0, controlPoints[0].x, controlPoints[1].x, 1) * canvasWidth + padding;
    const y = (1 - cubicBezier(t, 0, controlPoints[0].y, controlPoints[1].y, 1)) * canvasHeight + padding;
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.fillStyle = 'red';
  controlPoints.forEach(point => {
    ctx.beginPath();
    const x = point.x * canvasWidth + padding;
    const y = (1 - point.y) * canvasHeight + padding;
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
  });
}

function cubicBezier(t, p0, p1, p2, p3) {
  return (
    Math.pow(1 - t, 3) * p0 +
    3 * Math.pow(1 - t, 2) * t * p1 +
    3 * (1 - t) * Math.pow(t, 2) * p2 +
    Math.pow(t, 3) * p3
  );
}

// Drag & Drop for Control Points
let draggingPoint = null;

easingCurveCanvas.addEventListener('mousedown', (e) => {
  const rect = easingCurveCanvas.getBoundingClientRect();
  const padding = 10;
  const canvasWidth = easingCurveCanvas.width - padding * 2;
  const canvasHeight = easingCurveCanvas.height - padding * 2;

  const mouseX = e.clientX - rect.left - padding;
  const mouseY = e.clientY - rect.top - padding;

  controlPoints.forEach((point, index) => {
    const x = point.x * canvasWidth;
    const y = (1 - point.y) * canvasHeight;
    if (Math.hypot(mouseX - x, mouseY - y) < 10) {
      draggingPoint = index;
    }
  });
});

document.addEventListener('mousemove', (e) => {
  if (draggingPoint !== null) {
    const rect = easingCurveCanvas.getBoundingClientRect();
    const padding = 10;
    const canvasWidth = easingCurveCanvas.width - padding * 2;
    const canvasHeight = easingCurveCanvas.height - padding * 2;

    let x = (e.clientX - rect.left - padding) / canvasWidth;
    let y = 1 - (e.clientY - rect.top - padding) / canvasHeight;

    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    controlPoints[draggingPoint] = { x, y };
    drawEasingCurve();

    if (selectedKeypoint) {
      const kp = getKeypointById(selectedKeypoint.axis, selectedKeypoint.id);
      if (kp) {
        kp.easingFunction = controlPoints.slice();
        kp.easing = 'custom';
        easingPreset.value = 'custom';
        renderKeypoints(selectedKeypoint.axis);
      }
    }
  }
});

document.addEventListener('mouseup', () => {
  draggingPoint = null;
});

// Download Functionality
downloadButton.addEventListener('click', () => {
  downloadAnimation();
});

function downloadAnimation() {
  const animationHTML = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Animation</title>
  <style>
    ${getAnimationCSS()}
  </style>
</head>
<body>
  <div class="animation-container">
    <div class="cursor">
      <img src="Cursor.svg" alt="Cursor" width="125%" height="125%">
    </div>
    <div class="cursorShadow">
      <img src="Cursor.svg" alt="Cursor" width="125%" height="125%">
    </div>
    <div class="square front"></div>
    <div class="square middle"></div>
    <div class="square back"></div>
  </div>
</body>
</html>
  `;

  const blob = new Blob([animationHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'animation.html';
  link.click();

  URL.revokeObjectURL(url);
}

function getAnimationCSS() {
  const cssAnimation = generateCSSAnimation();

  return `
body {
  margin: 0;
  background-color: #ffffff;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.animation-container {
  position: relative;
  width: 400px;
  height: 400px;
  transform-style: preserve-3d;
  overflow: visible;
  will-change: transform;
}

/* Animations */
${cssAnimation}

/* Other CSS rules */
.square {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 30px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) translateZ(0px);
  background: linear-gradient(135deg, var(--color-start), var(--color-end));
}

.front {
  --color-start: #3CAEFF;
  --color-end: #0053C4;
  mix-blend-mode: hard-light;
  transform: translate(-50%, -50%) translateZ(120px);
}

.middle {
  --color-start: #FFD84D;
  --color-end: #FF661A;
  mix-blend-mode: multiply;
  transform: translate(-50%, -50%) translateZ(60px);
}

.back {
  --color-start: #FFF04C;
  --color-end: #FFC812;
  mix-blend-mode: normal;
  transform: translate(-50%, -50%) translateZ(0px);
}

.cursor {
  position: absolute;
  width: 61.5px;
  height: 67px;
  top: 45%;
  left: 45%;
  transform: rotate(315deg) translateZ(140px);
}

.cursorShadow {
  position: absolute;
  width: 61.5px;
  height: 67px;
  top: 45%;
  left: 45%;
  transform: rotate(315deg) translateZ(121px);
}

.cursorShadow img {
  width: 100%;
  height: 100%;
  filter: brightness(0) saturate(100%) blur(4px);
  opacity: 0.1;
}
`;
}

function generateCSSAnimation() {
  const animationDuration = getLastKeyframeTime();
  let keyframesCSS = '';
  let keypointTimes = new Set();

  ['x', 'y', 'z'].forEach(axis => {
    keypoints[axis].forEach(kp => {
      keypointTimes.add(kp.time);
    });
  });
  keypointTimes = Array.from(keypointTimes).sort((a, b) => a - b);

  keyframesCSS += `@keyframes rotateAnimation {\n`;

  keypointTimes.forEach(time => {
    const percentage = (time / animationDuration) * 100;
    const rotation = getRotationAtTime(time);

    keyframesCSS += `${percentage}% {\n`;
    keyframesCSS += `transform: rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg);\n`;
    keyframesCSS += `}\n`;
  });

  keyframesCSS += `}\n`;

  const animationCSS = `
.animation-container {
  animation: rotateAnimation ${animationDuration}s linear forwards;
}
`;

  return keyframesCSS + animationCSS;
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  hideEasingEditor();
});
