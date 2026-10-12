(function () {
  'use strict';
  var TABS = ['about', 'resume', 'projects', 'certifications'];
  var data = null;
  var resumeAvailable = false;
  var activeCategory = 'All';

  function $(id) { return document.getElementById(id); }
  function el(tag, opts, children) {
    var n = document.createElement(tag);
    opts = opts || {};
    if (opts.cls) n.className = opts.cls;
    if (opts.text != null) n.textContent = opts.text;
    if (opts.attrs) Object.keys(opts.attrs).forEach(function (k) { n.setAttribute(k, opts.attrs[k]); });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function str(v) { return typeof v === 'string' ? v.trim() : ''; }
  function isPlaceholder(v) { return /PLACEHOLDER/i.test(v); }

  function safeUrl(v) {
    v = str(v);
    if (!v) return '';
    try {
      var u = new URL(v);
      return u.protocol === 'https:' ? u.href : '';
    } catch (e) { return ''; }
  }
  function safePath(v) {
    v = str(v);
    if (!v || /^[a-z][a-z0-9+.-]*:/i.test(v) || v.charAt(0) === '/' || v.indexOf('//') === 0 || /(^|\/)\.\.(\/|$)/.test(v) || v.indexOf('\\') !== -1) return '';
    return encodeURI(v);
  }
  function safeEmail(v) {
    v = str(v);
    return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(v) ? v : '';
  }
  function extLink(href, text, cls) {
    return el('a', { cls: cls, text: text, attrs: { href: href, target: '_blank', rel: 'noopener noreferrer' } });
  }

  function showTab(name) {
    if (TABS.indexOf(name) === -1) name = 'about';
    TABS.forEach(function (t) {
      var s = $(t);
      if (s) s.hidden = t !== name;
    });
    document.querySelectorAll('[data-tab]').forEach(function (a) {
      if (a.getAttribute('data-tab') === name) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }
  function route(focus) {
    var name = location.hash.replace('#', '') || 'about';
    showTab(name);
    if (focus) $('main').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function fact(dl, label, value) {
    var dd = el('dd', { text: value || '[PLACEHOLDER]' });
    if (!value || isPlaceholder(value)) dd.className = 'placeholder';
    dl.appendChild(el('dt', { text: label }));
    dl.appendChild(dd);
  }
  function linkItem(ul, label, href) {
    var li = el('li');
    if (href) li.appendChild(extLink(href, label));
    else li.appendChild(el('span', { cls: 'placeholder', text: label + ': [PLACEHOLDER - add in portfolio.json]' }));
    ul.appendChild(li);
  }

  function renderSkills(p) {
    var list = $('skills-list');
    clear(list);
    var skills = Array.isArray(p.skills) ? p.skills : [];
    if (!skills.length) {
      var empty = el('li', { cls: 'placeholder', text: '[PLACEHOLDER: add skills in portfolio.json]' });
      list.appendChild(empty);
      return;
    }
    skills.forEach(function (skill) {
      var value = str(skill);
      var item = el('li', { text: value || '[PLACEHOLDER]' });
      if (!value || isPlaceholder(value)) item.className = 'placeholder';
      list.appendChild(item);
    });
  }

  function renderAbout(p) {
    document.title = (str(p.name) || 'Portfolio') + ' | Portfolio';
    $('brand').textContent = str(p.name) || 'Portfolio';
    $('about-title').textContent = str(p.name);
    $('tagline').textContent = str(p.tagline);
    var intro = $('intro-text'); clear(intro);
    (Array.isArray(p.intro) ? p.intro : []).forEach(function (t) { intro.appendChild(el('p', { text: str(t) })); });
    var ch = $('interests'); clear(ch);
    (Array.isArray(p.interests) ? p.interests : []).forEach(function (i) { ch.appendChild(el('li', { text: str(i) })); });
    renderSkills(p);

    var slot = $('photo-slot'); clear(slot);
    var photo = safePath(p.photo);
    if (photo) {
      var img = el('img', { attrs: { src: photo, alt: str(p.photoAlt) || 'Profile photo', width: '640', height: '640' } });
      img.addEventListener('error', function () { clear(slot); slot.appendChild(el('div', { cls: 'photo-ph', text: '[PLACEHOLDER: profile photo not found at ' + str(p.photo) + ']' })); });
      slot.appendChild(img);
    } else {
      slot.appendChild(el('div', { cls: 'photo-ph', text: '[PLACEHOLDER: add profile photo path in portfolio.json]' }));
    }

    var dl = $('facts'); clear(dl);
    fact(dl, 'University', str(p.university));
    fact(dl, 'Major', str(p.major));
    fact(dl, 'Graduation', str(p.graduationYear));
    var ul = $('links'); clear(ul);
    var mail = safeEmail(p.email);
    var li = el('li');
    if (mail) li.appendChild(el('a', { text: mail, attrs: { href: 'mailto:' + mail } }));
    else li.appendChild(el('span', { cls: 'placeholder', text: 'Email: [PLACEHOLDER - add in portfolio.json]' }));
    ul.appendChild(li);
    linkItem(ul, 'GitHub', safeUrl(p.github));
  }

  function resumeControl(cls) {
    var path = safePath(data.resume && data.resume.file);
    if (resumeAvailable && path) {
      return el('a', { cls: 'btn ' + (cls || ''), text: 'Download Resume', attrs: { href: path, download: '' } });
    }
    return el('span', { cls: 'btn-disabled', text: 'Resume coming soon' });
  }
  function renderResume() {
    var nav = $('nav-resume'); clear(nav); nav.appendChild(resumeControl('btn-small'));
    $('resume-summary').textContent = str(data.resume && data.resume.summary);
    var a = $('resume-action'); clear(a); a.appendChild(resumeControl());
  }
  function checkResume() {
    var path = safePath(data.resume && data.resume.file);
    if (!path) return Promise.resolve(false);
    return fetch(path, { method: 'HEAD', cache: 'no-cache' }).then(function (r) {
      var type = (r.headers.get('content-type') || '').toLowerCase();
      return r.ok && type.indexOf('text/html') === -1;
    }).catch(function () { return false; });
  }

  function renderFilters(cats) {
    var box = $('filters'); clear(box);
    ['All'].concat(cats).forEach(function (c) {
      var b = el('button', { text: c, attrs: { type: 'button', 'aria-pressed': String(c === activeCategory) } });
      b.addEventListener('click', function () { activeCategory = c; renderFilters(cats); renderProjects(); });
      box.appendChild(b);
    });
  }
  function projectCard(p) {
    var img = safePath(p.image);
    var top;
    if (img) {
      top = el('img', { attrs: { src: img, alt: str(p.imageAlt), loading: 'lazy' } });
      top.addEventListener('error', function () { top.replaceWith(el('div', { cls: 'img-ph', text: 'Image not found' })); });
    } else top = el('div', { cls: 'img-ph', text: 'No image yet', attrs: { 'aria-hidden': 'true' } });
    var meta = el('div', { cls: 'meta' });
    if (p.placeholder) meta.appendChild(el('span', { cls: 'tag tag-ph', text: 'Placeholder sample' }));
    if (str(p.category)) meta.appendChild(el('span', { cls: 'tag', text: str(p.category) }));
    if (str(p.status)) meta.appendChild(el('span', { cls: 'tag tag-status', text: str(p.status) }));
    var body = el('div', { cls: 'card-body' }, [meta, el('h3', { text: str(p.title) }), el('p', { text: str(p.description) })]);
    var tools = Array.isArray(p.tools) ? p.tools.map(str).filter(Boolean) : [];
    if (tools.length) body.appendChild(el('p', { text: 'Tools: ' + tools.join(', ') }));
    var actions = el('div', { cls: 'card-actions' });
    var gh = safeUrl(p.github), rep = safePath(p.report) || safeUrl(p.report);
    if (gh) actions.appendChild(extLink(gh, 'GitHub', 'btn btn-outline btn-small'));
    if (rep) {
      var a = el('a', { cls: 'btn btn-small', text: 'Download report', attrs: { href: rep, download: '' } });
      actions.appendChild(a);
    }
    if (actions.childNodes.length) body.appendChild(actions);
    return el('article', { cls: 'card' }, [top, body]);
  }
  function renderProjects() {
    var grid = $('project-grid'); clear(grid);
    var all = Array.isArray(data.projects) ? data.projects : [];
    var list = all.filter(function (p) { return activeCategory === 'All' || str(p.category) === activeCategory; });
    if (!list.length) {
      grid.appendChild(el('div', { cls: 'empty' }, [el('h3', { text: 'No projects to show' }), el('p', { text: all.length ? 'No projects in this category yet.' : 'Add projects to portfolio.json to see them here.' })]));
    } else list.forEach(function (p) { grid.appendChild(projectCard(p)); });
    $('project-status').textContent = list.length + ' project' + (list.length === 1 ? '' : 's') + ' shown';
  }

  function renderCerts() {
    var box = $('cert-list'); clear(box);
    var certs = Array.isArray(data.certifications) ? data.certifications : [];
    if (!certs.length) {
      box.appendChild(el('div', { cls: 'empty' }, [el('h3', { text: 'No certifications yet' }), el('p', { text: 'Certifications will appear here once added. To add one, edit the "certifications" list in portfolio.json (see the README).' })]));
      return;
    }
    certs.forEach(function (c) {
      var body = el('div', { cls: 'card-body' }, [el('h3', { text: str(c.name) }), el('p', { text: str(c.issuer) })]);
      if (str(c.dateEarned)) body.appendChild(el('p', { text: 'Earned: ' + str(c.dateEarned) }));
      if (str(c.expires)) body.appendChild(el('p', { text: 'Expires: ' + str(c.expires) }));
      var v = safeUrl(c.verificationUrl);
      if (v) body.appendChild(el('div', { cls: 'card-actions' }, [extLink(v, 'Verify credential', 'btn btn-outline btn-small')]));
      box.appendChild(el('article', { cls: 'card' }, [body]));
    });
  }

  function init() {
    fetch('portfolio.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (d) {
      data = d || {};
      renderAbout(data.profile || {});
      var cats = (Array.isArray(data.projectCategories) ? data.projectCategories : []).map(str).filter(Boolean);
      (data.projects || []).forEach(function (p) { var c = str(p.category); if (c && cats.indexOf(c) === -1) cats.push(c); });
      renderFilters(cats); renderProjects(); renderCerts();
      $('footer-text').textContent = '\u00a9 ' + new Date().getFullYear() + ' ' + str((data.profile || {}).name);
      renderResume();
      return checkResume().then(function (ok) { resumeAvailable = ok; renderResume(); });
    }).catch(function (e) {
      var m = $('load-error');
      m.hidden = false;
      m.textContent = 'Could not load portfolio.json (' + e.message + '). If previewing locally, serve the folder with a local web server (see README); also check the JSON for syntax errors.';
    });
    window.addEventListener('hashchange', function () { route(true); });
    route(false);
  }
  init();
})();
