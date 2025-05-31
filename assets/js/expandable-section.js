document.addEventListener('DOMContentLoaded', function() {
  const toggleButtons = document.querySelectorAll('.expandable-toggle');

  toggleButtons.forEach(button => {
    const content = button.nextElementSibling;
    
    if (button.getAttribute('aria-expanded') !== 'true') {
      content.style.maxHeight = '0px';
      content.style.opacity = '0';
    } else {
      content.style.maxHeight = content.scrollHeight + 'px';
    }
    
    button.addEventListener('click', function() {
      const isExpanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !isExpanded);
      
      if (isExpanded) {
        content.style.maxHeight = content.scrollHeight + 'px';
        
        setTimeout(() => {
          content.style.maxHeight = '0px';
          content.style.opacity = '0';
        }, 10);
      } else {
        content.style.display = 'block';
        content.offsetHeight;
        
        content.style.maxHeight = content.scrollHeight + 'px';
        content.style.opacity = '1';
        
        content.addEventListener('transitionend', function handler(e) {
          if (e.propertyName === 'max-height') {
            content.style.maxHeight = '';
            content.removeEventListener('transitionend', handler);
          }
        });
      }
    });
  });
});
