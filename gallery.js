// Each thumbnail is already a link to the full-size file, so with JS off the
// gallery still works. This upgrades that link into an in-page viewer.
(function () {
  var photos = Array.prototype.slice.call(document.querySelectorAll('a.photo'));
  if (!photos.length) return;

  var opener = null;
  var index = 0;

  var box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Photo viewer');
  box.hidden = true;
  box.innerHTML =
    '<button class="lightbox-close" type="button" aria-label="Close photo">Close</button>' +
    '<button class="lightbox-nav lightbox-prev" type="button" aria-label="Previous photo">&#8249;</button>' +
    '<figure class="lightbox-stage">' +
      '<img alt="">' +
      '<figcaption class="lightbox-caption"></figcaption>' +
    '</figure>' +
    '<button class="lightbox-nav lightbox-next" type="button" aria-label="Next photo">&#8250;</button>' +
    '<p class="lightbox-status" role="status"></p>';
  document.body.appendChild(box);

  var img = box.querySelector('.lightbox-stage img');
  var caption = box.querySelector('.lightbox-caption');
  var status = box.querySelector('.lightbox-status');
  var closeBtn = box.querySelector('.lightbox-close');

  function show(i) {
    index = (i + photos.length) % photos.length;
    var link = photos[index];
    var thumb = link.querySelector('img');
    var text = thumb ? thumb.getAttribute('alt') : '';
    box.classList.add('is-loading');
    status.textContent = 'Loading photo';
    img.src = link.getAttribute('href');
    img.alt = text;
    caption.textContent = text;
  }

  img.addEventListener('load', function () {
    box.classList.remove('is-loading');
    status.textContent = '';
  });

  // A photo that will not load is a dead viewer otherwise: say so and leave the
  // visitor a way out rather than a blank frame.
  img.addEventListener('error', function () {
    box.classList.remove('is-loading');
    status.textContent = 'That photo could not be loaded. Press Escape to go back.';
  });

  function open(i, trigger) {
    opener = trigger;
    box.hidden = false;
    document.body.classList.add('lightbox-open');
    show(i);
    closeBtn.focus();
  }

  function close() {
    box.hidden = true;
    document.body.classList.remove('lightbox-open');
    img.removeAttribute('src');
    status.textContent = '';
    if (opener) opener.focus();
    opener = null;
  }

  photos.forEach(function (link, i) {
    link.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      open(i, link);
    });
  });

  closeBtn.addEventListener('click', close);
  box.querySelector('.lightbox-prev').addEventListener('click', function () { show(index - 1); });
  box.querySelector('.lightbox-next').addEventListener('click', function () { show(index + 1); });
  box.addEventListener('click', function (e) { if (e.target === box) close(); });

  document.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
    else if (e.key === 'Tab') {
      // Keep Tab inside the dialog; without this, focus walks the page behind it.
      var stops = Array.prototype.slice.call(box.querySelectorAll('button'));
      var first = stops[0];
      var last = stops[stops.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
})();
