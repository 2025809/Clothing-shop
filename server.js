// server.js - Node.js + MySQL connection for clothing e-commerce

// Alright, let's bring in the tools I need: Express for the web server,
// MySQL for talking to the database, and CORS so my frontend can talk to me.
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
// Letting any frontend (even from different ports) access my API – handy during development
app.use(cors());
// This lets me automatically parse JSON data sent from the frontend (like when adding to cart)
app.use(express.json());

// 👇 I added this line to serve my static files (HTML, CSS, JS) from the 'public' folder.
// Now I don't need a separate static server – Express handles it all.
app.use(express.static('public'));

// ----------------------------------------------
// STEP 1: CONNECT TO MYSQL DATABASE
// ----------------------------------------------
// Setting up the connection to my local MySQL database.
// I'm using 'root' with no password for now – in production I'd definitely change this.
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'pass1234',          // MySQL password
    database: 'clothing_store'
});

// Actually trying to connect – if it fails, log the error and stop.
// If it works, I'll see a happy message in the console.
db.connect((err) => {
    if (err) {
        console.error('MySQL connection failed:', err);
        return;
    }
    console.log('Connected to clothing_store database');
});

// ----------------------------------------------
// STEP 2: API ENDPOINTS (same as before)
// ----------------------------------------------

// GET all products from the database – no filters, just everything.
app.get('/api/products', (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// GET products by category (like 'shirts' or 'pants') – using a parameter in the URL.
app.get('/api/products/category/:category', (req, res) => {
    db.query('SELECT * FROM products WHERE category = ?', [req.params.category], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// GET a single product by its ID – useful for a product detail page.
app.get('/api/products/:id', (req, res) => {
    db.query('SELECT * FROM products WHERE id = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        // result[0] because the query returns an array with one row
        res.json(result[0]);
    });
});

// This endpoint updates all product prices by a random multiplier (0.95 to 1.10).
// It simulates dynamic market pricing – just for fun.
app.post('/api/update-prices', (req, res) => {
    const multiplier = 0.95 + (Math.random() * 0.15);
    db.query('UPDATE products SET price = ROUND(price * ?, 2)', [multiplier], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            message: 'Prices updated to current market rate',
            multiplier: multiplier.toFixed(2),
            affectedRows: result.affectedRows
        });
    });
});

// In-memory cart – okay for a demo, but in a real app I'd store this in a session or database.
// It'll reset every time the server restarts, so don't rely on it for production.
let cart = [];

// Get the current cart contents.
app.get('/api/cart', (req, res) => {
    res.json(cart);
});

// Add a product to the cart. Expects productId and optional quantity in the request body.
app.post('/api/cart/add', (req, res) => {
    const { productId, quantity = 1 } = req.body;
    // First, look up the product details from the database (name, price)
    db.query('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) return res.status(500).json({ error: err.message });
        if (product.length === 0) return res.status(404).json({ error: 'Product not found' });
        // Then push a copy of the product data into the cart array.
        // Note: This doesn't check if the product is already in cart – adds duplicate entries.
        cart.push({
            productId: product[0].id,
            name: product[0].name,
            price: product[0].price,
            quantity
        });
        res.json({ message: 'Item added to cart', cart });
    });
});

// Remove an item from the cart by its array index (not product ID – a bit brittle, but works for a demo).
app.delete('/api/cart/remove/:index', (req, res) => {
    const index = parseInt(req.params.index);
    if (index >= 0 && index < cart.length) {
        cart.splice(index, 1);
        res.json({ message: 'Item removed', cart });
    } else {
        res.status(400).json({ error: 'Invalid index' });
    }
});

// Checkout: calculate total, clear the cart, and return a success message.
app.post('/api/checkout', (req, res) => {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart = []; // bye bye cart items – in reality, I'd save the order to a database here.
    res.json({ message: 'Order placed successfully!', total: total.toFixed(2) });
});

// Start the server on port 3000 – I'll be able to visit http://localhost:3000 in my browser.
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    // Just a friendly reminder of all the endpoints I've built so far.
    console.log('API endpoints ready:');
    console.log('  GET  /api/products');
    console.log('  POST /api/update-prices');
    console.log('  GET  /api/cart');
    console.log('  POST /api/cart/add');
    console.log('  DELETE /api/cart/remove/:index');
    console.log('  POST /api/checkout');
});