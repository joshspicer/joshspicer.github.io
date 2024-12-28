document.addEventListener('DOMContentLoaded', function () {
  const isDarkMode = localStorage.getItem('dark-mode') === 'true';
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
  }

  const toggleButton = document.createElement('button');
  toggleButton.classList.add('toggle-button');
  toggleButton.innerHTML = isDarkMode ? '☀️' : '🌙';
  document.body.appendChild(toggleButton);

  toggleButton.addEventListener('click', function () {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('dark-mode', isDarkMode);
    toggleButton.innerHTML = isDarkMode ? '☀️' : '🌙';
  });
});
