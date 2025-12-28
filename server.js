// server.js - Servidor web para Render
const express = require('express');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Importar el bot principal
const { client } = require('./index.js');

// Variables de estado del bot
let botStatus = {
  isReady: false,
  startTime: null,
  uptime: 0,
  guildCount: 0,
  userCount: 0,
  reviewsCount: 0
};

// Configuración del bot
const config = {
  token: process.env.DISCORD_TOKEN || "",
  prefix: "."
};

// Eventos del bot
client.once('ready', () => {
  console.log(`✅ Bot conectado como: ${client.user.tag}`);
  console.log(`✅ ZERO MEGA 2.0.4 PLUS ++++ OMEGA ACTIVO`);
  
  botStatus.isReady = true;
  botStatus.startTime = new Date();
  botStatus.guildCount = client.guilds.cache.size;
  botStatus.userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  
  // Contar reseñas
  try {
    const reviews = JSON.parse(fs.readFileSync('reviews.json', 'utf8'));
    botStatus.reviewsCount = Object.values(reviews).reduce((acc, user) => 
      acc + (user.reviews ? user.reviews.length : 0), 0);
  } catch (e) {
    botStatus.reviewsCount = 0;
  }
  
  // Actividad del bot
  client.user.setActivity(`${config.prefix}perfil | /perfil`, { type: "LISTENING" });
  
  // Actualizar tiempo activo cada minuto
  setInterval(() => {
    if (botStatus.startTime) {
      botStatus.uptime = Date.now() - botStatus.startTime;
    }
  }, 60000);
});

client.on('error', (error) => {
  console.error('❌ Error del cliente Discord:', error);
  botStatus.lastError = error.message;
});

// Middleware básico
app.use(express.json());
app.use(express.static('public'));

// Rutas del servidor web
app.get('/', (req, res) => {
  const uptime = botStatus.startTime ? Math.floor((Date.now() - botStatus.startTime) / 1000) : 0;
  
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  
  const statusColor = botStatus.isReady ? '#10b981' : '#ef4444';
  const statusText = botStatus.isReady ? '🟢 EN LÍNEA' : '🔴 DESCONECTADO';
  const statusIcon = botStatus.isReady ? '✅' : '❌';
  
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ZERO MEGA 2.0.4 PLUS ++++ OMEGA</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        
        .container {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          max-width: 800px;
          width: 100%;
        }
        
        .header {
          background: linear-gradient(90deg, #4f46e5, #7c3aed);
          color: white;
          padding: 30px;
          text-align: center;
        }
        
        .title {
          font-size: 2.5rem;
          font-weight: 900;
          margin-bottom: 10px;
        }
        
        .subtitle {
          font-size: 1.1rem;
          opacity: 0.9;
          margin-bottom: 20px;
        }
        
        .status {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.2);
          padding: 10px 20px;
          border-radius: 50px;
          font-weight: 600;
        }
        
        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: ${statusColor};
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .content {
          padding: 30px;
        }
        
        .stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }
        
        @media (max-width: 600px) {
          .stats { grid-template-columns: 1fr; }
        }
        
        .stat-card {
          background: #f8fafc;
          border-radius: 15px;
          padding: 20px;
          text-align: center;
          border: 1px solid #e2e8f0;
        }
        
        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: #4f46e5;
          margin-bottom: 5px;
        }
        
        .stat-label {
          color: #64748b;
          font-size: 0.9rem;
        }
        
        .info-box {
          background: #f8fafc;
          border-radius: 15px;
          padding: 25px;
          margin-bottom: 20px;
          border: 1px solid #e2e8f0;
        }
        
        .info-title {
          color: #1e293b;
          font-size: 1.3rem;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
          margin-top: 10px;
        }
        
        .feature {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          color: #475569;
        }
        
        .commands {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
          margin-top: 15px;
        }
        
        .command {
          background: white;
          padding: 12px;
          border-radius: 10px;
          border-left: 4px solid #4f46e5;
        }
        
        .command-name {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 5px;
        }
        
        .command-desc {
          color: #64748b;
          font-size: 0.85rem;
        }
        
        .footer {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
          font-size: 0.9rem;
        }
        
        .heart {
          color: #ef4444;
          animation: heartbeat 1.5s infinite;
        }
        
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      </style>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="title">ZERO MEGA 2.0.4</h1>
          <div class="subtitle">PLUS ++++ OMEGA - Sistema de Reseñas Ultra Avanzado</div>
          
          <div class="status">
            <div class="status-dot"></div>
            <span>${statusIcon} ${statusText}</span>
          </div>
        </div>
        
        <div class="content">
          <div class="stats">
            <div class="stat-card">
              <div class="stat-value">${botStatus.isReady ? 'ONLINE' : 'OFFLINE'}</div>
              <div class="stat-label">Estado del Bot</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-value">${hours}h ${minutes}m ${seconds}s</div>
              <div class="stat-label">Tiempo Activo</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-value">${botStatus.guildCount}</div>
              <div class="stat-label">Servidores</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-value">${botStatus.reviewsCount}</div>
              <div class="stat-label">Reseñas Totales</div>
            </div>
          </div>
          
          <div class="info-box">
            <h2 class="info-title"><i class="fas fa-star"></i> Características</h2>
            <div class="features">
              <div class="feature">
                <i class="fas fa-check-circle" style="color: #10b981;"></i>
                <span>Sistema de Reseñas Balanceado</span>
              </div>
              <div class="feature">
                <i class="fas fa-trophy" style="color: #f59e0b;"></i>
                <span>Logros por Rol</span>
              </div>
              <div class="feature">
                <i class="fas fa-chart-line" style="color: #3b82f6;"></i>
                <span>Estadísticas Detalladas</span>
              </div>
              <div class="feature">
                <i class="fas fa-shield-alt" style="color: #8b5cf6;"></i>
                <span>Anti-Cuentas Falsas</span>
              </div>
            </div>
          </div>
          
          <div class="info-box">
            <h2 class="info-title"><i class="fas fa-terminal"></i> Comandos Principales</h2>
            <div class="commands">
              <div class="command">
                <div class="command-name">.perfil @usuario</div>
                <div class="command-desc">Ver perfil completo</div>
              </div>
              <div class="command">
                <div class="command-name">.top [stars/reviews]</div>
                <div class="command-desc">Ranking de usuarios</div>
              </div>
              <div class="command">
                <div class="command-name">.estadisticas staff</div>
                <div class="command-desc">Estadísticas por rol</div>
              </div>
              <div class="command">
                <div class="command-name">.logros @usuario</div>
                <div class="command-desc">Ver logros</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>
            <i class="fas fa-code"></i> Desarrollado con <span class="heart">❤️</span> por ultra3_dev<br>
            <small>Versión 2.0.4 PLUS ++++ OMEGA | Hosteado en Render</small>
          </p>
        </div>
      </div>
      
      <script>
        // Actualizar tiempo activo cada segundo
        function updateUptime() {
          const uptimeElement = document.querySelector('.stat-card:nth-child(2) .stat-value');
          if (uptimeElement && ${botStatus.isReady}) {
            const currentUptime = ${botStatus.uptime} + (Date.now() - ${Date.now()});
            const hours = Math.floor(currentUptime / 3600000);
            const minutes = Math.floor((currentUptime % 3600000) / 60000);
            const seconds = Math.floor((currentUptime % 60000) / 1000);
            uptimeElement.textContent = hours + 'h ' + minutes + 'm ' + seconds + 's';
          }
        }
        
        setInterval(updateUptime, 1000);
        
        // Health check cada 5 minutos para mantener activo
        setInterval(() => {
          fetch('/health')
            .then(response => response.json())
            .then(data => {
              console.log('✅ Health check OK:', new Date().toLocaleTimeString());
            })
            .catch(err => console.log('⚠️ Health check error:', err));
        }, 300000);
      </script>
    </body>
    </html>
  `);
});

// Ruta de health check para Render
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    bot: botStatus.isReady ? 'online' : 'offline',
    timestamp: new Date().toISOString(),
    uptime: botStatus.startTime ? Date.now() - botStatus.startTime : 0,
    guilds: botStatus.guildCount,
    reviews: botStatus.reviewsCount
  });
});

// Ruta para backup de datos
app.get('/backup', (req, res) => {
  if (fs.existsSync('reviews.json')) {
    res.download('reviews.json', 'reviews-backup.json');
  } else {
    res.status(404).json({ error: 'No hay datos para backup' });
  }
});

// Iniciar el servidor web
const server = app.listen(PORT, () => {
  console.log(`🌐 Servidor web iniciado en el puerto ${PORT}`);
  console.log(`📊 Dashboard disponible en: http://localhost:${PORT}`);
  
  // Iniciar el bot de Discord si hay token
  if (config.token && config.token !== "") {
    client.login(config.token).catch(error => {
      console.error('❌ Error al iniciar el bot:', error.message);
    });
  } else {
    console.error('❌ No se encontró el token de Discord en las variables de entorno');
    console.log('ℹ️ Añade DISCORD_TOKEN en las variables de entorno de Render');
  }
});

// Manejo de cierre elegante
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM recibido. Cerrando servidor...');
  
  if (client && client.destroy) {
    client.destroy();
    console.log('👋 Bot de Discord desconectado');
  }
  
  server.close(() => {
    console.log('🛑 Servidor HTTP cerrado');
    process.exit(0);
  });
});
