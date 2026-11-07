// Animates the nav pill stretching across to the clicked tab, then loads the page. Each
// page is a full reload, so the indicator snaps into place on load and only
// animates in the moment before navigating away.
(function () {
  var nav = document.querySelector('nav.tabs');
  if (!nav) return;

  var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
  if (!links.length) return;

  var indicator = document.createElement('div');
  indicator.className = 'tab-indicator';
  nav.insertBefore(indicator, nav.firstChild);

  // The pill is clipped to the tab between two edges (styles.css). The edge
  // on the side it is moving towards leads, so data-dir says which side.
  var edge = 0;
  function placeIndicator(link, animate) {
    if (!link) return;
    if (!animate) indicator.style.transition = 'none';
    var l = link.offsetLeft;
    if (animate) nav.setAttribute('data-dir', l > edge ? 'right' : 'left');
    edge = l;
    indicator.style.setProperty('--tab-l', l + 'px');
    indicator.style.setProperty('--tab-r', (l + link.offsetWidth) + 'px');
    if (!animate) {
      // force reflow so the next transition re-applies cleanly
      void indicator.offsetHeight;
      indicator.style.transition = '';
    }
  }

  placeIndicator(nav.querySelector('a.active'), false);
  nav.classList.add('js-ready');

  // The web fonts can arrive after this runs and change every tab's width, so
  // place the indicator again once they have.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      placeIndicator(nav.querySelector('a.active'), false);
    });
  }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  links.forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (link.classList.contains('active')) return;
      // Leave open-in-new-tab and middle-click alone: hijacking those loses
      // the tab the visitor asked for.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (reduced.matches) return;
      e.preventDefault();
      var href = link.getAttribute('href');
      links.forEach(function (l) { l.classList.remove('active'); });
      link.classList.add('active');
      placeIndicator(link, true);
      setTimeout(function () { window.location.href = href; }, 200);
    });
  });

  window.addEventListener('resize', function () {
    placeIndicator(nav.querySelector('a.active'), false);
  });
})();
