// Referenzen zu den UI-Elementen
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

// Timeline-Konfiguration
let timelineDuration = 10; // Sekunden, wird dynamisch angepasst
let isDragging = false;

// Keypoints speichern für jede Achse
let keypoints = {
  x: [],
  y: [],
  z: []
};

// Flag zur Vermeidung von Konflikten zwischen Echtzeit-Updates und Animation
let isAnimating = false;

// Variable zur Speicherung des aktuellen Animation-Frame-IDs
let animationFrameId = null;

// Zähler für eindeutige Keypoint IDs
let keypointIdCounter = 0;

// Easing-Funktionen
const easingFunctions = {
  'linear': function(t) { return t; },
  'ease-in': function(t) { return t * t; },
  'ease-out': function(t) { return t * (2 - t); },
  'ease-in-out': function(t) {
    return t < 0.5 ? (2 * t * t) : (-1 + (4 - 2 * t) * t);
  },
  // Weitere Easing-Funktionen können hier hinzugefügt werden
};

// Funktion zum Aktualisieren der Transformation basierend auf den aktuellen Werten
function updateTransform(rotation) {
  container.style.transform = `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`;
}

// Funktion zum Aktualisieren der aktuellen Rotation
function getCurrentRotation() {
  return {
    x: parseInt(rotateX.value),
    y: parseInt(rotateY.value),
    z: parseInt(rotateZ.value)
  };
}

// Funktion zur Interpolation zwischen zwei Keyframes
function interpolate(a, b, t, easing) {
  let easedT;
  if (Array.isArray(easing)) {
    // Benutzerdefinierte Bezier-Kurve verwenden
    const [p1, p2] = easing;
    easedT = cubicBezier(t, 0, p1.x, p2.x, 1); // Bezier-Kurve auf t anwenden
    const bezierY = cubicBezier(easedT, 0, p1.y, p2.y, 1); // Y-Wert berechnen
    easedT = bezierY;
  } else {
    const easeFunc = easingFunctions[easing] || easingFunctions['linear'];
    easedT = easeFunc(t);
  }
  return a + (b - a) * easedT;
}

// Funktion zum Berechnen der Rotationswerte zu einer bestimmten Zeit
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

        // Verwende die Easing-Funktion des Segments zwischen currentKp und nextKp
        let easing = nextKp.easing || 'linear';
        if (nextKp.easingFunction) {
          easing = nextKp.easingFunction; // Benutzerdefinierte Kurve verwenden
        }

        rotation[axis] = interpolate(currentKp.value, nextKp.value, t, easing);
        return;
      }
    }
  });

  return rotation;
}

// Funktion zum Aktualisieren der Steuerungselemente basierend auf der Zeit
function updateControls(time) {
  const rotation = getRotationAtTime(time);
  rotateX.value = rotation.x;
  rotateY.value = rotation.y;
  rotateZ.value = rotation.z;

  rotateXNum.value = rotation.x;
  rotateYNum.value = rotation.y;
  rotateZNum.value = rotation.z;

  // Aktualisiere die Transformationsansicht
  updateTransform(rotation);
}

// Echtzeit-Updates und Synchronisation für X
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

// Event Listener für Enter-Taste in den numerischen Eingabefeldern
rotateXNum.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    rotateX.value = rotateXNum.value;
    if (!isAnimating) {
      updateTransform(getCurrentRotation());
    }
    addKeypoint('x');
  }
});

// Echtzeit-Updates und Synchronisation für Y
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

// Echtzeit-Updates und Synchronisation für Z
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

// Funktion zum Hinzufügen eines Keypoints
function addKeypoint(axis) {
  const pointerPosition = parseFloat(timelinePointer.style.left) / timeline.offsetWidth * timelineDuration;

  // Runde die Zeit auf das nächste 0,2-Sekunden-Intervall
  const snappedTime = Math.round(pointerPosition / 0.2) * 0.2;

  const currentRotation = getCurrentRotation();
  let value = currentRotation[axis];

  // Erstellen des Keypoints
  const keypoint = {
    id: `kp-${keypointIdCounter++}`, // Eindeutige ID
    time: parseFloat(snappedTime.toFixed(1)), // Gerundete Zeit
    value: value,
    easing: 'linear', // Standardmäßig 'linear'
    easingFunction: null // Platz für benutzerdefinierte Kurve
  };

  // Hinzufügen zum entsprechenden Keypoints-Array
  keypoints[axis].push(keypoint);
  keypoints[axis].sort((a, b) => a.time - b.time); // Sortiere nach Zeit

  renderKeypoints(axis);
  updateTimelineDuration(false); // Verhindere das Zurücksetzen des Zeigers
}

// Event Listener für die Plus-Buttons
addKeypointX.addEventListener('click', () => addKeypoint('x'));
addKeypointY.addEventListener('click', () => addKeypoint('y'));
addKeypointZ.addEventListener('click', () => addKeypoint('z'));

// Funktion zum Rendern der Keypoints auf der Timeline
function renderKeypoints(axis) {
  // Entferne vorhandene Marker und Linien für die Achse
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

    // Keypoint Marker erstellen
    const marker = document.createElement('div');
    marker.classList.add('keypoint-marker', `keypoint-marker-${axis}`, `keypoint-${axis}`);
    marker.setAttribute('data-id', kp.id);

    const positionPercent = (kp.time / timelineDuration) * 100;
    marker.style.left = `calc(${positionPercent}% )`;

    // Delete-Button hinzufügen
    const deleteBtn = document.createElement('div');
    deleteBtn.classList.add('delete-button');
    deleteBtn.textContent = '+';
    marker.appendChild(deleteBtn);

    // Event Listener für das Löschen des Keypoints
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Verhindere das Auslösen anderer Events
      deleteKeypoint(axis, kp.id);
    });

    // Event Listener für das Auswählen des Keypoints
    marker.addEventListener('click', (e) => {
      if (e.target === deleteBtn) return;
      selectKeypoint(axis, kp.id);
    });

    // Event Listener für Drag-and-Drop
    marker.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Nur linke Maustaste
      if (e.target === deleteBtn) return;
      startDrag(e, axis, kp.id);
    });

    // Easing-Funktion anzeigen
    marker.title = `Easing: ${kp.easing}`;

    timeline.appendChild(marker);

    // Linie zum nächsten Keypoint zeichnen
    // Linie zum nächsten Keypoint zeichnen
if (i < sortedKeypoints.length - 1) {
  const nextKp = sortedKeypoints[i + 1];
  const line = document.createElement('div');
  line.classList.add('keypoint-line', `keypoint-line-${axis}`);

  const startPercent = (kp.time / timelineDuration) * 100;
  const endPercent = (nextKp.time / timelineDuration) * 100;

  line.style.left = `calc(${startPercent}% )`;
  line.style.width = `calc(${endPercent - startPercent}% )`;

  // Positionieren der Linie genau auf der grauen Linie
  const lineTopPositions = {
    'x': '20px', // 20px (graue Linie) - 1px (halbe Höhe der Linie)
    'y': '50px', // 50px - 1px
    'z': '80px'  // 80px - 1px
  };
  line.style.top = lineTopPositions[axis];
  line.style.height = '0'; // Höhe auf 0 setzen

  // Unterschiedliche Striche für unterschiedliche Easings
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

// Funktion zum Löschen eines Keypoints
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

// Funktion zum Hinzufügen von Zeitlabels auf der Timeline
function addTimelineLabels() {
  // Entferne vorhandene Labels
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

// Initialisiere die Timeline-Labels
addTimelineLabels();

// Funktion zur Aktualisierung der Timeline-Dauer basierend auf den Keypoints
function updateTimelineDuration(shouldResetPointer = true) {
  let maxTime = timelineDuration;
  ['x', 'y', 'z'].forEach(axis => {
    keypoints[axis].forEach(kp => {
      if (kp.time > maxTime) {
        maxTime = kp.time;
      }
    });
  });

  // Optional: Setze eine Mindestdauer
  maxTime = Math.max(maxTime, 2); // Mindestdauer von 2 Sekunden

  timelineDuration = maxTime;

  // Aktualisiere die Timeline-Zeiger-Position falls nötig
  if (shouldResetPointer && !isDragging && !isAnimating) {
    timelinePointer.style.left = '0px';
    updateControls(0);
  }

  // Aktualisiere die Labels
  addTimelineLabels();

  // Aktualisiere die Position der Keypoints-Markierungen
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

// Timeline-Zeiger bewegen
timelinePointer.style.left = '0px';

timeline.addEventListener('mousedown', (e) => {
  isDragging = true;
  movePointer(e);
});

document.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    let currentTime = (parseFloat(timelinePointer.style.left) / timeline.offsetWidth) * timelineDuration;

    // Überprüfen, ob die Zeit nahe bei 0 ist
    if (currentTime < 0.1) {
      currentTime = 0;
    } else {
      // Runde die Zeit auf das nächste 0,2-Sekunden-Intervall
      currentTime = Math.round(currentTime / 0.2) * 0.2;
    }

    // Aktualisiere die Zeigerposition basierend auf der gerundeten Zeit
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
  x = Math.max(0, Math.min(x, rect.width)); // Begrenze innerhalb der Timeline

  // Berechne die Zeit aus der Position
  let currentTime = (x / rect.width) * timelineDuration;

  // Überprüfen, ob die Zeit nahe bei 0 ist
  if (currentTime < 0.1) {
    currentTime = 0;
  } else {
    // Runde die Zeit auf das nächste 0,2-Sekunden-Intervall
    currentTime = Math.round(currentTime / 0.2) * 0.2;
  }

  // Berechne die neue Zeigerposition aus der gerundeten Zeit
  x = (currentTime / timelineDuration) * rect.width;

  timelinePointer.style.left = `${x}px`;

  updateControls(currentTime);
}

// Play-Button Event Listener
playButton.addEventListener('click', () => {
  if (isAnimating) {
    // Animation manuell stoppen und Zeiger auf 0 zurücksetzen
    stopAnimation(true);
  } else {
    const totalKeypoints = keypoints.x.length + keypoints.y.length + keypoints.z.length;
    if (totalKeypoints < 2) {
      console.warn('Füge mindestens zwei Keypoints hinzu, um die Animation zu starten.');
      return;
    }
    // Zeiger auf 0 setzen, bevor die Animation startet
    timelinePointer.style.left = '0px';
    updateControls(0);
    playAnimation();
  }
});

// Funktion zum Abspielen der Animation basierend auf Keypoints
function playAnimation() {
  isAnimating = true; // Flag setzen
  playButton.classList.add('red');
  playButton.innerHTML = '<img src="stop.svg" alt="Stop">';

  const lastKeyframeTime = getLastKeyframeTime();
  const animationDuration = lastKeyframeTime;

  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = (currentTime - startTime) / 1000; // Sekunden

    if (elapsed >= animationDuration) {
      // Setze die letzten Werte für jede Achse
      const finalRotation = getRotationAtTime(animationDuration);
      updateTransform(finalRotation);
      updateTimelinePointer(animationDuration);

      // Animation stoppen, aber Zeiger nicht zurücksetzen
      stopAnimation(false);
      return;
    }

    // Aktuelle Werte für jede Achse berechnen
    const currentRotation = getRotationAtTime(elapsed);

    // Aktualisiere die Transformation
    updateTransform(currentRotation);

    // Aktualisiere die Steuerungselemente
    rotateX.value = currentRotation.x;
    rotateY.value = currentRotation.y;
    rotateZ.value = currentRotation.z;

    rotateXNum.value = currentRotation.x;
    rotateYNum.value = currentRotation.y;
    rotateZNum.value = currentRotation.z;

    // Aktualisiere den Zeiger
    updateTimelinePointer(elapsed);

    // Fortsetzen der Animation
    animationFrameId = requestAnimationFrame(animate);
  }

  animationFrameId = requestAnimationFrame(animate);
}

// Funktion zum Stoppen der Animation
function stopAnimation(resetToZero = true) {
  isAnimating = false; // Flag zurücksetzen
  playButton.classList.remove('red');
  playButton.innerHTML = '<img src="start.svg" alt="Start">';
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  if (resetToZero) {
    // Zeiger auf 0 setzen
    timelinePointer.style.left = '0px';
    // Steuerungselemente aktualisieren
    updateControls(0);
  }
}

// Leertaste zum Steuern der Animation
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault(); // Verhindert das Scrollen der Seite
    if (isAnimating) {
      // Animation manuell stoppen und Zeiger auf 0 zurücksetzen
      stopAnimation(true);
    } else {
      const totalKeypoints = keypoints.x.length + keypoints.y.length + keypoints.z.length;
      if (totalKeypoints < 2) {
        console.warn('Füge mindestens zwei Keypoints hinzu, um die Animation zu starten.');
        return;
      }
      // Zeiger auf 0 setzen, bevor die Animation startet
      timelinePointer.style.left = '0px';
      updateControls(0);
      playAnimation();
    }
  }
});

// Funktion zum Aktualisieren des Zeigers während der Animation
function updateTimelinePointer(elapsed) {
  const positionPercent = (elapsed / timelineDuration) * 100;
  timelinePointer.style.left = `calc(${positionPercent}% )`;
}

// Funktion zur Bestimmung der letzten Keyframe-Zeit
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

// Funktion zur Aktualisierung der Steuerungselemente beim Bewegen des Zeigers außerhalb der Animation
function handlePointerMoveOutsideAnimation() {
  if (!isAnimating) {
    let currentTime = (parseFloat(timelinePointer.style.left) / timeline.offsetWidth) * timelineDuration;

    // Überprüfen, ob die Zeit nahe bei 0 ist
    if (currentTime < 0.1) {
      currentTime = 0;
    } else {
      // Runde die Zeit auf das nächste 0,2-Sekunden-Intervall
      currentTime = Math.round(currentTime / 0.2) * 0.2;
    }

    updateControls(currentTime);
  }
}

// Event Listener für die Zeigerbewegung außerhalb der Animation
timelinePointer.addEventListener('mouseup', handlePointerMoveOutsideAnimation);

// Initiale Transformation setzen
updateTransform({ x: 0, y: 0, z: 0 });

// Funktionen für Drag-and-Drop der Keypoints
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
  x = Math.max(0, Math.min(x, rect.width)); // Begrenze innerhalb der Timeline

  // Berechne die neue Zeit aus der Position
  let newTime = (x / rect.width) * timelineDuration;

  // Überprüfen, ob die Zeit nahe bei 0 ist
  if (newTime < 0.1) {
    newTime = 0;
  } else {
    // Runde die Zeit auf das nächste 0,2-Sekunden-Intervall
    newTime = Math.round(newTime / 0.2) * 0.2;
  }

  // Berechne die neue Position aus der gerundeten Zeit
  x = (newTime / timelineDuration) * rect.width;

  // Aktualisiere die Position des Keypoints
  draggingKeypoint.style.left = `${(x / rect.width) * 100}%`;

  // Aktualisiere den Keypoint in der Datenstruktur
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

// Keypoint-Auswahl ermöglichen
let selectedKeypoint = null;

function selectKeypoint(axis, id) {
  // Speichern des ausgewählten Keypoints
  selectedKeypoint = { axis, id };

  // Aktualisieren der UI, um den ausgewählten Keypoint hervorzuheben
  updateSelectedKeypointUI();
}

function updateSelectedKeypointUI() {
  // Entfernen der Hervorhebung von allen Keypoints
  const allMarkers = document.querySelectorAll('.keypoint-marker');
  allMarkers.forEach(marker => marker.classList.remove('selected-keypoint'));

  // Hervorheben des ausgewählten Keypoint
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

// Funktion zum Abrufen eines Keypoints nach ID
function getKeypointById(axis, id) {
  return keypoints[axis].find(kp => kp.id === id);
}

// Easing-Kurveneditor
easingPreset.addEventListener('change', () => {
  if (selectedKeypoint) {
    const kp = getKeypointById(selectedKeypoint.axis, selectedKeypoint.id);
    if (kp) {
      kp.easing = easingPreset.value;
      kp.easingFunction = null; // Benutzerdefinierte Kurve zurücksetzen
      // Aktualisieren der Kurve im Editor
      updateEasingCurveEditor(kp.easing);
      renderKeypoints(selectedKeypoint.axis);
    }
  }
});

let controlPoints = [{ x: 0.25, y: 0.25 }, { x: 0.75, y: 0.75 }];

function showEasingCurveEditor() {
  const kp = getKeypointById(selectedKeypoint.axis, selectedKeypoint.id);
  if (kp) {
    // Setzen des Dropdowns auf die aktuelle Easing-Funktion
    easingPreset.value = kp.easing || 'linear';
    // Aktualisieren der Kurve
    updateEasingCurveEditor(kp.easing);
    // Hinweistext ausblenden und Canvas anzeigen
    easingHint.style.display = 'none';
    easingCurveCanvas.style.display = 'block';
    // easingPreset.disabled = false; // Entfernt, damit das Dropdown immer aktiv ist
  }
}

function hideEasingEditor() {
  // Hinweistext anzeigen und Canvas ausblenden
  easingHint.style.display = 'block';
  easingCurveCanvas.style.display = 'none';
  // easingPreset.disabled = true; // Entfernt, damit das Dropdown immer aktiv ist
}

function updateEasingCurveEditor(easing) {
  // Basierend auf der ausgewählten Easing-Funktion die Kontrollpunkte setzen
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

  // Wenn der Keypoint eine benutzerdefinierte Kurve hat
  if (selectedKeypoint) {
    const kp = getKeypointById(selectedKeypoint.axis, selectedKeypoint.id);
    if (kp && kp.easingFunction) {
      controlPoints = kp.easingFunction.slice();
    }
  }

  drawEasingCurve();
}

function drawEasingCurve() {
  const padding = 10; // Platz für die Handles
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

  // Zeichnen der Kontrollpunkte
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
  // Berechnung des Bezier-Werts für t
  return (
    Math.pow(1 - t, 3) * p0 +
    3 * Math.pow(1 - t, 2) * t * p1 +
    3 * (1 - t) * Math.pow(t, 2) * p2 +
    Math.pow(t, 3) * p3
  );
}

// Event Listener für Drag & Drop der Kontrollpunkte
let draggingPoint = null;

easingCurveCanvas.addEventListener('mousedown', (e) => {
  const rect = easingCurveCanvas.getBoundingClientRect();
  const padding = 10; // Stelle sicher, dass das Padding konsistent ist
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

    // Speichern der neuen Easing-Funktion im Keypoint
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


// Funktion zum Generieren und Downloaden des Animationscodes
downloadButton.addEventListener('click', () => {
  downloadAnimation();
});

function downloadAnimation() {
  // HTML-Code ohne UI-Elemente
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

  // Blob erstellen und Download initiieren
  const blob = new Blob([animationHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'animation.html';
  link.click();

  // URL freigeben
  URL.revokeObjectURL(url);
}

// Funktion zum Extrahieren des benötigten CSS-Codes
function getAnimationCSS() {
  // Generiere die CSS-Animationen und Keyframes
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

/* Animationen */
${cssAnimation}

/* Restliche CSS-Regeln */
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

// Funktion zum Generieren der CSS-Animation basierend auf den Keypoints
function generateCSSAnimation() {
  const animationDuration = getLastKeyframeTime();
  let keyframesCSS = '';
  let animationProperties = [];

  // Erstellen der Keyframes mit individuellen Easing-Funktionen
  keyframesCSS += `@keyframes rotateAnimation {\n`;

  const keyframeSteps = [];

  // Sammle alle einzigartigen Zeiten der Keypoints
  let keypointTimes = new Set();
  ['x', 'y', 'z'].forEach(axis => {
    keypoints[axis].forEach(kp => {
      keypointTimes.add(kp.time);
    });
  });
  keypointTimes = Array.from(keypointTimes).sort((a, b) => a - b);

  keypointTimes.forEach(time => {
    const percentage = (time / animationDuration) * 100;
    const rotation = getRotationAtTime(time);

    keyframesCSS += `${percentage}% {\n`;
    keyframesCSS += `transform: rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg);\n`;
    keyframesCSS += `}\n`;
  });

  keyframesCSS += `}\n`;

  // Animationseigenschaften
  const animationCSS = `
.animation-container {
  animation: rotateAnimation ${animationDuration}s linear forwards;
}
`;

  return keyframesCSS + animationCSS;
}

// Initialisierung beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
  hideEasingEditor();
});
