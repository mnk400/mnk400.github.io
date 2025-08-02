/**
 * UI Components - Handles common UI interactions and components
 * Consolidates expandable sections, image selectors, and header visibility
 */

// Header visibility toggle functionality
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

// Initialize UI components when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize image selector functionality
    const imageInput = document.getElementById('image-input');
    const imageSelector = document.getElementById('image-selector');

    if (imageSelector && imageInput) {
        imageSelector.addEventListener('click', function() {
            imageInput.click();
        });
    }

    // Initialize expandable sections
    const toggleButtons = document.querySelectorAll('.expandable-toggle');

    toggleButtons.forEach(button => {
        const content = button.nextElementSibling;
        
        if (button.getAttribute('aria-expanded') !== 'true') {
            content.classList.add('collapsed');
        } else {
            content.classList.remove('collapsed');
            content.style.maxHeight = content.scrollHeight + 'px'; 
        }
        
        button.addEventListener('click', function() {
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !isExpanded);
            
            if (isExpanded) {
                content.style.maxHeight = content.scrollHeight + 'px';
                content.offsetHeight; 
                content.classList.add('collapsed');
            } else {
                content.classList.remove('collapsed');
                content.style.maxHeight = content.scrollHeight + 'px';
                
                content.addEventListener('transitionend', function handler(e) {
                    if (e.propertyName === 'max-height' && !content.classList.contains('collapsed')) {
                        content.style.maxHeight = '';
                        content.removeEventListener('transitionend', handler);
                    }
                });
            }
        });
    });
});