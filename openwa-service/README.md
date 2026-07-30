# Microservicio Independiente de OpenWA (@open-wa/wa-automate) 24/7

Este microservicio ejecuta el motor de **OpenWA / WhatsApp Web** de manera continua las 24 horas del día. Se comunica de forma segura con la plataforma Next.js a través de una API REST protegida y WebSockets.

---

## 🚀 Opciones de Despliegue 24/7

### Opción A: Despliegue con Docker / Docker Compose (Recomendado en VPS - Ubuntu/Debian)

1. **Clonar o copiar esta carpeta en tu VPS:**
   ```bash
   cd openwa-service
   ```

2. **Crear archivo `.env`:**
   ```bash
   cp .env.example .env
   ```
   Edita la variable `NEXT_WEBHOOK_URL` con la URL de tu app en Next.js (ejemplo: `https://tu-app.com/api/whatsapp/openwa/webhook`).

3. **Iniciar el servicio con Docker Compose:**
   ```bash
   docker compose up -d --build
   ```

El servicio estará disponible en el puerto `8080` de tu VPS.

---

### Opción B: Ejecución en VPS con PM2 (Node.js Directo)

1. Instalar dependencias del sistema y Chromium:
   ```bash
   sudo apt update && sudo apt install -y chromium-browser
   ```
2. Instalar PM2 globalmente:
   ```bash
   npm install -g pm2
   ```
3. Instalar dependencias del proyecto:
   ```bash
   npm install
   ```
4. Iniciar con PM2:
   ```bash
   pm2 start index.js --name "openwa-whatsapp"
   pm2 save
   pm2 startup
   ```

---

### Opción C: Despliegue en Servidores en la Nube (Railway / Render / Cloud Run)

- Usa el `Dockerfile` incluido en esta carpeta.
- Configura las variables de entorno:
  - `PORT=8080`
  - `OPENWA_API_SECRET=sync_connect_openwa_secret_2026`
  - `NEXT_WEBHOOK_URL=https://tu-dominio-nextjs.com/api/whatsapp/openwa/webhook`

---

## 🔐 Seguridad y Autenticación

Todas las solicitudes REST hacia este microservicio deben incluir el encabezado de seguridad:
`x-openwa-api-key: tu_secreto_aqui`

---

## 📡 Endpoints de la API

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/health` | Healthcheck del servicio |
| `GET` | `/api/status` | Obtiene el estado actual (Conectado, Esperando QR, etc.) y batería |
| `GET` | `/api/qr` | Obtiene el último código QR en formato Data URL |
| `POST` | `/api/connect` | Inicia el proceso de vinculación y generación de QR |
| `POST` | `/api/disconnect` | Cierra la sesión de WhatsApp y limpia archivos temporales |
| `POST` | `/api/restart` | Reinicia el cliente de WhatsApp |
| `POST` | `/api/send-message` | Envía un mensaje de texto o archivo multimedia |
| `GET` | `/api/logs` | Devuelve los registros de actividad en tiempo real |
