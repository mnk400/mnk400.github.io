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
    const uploadBtn = document.getElementById('upload-btn');

    // Listen to handle upload button clicks
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            imageInput.click();
        });
    }
});