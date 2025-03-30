// Immediately execute to prevent flash
(function() {
  let isDarkMode = localStorage.getItem('dark-mode');
  if (isDarkMode === null) {
    isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } else {
    isDarkMode = isDarkMode === 'true';
  }
  if (isDarkMode) {
    document.documentElement.classList.add('dark-mode');
  }
})();

document.addEventListener('DOMContentLoaded', function () {
  // Read the current state rather than recalculating
  let isDarkMode = document.documentElement.classList.contains('dark-mode');
  
  // Ensure body has the same class as html element
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
  }

  const toggleButton = document.createElement('button');
  toggleButton.classList.add('toggle-button');
  toggleButton.innerHTML = isDarkMode ? '☀️' : '🌙';
  document.body.appendChild(toggleButton);

  toggleButton.addEventListener('click', function () {
    document.documentElement.classList.toggle('dark-mode');
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('dark-mode', isDarkMode);
    toggleButton.innerHTML = isDarkMode ? '☀️' : '🌙';
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (localStorage.getItem('dark-mode') !== null) {
      return;
    }
    const isDarkMode = e.matches;
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
    document.body.classList.toggle('dark-mode', isDarkMode);
    toggleButton.innerHTML = isDarkMode ? '☀️' : '🌙';
  });
});
