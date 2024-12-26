$(document).ready(function () {

  document.getElementsByClassName('dark-mode-button')[0].onclick = function () {
    darkmode()
  }

  let enabled = localStorage.getItem('dark-mode')

  if (enabled === 'true') {
    enable()
  }

  function enable() {
    DarkReader.setFetchMethod(window.fetch)
    DarkReader.enable();
    localStorage.setItem('dark-mode', 'true');
  }

  function disable() {
    DarkReader.disable();
    localStorage.setItem('dark-mode', 'false');

  }

  function darkmode() {
    if (localStorage.getItem('dark-mode') === 'false') {
      enable();
    } else {
      disable();
    }
  }
});