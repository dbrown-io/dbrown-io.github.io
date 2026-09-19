// endpoint is the form's POST target, from formspree.io (the free tier is
// enough). Until it is set the form says so and points at Instagram rather
// than pretending to send. The email also appears in the JSON-LD in
// index.html and services.html, so change it in all three places.
var SITE = {
  email: 'dbrown.io@icloud.com',
  endpoint: ''
};

(function () {
  if (SITE.email) {
    document.querySelectorAll('[data-email-slot]').forEach(function (slot) {
      var a = document.createElement('a');
      a.href = 'mailto:' + SITE.email + '?subject=' + encodeURIComponent(slot.dataset.emailSlot || 'Enquiry');
      a.className = slot.dataset.emailClass || '';
      a.textContent = SITE.email;
      slot.replaceWith(a);
    });
  }

  var form = document.querySelector('form.booking');
  if (!form) return;

  var status = form.querySelector('.form-status');
  var submit = form.querySelector('button[type="submit"]');
  var notice = form.querySelector('.form-notice');

  if (!SITE.endpoint) {
    notice.hidden = false;
  }

  function say(text, kind) {
    status.textContent = text;
    status.className = 'form-status is-' + kind;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!SITE.endpoint) {
      say('This form is not connected yet, so nothing was sent. Message @dbrown.io on Instagram and I will pick it up there. Your text is still in the boxes below, so you can copy it across.', 'warn');
      return;
    }

    submit.disabled = true;
    say('Sending.', 'busy');

    fetch(SITE.endpoint, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    }).then(function (res) {
      if (!res.ok) throw new Error(res.status);
      form.reset();
      say('Got it. I will come back to you with a price and a time.', 'ok');
    }).catch(function () {
      say('That did not send. Message @dbrown.io on Instagram instead, or try again in a minute.', 'error');
    }).then(function () {
      submit.disabled = false;
    });
  });
})();
