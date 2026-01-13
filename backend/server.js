const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const USERS_FILE = './users.json';
const ORDERS_FILE = './orders.json';

// Products (hardcoded)
const products = [
  { id: "1", name: "Smartphone", price: 20000, description: "Latest Android smartphone with 5G", image: "images/smartphone.jpg" },
  { id: "2", name: "Laptop", price: 60000, description: "High performance laptop for work", image: "images/laptop.jpg" },
  { id: "3", name: "Headphones", price: 3000, description: "Noise cancelling headphones", image: "images/Headphones.webp" },
  { id: "4", name: "Smart Watch", price: 18000, description: "Fitness tracking smart watch", image: "images/smartwatch.jpg" },
  { id: "5", name: "Keyboard", price: 1500, description: "Mechanical keyboard", image: "images/keyboard.jpg" },
  { id: "6", name: "Mouse", price: 800, description: "Wireless mouse", image: "images/mouse.jpg" },
  { id: "7", name: "Tablet", price: 25000, description: "10-inch display tablet", image: "images/tablet.jpg" }
];

// --- Get products ---
app.get('/products', (req, res) => res.json(products));

// --- Register ---
app.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  let users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : [];
  if(users.find(u => u.email === email)) return res.status(400).json({ message: 'Email already exists' });
  users.push({ name, email, password });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.json({ message: 'Registered successfully' });
});

// --- Login ---
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  let users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : [];
  const user = users.find(u => u.email === email && u.password === password);
  if(!user) return res.status(401).json({ message: 'Invalid credentials' });
  res.json({ message: 'Login successful', user: { name: user.name, email: user.email } });
});

// --- Place order ---
app.post('/order', (req, res) => {
  const { userEmail, items, total } = req.body;
  let orders = fs.existsSync(ORDERS_FILE) ? JSON.parse(fs.readFileSync(ORDERS_FILE)) : [];
  orders.push({ userEmail, items, total, date: new Date().toISOString() });
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  res.json({ message: 'Order placed successfully' });
});

// --- Start server ---
app.listen(5000, () => console.log('Backend running at http://localhost:5000'));
