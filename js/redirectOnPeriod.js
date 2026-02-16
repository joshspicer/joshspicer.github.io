document.addEventListener('keydown', function(event) {
  if (event.key === '.') {
    // Get the current page path and construct the github.dev URL
    const currentPath = window.location.pathname;
    window.location.href = 'https://github.dev/joshspicer/joshspicer.github.io/blob/master' + currentPath;
  }
});
