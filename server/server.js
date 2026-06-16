const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'beyondtheworld_super_secret_key_2026';

// For this project, we are storing the admin password hash here.
// Hash of 'BTW2026'
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('BTW2026', 10);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve the uploads directory statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Serve the main public directory statically (so image assets load correctly if sent as 'Assets/...')
app.use('/Assets', express.static(path.join(__dirname, '../Assets')));

// ── Multer Setup for Image Uploads ──
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ── Data Handling ──
const dataFilePath = path.join(__dirname, 'data', 'products.json');

function getProducts() {
  try {
    const data = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveProducts(products) {
  fs.writeFileSync(dataFilePath, JSON.stringify(products, null, 2));
}

// ── Auth Middleware ──
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'No token provided' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// ── Routes ──

// Login
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }

  const isValid = bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
  
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid password' });
  }

  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, message: 'Login successful' });
});

// Get Products (Public)
app.get('/api/products', (req, res) => {
  const products = getProducts();
  res.json(products);
});

// Add Product (Protected)
app.post('/api/products', authenticateToken, upload.single('image'), (req, res) => {
  const products = getProducts();
  
  // Parse fields
  const newProduct = {
    id: Date.now().toString(),
    name: req.body.name,
    category: req.body.category,
    price: parseFloat(req.body.price),
    tag: req.body.tag || '',
    available: req.body.available === 'true' || req.body.available === true,
    isNew: req.body.tag === 'new',
    addedDate: new Date().toISOString().split('T')[0]
  };

  // If a file was uploaded, save its path, otherwise check if they passed a base64 or string image
  if (req.file) {
    newProduct.image = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  } else if (req.body.image) {
    newProduct.image = req.body.image;
  } else {
    newProduct.image = '';
  }

  products.unshift(newProduct);
  saveProducts(products);
  
  res.status(201).json({ message: 'Product added successfully', product: newProduct });
});

// Edit Product (Protected)
app.put('/api/products/:id', authenticateToken, upload.single('image'), (req, res) => {
  const products = getProducts();
  const idx = products.findIndex(p => p.id === req.params.id);
  
  if (idx === -1) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const existingProduct = products[idx];
  
  const updatedProduct = {
    ...existingProduct,
    name: req.body.name || existingProduct.name,
    category: req.body.category || existingProduct.category,
    price: req.body.price ? parseFloat(req.body.price) : existingProduct.price,
    tag: req.body.tag !== undefined ? req.body.tag : existingProduct.tag,
    available: req.body.available !== undefined ? (req.body.available === 'true' || req.body.available === true) : existingProduct.available,
  };
  
  updatedProduct.isNew = updatedProduct.tag === 'new';

  if (req.file) {
    updatedProduct.image = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  } else if (req.body.image) {
    updatedProduct.image = req.body.image;
  }

  products[idx] = updatedProduct;
  saveProducts(products);
  
  res.json({ message: 'Product updated successfully', product: updatedProduct });
});

// Delete Product (Protected)
app.delete('/api/products/:id', authenticateToken, (req, res) => {
  let products = getProducts();
  const idx = products.findIndex(p => p.id === req.params.id);
  
  if (idx === -1) {
    return res.status(404).json({ message: 'Product not found' });
  }

  products = products.filter(p => p.id !== req.params.id);
  saveProducts(products);
  
  res.json({ message: 'Product deleted successfully' });
});

// Toggle Availability (Protected) - Convenience Route
app.patch('/api/products/:id/availability', authenticateToken, (req, res) => {
  const products = getProducts();
  const idx = products.findIndex(p => p.id === req.params.id);
  
  if (idx === -1) {
    return res.status(404).json({ message: 'Product not found' });
  }

  products[idx].available = req.body.available;
  saveProducts(products);
  
  res.json({ message: 'Availability updated', product: products[idx] });
});

app.listen(PORT, () => {
  console.log(`Beyond The World API running on http://localhost:${PORT}`);
});
