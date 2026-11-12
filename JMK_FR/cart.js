/* JMK FR FOODHOUSE - shared cart logic (stored in the browser's localStorage) */
(function () {
    var KEY = 'jmkCart';

    function getCart() {
        try { return JSON.parse(localStorage.getItem(KEY)) || []; }
        catch (e) { return []; }
    }

    function saveCart(cart) {
        try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {}
        updateBadge();
    }

    function addToCart(item) {
        var cart = getCart();
        var found = cart.find(function (p) { return p.id === item.id; });
        if (found) { found.qty += 1; }
        else { cart.push({ id: item.id, name: item.name, price: item.price, image: item.image, qty: 1 }); }
        saveCart(cart);
    }

    function changeQty(id, delta) {
        var cart = getCart();
        var item = cart.find(function (p) { return p.id === id; });
        if (!item) return;
        item.qty += delta;
        if (item.qty <= 0) cart = cart.filter(function (p) { return p.id !== id; });
        saveCart(cart);
    }

    function removeItem(id) {
        saveCart(getCart().filter(function (p) { return p.id !== id; }));
    }

    function clearCart() { saveCart([]); }

    function count() {
        return getCart().reduce(function (n, p) { return n + p.qty; }, 0);
    }

    function formatPeso(n) {
        return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function updateBadge() {
        var link = document.querySelector('nav a[href="cart.html"]');
        if (!link) return;
        var badge = link.querySelector('.cart-badge');
        var n = count();
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'cart-badge';
            link.appendChild(badge);
        }
        badge.textContent = n;
        badge.style.display = n > 0 ? 'inline-block' : 'none';
    }

    window.Cart = {
        get: getCart, add: addToCart, changeQty: changeQty, remove: removeItem,
        clear: clearCart, count: count, formatPeso: formatPeso, updateBadge: updateBadge
    };

    document.addEventListener('DOMContentLoaded', updateBadge);
})();
