const express = require('express');
const router = express.Router();
const { get, run, all } = require('../db/database');

// Listar ingresos
router.get('/', async (req, res) => {
  try {
    const ingresos = await all(`
      SELECT i.*, t.identificador AS tanque_identificador, t.tipo_carburante
      FROM ingreso i
      JOIN tanque t ON t.id = i.tanque_id
      ORDER BY i.fecha_hora DESC
    `);
    res.json(ingresos);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Registrar ingreso (abastecimiento de un tanque)
router.post('/', async (req, res) => {
  try {
    const { tanque_id, litros, numero_factura, proveedor } = req.body;
    if (!tanque_id || !litros || litros <= 0 || !numero_factura) {
      return res.status(400).json({ error: 'Faltan campos requeridos o litros invalidos' });
    }

    const tanque = await get('SELECT * FROM tanque WHERE id = ?', [tanque_id]);
    if (!tanque) return res.status(404).json({ error: 'Tanque no encontrado' });

    const nuevoStock = tanque.stock_actual + Number(litros);
    if (nuevoStock > tanque.capacidad_maxima) {
      return res.status(400).json({
        error: `El ingreso excede la capacidad maxima del tanque (${tanque.capacidad_maxima} L)`
      });
    }

    const result = await run(
      `INSERT INTO ingreso (tanque_id, litros, numero_factura, proveedor)
       VALUES (?, ?, ?, ?)`,
      [tanque_id, litros, numero_factura, proveedor || null]
    );

    await run('UPDATE tanque SET stock_actual = ? WHERE id = ?', [nuevoStock, tanque_id]);

    const ingreso = await get('SELECT * FROM ingreso WHERE id = ?', [result.id]);
    res.status(201).json(ingreso);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
