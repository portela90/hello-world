# Team Manager

Aplicación multiplataforma (web, móvil y tablet) para la gestión de equipos: tareas asignadas, fichajes y documentación.

## Stack

- **Expo (React Native)** — una sola base de código para iOS, Android y web.
- **Supabase** — autenticación, base de datos Postgres y almacenamiento de archivos.

## Funcionalidades

- Gestión de equipos (crear equipo, unirse, ver miembros).
- Tareas asignadas por equipo con estado (pendiente / en progreso / hecha).
- Fichajes de entrada y salida con historial.
- Gestión documental: subir, listar y descargar documentos por equipo.

## Configuración

1. Crea un proyecto en [Supabase](https://supabase.com).
2. Ejecuta el contenido de `supabase/schema.sql` en el SQL editor del proyecto.
3. Crea un bucket de Storage llamado `documents` (puede ser privado).
4. Copia `.env.example` a `.env` y rellena `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` con los valores de tu proyecto.
5. Instala dependencias:

   ```bash
   npm install
   ```

6. Arranca la app:

   ```bash
   npm run start   # abre el menú de Expo (web / iOS / Android)
   npm run web      # solo web
   npm run ios      # solo iOS (requiere macOS/simulador)
   npm run android  # solo Android (requiere emulador/dispositivo)
   ```

## Estructura

```
App.tsx                     punto de entrada
src/lib/supabase.ts          cliente de Supabase
src/contexts/                contexto de sesión y de equipo activo
src/screens/                 pantallas: Login, Equipos, Tareas, Fichajes, Documentos
src/navigation/RootNavigator pestañas principales de la app
supabase/schema.sql          esquema de base de datos y políticas RLS
```
