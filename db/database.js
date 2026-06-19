const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'defp_petrol.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const db = new sqlite3.Database(DB_PATH);

function initDb() {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema, (err) => {
    if (err) {
      console.error('Error creando esquema:', err.message);
      return;
    }
    // Sembrar empresa por defecto si no existe ninguna
    db.get('SELECT COUNT(*) as c FROM empresa', (err, row) => {
      if (!err && row.c === 0) {
        db.run(
          `INSERT INTO empresa (nombre, nit, direccion, ciudad, telefono, email)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ['DEFP Petrol', '0000000000', 'Av. Principal s/n', 'Santa Cruz de la Sierra', '700-00000', 'contacto@defppetrol.com']
        );
      }
    });
  });
}

// Helpers basados en promesas para usar async/await en las rutas
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = { db, initDb, run, get, all };
