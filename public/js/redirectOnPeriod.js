document.addEventListener('keydown', function(event) {
  if (event.key === '.') {
    const sourcePath = document.body.dataset.githubDevSourcePath || window.location.pathname;
    const normalizedPath = sourcePath.startsWith('/') ? sourcePath : '/' + sourcePath;
    window.location.href = 'https://github.dev/joshspicer/joshspicer.github.io/blob/master' + normalizedPath;
  }
});
