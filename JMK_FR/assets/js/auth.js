/* JMK FR FOODHOUSE - Login / Sign Up client. All accounts, password hashing and sessions live on the
 * server (api/auth.php + MySQL). This file only validates input, calls the API and renders messages. */
(function () {
    'use strict';

    var USERS_KEY = 'jmkUsers', SESSION_KEY = 'jmkSession', FLASH_KEY = 'jmkFlash',
        OLD_KEY = 'jmkOld', ATTEMPTS_KEY = 'jmkAttempts';
    var REMEMBER_DAYS = 30, MAX_ATTEMPTS = 5, LOCK_MINUTES = 15, PBKDF2_ITERATIONS = 150000;
    var ALLOWED_NEXT = ['index.html', 'product.html', 'cart.html', 'contact.html', 'aboutus.html', 'account.html', 'profile.html'];
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, USER_RE = /^[A-Za-z0-9_.]{3,30}$/;

    var ss = function () { return window.sessionStorage; };
    function read(store, key, fallback) { try { var v = store.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } }
    function write(store, key, value) { try { store.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; } }
    function remove(store, key) { try { store.removeItem(key); } catch (e) {} }
    function flash(type, text) {
        var list = read(ss(), FLASH_KEY, []); list.push({ type: type, text: text }); write(ss(), FLASH_KEY, list);
    }
    function takeFlash() { var l = read(ss(), FLASH_KEY, []); remove(ss(), FLASH_KEY); return l; }
    function takeOld() { var o = read(ss(), OLD_KEY, {}); remove(ss(), OLD_KEY); return o; }

    /* ---------- server session ---------- */
    var API = 'api/auth.php', ME = null;
    function call(action, body) {
        return fetch(API + '?action=' + action, { method: 'POST', credentials: 'same-origin', keepalive: true,
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
            .then(function (r) { return r.json(); })
            .catch(function () { return { ok: false, error: 'Cannot reach the server. Open the site through XAMPP (http://localhost/...), not by double-clicking the file.', errors: ['Cannot reach the server. Open the site through XAMPP (http://localhost/...), not by double-clicking the file.'] }; });
    }
    function currentUser() { return ME; }
    function logout() { ME = null; return call('logout'); }
    function safeNext(n) { return ALLOWED_NEXT.indexOf(n) !== -1 ? n : 'index.html'; }
    function firstName(u) { return (u.fullName || '').trim().split(/\s+/)[0] || u.username; }

    /* ---------- login rate limiting (client-side: slows casual guessing only) ---------- */
    function register(d) {
        return call('register', { fullName: d.fullName, username: d.username, email: d.email, password: d.password, confirm: d.confirm, terms: !!d.terms })
            .then(function (r) { if (!r.errors && !r.ok) { r.errors = [r.error || 'Registration failed.']; } return r; });
    }
    function login(identifier, password, remember) {
        if (!(identifier || '').trim() || !password) { return Promise.resolve({ ok: false, error: 'Please enter your email/username and password.' }); }
        return call('login', { identifier: identifier.trim(), password: password, remember: !!remember })
            .then(function (r) { if (r.ok) { ME = r.user; } return r; });
    }

    window.JMKAuth = { register: register, login: login, logout: logout, currentUser: currentUser, flash: flash, firstName: firstName, ready: null };

    /* ======================= page behaviour (needs the DOM) ======================= */
    function $(id) { return document.getElementById(id); }
    function el(tag, cls, text) { var n = document.createElement(tag); if (cls) { n.className = cls; } if (text) { n.textContent = text; } return n; }

    function renderNav() {
        var nav = document.querySelector('header nav');
        if (!nav || nav.querySelector('.nav-auth')) { return; }
        var u = currentUser();
        if (!u) { Array.prototype.forEach.call(nav.querySelectorAll('a:not(.nav-auth)'), function (a) { a.remove(); }); }
        function link(href, text, cls) { var a = el('a', 'nav-auth ' + (cls || ''), text); a.href = href; nav.appendChild(a); return a; }
        if (u) { link('profile.html', 'Hi, ' + firstName(u), 'nav-user'); link('#', 'Logout').addEventListener('click', function (e) {
            e.preventDefault(); logout().then(function () { flash('success', 'You have been logged out.'); window.location.href = 'landing.html'; }); }); }
        else { if (document.body.getAttribute('data-page') !== 'landing') { link('landing.html', 'Home'); } link('login.html', 'Login').setAttribute('data-auth', 'login'); link('signup.html', 'Sign Up', 'nav-signup').setAttribute('data-auth', 'signup'); }
    }

    function renderBanner() {
        var header = document.querySelector('header');
        if (!header || document.body.getAttribute('data-page')) { return; }   // auth pages show messages inside the card
        takeFlash().forEach(function (m) {
            var d = el('div', 'site-flash site-flash-' + m.type, m.text); d.setAttribute('role', 'status');
            header.parentNode.insertBefore(d, header.nextSibling);
        });
    }

    function showMessages(list) {
        var box = document.querySelector('.messages'); if (!box) { return; }
        box.innerHTML = '';
        var errs = list.filter(function (m) { return m.type === 'error'; });
        list.filter(function (m) { return m.type !== 'error'; }).forEach(function (m) {
            var d = el('div', 'alert alert-' + m.type, m.text); d.setAttribute('role', 'status'); box.appendChild(d);
        });
        if (errs.length === 1) { var d1 = el('div', 'alert alert-error', errs[0].text); d1.setAttribute('role', 'alert'); box.appendChild(d1); }
        else if (errs.length > 1) {
            var d2 = el('div', 'alert alert-error'); d2.setAttribute('role', 'alert');
            d2.appendChild(el('strong', '', 'Please fix the following:'));
            var ul = el('ul'); errs.forEach(function (m) { ul.appendChild(el('li', '', m.text)); }); d2.appendChild(ul); box.appendChild(d2);
        }
        if (list.length) { box.scrollIntoView && box.scrollIntoView({ block: 'nearest' }); }
    }

    function setError(input, message) {
        var h = document.querySelector('.field-error[data-for="' + input.id + '"]'); if (h) { h.textContent = message || ''; }
        input.classList.toggle('invalid', !!message);
        if (message) { input.setAttribute('aria-invalid', 'true'); } else { input.removeAttribute('aria-invalid'); }
    }
    function setTermsError(m) { var h = document.querySelector('.field-error[data-for="terms"]'); if (h) { h.textContent = m || ''; } }

    function wirePasswordToggles() {
        Array.prototype.forEach.call(document.querySelectorAll('.toggle-pw'), function (btn) {
            btn.addEventListener('click', function () {
                var input = $(btn.getAttribute('data-target')); if (!input) { return; }
                var show = input.type === 'password';
                input.type = show ? 'text' : 'password'; btn.textContent = show ? 'Hide' : 'Show';
                btn.setAttribute('aria-pressed', show ? 'true' : 'false'); btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
            });
        });
    }
    function busy(form, on, label) {
        var b = form.querySelector('button[type="submit"]'); if (!b) { return; }
        if (on) { b.setAttribute('data-label', b.textContent); b.textContent = label; b.disabled = true; }
        else { b.textContent = b.getAttribute('data-label') || b.textContent; b.disabled = false; }
    }

    function initLogin() {
        var form = $('login-form'); if (!form) { return; }
        var params = new URLSearchParams(window.location.search), next = safeNext(params.get('next'));
        if (currentUser()) { window.location.replace(next); return; }
        var old = takeOld(); if (old.identifier) { $('identifier').value = old.identifier; }
        var pending = takeFlash(); if (pending.length) { showMessages(pending); }
        var id = $('identifier'), pw = $('password');

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            setError(id, ''); setError(pw, '');
            var bad = false;
            if (!id.value.trim()) { setError(id, 'Please enter your email or username.'); bad = true; }
            if (!pw.value) { setError(pw, 'Please enter your password.'); bad = true; }
            if (bad) {
                showMessages([{ type: 'error', text: 'Please enter your email/username and password.' }]);
                (id.value.trim() ? pw : id).focus(); return;
            }
            busy(form, true, 'Logging in\u2026');
            login(id.value, pw.value, form.elements.remember.checked).then(function (r) {
                if (r.ok) {
                    flash('success', 'Welcome back, ' + firstName(r.user) + '! You are now logged in.');
                    window.location.href = next;
                } else { busy(form, false); pw.value = ''; showMessages([{ type: 'error', text: r.error }]); pw.focus(); }
            }).catch(function () { busy(form, false); showMessages([{ type: 'error', text: 'Something went wrong. Please try again.' }]); });
        });
    }

    function initSignup() {
        var form = $('signup-form'); if (!form) { return; }
        if (currentUser()) { window.location.replace('index.html'); return; }
        var f = { full_name: $('full_name'), username: $('username'), email: $('email'), password: $('password'), confirm: $('confirm_password'), terms: $('terms') };
        var meter = $('pw-strength');
        function strength(v) { var s = 0; if (v.length >= 8) { s++; } if (/[A-Za-z]/.test(v) && /\d/.test(v)) { s++; } if (v.length >= 12 || /[^A-Za-z0-9]/.test(v)) { s++; } return v ? Math.max(1, s) : 0; }

        function checkName() { var v = f.full_name.value.trim(); setError(f.full_name, !v ? 'Please enter your full name.' : v.length < 2 ? 'Full name is too short.' : ''); return !f.full_name.classList.contains('invalid'); }
        function checkUser() { var v = f.username.value.trim(); setError(f.username, !v ? 'Please choose a username.' : !USER_RE.test(v) ? '3-30 characters: letters, numbers, _ or . only.' : ''); return !f.username.classList.contains('invalid'); }
        function checkEmail() { var v = f.email.value.trim(); setError(f.email, !v ? 'Please enter your email address.' : !EMAIL_RE.test(v) ? 'Please enter a valid email address.' : ''); return !f.email.classList.contains('invalid'); }
        function checkPw() { var v = f.password.value, m = ''; if (!v) { m = 'Please create a password.'; } else if (v.length < 8) { m = 'Password must be at least 8 characters.'; } else if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) { m = 'Include at least one letter and one number.'; } setError(f.password, m); return !m; }
        function checkConfirm() { var m = ''; if (!f.confirm.value) { m = 'Please confirm your password.'; } else if (f.confirm.value !== f.password.value) { m = 'Passwords do not match.'; } setError(f.confirm, m); return !m; }
        function checkTerms() { var ok = f.terms.checked; setTermsError(ok ? '' : 'You must accept the Terms and Conditions.'); return ok; }

        f.password.addEventListener('input', function () { if (meter) { meter.setAttribute('data-level', String(strength(f.password.value))); } if (f.confirm.value) { checkConfirm(); } });
        [[f.full_name, checkName], [f.username, checkUser], [f.email, checkEmail], [f.password, checkPw], [f.confirm, checkConfirm]].forEach(function (p) {
            p[0].addEventListener('blur', p[1]);
            p[0].addEventListener('input', function () { if (p[0].classList.contains('invalid')) { p[1](); } });
        });
        f.terms.addEventListener('change', checkTerms);
        var tl = $('terms-link'), tb = $('terms-text'); if (tl && tb) { tl.addEventListener('click', function (e) { e.preventDefault(); tb.open = !tb.open; }); }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var ok = [checkName(), checkUser(), checkEmail(), checkPw(), checkConfirm(), checkTerms()].indexOf(false) === -1;
            if (!ok) { var bad = form.querySelector('input.invalid') || f.terms; bad.focus(); return; }
            busy(form, true, 'Creating account\u2026');
            register({ fullName: f.full_name.value, username: f.username.value, email: f.email.value, password: f.password.value, confirm: f.confirm.value, terms: f.terms.checked }).then(function (r) {
                if (r.ok) {
                    flash('success', 'Your account has been created successfully! You can now log in.');
                    write(ss(), OLD_KEY, { identifier: r.username });
                    window.location.href = 'login.html';
                } else { busy(form, false); showMessages(r.errors.map(function (t) { return { type: 'error', text: t }; })); }
            }).catch(function () { busy(form, false); showMessages([{ type: 'error', text: 'Something went wrong. Please try again.' }]); });
        });
    }

    function initAccount() {
        var box = $('account-details'); if (!box) { return; }
        var u = currentUser();
        if (!u) { flash('error', 'Please log in to view that page.'); window.location.replace('login.html?next=account.html'); return; }   // protected page
        var rec = u;
        [['Full name', rec.fullName], ['Username', rec.username], ['Email', rec.email],
         ['Member since', new Date(rec.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })]].forEach(function (row) {
            box.appendChild(el('dt', '', row[0])); box.appendChild(el('dd', '', row[1]));
        });
        $('logout-btn').addEventListener('click', function (e) { e.preventDefault(); logout().then(function () { flash('success', 'You have been logged out.'); window.location.href = 'landing.html'; }); });
        $('account-body').hidden = false;
    }

    var MEMBER_PAGES = ['index.html', 'product.html', 'cart.html', 'contact.html', 'aboutus.html', 'profile.html'];
    function boot() {
        var file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        var pg = document.body && document.body.getAttribute('data-page');
        if (!ME && MEMBER_PAGES.indexOf(file) !== -1) { flash('error', 'Please log in or sign up to continue.'); window.location.replace('landing.html'); return; }
        if (ME && pg === 'landing') { window.location.replace('index.html'); return; }
        renderNav(); renderBanner(); wirePasswordToggles();
        var page = document.body && document.body.getAttribute('data-page');
        if (page === 'login') { initLogin(); } else if (page === 'signup') { initSignup(); } else if (page === 'account') { initAccount(); }
        else if (page === 'forgot') { /* static page */ }
    }
    function init() {
        window.JMKAuth.ready = fetch(API + '?action=me', { credentials: 'same-origin' }).then(function (r) { return r.json(); })
            .then(function (r) { ME = r.user || null; }, function () { ME = null; })
            .then(function () { boot(); document.dispatchEvent(new Event('jmk:ready')); });
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
