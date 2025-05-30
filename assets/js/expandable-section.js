document.addEventListener('DOMContentLoaded', function() {
  const toggleButtons = document.querySelectorAll('.expandable-toggle');

  toggleButtons.forEach(button => {
    const content = button.nextElementSibling;
    
    if (button.getAttribute('aria-expanded') !== 'true') {
      content.style.maxHeight = '0px';
      content.style.opacity = '0';
      content.style.padding = '0px 10px 0px 20px';
    } else {
      content.style.maxHeight = content.scrollHeight + 'px';
    }
    
    button.addEventListener('click', function() {
      const isExpanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !isExpanded);
      
      if (isExpanded) {
        content.style.maxHeight = content.scrollHeight + 'px';
        content.offsetHeight;
        
        setTimeout(() => {
          content.style.maxHeight = '0px';
          content.style.opacity = '0';
          content.style.padding = '0px 10px 0px 20px';
        }, 10);
      } else {
        content.style.display = 'block';
        content.offsetHeight;
        
        content.style.maxHeight = content.scrollHeight + 'px';
        content.style.opacity = '1';
        content.style.padding = '10px 10px 10px 20px';
        
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
