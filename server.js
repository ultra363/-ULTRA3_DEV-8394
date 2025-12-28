// server.js - ZERO MEGA 2.0.5 - Dashboard Neon Avanzado CORREGIDO
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = "2.0.5 PLUS ++++ OMEGA";

// Importar el bot
const { client, db, config, logger } = require('./index.js');

// Variables de estado global
const botStatus = {
  isReady: false,
  startTime: null,
  uptime: 0,
  guildCount: 0,
  userCount: 0,
  reviewsCount: 0,
  lastUpdate: new Date(),
  version: VERSION,
  features: [
    "Sistema de Reseñas Balanceado",
    "Logros por Rol Específico",
    "Dashboard Web Neon",
    "Anti-Cuentas Falsas",
    "Top 10 Personalizable",
    "Estadísticas Play Store",
    "Sistema de Reportes",
    "Reseñas Múltiples Roles"
  ],
  updates: [
    { date: "2024-01-15", title: "Versión 2.0.5", desc: "Dashboard Neon y correcciones" },
    { date: "2024-01-10", title: "Versión 2.0.4", desc: "Bug fixes y mejoras" },
    { date: "2024-01-05", title: "Versión 2.0.3", desc: "Sistema de logros mejorado" }
  ]
};

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Actualizar estado del bot
function updateBotStatus(status) {
  Object.assign(botStatus, status);
  botStatus.lastUpdate = new Date();
}

// Ruta principal - Dashboard Neon
app.get('/', (req, res) => {
  const uptime = botStatus.startTime ? Math.floor((Date.now() - botStatus.startTime) / 1000) : 0;
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;

  // Cargar estadísticas usando la base de datos importada
  let stats = {
    totalUsers: 0,
    totalReviews: 0,
    avgRating: "0.00",
    topUsers: [],
    reviewsByRole: {}
  };

  try {
    // Usar la base de datos importada en lugar de leer directamente el archivo
    const allData = db.getAll();
    const users = Object.values(allData);
    stats.totalUsers = users.length;
    stats.totalReviews = users.reduce((acc, user) => acc + (user.reviews?.length || 0), 0);
    
    // Calcular promedio
    let totalRating = 0;
    let reviewCount = 0;
    users.forEach(user => {
      if (user.reviews) {
        user.reviews.forEach(review => {
          totalRating += review.rating || 0;
          reviewCount++;
        });
      }
    });
    stats.avgRating = reviewCount > 0 ? (totalRating / reviewCount).toFixed(2) : "0.00";

    // Top 3 usuarios
    stats.topUsers = users
      .filter(u => u.reviews?.length > 0)
      .sort((a, b) => b.reviews.length - a.reviews.length)
      .slice(0, 3)
      .map(u => ({
        name: u.name || "Unknown",
        reviews: u.reviews.length,
        avg: u.reviews.length > 0 ? 
          (u.reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / u.reviews.length).toFixed(2) : "0.00"
      }));
  } catch (error) {
    console.error('Error cargando estadísticas:', error.message);
  }

  // HTML con diseño neon (igual que antes, sin cambios)
  // ... (todo el HTML permanece igual)
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ZERO MEGA ${VERSION}</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
        /* ... (todo el CSS permanece igual) ... */
      </style>
    </head>
    <body>
      <!-- ... (todo el HTML permanece igual) ... -->
    </body>
    </html>
  `);
});

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    bot: botStatus.isReady ? 'online' : 'offline',
    version: VERSION,
    timestamp: new Date().toISOString(),
    uptime: botStatus.startTime ? Date.now() - botStatus.startTime : 0,
    guilds: botStatus.guildCount,
    reviews: botStatus.reviewsCount
  });
});

// Ruta para backup
app.get('/backup', (req, res) => {
  if (fs.existsSync('reviews.json')) {
    res.download('reviews.json', `zero-mega-backup-${Date.now()}.json`);
  } else {
    res.status(404).json({ error: 'No hay datos para backup' });
  }
});

// Ruta de estadísticas API
app.get('/api/stats', (req, res) => {
  let stats = {
    totalUsers: 0,
    totalReviews: 0,
    avgRating: 0
  };
  
  try {
    // Usar la base de datos importada
    const allData = db.getAll();
    const users = Object.values(allData);
    stats.totalUsers = users.length;
    stats.totalReviews = users.reduce((acc, user) => acc + (user.reviews?.length || 0), 0);
    
    let totalRating = 0;
    let reviewCount = 0;
    users.forEach(user => {
      if (user.reviews) {
        user.reviews.forEach(review => {
          totalRating += review.rating || 0;
          reviewCount++;
        });
      }
    });
    stats.avgRating = reviewCount > 0 ? (totalRating / reviewCount).toFixed(2) : "0.00";
  } catch (error) {
    console.error('Error API stats:', error);
  }
  
  res.json({
    ...stats,
    botStatus: {
      isReady: botStatus.isReady,
      uptime: botStatus.startTime ? Date.now() - botStatus.startTime : 0,
      version: VERSION
    }
  });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 ZERO MEGA ${VERSION} - Dashboard iniciado`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`📈 API Stats: http://localhost:${PORT}/api/stats`);
  
  // Iniciar bot si hay token
  if (config.token && config.token !== "" && config.token !== "tu_token_aqui") {
    if (client && !client.isReady()) {
      client.login(config.token).catch(error => {
        console.error('❌ Error iniciando bot:', error.message);
      });
    }
  } else {
    console.warn('⚠️  Token no configurado. Bot en modo web-only.');
  }
});

// Actualizar estado del bot cuando esté listo
if (client) {
  client.once('ready', () => {
    console.log(`✅ Bot: ${client.user.tag}`);
    console.log(`✅ ZERO MEGA ${VERSION} ACTIVO`);
    
    updateBotStatus({
      isReady: true,
      startTime: new Date(),
      guildCount: client.guilds.cache.size,
      userCount: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
    });
    
    // Contar reseñas usando la base de datos
    try {
      const allData = db.getAll();
      const users = Object.values(allData);
      updateBotStatus({
        reviewsCount: users.reduce((acc, user) => acc + (user.reviews?.length || 0), 0)
      });
    } catch (error) {
      console.error('Error contando reseñas:', error);
    }
    
    if (client.user) {
      client.user.setActivity(`${config.prefix}perfil | v${VERSION}`, { type: "LISTENING" });
    }
  });
}

module.exports = { app, server, updateBotStatus, botStatus };
