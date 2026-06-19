-- ============================================================
-- DEFP Petrol - Esquema de Base de Datos (SQLite)
-- ============================================================

-- A. EMPRESA (parametros globales de la estacion)
CREATE TABLE IF NOT EXISTS empresa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL DEFAULT 'DEFP Petrol',
    nit TEXT NOT NULL,
    direccion TEXT,
    ciudad TEXT,
    telefono TEXT,
    email TEXT,
    factor_holgura REAL NOT NULL DEFAULT 0.10,      -- ej. 0.10 = 10% adicional sobre el promedio
    periodo_evaluacion_dias INTEGER NOT NULL DEFAULT 28, -- 4 semanas
    cupo_base_cliente_nuevo REAL NOT NULL DEFAULT 50,    -- litros, hasta tener historial
    stock_minimo_alerta_pct REAL NOT NULL DEFAULT 0.15,  -- alerta cuando stock < 15% capacidad
    creado_en TEXT DEFAULT (datetime('now'))
);

-- B. TANQUES
CREATE TABLE IF NOT EXISTS tanque (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identificador TEXT NOT NULL UNIQUE,         -- ej. "T-01"
    tipo_carburante TEXT NOT NULL CHECK (tipo_carburante IN ('Gasolina','Diesel')),
    capacidad_maxima REAL NOT NULL,             -- litros
    stock_minimo_seguridad REAL NOT NULL,       -- litros
    stock_actual REAL NOT NULL DEFAULT 0,       -- litros (se actualiza con ingresos/salidas)
    creado_en TEXT DEFAULT (datetime('now'))
);

-- C. CLIENTES
CREATE TABLE IF NOT EXISTS cliente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    documento TEXT NOT NULL UNIQUE,             -- CI / NIT
    nombre_razon_social TEXT NOT NULL,
    placa TEXT NOT NULL,
    tipo_cliente TEXT NOT NULL CHECK (tipo_cliente IN ('Particular','Transporte Publico','Empresa')),
    estado TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo','Suspendido')),
    creado_en TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cliente_placa ON cliente(placa);

-- D. INGRESOS (abastecimiento de tanques)
CREATE TABLE IF NOT EXISTS ingreso (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanque_id INTEGER NOT NULL REFERENCES tanque(id),
    litros REAL NOT NULL,
    numero_factura TEXT NOT NULL,
    proveedor TEXT,
    fecha_hora TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tanque_id) REFERENCES tanque(id)
);

-- E. VENTAS (salidas controladas)
CREATE TABLE IF NOT EXISTS venta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL REFERENCES cliente(id),
    tanque_id INTEGER NOT NULL REFERENCES tanque(id),
    litros_solicitados REAL NOT NULL,
    litros_autorizados REAL NOT NULL,           -- litros realmente despachados (puede ser < solicitado)
    promedio_semanal REAL,                      -- Ps calculado al momento de la venta
    limite_permitido REAL,                      -- Ps + holgura
    fue_limitada INTEGER NOT NULL DEFAULT 0,    -- 1 si se topo el cupo
    fecha_hora TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (cliente_id) REFERENCES cliente(id),
    FOREIGN KEY (tanque_id) REFERENCES tanque(id)
);
CREATE INDEX IF NOT EXISTS idx_venta_cliente_fecha ON venta(cliente_id, fecha_hora);
