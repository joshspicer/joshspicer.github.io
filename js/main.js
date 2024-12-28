document.addEventListener('DOMContentLoaded', function () {
  const toggleButton = document.createElement('button');
  toggleButton.classList.add('toggle-button');
  toggleButton.innerHTML = '🌙';
  document.body.appendChild(toggleButton);

  toggleButton.addEventListener('click', function () {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('dark-mode', isDarkMode);
    toggleButton.innerHTML = isDarkMode ? '☀️' : '🌙';
  });

  if (localStorage.getItem('dark-mode') === 'true') {
    document.body.classList.add('dark-mode');
    toggleButton.innerHTML = '☀️';
  }
});
