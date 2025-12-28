// server.js - ZERO MEGA 2.0.5 - Dashboard Neon Avanzado
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = "2.0.5 PLUS ++++ OMEGA";

// Importar el bot
const { client } = require('./index.js');

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

// Configuración
const config = {
  token: process.env.DISCORD_TOKEN || "",
  prefix: "."
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

  // Cargar estadísticas de reviews.json
  let stats = {
    totalUsers: 0,
    totalReviews: 0,
    avgRating: "0.00",
    topUsers: [],
    reviewsByRole: {}
  };

  try {
    if (fs.existsSync('reviews.json')) {
      const data = JSON.parse(fs.readFileSync('reviews.json', 'utf8'));
      const users = Object.values(data);
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
    }
  } catch (error) {
    console.error('Error cargando estadísticas:', error.message);
  }

  // HTML con diseño neon
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ZERO MEGA ${VERSION}</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;600&display=swap');
        
        :root {
          --neon-blue: #00f3ff;
          --neon-purple: #b967ff;
          --neon-pink: #ff00ff;
          --neon-green: #00ff9d;
          --dark-bg: #0a0a0f;
          --darker-bg: #050508;
          --card-bg: rgba(20, 20, 40, 0.7);
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          background: var(--dark-bg);
          background-image: 
            radial-gradient(circle at 10% 20%, rgba(0, 243, 255, 0.05) 0%, transparent 20%),
            radial-gradient(circle at 90% 80%, rgba(185, 103, 255, 0.05) 0%, transparent 20%);
          color: white;
          font-family: 'Exo 2', sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }
        
        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }
        
        /* Header Neon */
        .header {
          text-align: center;
          padding: 40px 20px;
          background: linear-gradient(135deg, 
            rgba(0, 243, 255, 0.1) 0%, 
            rgba(185, 103, 255, 0.1) 50%, 
            rgba(255, 0, 255, 0.1) 100%);
          border-radius: 25px;
          margin-bottom: 40px;
          border: 1px solid rgba(0, 243, 255, 0.2);
          position: relative;
          overflow: hidden;
        }
        
        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(0, 243, 255, 0.1) 0%, transparent 70%);
          animation: pulse 15s infinite linear;
        }
        
        @keyframes pulse {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .title {
          font-family: 'Orbitron', sans-serif;
          font-size: 4rem;
          font-weight: 900;
          background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple), var(--neon-pink));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin-bottom: 10px;
          text-shadow: 0 0 30px rgba(0, 243, 255, 0.5);
          letter-spacing: 2px;
        }
        
        .subtitle {
          font-size: 1.3rem;
          color: #a0a0ff;
          margin-bottom: 30px;
          font-weight: 300;
        }
        
        .version-badge {
          display: inline-block;
          background: linear-gradient(45deg, var(--neon-blue), var(--neon-green));
          padding: 8px 20px;
          border-radius: 50px;
          font-weight: 700;
          font-size: 1.1rem;
          box-shadow: 0 0 20px rgba(0, 243, 255, 0.4);
          margin-bottom: 20px;
          animation: glow 2s infinite alternate;
        }
        
        @keyframes glow {
          0% { box-shadow: 0 0 20px rgba(0, 243, 255, 0.4); }
          100% { box-shadow: 0 0 30px rgba(0, 243, 255, 0.7), 0 0 40px rgba(185, 103, 255, 0.4); }
        }
        
        .status {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 30px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 50px;
          border: 2px solid ${botStatus.isReady ? 'var(--neon-green)' : '#ff3333'};
          font-size: 1.1rem;
          font-weight: 600;
          backdrop-filter: blur(10px);
        }
        
        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: ${botStatus.isReady ? 'var(--neon-green)' : '#ff3333'};
          box-shadow: 0 0 15px ${botStatus.isReady ? 'var(--neon-green)' : '#ff3333'};
          animation: blink 1.5s infinite;
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 25px;
          margin-bottom: 40px;
        }
        
        .stat-card {
          background: var(--card-bg);
          border-radius: 20px;
          padding: 25px;
          border: 1px solid rgba(0, 243, 255, 0.1);
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          position: relative;
          overflow: hidden;
        }
        
        .stat-card:hover {
          transform: translateY(-5px);
          border-color: var(--neon-blue);
          box-shadow: 0 10px 30px rgba(0, 243, 255, 0.2);
        }
        
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--neon-blue), var(--neon-purple));
        }
        
        .stat-value {
          font-size: 3rem;
          font-weight: 700;
          background: linear-gradient(45deg, var(--neon-blue), var(--neon-green));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin-bottom: 10px;
          font-family: 'Orbitron', sans-serif;
        }
        
        .stat-label {
          color: #a0a0ff;
          font-size: 1rem;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        /* Features */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin: 30px 0;
        }
        
        .feature {
          background: rgba(30, 30, 60, 0.5);
          padding: 20px;
          border-radius: 15px;
          border-left: 4px solid var(--neon-blue);
          transition: all 0.3s ease;
        }
        
        .feature:hover {
          background: rgba(40, 40, 80, 0.7);
          transform: translateX(5px);
        }
        
        .feature-icon {
          color: var(--neon-blue);
          font-size: 1.5rem;
          margin-bottom: 10px;
        }
        
        /* Updates */
        .updates {
          background: linear-gradient(135deg, rgba(0, 243, 255, 0.1), rgba(185, 103, 255, 0.1));
          padding: 30px;
          border-radius: 20px;
          margin: 40px 0;
          border: 1px solid rgba(0, 243, 255, 0.2);
        }
        
        .update-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
          margin-bottom: 10px;
          border-left: 3px solid var(--neon-green);
        }
        
        .update-date {
          color: var(--neon-green);
          font-weight: 600;
          min-width: 100px;
        }
        
        /* Footer */
        .footer {
          text-align: center;
          padding: 30px;
          margin-top: 50px;
          border-top: 1px solid rgba(0, 243, 255, 0.2);
          color: #8899aa;
        }
        
        .developer {
          color: var(--neon-blue);
          font-weight: 600;
        }
        
        .social-links {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 20px;
        }
        
        .social-link {
          color: var(--neon-purple);
          font-size: 1.2rem;
          transition: all 0.3s ease;
        }
        
        .social-link:hover {
          color: var(--neon-blue);
          transform: scale(1.2);
        }
        
        /* Responsive */
        @media (max-width: 768px) {
          .title { font-size: 2.5rem; }
          .stats-grid { grid-template-columns: 1fr; }
          .features-grid { grid-template-columns: 1fr; }
        }
        
        /* Progress Bar */
        .progress-bar {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin-top: 10px;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--neon-blue), var(--neon-purple));
          border-radius: 4px;
          transition: width 1s ease;
        }
        
        /* Neon Text */
        .neon-text {
          text-shadow: 
            0 0 10px currentColor,
            0 0 20px currentColor,
            0 0 40px currentColor;
        }
        
        .neon-blue { color: var(--neon-blue); }
        .neon-purple { color: var(--neon-purple); }
        .neon-pink { color: var(--neon-pink); }
        .neon-green { color: var(--neon-green); }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="version-badge">${VERSION}</div>
          <h1 class="title">ZERO MEGA</h1>
          <div class="subtitle">Sistema de Reseñas Ultra Avanzado</div>
          
          <div class="status">
            <div class="status-dot"></div>
            <span>${botStatus.isReady ? '🟢 EN LÍNEA' : '🔴 DESCONECTADO'}</span>
          </div>
        </div>
        
        <!-- Estadísticas principales -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label"><i class="fas fa-robot"></i> Estado del Bot</div>
            <div class="stat-value">${botStatus.isReady ? 'ONLINE' : 'OFFLINE'}</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${botStatus.isReady ? '100' : '0'}%"></div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-label"><i class="fas fa-clock"></i> Tiempo Activo</div>
            <div class="stat-value">${days}d ${hours}h ${minutes}m</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min((uptime / 86400) * 100, 100)}%"></div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-label"><i class="fas fa-server"></i> Servidores</div>
            <div class="stat-value">${botStatus.guildCount}</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min((botStatus.guildCount / 10) * 100, 100)}%"></div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-label"><i class="fas fa-star"></i> Reseñas Totales</div>
            <div class="stat-value">${stats.totalReviews}</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min((stats.totalReviews / 1000) * 100, 100)}%"></div>
            </div>
          </div>
        </div>
        
        <!-- Estadísticas detalladas -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label"><i class="fas fa-users"></i> Usuarios Registrados</div>
            <div class="stat-value">${stats.totalUsers}</div>
            <div>En base de datos</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-label"><i class="fas fa-chart-line"></i> Calificación Promedio</div>
            <div class="stat-value">${stats.avgRating}<span style="font-size: 1.5rem; color: var(--neon-blue);">/5</span></div>
            <div>De todas las reseñas</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-label"><i class="fas fa-crown"></i> Usuario Destacado</div>
            <div class="stat-value" style="font-size: 2rem;">${stats.topUsers[0]?.name || 'N/A'}</div>
            <div>${stats.topUsers[0]?.reviews || 0} reseñas ⭐ ${stats.topUsers[0]?.avg || '0.00'}</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-label"><i class="fas fa-sync-alt"></i> Última Actualización</div>
            <div class="stat-value" style="font-size: 2rem;">${botStatus.lastUpdate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            <div>${botStatus.lastUpdate.toLocaleDateString()}</div>
          </div>
        </div>
        
        <!-- Características -->
        <h2 style="margin: 40px 0 20px; color: var(--neon-blue); font-family: 'Orbitron';">
          <i class="fas fa-bolt"></i> Características Principales
        </h2>
        <div class="features-grid">
          ${botStatus.features.map((feature, i) => `
            <div class="feature">
              <div class="feature-icon">
                <i class="fas fa-${i === 0 ? 'balance-scale' : i === 1 ? 'trophy' : i === 2 ? 'desktop' : i === 3 ? 'shield-alt' : i === 4 ? 'chart-bar' : i === 5 ? 'store' : i === 6 ? 'flag' : 'users'}"></i>
              </div>
              <div style="font-weight: 600; margin-bottom: 5px;">${feature}</div>
              <div style="font-size: 0.9rem; color: #a0a0ff;">Sistema optimizado y sin errores</div>
            </div>
          `).join('')}
        </div>
        
        <!-- Actualizaciones -->
        <div class="updates">
          <h2 style="margin-bottom: 20px; color: var(--neon-green);">
            <i class="fas fa-code-branch"></i> Historial de Actualizaciones
          </h2>
          ${botStatus.updates.map(update => `
            <div class="update-item">
              <div class="update-date">${update.date}</div>
              <div>
                <div style="font-weight: 600; color: white;">${update.title}</div>
                <div style="color: #a0a0ff; font-size: 0.9rem;">${update.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
        
        <!-- Comandos -->
        <div style="background: var(--card-bg); padding: 30px; border-radius: 20px; margin: 40px 0;">
          <h2 style="margin-bottom: 20px; color: var(--neon-purple);">
            <i class="fas fa-terminal"></i> Comandos Disponibles
          </h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; border-left: 3px solid var(--neon-blue);">
              <div style="font-weight: 600; color: var(--neon-blue);">.perfil @usuario</div>
              <div style="color: #a0a0ff; font-size: 0.9rem;">Ver perfil completo con estadísticas</div>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; border-left: 3px solid var(--neon-purple);">
              <div style="font-weight: 600; color: var(--neon-purple);">.top [stars/reviews]</div>
              <div style="color: #a0a0ff; font-size: 0.9rem;">Top 10 usuarios por estrellas o reseñas</div>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; border-left: 3px solid var(--neon-pink);">
              <div style="font-weight: 600; color: var(--neon-pink);">.estadisticas staff</div>
              <div style="color: #a0a0ff; font-size: 0.9rem;">Estadísticas por rol específico</div>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; border-left: 3px solid var(--neon-green);">
              <div style="font-weight: 600; color: var(--neon-green);">.logros @usuario</div>
              <div style="color: #a0a0ff; font-size: 0.9rem;">Ver logros y medallas</div>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div style="font-size: 1.2rem; margin-bottom: 10px;">
            <span class="developer">ZERO MEGA ${VERSION}</span>
          </div>
          <div style="color: #8899aa; margin-bottom: 20px;">
            Sistema de Reseñas Ultra Avanzado • Sin errores • Optimizado
          </div>
          <div class="social-links">
            <a href="#" class="social-link"><i class="fab fa-discord"></i></a>
            <a href="#" class="social-link"><i class="fab fa-github"></i></a>
            <a href="#" class="social-link"><i class="fas fa-globe"></i></a>
          </div>
          <div style="margin-top: 20px; font-size: 0.9rem; color: #667788;">
            <div>👑 Developer: <span class="developer">ultra3_dev</span></div>
            <div>💡 Ideas: <span class="developer">samuu.zlp</span></div>
            <div>🧪 Testers: samuu.zlp, ultra3_dev, marco_izx.</div>
            <div style="margin-top: 10px;">🚀 Hosteado en Render • Actualizado: ${new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>
      
      <script>
        // Actualizar tiempo en vivo
        function updateUptime() {
          const uptimeElement = document.querySelector('.stat-card:nth-child(2) .stat-value');
          if (uptimeElement && ${botStatus.isReady}) {
            const startTime = ${botStatus.startTime ? botStatus.startTime.getTime() : Date.now()};
            const now = Date.now();
            const diff = now - startTime;
            
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            uptimeElement.textContent = days + 'd ' + hours + 'h ' + minutes + 'm';
          }
        }
        
        // Actualizar cada segundo
        setInterval(updateUptime, 1000);
        
        // Efectos de hover para tarjetas
        document.querySelectorAll('.stat-card').forEach(card => {
          card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
          });
          
          card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
          });
        });
        
        // Health check automático
        setInterval(() => {
          fetch('/health')
            .then(response => response.json())
            .then(data => {
              console.log('✅ Health check:', new Date().toLocaleTimeString());
              if (!data.bot || data.bot !== 'online') {
                location.reload();
              }
            })
            .catch(err => console.log('⚠️ Health check falló:', err));
        }, 30000);
        
        // Efecto de escritura para el título
        const title = document.querySelector('.title');
        const originalText = title.textContent;
        let charIndex = 0;
        
        function typeWriter() {
          if (charIndex < originalText.length) {
            title.textContent = originalText.substring(0, charIndex + 1);
            charIndex++;
            setTimeout(typeWriter, 100);
          }
        }
        
        // Iniciar efecto después de cargar
        window.addEventListener('load', () => {
          setTimeout(typeWriter, 1000);
        });
      </script>
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
    if (fs.existsSync('reviews.json')) {
      const data = JSON.parse(fs.readFileSync('reviews.json', 'utf8'));
      const users = Object.values(data);
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
    }
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
    client.login(config.token).catch(error => {
      console.error('❌ Error iniciando bot:', error.message);
    });
  } else {
    console.warn('⚠️  Token no configurado. Bot en modo web-only.');
  }
});

// Actualizar estado del bot
client.once('ready', () => {
  console.log(`✅ Bot: ${client.user.tag}`);
  console.log(`✅ ZERO MEGA ${VERSION} ACTIVO`);
  
  updateBotStatus({
    isReady: true,
    startTime: new Date(),
    guildCount: client.guilds.cache.size,
    userCount: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
  });
  
  // Contar reseñas
  try {
    if (fs.existsSync('reviews.json')) {
      const data = JSON.parse(fs.readFileSync('reviews.json', 'utf8'));
      const users = Object.values(data);
      updateBotStatus({
        reviewsCount: users.reduce((acc, user) => acc + (user.reviews?.length || 0), 0)
      });
    }
  } catch (error) {
    console.error('Error contando reseñas:', error);
  }
  
  client.user.setActivity(`${config.prefix}perfil | v${VERSION}`, { type: "LISTENING" });
});

// Exportar para index.js
module.exports = { app, server, updateBotStatus, botStatus };
