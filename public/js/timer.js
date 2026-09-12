(function () {
  const form = document.getElementById('attemptForm');
  const timerDisplay = document.getElementById('timerDisplay');
  const panels = Array.from(document.querySelectorAll('.question-panel'));
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  const submitFromPaletteBtn = document.getElementById('submitFromPaletteBtn');
  const palette = document.getElementById('questionPalette');

  let currentIndex = 0;
  let autoSubmitted = false;

  // ---------- Question navigation ----------
  function showQuestion(index) {
    panels.forEach((panel) => {
      panel.style.display = Number(panel.dataset.index) === index ? '' : 'none';
    });
    currentIndex = index;

    prevBtn.disabled = currentIndex === 0;
    const isLast = currentIndex === panels.length - 1;
    nextBtn.style.display = isLast ? 'none' : '';
    submitBtn.style.display = isLast ? '' : 'none';

    updatePalette();
  }

  function buildPalette() {
    palette.innerHTML = '';
    panels.forEach((panel, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = idx + 1;
      btn.className = 'btn btn-sm btn-outline-secondary palette-btn';
      btn.style.width = '2.5rem';
      btn.addEventListener('click', () => showQuestion(idx));
      palette.appendChild(btn);
    });
  }

  function updatePalette() {
    const buttons = palette.querySelectorAll('.palette-btn');
    buttons.forEach((btn, idx) => {
      const answered = panels[idx].querySelector('.answer-radio:checked') !== null;
      btn.classList.remove('btn-primary', 'btn-success', 'btn-outline-secondary');
      if (idx === currentIndex) {
        btn.classList.add('btn-primary');
      } else if (answered) {
        btn.classList.add('btn-success');
      } else {
        btn.classList.add('btn-outline-secondary');
      }
    });
  }

  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) showQuestion(currentIndex - 1);
  });
  nextBtn.addEventListener('click', () => {
    if (currentIndex < panels.length - 1) showQuestion(currentIndex + 1);
  });

  form.addEventListener('change', updatePalette);

  submitFromPaletteBtn.addEventListener('click', () => {
    if (confirm('Submit the quiz now? You cannot change your answers after submitting.')) {
      form.submit();
    }
  });

  buildPalette();
  showQuestion(0);

  // ---------- Countdown timer ----------
  let remainingSeconds = QUIZ_DURATION_MINUTES * 60;

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function tick() {
    timerDisplay.textContent = formatTime(remainingSeconds);

    if (remainingSeconds <= 60) {
      timerDisplay.classList.add('text-danger');
    }

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      if (!autoSubmitted) {
        autoSubmitted = true;
        alert('Time is up! Your quiz is being submitted automatically.');
        form.submit();
      }
      return;
    }
    remainingSeconds -= 1;
  }

  tick();
  const timerInterval = setInterval(tick, 1000);

  // Warn on accidental page close/refresh mid-quiz.
  window.addEventListener('beforeunload', (e) => {
    if (!autoSubmitted) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  form.addEventListener('submit', () => {
    autoSubmitted = true; // prevent the beforeunload warning from firing on legitimate submit
  });
})();
