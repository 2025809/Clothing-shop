const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'pass1234',
    database: 'clothing_store'
});

db.connect((err) => {
    if (err) {
        console.error('❌ MySQL connection failed:', err);
        return;
    }
    console.log('✅ Connected to clothing_store database');
});

module.exports = db;