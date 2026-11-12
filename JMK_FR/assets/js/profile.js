/* JMK FR FOODHOUSE - profile page behaviour.
 * Account data (name, username, join date) comes from the real login session via JMKAuth (api/auth.php).
 * Everything else (bio, location, tags, photos, favorites, likes, comments) is stored in this browser's
 * localStorage, keyed by user id. Posts, followers and notifications are SAMPLE data - there is no
 * backend table for them yet. */
(function () {
    'use strict';

    /* ---------- sample content (uses the real menu items/prices from product.html) ---------- */
    var POSTS = [
        { id: 'c1', title: 'C1 Crispy Pork Belly', rating: 4.8, reviews: 320, cat: 'Meals', price: 169, img: 'assets/img/profile-c1.jpg', likes: 24,
          text: 'Crackling skin and juicy meat with a tangy dipping sauce. One of the best meals here, will definitely order again!',
          comments: [{ n: 'Ana R.', t: 'Looks so crispy! Ordering this tonight.' }, { n: 'Joel M.', t: 'The sauce is the best part.' }, { n: 'Kim D.', t: 'Saving this for payday.' }] },
        { id: 'c2', title: 'C2 Sizzling Sisig', rating: 4.6, reviews: 215, cat: 'Meals', price: 99, img: 'assets/img/profile-c2.jpg', likes: 18,
          text: 'Savory, sour and a little spicy, topped with an egg. Perfect for a quick, satisfying and affordable meal.',
          comments: [{ n: 'Paolo S.', t: 'Add extra calamansi!' }] },
        { id: 'c3', title: 'C3 Chicken Curry & Rice', rating: 4.5, reviews: 178, cat: 'Meals', price: 199, img: 'assets/img/profile-c3.jpg', likes: 15,
          text: 'Rich, creamy curry over fluffy rice. The chicken is tender and the sauce is full of flavor.',
          comments: [{ n: 'Mia L.', t: 'Comfort food at its finest.' }, { n: 'Ben T.', t: 'Is it spicy?' }] },
        { id: 'd2', title: 'Mango Shake', rating: 4.7, reviews: 142, cat: 'Drinks', price: 79, img: 'assets/img/d2.svg', likes: 21,
          text: 'Thick, cold and made with sweet ripe mangoes. The perfect partner for any meal.',
          comments: [{ n: 'Cris V.', t: 'Always my first pick.' }] },
        { id: 's2', title: 'Halo-Halo', rating: 4.9, reviews: 265, cat: 'Desserts', price: 99, img: 'assets/img/s2.svg', likes: 33,
          text: 'A colorful mix of sweet beans, fruit, leche flan and shaved ice. Sharing is optional.',
          comments: [{ n: 'Lea P.', t: 'Best on a hot day!' }, { n: 'Dan K.', t: 'The ice is so fine.' }] },
        { id: 's1', title: 'Leche Flan', rating: 4.7, reviews: 119, cat: 'Desserts', price: 69, img: 'assets/img/s1.svg', likes: 12,
          text: 'Silky smooth with just the right amount of caramel. A sweet ending to every meal.',
          comments: [] }
    ];
    var NOTIFS = [
        { id: 1, text: 'Ana R. liked your review of C1 Crispy Pork Belly.', time: '2 hours ago' },
        { id: 2, text: 'Joel M. commented on your post.', time: 'Yesterday' },
        { id: 3, text: 'You have 2 new followers.', time: '3 days ago' }
    ];
    var DEFAULTS = {
        bio: 'Food lover | Trying new dishes, one bite at a time',
        tags: ['Food Lover', 'Filipino Favorites', 'Good Vibes'],
        prefs: ['Pork Belly', 'Sisig', 'Curry', 'Halo-Halo', 'Mango Shake', 'Desserts']
    };

    /* ---------- helpers ---------- */
    var $ = function (id) { return document.getElementById(id); };
    var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
    function el(tag, cls, text) { var n = document.createElement(tag); if (cls) { n.className = cls; } if (text != null) { n.textContent = text; } return n; }
    function icon(name, cls) {
        var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', 'ic' + (cls ? ' ' + cls : ''));
        var u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#i-' + name); s.appendChild(u); return s;
    }
    function peso(n) { return '\u20B1' + Number(n).toFixed(2); }

    var user, state, tab = 'posts', query = '', openMenuBtn = null;
    var KEY;
    function load() {
        try { var v = JSON.parse(localStorage.getItem(KEY)); if (v && typeof v === 'object') { return v; } } catch (e) {}
        return {};
    }
    var toastTimer;
    function toast(msg) {
        var t = $('toast'); t.textContent = msg; t.classList.add('show');
        clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
    }
    function save() {
        try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
        catch (e) { toast('Could not save in this browser (storage is full or blocked).'); return false; }
    }
    function list(a, fallback) { return Array.isArray(a) ? a : fallback; }
    function get(k) { return state[k] != null ? state[k] : DEFAULTS[k]; }
    function parseTags(str) {
        var seen = {}, out = [];
        String(str || '').split(',').forEach(function (s) { s = s.trim().slice(0, 30); if (s && !seen[s.toLowerCase()]) { seen[s.toLowerCase()] = 1; out.push(s); } });
        return out.slice(0, 8);
    }
    function displayName() { return (state.name || user.fullName || user.username || '').trim(); }

    /* ---------- header / profile card ---------- */
    function parseDate(s) { var d = new Date(String(s || '').replace(' ', 'T')); return isNaN(d) ? null : d; }
    function renderProfile() {
        var name = displayName(), initial = (name.charAt(0) || '?').toUpperCase();
        $$('[data-name]').forEach(function (n) { n.textContent = name; });
        $$('[data-handle]').forEach(function (n) { n.textContent = '@' + user.username; });
        $$('[data-avatar]').forEach(function (a) {
            if (state.avatar) { a.style.backgroundImage = 'url("' + state.avatar + '")'; a.textContent = ''; a.setAttribute('role', 'img'); a.setAttribute('aria-label', name); }
            else { a.style.backgroundImage = ''; a.textContent = initial; a.removeAttribute('role'); a.removeAttribute('aria-label'); }
        });
        var cover = $('cover');
        if (state.cover) { cover.style.backgroundImage = 'url("' + state.cover + '")'; cover.classList.add('custom'); }
        else { cover.style.backgroundImage = ''; cover.classList.remove('custom'); }

        var bio = (get('bio') || '').trim();
        $('bio').textContent = bio; $('bio').hidden = !bio;
        $('about-bio').textContent = bio || 'Tell people a little about yourself with Edit Profile.';

        var loc = (state.location || '').trim();
        $('meta-location').hidden = !loc; $('meta-location').lastElementChild.textContent = loc;
        var joined = parseDate(user.createdAt);
        $('meta-joined').hidden = !joined;
        if (joined) { $('meta-joined').lastElementChild.textContent = 'Joined ' + joined.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); }
        document.title = name + ' (@' + user.username + ') | JMK FR FOODHOUSE';

        fillChips($('about-tags'), list(state.tags, DEFAULTS.tags));
        fillChips($('pref-tags'), list(state.prefs, DEFAULTS.prefs));
    }
    function fillChips(ul, items) {
        ul.textContent = '';
        if (!items.length) { var li = el('li', '', 'Nothing added yet'); ul.appendChild(li); return; }
        items.forEach(function (t) { ul.appendChild(el('li', '', t)); });
    }

    /* ---------- posts ---------- */
    function userComments(id) { return list((state.comments || {})[id], []); }
    function isFav(id) { return !!(state.favs || {})[id]; }
    function isLiked(id) { return !!(state.likes || {})[id]; }
    function visiblePosts() {
        var hidden = list(state.hidden, []), q = query.trim().toLowerCase();
        return POSTS.filter(function (p) {
            if (hidden.indexOf(p.id) !== -1) { return false; }
            if (tab === 'favorites' && !isFav(p.id)) { return false; }
            return !q || (p.title + ' ' + p.text + ' ' + p.cat).toLowerCase().indexOf(q) !== -1;
        });
    }
    function commentCount(p) { return p.comments.length + userComments(p.id).length; }

    function postCard(p) {
        var card = el('article', 'card'); card.dataset.id = p.id;
        var imgBox = el('div', 'card-img'), img = el('img'); img.src = p.img; img.alt = p.title; img.loading = 'lazy'; img.width = 720; img.height = 540;
        imgBox.appendChild(img);
        var fav = el('button', 'fav-btn'); fav.type = 'button'; fav.dataset.act = 'fav';
        fav.setAttribute('aria-pressed', isFav(p.id) ? 'true' : 'false'); fav.setAttribute('aria-label', 'Favorite ' + p.title); fav.appendChild(icon('heart'));
        imgBox.appendChild(fav); card.appendChild(imgBox);

        var body = el('div', 'card-body');
        body.appendChild(el('h3', 'card-title', p.title));
        var r = el('div', 'rating'); r.appendChild(icon('star')); r.appendChild(document.createTextNode(p.rating.toFixed(1) + ' ')); r.appendChild(el('span', '', '(' + p.reviews + ')')); body.appendChild(r);
        var w = el('div', 'where'); w.appendChild(icon('pin')); w.appendChild(document.createTextNode(p.cat + ' \u00B7 ' + peso(p.price))); body.appendChild(w);
        body.appendChild(el('p', 'card-text', p.text));

        var foot = el('div', 'card-foot');
        var like = el('button', 'act like'); like.type = 'button'; like.dataset.act = 'like'; like.setAttribute('aria-pressed', isLiked(p.id) ? 'true' : 'false');
        like.setAttribute('aria-label', 'Like ' + p.title); like.appendChild(icon('heart')); like.appendChild(el('span', '', String(p.likes + (isLiked(p.id) ? 1 : 0))));
        var com = el('button', 'act'); com.type = 'button'; com.dataset.act = 'comment'; com.setAttribute('aria-label', 'Comments on ' + p.title);
        com.appendChild(icon('comment')); com.appendChild(el('span', '', String(commentCount(p))));
        var more = el('button', 'more'); more.type = 'button'; more.dataset.act = 'more'; more.setAttribute('aria-haspopup', 'true'); more.setAttribute('aria-expanded', 'false'); more.setAttribute('aria-label', 'More options for ' + p.title); more.appendChild(icon('dots'));
        foot.appendChild(like); foot.appendChild(com); foot.appendChild(more);
        body.appendChild(foot); card.appendChild(body);
        return card;
    }
    function photoTile(p) {
        var b = el('button', 'photo-tile'); b.type = 'button'; b.dataset.photo = p.id; b.setAttribute('aria-label', 'View photo: ' + p.title);
        var i = el('img'); i.src = p.img; i.alt = ''; i.loading = 'lazy'; b.appendChild(i); b.appendChild(el('span', '', p.title)); return b;
    }
    function renderTab() {
        closePostMenu();
        var box = $('tab-panel'), items = visiblePosts();
        box.textContent = '';
        if (!items.length) {
            var e = el('div', 'empty');
            if (query.trim()) { e.appendChild(el('strong', '', 'No matches')); e.appendChild(document.createTextNode('Nothing in this tab matches \u201C' + query.trim() + '\u201D.')); }
            else if (tab === 'favorites') { e.appendChild(el('strong', '', 'No favorites yet')); e.appendChild(document.createTextNode('Tap the heart on a post to save it here.')); }
            else { e.appendChild(el('strong', '', 'Nothing to show')); e.appendChild(document.createTextNode('Hidden posts can be restored by clearing this browser\u2019s data for the site.')); }
            box.appendChild(e);
        } else {
            items.forEach(function (p) { box.appendChild(tab === 'photos' ? photoTile(p) : postCard(p)); });
        }
        renderStats();
    }
    function renderStats() {
        var hidden = list(state.hidden, []), shown = POSTS.filter(function (p) { return hidden.indexOf(p.id) === -1; });
        $('stat-reviews').textContent = shown.length;
        $('stat-photos').textContent = shown.length;
        $('stat-favs').textContent = shown.filter(function (p) { return isFav(p.id); }).length;
    }
    function setTab(name, focus) {
        tab = name;
        $$('.tab').forEach(function (t) {
            var on = t.dataset.tab === name; t.classList.toggle('active', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1;
            if (on) { $('tab-panel').setAttribute('aria-labelledby', t.id); if (focus) { t.focus(); } }
        });
        renderTab();
    }

    /* ---------- post menu ---------- */
    function closePostMenu() {
        $$('.post-menu').forEach(function (m) { m.remove(); });
        if (openMenuBtn) { openMenuBtn.setAttribute('aria-expanded', 'false'); openMenuBtn = null; }
    }
    function openPostMenu(btn, p) {
        var same = openMenuBtn === btn; closePostMenu(); if (same) { return; }
        var m = el('div', 'post-menu'); m.setAttribute('role', 'menu');
        function item(ic, label, fn, danger) {
            var b = el('button', 'menu-item' + (danger ? ' danger' : '')); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.appendChild(icon(ic)); b.appendChild(document.createTextNode(label));
            b.addEventListener('click', function (e) { e.stopPropagation(); closePostMenu(); fn(); }); m.appendChild(b); return b;
        }
        item('utensils', 'View in menu', function () { window.location.href = 'product.html#' + p.cat.toLowerCase(); });
        item('link', 'Copy link', function () {
            var url = new URL('product.html#' + p.cat.toLowerCase(), window.location.href).href;
            if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(function () { toast('Link copied'); }, function () { toast(url); }); }
            else { toast(url); }
        });
        item('eye-off', 'Hide from profile', function () {
            state.hidden = list(state.hidden, []).concat(p.id); if (save()) { toast('Post hidden (this browser only)'); } renderTab();
        }, true);
        btn.closest('.card').appendChild(m);
        btn.setAttribute('aria-expanded', 'true'); openMenuBtn = btn;
        var first = m.querySelector('button'); if (first) { first.focus(); }
    }

    /* ---------- modals ---------- */
    var lastFocus = null;
    function openModal(m) {
        lastFocus = document.activeElement; m.hidden = false; document.body.style.overflow = 'hidden';
        var f = m.querySelector('input, textarea, button:not([data-close])') || m.querySelector('button'); if (f) { f.focus(); }
    }
    function closeModal(m) {
        m.hidden = true;
        if (!$$('.modal').some(function (x) { return !x.hidden; })) { document.body.style.overflow = ''; }
        if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
    }
    function trapTab(e, m) {
        var f = $$('button, input, textarea, a[href]', m).filter(function (x) { return !x.disabled && x.offsetParent !== null; });
        if (!f.length) { return; }
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    function openEdit() {
        $('f-name').value = displayName(); $('f-bio').value = get('bio') || ''; $('f-location').value = state.location || '';
        $('f-tags').value = list(state.tags, DEFAULTS.tags).join(', '); $('f-prefs').value = list(state.prefs, DEFAULTS.prefs).join(', ');
        $('edit-error').hidden = true; updateBioCount(); closeDropdowns(); closeSidebar(); openModal($('edit-modal'));
    }
    function updateBioCount() { $('bio-count').textContent = '(' + $('f-bio').value.length + '/160)'; }

    var commentId = null;
    function renderComments() {
        var p = POSTS.filter(function (x) { return x.id === commentId; })[0], ul = $('comment-list'); ul.textContent = '';
        $('comment-title').textContent = 'Comments on ' + p.title;
        var all = p.comments.map(function (c) { return { n: c.n, t: c.t }; }).concat(userComments(p.id).map(function (c) { return { n: 'You', t: c.t }; }));
        if (!all.length) { var li = el('li', '', 'No comments yet. Be the first!'); ul.appendChild(li); }
        all.forEach(function (c) { var li = el('li'); li.appendChild(el('b', '', c.n)); li.appendChild(document.createTextNode(c.t)); ul.appendChild(li); });
        ul.scrollTop = ul.scrollHeight;
    }

    /* ---------- image uploads (resized client-side, stored locally) ---------- */
    function pickImage(maxW, maxH, done) {
        var input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
        input.addEventListener('change', function () {
            var f = input.files && input.files[0]; if (!f) { return; }
            if (!/^image\//.test(f.type)) { toast('Please choose an image file.'); return; }
            var fr = new FileReader();
            fr.onload = function () {
                var im = new Image();
                im.onload = function () {
                    var s = Math.min(1, maxW / im.width, maxH / im.height), c = document.createElement('canvas');
                    c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
                    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); done(c.toDataURL('image/jpeg', 0.82));
                };
                im.onerror = function () { toast('That image could not be read.'); };
                im.src = fr.result;
            };
            fr.readAsDataURL(f);
        });
        input.click();
    }
    function squareAvatar(done) {
        pickImage(1200, 1200, function (url) {
            var im = new Image(); im.onload = function () {
                var side = Math.min(im.width, im.height), c = document.createElement('canvas'); c.width = c.height = 320;
                c.getContext('2d').drawImage(im, (im.width - side) / 2, (im.height - side) / 2, side, side, 0, 0, 320, 320); done(c.toDataURL('image/jpeg', 0.85));
            }; im.src = url;
        });
    }

    /* ---------- dropdowns / sidebar ---------- */
    function setDrop(btn, panel, open) { panel.hidden = !open; btn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
    function closeDropdowns() { setDrop($('notif-btn'), $('notif-panel'), false); setDrop($('user-btn'), $('user-panel'), false); }
    function toggleDrop(btn, panel) { var open = panel.hidden; closeDropdowns(); setDrop(btn, panel, open); }
    function openSidebar() { $('sidebar').classList.add('open'); $('scrim').hidden = false; $('menu-toggle').setAttribute('aria-expanded', 'true'); }
    function closeSidebar() { $('sidebar').classList.remove('open'); $('scrim').hidden = true; $('menu-toggle').setAttribute('aria-expanded', 'false'); }

    function renderNotifs() {
        var ul = $('notif-list'), read = !!state.notifRead; ul.textContent = '';
        NOTIFS.forEach(function (n) {
            var li = el('li', read ? '' : 'unread'), d = el('div'); d.appendChild(document.createTextNode(n.text)); d.appendChild(el('time', '', n.time)); li.appendChild(d); ul.appendChild(li);
        });
        $$('[data-notif-badge]').forEach(function (b) { b.textContent = NOTIFS.length; b.hidden = read; });
    }

    function doLogout() {
        JMKAuth.logout().then(function () { JMKAuth.flash('success', 'You have been logged out.'); window.location.href = 'landing.html'; });
    }

    /* ---------- wiring ---------- */
    function wire() {
        $$('[data-open-edit]').forEach(function (b) { b.addEventListener('click', openEdit); });
        $$('[data-logout]').forEach(function (b) { b.addEventListener('click', doLogout); });

        $('menu-toggle').addEventListener('click', openSidebar);
        $('sidebar-close').addEventListener('click', closeSidebar);
        $('scrim').addEventListener('click', closeSidebar);
        $('side-notif').addEventListener('click', function () {
            closeSidebar(); window.scrollTo({ top: 0, behavior: 'smooth' });
            closeDropdowns(); setDrop($('notif-btn'), $('notif-panel'), true); $('notif-read').focus();
        });
        $('notif-btn').addEventListener('click', function (e) { e.stopPropagation(); toggleDrop($('notif-btn'), $('notif-panel')); });
        $('user-btn').addEventListener('click', function (e) { e.stopPropagation(); toggleDrop($('user-btn'), $('user-panel')); });
        $('notif-panel').addEventListener('click', function (e) { e.stopPropagation(); });
        $('notif-read').addEventListener('click', function () { state.notifRead = true; save(); renderNotifs(); });

        $('search-form').addEventListener('submit', function (e) { e.preventDefault(); });
        $('search').addEventListener('input', function (e) { query = e.target.value; renderTab(); });

        $$('.tab').forEach(function (t) {
            t.addEventListener('click', function () { setTab(t.dataset.tab); });
            t.addEventListener('keydown', function (e) {
                var tabs = $$('.tab'), i = tabs.indexOf(t);
                if (e.key === 'ArrowRight') { e.preventDefault(); setTab(tabs[(i + 1) % tabs.length].dataset.tab, true); }
                else if (e.key === 'ArrowLeft') { e.preventDefault(); setTab(tabs[(i + tabs.length - 1) % tabs.length].dataset.tab, true); }
            });
        });

        $('tab-panel').addEventListener('click', function (e) {
            var photo = e.target.closest('[data-photo]');
            if (photo) {
                var pp = POSTS.filter(function (x) { return x.id === photo.dataset.photo; })[0];
                $('photo-big').src = pp.img; $('photo-big').alt = pp.title; $('photo-cap').textContent = pp.title; openModal($('photo-modal')); return;
            }
            var btn = e.target.closest('[data-act]'); if (!btn) { return; }
            var card = btn.closest('.card'), p = POSTS.filter(function (x) { return x.id === card.dataset.id; })[0], act = btn.dataset.act;
            if (act === 'fav') {
                state.favs = state.favs || {}; if (isFav(p.id)) { delete state.favs[p.id]; } else { state.favs[p.id] = 1; }
                save(); var on = isFav(p.id);
                if (tab === 'favorites' && !on) { renderTab(); toast('Removed from favorites'); }
                else { btn.setAttribute('aria-pressed', on ? 'true' : 'false'); renderStats(); toast(on ? 'Added to favorites' : 'Removed from favorites'); }
            } else if (act === 'like') {
                state.likes = state.likes || {}; if (isLiked(p.id)) { delete state.likes[p.id]; } else { state.likes[p.id] = 1; }
                save(); btn.setAttribute('aria-pressed', isLiked(p.id) ? 'true' : 'false'); btn.lastElementChild.textContent = p.likes + (isLiked(p.id) ? 1 : 0);
            } else if (act === 'comment') {
                commentId = p.id; renderComments(); openModal($('comment-modal'));
            } else if (act === 'more') {
                e.stopPropagation(); openPostMenu(btn, p);
            }
        });

        $('cover-edit').addEventListener('click', function () { pickImage(1600, 600, function (url) { state.cover = url; if (save()) { toast('Cover updated (this browser only)'); } renderProfile(); }); });
        $('avatar-edit').addEventListener('click', function () { squareAvatar(function (url) { state.avatar = url; if (save()) { toast('Photo updated (this browser only)'); } renderProfile(); }); });

        $('f-bio').addEventListener('input', updateBioCount);
        $('edit-form').addEventListener('submit', function (e) {
            e.preventDefault();
            var name = $('f-name').value.replace(/\s+/g, ' ').trim();
            if (name.length < 2) { var er = $('edit-error'); er.textContent = 'Please enter a display name (at least 2 characters).'; er.hidden = false; $('f-name').focus(); return; }
            state.name = name; state.bio = $('f-bio').value.trim().slice(0, 160); state.location = $('f-location').value.trim().slice(0, 60);
            state.tags = parseTags($('f-tags').value); state.prefs = parseTags($('f-prefs').value);
            if (save()) { toast('Profile updated (saved in this browser)'); }
            renderProfile(); closeModal($('edit-modal'));
        });
        $('comment-form').addEventListener('submit', function (e) {
            e.preventDefault(); var inp = $('comment-input'), t = inp.value.trim(); if (!t) { return; }
            state.comments = state.comments || {}; state.comments[commentId] = userComments(commentId).concat({ t: t.slice(0, 200) });
            save(); inp.value = ''; renderComments(); renderTab(); inp.focus();
        });

        $$('.modal').forEach(function (m) {
            m.addEventListener('mousedown', function (e) { if (e.target === m) { closeModal(m); } });
            $$('[data-close]', m).forEach(function (b) { b.addEventListener('click', function () { closeModal(m); }); });
            m.addEventListener('keydown', function (e) { if (e.key === 'Tab') { trapTab(e, m); } });
        });

        document.addEventListener('click', function (e) {
            closeDropdowns();
            if (openMenuBtn && !e.target.closest('.post-menu')) { closePostMenu(); }
        });
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') { return; }
            var m = $$('.modal').filter(function (x) { return !x.hidden; })[0];
            if (m) { closeModal(m); return; }
            if (openMenuBtn) { var b = openMenuBtn; closePostMenu(); b.focus(); return; }
            if (!$('notif-panel').hidden || !$('user-panel').hidden) { closeDropdowns(); return; }
            closeSidebar();
        });
        window.addEventListener('resize', function () { if (window.innerWidth > 900) { closeSidebar(); } });
    }

    var started = false;
    function start() {
        if (started) { return; } started = true;
        user = window.JMKAuth && JMKAuth.currentUser();
        if (!user) { return; }   // auth.js is redirecting to the landing page (profile.html is a members-only page)
        KEY = 'jmkProfile:' + user.id; state = load();
        wire(); renderProfile(); renderNotifs(); setTab('posts');
    }
    if (window.JMKAuth && JMKAuth.ready) { JMKAuth.ready.then(start); } else { document.addEventListener('jmk:ready', start); }
})();
