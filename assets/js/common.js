function toggleHeaderVisibility(showFull) {
    const header = document.querySelector('header');
    const minimalHeader = document.getElementById('minimalHeader');
    const fullHeader = document.getElementById('fullHeader');
  
    if (showFull) {
      // Transition to full header
      header.classList.remove('minimal-mode');
      minimalHeader.classList.remove('visible');
      fullHeader.classList.remove('hidden');
    } else {
      // Transition to minimal header
      header.classList.add('minimal-mode');
      minimalHeader.classList.add('visible');
      fullHeader.classList.add('hidden');
    }
  }

document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('image-input');
    const imageSelector = document.getElementById('image-selector');

    // Listen to handle upload button clicks
    if (imageSelector) {
        imageSelector.addEventListener('click', function() {
          imageInput.click();
        });
    }

    // Handle dynamic fill for range inputs
    const rangeInputs = document.querySelectorAll('input[type="range"]');

    function updateRangeFill(input) {
        const value = (input.value - input.min) / (input.max - input.min) * 100;
        input.style.setProperty('--value-percent', value + '%');
    }

    rangeInputs.forEach(input => {
        // Set initial fill value
        updateRangeFill(input);
        // Update fill value on input
        input.addEventListener('input', () => updateRangeFill(input));
    });
});