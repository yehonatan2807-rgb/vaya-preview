(() => {
  const doc = document.documentElement;
  doc.classList.remove('no-js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
     Analytics – counts calls, WhatsApp, email and form leads.
     Fill in ONE of the IDs below to switch it on. While both are
     empty nothing is loaded and nothing is sent anywhere.
       GA4_ID:    "G-XXXXXXXXXX" from Google Analytics
       PLAUSIBLE: the site domain, e.g. "vayacom.co.il" (cookieless)
     ========================================================= */
  const ANALYTICS = { GA4_ID: '', PLAUSIBLE: '' };

  /* Where form leads are sent. On the WordPress site with the "Vaya Leads"
     plugin installed this address works as-is: every lead is saved in the
     WordPress admin and emailed to the office automatically. If it can't be
     reached, the visitor's own email app opens as a fallback. */
  const LEADS_ENDPOINT = '/wp-json/vaya/v1/lead';

  const sendLead = async payload => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(LEADS_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, lang: doc.lang || 'he', page: location.pathname.split('/').pop() || 'index.html' }),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok && json.ok === true, message: json.message || '' };
    } catch (e) { return { ok: false, message: '' }; }
  };

  const lang = doc.lang || 'he';
  const track = (name, params = {}) => {
    const data = { page: location.pathname.split('/').pop() || 'index.html', lang, ...params };
    if (window.gtag) window.gtag('event', name, data);
    if (window.plausible) window.plausible(name, { props: data });
    window.dataLayer && window.dataLayer.push({ event: name, ...data });
  };
  window.vayaTrack = track;
  const EN = lang === 'en';
  const T = EN ? {
    menuClose:'Close menu', menuOpen:'Open menu', play:'Play motion', pause:'Pause motion',
    required:'Required field', badTel:'Please enter a valid phone number', sent:'Thank you. Your email app has opened to send the request.', received:'Thank you! We received your request and will get back to you soon.', failed:'We could not send the form.', failedWa:'Send the details on WhatsApp', failedOr:'or call', sending:'Sending…',
    pickOne:'Please choose an option', pickAny:'Please choose at least one option', none:'—',
    sum:{name:'Name',tel:'Phone',city:'Area',property:'Property',systems:'Systems',stage:'Stage',when:'Timing',pref:'Contact by',notes:'Notes'},
    plannerSubject:'Project planning request', plannerIntro:'New project planning request from the website:'
  } : {
    menuClose:'סגירת התפריט', menuOpen:'פתיחת התפריט', play:'הפעלת תנועה', pause:'עצירת תנועה',
    required:'שדה חובה', badTel:'נא להזין מספר טלפון תקין', sent:'תודה. חלון המייל נפתח לשליחת הפנייה.', received:'תודה! הפנייה התקבלה, ונחזור אליכם בהקדם.', failed:'לא הצלחנו לשלוח את הטופס.', failedWa:'שלחו לנו את הפרטים בוואטסאפ', failedOr:'או חייגו', sending:'שולח…',
    pickOne:'נא לבחור אפשרות', pickAny:'נא לבחור לפחות אפשרות אחת', none:'—',
    sum:{name:'שם',tel:'טלפון',city:'אזור',property:'סוג נכס',systems:'מערכות',stage:'שלב',when:'מתי',pref:'חזרה ב',notes:'הערות'},
    plannerSubject:'שאלון תכנון פרויקט מהאתר', plannerIntro:'פנייה חדשה משאלון תכנון הפרויקט באתר:'
  };

  const loadAnalytics = () => {
    if (ANALYTICS.GA4_ID) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function(){ dataLayer.push(arguments); };
      gtag('js', new Date());
      gtag('config', ANALYTICS.GA4_ID, { anonymize_ip: true });
      const s = document.createElement('script');
      s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ANALYTICS.GA4_ID;
      document.head.appendChild(s);
    } else if (ANALYTICS.PLAUSIBLE) {
      window.plausible = window.plausible || function(){ (window.plausible.q = window.plausible.q || []).push(arguments); };
      const s = document.createElement('script');
      s.defer = true; s.dataset.domain = ANALYTICS.PLAUSIBLE; s.src = 'https://plausible.io/js/script.js';
      document.head.appendChild(s);
    }
  };
  // Load only after the page is fully shown, so it never slows the first view.
  if (ANALYTICS.GA4_ID || ANALYTICS.PLAUSIBLE) {
    const go = () => ('requestIdleCallback' in window ? requestIdleCallback(loadAnalytics, { timeout: 4000 }) : setTimeout(loadAnalytics, 2500));
    document.readyState === 'complete' ? go() : addEventListener('load', go, { once: true });
  }

  // Contact clicks (phone / WhatsApp / email / social)
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const h = a.getAttribute('href');
    const where = a.closest('.wa') ? 'floating_button' : a.closest('.site-header') ? 'header' : a.closest('.mobile-menu') ? 'menu' : a.closest('.site-footer') ? 'footer' : 'content';
    if (h.startsWith('tel:')) track('click_call', { where });
    else if (h.includes('wa.me')) track('click_whatsapp', { where });
    else if (h.startsWith('mailto:')) track('click_email', { where });
    else if (/facebook|instagram/.test(h)) track('click_social', { network: /facebook/.test(h) ? 'facebook' : 'instagram' });
  }, true);

  /* ---------- Storage helpers ---------- */
  const store = {
    get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
    set(k,v){ try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k,v); } catch(e){} }
  };
  const ss = {
    get(k){ try { return sessionStorage.getItem(k); } catch(e){ return null; } },
    set(k,v){ try { sessionStorage.setItem(k,v); } catch(e){} }
  };

  /* ---------- Accessibility preferences ---------- */
  const A11Y_KEYS = ['a11y-text', 'a11y-contrast', 'a11y-links', 'a11y-readable', 'a11y-still'];
  A11Y_KEYS.forEach(k => { if (store.get(k) === '1') doc.classList.add(k); });
  const still = () => reduce || doc.classList.contains('a11y-still');

  /* ---------- Intro: logo fade, first visit of the session only ---------- */
  const curtain = document.querySelector('.curtain');
  let introDelay = 0;
  if (curtain) {
    if (still() || ss.get('vaya-intro')) curtain.classList.add('done');
    else {
      ss.set('vaya-intro', '1');
      introDelay = 1500;
      requestAnimationFrame(() => curtain.classList.add('logo'));
      setTimeout(() => curtain.classList.add('up'), 1200);
      setTimeout(() => curtain.classList.add('done'), 2200);
    }
  }

  /* ---------- Soft fade between pages ---------- */
  // Desktop only: on phones links open instantly, so a slow network can never
  // leave the page faded out and unresponsive.
  const touch = matchMedia('(hover: none)').matches;
  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a || touch || still() || e.defaultPrevented) return;
    const href = a.getAttribute('href') || '';
    if (a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || !/^[\w-]+\.html(#.*)?$/.test(href)) return;
    e.preventDefault();
    document.body.classList.add('leaving');
    setTimeout(() => { location.href = href; }, 300);
    setTimeout(() => document.body.classList.remove('leaving'), 2500); // safety net
  });

  /* ---------- Gentle fade-in on scroll ---------- */
  const revealEls = document.querySelectorAll('[data-reveal], [data-split], .img-reveal');
  const show = el => el.classList.add('in');
  if (still() || !('IntersectionObserver' in window)) revealEls.forEach(show);
  else {
    const start = () => {
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
      revealEls.forEach(el => io.observe(el));
    };
    introDelay ? setTimeout(start, introDelay - 300) : start();
  }

  /* ---------- Header background + progress line ---------- */
  const header = document.querySelector('.site-header');
  const bar = document.querySelector('.progress i');
  let ticking = false;
  const onScroll = () => {
    const y = scrollY;
    header?.classList.toggle('scrolled', y > 40);
    const h = doc.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-menu');
  const setMenu = open => {
    doc.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? T.menuClose : T.menuOpen);
    menu.toggleAttribute('inert', !open);
    menu.setAttribute('aria-hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
    // Move keyboard focus into the menu only for keyboard users; on touch it can make the page jump.
    if (open && !touch) setTimeout(() => menu.querySelector('a')?.focus({ preventScroll: true }), 200);
  };
  if (toggle && menu) {
    setMenu(false);
    toggle.addEventListener('click', () => setMenu(!doc.classList.contains('menu-open')));
    // Close the menu as soon as a link in it is chosen (also for links to the current page).
    menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && doc.classList.contains('menu-open')) { setMenu(false); toggle.focus(); } });
    matchMedia('(min-width:1100px)').addEventListener('change', m => { if (m.matches) setMenu(false); });
  }
  // Coming back with the browser's Back button restores the page from memory:
  // always return it to a clean, usable state.
  addEventListener('pageshow', ev => {
    if (!ev.persisted) return;
    document.body.classList.remove('leaving');
    if (toggle && menu) setMenu(false);
    onScroll();
  });

  /* ---------- Counters (short, smooth count-up; years stay fixed) ---------- */
  const COUNT_MS = 1600;
  const runCount = el => {
    const target = +el.dataset.count, suf = el.dataset.suffix || '';
    const fmt = n => el.hasAttribute('data-plain') ? String(n) : n.toLocaleString('he-IL');
    if (still()) { el.textContent = fmt(target) + suf; return; }
    const from = el.hasAttribute('data-plain') ? Math.round(target * 0.97) : 0;
    const t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / COUNT_MS);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(from + (target - from) * e)) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const counters = document.querySelectorAll('[data-count]:not([data-plain])');
  // The real number stays in the page for screen readers and search engines;
  // only the visible copy counts up.
  counters.forEach(el => {
    const sr = document.createElement('span');
    sr.className = 'sr-only'; sr.textContent = el.textContent;
    el.after(sr); el.setAttribute('aria-hidden', 'true');
    if (!still()) el.textContent = '0';
  });
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { runCount(en.target); cio.unobserve(en.target); } }), { threshold: 0.5 });
    counters.forEach(c => cio.observe(c));
  } else counters.forEach(runCount);

  /* ---------- Team photos turn to colour when centred (touch screens) ---------- */
  const members = document.querySelectorAll('.member');
  if (members.length && matchMedia('(hover: none)').matches && 'IntersectionObserver' in window) {
    const mio = new IntersectionObserver(es => es.forEach(en => en.target.closest('.member').classList.toggle('lit', en.isIntersecting)),
      { rootMargin: '-30% 0px -30% 0px', threshold: 0 });
    members.forEach(m => mio.observe(m.querySelector('figure') || m));
  }

  /* ---------- Logo strip: pause control ---------- */
  document.querySelectorAll('.pause-btn').forEach(btn => {
    const mq = document.getElementById(btn.getAttribute('aria-controls'));
    const set = paused => {
      mq.classList.toggle('paused', paused);
      btn.setAttribute('aria-pressed', paused);
      btn.querySelector('.pb-txt').textContent = paused ? T.play : T.pause;
    };
    if (still()) set(true);
    btn.addEventListener('click', () => set(!mq.classList.contains('paused')));
  });

  /* ---------- Floating buttons step aside while a submit button is on screen ---------- */
  if ('IntersectionObserver' in window) {
    const seen = new Set();
    const fio = new IntersectionObserver(es => {
      es.forEach(en => en.isIntersecting ? seen.add(en.target) : seen.delete(en.target));
      doc.classList.toggle('floats-away', seen.size > 0);
    }, { rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('form [type=submit]').forEach(b => fio.observe(b));
  }

  /* ---------- WhatsApp button appears after load ---------- */
  const wa = document.querySelector('.wa');
  if (wa) setTimeout(() => wa.classList.add('show'), introDelay + 600);

  /* ---------- Accessibility panel ---------- */
  const aBtn = document.querySelector('.a11y-btn');
  const aPanel = document.getElementById('a11y-panel');
  if (aBtn && aPanel) {
    const sync = () => aPanel.querySelectorAll('[data-a11y]').forEach(b => b.setAttribute('aria-pressed', doc.classList.contains(b.dataset.a11y)));
    const close = () => { aPanel.hidden = true; aBtn.setAttribute('aria-expanded', 'false'); };
    aBtn.addEventListener('click', () => {
      const open = aPanel.hidden;
      aPanel.hidden = !open; aBtn.setAttribute('aria-expanded', open);
      if (open) aPanel.querySelector('button')?.focus();
    });
    aPanel.addEventListener('click', e => {
      const b = e.target.closest('[data-a11y]');
      if (b) {
        const on = doc.classList.toggle(b.dataset.a11y);
        store.set(b.dataset.a11y, on ? '1' : null);
        if (b.dataset.a11y === 'a11y-still' && on) revealEls.forEach(show);
        sync();
      }
      if (e.target.closest('[data-a11y-reset]')) { A11Y_KEYS.forEach(k => { doc.classList.remove(k); store.set(k, null); }); sync(); }
      if (e.target.closest('[data-a11y-close]')) { close(); aBtn.focus(); }
    });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !aPanel.hidden) { close(); aBtn.focus(); } });
    sync();
  }

  /* ---------- Forms ---------- */
  document.querySelectorAll('.field input, .field textarea').forEach(inp => {
    const upd = () => inp.closest('.field').classList.toggle('filled', !!inp.value);
    inp.addEventListener('input', upd); inp.addEventListener('blur', upd); upd();
  });
  document.querySelectorAll('form[data-mailto]').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      let first = null;
      form.querySelectorAll('[required]').forEach(inp => {
        const err = document.getElementById(inp.getAttribute('aria-describedby')?.split(' ')[0]);
        let msg = '';
        if (!inp.value.trim()) msg = T.required;
        else if (inp.type === 'tel' && !/^[0-9+\-\s()]{9,}$/.test(inp.value.trim())) msg = T.badTel;
        inp.setAttribute('aria-invalid', !!msg);
        if (err) err.textContent = msg;
        if (msg && !first) first = inp;
      });
      const status = form.querySelector('.form-status');
      if (first) { status.textContent = ''; first.focus(); return; }
      const data = new FormData(form);
      const isSupport = !!form.querySelector('[name=system]');
      const btn = form.querySelector('[type=submit]');
      const btnHtml = btn.innerHTML;
      btn.disabled = true; btn.textContent = T.sending;
      const result = await sendLead({
        form: isSupport ? 'support' : 'contact', name: data.get('name'), tel: data.get('tel'), email: data.get('email'),
        topic: data.get('topic') || '', system: data.get('system') || '', message: data.get('message'), website: data.get('website')
      });
      btn.disabled = false; btn.innerHTML = btnHtml;
      track('form_submit', { form: isSupport ? 'support' : 'contact', topic: data.get('topic') || data.get('system') || '', delivered: result.ok ? 'direct' : 'email_app' });
      status.classList.remove('failed');
      if (result.ok) {
        form.reset(); form.querySelectorAll('.field').forEach(f => f.classList.remove('filled'));
        status.textContent = T.received;
        return;
      }
      const lines = [];
      form.querySelectorAll('input, textarea, select').forEach(inp => {
        if (!inp.name || inp.name === 'website' || !data.get(inp.name)) return;
        const lbl = form.querySelector(`label[for="${inp.id}"]`)?.textContent.replace('*', '').trim() || (inp.name === 'topic' ? (EN ? 'Topic' : 'תחום') : inp.name);
        lines.push(`${lbl}: ${data.get(inp.name)}`);
      });
      // Delivery failed: never pretend it was sent. Offer WhatsApp (with the details filled in) and the phone.
      const subject = form.dataset.subject || (EN ? 'Website enquiry' : 'פנייה מהאתר');
      const wa = 'https://wa.me/972555530490?text=' + encodeURIComponent(subject + String.fromCharCode(10) + lines.join(String.fromCharCode(10)));
      status.textContent = '';
      status.classList.add('failed');
      status.append(T.failed + ' ');
      const a = document.createElement('a');
      a.href = wa; a.target = '_blank'; a.rel = 'noopener'; a.textContent = T.failedWa;
      const tel = document.createElement('a');
      tel.href = 'tel:+97225900046'; tel.dir = 'ltr'; tel.textContent = EN ? '+972 2-5900046' : '02-5900046';
      status.append(a, ' ' + T.failedOr + ' ', tel);
      try { window.open(wa, '_blank', 'noopener'); } catch (err) {}
    });
  });


  /* ---------- Project planner ---------- */
  document.querySelectorAll('form[data-planner]').forEach(form => {
    const root = form.closest('.planner');
    const steps = [...form.querySelectorAll('.step')];
    const TOTAL = 4;
    const bar = root.querySelector('.planner-bar i');
    const count = root.querySelector('[data-step-count]');
    const back = form.querySelector('[data-back]');
    const nextBtn = form.querySelector('[data-next]');
    const err = form.querySelector('[data-step-err]');
    const nav = form.querySelector('[data-nav]');
    let cur = 1, started = false;

    const show = n => {
      cur = n;
      steps.forEach(s => s.classList.toggle('on', +s.dataset.step === n));
      bar.style.width = Math.min(n, TOTAL) / TOTAL * 100 + '%';
      count.textContent = n <= TOTAL ? form.dataset.stepTpl.replace('{n}', n).replace('{t}', TOTAL) : form.dataset.done;
      back.hidden = n === 1 || n > TOTAL;
      nav.style.display = n > TOTAL ? 'none' : '';
      nextBtn.querySelector('span').textContent = n === TOTAL ? form.dataset.lSend : form.dataset.lNext;
      err.textContent = '';
      scrollTo({ top: 0, behavior: still() ? 'auto' : 'smooth' });
      setTimeout(() => steps[n - 1].querySelector('[tabindex="-1"]')?.focus({ preventScroll: true }), 60);
      if (n > 1 && n <= TOTAL) track('planner_step', { step: n });
    };

    const valid = () => {
      const step = steps[cur - 1];
      for (const grp of step.querySelectorAll('[data-required]')) {
        if (!grp.closest('fieldset').querySelector('input:checked')) {
          err.textContent = grp.querySelector('input').type === 'checkbox' ? T.pickAny : T.pickOne;
          grp.querySelector('input').focus();
          return false;
        }
      }
      let first = null;
      step.querySelectorAll('input[required]').forEach(inp => {
        let m = '';
        if (!inp.value.trim()) m = T.required;
        else if (inp.type === 'tel' && !/^[0-9+\-\s()]{9,}$/.test(inp.value.trim())) m = T.badTel;
        inp.setAttribute('aria-invalid', !!m);
        document.getElementById(inp.getAttribute('aria-describedby')).textContent = m;
        if (m && !first) first = inp;
      });
      if (first) { first.focus(); return false; }
      return true;
    };

    form.addEventListener('change', e => {
      err.textContent = '';
      if (!started) { started = true; track('planner_start'); }
      if (e.target.closest('[data-auto]') && cur === 1) setTimeout(() => { if (cur === 1) show(2); }, 380);
    });
    back.addEventListener('click', () => show(cur - 1));
    form.querySelector('[data-planner-restart]')?.addEventListener('click', () => { form.reset(); form.querySelectorAll('.field').forEach(f => f.classList.remove('filled')); show(1); });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!valid()) return;
      if (cur < TOTAL) { show(cur + 1); return; }
      const d = new FormData(form);
      const rows = [['name', d.get('name')], ['tel', d.get('tel')], ['city', d.get('city')], ['property', d.get('property')],
        ['systems', d.getAll('systems').join(', ')], ['stage', d.get('stage')], ['when', d.get('when')], ['pref', d.get('pref')], ['notes', d.get('notes')]]
        .map(([k, v]) => [T.sum[k], (v || '').trim() || T.none]);
      const dl = form.querySelector('[data-summary]');
      dl.innerHTML = '';
      rows.forEach(([k, v]) => { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; dl.append(dt, dd); });
      const first = (d.get('name') || '').trim().split(/\s+/)[0];
      const text = T.plannerIntro + '\n\n' + rows.map(([k, v]) => `${k}: ${v}`).join('\n');
      const label = nextBtn.querySelector('span');
      nextBtn.disabled = true; label.textContent = T.sending;
      const result = await sendLead({
        form: 'planner', name: d.get('name'), tel: d.get('tel'), city: d.get('city'), property: d.get('property'),
        systems: d.getAll('systems'), stage: d.get('stage'), when: d.get('when'), pref: d.get('pref'), notes: d.get('notes'), website: d.get('website')
      });
      nextBtn.disabled = false;
      const done = steps[4];
      const h = done.querySelector('[data-thanks]');
      const hint = done.querySelector('[data-hint]');
      const mode = result.ok ? 'ok' : 'fb';
      h.textContent = h.dataset[mode + 'Title'].replace('{name}', first ? ', ' + first : '');
      hint.textContent = hint.dataset[mode];
      done.querySelector('[data-fallback]').hidden = result.ok;
      form.querySelector('[data-planner-wa]').href = 'https://wa.me/972555530490?text=' + encodeURIComponent(text);
      track('form_submit', { form: 'planner', property: d.get('property') || '', systems: d.getAll('systems').join('|'), delivered: result.ok ? 'direct' : 'email_app' });
      show(5);
      if (!result.ok) setTimeout(() => { location.href = `mailto:office@vayacom.co.il?subject=${encodeURIComponent(T.plannerSubject)}&body=${encodeURIComponent(text)}`; }, 400);
    });
  });

  /* ---------- Home hero: "enter the house" ---------- */
  (() => {
    const hero = document.querySelector('.hero-house');
    const dataEl = document.getElementById('house-data');
    if (!hero || !dataEl) return;
    const { msg: M, pts: D } = JSON.parse(dataEl.textContent);
    const media = hero.querySelector('.hero-media'), stage = hero.querySelector('[data-stage]'), ph = stage.querySelector('.ph');
    const panel = hero.querySelector('.scene-panel');
    const BASE = 'translate(-50%,-50%) translate(0px,0px) scale(1)';
    const phone = () => matchMedia('(max-width:900px)').matches;
    let cur = null, intent = null, step = null, hdDone = false;
    const loadHD = () => { if (hdDone) return; hdDone = true; const i = new Image(); i.onload = () => { ph.src = ph.dataset.hd; }; i.src = ph.dataset.hd; };
    // zoom the photo so that point (lx, ly) lands at the free side of the hero, without ever showing an edge
    const place = (lx, ly, z) => {
      const R = media.getBoundingClientRect();
      const w = Math.max(R.width, R.height * 2200 / 1711), h = w * 1711 / 2200;
      const left0 = R.left + R.width / 2 - w / 2, top0 = R.top + R.height / 2 - h / 2;
      const tx = R.left + R.width * (phone() ? .5 : (EN ? .66 : .34)), ty = R.top + R.height * .5;
      let ex = tx - left0 - z * w * lx / 100, ey = ty - top0 - z * h * ly / 100;
      const L = left0 + ex, T = top0 + ey;
      if (L > R.left) ex -= L - R.left; if (L + z * w < R.right) ex += R.right - (L + z * w);
      if (T > R.top) ey -= T - R.top; if (T + z * h < R.bottom) ey += R.bottom - (T + z * h);
      stage.style.transform = `translate(-50%,-50%) translate(${ex.toFixed(1)}px,${ey.toFixed(1)}px) scale(${z})`;
      media.style.setProperty('--tx', (left0 + ex + z * w * lx / 100 - R.left).toFixed(1) + 'px');
      media.style.setProperty('--ty', (top0 + ey + z * h * ly / 100 - R.top).toFixed(1) + 'px');
    };
    const show = k => {
      const d = D[k];
      if (k === 'cctv') {
        // first fly to the camera on the corner, then look at the entrance the way it does
        const cam = hero.querySelector('.hs[data-k="cctv"]');
        const cx = parseFloat(cam.style.left), cy = parseFloat(cam.style.top);
        hero.classList.remove('pov-on');
        place(cx, cy, 2);
        clearTimeout(step);
        step = setTimeout(() => { if (cur !== 'cctv') return; hero.classList.add('pov-on'); place(d.lx, d.ly, d.z); }, still() ? 0 : 950);
      } else { hero.classList.remove('pov-on'); place(d.lx, d.ly, d.z); }
    };
    const enter = k => {
      if (cur === k) return;
      loadHD();
      if (cur) hero.classList.remove('in-' + cur);
      cur = k;
      const d = D[k];
      hero.classList.add('in-scene', 'in-' + k);
      hero.querySelectorAll('.hud').forEach(h => { const on = h.dataset.hud === k; h.hidden = !on; h.classList.remove('on'); if (on) { void h.offsetWidth; h.classList.add('on'); } });
      panel.hidden = false;
      panel.querySelector('[data-sp-k]').textContent = M.kicker;
      panel.querySelector('[data-sp-t]').textContent = d.name;
      panel.querySelector('[data-sp-l]').textContent = d.line;
      const go = panel.querySelector('[data-sp-go]'); go.href = d.href; go.textContent = M.more + d.name;
      hero.querySelectorAll('.sp-nav [data-k], .hs-row [data-k]').forEach(b => b.setAttribute('aria-current', b.dataset.k === k));
      show(k);
      track('house_point', { point: k });
    };
    const leave = () => {
      if (!cur) return;
      clearTimeout(step);
      hero.classList.remove('in-scene', 'in-' + cur, 'pov-on');
      cur = null;
      stage.style.transform = BASE;
      hero.querySelectorAll('.hud').forEach(h => { h.classList.remove('on'); h.hidden = true; });
      hero.querySelectorAll('[aria-current]').forEach(b => b.setAttribute('aria-current', 'false'));
      setTimeout(() => { if (!cur) panel.hidden = true; }, 450);
    };
    hero.querySelectorAll('.hs').forEach(a => {
      a.addEventListener('mouseenter', () => { clearTimeout(intent); intent = setTimeout(() => enter(a.dataset.k), 280); });
      a.addEventListener('mouseleave', () => clearTimeout(intent));
      a.addEventListener('click', e => { e.preventDefault(); clearTimeout(intent); enter(a.dataset.k); });
    });
    hero.querySelectorAll('.sp-nav [data-k], .hs-row button[data-k]').forEach(b => b.addEventListener('click', () => {
      enter(b.dataset.k);
      if (phone()) hero.scrollIntoView({ behavior: still() ? 'auto' : 'smooth' });
    }));
    hero.querySelector('[data-back]').addEventListener('click', leave);
    media.addEventListener('click', e => { if (cur && !e.target.closest('.hud-card, .hs')) leave(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') leave(); });
    addEventListener('resize', () => { if (cur) show(cur); });
    // the small live parts of each scene
    const clock = hero.querySelector('[data-clock]');
    const tick = () => { clock.textContent = new Date().toLocaleTimeString(EN ? 'en-GB' : 'he-IL', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }); };
    tick(); setInterval(tick, 1000);
    hero.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const a = b.dataset.act, box = b.closest('.hud');
      if (a === 'open') box.querySelector('[data-status]').textContent = M.opened;
      if (a === 'talk') box.querySelector('[data-status]').textContent = M.talking;
      if (a === 'play') { const p = box.classList.toggle('paused'); b.textContent = p ? M.play : M.pause; b.setAttribute('aria-pressed', !p); }
      if (a === 'scene') { const r = box.querySelector('[data-dim]'); r.value = 35; r.dispatchEvent(new Event('input')); }
      if (a === 'arm') { const off = box.classList.toggle('off'); box.querySelector('[data-astate]').textContent = off ? M.disarmed : M.armed; b.textContent = off ? M.arm : M.disarm; }
    }));
    const dim = hero.querySelector('[data-dim]');
    dim.addEventListener('input', () => { const v = dim.value / 100; hero.style.setProperty('--bright', (.55 + v * .6).toFixed(2)); hero.style.setProperty('--lamp', v.toFixed(2)); });
    dim.dispatchEvent(new Event('input'));
  })();

  /* ---------- The house lights come on as you scroll ----------
     A dark copy of the hero photo sits on top. Scrolling the first half of the
     hero turns on the garden, the ground floor and the upper floor in
     overlapping steps, then the whole scene brightens. The value follows the
     scroll with easing, so it never jumps or stalls, and it runs backwards
     when you scroll back up. Exploring the house (its points, its pictures)
     turns everything on at once. Skipped under reduced motion. */
  (() => {
    const hero = document.querySelector('.hero-house');
    const L = hero && hero.querySelector('.lights');
    if (!L) return;
    if (still()) { L.remove(); const r = hero.parentElement.querySelector('.hero-pin-room'); if (r) r.remove(); return; }
    // a reload always starts at the top, in the dark, instead of jumping back to where the visitor was
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const media = hero.querySelector('.hero-media');
    const off = L.querySelector('.l-off'), zones = [...L.querySelectorAll('.l-z')];
    const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    // [from, to] in scroll progress for each zone, overlapping so the light never stands still
    const RANGES = [[0, 0.38], [0.18, 0.6], [0.38, 0.8]];
    let cur = -1, target = 0, locked = false, raf = 0;
    // the hero is sticky inside .hero-pin; the empty .hero-pin-room under it is the scroll that turns the lights on,
    // so the page does not move on until the house is fully lit. A hero taller than the screen (phones) sticks
    // with its bottom edge on the screen's bottom edge, so nothing of it is hidden.
    const pin = hero.parentElement, room = pin.querySelector('.hero-pin-room');
    let pinTop = 0;
    const layout = () => { pinTop = Math.min(0, innerHeight - hero.offsetHeight); pin.style.setProperty('--pin-top', pinTop + 'px'); };
    const measure = () => {
      if (locked) { target = 1; return; }
      const p = room && room.offsetHeight ? (-pin.getBoundingClientRect().top + pinTop) / room.offsetHeight : scrollY / (media.offsetHeight * 0.5);
      target = Math.min(1, Math.max(0, p / 0.5));      // fully lit halfway through the pinned scroll; the second half is a pause on the lit house
      if (target >= 1) locked = true;                  // once fully lit it stays lit, until the page is reloaded
    };
    // After the house is fully lit the pinned scroll has no job left: remove it (once the scrolling has
    // stopped, so a finger's momentum is never cut) and shift the scroll by the same amount, so nothing on
    // screen moves. Scrolling back up then goes straight to the lit house, with no dead stretch.
    let idle = 0;
    const collapse = () => {
      if (!room || !room.isConnected || cur < 1) return;
      if (-pin.getBoundingClientRect().top + pinTop < room.offsetHeight) return;   // still inside the pause: keep it
      // the target is taken before the removal: browsers may already shift the scroll on their own when
      // content above disappears (scroll anchoring), so a relative correction could apply twice
      const goal = Math.max(0, scrollY - room.offsetHeight);
      room.remove();
      pin.style.removeProperty('--pin-top');
      scrollTo({ top: goal, behavior: 'instant' });
      L.remove();
    };
    const collapseSoon = () => { clearTimeout(idle); if (locked && cur >= 1) idle = setTimeout(collapse, 220); };
    const paint = v => {
      zones.forEach((z, i) => { z.style.opacity = smooth(RANGES[i][0], RANGES[i][1], v).toFixed(3); });
      L.style.opacity = (1 - smooth(0.55, 1, v)).toFixed(3);
    };
    const tick = () => {
      raf = 0;
      if (cur < 0) cur = target;                       // first paint: no animation from zero
      cur += (target - cur) * 0.12;
      if (Math.abs(target - cur) < 0.0015) cur = target;
      paint(cur);
      if (cur !== target) raf = requestAnimationFrame(tick); else collapseSoon();
    };
    const kick = () => { if (!L.isConnected) return; measure(); collapseSoon(); if (!raf) raf = requestAnimationFrame(tick); };
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', () => { layout(); kick(); });
    layout();
    // anyone exploring the house sees it lit
    const lockOn = sel => e => { if (locked || !e.target.closest(sel)) return; locked = true; kick(); };
    const POINTS = '.hs, .hs-row, .scene-panel';
    hero.addEventListener('pointerover', lockOn(POINTS));            // hovering a point, not just the photo
    hero.addEventListener('focusin', lockOn(POINTS));
    hero.addEventListener('pointerdown', lockOn(POINTS + ', [data-stage]'));
    kick();
  })();

  /* ---------- Work process: the gold line fills as you scroll ---------- */
  document.querySelectorAll('.process').forEach(list => {
    const items = [...list.children];
    list.classList.add('proc-fill');
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = innerHeight, r = list.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.82 - r.top) / Math.max(r.height + vh * 0.25, 1)));
      list.style.setProperty('--fill', p.toFixed(3));
      const row = matchMedia('(min-width:860px)').matches;   // one row: stages light with the line
      items.forEach((li, i) => li.classList.toggle('lit', row ? p > (i + 0.3) / items.length : li.getBoundingClientRect().top < vh * 0.72));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  });

  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();
