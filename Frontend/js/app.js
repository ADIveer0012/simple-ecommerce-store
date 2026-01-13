/* ---------- API CONFIG ---------- */
const API_URL = "http://localhost:5000";

/* ---------- CART STORAGE ---------- */
let cart = JSON.parse(localStorage.getItem("cart")) || [];

/* ---------- INDEX.HTML: DISPLAY PRODUCT LIST ---------- */
const productsDiv = document.getElementById("products");

if (productsDiv) {
  fetch(`${API_URL}/products`)
    .then(res => res.json())
    .then(products => {
      productsDiv.innerHTML = products.map(p => `
        <div class="product">
          <img src="${p.image}" alt="${p.name}">
          <h3>${p.name}</h3>
          <p class="price">₹${p.price}</p>
          <a href="product.html?id=${p.id}" class="view-btn">View</a>
        </div>
      `).join("");
    })
    .catch(err => {
      productsDiv.innerHTML = "<p>Failed to load products</p>";
      console.error(err);
    });
}

/* ---------- PRODUCT.HTML: DISPLAY PRODUCT DETAILS ---------- */
/* ---------- PRODUCT.HTML: DISPLAY PRODUCT DETAILS ---------- */
const productDiv = document.getElementById("product");

if (productDiv) {
  const params = new URLSearchParams(window.location.search);
  const pid = params.get("id");

  fetch(`${API_URL}/products`)
    .then(res => res.json())
    .then(products => {
      const p = products.find(item => String(item.id) === String(pid));

      if (p) {
        productDiv.innerHTML = `
          <img src="${p.image}" class="detail-img" alt="${p.name}">
          <h2>${p.name}</h2>
          <p>${p.description}</p>
          <p class="price">₹${p.price}</p>
          <button onclick='addToCart(${JSON.stringify(p)})'>Add to Cart</button>
        `;
      } else {
        productDiv.innerHTML = "<p>Product not found</p>";
      }
    })
    .catch(err => {
      console.error("Fetch error:", err);
      productDiv.innerHTML = "<p>Error loading product</p>";
    });
}


/* ---------- ADD TO CART ---------- */
function addToCart(product) {
  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  alert(`${product.name} added to cart!`);
  renderCart();
}

/* ---------- CART.HTML: DISPLAY CART ---------- */
const cartDiv = document.getElementById("cart");
const totalDiv = document.getElementById("total");

function renderCart() {
  if (!cartDiv) return;

  if (cart.length === 0) {
    cartDiv.innerHTML = "<p>Your cart is empty.</p>";
    totalDiv.innerText = "";
    return;
  }

  cartDiv.innerHTML = cart.map((item, index) => `
    <div class="cart-item" style="display:flex; justify-content:space-between; margin-bottom:15px;">
      <div style="display:flex; gap:10px;">
        <img src="${item.image}" style="width:80px;height:80px;object-fit:cover;border-radius:6px;">
        <div>
          <h4>${item.name}</h4>
          <p>${item.description}</p>
          <p><b>₹${item.price} x ${item.quantity} = ₹${item.price * item.quantity}</b></p>
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
  totalDiv.innerText = `Total: ₹${totalPrice}`;
}

/* ---------- QUANTITY HANDLERS ---------- */
function increaseQuantity(index) {
  cart[index].quantity++;
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

function decreaseQuantity(index) {
  if (cart[index].quantity > 1) {
    cart[index].quantity--;
  } else {
    cart.splice(index, 1);
  }
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

/* ---------- REMOVE ITEM ---------- */
function removeFromCart(index) {
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

/* ---------- CHECKOUT ---------- */
function checkout() {
  if (cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  const orderData = {
    userEmail: "guest@example.com", // later replace with logged-in user
    items: cart,
    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  };

  fetch(`${API_URL}/order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(orderData)
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      cart = [];
      localStorage.setItem("cart", JSON.stringify(cart));
      renderCart();
    })
    .catch(err => {
      console.error(err);
      alert("Failed to place order");
    });
}
/* ---------- INITIAL RENDER ---------- */
renderCart();
