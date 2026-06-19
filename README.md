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
