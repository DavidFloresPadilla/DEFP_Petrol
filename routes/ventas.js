const express = require('express');
const router = express.Router();
const { get, run, all } = require('../db/database');

// ------------------------------------------------------------------
// Calcula el promedio semanal (Ps) y el limite permitido para un cliente
// segun la regla de negocio del PDF (seccion 3).
// ------------------------------------------------------------------
async function calcularCupo(clienteId, empresa) {
  const dias = empresa.periodo_evaluacion_dias; // ej. 28
  const semanas = dias / 7;

  const fila = await get(
    `SELECT COALESCE(SUM(litros_autorizados), 0) AS total
     FROM venta
     WHERE cliente_id = ? AND fecha_hora >= datetime('now', '-' || ? || ' days')`,
    [clienteId, dias]
  );

  const huboVentasPrevias = await get(
    `SELECT COUNT(*) AS c FROM venta WHERE cliente_id = ?`,
    [clienteId]
  );

  let promedioSemanal;
  let esClienteNuevo = huboVentasPrevias.c === 0;

  if (esClienteNuevo) {
    // Excepcion de cliente nuevo: usa el cupo base configurado
    promedioSemanal = empresa.cupo_base_cliente_nuevo;
  } else {
    promedioSemanal = fila.total / semanas;
  }

  const limitePermitido = promedioSemanal * (1 + empresa.factor_holgura);

  return { promedioSemanal, limitePermitido, esClienteNuevo };
}

// Endpoint auxiliar: consultar el cupo de un cliente SIN registrar venta
// (usado por el frontend para mostrar "Limite de compra permitido" antes de vender)
router.get('/cupo/:clienteId', async (req, res) => {
  try {
    const empresa = await get('SELECT * FROM empresa ORDER BY id LIMIT 1');
    const cliente = await get('SELECT * FROM cliente WHERE id = ?', [req.params.clienteId]);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const cupo = await calcularCupo(cliente.id, empresa);
    res.json({ cliente, ...cupo });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Listar ventas (historial)
router.get('/', async (req, res) => {
  try {
    const ventas = await all(`
      SELECT v.*, c.nombre_razon_social, c.placa, t.identificador AS tanque_identificador, t.tipo_carburante
      FROM venta v
      JOIN cliente c ON c.id = v.cliente_id
      JOIN tanque t ON t.id = v.tanque_id
      ORDER BY v.fecha_hora DESC
    `);
    res.json(ventas);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ------------------------------------------------------------------
// Registrar una venta (Salida controlada) -> nucleo operativo del sistema
// ------------------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { cliente_id, tanque_id, litros_solicitados } = req.body;

    if (!cliente_id || !tanque_id || !litros_solicitados || litros_solicitados <= 0) {
      return res.status(400).json({ error: 'Faltan campos requeridos o litros invalidos' });
    }

    const empresa = await get('SELECT * FROM empresa ORDER BY id LIMIT 1');
    const cliente = await get('SELECT * FROM cliente WHERE id = ?', [cliente_id]);
    const tanque = await get('SELECT * FROM tanque WHERE id = ?', [tanque_id]);

    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    if (!tanque) return res.status(404).json({ error: 'Tanque no encontrado' });

    if (cliente.estado === 'Suspendido') {
      return res.status(403).json({ error: 'El cliente esta suspendido y no puede comprar' });
    }

    // 2. Calculo de cupo (Ps)
    const { promedioSemanal, limitePermitido, esClienteNuevo } = await calcularCupo(cliente.id, empresa);

    // 3. Validacion contra el limite permitido
    let litrosAutorizados = Number(litros_solicitados);
    let fueLimitada = false;
    if (litrosAutorizados > limitePermitido) {
      litrosAutorizados = limitePermitido;
      fueLimitada = true;
    }

    // Validar stock disponible en el tanque
    if (litrosAutorizados > tanque.stock_actual) {
      litrosAutorizados = tanque.stock_actual;
    }

    if (litrosAutorizados <= 0) {
      return res.status(400).json({
        error: 'No es posible procesar la venta: cupo agotado o stock insuficiente',
        promedio_semanal: promedioSemanal,
        limite_permitido: limitePermitido
      });
    }

    // 4. Despacho y descontabilidad
    const result = await run(
      `INSERT INTO venta (cliente_id, tanque_id, litros_solicitados, litros_autorizados,
                           promedio_semanal, limite_permitido, fue_limitada)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cliente_id, tanque_id, litros_solicitados, litrosAutorizados,
       promedioSemanal, limitePermitido, fueLimitada ? 1 : 0]
    );

    await run(
      'UPDATE tanque SET stock_actual = stock_actual - ? WHERE id = ?',
      [litrosAutorizados, tanque_id]
    );

    const venta = await get('SELECT * FROM venta WHERE id = ?', [result.id]);

    res.status(201).json({
      venta,
      cliente_nuevo: esClienteNuevo,
      mensaje: fueLimitada
        ? `Venta limitada al cupo disponible (${litrosAutorizados.toFixed(2)} L) ya que se solicitaron ${litros_solicitados} L`
        : 'Venta procesada dentro del limite permitido'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
