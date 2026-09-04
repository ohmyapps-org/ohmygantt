# CLAUDE.md — Gantt App (Eternum)

## Identidad del proyecto

**Nombre:** Gantt App  
**Autor:** Facundo (Faku) — Eternum  
**Tipo:** Herramienta web pública, multi-usuario, open source-friendly  
**Propósito:** Leer GitHub Projects v2 via GraphQL y generar vistas interactivas de Gantt y métricas de progreso. El usuario autentica con su propia cuenta de GitHub via OAuth. El token nunca toca el cliente.

---

## Arquitectura del sistema

```
browser
  React 19 + Vite + Tailwind v4 + Shadcn/ui
  TanStack Query v5 (server state)
  Recharts (métricas)
        │
        │  fetch /api/*   (cookie de sesión httpOnly)
        ▼
Bun HTTP server  (src/server/)
  OAuth handler  → github.com/login/oauth
  GraphQL proxy  → api.github.com/graphql
  Session store  → Map<sessionId, { token, login, expiresAt }>
        │
        │  Authorization: Bearer <token>
        ▼
GitHub API v4 (GraphQL)
```

**Reglas de arquitectura irrompibles:**
- El `access_token` de GitHub **nunca sale del servidor**. El cliente solo recibe y envía una cookie `session_id` httpOnly + sameSite=strict.
- El servidor no persiste tokens en disco. La session store es in-memory. Al reiniciar el servidor, el usuario re-autentica.
- Toda llamada GraphQL va a través del proxy `/api/github`. El cliente **nunca llama directamente** a `api.github.com`.
- Variables de entorno del servidor: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SESSION_SECRET` (para firmar cookies), `PORT`. Nunca en el cliente.
- Variables de entorno del cliente (VITE_*): solo `VITE_APP_URL` (la URL base pública). Nada sensible.

---

## Stack

### Runtime y bundling
- **Runtime:** Bun (nunca Node, nunca npm, nunca npx)
- **Package manager:** Bun (`bun add`, `bun run`, `bun x`)
- **Bundler/dev server:** Vite 6

### Frontend
- **Framework:** React 19 (con `use`, `useTransition`, server actions solo si aplica)
- **Lenguaje:** TypeScript estricto (`strict: true`, sin `any` explícito)
- **Estilos:** Tailwind CSS v4 (configuración en CSS, no en `tailwind.config.js`)
- **Componentes UI:** Shadcn/ui (instalados con `bunx shadcn@latest add <component>`)
- **Server state:** TanStack Query v5 (`useQuery`, `useMutation`, `useInfiniteQuery`)
- **Routing:** React Router v7 (file-based si es posible, sino manual)
- **Gráficos:** Recharts (burndown, velocidad, donut de estados)
- **Íconos:** Lucide React (exclusivamente)
- **Animaciones:** Motion (ex Framer Motion) — solo cuando agrega valor real

### Backend
- **Servidor:** Bun HTTP nativo (`Bun.serve({})`) — sin Express, sin Hono, sin Fastify
- **Estructura:** `src/server/index.ts` como entrypoint, módulos separados por responsabilidad
- **Sesiones:** Map en memoria, `session_id` = `crypto.randomUUID()`, cookie firmada con HMAC-SHA256 usando `SESSION_SECRET`
- **CORS:** Solo permite el origen de `VITE_APP_URL` en producción. En dev, `localhost:5173`.

### Herramientas de calidad
- **Linter:** OxLint (`bunx oxlint`)
- **Formatter:** OxFmt o Biome (`bunx biome format`)
- **Sin ESLint, sin Prettier**

---

## Estructura de archivos

```
gantt-app/
├── src/
│   ├── client/                  # Todo el frontend React
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── routes/
│   │   │   ├── index.tsx        # Landing / login
│   │   │   ├── dashboard.tsx    # Selector de proyecto
│   │   │   ├── gantt.tsx        # Vista Gantt
│   │   │   └── metrics.tsx      # Vista métricas
│   │   ├── components/
│   │   │   ├── ui/              # Shadcn components (auto-generados, no editar)
│   │   │   ├── gantt/
│   │   │   │   ├── GanttChart.tsx
│   │   │   │   ├── GanttRow.tsx
│   │   │   │   ├── GanttBar.tsx
│   │   │   │   └── GanttFilters.tsx
│   │   │   ├── metrics/
│   │   │   │   ├── BurndownChart.tsx
│   │   │   │   ├── VelocityChart.tsx
│   │   │   │   └── StatusDonut.tsx
│   │   │   └── layout/
│   │   │       ├── Shell.tsx
│   │   │       ├── Sidebar.tsx
│   │   │       └── Header.tsx
│   │   ├── hooks/
│   │   │   ├── useProject.ts    # TanStack Query wrapper para el proyecto activo
│   │   │   ├── useItems.ts      # Items del project con fecha start/end
│   │   │   └── useAuth.ts       # Estado de sesión del usuario
│   │   ├── lib/
│   │   │   ├── github.ts        # Tipos TypeScript del schema GraphQL de GitHub Projects
│   │   │   ├── gantt.ts         # Lógica de mapeo items → barras del Gantt
│   │   │   └── dates.ts         # Utilidades de fechas (sin date-fns, nativo)
│   │   └── styles/
│   │       └── globals.css      # Tailwind v4 + CSS vars del tema
│   │
│   └── server/                  # Todo el backend Bun
│       ├── index.ts             # Bun.serve() entrypoint
│       ├── routes/
│       │   ├── auth.ts          # /auth/github, /auth/callback, /auth/logout
│       │   └── github.ts        # /api/github (proxy GraphQL)
│       ├── lib/
│       │   ├── session.ts       # Session store + cookie helpers
│       │   ├── oauth.ts         # GitHub OAuth helpers
│       │   └── proxy.ts         # GraphQL proxy logic
│       └── types.ts             # Tipos compartidos server-side
│
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json           # Para el server
├── package.json
└── .env.example                 # GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_SECRET, PORT, VITE_APP_URL
```

---

## GitHub OAuth flow

```
1. Usuario hace click en "Login with GitHub"
2. Browser → GET /auth/github
   Server redirige a:
   https://github.com/login/oauth/authorize
     ?client_id=GITHUB_CLIENT_ID
     &scope=read:project,read:org,repo
     &state=<csrf_token firmado>
     &redirect_uri=APP_URL/auth/callback

3. GitHub → GET /auth/callback?code=...&state=...
   Server valida state, intercambia code por token:
   POST https://github.com/login/oauth/access_token

4. Server crea sesión:
   sessionId = crypto.randomUUID()
   sessions.set(sessionId, { token, login, expiresAt: now + 8h })
   Set-Cookie: session_id=<signed(sessionId)>; HttpOnly; SameSite=Strict; Secure

5. Server redirige → /dashboard
6. Todas las requests del cliente incluyen la cookie automáticamente
```

---

## GraphQL proxy

El endpoint `/api/github` recibe del cliente:

```typescript
POST /api/github
Content-Type: application/json
Cookie: session_id=...

{
  "query": "...",      // GraphQL query string
  "variables": {}      // Variables opcionales
}
```

El servidor:
1. Valida y decodifica la cookie de sesión
2. Recupera el token de la session store
3. Reenvía la request a `https://api.github.com/graphql` con el token
4. Devuelve la respuesta al cliente sin modificar

El cliente **nunca** ve el token. Si la sesión expiró, el proxy devuelve `401` y el cliente redirige al login.

---

## GitHub Projects v2 — GraphQL queries clave

### Listar proyectos del usuario
```graphql
query ListProjects($login: String!) {
  user(login: $login) {
    projectsV2(first: 20) {
      nodes {
        id
        number
        title
        url
        updatedAt
      }
    }
  }
}
```

### Obtener items de un proyecto con campos personalizados
```graphql
query GetProjectItems($projectId: ID!, $cursor: String) {
  node(id: $projectId) {
    ... on ProjectV2 {
      title
      items(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          type
          fieldValues(first: 20) {
            nodes {
              ... on ProjectV2ItemFieldTextValue {
                text
                field { ... on ProjectV2FieldCommon { name } }
              }
              ... on ProjectV2ItemFieldDateValue {
                date
                field { ... on ProjectV2FieldCommon { name } }
              }
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field { ... on ProjectV2FieldCommon { name } }
              }
              ... on ProjectV2ItemFieldNumberValue {
                number
                field { ... on ProjectV2FieldCommon { name } }
              }
            }
          }
          content {
            ... on Issue {
              title
              number
              url
              state
              assignees(first: 5) {
                nodes { login avatarUrl }
              }
              labels(first: 10) {
                nodes { name color }
              }
              createdAt
              closedAt
            }
          }
        }
      }
    }
  }
}
```

**Nota crítica:** GitHub Projects v2 no tiene campos `start_date` y `end_date` nativos garantizados — depende de qué campos personalizados creó el usuario en su proyecto. El sistema debe hacer field discovery: inspeccionar los `fieldValues` disponibles y mapear por nombre de campo. Campos esperados: `"Start Date"`, `"End Date"`, `"Status"`, `"Size"`, `"Assignees"`. Si no existen campos de fecha, el Gantt los estima por `createdAt` + duración según `Size`.

---

## Lógica del Gantt

### Mapeo de items a barras

```typescript
// src/client/lib/gantt.ts

export type GanttItem = {
  id: string
  title: string
  code: string          // extraído del prefijo del título: "[IS-E1]" → "IS"
  start: Date
  end: Date
  status: string
  assignees: string[]
  progress: number      // 0-1, derivado del status
}

// Derivar código de asignatura del título del issue
function extractCode(title: string): string {
  const match = title.match(/^\[(\w+)-/)
  return match?.[1] ?? 'OTHER'
}

// Estimar fechas si no existen campos de fecha
function estimateDates(item: ProjectItem): { start: Date; end: Date } {
  const created = new Date(item.content.createdAt)
  const sizeMap: Record<string, number> = { XS: 3, S: 5, M: 10, L: 15, XL: 21 }
  const days = sizeMap[item.size ?? 'M'] ?? 10
  const end = new Date(created)
  end.setDate(end.getDate() + days)
  return { start: created, end }
}
```

### Progress por status
```typescript
const PROGRESS: Record<string, number> = {
  'Done': 1,
  'In review': 0.85,
  'In progress': 0.55,
  'To do': 0,
  'Backlog': 0,
}
```

---

## Diseño visual

### Paleta Eternum
```css
/* src/client/styles/globals.css */
:root {
  --navy:   #0F2854;
  --blue:   #1C4D8D;
  --mid:    #4988C4;
  --sky:    #BDE8F5;

  /* Asignaturas */
  --col-IS:  #4988C4;
  --col-UTU: #64CCC5;
  --col-FS:  #7B68EE;
  --col-ASO: #F4A261;

  /* Semantic */
  --bg:      #07172e;
  --bg2:     #0d2040;
  --border:  #1e3a5f;
  --text:    #e8f4fd;
  --muted:   #7aa3c8;
}
```

### Tipografía
- **Display / headings:** DM Serif Display
- **UI / body:** DM Sans (weights: 300, 400, 500, 600)
- **Monoespaciado / IDs / código:** DM Mono (weights: 400, 500)
- Cargadas desde Google Fonts en `index.html`

### Principios de diseño
- Dark theme exclusivo (no dark/light toggle — es una decisión de producto)
- Bordes sutiles (`var(--border)`), nunca sombras agresivas
- Íconos Lucide exclusivamente. Sin emojis, sin decoración
- Shadcn configurado con el tema `dark` por defecto, variables CSS sobreescritas con la paleta Eternum
- Animaciones con Motion solo en: entrada de la página, aparición del Gantt, tooltips. No en cada hover.

---

## Vistas de la app

### 1. Landing / Login (`/`)
- Logo + tagline de la app
- Botón "Login with GitHub" (Shadcn `<Button>` con ícono `Github` de Lucide)
- Sin formulario, sin campos. Solo OAuth.

### 2. Dashboard — selector de proyecto (`/dashboard`)
- Lista de proyectos GitHub del usuario autenticado
- Cards con nombre, última actualización, cantidad de items
- Click → navega a `/gantt/:projectId`

### 3. Vista Gantt (`/gantt/:projectId`)
- Header con nombre del proyecto + filtros (asignatura, status, assignee)
- Timeline con milestones automáticos detectados de los campos de fecha
- Barra lateral sticky con lista de tareas (nombre + assignees)
- Barras horizontales coloreadas por asignatura, fill de progreso por status
- Tooltips al hover con detalle completo
- Botón "Embed" que muestra el snippet `<iframe src="?embed=true&project=...">` listo para copiar
- Modo embed (`?embed=true`): sin header de autenticación, solo el Gantt. Requiere que el proyecto sea público.

### 4. Vista Métricas (`/metrics/:projectId`)
- **Burndown chart:** items cerrados acumulados vs. línea ideal
- **Velocidad:** items completados por semana (barras)
- **Donut de estados:** distribución actual de todos los items
- **Cards resumen:** total items, % completado, items en progreso, bloqueados (sin fecha)
- Todo con Recharts, paleta Eternum

---

## Comandos

```bash
# Instalar dependencias
bun install

# Dev (frontend + backend en paralelo)
bun run dev

# Solo frontend (Vite)
bun run dev:client

# Solo backend (Bun server con --watch)
bun run dev:server

# Build
bun run build

# Producción
bun run start

# Linting
bunx oxlint src/

# Agregar componente Shadcn
bunx shadcn@latest add <component>
```

### `package.json` scripts esperados
```json
{
  "scripts": {
    "dev": "concurrently \"bun run dev:client\" \"bun run dev:server\"",
    "dev:client": "vite",
    "dev:server": "bun --watch src/server/index.ts",
    "build": "vite build",
    "start": "bun src/server/index.ts",
    "lint": "bunx oxlint src/"
  }
}
```

---

## Variables de entorno

### `.env.example`
```bash
# GitHub OAuth App credentials
# Crear en: github.com/settings/developers → OAuth Apps
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Secreto para firmar cookies de sesión (mínimo 32 chars, aleatorio)
SESSION_SECRET=

# Puerto del servidor Bun
PORT=3000

# URL pública de la app (sin trailing slash)
# En dev: http://localhost:5173
# En prod: https://gantt.eternum.lat (o donde se deploya)
VITE_APP_URL=http://localhost:5173
```

**Nunca commitear `.env`. Agregar a `.gitignore`.**

---

## Seguridad — checklist

- [ ] Token GitHub nunca en cliente ni en logs del servidor
- [ ] Cookie `session_id`: `HttpOnly`, `SameSite=Strict`, `Secure` en producción
- [ ] CSRF: validar `state` en el callback OAuth (firmado con `SESSION_SECRET`)
- [ ] Sesiones con TTL de 8 horas, limpieza periódica del Map
- [ ] Rate limiting básico en `/api/github` (max 100 req/min por sesión)
- [ ] El modo embed solo funciona para proyectos públicos (validar con la API antes de servir)
- [ ] Headers de seguridad en el servidor: `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN` (excepto en modo embed), `Content-Security-Policy`
- [ ] `.env` en `.gitignore` desde el commit inicial

---

## Convenciones de código

### TypeScript
- `strict: true` en `tsconfig.json`
- Sin `any` explícito. Usar `unknown` + type guards cuando sea necesario
- Types antes que interfaces para tipos de datos, interfaces para contratos de componentes
- Exports nombrados siempre. Sin `export default` en módulos de lib. `export default` solo en componentes React (convención de React Router)

### Componentes React
```tsx
// Estructura esperada de un componente
import { type FC } from 'react'
import { LucideIcon } from 'lucide-react'

type Props = {
  title: string
  icon?: LucideIcon
}

export default function MiComponente({ title, icon: Icon }: Props) {
  return (
    <div className="...">
      {Icon && <Icon size={16} />}
      <span>{title}</span>
    </div>
  )
}
```

### Fetch al proxy
```typescript
// src/client/lib/github.ts
export async function githubQuery<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch('/api/github', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',   // ← siempre, para enviar la cookie
    body: JSON.stringify({ query, variables }),
  })

  if (res.status === 401) {
    window.location.href = '/'
    throw new Error('Session expired')
  }

  if (!res.ok) throw new Error(`GraphQL proxy error: ${res.status}`)
  return res.json() as Promise<T>
}
```

### TanStack Query
```typescript
// src/client/hooks/useProject.ts
import { useQuery } from '@tanstack/react-query'
import { githubQuery } from '@/lib/github'

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => githubQuery(GET_PROJECT_ITEMS, { projectId }),
    staleTime: 1000 * 60 * 5,   // 5 minutos
    retry: 1,
  })
}
```

---

## Lo que Claude NO debe hacer en este proyecto

- No usar `npm`, `npx`, `yarn`, `pnpm`. Solo `bun`.
- No usar `Express`, `Hono`, `Fastify` ni ningún framework HTTP. Solo `Bun.serve()`.
- No usar `date-fns`, `moment`, `dayjs`. Fechas con `Intl` y operaciones nativas.
- No usar `axios`. Solo `fetch` nativo con `credentials: 'include'`.
- No usar `ESLint` ni `Prettier`. Solo `oxlint` y `biome`/`oxfmt`.
- No usar `Inter`, `Roboto`, ni `system-ui` como fuente. Solo DM Sans / DM Mono / DM Serif Display.
- No agregar animaciones en cada interacción. Motion solo en momentos de alto impacto.
- No exponer el token de GitHub al cliente bajo ninguna circunstancia.
- No usar `localStorage` para datos de sesión o autenticación.
- No sugerir tecnologías fuera de este stack salvo que Faku lo pida explícitamente.

---

## Contexto del autor

- **Faku**, 19 años, Montevideo, Uruguay
- Fundador de WeFaber y Equipo Eternum
- Esta herramienta nació para el proyecto de egreso SGRSI (BT Informática 2026, ITI CETP) pero está diseñada para ser pública y multi-proyecto
- Estilo de trabajo: propone, Claude analiza tensiones y tradeoffs antes de ejecutar. No se avanza sin confirmación de dirección.
- Tono técnico directo. Sin endulzar. Sin em dashes.
- Terminología técnica en inglés, sin traducir.
