require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error("❌ Missing MONGO_URI or JWT_SECRET in environment variables");
  process.exit(1);
}

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

/* =========================
   MODELS
========================= */
const User = mongoose.model(
  "User",
  new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true, maxlength: 60 },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      password: { type: String, required: true }
    },
    { timestamps: true }
  )
);

const Order = mongoose.model(
  "Order",
  new mongoose.Schema(
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      items: [
        { productId: String, name: String, price: Number, quantity: Number }
      ],
      total: { type: Number, required: true }
    },
    { timestamps: true }
  )
);

/* =========================
   PRODUCTS (prices live here, on the server)
========================= */
const products = [
  { id: "1", name: "Smartphone", price: 20000, description: "Latest Android smartphone with 5G", image: "images/Smartphone.jpg" },
  { id: "2", name: "Laptop", price: 60000, description: "High performance laptop for work", image: "images/laptop.jpg" },
  { id: "3", name: "Headphones", price: 3000, description: "Noise cancelling headphones", image: "images/Headphones.webp" },
  { id: "4", name: "Smart Watch", price: 18000, description: "Fitness tracking smart watch", image: "images/watch.jpg" },
  { id: "5", name: "Keyboard", price: 1500, description: "Mechanical keyboard", image: "images/keyboard.jpg" },
  { id: "6", name: "Mouse", price: 800, description: "Wireless mouse", image: "images/mouse.jpg" },
  { id: "7", name: "Tablet", price: 25000, description: "10-inch display tablet", image: "images/tablet.jpg" }
];

/* =========================
   HELPERS
========================= */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function authResponse(user) {
  return {
    token: createToken(user._id),
    user: { name: user.name, email: user.email }
  };
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Please log in first" });

  try {
    req.userId = jwt.verify(token, process.env.JWT_SECRET).id;
    next();
  } catch {
    res.status(401).json({ message: "Session expired, please log in again" });
  }
}

/* =========================
   ROUTES
========================= */
app.get("/", (req, res) => res.send("🛒 Store backend is running"));

app.get("/products", (req, res) => res.json(products));

/* ---- Register ---- */
app.post("/register", async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string")
      return res.status(400).json({ message: "Invalid input" });

    name = name.trim();
    email = email.trim().toLowerCase();

    if (name.length < 2)
      return res.status(400).json({ message: "Name must be at least 2 characters" });
    if (!EMAIL_REGEX.test(email))
      return res.status(400).json({ message: "Enter a valid email address" });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    if (await User.findOne({ email }))
      return res.status(400).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    res.status(201).json(authResponse(user));
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: "Email already registered" });
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
});

/* ---- Login ---- */
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string" || !email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: "Invalid email or password" });

    res.json(authResponse(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

/* ---- Place order (login required, total calculated here) ---- */
app.post("/order", auth, async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0 || items.length > 50)
      return res.status(400).json({ message: "Your cart is empty" });

    const orderItems = [];
    let total = 0;

    for (const item of items) {
      const product = products.find(p => p.id === String(item.id));
      const qty = item.quantity;

      if (!product)
        return res.status(400).json({ message: "A product in your cart no longer exists" });
      if (!Number.isInteger(qty) || qty < 1 || qty > 99)
        return res.status(400).json({ message: "Invalid quantity" });

      orderItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: qty
      });
      total += product.price * qty;
    }

    await Order.create({ user: req.userId, items: orderItems, total });
    res.status(201).json({ message: "Order placed successfully", total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not place order" });
  }
});

/* =========================
   404 + ERROR HANDLING
========================= */
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed")
    return res.status(400).json({ message: "Invalid JSON" });
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

/* =========================
   DATABASE + START
========================= */
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });
