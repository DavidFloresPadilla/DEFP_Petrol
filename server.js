const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db/database');

const empresaRoutes = require('./routes/empresa');
const tanquesRoutes = require('./routes/tanques');
const clientesRoutes = require('./routes/clientes');
const ingresosRoutes = require('./routes/ingresos');
const ventasRoutes = require('./routes/ventas');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar base de datos (crea tablas si no existen)
initDb();

// Rutas de la API
app.use('/api/empresa', empresaRoutes);
app.use('/api/tanques', tanquesRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/ingresos', ingresosRoutes);
app.use('/api/ventas', ventasRoutes);

// Health check (util para Render)
app.get('/api/health', (req, res) => res.json({ status: 'ok', empresa: 'DEFP Petrol' }));

// Fallback para servir el frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DEFP Petrol corriendo en http://localhost:${PORT}`);
});
