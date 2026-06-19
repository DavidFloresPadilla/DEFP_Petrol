# DEFP Petrol — Sistema de Venta Controlada de Carburantes

Aplicación web (Node.js + Express + SQLite) para la gestión de inventario y venta controlada
de Gasolina y Diésel, con algoritmo de cupos dinámicos basado en el historial de compra del cliente.

**Autor:** David Eduardo Flores Padilla

## Estructura del proyecto

```
defp-petrol/
├── server.js              # Servidor Express principal
├── package.json
├── db/
│   ├── database.js        # Conexión SQLite + helpers (run/get/all) + seed inicial
│   ├── schema.sql          # Definición de tablas: empresa, tanque, cliente, ingreso, venta
│   └── defp_petrol.db      # (se genera automáticamente al ejecutar, no subir a git)
├── routes/
│   ├── empresa.js          # Configuración global (holgura, periodo, cupo base)
│   ├── tanques.js          # CRUD de tanques + alertas de stock
│   ├── clientes.js         # CRUD de clientes + búsqueda por placa/documento
│   ├── ingresos.js         # Abastecimiento de tanques
│   └── ventas.js           # Algoritmo de cupo dinámico + registro de venta
└── public/
    ├── index.html           # SPA (pestañas: Venta, Tanques, Clientes, Ingresos, Historial, Config)
    ├── style.css
    └── app.js               # Lógica de frontend (fetch a la API)
```

## Instalación local (VS Code)

1. Abre la carpeta `defp-petrol` en VS Code.
2. Abre una terminal integrada (Ctrl+`) y ejecuta:
   ```bash
   npm install
   npm start
   ```
3. Abre el navegador en `http://localhost:3000`.

La base de datos SQLite (`db/defp_petrol.db`) se crea automáticamente la primera vez que
ejecutas el servidor, junto con un registro inicial de configuración de la empresa.

## Modelo de datos (resumen)

- **empresa**: parámetros globales (factor de holgura, periodo de evaluación en días, cupo base
  para clientes nuevos, % de alerta de stock mínimo).
- **tanque**: identificador, tipo de carburante, capacidad máxima, stock mínimo de seguridad,
  stock actual (se recalcula con cada ingreso/venta).
- **cliente**: documento (CI/NIT, único), nombre/razón social, placa, tipo de cliente, estado.
- **ingreso**: abastecimiento a un tanque (litros, factura, proveedor, fecha).
- **venta**: salida controlada (litros solicitados vs autorizados, promedio semanal calculado,
  límite permitido, si fue limitada por el algoritmo).

Relaciones de clave foránea: `ingreso.tanque_id → tanque.id`,
`venta.tanque_id → tanque.id`, `venta.cliente_id → cliente.id`.

## Algoritmo de cupo dinámico

```
Ps = (litros comprados en los últimos N días) / (N días / 7)
Límite permitido = Ps * (1 + factor_holgura)
```

- Si el cliente es nuevo (sin ventas previas), se usa el `cupo_base_cliente_nuevo` configurado
  en el módulo de Configuración de la Empresa.
- Si la cantidad solicitada supera el límite permitido, el sistema autoriza solo hasta el límite
  (no rechaza la venta por completo, según especificación).

## Despliegue en GitHub

```bash
git init
git add .
git commit -m "DEFP Petrol - sistema de venta controlada de carburantes"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/defp-petrol.git
git push -u origin main
```

Asegúrate de que el repositorio sea **público**.

## Despliegue en Render

1. Ve a https://render.com → New → Web Service.
2. Conecta tu repositorio de GitHub `defp-petrol`.
3. Configuración:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
4. Render asignará automáticamente la variable `PORT` (ya soportada en `server.js`).
5. Una vez desplegado, copia el enlace público (`https://defp-petrol.onrender.com` o similar).

⚠️ Nota: SQLite en Render (plan free) usa almacenamiento efímero — los datos se reinician en
cada despliegue/reinicio del contenedor a menos que configures un Persistent Disk.
