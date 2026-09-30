/*
 * Istel website motion: reveal-on-scroll and a light parallax on the hero art.
 * Only runs when the head script added `.motion` (motion allowed, IntersectionObserver available).
 * Everything animates `opacity`, `translate` and `scale`, which the browser keeps off the main thread.
 */
(function () {
  var root = document.documentElement;
  window.istelMotion = true;
  if (!root.classList.contains('motion')) return;

  var TARGETS = [
    '.section > .h3d',
    '.step',
    '.feature-copy',
    '.feature .phone',
    '.devices .laptop',
    '.band',
    '.faq details',
    '.cta .h3d',
    '.cta .lead',
    '.cta .actions',
    '.doc > *',
  ].join(',');
  var STAGGER_MS = 70;
  var MAX_STAGGER = 5;

  var els = Array.prototype.slice.call(document.querySelectorAll(TARGETS));
  els.forEach(function (el) {
    el.classList.add('rv');
    // Stagger siblings that reveal together (the three steps, the FAQ rows).
    var i = 0;
    for (var s = el.previousElementSibling; s; s = s.previousElementSibling) if (s.matches(TARGETS)) i++;
    if (i) el.style.transitionDelay = Math.min(i, MAX_STAGGER) * STAGGER_MS + 'ms';
    // After the reveal, hover effects must not wait for the stagger.
    el.addEventListener('transitionend', function clear(e) {
      if (e.target !== el || e.propertyName !== 'opacity') return;
      el.style.transitionDelay = '';
      el.removeEventListener('transitionend', clear);
    });
  });

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );
  els.forEach(function (el) {
    io.observe(el);
  });

  // Hero art drifts at different speeds while the hero is on screen.
  var layers = [
    ['.h-blob-l', 0.08],
    ['.h-blob-r', 0.14],
    ['.h-planet', 0.22],
    ['.h-moon', 0.3],
    ['.h-spark', 0.36],
  ];
  var parallax = [];
  layers.forEach(function (layer) {
    document.querySelectorAll(layer[0]).forEach(function (el) {
      parallax.push([el, layer[1]]);
    });
  });
  if (!parallax.length) return;
  var ticking = false;
  function update() {
    ticking = false;
    var y = window.scrollY;
    if (y > 1000) return;
    parallax.forEach(function (p) {
      p[0].style.translate = '0 ' + (y * p[1]).toFixed(1) + 'px';
    });
  }
  window.addEventListener(
    'scroll',
    function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
})();
