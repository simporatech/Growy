# Growy — Mapa de Arquitectura, Modelo Contable y Guía Maestra del Sistema (`context.md`)

> **Versión de aplicación:** `v1.0.0` (desarrollada por **SIMPORA**)  
> **Propósito de este documento:** Fuente única de verdad (*Single Source of Truth*) para arquitectos de software, desarrolladores y agentes de IA. Contiene el desglose exhaustivo del stack tecnológico, esquema de base de datos en Supabase, catálogo módulo por módulo de `src/`, reglas contables/financieras y guía rápida de intervención quirúrgica.

---

## 1. Visión General y Stack Tecnológico

### 1.1 Propósito Central de la Aplicación
**Growy** es una plataforma SaaS de gestión de finanzas personales inteligentes con arquitectura *Cloud-First*, soporte nativo multidivisa (20 monedas con conversión triangular en tiempo real vía USD), contabilidad basada en libro mayor (*Pure Ledger Balance Architecture*), control presupuestario por categorías, automatización de cobros recurrentes (*Subscriptions Auto-Debit Engine*), gestión de saldos pendientes (*Por Pagar* y *Por Cobrar* con préstamos directos y abonos parciales multidivisa), proyecciones de flujo de caja a cierre de mes y diagnóstico algorítmico de salud financiera.

### 1.2 Stack Completo y Dependencias Clave
Definido en [`package.json`](file:///c:/Users/jonit/Desktop/Growy/package.json) y [`vite.config.js`](file:///c:/Users/jonit/Desktop/Growy/vite.config.js):

- **Core & UI Runtime:**
  - `react` (`^19.0.0`) & `react-dom` (`^19.0.0`) — Renderizado concurrente, portales (`createPortal` en `document.body` para modales y selectores flotantes) y hooks de estado/memoización.
- **Bundler & Dev Server:**
  - `vite` (`^6.1.0`) con `@vitejs/plugin-react` (`^4.3.4`). Configurado en puerto `3000` (`open: true`).
- **Estilos y Diseño Atómico:**
  - `tailwindcss` (`^4.0.6`) integrado vía `@tailwindcss/vite` (`^4.0.6`) utilizando la directiva moderna `@import "tailwindcss";` en [`src/index.css`](file:///c:/Users/jonit/Desktop/Growy/src/index.css).
  - `clsx` (`^2.1.1`) y `tailwind-merge` (`^3.0.1`) — Composición condicional de clases utilitarias.
- **Iconografía y Catálogo Visual:**
  - `lucide-react` (`^0.475.0`) — Sistema de iconos vectoriales de interfaz.
  - `emojilib` (`^4.0.2`) y `unicode-emoji-json` (`^0.8.0`) (*devDependencies*) — Base para el catálogo de +1,900 emojis Unicode bilingües y logos oficiales de bancos/SaaS en [`src/constants/emojis.js`](file:///c:/Users/jonit/Desktop/Growy/src/constants/emojis.js).
- **Backend-as-a-Service (BaaS) y Persistencia:**
  - `@supabase/supabase-js` (`^2.112.3`) — Cliente PostgreSQL REST/Realtime inicializado en [`src/lib/supabaseClient.js`](file:///c:/Users/jonit/Desktop/Growy/src/lib/supabaseClient.js) mediante `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- **Fuentes y PWA:**
  - Tipografía **Plus Jakarta Sans** (`400`, `500`, `600`, `700`, `800`) cargada desde Google Fonts en [`index.html`](file:///c:/Users/jonit/Desktop/Growy/index.html) y manifiesto PWA en [`public/manifest.json`](file:///c:/Users/jonit/Desktop/Growy/public/manifest.json).

### 1.3 Sistema de Diseño: Variables CSS, Paleta Semántica Fija y Convenciones UI/UX
Definido en [`src/index.css`](file:///c:/Users/jonit/Desktop/Growy/src/index.css) y [`src/context/SettingsContext.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/context/SettingsContext.jsx):

1. **Variables CSS Dinámicas de Tema (`:root` y clases en `<html>`):**
   - `--bg-base: #090C10` — Fondo oscuro profundo unificado (*Carbon Dark*).
   - `--accent` — Color principal del tema activo (por defecto `#97F2CC` *Growy Mint*).
   - `--accent-hover` — Variante de hover del acento (`#7CE8BA`).
   - `--accent-muted` — Fondo translúcido del acento (`rgba(151, 242, 204, 0.15)`).
   - `--accent-text` — Color de texto de alto contraste sobre botones de acento (`#09231B`).
   - `--accent-rgb` — Canales RGB separados por coma (`151, 242, 204`) para sombras y opacidades dinámicas.
   - **Aliases heredados sincronizados:** `--color-primary`, `--color-primary-hover`, `--color-primary-muted`, `--color-primary-text`, `--color-glow`.

2. **Los 5 Temas Dinámicos (`THEME_PRESETS` en `SettingsContext.jsx`):**
   Se aplican añadiendo la clase `theme-<id>` al elemento `<html>` (`document.documentElement`) e inyectando las propiedades inline:
   - `mint` (**Growy Mint** - Default): `--accent: #97F2CC`, `--accent-text: #09231B`.
   - `cyan` (**Cyber Cyan**): `--accent: #38BDF8`, `--accent-text: #082F49`.
   - `purple` (**Neon Purple**): `--accent: #C084FC`, `--accent-text: #2E1065`.
   - `emerald` (**Emerald Wealth**): `--accent: #34D399`, `--accent-text: #064E3B`.
   - `coral` (**Sunset Coral**): `--accent: #FB7185`, `--accent-text: #4C0519`.

3. **Paleta Semántica Fija vs. Acento Dinámico:**
   - **Acento Dinámico (`var(--accent)`):** Se usa exclusivamente en navegación activa, botones primarios (`.btn-primary`), bordes de enfoque (`focus:border-[var(--accent)]`), badges informativos neutros, barras de progreso saludables (`< 80%`), líneas del gráfico de proyección y el orbe ambiental (`AmbientBackground.jsx`).
   - **Colores Semánticos Financieros Fijos (NUNCA cambian con el tema):**
     - **Ingresos / Saldos a Favor (Por Cobrar) / Éxito:** Esmeralda (`text-emerald-400`, `bg-emerald-500/10`, `border-emerald-500/20`).
     - **Gastos / Deudas (Por Pagar) / Peligro / Sobregiro (`>= 100%`):** Rosa/Rojo (`text-rose-400`, `bg-rose-500/10`, `border-rose-500/30`).
     - **Advertencia / Presupuesto al límite (`80% - 99%`) / Vencimiento hoy:** Ámbar (`text-amber-400`, `bg-amber-500/10`, `border-amber-500/30`).
     - **Transferencias entre cuentas / Conversión multidivisa:** Azul cielo (`text-sky-400`, `bg-sky-500/10`, `border-sky-500/20`).

4. **Superficies y Componentes Base (`.glass-card` / `.growy-glass`):**
   - Tarjetas principales: `background: #0D1117`, `border: 1px solid rgba(255, 255, 255, 0.07)`, `box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.36)`.
   - Inputs y selectores (`.form-input`, `.form-select`, `.growy-glass-input`): `background-color: #161B22` o `#121721`, altura estándar `h-11` (`44px`), fuente `16px` en móvil para prevenir auto-zoom en iOS Safari.
   - Modales (`ModalWrapper.jsx`): En móvil (`< 640px`) se comportan como *Bottom Sheet* (`h-[90vh] rounded-t-3xl`), en escritorio (`sm:`) como diálogo centrado (`sm:rounded-2xl max-w-lg`) renderizado vía `createPortal(..., document.body)`.
   - Cuando cualquier modal se abre, [`src/utils/modalManager.js`](file:///c:/Users/jonit/Desktop/Growy/src/utils/modalManager.js) incrementa su contador y asigna `document.body.setAttribute('data-modal-open', 'true')`, lo cual oculta automáticamente la barra inferior móvil (`BottomNav.jsx`) mediante reglas CSS y el hook `useIsAnyModalOpen()`.

### 1.4 Configuración de Internacionalización (i18n)
El sistema i18n es 100% reactivo, sin dependencias pesadas externas, y soporta **Español (`es`)** e **Inglés (`en`)**:

- **Diccionario Principal en Runtime:** [`src/i18n/translations.js`](file:///c:/Users/jonit/Desktop/Growy/src/i18n/translations.js) exporta `translations = { es: { ... }, en: { ... } }` con ~1,740 líneas que cubren todos los módulos (`nav`, `dashboard`, `accounts`, `transactions`, `categories`, `debts`, `loans`, `subscriptions`, `settings`, `about`, `feedback`, `modals`, `privacy`, `notFound`, `walkthrough`, `icon_picker`, `financial_health`, `debtAlerts`, `pagination`, `export`).
- **Archivos JSON Complementarios:** [`locales/es.json`](file:///c:/Users/jonit/Desktop/Growy/locales/es.json) y [`locales/en.json`](file:///c:/Users/jonit/Desktop/Growy/locales/en.json) en la raíz del proyecto contienen las claves estructuradas de `icon_picker`, `financial_health`, `debts` y modales recientes.
- **Función Traductora `t(keyPath, params, fallback)` en [`src/context/SettingsContext.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/context/SettingsContext.jsx#L446-L485):**
  1. Navega `translations[language]` usando notación de punto (`ej. 'debts.receivable_modal.new_title'`).
  2. Si no existe en el idioma activo, hace fallback automático a `translations.es`.
  3. Si tampoco existe en español, devuelve el parámetro `fallback` o la propia clave `keyPath`.
  4. Soporta interpolación de variables con sintaxis simple `{variable}` y doble `{{variable}}` (ej. `t('dashboard.activeCount', { count: 5 })`).
- **Detección Inicial de Idioma y Moneda ([`src/utils/currency.js`](file:///c:/Users/jonit/Desktop/Growy/src/utils/currency.js#L130-L179)):**
  - `detectUserLocaleAndCurrency()` inspecciona `Intl.DateTimeFormat().resolvedOptions().timeZone` (mapeando `America/Tegucigalpa` -> `HNL`, `America/Mexico_City` -> `MXN`, `America/Bogota` -> `COP`, etc.) y `navigator.languages` para definir el idioma (`es`/`en`) y moneda base en el primer arranque.

---

## 2. Modelo de Datos y Base de Datos (Supabase / PostgreSQL)

### 2.1 Arquitectura de Identificadores y Transformación Snake/Camel
- **Identificadores de Usuario (`user_id`):** Growy utiliza un sistema de autenticación propio contra la tabla `public.users` (no utiliza `auth.users` nativo de Supabase JWT). Los IDs de usuario son de tipo **`TEXT`** con el formato `usr_<timestamp>_<random>` (ej. `usr_1711845000_a8f9k2x`), generados en [`src/utils/userStorage.js`](file:///c:/Users/jonit/Desktop/Growy/src/utils/userStorage.js).
- **Identificadores de Entidades (`id`):** Todas las tablas de negocio (`accounts`, `categories`, `transactions`, `pending_debts`, `debt_payments`, `subscriptions`, `feedback`) utilizan `UUID` generados por PostgreSQL (`gen_random_uuid()`). En [`src/services/supabaseService.js`](file:///c:/Users/jonit/Desktop/Growy/src/services/supabaseService.js#L12-L21), la función `isValidUuid(val)` valida que ningún ID temporal del cliente (`acc_...`, `cat_...`) se envíe en un `INSERT`, permitiendo que PostgreSQL asigne el UUID real.
- **Mapeo Bidireccional (`toCamel` / `toSnake`):**
  En [`src/services/supabaseService.js`](file:///c:/Users/jonit/Desktop/Growy/src/services/supabaseService.js#L26-L77), todos los registros recibidos de Supabase pasan por `toCamel(row)` (que además inyecta aliases de compatibilidad como `concept` <-> `description`, `emoji` <-> `icon`, `isActive` <-> `is_active`, `startDate` <-> `start_date`) y todo payload saliente pasa por `toSnake(obj)`.

### 2.2 Catálogo Completo de Tablas en Supabase (`public`)

#### 1. Tabla `public.users`
Almacena las cuentas de usuario registradas con código de invitación.
- `id` (`TEXT`, **PK**) — Formato `usr_<timestamp>_<random>`.
- `full_name` (`TEXT`, NOT NULL) — Nombre completo del usuario.
- `username` (`TEXT`, UNIQUE, NOT NULL) — Nombre de usuario en minúsculas para login.
- `email` (`TEXT`, UNIQUE, NOT NULL) — Correo electrónico en minúsculas.
- `password` (`TEXT`, NOT NULL) — Contraseña del usuario.
- `master_pin` (`TEXT`) — Código de invitación utilizado al registrarse (`667619`, `667919`, `GROWY2026` o `VITE_INVITE_CODE`).
- `created_at` (`TIMESTAMPTZ`, DEFAULT `now()`).

#### 2. Tabla `public.user_settings`
Preferencias globales sincronizadas en la nube por usuario (relación 1:1 con `users`).
- `user_id` (`TEXT`, **PK**, **FK** -> `users.id` `ON DELETE CASCADE`).
- `language` (`TEXT`, DEFAULT `'es'`) — `'es'` | `'en'`.
- `base_currency` (`TEXT`, DEFAULT `'HNL'`) — Código ISO de 3 letras (`USD`, `HNL`, `EUR`, `MXN`, etc.).
- `theme` (`TEXT`, DEFAULT `'mint'`) — `'mint'` | `'cyan'` | `'purple'` | `'emerald'` | `'coral'`.
- `updated_at` (`TIMESTAMPTZ`, DEFAULT `now()`).

#### 3. Tabla `public.accounts`
Cuentas bancarias, billeteras digitales, efectivo o tarjetas del usuario.
- `id` (`UUID`, **PK**, DEFAULT `gen_random_uuid()`).
- `user_id` (`TEXT`, NOT NULL, **FK** -> `users.id` `ON DELETE CASCADE`).
- `name` (`TEXT`, NOT NULL) — Nombre de la cuenta (ej. `"BAC Credomatic"`, `"Efectivo"`).
- `type` (`TEXT`, DEFAULT `'bank'`) — Tipo descriptivo de cuenta.
- `balance` (`NUMERIC`, DEFAULT `0`) — **IMPORTANTE:** Almacena el **Saldo Inicial (`initial_balance`)** con el que se abrió la cuenta. El saldo disponible actual se calcula dinámicamente en el cliente sumando/restando el libro mayor de `transactions`.
- `currency` (`TEXT`, DEFAULT `'USD'`) — Divisa nativa de la cuenta.
- `emoji` (`TEXT`, DEFAULT `'🏦'`) — Emoji Unicode o URL de logotipo bancario.
- `color` (`TEXT`, DEFAULT `'#97F2CC'`).
- `created_at` (`TIMESTAMPTZ`, DEFAULT `now()`).

#### 4. Tabla `public.categories`
Categorías de presupuesto para clasificar gastos e ingresos.
- `id` (`UUID`, **PK**, DEFAULT `gen_random_uuid()`).
- `user_id` (`TEXT`, NOT NULL, **FK** -> `users.id` `ON DELETE CASCADE`).
- `name` (`TEXT`, NOT NULL) — Nombre de la categoría.
- `emoji` (`TEXT`, DEFAULT `'🏷️'`) — Emoji o URL de icono.
- `type` (`TEXT`, DEFAULT `'expense'`) — `'expense'` (Gasto) | `'income'` (Ingreso).
- `monthly_limit` (`NUMERIC`, DEFAULT `0`) — Presupuesto mensual máximo (si `type = 'expense'`) o meta mensual de ingreso (si `type = 'income'`).
- `currency` (`TEXT`, DEFAULT `'USD'`) — Divisa en la que fue definido `monthly_limit`.
- `color` (`TEXT`, DEFAULT `'#97F2CC'`).
- `created_at` (`TIMESTAMPTZ`, DEFAULT `now()`).

#### 5. Tabla `public.transactions`
Libro mayor (*General Ledger*) de todos los movimientos financieros.
- `id` (`UUID`, **PK**, DEFAULT `gen_random_uuid()`).
- `user_id` (`TEXT`, NOT NULL, **FK** -> `users.id` `ON DELETE CASCADE`).
- `description` (`TEXT`, NOT NULL) — Concepto del movimiento.
- `amount` (`NUMERIC`, NOT NULL) — Monto positivo en la divisa de la cuenta origen (`currency`).
- `type` (`TEXT`, NOT NULL) — `'expense'` | `'income'` | `'transfer'`.
- `currency` (`TEXT`, DEFAULT `'USD'`) — Divisa de la transacción (coincide con la cuenta origen).
- `date` (`DATE` / `TEXT`, NOT NULL) — Fecha en formato ISO `YYYY-MM-DD`.
- `account_id` (`UUID`, NULLABLE, **FK** -> `accounts.id` `ON DELETE CASCADE`) — Cuenta origen (de donde sale el dinero en `expense` y `transfer`, o donde entra en `income`). Puede ser `NULL` en cobros de préstamos donde se usa `destination_account_id`.
- `destination_account_id` (`UUID`, NULLABLE, **FK** -> `accounts.id` `ON DELETE SET NULL`) — Cuenta receptora en transferencias (`type = 'transfer'`) o cuenta donde ingresa el cobro de un saldo por cobrar.
- `category_id` (`UUID`, NULLABLE, **FK** -> `categories.id` `ON DELETE SET NULL`) — Categoría asociada (`NULL` en transferencias y préstamos directos).
- `debt_id` (`UUID`, NULLABLE, **FK** -> `pending_debts.id` `ON DELETE SET NULL`) — Vínculo opcional con una deuda o préstamo en `pending_debts`.
- `exclude_from_budget` (`BOOLEAN`, DEFAULT `false`) — Bandera contable crítica: si es `true`, el movimiento modifica el saldo bancario de la cuenta pero **se excluye de los KPIs de Gastos/Ingresos mensuales, Tasa de Ahorro y Presupuestos de Categorías**.
- `exchange_rate_at_transaction` (`NUMERIC`, DEFAULT `1`) — Tasa de cambio histórica aplicada al momento del registro.
- `amount_in_base_currency` (`NUMERIC`) — Equivalente del monto convertido a la moneda base del usuario al momento de la transacción.
- `target_amount` / `destination_amount` (`NUMERIC`, NULLABLE) — En transferencias multidivisa entre cuentas de distinta moneda, almacena el monto exacto acreditado en la cuenta destino (en la moneda de `destination_account_id`).
- `created_at` (`TIMESTAMPTZ`, DEFAULT `now()`).

#### 6. Tabla `public.pending_debts`
Saldos pendientes tanto por pagar (deudas/obligaciones) como por cobrar (préstamos otorgados/cuentas por cobrar).
- `id` (`UUID`, **PK**, DEFAULT `gen_random_uuid()`).
- `user_id` (`TEXT`, NOT NULL, **FK** -> `users.id` `ON DELETE CASCADE`).
- `description` / `concept` (`TEXT`, NOT NULL) — Persona, entidad o concepto del saldo.
- `amount` (`NUMERIC`, NOT NULL) — Monto total original de la deuda o préstamo.
- `currency` (`TEXT`, DEFAULT `'USD'`) — Divisa en la que se pactó el saldo pendiente.
- `type` (`TEXT`, DEFAULT `'payable'`) — `'payable'` (Por Pagar / Deuda) | `'receivable'` (Por Cobrar / Saldo a Favor). *(Nota: soporta valores heredados `'debt'` y `'loan'`)*.
- `status` (`TEXT`, DEFAULT `'pending'`) — `'pending'` | `'paid'`.
- `start_date` (`DATE` / `TEXT`, NULLABLE) — Fecha de inicio o desembolso (`YYYY-MM-DD`).
- `due_date` (`DATE` / `TEXT`, NULLABLE) — Fecha límite de pago o fecha estimada de cobro (`YYYY-MM-DD`).
- `category_id` (`UUID`, NULLABLE, **FK** -> `categories.id` `ON DELETE SET NULL`).
- `emoji` / `icon` (`TEXT`, DEFAULT `'📑'`).
- `is_direct_loan` (`BOOLEAN`, DEFAULT `false`) — Si es `true`, indica que el dinero salió físicamente de una cuenta bancaria hoy al crear el préstamo.
- `source_account_id` (`UUID`, NULLABLE, **FK** -> `accounts.id` `ON DELETE SET NULL`) — Cuenta bancaria de donde salió el desembolso inicial del préstamo directo.
- `notes` (`TEXT`, NULLABLE) — Observaciones adicionales.
- `created_at` (`TIMESTAMPTZ`, DEFAULT `now()`).

#### 7. Tabla `public.debt_payments`
Historial de abonos parciales o liquidaciones totales asociados a un registro de `pending_debts`.
- `id` (`UUID`, **PK**, DEFAULT `gen_random_uuid()`).
- `debt_id` (`UUID`, NOT NULL, **FK** -> `pending_debts.id` `ON DELETE CASCADE`).
- `user_id` (`TEXT`, NOT NULL, **FK** -> `users.id` `ON DELETE CASCADE`).
- `amount` (`NUMERIC`, NOT NULL) — **Monto amortizado en la moneda nominal de la deuda** (`pending_debts.currency`).
- `payment_date` (`DATE` / `TEXT`, NOT NULL) — Fecha del abono (`YYYY-MM-DD`).
- `account_id` (`UUID`, NULLABLE, **FK** -> `accounts.id` `ON DELETE SET NULL`) — Cuenta bancaria pagadora o receptora del abono.
- `transaction_id` (`UUID`, NULLABLE, **FK** -> `transactions.id` `ON DELETE SET NULL`) — Vínculo directo con el asiento contable generado en `transactions`.
- `notes` (`TEXT`, NULLABLE) — Nota del abono.
- `created_at` (`TIMESTAMPTZ`, DEFAULT `now()`).

#### 8. Tabla `public.subscriptions`
Suscripciones y cargos domiciliados recurrentes (mensuales o anuales).
- `id` (`UUID`, **PK**, DEFAULT `gen_random_uuid()`).
- `user_id` (`TEXT`, NOT NULL, **FK** -> `users.id` `ON DELETE CASCADE`).
- `name` (`TEXT`, NOT NULL) — Nombre del servicio (ej. `"Netflix"`, `"Spotify"`).
- `emoji` (`TEXT`, DEFAULT `'🍿'`) — Emoji o URL de logo del servicio.
- `amount` (`NUMERIC`, NOT NULL) — Costo por ciclo de facturación.
- `currency` (`TEXT`, DEFAULT `'USD'`) — Divisa del cobro (heredada de la cuenta pagadora).
- `billing_day` (`INTEGER`, NOT NULL, CHECK `1 <= billing_day <= 31`) — Día del mes en que se ejecuta el corte/cobro.
- `frequency` (`TEXT`, DEFAULT `'monthly'`) — `'monthly'` | `'yearly'`.
- `account_id` (`UUID`, NOT NULL, **FK** -> `accounts.id` `ON DELETE CASCADE`) — Cuenta pagadora donde se debita automáticamente.
- `category_id` (`UUID`, NULLABLE, **FK** -> `categories.id` `ON DELETE SET NULL`) — Categoría de gasto a la que se imputa el cobro.
- `is_active` (`BOOLEAN`, DEFAULT `true`) — Estado activo/pausado del cobro automático.
- `last_processed_date` (`DATE` / `TEXT`, NULLABLE) — Fecha `YYYY-MM-DD` del último cobro automático procesado por el motor Cron para garantizar idempotencia.
- `created_at` (`TIMESTAMPTZ`, DEFAULT `now()`).

#### 9. Tabla `public.exchange_rates_cache`
Caché global compartida de tasas de cambio respecto al dólar estadounidense (`USD`).
- `id` (`TEXT`, **PK**) — Fila única con `id = 'latest'`.
- `base_currency` (`TEXT`, DEFAULT `'USD'`).
- `rates` (`JSONB`, NOT NULL) — Diccionario JSON `{ "USD": 1, "HNL": 25.45, "EUR": 0.92, ... }`.
- `updated_at` (`TIMESTAMPTZ`, DEFAULT `now()`).

#### 10. Tabla `public.feedback`
Buzón de reportes de bugs, sugerencias de mejora y comentarios enviados por los usuarios.
- `id` (`UUID`, **PK**, DEFAULT `gen_random_uuid()`).
- `user_id` (`TEXT`, NOT NULL).
- `username` (`TEXT`, NOT NULL).
- `type` (`TEXT`, NOT NULL) — `'improvement'` | `'bug'` | `'comment'`.
- `subject` (`TEXT`, NOT NULL).
- `message` (`TEXT`, NOT NULL).
- `rating` (`INTEGER`, CHECK `1 <= rating <= 5`).
- `app_version` (`TEXT`, DEFAULT `'1.0.0'`).
- `user_agent` (`TEXT`).
- `created_at` (`TIMESTAMPTZ`, DEFAULT `now()`).

### 2.3 Reglas de Integridad Referencial, Cascadas y Políticas RLS
1. **Aislamiento Multi-Tenant (`user_id`):** Todas las consultas (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) en `supabaseService.js` y `debtsService.js` filtran explícitamente por `.eq('user_id', userId)`. Las políticas RLS en PostgreSQL permiten el acceso del cliente anónimo/autenticado condicionado a la pertenencia del `user_id`.
2. **Borrado en Cascada de Cuenta Bancaria (`dbDeleteAccount` en `supabaseService.js`):**
   Cuando el usuario elimina una cuenta en `AccountsModule`:
   - Primero ejecuta `DELETE FROM transactions WHERE account_id = :accountId AND user_id = :userId`.
   - Luego ejecuta `DELETE FROM subscriptions WHERE account_id = :accountId AND user_id = :userId`.
   - Finalmente elimina el registro en `accounts`. Como los saldos de las demás cuentas se derivan del ledger, si había transferencias hacia otras cuentas, se recalculan instantáneamente.
3. **Borrado en Cascada de Deuda/Préstamo (`dbDeleteLoan` en `supabaseService.js`):**
   Cuando se elimina un registro de `pending_debts` (por ejemplo, un préstamo otorgado o una deuda con abonos):
   - Busca sus abonos en `debt_payments` (`WHERE debt_id = :debtId`) para recolectar todos los `transaction_id` asociados.
   - Elimina de `transactions` todos los asientos cuyos `id` estén en esa lista, más cualquier transacción con `debt_id = :debtId`, más cualquier transacción de desembolso directo cuyo concepto coincida con `"Préstamo a: <concept>"` / `"Loan to: <concept>"`.
   - Elimina los registros en `debt_payments` y finalmente elimina la fila en `pending_debts`.
   - Esto **restaura automáticamente el saldo disponible** de la cuenta bancaria afectada.
4. **Resiliencia ante Variaciones de Columnas en Supabase:**
   Tanto `supabaseService.js` (en `dbSaveAccount`, `dbSaveCategory`, `dbSaveTransaction`, `dbSaveLoan`, `dbSaveSubscription`) como `debtsService.js` (en `addDebtPayment`) implementan bucles de reintento inteligentes que detectan errores `PGRST204` (`Could not find the '...' column in the schema cache`), eliminan dinámicamente del payload la columna opcional no existente en esa instancia y reintentan la operación sin perder datos.

---

## 3. Árbol de Arquitectura y Catálogo de Módulos (`src/`)

### 3.1 Árbol de Directorios Completo
```text
Growy/
├── index.html                                  # HTML raíz, SEO meta tags, OpenGraph, JSON-LD (SIMPORA), Plus Jakarta Sans
├── package.json                                # Dependencias React 19, Vite 6, Tailwind v4, Supabase JS, Lucide
├── vite.config.js                              # Configuración Vite (puerto 3000, plugins React y Tailwind v4)
├── .env.example                                # Plantilla de variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── locales/
│   ├── es.json                                 # Diccionario JSON estructurado (Español)
│   └── en.json                                 # Diccionario JSON estructurado (Inglés)
├── public/
│   ├── manifest.json                           # Manifiesto Web App (PWA)
│   └── logos/                                  # Activos vectoriales oficiales (Transparent.svg, etc.)
└── src/
    ├── main.jsx                                # Punto de entrada React DOM (StrictMode + App)
    ├── App.jsx                                 # Orquestador raíz: Auth, Providers, Router por estados/URL, Modales globales
    ├── index.css                               # Sistema de diseño Tailwind v4, variables CSS de 5 temas, utilidades glass
    ├── lib/
    │   └── supabaseClient.js                   # Instancia singleton de Supabase Client
    ├── constants/
    │   ├── colors.js                           # Paleta cromática curada para cuentas y categorías (CURATED_COLORS)
    │   └── emojis.js                           # Catálogo de +1,900 emojis bilingües + BANK_PRESETS + SERVICE_PRESETS
    ├── i18n/
    │   └── translations.js                     # Diccionario maestro bilingüe (es/en) en memoria
    ├── services/
    │   ├── supabaseService.js                  # Capa DAL principal hacia Supabase (CRUD + Cron + Mantenimiento)
    │   ├── debtsService.js                     # Motor contable especializado en Deudas, Préstamos y Abonos parciales
    │   └── currencyService.js                  # Servicio FX (open.er-api.com) con caché L1 (localStorage) y L2 (Supabase)
    ├── context/
    │   ├── SettingsContext.jsx                 # Estado global de idioma, divisa base, tasas FX, temas y traducciones t()
    │   └── FinanceContext.jsx                  # Estado global financiero (Cuentas, Categorías, Transacciones, Deudas, Suscripciones)
    ├── hooks/
    │   ├── useCashflowProjection.js            # Algoritmo matemático de Burn Rate y Proyección a fin de mes calendario
    │   ├── useFinancialHealth.js               # Algoritmo de puntuación de Salud Financiera (0-100 pts en 3 dimensiones)
    │   └── useDocumentTitle.js                 # Sincronización reactiva de document.title ("Growy • <Sección>")
    ├── utils/
    │   ├── accountBalanceSelectors.js          # Selectores puros de saldo bancario derivado del libro mayor (Ledger)
    │   ├── currency.js                         # Mapa de 20 divisas, conversión triangular USD y formateadores monetarios
    │   ├── defaultCategories.js                # Semilla de 6 categorías iniciales (4 gastos, 2 ingresos)
    │   ├── exportUtils.js                      # Generador de reportes CSV (con BOM UTF-8) y PDF imprimible estilizado
    │   ├── formatters.js                       # Utilidades de fechas locales, parseo numérico seguro y diferencias de días
    │   ├── modalManager.js                     # Gestor reactivo de modales abiertos (oculta BottomNav automáticamente)
    │   ├── storage.js                          # Abstracción segura de localStorage aislada por userId
    │   └── userStorage.js                      # Gestión de sesión activa, códigos de invitación y perfil de usuario
    └── components/
        ├── DashboardPreview.jsx                # Layout maestro con Sidebar colapsable, Topbar, BottomNav y vista Dashboard
        ├── AccountsModule.jsx                  # Vista de Cuentas Bancarias y Patrimonio Neto Consolidado
        ├── TransactionsModule.jsx              # Vista del Libro Mayor de Transacciones con filtros avanzados y exportación
        ├── TransactionsView.jsx                # Wrapper re-exportador de TransactionsModule.jsx
        ├── CategoriesModule.jsx                # Vista de Categorías, Presupuestos de Gasto y Metas de Ingreso
        ├── CategoriesView.jsx                  # Wrapper re-exportador de CategoriesModule.jsx
        ├── DebtsView.jsx                       # Vista de Saldos Pendientes (Tabs: Por Pagar vs. Por Cobrar + Historial de abonos)
        ├── LoansModule.jsx                     # Wrapper re-exportador de DebtsView.jsx
        ├── SubscriptionsModule.jsx             # Vista de Suscripciones Recurrentes y Proyección Anualizada
        ├── SubscriptionsView.jsx               # Wrapper re-exportador de SubscriptionsModule.jsx
        ├── SettingsModule.jsx                  # Vista de Configuración (Perfil, Seguridad, Idioma, Moneda, Temas, Zona Peligro)
        ├── AboutModule.jsx                     # Vista "Acerca de Growy & SIMPORA"
        ├── FeedbackModule.jsx                  # Vista de Reportes, Sugerencias y Calificación (conectada a tabla feedback)
        ├── AccountModal.jsx                    # Modal CRUD de Cuentas Bancarias
        ├── CategoryModal.jsx                   # Modal CRUD de Categorías y Presupuestos
        ├── TransactionModal.jsx                # Modal CRUD de Transacciones (Gasto, Ingreso, Transferencia, Préstamo)
        ├── DebtModal.jsx                       # Modal CRUD de Deudas Por Pagar y Saldos Por Cobrar
        ├── LoanModal.jsx                       # Wrapper re-exportador de DebtModal.jsx
        ├── DebtPaymentModal.jsx                # Modal de Abonos Parciales/Totales con soporte Multidivisa
        ├── PayLoanModal.jsx                    # Modal rápido de liquidación de saldo pendiente
        ├── ReceivableModal.jsx                 # Wrapper re-exportador de debts/ReceivableModal.jsx
        ├── SubscriptionModal.jsx               # Modal CRUD de Suscripciones Recurrentes
        ├── AdvancedFiltersModal.jsx            # Modal/Drawer de filtros avanzados para Transacciones en móvil/tablet
        ├── ConfirmDeleteModal.jsx              # Modal genérico de confirmación de eliminación
        ├── DeleteAccountModal.jsx              # Modal de seguridad extrema para eliminación definitiva de cuenta de usuario
        ├── Modals.jsx                          # Modales de Autenticación: ForgotPasswordModal y RegisterModal
        ├── ModalWrapper.jsx                    # Contenedor base estandarizado para todos los modales (Portal + BottomSheet)
        ├── PrivacyPolicyModal.jsx              # Modal de Política de Privacidad y Seguridad de Datos
        ├── WalkthroughModal.jsx                # Modal interactivo de bienvenida (Onboarding de 4 pasos)
        ├── CashflowForecastChart.jsx           # Wrapper re-exportador de dashboard/CashflowForecastChart.jsx
        ├── FinancialHealthCard.jsx             # Wrapper re-exportador de dashboard/FinancialHealthCard.jsx
        ├── TopAccountsWidget.jsx               # Wrapper re-exportador de dashboard/TopAccountsWidget.jsx
        ├── EmptyState.jsx                      # Wrapper re-exportador de common/EmptyState.jsx
        ├── AmbientBackground.jsx               # Orbes de luz ambiental acelerados por GPU vinculados a var(--accent)
        ├── BottomNav.jsx                       # Barra de navegación inferior móvil con botón central FAB ("Registrar")
        ├── Button.jsx                          # Componente atómico de botón con variantes y estados de carga
        ├── CustomDatePicker.jsx                # Selector de calendario flotante oscuro vía React Portal
        ├── CustomSelect.jsx                    # Selector desplegable con búsqueda (>7 ítems), iconos y multi-selección vía Portal
        ├── DbConnectionGuard.jsx               # Guardián de conectividad con Supabase al iniciar la app
        ├── DebtDueBanner.jsx                   # Banner de alertas tempranas de deudas vencidas, que vencen hoy o mañana
        ├── DynamicIcon.jsx                     # Renderizador polimórfico de emojis Unicode o imágenes URL con fallback
        ├── ErrorBoundary.jsx                   # Capturador global de errores de renderizado con opción de reinicio
        ├── ExportDropdown.jsx                  # Menú flotante para exportar tablas a Excel/CSV o PDF
        ├── FormField.jsx                       # Campo de formulario estandarizado con etiqueta, prefijo monetario y error
        ├── LoginCard.jsx                       # Tarjeta de inicio de sesión con validación contra Supabase
        ├── NotFoundPage.jsx                    # Página 404 personalizada con enlaces de recuperación rápida
        ├── Pagination.jsx                      # Paginador universal con selector de tamaño de página (30, 50, 100)
        ├── SectionKpiHero.jsx                  # Banner Hero KPI estandarizado para encabezados de módulos
        ├── SplashScreen.jsx                    # Pantalla de carga inicial animada durante restauración de sesión
        ├── UniversalIconPicker.jsx             # Selector modal de 4 pestañas (Emojis, Bancos, Servicios SaaS, URL)
        ├── common/
        │   └── EmptyState.jsx                  # Implementación real del estado vacío estandarizado
        ├── dashboard/
        │   ├── CashflowForecastChart.jsx       # Gráfico interactivo SVG de proyección de flujo de caja a fin de mes
        │   ├── FinancialHealthCard.jsx         # Tarjeta con medidor circular SVG y modal de diagnóstico de salud financiera
        │   └── TopAccountsWidget.jsx           # Widget de las 3 cuentas con mayor saldo convertido a moneda base
        ├── debts/
        │   └── ReceivableModal.jsx             # Modal dedicado para registrar Saldos por Cobrar / Préstamos Directos
        └── layout/
            └── AmbientGlowBackground.jsx       # Wrapper de layout para AmbientBackground.jsx
```

---

### 3.2 Desglose Detallado por Archivo

#### A. Punto de Entrada y Orquestación Raíz
| Archivo | Responsabilidad Única | Estados / Props Principales | Dependencias Clave |
| :--- | :--- | :--- | :--- |
| [`src/main.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/main.jsx) | Monta la aplicación React dentro de `#root` con `React.StrictMode` e importa `index.css`. | N/A | `App.jsx`, `index.css` |
| [`src/App.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/App.jsx) | Orquestador raíz: restaura la sesión activa desde `localStorage`/`sessionStorage` validándola en Supabase (`dbFetchUserById`), gestiona el estado de autenticación (`isLoggedIn`, `currentUser`), detecta rutas 404 o `/privacy`, envuelve la app en `ErrorBoundary`, `DbConnectionGuard`, `SettingsProvider` y `FinanceProvider`, y controla el tour de bienvenida (`WalkthroughModal`). | `isLoggedIn`, `isInitializingAuth`, `currentUser`, `showWalkthrough`, `isPrivacyModalOpen`, `isNotFoundRoute` | `SettingsContext`, `FinanceContext`, `supabaseService`, `userStorage`, `DashboardPreview`, `LoginCard`, `Modals` |
| [`src/lib/supabaseClient.js`](file:///c:/Users/jonit/Desktop/Growy/src/lib/supabaseClient.js) | Inicializa y exporta el cliente singleton `supabase` leyendo `import.meta.env.VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. | N/A | `@supabase/supabase-js` |

#### B. Servicios de Backend y Lógica de Datos (`src/services/`)
| Archivo | Responsabilidad Única | Funciones Exportadas Clave | Dependencias Clave |
| :--- | :--- | :--- | :--- |
| [`src/services/supabaseService.js`](file:///c:/Users/jonit/Desktop/Growy/src/services/supabaseService.js) | Capa de Acceso a Datos (DAL) principal hacia Supabase. Transforma `snake_case` <-> `camelCase`, gestiona usuarios, ajustes, cuentas, categorías, transacciones, suscripciones, caché FX, feedback y el motor Cron de cobros automáticos. | `seedUserCategories`, `dbRegisterUser`, `dbValidateUserLogin`, `dbFetchUserById`, `dbUpdateUserProfile`, `dbChangeUserPassword`, `dbDeleteUserAccountAndData`, `dbFetchUserSettings`, `dbUpsertUserSettings`, `dbFetchAccounts`, `dbSaveAccount`, `dbDeleteAccount`, `dbFetchCategories`, `dbSaveCategory`, `dbDeleteCategory`, `dbFetchTransactions`, `dbSaveTransaction`, `dbDeleteTransaction`, `dbFetchLoans`, `dbSaveLoan`, `dbDeleteLoan`, `dbPayLoan`, `dbFetchSubscriptions`, `dbSaveSubscription`, `dbDeleteSubscription`, `processSubscriptionsCron`, `consolidateOldTransactions`, `dbSubmitFeedback` | `supabaseClient.js`, `debtsService.js`, `defaultCategories.js` |
| [`src/services/debtsService.js`](file:///c:/Users/jonit/Desktop/Growy/src/services/debtsService.js) | Motor especializado en contabilidad de Deudas (`payable`) y Préstamos (`receivable`), cálculo de saldos restantes, abonos parciales multidivisa y sincronización bidireccional con `transactions`. | `calculateDebtRemaining`, `fetchDebtPayments`, `fetchAllUserDebtPayments`, `addDebtPayment`, `deleteDebtPayment`, `recordDirectLoanTransaction`, `recordDebtPaymentWithTransaction`, `deleteDebtPaymentWithReversion`, `handleTransactionDeletedForDebts` | `supabaseClient.js` |
| [`src/services/currencyService.js`](file:///c:/Users/jonit/Desktop/Growy/src/services/currencyService.js) | Obtención y caché en dos niveles (L1 `localStorage` por 12h, L2 tabla `exchange_rates_cache` en Supabase) de tasas de cambio desde `open.er-api.com/v6/latest/USD`, con purga automática de tasas HNL obsoletas (`< 24.0`) y conversión cruzada triangular. | `getExchangeRates`, `convertCrossCurrency`, `getCrossRate`, `FALLBACK_RATES` | `supabaseService.js` |

#### C. Contextos Globales (`src/context/`)
| Archivo | Responsabilidad Única | Valores y Acciones Expuestas (`useContext`) | Dependencias Clave |
| :--- | :--- | :--- | :--- |
| [`src/context/SettingsContext.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/context/SettingsContext.jsx) | Gestiona idioma (`es`/`en`), moneda base (`baseCurrency`), tasas de cambio (`exchangeRates`), tema visual (`theme`), función traductora `t()`, conversión monetaria global (`convertToGlobal`, `formatToGlobal`) y exportación/reseteo de datos. Jerarquía de carga: `Supabase user_settings > localStorage > Detección de navegador`. | `language`, `setLanguage`, `theme`, `setTheme`, `themePresets`, `baseCurrency`, `setBaseCurrency`, `exchangeRates`, `isLoadingRates`, `t`, `formatCurrency`, `formatToGlobal`, `convertToGlobal`, `exportBackup`, `resetAllData`, `syncWithUserProfile` | `translations.js`, `currency.js`, `currencyService.js`, `supabaseService.js`, `storage.js` |
| [`src/context/FinanceContext.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/context/FinanceContext.jsx) | Almacén central reactivo de todas las entidades financieras del usuario autenticado. Hidrata los saldos de las cuentas mediante `hydrateAccountsWithLedgerBalances`, ejecuta el Cron de suscripciones al iniciar sesión y expone acciones CRUD transaccionales con notificaciones toast de estado DB. | Estados: `accounts`, `rawAccounts`, `categories`, `transactions`, `loans`, `debtPayments`, `subscriptions`, `isLoadingData`, `isSyncing`, `autoDebitsNotification`, `dbStatusToast`. Acciones: `saveAccount`, `deleteAccount`, `saveCategory`, `deleteCategory`, `saveTransaction`, `deleteTransaction`, `saveLoan`, `deleteLoan`, `payLoan`, `registerDebtPayment`, `removeDebtPayment`, `saveSubscription`, `deleteSubscription`, `toggleSubscriptionStatus`, `refreshAllFinanceData` | `supabaseService.js`, `debtsService.js`, `accountBalanceSelectors.js`, `SettingsContext.jsx` |

#### D. Hooks Personalizados (`src/hooks/`)
| Archivo | Responsabilidad Única | Parámetros / Retorno | Dependencias Clave |
| :--- | :--- | :--- | :--- |
| [`src/hooks/useCashflowProjection.js`](file:///c:/Users/jonit/Desktop/Growy/src/hooks/useCashflowProjection.js) | Calcula el ritmo de gasto diario (*Daily Burn Rate*), los compromisos pendientes del mes calendario en curso (suscripciones + deudas por pagar) y construye la serie temporal `chartData` (días `1..N`) para el gráfico de proyección. | Entrada: `{ currentTotalBalance, currentMonthTransactions, activeSubscriptions, pendingDebts, referenceDate, formatToGlobal }`. Retorno: `{ projectedBalance, dailyBurnRate, daysRemaining, daysInMonth, currentDay, expensesSoFar, pendingSubscriptionsTotal, pendingDebtsTotal, trend, chartData }` | `SettingsContext.jsx` |
| [`src/hooks/useFinancialHealth.js`](file:///c:/Users/jonit/Desktop/Growy/src/hooks/useFinancialHealth.js) | Evalúa en tiempo real la salud financiera del usuario de `0` a `100` puntos divididos en 3 pilares: Ahorro (`40 pts`), Deudas Vencidas (`30 pts`) y Presupuestos (`30 pts`), retornando el tier y el mensaje de diagnóstico. | Retorno: `{ score, tier, statusTitle, statusMessage, breakdown: { savings, debts, budget } }` | `FinanceContext.jsx`, `SettingsContext.jsx`, `formatters.js` |
| [`src/hooks/useDocumentTitle.js`](file:///c:/Users/jonit/Desktop/Growy/src/hooks/useDocumentTitle.js) | Actualiza `document.title` reactivamente según la pestaña activa y el idioma (`"Growy • Panel Principal"`, `"Growy • Cuentas"`, etc.). | Entrada: `activeTab` (`string`) | `SettingsContext.jsx` |

#### E. Utilidades y Constantes (`src/utils/` y `src/constants/`)
| Archivo | Responsabilidad Única | Exportaciones Principales |
| :--- | :--- | :--- |
| [`src/utils/accountBalanceSelectors.js`](file:///c:/Users/jonit/Desktop/Growy/src/utils/accountBalanceSelectors.js) | Calcula de forma determinista el saldo disponible de cada cuenta a partir de su saldo inicial y todas las transacciones del libro mayor. | `calculateAccountBalance(account, transactions)`, `hydrateAccountsWithLedgerBalances(accounts, transactions)` |
| [`src/utils/currency.js`](file:///c:/Users/jonit/Desktop/Growy/src/utils/currency.js) | Define las 20 monedas soportadas (`CURRENCY_MAP`), detecta moneda/idioma por zona horaria, formatea montos con `Intl.NumberFormat` y realiza conversiones polimórficas `formatToGlobal` y `convertToGlobal`. | `CURRENCY_MAP`, `FALLBACK_EXCHANGE_RATES`, `detectUserLocaleAndCurrency`, `getCurrencySymbol`, `getAvailableCurrencies`, `formatCurrency`, `convertCrossCurrency`, `getCrossRate`, `formatToGlobal`, `convertToGlobal` |
| [`src/utils/defaultCategories.js`](file:///c:/Users/jonit/Desktop/Growy/src/utils/defaultCategories.js) | Define las 6 categorías semilla para usuarios nuevos (Vivienda, Alimentación, Transporte, Entretenimiento, Salario, Negocios) en ES/EN con límites adaptados a la divisa base. | `getDefaultCategories(lang, baseCurrency)` |
| [`src/utils/exportUtils.js`](file:///c:/Users/jonit/Desktop/Growy/src/utils/exportUtils.js) | Genera archivos CSV (con BOM `\uFEFF` para Excel y bloque de Resumen Ejecutivo) y ventanas de impresión PDF con diseño corporativo de Growy. | `exportToCSV(data, filename, columns, summary, lang)`, `exportToPDF(title, data, columns, summary, lang)` |
| [`src/utils/formatters.js`](file:///c:/Users/jonit/Desktop/Growy/src/utils/formatters.js) | Formateo seguro de fechas locales sin desfase UTC (`YYYY-MM-DD`), parseo numérico (`parseNumeric`), cálculo de porcentajes y diferencia de días (`getDaysDifference`). | `formatDateLabel`, `formatHeaderDate`, `formatDateISO`, `parseNumeric`, `calcPercentage`, `calcSavingsRate`, `getDaysDifference`, `formatLoanDescription` |
| [`src/utils/modalManager.js`](file:///c:/Users/jonit/Desktop/Growy/src/utils/modalManager.js) | Contador global reactivo de modales activos. Sincroniza `data-modal-open="true"` en `document.body` y notifica a `BottomNav` para ocultarse. | `registerModal()`, `getIsAnyModalOpen()`, `subscribeModalState(listener)`, `useIsAnyModalOpen()` |
| [`src/utils/storage.js`](file:///c:/Users/jonit/Desktop/Growy/src/utils/storage.js) | Lectura/escritura segura en `localStorage` con prefijos aislados por `userId` (`<key>_<userId>`). | `STORAGE_KEYS`, `getScopedKey`, `loadFromStorage`, `saveToStorage`, `clearUserScopedStorage` |
| [`src/utils/userStorage.js`](file:///c:/Users/jonit/Desktop/Growy/src/utils/userStorage.js) | Gestión de sesión (`localStorage` si "Recordarme" está activo, `sessionStorage` si no), validación de códigos de invitación y puente con `supabaseService`. | `VALID_INVITE_CODES`, `getActiveSessionUserId`, `setActiveSessionUserId`, `registerUser`, `validateUserLogin`, `updateUserProfile`, `deleteUserAccount` |
| [`src/constants/colors.js`](file:///c:/Users/jonit/Desktop/Growy/src/constants/colors.js) | Exporta `CURATED_COLORS` (10 colores vibrantes con nombre e ID) y `DEFAULT_COLOR` (`#97F2CC`). | `CURATED_COLORS`, `DEFAULT_COLOR` |
| [`src/constants/emojis.js`](file:///c:/Users/jonit/Desktop/Growy/src/constants/emojis.js) | Catálogo masivo de 38,572 líneas con 8 categorías de emojis Unicode bilingües (`EMOJI_CATEGORIES`), logos de bancos de LATAM/EE.UU./Europa (`BANK_PRESETS`) y logos de plataformas SaaS/Streaming (`SERVICE_PRESETS`). | `EMOJI_CATEGORIES`, `BANK_PRESETS`, `SERVICE_PRESETS` |

#### F. Vistas Principales (`src/components/`)
| Archivo | Responsabilidad Única | Props / Estados Principales | Dependencias Clave |
| :--- | :--- | :--- | :--- |
| [`src/components/DashboardPreview.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/DashboardPreview.jsx) | Contenedor maestro de la aplicación autenticada: renderiza la barra lateral (`aside`), barra superior, `BottomNav`, el *More Sheet* móvil, los modales globales de creación rápida y la vista **Dashboard Principal** (KPIs del mes, `DebtDueBanner`, `CashflowForecastChart`, `FinancialHealthCard`, `TopAccountsWidget`, Presupuestos por Categoría y Actividad Reciente). | Props: `currentUser`, `onLogout`, `onUpdateUser`, `onRestartTour`, `onOpenPrivacy`. Estados: `activeTab`, `isSidebarCollapsed`, `isMoreSheetOpen`, estados de apertura de todos los modales globales | Todos los módulos de vista, `FinanceContext`, `SettingsContext`, `useDocumentTitle`, `modalManager` |
| [`src/components/AccountsModule.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/AccountsModule.jsx) | Gestión de Cuentas Bancarias: muestra el banner `SectionKpiHero` con el Patrimonio Neto Consolidado en moneda base, buscador, selector de ordenamiento, tarjetas de cuentas con su saldo nativo y equivalente global, botón de transferencia directa y exportación CSV/PDF. | Estados: `searchTerm`, `sortBy` (`balance-desc`, `balance-asc`, `name-asc`), `currentPage`, `pageSize`, `isModalOpen`, `accountToEdit`, `accountToDelete` | `FinanceContext`, `SettingsContext`, `SectionKpiHero`, `AccountModal`, `ConfirmDeleteModal`, `ExportDropdown`, `Pagination` |
| [`src/components/TransactionsModule.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/TransactionsModule.jsx) | Libro Mayor de Movimientos: muestra 3 tarjetas KPI dinámicas basadas en los filtros activos (Ingresos, Gastos y Flujo Neto excluyendo préstamos/transferencias con `exclude_from_budget`), barra de búsqueda, filtros por tipo/fecha/cuenta/categoría, renderizado de cuenta virtual `"Saldos Pendientes"` en préstamos y exportación CSV/PDF. | Props: `onEditTx`, `onDeleteTx`, `onNewTx`. Estados: `searchTerm`, `typeFilter`, `datePreset`, `startDate`, `endDate`, `accountIdFilter`, `categoryIdFilter`, `isFiltersModalOpen`, `currentPage`, `pageSize` | `FinanceContext`, `SettingsContext`, `AdvancedFiltersModal`, `ExportDropdown`, `Pagination`, `DynamicIcon` |
| [`src/components/CategoriesModule.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/CategoriesModule.jsx) | Gestión de Categorías y Presupuestos: filtra los movimientos del **mes calendario actual** (excluyendo `exclude_from_budget`), divide las categorías en dos secciones (**Presupuestos de Gastos** con alertas al 80% y 100%, y **Metas de Ingresos**) y convierte gastos multidivisa a la moneda de cada categoría y a la moneda base. | Estados: `searchTerm`, `typeFilter` (`all`, `expense`, `income`), `isModalOpen`, `categoryToEdit`, `categoryToDelete`, `currentPage`, `pageSize` | `FinanceContext`, `SettingsContext`, `SectionKpiHero`, `CategoryModal`, `ConfirmDeleteModal`, `ExportDropdown` |
| [`src/components/DebtsView.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/DebtsView.jsx) | Módulo integral de Saldos Pendientes: separa mediante pestañas **Por Pagar (Deudas)** y **Por Cobrar (Préstamos/Saldos a Favor)**, calcula saldos restantes vía `calculateDebtRemaining`, permite expandir el historial de abonos parciales de cada tarjeta, registrar nuevos abonos (`DebtPaymentModal`) o eliminar abonos individuales revirtiendo el movimiento bancario. | Estados: `activeSubTab` (`payable` \| `receivable`), `statusFilter` (`pending`, `paid`, `all`), `searchTerm`, `expandedHistoryIds`, `isDebtModalOpen`, `isReceivableModalOpen`, `paymentModalDebt`, `paymentToDelete` | `FinanceContext`, `SettingsContext`, `debtsService`, `DebtModal`, `ReceivableModal`, `DebtPaymentModal`, `ConfirmDeleteModal` |
| [`src/components/SubscriptionsModule.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/SubscriptionsModule.jsx) | Gestión de Suscripciones Recurrentes: calcula el gasto mensual estimado y la **Proyección Anualizada (`monthly * 12`)** en moneda base, muestra cuántos días faltan para el próximo día de corte (`billingDay`), permite pausar/activar cobros automáticos con un clic y exportar reportes. | Estados: `searchTerm`, `statusFilter`, `frequencyFilter`, `isModalOpen`, `subToEdit`, `subToDelete`, `currentPage`, `pageSize` | `FinanceContext`, `SettingsContext`, `SectionKpiHero`, `SubscriptionModal`, `ConfirmDeleteModal`, `ExportDropdown` |
| [`src/components/SettingsModule.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/SettingsModule.jsx) | Panel de Configuración del Usuario: edición de perfil (`fullName`, `username`, `email`), cambio de contraseña validando la actual (`dbChangeUserPassword`), selector de idioma (`es`/`en`), selector de Moneda Base (20 divisas), selector de Tema de Acento (5 presets), reinicio del Tour, exportación de respaldo JSON y **Zona de Peligro** (reinicio de datos o borrado definitivo de cuenta). | Props: `currentUser`, `onUpdateUser`, `onLogout`, `onRestartTour`. Estados: `profileForm`, `pwdForm`, `isResetModalOpen`, `isDeleteAccountModalOpen` | `SettingsContext`, `FinanceContext`, `supabaseService`, `userStorage`, `DeleteAccountModal`, `ConfirmDeleteModal` |
| [`src/components/AboutModule.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/AboutModule.jsx) | Página institucional de Growy y el estudio de ingeniería **SIMPORA**, destacando los pilares de arquitectura, seguridad RLS y enlaces directos a Privacidad y Soporte. | Props: `onNavigateTab`, `onOpenPrivacy` | `SettingsContext` |
| [`src/components/FeedbackModule.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/FeedbackModule.jsx) | Centro de Soporte y Sugerencias: formulario con selector de tipo (`improvement`, `bug`, `comment`), calificación por estrellas (`1-5`), asunto y mensaje detallado que se inserta en la tabla `public.feedback` de Supabase. | Props: `currentUser`. Estados: `feedbackType`, `rating`, `subject`, `message`, `isSubmitting`, `submittedSuccess` | `SettingsContext`, `supabaseService` |

#### G. Modales, Selectores y Componentes Compartidos (`src/components/`)
- **Modales Financieros:**
  - [`AccountModal.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/AccountModal.jsx): Creación/edición de cuenta bancaria (`name`, `emoji`, `currency`, `balance` inicial).
  - [`CategoryModal.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/CategoryModal.jsx): Creación/edición de categoría (`name`, `emoji`, `type`, `currency`, `monthlyLimit`).
  - [`TransactionModal.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/TransactionModal.jsx): Registro/edición de Gasto, Ingreso, Transferencia entre cuentas (con doble monto `destinationAmount` si las cuentas tienen distinta moneda) o edición de transferencia de préstamo hacia la cuenta virtual `'virtual_pending_balances'`.
  - [`DebtModal.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/DebtModal.jsx): Creación/edición de Deudas Por Pagar (`payable`) o Saldos Por Cobrar (`receivable`), con switch de desembolso directo desde cuenta bancaria (`isDirectLoan`).
  - [`debts/ReceivableModal.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/debts/ReceivableModal.jsx): Modal especializado y simplificado exclusivamente para Saldos Por Cobrar y Préstamos Otorgados.
  - [`DebtPaymentModal.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/DebtPaymentModal.jsx): Registro de abonos parciales o liquidación total. Detecta automáticamente si la cuenta seleccionada opera en una moneda distinta a la deuda (`isDifferentCurrency`) y habilita un **doble campo numérico** (monto a amortizar en moneda de deuda vs. monto real a debitar/acreditar en moneda de la cuenta bancaria), mostrando el tipo de cambio implícito.
  - [`PayLoanModal.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/PayLoanModal.jsx): Modal de liquidación directa con opción de conservar el registro como `'paid'` o eliminarlo tras generar la transacción.
  - [`SubscriptionModal.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/SubscriptionModal.jsx): Creación/edición de suscripción recurrente (`name`, `emoji`, `accountId`, `categoryId`, `amount`, `billingDay`, `frequency`, `isActive`).
- **Selectores y Controles UI:**
  - [`UniversalIconPicker.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/UniversalIconPicker.jsx): Modal selector con 4 pestañas (`Emojis`, `Bancos & Finanzas`, `Suscripciones & Apps`, `URL Personalizada`) y buscador normalizado sin tildes (`normalize('NFD')`).
  - [`CustomSelect.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/CustomSelect.jsx): Dropdown flotante renderizado vía `createPortal` con posicionamiento dinámico anti-desborde, soporte para logos/emojis, modo multi-selección (`isMulti`) y barra de búsqueda automática cuando `options.length > 7`.
  - [`CustomDatePicker.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/CustomDatePicker.jsx): Calendario mensual interactivo renderizado vía `createPortal` con botones rápidos de "Hoy" y "Borrar".

---

## 4. Reglas de Negocio y Lógica Financiera

### 4.1 Ciclo Contable de Cuentas: Arquitectura de Libro Mayor Puro (*Pure Ledger Balance*)
Implementado en [`src/utils/accountBalanceSelectors.js`](file:///c:/Users/jonit/Desktop/Growy/src/utils/accountBalanceSelectors.js):
- El campo `balance` guardado en la tabla `public.accounts` representa **únicamente el Saldo Inicial (`initialBalance`)** configurado por el usuario.
- Cada vez que `FinanceContext` carga o modifica cuentas o transacciones, invoca `hydrateAccountsWithLedgerBalances(rawAccounts, transactions)`.
- Para cada cuenta $A$, su saldo disponible en tiempo real se calcula mediante la ecuación:

$$\text{Saldo Disponible}(A) = \text{Saldo Inicial}(A) + \sum \text{Ingresos}(A) - \sum \text{Gastos}(A) - \sum \text{Transferencias Salientes}(A) + \sum \text{Transferencias Entrantes}(A)$$

- **Regla Multidivisa en Transferencias Entrantes:** Cuando una transferencia (`type === 'transfer'`) entra a la cuenta destino (`destination_account_id === A.id`), si el registro posee un `destination_amount` o `target_amount` mayor a `0` (producto de una transferencia entre cuentas de diferente divisa), se suma ese `destination_amount`; de lo contrario, se suma `amount`.
- **Consecuencia Arquitectónica:** Nunca se hace un `UPDATE accounts SET balance = balance - X` al crear o borrar transacciones. El saldo es 100% derivado del libro mayor, garantizando que editar o eliminar cualquier transacción, abono o préstamo recalcule los saldos bancarios con precisión atómica y cero desincronización.

### 4.2 Motor de Cobro Automático de Suscripciones (*Subscriptions Auto-Debit Cron*)
Implementado en [`processSubscriptionsCron(userId, existingSubs, existingTxs)`](file:///c:/Users/jonit/Desktop/Growy/src/services/supabaseService.js#L1120-L1254):
1. Se ejecuta automáticamente en `FinanceContext` al cargar la sesión del usuario.
2. Filtra las suscripciones con `isActive === true` que tengan `accountId` válido.
3. Determina si corresponde cobrar en el período actual (`YYYY-MM` para `monthly`, `YYYY` para `yearly`):
   - Verifica que `last_processed_date` no pertenezca ya al mes/año actual.
   - Verifica que el día del mes actual (`todayDay`) sea mayor o igual al día de corte efectivo:
     $$\text{effectiveBillingDay} = \min(\text{billingDay}, \text{díasEnElMesActual})$$
     *(Esto garantiza que una suscripción con día de corte `31` se cobre el día `28` o `29` en febrero).*
4. **Doble Verificación Anti-Duplicados:** Antes de insertar el cargo, inspecciona las transacciones existentes del mes buscando coincidencias por etiqueta `[Auto-Sub:<id>]` o por combinación exacta de nombre, monto y cuenta.
5. Si procede el cobro:
   - Crea una transacción `type: 'expense'` en `public.transactions` con fecha `YYYY-MM-<effectiveBillingDay>`, descripción `"Suscripción: <Nombre>"`, y el `accountId` y `categoryId` de la suscripción.
   - Actualiza `last_processed_date` en `public.subscriptions` y dispara una notificación en el Dashboard (`autoDebitsNotification`).

### 4.3 Tratamiento Contable: Deudas Por Pagar (`payable`) vs. Préstamos Otorgados (`receivable`)
Implementado en [`src/services/debtsService.js`](file:///c:/Users/jonit/Desktop/Growy/src/services/debtsService.js) y [`src/context/FinanceContext.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/context/FinanceContext.jsx):

1. **Creación de un Saldo Pendiente (`saveLoan`):**
   - Si `isDirectLoan === false` (registro informativo): Solo se inserta el documento en `public.pending_debts` sin tocar los saldos bancarios actuales.
   - Si `isDirectLoan === true` y `type === 'receivable'` (**Préstamo Directo Otorgado**):
     - Invoca `recordDirectLoanTransaction` en [`debtsService.js`](file:///c:/Users/jonit/Desktop/Growy/src/services/debtsService.js#L261-L343).
     - Crea un asiento en `public.transactions` con:
       - `type: 'transfer'`
       - `account_id: sourceAccountId` (la cuenta de donde salió el dinero)
       - `destination_account_id: null` (representado en la UI mediante la cuenta virtual `'virtual_pending_balances'` -> `"⏳ Saldos Pendientes (Por Cobrar)"`)
       - `category_id: null`
       - `debt_id: savedDebt.id`
       - `exclude_from_budget: true`
       - `description: "Préstamo a: <Concepto>"`
   - **Por qué se diseña así:** Prestar dinero **no es un gasto de consumo**; es una reubicación de liquidez desde un banco hacia una cuenta por cobrar. Al registrarse como `transfer` con `exclude_from_budget: true` y `category_id: null`, el saldo del banco disminuye realmente, pero **no infla los gastos del mes, no altera el Burn Rate diario, no penaliza la Tasa de Ahorro y no consume presupuesto de ninguna categoría**.

2. **Flujo de Abonos Parciales y Manejo Multidivisa (`recordDebtPaymentWithTransaction`):**
   Cuando el usuario registra un abono en [`DebtPaymentModal.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/DebtPaymentModal.jsx):
   - Se distinguen dos montos:
     1. **`amount` (Monto de Amortización):** Expresado en la divisa nominal de la deuda (`debt.currency`). Se guarda en `public.debt_payments.amount` para restar exactamente del saldo pendiente de la deuda.
     2. **`accountDebitAmount` (Monto Bancario Real):** Expresado en la divisa de la cuenta bancaria seleccionada (`account.currency`). Se guarda en `public.transactions.amount` para afectar el saldo de la cuenta bancaria en su propia moneda.
   - **Naturaleza del asiento en `transactions` según el tipo de saldo:**
     - **Abono a Deuda Por Pagar (`payable`):** Genera una transacción `type: 'expense'`, `account_id: accountId`, `category_id: debt.categoryId`, `exclude_from_budget: false`, descripción `"Abono a deuda: <Concepto>"`.
     - **Cobro de Préstamo / Saldo a Favor (`receivable`):** Genera una transacción `type: 'transfer'`, `account_id: null`, `destination_account_id: accountId`, `category_id: null`, `exclude_from_budget: true`, descripción `"Cobro de préstamo: <Concepto>"`. Así, el dinero regresa al banco (vía `totalTransfersIn`) sin inflar artificialmente los "Ingresos Operativos" del mes.
   - **Liquidación Automática:** Tras insertar el abono, `calculateDebtRemaining(debt, updatedPayments)` verifica si $\text{remainingAmount} \le 0.001$. De ser así, actualiza automáticamente `pending_debts.status = 'paid'`.
   - **Reversión Bidireccional:**
     - Si se elimina un abono desde `DebtsView` (`deleteDebtPaymentWithReversion`), se borra la fila en `debt_payments`, se borra su `transaction_id` en `transactions` y, si la deuda estaba en `'paid'` y ahora tiene saldo $> 0.001$, se revierte su estado a `'pending'`.
     - Si se elimina la transacción directamente desde `TransactionsModule` (`handleTransactionDeletedForDebts`), se busca el abono vinculado en `debt_payments`, se elimina y se recalcula el estado `'pending'`/`'paid'` de la deuda.

### 4.4 Algoritmos Matemáticos del Sistema

#### A. Proyección de Flujo de Caja y *Burn Rate* ([`src/hooks/useCashflowProjection.js`](file:///c:/Users/jonit/Desktop/Growy/src/hooks/useCashflowProjection.js))
Opera estrictamente sobre el **mes calendario en curso** ($1 \dots \text{daysInMonth}$, donde `currentDay` es el día actual $t$):
1. **Gastos Operativos Acumulados ($\text{expensesSoFar}$):** Suma de transacciones de tipo `'expense'` entre el día $1$ y el día $t$ del mes actual que **no** tengan `exclude_from_budget === true`, convertidas a la moneda base.
2. **Tasa de Quema Diaria (*Daily Burn Rate*):**
   $$\text{dailyBurnRate} = \frac{\text{expensesSoFar}}{\max(1, \text{currentDay})}$$
3. **Suscripciones Pendientes del Mes ($\text{pendingSubscriptionsTotal}$):** Suma de suscripciones activas (`isActive === true`) cuyo `billingDay > currentDay` y cuyo `lastProcessedDate` no corresponda ya al mes actual.
4. **Deudas Pendientes con Vencimiento en el Resto del Mes ($\text{pendingDebtsTotal}$):** Suma de saldos pendientes de tipo `'payable'` con `status === 'pending'` cuya `dueDate` caiga entre `currentDay + 1` y `daysInMonth`.
5. **Saldo Proyectado a Fin de Mes ($\text{projectedBalance}$):**
   $$\text{projectedBalance} = \text{currentTotalBalance} - (\text{dailyBurnRate} \times \text{daysRemaining}) - \text{pendingSubscriptionsTotal} - \text{pendingDebtsTotal}$$
6. **Reconstrucción de la Curva Histórica y Futura (`chartData`):**
   - Para días pasados ($d < \text{currentDay}$): reconstruye el saldo real histórico hacia atrás a partir del `currentTotalBalance` actual restando los flujos netos posteriores:
     $$\text{actual}[d] = \text{currentTotalBalance} - \sum_{k = d + 1}^{\text{currentDay}} \text{netFlow}[k]$$
   - Para el día de hoy ($d = \text{currentDay}$): punto de anclaje donde convergen la línea sólida y la línea punteada ($\text{actual}[t] = \text{projected}[t] = \text{currentTotalBalance}$).
   - Para días futuros ($d > \text{currentDay}$): resta diariamente el `dailyBurnRate` más las suscripciones y deudas que vencen exactamente en el día $d$.

#### B. Score de Salud Financiera ([`src/hooks/useFinancialHealth.js`](file:///c:/Users/jonit/Desktop/Growy/src/hooks/useFinancialHealth.js))
Calcula un puntaje entero $\text{Score} \in [0, 100]$ sumando tres dimensiones independientes:
1. **Pilar 1 — Tasa de Ahorro Mensual (Máximo `40 puntos`):**
   - Filtra ingresos ($\text{Income}$) y gastos ($\text{Expenses}$) del mes actual excluyendo `exclude_from_budget === true`.
   - Calcula $\text{savingsRate} = \frac{\text{Income} - \text{Expenses}}{\text{Income}} \times 100$.
   - Si $\text{savingsRate} \ge 20\% \implies 40\text{ pts}$.
   - Si $0\% < \text{savingsRate} < 20\% \implies \text{round}\left(\frac{\text{savingsRate}}{20} \times 40\right)\text{ pts}$.
   - Si $\text{savingsRate} \le 0\% \implies 0\text{ pts}$ (o `20 pts` neutrales si aún no hay transacciones en el mes).
2. **Pilar 2 — Deudas y Compromisos al Día (Máximo `30 puntos`):**
   - Cuenta cuántas deudas en `pending_debts` con `status === 'pending'` tienen `dueDate < hoy` ($\text{overdueCount}$).
   - Si $\text{overdueCount} === 0 \implies 30\text{ pts}$.
   - Si $\text{overdueCount} === 1 \implies 15\text{ pts}$.
   - Si $\text{overdueCount} \ge 2 \implies 0\text{ pts}$.
3. **Pilar 3 — Apego a Presupuestos por Categoría (Máximo `30 puntos`):**
   - Evalúa todas las categorías de gasto con `monthlyLimit > 0`.
   - Cuenta cuántas categorías cumplen $\text{gastoMensualCategoría} \le \text{monthlyLimit}$ ($\text{onTrackCount}$).
   - $\text{budgetPoints} = \text{round}\left(\frac{\text{onTrackCount}}{\text{totalBudgetedCategories}} \times 30\right)$.
   - *(Fallback si el usuario no ha configurado límites en categorías: otorga `30 pts` si gastos $\le 80\%$ de ingresos, `18 pts` si $\le 100\%$, `0 pts` si hay déficit).*
4. **Clasificación de Tiers:**
   - `excellent` ($\ge 90\text{ pts}$), `good` ($75 - 89\text{ pts}$), `fair` ($50 - 74\text{ pts}$), `critical` ($< 50\text{ pts}$).

---

## 5. Guía de Navegación Rápida ("Cheat Sheet" para Agentes de IA)

### 5.1 Índice Directo: "¿Qué archivo modificar si quiero cambiar X?"

| Si necesitas modificar o agregar... | Archivo(s) Exacto(s) a Intervenir |
| :--- | :--- |
| **Fórmula del saldo disponible de las cuentas bancarias** | [`src/utils/accountBalanceSelectors.js`](file:///c:/Users/jonit/Desktop/Growy/src/utils/accountBalanceSelectors.js) (`calculateAccountBalance`) |
| **Consultas a Supabase, mapeo de columnas o reintentos de esquema** | [`src/services/supabaseService.js`](file:///c:/Users/jonit/Desktop/Growy/src/services/supabaseService.js) |
| **Lógica de préstamos directos, abonos parciales o reversión de pagos** | [`src/services/debtsService.js`](file:///c:/Users/jonit/Desktop/Growy/src/services/debtsService.js) y [`src/context/FinanceContext.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/context/FinanceContext.jsx) |
| **Motor de cobro automático de suscripciones (Cron al iniciar)** | [`src/services/supabaseService.js`](file:///c:/Users/jonit/Desktop/Growy/src/services/supabaseService.js) (`processSubscriptionsCron`) |
| **Algoritmo de Burn Rate o curva del gráfico de proyección a fin de mes** | [`src/hooks/useCashflowProjection.js`](file:///c:/Users/jonit/Desktop/Growy/src/hooks/useCashflowProjection.js) y [`src/components/dashboard/CashflowForecastChart.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/dashboard/CashflowForecastChart.jsx) |
| **Puntaje de Salud Financiera (0-100 pts) o mensajes de diagnóstico** | [`src/hooks/useFinancialHealth.js`](file:///c:/Users/jonit/Desktop/Growy/src/hooks/useFinancialHealth.jsx) y [`src/components/dashboard/FinancialHealthCard.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/dashboard/FinancialHealthCard.jsx) |
| **Tasas de cambio, API de divisas o conversión cruzada USD** | [`src/services/currencyService.js`](file:///c:/Users/jonit/Desktop/Growy/src/services/currencyService.js) y [`src/utils/currency.js`](file:///c:/Users/jonit/Desktop/Growy/src/utils/currency.js) |
| **Temas de color (`--accent`), estilos glassmorphism o inputs globales** | [`src/index.css`](file:///c:/Users/jonit/Desktop/Growy/src/index.css) y `THEME_PRESETS` en [`src/context/SettingsContext.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/context/SettingsContext.jsx) |
| **Textos de interfaz o traducciones Español / Inglés** | [`src/i18n/translations.js`](file:///c:/Users/jonit/Desktop/Growy/src/i18n/translations.js) (y sincronizar [`locales/es.json`](file:///c:/Users/jonit/Desktop/Growy/locales/es.json) / [`locales/en.json`](file:///c:/Users/jonit/Desktop/Growy/locales/en.json)) |
| **Catálogo de emojis o logos predefinidos de Bancos y Servicios SaaS** | [`src/constants/emojis.js`](file:///c:/Users/jonit/Desktop/Growy/src/constants/emojis.js) y [`src/components/UniversalIconPicker.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/UniversalIconPicker.jsx) |
| **Sidebar, navegación entre pestañas o tarjetas del Dashboard Principal** | [`src/components/DashboardPreview.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/DashboardPreview.jsx) |
| **Formulario de Gastos, Ingresos o Transferencias entre cuentas** | [`src/components/TransactionModal.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/TransactionModal.jsx) |
| **Vista de Saldos Pendientes (Por Pagar / Por Cobrar) e historial de abonos** | [`src/components/DebtsView.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/DebtsView.jsx), [`src/components/DebtModal.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/DebtModal.jsx), [`src/components/debts/ReceivableModal.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/debts/ReceivableModal.jsx) y [`src/components/DebtPaymentModal.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/DebtPaymentModal.jsx) |
| **Exportación de reportes a Excel (CSV) o PDF imprimible** | [`src/utils/exportUtils.js`](file:///c:/Users/jonit/Desktop/Growy/src/utils/exportUtils.js) y [`src/components/ExportDropdown.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/ExportDropdown.jsx) |
| **Códigos de invitación para registro o validación de sesión** | [`src/utils/userStorage.js`](file:///c:/Users/jonit/Desktop/Growy/src/utils/userStorage.js) y [`src/components/Modals.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/Modals.jsx) (`RegisterModal`) |

---

### 5.2 Puntos Críticos, Trampas Comunes y Advertencias Arquitectónicas

> [!CAUTION]
> **1. Regla Estricta del Orden de Hooks en Modales (`Rules of Hooks`):**  
> En todos los componentes modales (`TransactionModal.jsx`, `DebtModal.jsx`, `DebtPaymentModal.jsx`, `ReceivableModal.jsx`, `SubscriptionModal.jsx`, `AccountModal.jsx`, `CategoryModal.jsx`), **TODOS los hooks (`useState`, `useMemo`, `useEffect`, `useCallback`) DEBEN declararse antes del retorno condicional `if (!isOpen) return null;`** (o `if (!isOpen || !debt) return null;`). Nunca coloques un `useMemo` o `useEffect` debajo del `if (!isOpen) return null`, ya que al abrirse el modal cambiará el número de hooks ejecutados por render y provocará un crash fatal de React (`Rendered more hooks than during the previous render`) capturado por `ErrorBoundary`.

> [!IMPORTANT]
> **2. Componentes Wrapper vs. Implementaciones Reales:**  
> Existen archivos en la raíz de `src/components/` que son **re-exportadores de 1 a 3 líneas** por compatibilidad de rutas:
> - `LoansModule.jsx` $\rightarrow$ re-exporta [`DebtsView.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/DebtsView.jsx).
> - `LoanModal.jsx` $\rightarrow$ re-exporta [`DebtModal.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/DebtModal.jsx).
> - `ReceivableModal.jsx` $\rightarrow$ re-exporta [`debts/ReceivableModal.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/debts/ReceivableModal.jsx).
> - `TransactionsView.jsx` $\rightarrow$ re-exporta [`TransactionsModule.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/TransactionsModule.jsx).
> - `CategoriesView.jsx` $\rightarrow$ re-exporta [`CategoriesModule.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/CategoriesModule.jsx).
> - `SubscriptionsView.jsx` $\rightarrow$ re-exporta [`SubscriptionsModule.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/SubscriptionsModule.jsx).
> - `CashflowForecastChart.jsx` $\rightarrow$ re-exporta [`dashboard/CashflowForecastChart.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/dashboard/CashflowForecastChart.jsx).
> - `FinancialHealthCard.jsx` $\rightarrow$ re-exporta [`dashboard/FinancialHealthCard.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/dashboard/FinancialHealthCard.jsx).
> - `TopAccountsWidget.jsx` $\rightarrow$ re-exporta [`dashboard/TopAccountsWidget.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/dashboard/TopAccountsWidget.jsx).
> - `EmptyState.jsx` $\rightarrow$ re-exporta [`common/EmptyState.jsx`](file:///c:/Users/jonit/Desktop/Growy/src/components/common/EmptyState.jsx).  
> **Realiza siempre tus ediciones en el archivo de implementación real.**

> [!WARNING]
> **3. Renderizado de la Cuenta Virtual `'virtual_pending_balances'`:**  
> Los préstamos directos (`is_direct_loan = true`) generan una transacción `type = 'transfer'` con `account_id = <cuenta_origen>` y `destination_account_id = null`.  
> - En `TransactionsModule.jsx` y `DashboardPreview.jsx`, cuando una transferencia no tiene `destination_account_id` pero tiene `debt_id` o su descripción inicia con `"Préstamo a:"` / `"Loan to:"`, se muestra como transferencia hacia `"Saldos Pendientes"`.
> - En `TransactionModal.jsx`, al editar una de estas transferencias, el selector de cuenta destino inyecta la opción virtual `{ value: 'virtual_pending_balances', name: '⏳ Saldos Pendientes (Por Cobrar)' }`. Antes de enviar a Supabase (`handleSubmit`), `'virtual_pending_balances'` se convierte de vuelta a `destinationAccountId: null` para no violar la restricción UUID de llave foránea en PostgreSQL.

> [!IMPORTANT]
> **4. Fechas Locales sin Desfase de Zona Horaria (UTC Bug Prevention):**  
> Nunca utilices `new Date("YYYY-MM-DD")` directamente para mostrar días o filtrar meses, ya que el estándar ECMAScript interpreta las cadenas ISO de solo fecha como medianoche UTC (`00:00:00Z`), lo que en zonas horarias de América Latina (`UTC-6`, `UTC-5`) retrocede un día (`día anterior a las 18:00`).  
> - Utiliza siempre `formatDateISO()`, `formatDateLabel()` o `getDaysDifference()` de [`src/utils/formatters.js`](file:///c:/Users/jonit/Desktop/Growy/src/utils/formatters.js), o desestructura `const [y, m, d] = dateStr.split('-').map(Number); new Date(y, m - 1, d);`.

> [!NOTE]
> **5. Exclusión Contable (`exclude_from_budget`):**  
> Siempre que agregues un nuevo widget, gráfico o KPI que calcule gastos o ingresos operativos del usuario, debes filtrar las transacciones con:  
> `const isExcluded = Boolean(tx.excludeFromBudget ?? tx.exclude_from_budget);`  
> Si `isExcluded === true`, la transacción **solo** participa en el cálculo de saldo bancario (`accountBalanceSelectors.js`), nunca en presupuestos de categorías ni en ratios de ahorro/gasto.
