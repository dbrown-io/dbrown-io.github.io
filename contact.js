// The form's POST target lives on the form's own action attribute in
// services.html, which doubles as the no-JS fallback. The email below also
// appears in the JSON-LD in index.html and services.html, so a change needs
// making in all three places.
var SITE = {
  email: 'dbrown.io@icloud.com'
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
  var endpoint = form.getAttribute('action');

  if (!endpoint) {
    notice.hidden = false;
  }

  // The Instagram and email routes are printed directly under the form, so a
  // failure points at them rather than listing them a second time.
  var failed = 'That did not send, so nothing reached me. Try again in a minute, or use one of the options below.';

  // ?debug on the URL puts formspree's own reason on the page. A phone has no
  // console, and a real visitor should never be shown the raw error.
  var debug = /[?&]debug/.test(location.search);

  function detail(text) {
    return debug ? failed + ' [' + text + ']' : failed;
  }

  function say(text, kind) {
    status.textContent = text;
    status.className = 'form-status is-' + kind;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!endpoint) {
      say('This form is not connected yet, so nothing was sent. Your text is still here, so you can copy it into one of the options below.', 'warn');
      return;
    }

    submit.disabled = true;
    say('Sending.', 'busy');

    fetch(endpoint, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    }).then(function (res) {
      if (res.ok) {
        form.reset();
        say('Got it. I will come back to you with a price and a time.', 'ok');
        return;
      }
      // Formspree explains a refusal in the response body, naming the offending
      // field separately from the message: "is missing" alone says nothing.
      var reason = (res.data.errors || []).map(function (e) {
        return (e.field ? e.field + ' ' : '') + e.message;
      }).join('; ');
      var why = 'HTTP ' + res.status + ': ' + (reason || JSON.stringify(res.data));
      console.error('Formspree refused this submission. ' + why);
      say(detail(why), 'error');
    }).catch(function (err) {
      console.error('Could not reach Formspree at all: network error, CORS, or a blocked request.', err);
      say(detail('never reached formspree: ' + err), 'error');
    }).then(function () {
      submit.disabled = false;
    });
  });
})();
