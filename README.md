
```
Reinsercion
├─ .env.example
├─ backend
│  ├─ .dockerignore
│  ├─ .env
│  ├─ .env.example
│  ├─ Dockerfile
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ src
│  │  ├─ config
│  │  │  └─ env.ts
│  │  ├─ database
│  │  │  ├─ attendance.ts
│  │  │  ├─ audit.ts
│  │  │  ├─ auth.ts
│  │  │  ├─ courses.ts
│  │  │  ├─ documents.ts
│  │  │  ├─ enrollments.ts
│  │  │  ├─ grades.ts
│  │  │  ├─ import-jobs.ts
│  │  │  ├─ participants.ts
│  │  │  ├─ pool.ts
│  │  │  ├─ providers.ts
│  │  │  └─ sessions.ts
│  │  ├─ middleware
│  │  │  ├─ audit.ts
│  │  │  ├─ auth.ts
│  │  │  └─ error.ts
│  │  ├─ routes
│  │  │  ├─ attendance.ts
│  │  │  ├─ audit.ts
│  │  │  ├─ auth.ts
│  │  │  ├─ courses.ts
│  │  │  ├─ grades.ts
│  │  │  ├─ imports.ts
│  │  │  ├─ index.ts
│  │  │  ├─ providers.ts
│  │  │  ├─ reports.ts
│  │  │  └─ sessions.ts
│  │  ├─ server.ts
│  │  ├─ services
│  │  │  └─ report.ts
│  │  ├─ types
│  │  │  ├─ attendance.ts
│  │  │  ├─ auth.ts
│  │  │  ├─ courses.ts
│  │  │  ├─ grades.ts
│  │  │  ├─ imports.ts
│  │  │  └─ roles.ts
│  │  └─ utils
│  │     ├─ crypto.ts
│  │     ├─ csv.ts
│  │     ├─ database.ts
│  │     ├─ duration.ts
│  │     └─ jwt.ts
│  └─ tsconfig.json
├─ docker-compose.yml
├─ frontend
│  ├─ .dockerignore
│  ├─ .env.example
│  ├─ Dockerfile
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ logo.png
│  ├─ nginx.conf
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ postcss.config.js
│  ├─ src
│  │  ├─ App.tsx
│  │  ├─ components
│  │  │  ├─ layout
│  │  │  │  ├─ Sidebar.tsx
│  │  │  │  └─ Topbar.tsx
│  │  │  └─ ui.tsx
│  │  ├─ hooks
│  │  │  └─ AuthProvider.tsx
│  │  ├─ index.tsx
│  │  ├─ pages
│  │  │  ├─ AdminAuditoria.tsx
│  │  │  ├─ AdminCursos.tsx
│  │  │  ├─ AdminImportaciones.tsx
│  │  │  ├─ InstructorAsistencia.tsx
│  │  │  ├─ InstructorNotas.tsx
│  │  │  ├─ InstructorSesiones.tsx
│  │  │  ├─ Login.tsx
│  │  │  ├─ Perfil.tsx
│  │  │  └─ Reporteria.tsx
│  │  ├─ routes
│  │  │  └─ definitions.tsx
│  │  ├─ services
│  │  │  ├─ asistencias.ts
│  │  │  ├─ auth.ts
│  │  │  ├─ cursos.ts
│  │  │  ├─ http.ts
│  │  │  ├─ importaciones.ts
│  │  │  ├─ notas.ts
│  │  │  ├─ proveedores.ts
│  │  │  ├─ reportes.ts
│  │  │  └─ sesiones.ts
│  │  ├─ setupTests.ts
│  │  ├─ styles
│  │  │  └─ global.css
│  │  ├─ utils
│  │  │  └─ xlsx.ts
│  │  └─ vite-env.d.ts
│  ├─ tailwind.config.ts
│  ├─ tsconfig.json
│  └─ vite.config.ts
├─ package-lock.json
├─ package.json
└─ README.md

```