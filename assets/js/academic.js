(function () {
  'use strict';
  // Native links and readable content work before enhancement.
  var links = Array.from(document.querySelectorAll('.nav-links a[href^="#"],.mobile-links a[href^="#"]'));
  var menu = document.querySelector('.mobile-nav');
  if (menu) {
    menu.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', function () { menu.open = false; }); });
    document.addEventListener('click', function (event) { if (!menu.contains(event.target)) menu.open = false; });
    menu.addEventListener('keydown', function (event) { if (event.key === 'Escape') { menu.open = false; menu.querySelector('summary').focus(); } });
  }
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (link) {
          var active = link.hash === '#' + entry.target.id;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-15% 0px -65% 0px' });
    links.forEach(function (link) { var target = document.querySelector(link.hash); if (target) observer.observe(target); });
  }
  document.querySelectorAll('.method-explorer').forEach(function (explorer) {
    var group = explorer.querySelector('.method-tabs');
    var buttons = Array.from(group.querySelectorAll('button'));
    var panels = Array.from(explorer.querySelectorAll('.method-panel'));
    function select(index) {
      buttons.forEach(function (button, i) { button.setAttribute('aria-pressed', String(i === index)); });
      panels.forEach(function (panel, i) { panel.hidden = i !== index; });
    }
    buttons.forEach(function (button, index) {
      button.addEventListener('click', function () { select(index); });
      button.addEventListener('keydown', function (event) {
        var next;
        if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + buttons.length) % buttons.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = buttons.length - 1;
        else return;
        event.preventDefault(); buttons[next].focus(); select(next);
      });
    });
    explorer.classList.add('enhanced'); group.hidden = false; select(0);
  });
  // Preserve links shared before the project pages were introduced.
  if (document.body.dataset.page === 'home') {
    var redirects = { '#llm-compression': 'projects/llm-compression.html', '#systems': '#work', '#physics': '#personal' };
    function revealHash() {
      if (redirects[location.hash]) { location.replace(redirects[location.hash]); return; }
      var id = decodeURIComponent(location.hash.slice(1));
      var target = id && document.getElementById(id);
      if (!target) return;
      var ancestor = target.parentElement;
      while (ancestor) { if (ancestor.tagName === 'DETAILS') ancestor.open = true; ancestor = ancestor.parentElement; }
    }
    window.addEventListener('hashchange', revealHash); revealHash();
  }
})();
