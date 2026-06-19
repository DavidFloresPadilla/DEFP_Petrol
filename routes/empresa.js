const express = require('express');
const router = express.Router();
const { get, run, all } = require('../db/database');

// Obtener configuracion de la empresa (siempre el registro id=1)
router.get('/', async (req, res) => {
  try {
    const empresa = await get('SELECT * FROM empresa ORDER BY id LIMIT 1');
    res.json(empresa || null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Actualizar configuracion de la empresa
router.put('/:id', async (req, res) => {
  try {
    const {
      nombre, nit, direccion, ciudad, telefono, email,
      factor_holgura, periodo_evaluacion_dias,
      cupo_base_cliente_nuevo, stock_minimo_alerta_pct
    } = req.body;

    await run(
      `UPDATE empresa SET
        nombre = ?, nit = ?, direccion = ?, ciudad = ?, telefono = ?, email = ?,
        factor_holgura = ?, periodo_evaluacion_dias = ?,
        cupo_base_cliente_nuevo = ?, stock_minimo_alerta_pct = ?
       WHERE id = ?`,
      [nombre, nit, direccion, ciudad, telefono, email,
       factor_holgura, periodo_evaluacion_dias,
       cupo_base_cliente_nuevo, stock_minimo_alerta_pct, req.params.id]
    );

    const empresa = await get('SELECT * FROM empresa WHERE id = ?', [req.params.id]);
    res.json(empresa);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
