# Despliegue web (frontend + API Flask)

## Cambios ya aplicados en este repositorio

1. **Backend listo para entornos cloud**
   - `backend/app.py` ahora:
     - escucha por `0.0.0.0` en lugar de localhost.
     - usa `PORT` del entorno.
     - usa `FLASK_DEBUG` para evitar debug hardcodeado en producción.
     - permite configurar CORS con `CORS_ALLOWED_ORIGINS`.

2. **Frontend sin URL local hardcodeada**
   - `frontend/ui/diseño.ui.js` ya no consume `http://127.0.0.1:5000/calcular` fijo.
   - ahora usa `window.CALCULADORA_API_BASE_URL` si existe.
   - si no existe, usa ruta relativa (`/calcular`) para desplegar frontend y backend en el mismo dominio.

3. **Archivos de despliegue agregados**
   - `requirements.txt` con dependencias de runtime.
   - `Procfile` para ejecutar con gunicorn en plataformas tipo Render/Railway/Heroku.

## Variables de entorno recomendadas

- `PORT` (la define la plataforma)
- `FLASK_DEBUG=false`
- `CORS_ALLOWED_ORIGINS=https://tu-frontend.com`
- `CALCULADORA_API_BASE_URL=https://tu-api.com` *(solo si frontend y backend estarán en dominios distintos)*

## Estrategias recomendadas

### Opción A: un solo servicio (simple)
- Servir frontend estático y Flask en el mismo dominio.
- Ventaja: no necesitas configurar `CALCULADORA_API_BASE_URL` ni CORS especial.

### Opción B: frontend y backend separados
- Frontend en Vercel/Netlify + API Flask en Render/Railway.
- Debes:
  1. configurar `window.CALCULADORA_API_BASE_URL` en el frontend.
  2. limitar CORS con `CORS_ALLOWED_ORIGINS` al dominio frontend.

## Verificación post-despliegue

1. `POST /calcular` responde 200 con un caso básico.
2. El navegador no muestra errores de CORS.
3. La tabla de perfiles carga archivos Excel en runtime (`perfiles/*.xlsx`).
4. Los diagramas base64 se renderizan en la UI.
