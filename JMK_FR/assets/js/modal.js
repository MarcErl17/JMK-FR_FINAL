/* Landing page: auth modal (login / sign up) + scroll reveal. Talks to the server through JMKAuth (auth.js). */
(function () {
    'use strict';
    var modal = document.getElementById('auth-modal'); if (!modal) { return; }
    var $ = function (id) { return document.getElementById(id); };
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, USER = /^[A-Za-z0-9_.]{3,30}$/;
    var panes = { login: $('pane-login'), signup: $('pane-signup') }, tabs = modal.querySelectorAll('.modal-tabs button'), last;

    function show(el, type, items) {
        el.className = 'm-msg ' + type; el.textContent = '';
        if (items.length === 1) { el.textContent = items[0]; return; }
        var ul = document.createElement('ul'); items.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); }); el.appendChild(ul);
    }
    function clear(el) { el.className = 'm-msg'; el.textContent = ''; }
    function bad(input, msg) { input.classList.toggle('invalid', !!msg); var s = input.closest('.m-field').querySelector('.m-err'); if (s) { s.textContent = msg || ''; } return !msg; }
    function busy(form, on, label) { var b = form.querySelector('button[type=submit]'); if (on) { b.dataset.l = b.textContent; b.textContent = label; } else { b.textContent = b.dataset.l || b.textContent; } b.disabled = on; }

    function open(which) {
        last = document.activeElement; modal.classList.add('open'); document.body.classList.add('no-scroll'); switchTo(which || 'login');
    }
    function close() { modal.classList.remove('open'); document.body.classList.remove('no-scroll'); if (last && last.focus) { last.focus(); } }
    function switchTo(which, msg) {
        Object.keys(panes).forEach(function (k) { panes[k].hidden = k !== which; });
        Array.prototype.forEach.call(tabs, function (t) { t.classList.toggle('active', t.dataset.tab === which); });
        clear($('m-login-msg')); clear($('m-signup-msg')); if (msg) { show($('m-login-msg'), 'success', [msg]); }
        var f = panes[which].querySelector('input'); setTimeout(function () { f.focus(); }, 30);
    }

    document.addEventListener('click', function (e) {
        var t = e.target.closest('[data-auth]'); if (t) { e.preventDefault(); open(t.dataset.auth); return; }
        if (e.target === modal || e.target.closest('.modal-x')) { close(); }
        var sw = e.target.closest('[data-switch]'); if (sw) { e.preventDefault(); switchTo(sw.dataset.switch); }
        var pw = e.target.closest('.m-pw button'); if (pw) { var i = pw.previousElementSibling, show_ = i.type === 'password'; i.type = show_ ? 'text' : 'password'; pw.textContent = show_ ? 'Hide' : 'Show'; }
    });
    Array.prototype.forEach.call(tabs, function (t) { t.addEventListener('click', function () { switchTo(t.dataset.tab); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); } });
    if (location.hash === '#login' || location.hash === '#signup') { open(location.hash.slice(1)); }

    /* ---- login ---- */
    var lf = $('m-login-form');
    lf.addEventListener('submit', function (e) {
        e.preventDefault(); var id = $('m-identifier'), pw = $('m-password'), msg = $('m-login-msg');
        clear(msg); var ok = bad(id, id.value.trim() ? '' : 'Enter your email or username.'); ok = bad(pw, pw.value ? '' : 'Enter your password.') && ok;
        if (!ok) { show(msg, 'error', ['Please enter your email/username and password.']); return; }
        busy(lf, true, 'Logging in\u2026');
        JMKAuth.login(id.value, pw.value, lf.elements.remember.checked).then(function (r) {
            if (r.ok) { show(msg, 'success', ['Welcome back, ' + JMKAuth.firstName(r.user) + '!']); JMKAuth.flash('success', 'Welcome back, ' + JMKAuth.firstName(r.user) + '! You are now logged in.'); setTimeout(function () { location.href = 'index.html'; }, 600); }
            else { busy(lf, false); pw.value = ''; show(msg, 'error', [r.error || 'Login failed.']); pw.focus(); }
        });
    });

    /* ---- sign up ---- */
    var sf = $('m-signup-form');
    sf.addEventListener('submit', function (e) {
        e.preventDefault(); var g = function (n) { return sf.elements[n]; }, msg = $('m-signup-msg'); clear(msg);
        var v = [
            bad(g('full_name'), g('full_name').value.trim().length < 2 ? 'Enter your full name.' : ''),
            bad(g('username'), USER.test(g('username').value.trim()) ? '' : '3-30 characters: letters, numbers, _ or .'),
            bad(g('email'), EMAIL.test(g('email').value.trim()) ? '' : 'Enter a valid email address.'),
            bad(g('password'), g('password').value.length >= 8 && /[A-Za-z]/.test(g('password').value) && /\d/.test(g('password').value) ? '' : 'At least 8 characters with a letter and a number.'),
            bad(g('confirm'), g('confirm').value && g('confirm').value === g('password').value ? '' : 'Passwords do not match.')
        ];
        if (!g('terms').checked) { v.push(false); show(msg, 'error', ['You must accept the Terms and Conditions.']); }
        if (v.indexOf(false) !== -1) { if (!msg.textContent) { show(msg, 'error', ['Please fix the highlighted fields.']); } return; }
        busy(sf, true, 'Creating account\u2026');
        JMKAuth.register({ fullName: g('full_name').value, username: g('username').value, email: g('email').value, password: g('password').value, confirm: g('confirm').value, terms: true }).then(function (r) {
            busy(sf, false);
            if (r.ok) { var u = r.username; sf.reset(); $('m-identifier').value = u; switchTo('login', 'Account created! Log in with your new credentials.'); $('m-password').focus(); }
            else { show(msg, 'error', r.errors || [r.error || 'Registration failed.']); }
        });
    });

    document.addEventListener('jmk:ready', function () { if (JMKAuth.currentUser()) { Array.prototype.forEach.call(document.querySelectorAll('[data-guest-only]'), function (n) { n.hidden = true; }); } });

    /* ---- scroll reveal ---- */
    var items = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }); }, { threshold: .15 });
        items.forEach(function (n) { io.observe(n); });
    } else { items.forEach(function (n) { n.classList.add('in'); }); }
})();
