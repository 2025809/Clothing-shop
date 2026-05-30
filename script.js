const API_BASE = '/api';

// Create product card HTML
function createProductCard(product) {
    const imageUrl = product.image_url || 'https://picsum.photos/id/1/400/300';
    return `
        <div class="product-card">
            <img class="product-image" src="${imageUrl}" alt="${escapeHtml(product.name)}" onerror="this.src='https://picsum.photos/id/20/400/300'">
            <div class="product-info">
                <div class="product-name">${escapeHtml(product.name)}</div>
                <div class="product-description">${escapeHtml(product.description || 'High quality clothing')}</div>
                <div class="product-price">€${parseFloat(product.price).toFixed(2)}</div>
                <button class="btn add-to-cart" data-id="${product.id}">Add to Cart</button>
            </div>
        </div>
    `;
}

// Update cart count badge
async function updateCartCount() {
    try {
        const res = await fetch(`${API_BASE}/cart`);
        const cart = await res.json();
        const span = document.getElementById('cartCount');
        if (span) span.innerText = cart.length;
    } catch (err) { console.warn(err); }
}

// Load featured products (home page - first 6)
async function loadFeaturedProducts() {
    const grid = document.getElementById('featuredProductsGrid');
    if (!grid) return;
    try {
        const res = await fetch(`${API_BASE}/products`);
        const products = await res.json();
        const featured = products.slice(0, 6);
        grid.innerHTML = '';
        featured.forEach(p => grid.innerHTML += createProductCard(p));
        attachAddToCartEvents();
    } catch (err) {
        grid.innerHTML = '<p>Failed to load products. Is server running?</p>';
    }
}

// Load ALL products (shop page)
async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    try {
        const res = await fetch(`${API_BASE}/products`);
        const products = await res.json();
        grid.innerHTML = '';
        products.forEach(p => grid.innerHTML += createProductCard(p));
        attachAddToCartEvents();
    } catch (err) {
        grid.innerHTML = '<p>Failed to load products. Is server running?</p>';
    }
}

// Update cart summary (mini cart on shop page)
async function updateCartSummary() {
    try {
        const res = await fetch(`${API_BASE}/cart`);
        const cart = await res.json();
        const summaryDiv = document.getElementById('cartSummary');
        const totalSpan = document.getElementById('cartPreviewTotal');
        if (!summaryDiv) return;
        if (cart.length === 0) {
            summaryDiv.innerHTML = '<p class="empty-cart-mini">Your cart is empty</p>';
            if (totalSpan) totalSpan.innerText = '€0.00';
            return;
        }
        let html = '<ul class="mini-cart-list">';
        let total = 0;
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            html += `<li><span>${escapeHtml(item.name)} x${item.quantity}</span><span>€${itemTotal.toFixed(2)}</span></li>`;
        });
        html += '</ul>';
        summaryDiv.innerHTML = html;
        if (totalSpan) totalSpan.innerText = `€${total.toFixed(2)}`;
    } catch (err) { console.warn(err); }
}

// Attach add-to-cart event listeners
function attachAddToCartEvents() {
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.removeEventListener('click', addToCartHandler);
        btn.addEventListener('click', addToCartHandler);
    });
}

async function addToCartHandler(e) {
    const productId = e.currentTarget.getAttribute('data-id');
    await addToCart(productId);
}

async function addToCart(productId, qty = 1) {
    try {
        const res = await fetch(`${API_BASE}/cart/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, quantity: qty })
        });
        if (res.ok) {
            await updateCartCount();
            await updateCartSummary();   // refresh mini cart on shop page
            if (window.location.pathname.includes('cart.html')) loadCartPage();
            else alert('Item added to cart');
        } else alert('Failed');
    } catch (err) { alert('Error'); }
}

async function removeFromCart(index) {
    try {
        const res = await fetch(`${API_BASE}/cart/remove/${index}`, { method: 'DELETE' });
        if (res.ok) {
            await updateCartCount();
            await updateCartSummary();
            loadCartPage();
        } else alert('Could not remove');
    } catch (err) { alert('Error'); }
}

async function loadCartPage() {
    const container = document.getElementById('cartItems');
    const totalSpan = document.getElementById('cartTotal');
    if (!container) return;
    try {
        const res = await fetch(`${API_BASE}/cart`);
        const cart = await res.json();
        if (cart.length === 0) {
            container.innerHTML = '<p>Your cart is empty. <a href="shop.html">Shop now</a></p>';
            if (totalSpan) totalSpan.innerText = '€0.00';
            return;
        }
        let html = '', total = 0;
        cart.forEach((item, idx) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            html += `<div class="cart-item">
                        <div><strong>${escapeHtml(item.name)}</strong> × ${item.quantity}</div>
                        <div>€${itemTotal.toFixed(2)} <button class="remove-btn" data-index="${idx}">Remove</button></div>
                    </div>`;
        });
        container.innerHTML = html;
        if (totalSpan) totalSpan.innerText = `€${total.toFixed(2)}`;
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', () => removeFromCart(btn.getAttribute('data-index')));
        });
    } catch (err) { container.innerHTML = '<p>Error loading cart.</p>'; }
}

async function updateMarketPrices() {
    const btn = document.getElementById('updateMarketBtn');
    if (!btn) return;
    const original = btn.innerText;
    btn.innerText = 'Updating...';
    btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/update-prices`, { method: 'POST' });
        const data = await res.json();
        alert(`Prices updated! Multiplier: ${data.multiplier}x`);
        if (window.location.pathname.includes('shop.html')) loadProducts();
        if (window.location.pathname.includes('index.html')) loadFeaturedProducts();
    } catch (err) { alert('Error updating prices'); }
    finally { btn.innerText = original; btn.disabled = false; }
}

async function checkout() {
    try {
        const res = await fetch(`${API_BASE}/checkout`, { method: 'POST' });
        const data = await res.json();
        alert(`Order placed! Total: €${data.total}`);
        await updateCartCount();
        await updateCartSummary();
        if (window.location.pathname.includes('cart.html')) loadCartPage();
        else window.location.href = 'cart.html';
    } catch (err) { alert('Checkout failed'); }
}

function setupProductFilter() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    searchInput.addEventListener('input', async () => {
        const term = searchInput.value.toLowerCase();
        const res = await fetch(`${API_BASE}/products`);
        const all = await res.json();
        const filtered = all.filter(p => p.name.toLowerCase().includes(term) || (p.category && p.category.toLowerCase().includes(term)));
        const grid = document.getElementById('productsGrid');
        if (grid) {
            grid.innerHTML = '';
            filtered.forEach(p => grid.innerHTML += createProductCard(p));
            attachAddToCartEvents();
        }
    });
}

function setupContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const msg = document.getElementById('message').value.trim();
        const fb = document.getElementById('formFeedback');
        if (!name || !email || !msg) {
            fb.innerHTML = 'Name, email and message are required.';
            fb.style.color = '#d9534f';
            return;
        }
        if (!email.includes('@')) {
            fb.innerHTML = 'Valid email required.';
            fb.style.color = '#d9534f';
            return;
        }
        fb.innerHTML = 'Thank you! We will reply soon.';
        fb.style.color = '#2c7da0';
        form.reset();
    });
}

function setupNewsletter() {
    const form = document.getElementById('newsletterForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('newsletterEmail').value.trim();
        const fb = document.getElementById('newsletterFeedback');
        if (!email || !email.includes('@')) {
            fb.innerHTML = 'Valid email required.';
            fb.style.color = '#d9534f';
        } else {
            fb.innerHTML = 'Subscribed! (demo)';
            fb.style.color = '#2c7da0';
            form.reset();
        }
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, (m) => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();

    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        loadFeaturedProducts();
        setupNewsletter();
    }
    if (window.location.pathname.includes('shop.html')) {
        loadProducts();
        setupProductFilter();
        updateCartSummary();   // load initial cart summary
        const mbtn = document.getElementById('updateMarketBtn');
        if (mbtn) mbtn.addEventListener('click', updateMarketPrices);
    }
    if (window.location.pathname.includes('cart.html')) {
        loadCartPage();
        const cbtn = document.getElementById('checkoutBtn');
        if (cbtn) cbtn.addEventListener('click', checkout);
    }
    setupContactForm();
});