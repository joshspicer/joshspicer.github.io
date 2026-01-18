// Add anchor links to all headings in post content
document.addEventListener('DOMContentLoaded', function() {
  const postContent = document.querySelector('.post-content');
  if (!postContent) return;

  const headings = postContent.querySelectorAll('h1, h2, h3, h4, h5, h6');

  headings.forEach(function(heading) {
    // Jekyll/kramdown typically auto-generates IDs, but ensure heading has one
    if (!heading.id) {
      // Generate ID from heading text (matching Jekyll's default behavior)
      const text = heading.textContent;
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      heading.id = id;
    }

    // Create anchor link
    const anchor = document.createElement('a');
    anchor.href = '#' + heading.id;
    anchor.className = 'heading-anchor';
    anchor.innerHTML = '#';
    anchor.setAttribute('aria-label', 'Link to ' + heading.textContent);

    // Insert anchor before heading content
    heading.insertBefore(anchor, heading.firstChild);

    // Update URL when anchor is clicked
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      window.history.pushState(null, null, '#' + heading.id);
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Scroll to heading on page load if hash is present
  if (window.location.hash) {
    const targetId = window.location.hash.substring(1);
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      setTimeout(function() {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }
});
