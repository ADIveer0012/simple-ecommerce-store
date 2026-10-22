/* =========================
   HELPERS
========================= */
function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function formatPrice(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

function getToken() {
  return localStorage.getItem("token");
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location = "index.html";
}

/* =========================
   NAVIGATION (Home / Cart / Login or Logout)
========================= */
function renderNav() {
  const nav = document.getElementById("nav-links");
  if (!nav) return;

  const user = getUser();
  nav.innerHTML = user
    ? `<a href="index.html">🏠 Home</a>
       <a href="cart.html">🛒 Cart</a>
       <span style="font-size:15px">Hi, ${escapeHtml(user.name)}</span>
       <a href="#" onclick="logout(); return false;">Logout</a>`
    : `<a href="index.html">🏠 Home</a>
       <a href="cart.html">🛒 Cart</a>
       <a href="login.html">Login</a>`;
}

/* =========================
   CART STORAGE
========================= */
function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("cart")) || [];
    return saved.filter(item =>
      item && typeof item.id === "string" &&
      Number.isInteger(item.quantity) && item.quantity > 0
    );
  } catch {
    return [];
  }
}

let cart = loadCart();
let allProducts = [];

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

/* =========================
   HOME PAGE: PRODUCT LIST
========================= */
const productsDiv = document.getElementById("products");

if (productsDiv) {
  fetch(`${API_URL}/products`)
    .then(res => {
      if (!res.ok) throw new Error("Server error");
      return res.json();
    })
    .then(products => {
      allProducts = products;
      productsDiv.innerHTML = products.map(p => `
        <div class="product">
          <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}">
          <h3>${escapeHtml(p.name)}</h3>
          <p class="price">${formatPrice(p.price)}</p>
          <a href="product.html?id=${encodeURIComponent(p.id)}" class="view-btn">View</a>
        </div>
      `).join("");
    })
    .catch(err => {
      productsDiv.innerHTML = "<p style='padding:30px'>Could not load products. Is the server running?</p>";
      console.error(err);
    });
}

/* =========================
   PRODUCT PAGE: DETAILS
========================= */
const productDiv = document.getElementById("product");

if (productDiv) {
  const pid = new URLSearchParams(window.location.search).get("id");

  fetch(`${API_URL}/products`)
    .then(res => {
      if (!res.ok) throw new Error("Server error");
      return res.json();
    })
    .then(products => {
      allProducts = products;
      const p = products.find(item => String(item.id) === String(pid));

      if (!p) {
        productDiv.innerHTML = "<p>Product not found</p>";
        return;
      }

      productDiv.innerHTML = `
        <img src="${escapeHtml(p.image)}" class="detail-img" alt="${escapeHtml(p.name)}">
        <h2>${escapeHtml(p.name)}</h2>
        <p>${escapeHtml(p.description)}</p>
        <p class="price">${formatPrice(p.price)}</p>
        <button onclick="addToCart('${escapeHtml(p.id)}')">Add to Cart</button>
      `;
    })
    .catch(err => {
      console.error(err);
      productDiv.innerHTML = "<p>Error loading product. Is the server running?</p>";
    });
}

/* =========================
   ADD TO CART
========================= */
function addToCart(productId) {
  const product = allProducts.find(p => String(p.id) === String(productId));
  if (!product) return;

  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
      image: product.image,
      quantity: 1
    });
  }

  saveCart();
  alert(`${product.name} added to cart!`);
}

/* =========================
   CART PAGE
========================= */
const cartDiv = document.getElementById("cart");
const totalDiv = document.getElementById("total");

function renderCart() {
  if (!cartDiv) return;

  if (cart.length === 0) {
    cartDiv.innerHTML = "<p style='text-align:center'>Your cart is empty.</p>";
    totalDiv.innerText = "";
    return;
  }

  cartDiv.innerHTML = cart.map((item, index) => `
    <div class="cart-item" style="display:flex; justify-content:space-between; margin-bottom:15px;">
      <div style="display:flex; gap:10px;">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}"
             style="width:80px;height:80px;object-fit:cover;border-radius:6px;">
        <div>
          <h4>${escapeHtml(item.name)}</h4>
          <p>${escapeHtml(item.description)}</p>
          <p><b>${formatPrice(item.price)} x ${item.quantity} = ${formatPrice(item.price * item.quantity)}</b></p>
        </div>
      </div>
      <div>
        <button onclick="increaseQuantity(${index})">+</button>
        <button onclick="decreaseQuantity(${index})">-</button>
        <button onclick="removeFromCart(${index})">Remove</button>
      </div>
    </div>
  `).join("");

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  totalDiv.innerText = `Total: ${formatPrice(totalPrice)}`;
}

function increaseQuantity(index) {
  if (cart[index].quantity < 99) cart[index].quantity++;
  saveCart();
  renderCart();
}

function decreaseQuantity(index) {
  if (cart[index].quantity > 1) {
    cart[index].quantity--;
  } else {
    cart.splice(index, 1);
  }
  saveCart();
  renderCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  renderCart();
}

/* =========================
   CHECKOUT (login required, server calculates the real total)
========================= */
let placingOrder = false;

async function checkout() {
  if (placingOrder) return;

  if (cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  if (!getToken()) {
    alert("Please log in to place your order.");
    localStorage.setItem("redirectAfterLogin", "cart.html");
    window.location = "login.html";
    return;
  }

  placingOrder = true;

  try {
    const res = await fetch(`${API_URL}/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        items: cart.map(item => ({ id: item.id, quantity: item.quantity }))
      })
    });

    const data = await res.json();

    if (res.status === 401) {
      alert(data.message || "Please log in again.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.setItem("redirectAfterLogin", "cart.html");
      window.location = "login.html";
      return;
    }

    if (!res.ok) {
      alert(data.message || "Could not place order");
      return;
    }

    alert(`${data.message}\nTotal: ${formatPrice(data.total)}`);
    cart = [];
    saveCart();
    renderCart();
  } catch (err) {
    console.error(err);
    alert("Failed to place order. Is the server running?");
  } finally {
    placingOrder = false;
  }
}

/* =========================
   INITIAL RENDER
========================= */
renderNav();
renderCart();