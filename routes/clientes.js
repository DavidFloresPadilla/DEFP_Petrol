const express = require('express');
const router = express.Router();
const { get, run, all } = require('../db/database');

// Listar clientes
router.get('/', async (req, res) => {
  try {
    const clientes = await all('SELECT * FROM cliente ORDER BY nombre_razon_social');
    res.json(clientes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Buscar cliente por placa o documento (usado en el flujo de venta)
router.get('/buscar/:valor', async (req, res) => {
  try {
    const valor = req.params.valor;
    const cliente = await get(
      'SELECT * FROM cliente WHERE placa = ? OR documento = ?',
      [valor, valor]
    );
    res.json(cliente || null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Crear cliente (registro manual o automatico desde el flujo de venta)
router.post('/', async (req, res) => {
  try {
    const { documento, nombre_razon_social, placa, tipo_cliente, estado } = req.body;
    if (!documento || !nombre_razon_social || !placa || !tipo_cliente) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    const result = await run(
      `INSERT INTO cliente (documento, nombre_razon_social, placa, tipo_cliente, estado)
       VALUES (?, ?, ?, ?, ?)`,
      [documento, nombre_razon_social, placa, tipo_cliente, estado || 'Activo']
    );
    const cliente = await get('SELECT * FROM cliente WHERE id = ?', [result.id]);
    res.status(201).json(cliente);
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ya existe un cliente con ese documento' });
    }
    res.status(500).json({ error: e.message });
  }
});

// Editar cliente
router.put('/:id', async (req, res) => {
  try {
    const { documento, nombre_razon_social, placa, tipo_cliente, estado } = req.body;
    await run(
      `UPDATE cliente SET documento = ?, nombre_razon_social = ?, placa = ?, tipo_cliente = ?, estado = ?
       WHERE id = ?`,
      [documento, nombre_razon_social, placa, tipo_cliente, estado, req.params.id]
    );
    const cliente = await get('SELECT * FROM cliente WHERE id = ?', [req.params.id]);
    res.json(cliente);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Suspender / activar cliente
router.patch('/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    await run('UPDATE cliente SET estado = ? WHERE id = ?', [estado, req.params.id]);
    const cliente = await get('SELECT * FROM cliente WHERE id = ?', [req.params.id]);
    res.json(cliente);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
