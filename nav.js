// Animates the nav pill sliding to the clicked tab, then loads the page —
// each page is a full reload, so the indicator snaps into place on load
// and only animates in the moment before navigating away.
(function () {
  var nav = document.querySelector('nav.tabs');
  if (!nav) return;

  var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
  if (!links.length) return;

  var indicator = document.createElement('div');
  indicator.className = 'tab-indicator';
  nav.insertBefore(indicator, nav.firstChild);

  function placeIndicator(link, animate) {
    if (!link) return;
    if (!animate) indicator.style.transition = 'none';
    indicator.style.width = link.offsetWidth + 'px';
    indicator.style.left = link.offsetLeft + 'px';
    if (!animate) {
      // force reflow so the next transition re-applies cleanly
      void indicator.offsetHeight;
      indicator.style.transition = '';
    }
  }

  placeIndicator(nav.querySelector('a.active'), false);
  nav.classList.add('js-ready');

  links.forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (link.classList.contains('active')) return;
      e.preventDefault();
      var href = link.getAttribute('href');
      links.forEach(function (l) { l.classList.remove('active'); });
      link.classList.add('active');
      placeIndicator(link, true);
      setTimeout(function () { window.location.href = href; }, 320);
    });
  });

  window.addEventListener('resize', function () {
    placeIndicator(nav.querySelector('a.active'), false);
  });
})();
