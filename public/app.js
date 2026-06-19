const API = '/api';
let clienteSeleccionado = null;
let tanqueIdParaIngreso = null;

// ---------- TABS ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'tanques') cargarTanques();
    if (btn.dataset.tab === 'clientes') cargarClientes();
    if (btn.dataset.tab === 'ingresos') { cargarSelectTanques('iTanque'); cargarIngresos(); }
    if (btn.dataset.tab === 'historial') cargarVentas();
    if (btn.dataset.tab === 'empresa') cargarEmpresa();
    if (btn.dataset.tab === 'venta') cargarSelectTanques('ventaTanque');
  });
});

// ---------- HELPERS ----------
async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error de servidor');
  return data;
}

async function cargarSelectTanques(selectId) {
  const tanques = await api('/tanques');
  const select = document.getElementById(selectId);
  select.innerHTML = tanques.map(t =>
    `<option value="${t.id}">${t.identificador} - ${t.tipo_carburante} (${t.stock_actual.toFixed(1)} L disp.)</option>`
  ).join('');
}

// ---------- VENTA ----------
document.getElementById('btnBuscarCliente').addEventListener('click', async () => {
  const valor = document.getElementById('ventaBuscar').value.trim();
  if (!valor) return;
  const cliente = await api('/clientes/buscar/' + encodeURIComponent(valor));
  if (!cliente) {
    document.getElementById('registroClienteModal').classList.remove('hidden');
    document.getElementById('nuevoPlaca').value = valor;
    return;
  }
  await seleccionarCliente(cliente);
});

document.getElementById('btnCancelarCliente').addEventListener('click', () => {
  document.getElementById('registroClienteModal').classList.add('hidden');
});

document.getElementById('btnGuardarCliente').addEventListener('click', async () => {
  try {
    const cliente = await api('/clientes', {
      method: 'POST',
      body: JSON.stringify({
        documento: document.getElementById('nuevoDocumento').value,
        nombre_razon_social: document.getElementById('nuevoNombre').value,
        placa: document.getElementById('nuevoPlaca').value,
        tipo_cliente: document.getElementById('nuevoTipo').value,
        estado: 'Activo'
      })
    });
    document.getElementById('registroClienteModal').classList.add('hidden');
    await seleccionarCliente(cliente);
  } catch (e) {
    alert(e.message);
  }
});

async function seleccionarCliente(cliente) {
  clienteSeleccionado = cliente;
  const box = document.getElementById('clienteInfo');
  box.classList.remove('hidden');
  box.innerHTML = `<strong>${cliente.nombre_razon_social}</strong> — Placa: ${cliente.placa} — Estado:
    <span class="badge ${cliente.estado.toLowerCase()}">${cliente.estado}</span>`;

  const cupo = await api('/ventas/cupo/' + cliente.id);
  const cupoBox = document.getElementById('cupoInfo');
  cupoBox.classList.remove('hidden');
  cupoBox.classList.add('ok');
  cupoBox.innerHTML = `
    ${cupo.esClienteNuevo ? '⚠️ Cliente nuevo, usando cupo base configurado.<br>' : ''}
    Promedio semanal: <strong>${cupo.promedioSemanal.toFixed(2)} L</strong><br>
    Límite permitido esta semana: <strong>${cupo.limitePermitido.toFixed(2)} L</strong>
  `;
  document.getElementById('btnProcesarVenta').disabled = cliente.estado === 'Suspendido';
}

document.getElementById('btnProcesarVenta').addEventListener('click', async () => {
  if (!clienteSeleccionado) return alert('Selecciona un cliente primero');
  const litros = parseFloat(document.getElementById('ventaLitros').value);
  const tanqueId = document.getElementById('ventaTanque').value;
  if (!litros || litros <= 0) return alert('Ingresa una cantidad válida de litros');

  try {
    const resultado = await api('/ventas', {
      method: 'POST',
      body: JSON.stringify({ cliente_id: clienteSeleccionado.id, tanque_id: tanqueId, litros_solicitados: litros })
    });
    const div = document.getElementById('ventaResultado');
    div.innerHTML = `<div class="info-box ${resultado.venta.fue_limitada ? 'warn' : 'ok'}">
      ${resultado.mensaje}<br>
      Litros despachados: <strong>${resultado.venta.litros_autorizados.toFixed(2)} L</strong>
    </div>`;
    cargarSelectTanques('ventaTanque');
  } catch (e) {
    document.getElementById('ventaResultado').innerHTML =
      `<div class="info-box warn">${e.message}</div>`;
  }
});

// ---------- TANQUES ----------
async function cargarTanques() {
  const tanques = await api('/tanques');
  document.querySelector('#tablaTanques tbody').innerHTML = tanques.map(t => `
    <tr>
      <td>${t.identificador}</td>
      <td>${t.tipo_carburante}</td>
      <td>${t.stock_actual.toFixed(2)} L</td>
      <td>${t.capacidad_maxima} L</td>
      <td>${t.porcentaje_actual}%</td>
      <td>${t.alerta_stock_bajo ? '🔴 Bajo' : '🟢 OK'}</td>
    </tr>`).join('');
}

document.getElementById('btnCrearTanque').addEventListener('click', async () => {
  try {
    await api('/tanques', {
      method: 'POST',
      body: JSON.stringify({
        identificador: document.getElementById('tIdentificador').value,
        tipo_carburante: document.getElementById('tTipo').value,
        capacidad_maxima: parseFloat(document.getElementById('tCapacidad').value),
        stock_minimo_seguridad: parseFloat(document.getElementById('tStockMin').value)
      })
    });
    cargarTanques();
  } catch (e) { alert(e.message); }
});

// ---------- CLIENTES ----------
async function cargarClientes() {
  const clientes = await api('/clientes');
  document.querySelector('#tablaClientes tbody').innerHTML = clientes.map(c => `
    <tr>
      <td>${c.documento}</td>
      <td>${c.nombre_razon_social}</td>
      <td>${c.placa}</td>
      <td>${c.tipo_cliente}</td>
      <td><span class="badge ${c.estado.toLowerCase()}">${c.estado}</span></td>
      <td><button onclick="toggleEstado(${c.id}, '${c.estado}')">
        ${c.estado === 'Activo' ? 'Suspender' : 'Activar'}
      </button></td>
    </tr>`).join('');
}

async function toggleEstado(id, estadoActual) {
  const nuevo = estadoActual === 'Activo' ? 'Suspendido' : 'Activo';
  await api(`/clientes/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado: nuevo }) });
  cargarClientes();
}

// ---------- INGRESOS ----------
async function cargarIngresos() {
  const ingresos = await api('/ingresos');
  document.querySelector('#tablaIngresos tbody').innerHTML = ingresos.map(i => `
    <tr>
      <td>${i.fecha_hora}</td>
      <td>${i.tanque_identificador}</td>
      <td>${i.litros} L</td>
      <td>${i.numero_factura}</td>
      <td>${i.proveedor || '-'}</td>
    </tr>`).join('');
}

document.getElementById('btnRegistrarIngreso').addEventListener('click', async () => {
  try {
    await api('/ingresos', {
      method: 'POST',
      body: JSON.stringify({
        tanque_id: document.getElementById('iTanque').value,
        litros: parseFloat(document.getElementById('iLitros').value),
        numero_factura: document.getElementById('iFactura').value,
        proveedor: document.getElementById('iProveedor').value
      })
    });
    cargarIngresos();
    cargarSelectTanques('iTanque');
  } catch (e) { alert(e.message); }
});

// ---------- HISTORIAL VENTAS ----------
async function cargarVentas() {
  const ventas = await api('/ventas');
  document.querySelector('#tablaVentas tbody').innerHTML = ventas.map(v => `
    <tr>
      <td>${v.fecha_hora}</td>
      <td>${v.nombre_razon_social}</td>
      <td>${v.placa}</td>
      <td>${v.tanque_identificador}</td>
      <td>${v.litros_solicitados} L</td>
      <td>${v.litros_autorizados} L</td>
      <td>${v.fue_limitada ? 'Sí' : 'No'}</td>
    </tr>`).join('');
}

// ---------- EMPRESA ----------
async function cargarEmpresa() {
  const empresa = await api('/empresa');
  document.getElementById('empresaForm').innerHTML = `
    <label>Nombre</label><input id="eNombre" value="${empresa.nombre}">
    <label>NIT</label><input id="eNit" value="${empresa.nit}">
    <label>Dirección</label><input id="eDireccion" value="${empresa.direccion || ''}">
    <label>Ciudad</label><input id="eCiudad" value="${empresa.ciudad || ''}">
    <label>Teléfono</label><input id="eTelefono" value="${empresa.telefono || ''}">
    <label>Email</label><input id="eEmail" value="${empresa.email || ''}">
    <label>Factor de holgura (ej. 0.10 = 10%)</label><input id="eHolgura" type="number" step="0.01" value="${empresa.factor_holgura}">
    <label>Periodo de evaluación (días)</label><input id="ePeriodo" type="number" value="${empresa.periodo_evaluacion_dias}">
    <label>Cupo base cliente nuevo (L)</label><input id="eCupoBase" type="number" value="${empresa.cupo_base_cliente_nuevo}">
    <label>% alerta stock mínimo</label><input id="eAlerta" type="number" step="0.01" value="${empresa.stock_minimo_alerta_pct}">
    <button id="btnGuardarEmpresa">Guardar</button>
  `;
  document.getElementById('btnGuardarEmpresa').addEventListener('click', async () => {
    await api('/empresa/' + empresa.id, {
      method: 'PUT',
      body: JSON.stringify({
        nombre: document.getElementById('eNombre').value,
        nit: document.getElementById('eNit').value,
        direccion: document.getElementById('eDireccion').value,
        ciudad: document.getElementById('eCiudad').value,
        telefono: document.getElementById('eTelefono').value,
        email: document.getElementById('eEmail').value,
        factor_holgura: parseFloat(document.getElementById('eHolgura').value),
        periodo_evaluacion_dias: parseInt(document.getElementById('ePeriodo').value),
        cupo_base_cliente_nuevo: parseFloat(document.getElementById('eCupoBase').value),
        stock_minimo_alerta_pct: parseFloat(document.getElementById('eAlerta').value)
      })
    });
    alert('Configuración guardada');
  });
}

// ---------- INIT ----------
cargarSelectTanques('ventaTanque');
