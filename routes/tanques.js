const express = require('express');
const router = express.Router();
const { get, run, all } = require('../db/database');

// Listar todos los tanques (con alerta de stock minimo calculada)
router.get('/', async (req, res) => {
  try {
    const empresa = await get('SELECT * FROM empresa ORDER BY id LIMIT 1');
    const tanques = await all('SELECT * FROM tanque ORDER BY identificador');
    const resultado = tanques.map(t => ({
      ...t,
      porcentaje_actual: +( (t.stock_actual / t.capacidad_maxima) * 100 ).toFixed(2),
      alerta_stock_bajo: t.stock_actual <= t.stock_minimo_seguridad ||
        (empresa && t.stock_actual <= empresa.stock_minimo_alerta_pct * t.capacidad_maxima)
    }));
    res.json(resultado);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Obtener un tanque
router.get('/:id', async (req, res) => {
  try {
    const tanque = await get('SELECT * FROM tanque WHERE id = ?', [req.params.id]);
    if (!tanque) return res.status(404).json({ error: 'Tanque no encontrado' });
    res.json(tanque);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Crear tanque
router.post('/', async (req, res) => {
  try {
    const { identificador, tipo_carburante, capacidad_maxima, stock_minimo_seguridad } = req.body;
    if (!identificador || !tipo_carburante || !capacidad_maxima || stock_minimo_seguridad == null) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    const result = await run(
      `INSERT INTO tanque (identificador, tipo_carburante, capacidad_maxima, stock_minimo_seguridad, stock_actual)
       VALUES (?, ?, ?, ?, 0)`,
      [identificador, tipo_carburante, capacidad_maxima, stock_minimo_seguridad]
    );
    const tanque = await get('SELECT * FROM tanque WHERE id = ?', [result.id]);
    res.status(201).json(tanque);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Editar tanque
router.put('/:id', async (req, res) => {
  try {
    const { identificador, tipo_carburante, capacidad_maxima, stock_minimo_seguridad } = req.body;
    await run(
      `UPDATE tanque SET identificador = ?, tipo_carburante = ?, capacidad_maxima = ?, stock_minimo_seguridad = ?
       WHERE id = ?`,
      [identificador, tipo_carburante, capacidad_maxima, stock_minimo_seguridad, req.params.id]
    );
    const tanque = await get('SELECT * FROM tanque WHERE id = ?', [req.params.id]);
    res.json(tanque);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Eliminar tanque
router.delete('/:id', async (req, res) => {
  try {
    await run('DELETE FROM tanque WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
