(function () {
  const container = document.getElementById('questionsContainer');
  const template = document.getElementById('questionTemplate');
  const addBtn = document.getElementById('addQuestionBtn');
  const form = document.getElementById('quizForm');

  let blockCount = 0;

  function renumber() {
    container.querySelectorAll('.question-block').forEach((block, idx) => {
      block.querySelector('.question-number').textContent = `Question ${idx + 1}`;
    });
  }

  function addQuestionBlock(data) {
    const fragment = template.content.cloneNode(true);
    const block = fragment.querySelector('.question-block');
    const uid = `q${blockCount}`;
    blockCount += 1;

    // Give each block's radios a unique group name so selections don't clash across questions.
    const radios = block.querySelectorAll('input[type="radio"]');
    radios.forEach((radio) => {
      radio.name = `correctRadio_${uid}`;
    });

    if (data) {
      block.querySelector('input[name="questionText"]').value = data.questionText || '';
      const optionInputs = block.querySelectorAll('input[name^="option"]');
      (data.options || []).forEach((val, i) => {
        if (optionInputs[i]) optionInputs[i].value = val;
      });
      if (typeof data.correctAnswerIndex === 'number' && radios[data.correctAnswerIndex]) {
        radios[data.correctAnswerIndex].checked = true;
      }
    }

    block.querySelector('.remove-question-btn').addEventListener('click', () => {
      block.remove();
      renumber();
    });

    container.appendChild(block);
    renumber();
  }

  addBtn.addEventListener('click', () => addQuestionBlock());

  // Pre-fill with existing questions when editing, otherwise start with one blank question.
  if (Array.isArray(existingQuestions) && existingQuestions.length > 0) {
    existingQuestions.forEach((q) => addQuestionBlock(q));
  } else {
    addQuestionBlock();
  }

  // Before submitting, translate each block's selected radio into a hidden
  // "correctAnswerIndex" field, in the same order as the question blocks,
  // so the server sees parallel arrays: questionText[], option1..4[], correctAnswerIndex[].
  form.addEventListener('submit', (e) => {
    const blocks = container.querySelectorAll('.question-block');
    if (blocks.length === 0) {
      e.preventDefault();
      alert('Please add at least one question.');
      return;
    }

    let valid = true;
    blocks.forEach((block) => {
      // Remove any hidden field from a previous (failed) submit attempt.
      const oldHidden = block.querySelector('input[name="correctAnswerIndex"]');
      if (oldHidden) oldHidden.remove();

      const checked = block.querySelector('input[type="radio"]:checked');
      if (!checked) {
        valid = false;
        block.classList.add('border-danger');
      } else {
        block.classList.remove('border-danger');
        const hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = 'correctAnswerIndex';
        hidden.value = checked.value;
        block.appendChild(hidden);
      }
    });

    if (!valid) {
      e.preventDefault();
      alert('Please mark the correct answer for every question.');
    }
  });
})();
