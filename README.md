# YAMA AI — versión SaaS (Next.js)

Mismo diseño y experiencia de siempre, ahora con: backend seguro, cuentas de
usuario, base de datos, memoria en la nube, planes Free/Pro y pagos con
Stripe. Lista para Vercel.

El proyecto se valida con `npm run build`. Antes de publicar, configura las
variables de entorno, aplica el esquema de Prisma y prueba el webhook de
Stripe en modo de prueba.

---

## 1. Base de datos (gratis para empezar)

1. Crea un proyecto en https://supabase.com (plan gratuito)
2. Ve a Project Settings → Database → copia la "Connection string" (modo
   "Transaction" / puerto 6543 si usas el pooler, o el directo 5432)
3. Pégala como `DATABASE_URL` en tu `.env`

## 2. Variables de entorno

```bash
cp .env.example .env
```

Completa cada valor (ver comentarios en el archivo). Necesitas al menos una
clave de IA (`GEMINI_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY`,
`OPENROUTER_API_KEY` o `MISTRAL_API_KEY`). Para `NEXTAUTH_SECRET` genera uno con:

Para los adjuntos necesitas también `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. La clave `SUPABASE_SERVICE_ROLE_KEY` solo se
usa en el servidor y nunca debe exponerse al navegador.

```bash
openssl rand -base64 32
```

## 3. Instalar y preparar la base de datos

```bash
npm install
npx prisma db push
```

Esto crea todas las tablas (usuarios, conversaciones, memoria, uso) en tu
base de datos de Supabase.

## 4. Probar en local

```bash
npm run dev
```

Abre http://localhost:3000, crea una cuenta y prueba el chat. YAMA intenta
Gemini primero y usa los proveedores de respaldo configurados si el primero
no está disponible.

## 5. Stripe (pagos de la versión Pro)

1. Crea una cuenta en https://dashboard.stripe.com
2. Products → Add product → "YAMA AI Pro" → precio recurrente mensual →
   copia el **Price ID** (`price_...`) → va en `STRIPE_PRICE_ID_PRO`
3. Developers → API keys → copia la clave secreta → `STRIPE_SECRET_KEY`
4. Developers → Webhooks → Add endpoint →
   `https://tu-dominio.vercel.app/api/billing/webhook` → eventos:
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.created`, `customer.subscription.deleted` →
   copia el "Signing secret" → `STRIPE_WEBHOOK_SECRET`. El botón de Pro de la
   aplicación usa este flujo de Stripe; no hace falta configurar Paddle.

## 6. Desplegar en Vercel

1. Sube esta carpeta a un repositorio de GitHub
2. En https://vercel.com → "Add New Project" → importa el repositorio
3. En "Environment Variables" pega TODAS las variables del `.env`
4. Deploy

Si el build falla, revisa el log de Vercel y ejecuta primero `npm run build`
en local. Las variables de entorno se validan al usar cada integración.

## 7. Íconos de la PWA

Coloca tus propios íconos en:
- `public/icons/icon-192.png` (192×192)
- `public/icons/icon-512.png` (512×512)

Los iconos ya están incluidos en el repositorio. Puedes reemplazarlos por
versiones de tu marca manteniendo esos nombres y tamaños.

## 8. Instalar como app (PWA)

Una vez desplegado, cualquier persona puede entrar desde Chrome en Android
y tocar "Instalar app" / "Agregar a pantalla de inicio". Se abre como app
independiente, con ícono propio.

## 9. Camino a Android / iOS nativos

Esta misma versión (que ya es una PWA) se puede envolver más adelante con
Capacitor para generar un `.apk`/`.aab` (Android) o proyecto Xcode (iOS),
apuntando a tu dominio de Vercel ya desplegado. Es un paso aparte cuando
quieras publicarla en las tiendas — avísame cuando llegues ahí.

## 10. Adjuntos en el chat

YAMA AI usa un bucket privado de Supabase Storage llamado
`yama-attachments`. El navegador sube cada archivo mediante una URL firmada
de corta duración; el servidor valida la sesión, el tipo, el tamaño y el
propietario antes de enviarlo a Gemini.

Se aceptan imágenes JPEG, PNG, GIF y WebP, además de PDF y documentos de texto
como TXT, Markdown, CSV, JSON, HTML y XML. Gemini analiza visualmente las
imágenes y los PDF; los demás documentos se envían como texto.

| Plan | Archivos por mensaje | Archivos por día | Tamaño máximo por archivo |
| --- | ---: | ---: | ---: |
| Free | 1 | 5 | 5 MB |
| Pro | 5 | 100 | 20 MB |

El bucket se crea como privado. En producción, aplica la migración incluida
en la base de datos y configura las cuatro variables de Supabase antes de
probar las subidas.

---

## Límites de uso (para controlar costos)

Editables en `lib/plans.ts`:

- **Free**: 15 mensajes/día, respuestas más cortas, 5 notas de memoria, 2
  análisis de estratega/día
- **Pro**: 300 mensajes/día, respuestas más largas, 200 notas, 50 análisis/día

## Lo que quedó fuera de esta primera versión (para que no falles a ciegas)

- El panel del creador (ideas guardadas, contenido creado, objetivos,
  negocios) todavía no está migrado a la base de datos — la memoria
  "de YAMA" (marca, público, estilo, notas) sí vive en la nube y viaja
  entre dispositivos, pero esas listas del panel son la siguiente pieza
  a mover si las quieres también sincronizadas.
- No hay recuperación de contraseña por email todavía (requiere un
  proveedor de correo tipo Resend o SendGrid) — se puede añadir después.
