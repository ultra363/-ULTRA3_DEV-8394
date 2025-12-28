// index.js - Lógica del bot (Modulado)
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  /* ================= CONFIG ================= */
  const config = {
    prefix: ".",
    dataFile: path.join(__dirname, "reviews.json"),
    reportsFile: path.join(__dirname, "reports.json"),
    roleMapping: {
      "1430002824305180814": { name: "Staff", emoji: "👑", color: "Gold" },
      "1432195295378407454": { name: "Trial Staff", emoji: "🌟", color: "Blue" },
      "1446861161088684164": { name: "Helper Team", emoji: "🤝", color: "Green" },
      "1430002835910561903": { name: "MM Team", emoji: "💰", color: "Purple" }
    }
  };

  /* ================= DATABASE ================= */
  const loadDB = (file) => {
    try {
      if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf-8"));
      fs.writeFileSync(file, JSON.stringify({}, null, 2));
      return {};
    } catch (e) {
      console.error(`Error DB ${file}:`, e);
      return file.endsWith('reviews.json') ? {} : [];
    }
  };

  const saveDB = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(config.prefix)) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Comando !review (ahora con el prefijo .)
    if (command === 'review') {
      const target = message.mentions.members.first();
      const reviewText = args.slice(1).join(' ');
      
      if (!target || !reviewText) return message.reply('Uso: .review @usuario <mensaje>');

      const db = loadDB(config.dataFile);
      if (!db[target.id]) db[target.id] = { reviews: [], totalStars: 0 };
      
      db[target.id].reviews.push({
        author: message.author.tag,
        content: reviewText,
        date: new Date()
      });
      
      saveDB(config.dataFile, db);
      message.reply(`✅ Reseña guardada para ${target.user.tag}`);
    }

    // Comando !report (ahora con el prefijo .)
    if (command === 'report') {
      const reportText = args.join(' ');
      if (!reportText) return message.reply('Uso: .report <descripción>');

      const reports = loadDB(config.reportsFile);
      if (!Array.isArray(reports)) reports = [];
      
      reports.push({
        user: message.author.tag,
        content: reportText,
        date: new Date()
      });
      
      saveDB(config.reportsFile, reports);
      message.reply('✅ Reporte enviado correctamente.');
    }

    // Comando !perfil
    if (command === 'perfil') {
      const target = message.mentions.members.first() || message.member;
      const db = loadDB(config.dataFile);
      const userData = db[target.id] || { reviews: [] };

      const embed = new EmbedBuilder()
        .setTitle(`Perfil de ${target.user.username}`)
        .setColor('Blue')
        .addFields(
          { name: 'Reseñas Totales', value: `${userData.reviews.length}`, inline: true },
          { name: 'Rol', value: target.roles.highest.name, inline: true }
        )
        .setThumbnail(target.user.displayAvatarURL());

      message.channel.send({ embeds: [embed] });
    }
  });
};