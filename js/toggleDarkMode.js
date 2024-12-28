document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.querySelector('.dark-mode-toggle');

  toggleSwitch.addEventListener('click', () => {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    }
  });

  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
});
