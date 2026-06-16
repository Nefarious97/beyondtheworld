// ========================================
// BEYOND THE WORLD — Cart Logic & Global JS
// ========================================

// ── State ──
let cart = JSON.parse(localStorage.getItem('btw_cart')) || [];

// ── Load Products from Admin Dashboard (localStorage) ──
const DEFAULT_PRODUCTS = [
  { id: '1', name: 'Beyond Skeleton Tee', category: 'tshirts', price: 65000, image: 'Assets/Shirt.png', tag: 'new',  available: true, isNew: true },
  { id: '2', name: 'Classic Cap',          category: 'caps',    price: 45000, image: 'Assets/Cap.png',    tag: '',    available: true, isNew: false },
  { id: '3', name: 'Essential Trousers',   category: 'pants',   price: 85000, image: 'Assets/trouser.png',tag: 'new', available: true, isNew: true },
];

function loadProducts() {
  const stored = localStorage.getItem('btw_products');
  if (stored) {
    return JSON.parse(stored).map(p => ({
      ...p,
      // Compatibility: map 'tag' to 'isNew' for existing card rendering
      isNew: p.tag === 'new' || p.isNew || false,
      available: p.available !== false, // default true
    }));
  }
  // Seed defaults into localStorage so admin dashboard shows them
  localStorage.setItem('btw_products', JSON.stringify(DEFAULT_PRODUCTS));
  return [...DEFAULT_PRODUCTS];
}

const products = loadProducts();

// ── Initialization ──
document.addEventListener('DOMContentLoaded', () => {
  injectCartDrawer();
  updateCartBadge();
  initNav();
  initScrollReveal();
  
  // Page specific inits
  if (document.getElementById('home-grid')) initHome();
  if (document.getElementById('shop-grid')) initShop();
  if (document.getElementById('cart-items')) renderCartPage();
  if (document.getElementById('checkout-form')) initCheckout();
  
  // Dispatch custom event for product page
  document.dispatchEvent(new Event('productsLoaded'));
});

window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    preloader.classList.add('hidden');
    setTimeout(() => preloader.remove(), 600);
  }
});

// ── Navigation & Interactions ──
function initNav() {
  const nav = document.querySelector('.nav');
  const hamburger = document.querySelector('.nav__hamburger');
  const mobileNav = document.querySelector('.mobile-nav');

  // Apply dark style to mobile nav if nav is dark themed
  if (nav && nav.classList.contains('nav--dark') && mobileNav) {
    mobileNav.classList.add('dark');
  }

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  });

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('open');
      // Animate hamburger to X
      const spans = hamburger.querySelectorAll('span');
      if (isOpen) {
        spans[0].style.transform = 'translateY(7px) rotate(45deg)';
        spans[1].style.transform = 'translateY(-7px) rotate(-45deg)';
      } else {
        spans[0].style.transform = '';
        spans[1].style.transform = '';
      }
    });

    // Close mobile nav when clicking a link
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        const spans = hamburger.querySelectorAll('span');
        spans[0].style.transform = '';
        spans[1].style.transform = '';
      });
    });
  }
}

function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  const revealOnScroll = () => {
    const windowHeight = window.innerHeight;
    reveals.forEach(el => {
      const elementTop = el.getBoundingClientRect().top;
      if (elementTop < windowHeight - 100) {
        el.classList.add('visible');
      }
    });
  };
  window.addEventListener('scroll', revealOnScroll);
  revealOnScroll(); // Trigger on load
}

// ── Cart Functions ──
function addToCart(productData) {
  // Check if item exists (matching id, size)
  const existing = cart.find(item => item.id === productData.id && item.size === productData.size);
  if (existing) {
    existing.qty += productData.qty;
  } else {
    cart.push(productData);
  }
  saveCart();
  showToast(`Added ${productData.name} to bag`);
  
  // Auto-open drawer
  const drawer = document.getElementById('cart-drawer');
  if (drawer && !drawer.classList.contains('open')) {
    toggleCartDrawer();
  }
}

window.quickAdd = function(e, id) {
  e.stopPropagation(); // Prevent card click
  const p = products.find(prod => prod.id === id);
  if (p) {
    addToCart({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.image,
      size: 'L', // default size
      qty: 1
    });
  }
};

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  if (document.getElementById('cart-items')) renderCartPage();
  renderCartDrawer();
}

function updateQty(index, change) {
  const newQty = cart[index].qty + change;
  if (newQty > 0) {
    cart[index].qty = newQty;
    saveCart();
    if (document.getElementById('cart-items')) renderCartPage();
    renderCartDrawer();
  } else if (newQty === 0) {
    removeFromCart(index);
  }
}

function saveCart() {
  localStorage.setItem('btw_cart', JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-badge-text');
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  badges.forEach(badge => {
    badge.textContent = totalItems;
  });
  
  // Update old badge if still present
  const oldBadge = document.getElementById('cart-badge');
  if (oldBadge) {
    oldBadge.textContent = totalItems;
    if (totalItems > 0) oldBadge.classList.add('visible');
    else oldBadge.classList.remove('visible');
  }
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function clearCart() {
  cart = [];
  saveCart();
  renderCartDrawer();
}

// ── Cart Drawer Logic ──
function injectCartDrawer() {
  if (document.getElementById('cart-drawer')) return;

  const html = `
    <div class="cart-drawer-overlay" id="cart-overlay" onclick="toggleCartDrawer()"></div>
    <div class="cart-drawer" id="cart-drawer">
      <div class="cart-drawer__header">
        <h2 class="cart-drawer__title">Your Bag</h2>
        <i class="ph ph-x cart-drawer__close" onclick="toggleCartDrawer()"></i>
      </div>
      <div class="cart-drawer__items" id="drawer-items"></div>
      <div class="cart-drawer__footer">
        <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-weight: 700;">
          <span>Subtotal</span>
          <span id="drawer-subtotal">₦0</span>
        </div>
        <a href="cart.html" class="btn btn-primary btn-full">Review Bag</a>
        <a href="checkout.html" class="btn btn-gold btn-full" style="margin-top: 10px;">Checkout</a>
        <div class="trust-badges" style="display: flex; gap: 12px; justify-content: center; margin-top: 20px; color: var(--text-muted); font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">
          <div style="display: flex; align-items: center; gap: 4px;"><i class="ph ph-lock-key" style="font-size: 14px;"></i> Secure</div>
          <div style="display: flex; align-items: center; gap: 4px;"><i class="ph ph-truck" style="font-size: 14px;"></i> Fast Delivery</div>
          <div style="display: flex; align-items: center; gap: 4px;"><i class="ph ph-arrow-u-up-left" style="font-size: 14px;"></i> Returns</div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  renderCartDrawer();
}

window.toggleCartDrawer = function() {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  if (drawer) {
    drawer.classList.toggle('open');
    overlay.classList.toggle('open');
    if (drawer.classList.contains('open')) renderCartDrawer();
  } else {
    window.location.href = 'cart.html';
  }
};

function renderCartDrawer() {
  const container = document.getElementById('drawer-items');
  const subtotalEl = document.getElementById('drawer-subtotal');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = '<p class="t-muted" style="text-align: center; margin-top: 40px;">Your bag is currently empty.</p>';
    subtotalEl.textContent = '₦0';
    return;
  }

  container.innerHTML = '';
  cart.forEach((item, index) => {
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.style.gridTemplateColumns = '70px 1fr auto';
    el.style.padding = '16px 0';
    el.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="cart-item__img" style="width: 70px; height: 70px;">
      <div>
        <h3 class="cart-item__name" style="font-size: 15px;">${item.name}</h3>
        <p class="cart-item__meta" style="margin-bottom: 8px;">Size: ${item.size}</p>
        <div class="qty-control" style="transform: scale(0.8); transform-origin: left center;">
          <button class="qty-btn" onclick="updateQty(${index}, -1)"><i class="ph ph-minus"></i></button>
          <div class="qty-display">${item.qty}</div>
          <button class="qty-btn" onclick="updateQty(${index}, 1)"><i class="ph ph-plus"></i></button>
        </div>
      </div>
      <div style="text-align: right;">
        <div class="cart-item__price" style="font-size: 15px;">₦${(item.price * item.qty).toLocaleString()}</div>
        <button class="cart-item__remove" style="font-size: 16px; margin-top: 8px;" onclick="removeFromCart(${index})"><i class="ph ph-trash"></i></button>
      </div>
    `;
    container.appendChild(el);
  });
  
  subtotalEl.textContent = `₦${getCartTotal().toLocaleString()}`;
}

// ── UI Helpers ──
function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ── Product Card Template ──
function createProductCardHTML(p, index) {
  const delayClass = `reveal-delay-${(index % 4) + 1}`;
  const tagLabels = { new: 'New Drop', sale: 'Sale', limited: 'Limited', sold_out: 'Sold Out' };
  const badgeTag = p.tag && tagLabels[p.tag] ? tagLabels[p.tag] : (p.isNew ? 'New Drop' : '');

  return `
    <div class="product-card reveal ${delayClass}" onclick="window.location.href='product.html?id=${p.id}'">
      <div class="product-card__img-wrap">
        ${badgeTag ? `<div class="product-card__badge">${badgeTag}</div>` : ''}
        <img src="${p.image}" alt="${p.name}" class="product-card__img">
        <div class="product-card__overlay" onclick="quickAdd(event, '${p.id}')">Add to Bag</div>
      </div>
      <div class="product-card__info">
        <h3 class="product-card__name">${p.name}</h3>
        <p class="product-card__sub">${p.category}</p>
        <p class="product-card__price">₦${p.price.toLocaleString()}</p>
      </div>
    </div>
  `;
}

// ── Home Page Logic ──
function initHome() {
  const grid = document.getElementById('home-grid');
  if (!grid) return;
  
  // Show up to 3 available products marked as 'new', or just the first 3
  let displayProducts = products.filter(p => p.available !== false);
  const newDrops = displayProducts.filter(p => p.tag === 'new' || p.isNew);
  
  if (newDrops.length > 0) {
    displayProducts = newDrops.slice(0, 3);
  } else {
    displayProducts = displayProducts.slice(0, 3);
  }

  grid.innerHTML = displayProducts.map((p, i) => createProductCardHTML(p, i)).join('');
  
  // Trigger scroll reveal for newly added items
  setTimeout(initScrollReveal, 100);
}

// ── Shop Page Logic ──
function initShop() {
  const grid = document.getElementById('shop-grid');
  const filters = document.querySelectorAll('.filter-btn');
  
  const renderProducts = (category = 'all') => {
    grid.innerHTML = '';
    let filtered = category === 'all' ? products : products.filter(p => p.category === category);
    // Only show available products on the public shop
    filtered = filtered.filter(p => p.available !== false);

    if (filtered.length === 0) {
      grid.innerHTML = '<p style="text-align:center; padding: 40px; color: var(--text-muted);">No products available in this category.</p>';
      return;
    }

    grid.innerHTML = filtered.map((p, i) => createProductCardHTML(p, i)).join('');

    // Trigger scroll reveal for newly added items
    setTimeout(initScrollReveal, 100);
  };

  filters.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filters.forEach(f => f.classList.remove('active'));
      e.target.classList.add('active');
      renderProducts(e.target.dataset.filter);
    });
  });

  renderProducts(); // Initial render
}

// ── Cart Page Logic ──
function renderCartPage() {
  const container = document.getElementById('cart-items');
  const emptyState = document.getElementById('cart-empty');
  const subtotalEl = document.getElementById('cart-subtotal');
  const totalEl = document.getElementById('cart-total');
  
  if (cart.length === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'block';
    subtotalEl.textContent = '₦0';
    totalEl.textContent = '₦0';
    return;
  }
  
  container.style.display = 'block';
  emptyState.style.display = 'none';
  container.innerHTML = '';
  
  cart.forEach((item, index) => {
    const el = document.createElement('div');
    el.className = 'cart-item reveal';
    el.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="cart-item__img">
      <div>
        <h3 class="cart-item__name">${item.name}</h3>
        <p class="cart-item__meta">Size: ${item.size}</p>
        <div class="qty-control">
          <button class="qty-btn" onclick="updateQty(${index}, -1)"><i class="ph ph-minus"></i></button>
          <div class="qty-display">${item.qty}</div>
          <button class="qty-btn" onclick="updateQty(${index}, 1)"><i class="ph ph-plus"></i></button>
        </div>
      </div>
      <div style="text-align: right;">
        <div class="cart-item__price">₦${(item.price * item.qty).toLocaleString()}</div>
        <button class="cart-item__remove" onclick="removeFromCart(${index})"><i class="ph ph-trash"></i></button>
      </div>
    `;
    container.appendChild(el);
  });
  
  const subtotal = getCartTotal();
  subtotalEl.textContent = `₦${subtotal.toLocaleString()}`;
  totalEl.textContent = `₦${(subtotal > 0 ? subtotal + 5000 : 0).toLocaleString()}`; // 5000 flat shipping
  
  setTimeout(initScrollReveal, 100);
}

// ── Checkout Page Logic ──
function initCheckout() {
  const form = document.getElementById('checkout-form');
  const subtotalEl = document.getElementById('checkout-subtotal');
  const totalEl = document.getElementById('checkout-total');
  const itemsContainer = document.getElementById('checkout-items');
  
  // Render summary
  const subtotal = getCartTotal();
  subtotalEl.textContent = `₦${subtotal.toLocaleString()}`;
  totalEl.textContent = `₦${(subtotal > 0 ? subtotal + 5000 : 0).toLocaleString()}`;
  
  cart.forEach(item => {
    const el = document.createElement('div');
    el.className = 'order-row';
    el.innerHTML = `
      <span>${item.name} (x${item.qty}) <br><small class="t-muted">Size: ${item.size}</small></span>
      <span>₦${(item.price * item.qty).toLocaleString()}</span>
    `;
    itemsContainer.appendChild(el);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast('Your bag is empty!');
      return;
    }
    
    // Gather details
    const inputs = form.querySelectorAll('input');
    const email = inputs[0].value;
    const fname = inputs[1].value;
    const lname = inputs[2].value;
    const street = inputs[3].value;
    const city = inputs[4].value;
    const zip = inputs[5].value;

    // Build WhatsApp message
    let message = `*New Order from ${fname} ${lname}* 🚀\n\n`;
    message += `*Shipping Details:*\n${street}, ${city}, ${zip}\nEmail: ${email}\n\n`;
    message += `*Order Items:*\n`;
    cart.forEach(item => {
      message += `- ${item.qty}x ${item.name} (Size: ${item.size}) - ₦${(item.price * item.qty).toLocaleString()}\n`;
    });
    
    const subtotal = getCartTotal();
    const total = subtotal + 5000;
    message += `\n*Total (incl. ₦5,000 Shipping):* ₦${total.toLocaleString()}\n`;
    message += `\nPlease confirm my order.`;

    // Replace with actual WhatsApp number
    const phone = '+2349168023113';
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    
    const btn = form.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="ph ph-whatsapp-logo"></i> Redirecting to WhatsApp...';
    btn.disabled = true;
    
    setTimeout(() => {
      clearCart();
      window.location.href = waUrl;
    }, 1500);
  });
}
