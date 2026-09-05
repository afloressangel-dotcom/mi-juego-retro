/* ==========================================================================
   SISTEMA DEL JUEGO RETRO 8-BIT
   ========================================================================== */

// --- BANCO DE ACERTIJOS (MÁS DIFÍCILES CON PISTAS) ---
const ACERTIJOS = [
  {
    id: 1,
    pregunta: "No tengo voz, pero te cuento historias. No tengo alas, pero te hago viajar. Sin moverme, te llevo a otros mundos. ¿Qué soy?",
    respuesta: "libro",
    pista: "Tiene hojas pero no es un árbol, tiene lomo pero no es un animal."
  },
  {
    id: 2,
    pregunta: "Si me nombras, me rompes. Si me buscas, desaparezco. ¿Qué soy?",
    respuesta: "silencio",
    pista: "Es lo que hay en una biblioteca vacía o antes de que hables."
  },
  {
    id: 3,
    pregunta: "Cavo fosas antes de nacer, mato reyes, erijo ciudades, pero nazco de la nada. Los sabios me temen y los niños me crean. ¿Qué soy?",
    respuesta: "pensamiento",
    pista: "Ocurre dentro de tu cabeza todo el tiempo."
  },
  {
    id: 4,
    pregunta: "Vuelo sin alas, lloro sin ojos. Donde voy, la oscuridad sigue o la vida florece. ¿Qué soy?",
    respuesta: "nube",
    pista: "Flota en el cielo y produce lluvia."
  },
  {
    id: 5,
    pregunta: "Tengo ciudades pero no casas, tengo montañas pero no árboles, tengo ríos pero no agua. ¿Qué soy?",
    respuesta: "mapa",
    pista: "Lo usas para no perderte en un viaje o en un juego de rol."
  },
  {
    id: 6,
    pregunta: "Nací en el fuego, pero si me toca el agua, muero. Devoro todo a mi paso pero nunca me sacio. ¿Qué soy?",
    respuesta: "fuego",
    pista: "Arde, da calor y necesita oxígeno para seguir vivo."
  },
  {
    id: 7,
    pregunta: "Entre más me quitas, más grande me vuelvo. Entre más me llenas, más pequeño soy. ¿Qué soy?",
    respuesta: "hoyo",
    pista: "Piensa en cavar en la tierra o en la arena."
  },
  {
    id: 8,
    pregunta: "Parezco una eternidad cuando me esperas, pero paso volando cuando disfrutas. Nadie me puede detener ni guardar. ¿Qué soy?",
    respuesta: "tiempo",
    pista: "Lo miden los relojes."
  }
];

// --- ESTADO DEL JUEGO ---
let gameState = {
  currentPuzzleIndex: 0,
  audioEnabled: false,
  answersSolved: new Array(ACERTIJOS.length).fill(false)
};

// --- SINTETIZADOR DE AUDIO 8-BIT (WEB AUDIO API) ---
const SoundFX = {
  ctx: null,

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  },

  playBeep(freq, type, duration) {
    if (!gameState.audioEnabled || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Error reproducir audio:", e);
    }
  },

  playClick() {
    this.playBeep(400, 'square', 0.05);
  },

  playCorrect() {
    if (!gameState.audioEnabled || !this.ctx) return;
    this.playBeep(523.25, 'square', 0.1); // Do
    setTimeout(() => this.playBeep(659.25, 'square', 0.1), 100); // Mi
    setTimeout(() => this.playBeep(783.99, 'square', 0.2), 200); // Sol
  },

  playWrong() {
    if (!gameState.audioEnabled || !this.ctx) return;
    this.playBeep(200, 'sawtooth', 0.15);
    setTimeout(() => this.playBeep(150, 'sawtooth', 0.25), 150);
  },

  playWin() {
    if (!gameState.audioEnabled || !this.ctx) return;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playBeep(freq, 'triangle', 0.2), idx * 150);
    });
  }
};

// --- ELEMENTOS DEL DOM ---
const screens = {
  home: document.getElementById('screen-home'),
  puzzle: document.getElementById('screen-puzzle'),
  final: document.getElementById('screen-final')
};

const elements = {
  btnAudio: document.getElementById('btn-audio'),
  btnReset: document.getElementById('btn-reset'),
  btnStart: document.getElementById('btn-start'),
  btnHint: document.getElementById('btn-hint'),
  btnSubmit: document.getElementById('btn-submit'),
  btnNext: document.getElementById('btn-next'),
  btnShare: document.getElementById('btn-share'),
  btnReplay: document.getElementById('btn-replay'),
  
  puzzleTracker: document.getElementById('puzzle-tracker'),
  progressFill: document.getElementById('progress-fill'),
  riddleText: document.getElementById('riddle-text'),
  hintBox: document.getElementById('hint-box'),
  answerInput: document.getElementById('answer-input'),
  feedbackMsg: document.getElementById('feedback-msg'),
  chestsGrid: document.getElementById('chests-grid'),
  secretReveal: document.getElementById('secret-reveal')
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
  loadSavedProgress();
  setupEventListeners();
  updateAudioButtonState();
});

function setupEventListeners() {
  // Audio Toggle
  elements.btnAudio.addEventListener('click', () => {
    SoundFX.init();
    gameState.audioEnabled = !gameState.audioEnabled;
    updateAudioButtonState();
    if (gameState.audioEnabled) SoundFX.playClick();
  });

  // Reiniciar
  elements.btnReset.addEventListener('click', () => {
    SoundFX.playClick();
    if (confirm('¿Quieres reiniciar todo tu progreso?')) {
      resetGame();
    }
  });

  // Iniciar Juego
  elements.btnStart.addEventListener('click', () => {
    SoundFX.playClick();
    switchScreen('puzzle');
    renderCurrentPuzzle();
  });

  // Mostrar Pista
  elements.btnHint.addEventListener('click', () => {
    SoundFX.playClick();
    elements.hintBox.classList.toggle('active');
  });

  // Enviar Respuesta
  elements.btnSubmit.addEventListener('click', checkAnswer);

  elements.answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      if (elements.btnNext.style.display !== 'none') {
        goToNextPuzzle();
      } else {
        checkAnswer();
      }
    }
  });

  // Siguiente Acertijo
  elements.btnNext.addEventListener('click', () => {
    SoundFX.playClick();
    goToNextPuzzle();
  });

  // Volver a Jugar
  elements.btnReplay.addEventListener('click', () => {
    SoundFX.playClick();
    resetGame();
  });

  // Compartir Logro
  elements.btnShare.addEventListener('click', () => {
    SoundFX.playClick();
    if (navigator.share) {
      navigator.share({
        title: 'Secreto 8-Bit',
        text: '¡He resuelto todos los enigmas de Secreto 8-Bit! ✦',
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('¡Enlace copiado al portapapeles!');
    }
  });
}

// --- NAVEGACIÓN Y RENDERIZADO ---
function switchScreen(screenName) {
  Object.keys(screens).forEach(key => {
    screens[key].classList.remove('active');
  });
  screens[screenName].classList.add('active');
}

function updateAudioButtonState() {
  elements.btnAudio.textContent = `SFX: ${gameState.audioEnabled ? 'ON' : 'OFF'}`;
  elements.btnAudio.style.borderColor = gameState.audioEnabled ? 'var(--accent-light-blue)' : '#888';
}

function renderCurrentPuzzle() {
  const current = ACERTIJOS[gameState.currentPuzzleIndex];
  
  // Actualizar UI
  elements.puzzleTracker.textContent = `ACERTIJO ${gameState.currentPuzzleIndex + 1}/${ACERTIJOS.length}`;
  
  const percentage = (gameState.currentPuzzleIndex / ACERTIJOS.length) * 100;
  elements.progressFill.style.width = `${percentage}%`;

  elements.riddleText.textContent = current.pregunta;
  elements.hintBox.textContent = `💡 PISTA: ${current.pista}`;
  elements.hintBox.classList.remove('active');

  elements.answerInput.value = '';
  elements.answerInput.disabled = false;
  elements.feedbackMsg.textContent = '';
  elements.feedbackMsg.className = 'feedback-message';

  elements.btnSubmit.style.display = 'block';
  elements.btnNext.style.display = 'none';

  elements.answerInput.focus();
}

// --- LÓGICA DEL JUEGO ---
function checkAnswer() {
  const userAns = elements.answerInput.value.trim().toLowerCase();
  const current = ACERTIJOS[gameState.currentPuzzleIndex];

  if (!userAns) return;

  if (userAns === current.respuesta.toLowerCase()) {
    // Correcto
    SoundFX.playCorrect();
    gameState.answersSolved[gameState.currentPuzzleIndex] = true;
    saveProgress();

    elements.feedbackMsg.textContent = "¡CORRECTO! ✦";
    elements.feedbackMsg.className = "feedback-message feedback-correct";
    
    elements.answerInput.disabled = true;
    elements.btnSubmit.style.display = 'none';

    if (gameState.currentPuzzleIndex < ACERTIJOS.length - 1) {
      elements.btnNext.style.display = 'block';
      elements.btnNext.focus();
    } else {
      // Fin del juego
      setTimeout(showFinalScreen, 1200);
    }
  } else {
    // Incorrecto
    SoundFX.playWrong();
    elements.feedbackMsg.textContent = "INCORRECTO. ¡INTÉNTALO DE NUEVO!";
    elements.feedbackMsg.className = "feedback-message feedback-wrong";
    
    elements.answerInput.value = '';
    elements.answerInput.focus();
  }
}

function goToNextPuzzle() {
  if (gameState.currentPuzzleIndex < ACERTIJOS.length - 1) {
    gameState.currentPuzzleIndex++;
    saveProgress();
    renderCurrentPuzzle();
  }
}

function showFinalScreen() {
  switchScreen('final');
  SoundFX.playWin();

  elements.progressFill.style.width = '100%';

  // Generar Cofres
  elements.chestsGrid.innerHTML = '';
  ACERTIJOS.forEach((_, idx) => {
    const chest = document.createElement('div');
    chest.className = 'pixel-chest';
    elements.chestsGrid.appendChild(chest);

    setTimeout(() => {
      chest.classList.add('open');
      SoundFX.playBeep(600 + (idx * 100), 'square', 0.08);
    }, idx * 200 + 400);
  });

  // Mostrar mensaje final progresivamente
  setTimeout(() => {
    elements.secretReveal.classList.add('visible');
  }, ACERTIJOS.length * 200 + 600);
}

// --- PERSISTENCIA DE DATOS (LOCALSTORAGE) ---
function saveProgress() {
  const data = {
    index: gameState.currentPuzzleIndex,
    solved: gameState.answersSolved
  };
  localStorage.setItem('retro_puzzle_save', JSON.stringify(data));
}

function loadSavedProgress() {
  const saved = localStorage.getItem('retro_puzzle_save');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data && typeof data.index === 'number') {
        gameState.currentPuzzleIndex = data.index;
        gameState.answersSolved = data.solved || gameState.answersSolved;
      }
    } catch (e) {
      console.warn("No se pudo cargar el progreso guardado.");
    }
  }
}

function resetGame() {
  localStorage.removeItem('retro_puzzle_save');
  gameState.currentPuzzleIndex = 0;
  gameState.answersSolved = new Array(ACERTIJOS.length).fill(false);
  switchScreen('home');
}