document.addEventListener('DOMContentLoaded', function() {
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
