// server.js - ZERO MEGA 2.0.4 PLUS ++++ OMEGA
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración del bot
const config = {
  token: process.env.DISCORD_TOKEN || "",
  serverId: "1429925140661014742",
  prefix: "."
};

// Middleware básico
app.use(express.json());
app.use(express.static('public'));

// Crear cliente de Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

// Variables de estado
let botStatus = {
  isReady: false,
  startTime: null,
  uptime: 0,
  guildCount: 0,
  userCount: 0
};

// Cargar la lógica principal del bot
require('./index.js')(client);

// Eventos del bot
client.once('ready', () => {
  console.log(`✅ Bot conectado como: ${client.user.tag}`);
  console.log(`✅ ZERO MEGA 2.0.4 PLUS ++++ OMEGA ACTIVO`);
  
  botStatus.isReady = true;
  botStatus.startTime = new Date();
  botStatus.guildCount = client.guilds.cache.size;
  botStatus.userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  
  // Actividad del bot
  client.user.setActivity(`${config.prefix}perfil | /perfil`, { type: 4 }); // Type 4 is Custom Activity in v14
  
  // Log cada 5 minutos para mantener activo
  setInterval(() => {
    botStatus.uptime = Date.now() - botStatus.startTime;
    console.log(`🔄 Bot activo por: ${Math.floor(botStatus.uptime / 1000 / 60)} minutos`);
  }, 5 * 60 * 1000);
});

client.on('error', (error) => {
  console.error('❌ Error del cliente Discord:', error);
  botStatus.lastError = error.message;
});

// Rutas del servidor web
app.get('/', (req, res) => {
  const uptime = botStatus.startTime ? 
    Math.floor((Date.now() - botStatus.startTime) / 1000) : 0;
  
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ZERO MEGA 2.0.4 PLUS ++++ OMEGA</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
        .container { background: rgba(255, 255, 255, 0.95); border-radius: 20px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); overflow: hidden; max-width: 800px; width: 100%; animation: fadeIn 0.8s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .header { background: linear-gradient(90deg, #4f46e5, #7c3aed); color: white; padding: 40px; text-align: center; position: relative; overflow: hidden; }
        .title { font-size: 2.8rem; font-weight: 900; margin-bottom: 10px; position: relative; text-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); }
        .subtitle { font-size: 1.2rem; opacity: 0.9; font-weight: 300; margin-bottom: 20px; position: relative; }
        .status-indicator { display: inline-flex; align-items: center; gap: 10px; background: rgba(255, 255, 255, 0.2); padding: 12px 24px; border-radius: 50px; margin-top: 15px; backdrop-filter: blur(10px); border: 2px solid rgba(255, 255, 255, 0.3); }
        .status-dot { width: 12px; height: 12px; border-radius: 50%; animation: pulse 2s infinite; }
        .online { background: #10b981; }
        .offline { background: #ef4444; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .content { padding: 40px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .stat-card { background: white; border-radius: 15px; padding: 25px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08); transition: transform 0.3s ease; border: 1px solid #e5e7eb; text-align: center; }
        .stat-card:hover { transform: translateY(-5px); }
        .stat-icon { font-size: 2.5rem; margin-bottom: 15px; }
        .stat-value { font-size: 1.8rem; font-weight: 800; color: #4f46e5; }
        .stat-label { color: #6b7280; font-size: 0.95rem; font-weight: 500; }
        .footer { text-align: center; padding: 30px; color: #6b7280; border-top: 1px solid #e5e7eb; font-size: 0.9rem; }
      </style>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="title">ZERO MEGA 2.0.4</h1>
          <div class="subtitle">PLUS ++++ OMEGA - Sistema Avanzado</div>
          <div class="status-indicator">
            <div class="status-dot ${botStatus.isReady ? 'online' : 'offline'}"></div>
            <span>${botStatus.isReady ? '🟢 BOT CONECTADO' : '🔴 BOT DESCONECTADO'}</span>
          </div>
        </div>
        <div class="content">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">⏱️</div>
              <div class="stat-value">${hours}h ${minutes}m ${seconds}s</div>
              <div class="stat-label">Tiempo Activo</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">👥</div>
              <div class="stat-value">${botStatus.guildCount}</div>
              <div class="stat-label">Servidores</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">👤</div>
              <div class="stat-value">${botStatus.userCount}</div>
              <div class="stat-label">Usuarios</div>
            </div>
          </div>
        </div>
        <div class="footer">
          <p>Zero Mega Bot © 2025 | Desarrollado con ❤️</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Web server listening at http://0.0.0.0:${PORT}`);
});

client.login(config.token).catch(err => {
  console.error('❌ Error logging in to Discord:', err.message);
});