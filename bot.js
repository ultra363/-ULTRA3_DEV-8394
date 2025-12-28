// bot.js - Bot principal ZERO MEGA 2.0.4 PLUS ++++ OMEGA
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  StringSelectMenuBuilder
} = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

/* ================= CONFIG ================= */
const config = {
  token: process.env.DISCORD_TOKEN || "",
  prefix: ".",
  dataFile: path.join(__dirname, "reviews.json"),
  reportsFile: path.join(__dirname, "reports.json"),
  logChannelId: process.env.LOG_CHANNEL_ID || "",
  serverId: "1429925140661014742",
  maxReviewLength: 500,
  minReviewLength: 20,
  stars: {
    icon: "<:Star:1432237428667711612>",
    animated: "<a:Animated_Arrow_Orange:1432228325723738122>"
  },
  roleMapping: {
    "1430002824305180814": { 
      name: "Staff", 
      emoji: "👑", 
      color: "Gold",
      keyword: "staff"
    },
    "1432195295378407454": { 
      name: "Trial Staff", 
      emoji: "🌟", 
      color: "Blue",
      keyword: "trial"
    },
    "1446861161088684164": { 
      name: "Helper Team", 
      emoji: "🤝", 
      color: "Green",
      keyword: "helper"
    },
    "1430002835910561903": { 
      name: "MM Team", 
      emoji: "💰", 
      color: "Purple",
      keyword: "mm"
    }
  }
};

/* ================= LOGGER ================= */
const logger = {
  success: (msg) => console.log(`✅ [${new Date().toLocaleTimeString()}] ${msg}`),
  error: (msg) => console.error(`❌ [${new Date().toLocaleTimeString()}] ${msg}`),
  info: (msg) => console.log(`ℹ️ [${new Date().toLocaleTimeString()}] ${msg}`)
};

/* ================= HELPERS ================= */
const minutesToMs = (m) => m * 60 * 1000;
const getRandomCooldown = () => {
  const min = 3;
  const max = 9;
  const randomMinutes = Math.floor(Math.random() * (max - min + 1)) + min;
  return minutesToMs(randomMinutes);
};

/* ================= DATABASE ================= */
class Database {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {};
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        this.data = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
        logger.success(`📁 Base de datos cargada: ${Object.keys(this.data).length} usuarios`);
      } else {
        this.data = {};
        this.save();
        logger.info("📁 Base de datos creada nueva");
      }
    } catch (error) {
      logger.error(`Error al cargar DB: ${error.message}`);
      this.data = {};
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
      return true;
    } catch (error) {
      logger.error(`Error guardar DB: ${error.message}`);
      return false;
    }
  }

  ensureUser(userId, base = {}) {
    if (!this.data[userId]) {
      this.data[userId] = {
        name: base.name || "Unknown",
        roleId: base.roleId || null,
        roleName: base.roleName || null,
        roles: base.roles || [],
        reviews: [],
        stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        achievements: [],
        achievements_meta: {},
        reviewCooldowns: {},
        reported: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.save();
    }
    return this.data[userId];
  }

  get(userId) {
    return this.data[userId] || null;
  }

  getAll() {
    return this.data;
  }

  addReview(targetId, reviewData) {
    const user = this.ensureUser(targetId, { 
      name: reviewData.targetName, 
      roleId: reviewData.roleId, 
      roleName: reviewData.roleName 
    });

    // Agregar rol si no existe
    if (!user.roles.includes(reviewData.roleId)) {
      user.roles.push(reviewData.roleId);
    }

    user.reviews.push(reviewData);

    const starKey = Math.round(reviewData.rating);
    user.stars[starKey] = (user.stars[starKey] || 0) + 1;
    user.updatedAt = Date.now();

    const expiry = Date.now() + getRandomCooldown();
    if (!user.reviewCooldowns) user.reviewCooldowns = {};
    user.reviewCooldowns[reviewData.author] = expiry;

    this.save();
    return user;
  }

  getReviewCooldownExpiry(targetId, reviewerId) {
    const u = this.data[targetId];
    if (!u || !u.reviewCooldowns) return null;
    return u.reviewCooldowns[reviewerId] || null;
  }

  userHasAchievement(userId, achievementId) {
    const u = this.data[userId];
    if (!u || !u.achievements) return false;
    return u.achievements.includes(achievementId);
  }

  grantAchievement(userId, achievementObj) {
    const user = this.ensureUser(userId);
    if (!user.achievements) user.achievements = [];

    if (!user.achievements.includes(achievementObj.id)) {
      user.achievements.push(achievementObj.id);

      if (!user.achievements_meta) {
        user.achievements_meta = {};
      }

      user.achievements_meta[achievementObj.id] = {
        name: achievementObj.name,
        description: achievementObj.description,
        role: achievementObj.role,
        difficulty: achievementObj.difficulty,
        unlockedAt: Date.now()
      };

      this.save();
      return true;
    }
    return false;
  }

  getAchievements(userId) {
    const u = this.data[userId];
    if (!u) return [];
    return (u.achievements_meta) ? 
      Object.entries(u.achievements_meta).map(([id, meta]) => ({ id, ...meta })) : 
      [];
  }

  getTopByRole(roleId = null, sortBy = "stars") {
    let entries = Object.entries(this.data);
    if (roleId && roleId !== "general") {
      entries = entries.filter(([_, d]) => d.roleId === roleId || (d.roles && d.roles.includes(roleId)));
    }

    const mapped = entries
      .map(([id, data]) => ({
        id,
        name: data.name,
        roleId: data.roleId,
        reviews: data.reviews.length,
        avg: data.reviews.length > 0 ? 
           (data.reviews.reduce((s, r) => s + r.rating, 0) / data.reviews.length).toFixed(2) : 
           "0.00"
      }))
      .filter(u => u.reviews > 0);

    if (sortBy === "stars") {
      mapped.sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg) || b.reviews - a.reviews);
    } else if (sortBy === "reviews") {
      mapped.sort((a, b) => b.reviews - a.reviews || parseFloat(b.avg) - parseFloat(a.avg));
    }

    return mapped.slice(0, 10);
  }

  getStatsByRole(roleId) {
    const allReviews = [];
    const users = new Set();

    for (const [userId, userData] of Object.entries(this.data)) {
      for (const review of userData.reviews) {
        if (review.roleId === roleId) {
          allReviews.push(review);
          users.add(userId);
        }
      }
    }

    const totalReviews = allReviews.length;
    const totalUsers = users.size;

    if (totalReviews === 0) {
      return {
        totalUsers: 0,
        totalReviews: 0,
        avgRating: "0.00",
        recommended: 0,
        negative: 0,
        bestRated: "N/A",
        avgTrust: 0,
        mostRated: 0,
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }

    const avgRating = (allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2);

    const breakdown = {
      5: allReviews.filter(r => Math.round(r.rating) === 5).length,
      4: allReviews.filter(r => Math.round(r.rating) === 4).length,
      3: allReviews.filter(r => Math.round(r.rating) === 3).length,
      2: allReviews.filter(r => Math.round(r.rating) === 2).length,
      1: allReviews.filter(r => Math.round(r.rating) === 1).length
    };

    const recommended = breakdown[5] + breakdown[4];
    const negative = breakdown[2] + breakdown[1];

    let bestRated = "N/A";
    let maxAvg = 0;

    for (const [userId, userData] of Object.entries(this.data)) {
      const roleReviews = userData.reviews.filter(r => r.roleId === roleId);
      if (roleReviews.length > 0) {
        const userAvg = roleReviews.reduce((sum, r) => sum + r.rating, 0) / roleReviews.length;
        if (userAvg > maxAvg) {
          maxAvg = userAvg;
          bestRated = userData.name;
        }
      }
    }

    const avgTrust = totalReviews > 0 ? 
      Math.round((recommended / totalReviews) * 100) : 0;

    const mostRated = totalReviews > 0 ? 
      Math.round((breakdown[5] / totalReviews) * 100) : 0;

    return {
      totalUsers,
      totalReviews,
      avgRating,
      recommended,
      negative,
      bestRated,
      avgTrust,
      mostRated,
      breakdown
    };
  }

  getGlobalStats() {
    const allUsers = Object.values(this.data);
    const activeUsers = allUsers.filter(u => u.reviews.length > 0);

    let totalReviews = 0;
    let totalRating = 0;
    let totalReports = 0;
    let totalAchievements = 0;

    allUsers.forEach(user => {
      totalReviews += user.reviews.length;
      totalRating += user.reviews.reduce((sum, r) => sum + r.rating, 0);
      totalReports += user.reported || 0;
      totalAchievements += user.achievements?.length || 0;
    });

    const avgRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(2) : "0.00";

    const reviewsByRole = {};
    Object.keys(config.roleMapping).forEach(roleId => {
      reviewsByRole[config.roleMapping[roleId].name] = 0;
    });

    allUsers.forEach(user => {
      user.reviews.forEach(review => {
        const roleName = config.roleMapping[review.roleId]?.name;
        if (roleName) {
          reviewsByRole[roleName] = (reviewsByRole[roleName] || 0) + 1;
        }
      });
    });

    const mostReviewed = allUsers
      .filter(u => u.reviews.length > 0)
      .sort((a, b) => b.reviews.length - a.reviews.length)
      .slice(0, 5)
      .map(u => ({ 
        name: u.name, 
        reviews: u.reviews.length, 
        avg: u.reviews.length > 0 ? 
          (u.reviews.reduce((sum, r) => sum + r.rating, 0) / u.reviews.length).toFixed(2) : "0.00" 
      }));

    return {
      totalUsers: allUsers.length,
      activeUsers: activeUsers.length,
      totalReviews,
      avgRating,
      totalReports,
      totalAchievements,
      reviewsByRole,
      mostReviewed
    };
  }
}

/* ================= REPORTS DB ================= */
class ReportsDB {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = [];
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        this.data = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
      } else {
        this.data = [];
        this.save();
      }
    } catch (error) {
      logger.error(`Error cargar reports: ${error.message}`);
      this.data = [];
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
      return true;
    } catch (error) {
      logger.error(`Error guardar reports: ${error.message}`);
      return false;
    }
  }

  add(report) {
    this.data.push(report);
    this.save();
  }

  getAll() {
    return this.data;
  }

  getUserReports(userId) {
    return this.data.filter(r => r.userId === userId);
  }
}

/* ================= COOLDOWN MANAGER ================= */
class CooldownManager {
  constructor() {
    this.cooldowns = new Map();
    this.reviewAttempts = new Map();
  }

  check(userId) {
    const now = Date.now();
    const cooldownTime = this.cooldowns.get(userId);

    if (cooldownTime && cooldownTime > now) {
      return { active: true, remaining: cooldownTime - now };
    }

    return { active: false, remaining: 0 };
  }

  setCooldown(userId) {
    this.cooldowns.set(userId, Date.now() + getRandomCooldown());
  }

  setAttempt(userId) {
    this.reviewAttempts.set(userId, Date.now());
  }

  hasRecentAttempt(userId) {
    const attemptTime = this.reviewAttempts.get(userId);
    if (!attemptTime) return false;
    return (Date.now() - attemptTime) < 30000;
  }

  clearAttempt(userId) {
    this.reviewAttempts.delete(userId);
  }

  clearUserCooldown(userId) {
    this.cooldowns.delete(userId);
    this.reviewAttempts.delete(userId);
  }

  cleanup() {
    const now = Date.now();
    for (const [userId, time] of this.cooldowns.entries()) {
      if (time < now) this.cooldowns.delete(userId);
    }

    for (const [userId, time] of this.reviewAttempts.entries()) {
      if ((now - time) > 60000) this.reviewAttempts.delete(userId);
    }
  }
}

/* ================= UTILS ================= */
const utils = {
  getUserRole: (member) => {
    if (!member || !member.roles) return null;
    for (const [roleId, roleInfo] of Object.entries(config.roleMapping)) {
      if (member.roles.cache.has(roleId)) {
        return { id: roleId, ...roleInfo };
      }
    }
    return null;
  },

  getUserRoles: (member) => {
    if (!member || !member.roles) return [];
    const roles = [];
    for (const [roleId, roleInfo] of Object.entries(config.roleMapping)) {
      if (member.roles.cache.has(roleId)) {
        roles.push({ id: roleId, ...roleInfo });
      }
    }
    return roles;
  },

  isValidAlt: (member) => {
    if (!member || !member.user) return false;
    const accountAge = Date.now() - member.user.createdTimestamp;
    if (accountAge < 7 * 86400000) return false;
    if (!member.user.avatar) return false;
    if (member.roles.cache.size <= 1) return false;
    return true;
  },

  createStarsBar: (rating) => {
    const full = Math.floor(rating);
    const partial = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - partial;

    let stars = config.stars.icon.repeat(full);
    if (partial) stars += "½";
    stars += "☆".repeat(empty);

    const percentage = (rating / 5 * 100).toFixed(1);
    stars += ` (${percentage}%)`;

    return stars;
  },

  formatTime: (ms) => {
    const minutes = Math.ceil(ms / 60000);
    if (minutes < 60) return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    const hours = Math.ceil(minutes / 60);
    return `${hours} hora${hours !== 1 ? 's' : ''}`;
  },

  validateRating: (rating) => {
    const num = parseFloat(rating);
    if (isNaN(num)) return null;
    if (num < 1 || num > 5) return null;
    return parseFloat(num.toFixed(2));
  },

  calculateStarDistribution: (reviews) => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const total = reviews.length;

    reviews.forEach(review => {
      const star = Math.round(review.rating);
      if (distribution[star] !== undefined) {
        distribution[star] += 1;
      }
    });

    const percentages = {};
    Object.keys(distribution).forEach(star => {
      percentages[star] = total > 0 ? 
        ((distribution[star] / total) * 100).toFixed(1) : "0.0";
    });

    return { distribution, percentages };
  },

  createStarPercentageBar: (percentage) => {
    const barLength = 20;
    const filled = Math.round((parseFloat(percentage) / 100) * barLength);
    return "█".repeat(filled) + "░".repeat(barLength - filled);
  },

  formatDate: (timestamp) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  },

  getRatingColor: (rating) => {
    if (rating >= 4.5) return "Green";
    if (rating >= 4.0) return "Blue";
    if (rating >= 3.0) return "Yellow";
    if (rating >= 2.0) return "Orange";
    return "Red";
  }
};

/* ================= ACHIEVEMENTS SYSTEM ================= */
const ACHIEVEMENTS = (() => {
  const difficulties = ["Fácil", "Medio", "Difícil", "Extremo", "Imposible"];
  const arr = [];
  let idCounter = 1;

  const generalAchievements = [
    { name: "Primera Reseña", description: "Recibe tu primera reseña" },
    { name: "5 Estrellas", description: "Obtén 5 reseñas de 5 estrellas" },
    { name: "Consistente", description: "Mantén promedio de 4+ por 1 mes" },
    { name: "Popular", description: "Consigue 25 reseñas en total" },
    { name: "Confiable", description: "95% de reseñas positivas" },
    { name: "Excelencia", description: "Promedio de 4.8+ por 2 meses" },
    { name: "Leyenda", description: "100 reseñas en total" },
    { name: "Perfecto", description: "Promedio de 5.0 con 20+ reseñas" },
    { name: "Veterano", description: "6 meses en el sistema" }
  ];

  generalAchievements.forEach((ach, i) => {
    arr.push({
      id: `GEN${String(idCounter).padStart(3, "0")}`,
      name: ach.name,
      description: ach.description,
      role: "General",
      difficulty: difficulties[Math.min(i, difficulties.length - 1)],
      emoji: "🎯"
    });
    idCounter++;
  });

  const roleAchievements = [
    { name: "Bronce", description: "5 reseñas positivas", requirement: 5 },
    { name: "Plata", description: "15 reseñas positivas", requirement: 15 },
    { name: "Oro", description: "30 reseñas positivas", requirement: 30 },
    { name: "Platino", description: "Promedio 4.2+", requirement: 4.2 },
    { name: "Diamante", description: "50 reseñas positivas", requirement: 50 },
    { name: "Épico", description: "Promedio 4.5+", requirement: 4.5 },
    { name: "Mítico", description: "75 reseñas positivas", requirement: 75 },
    { name: "Legendario", description: "Promedio 4.8+", requirement: 4.8 },
    { name: "Divino", description: "100 reseñas positivas", requirement: 100 }
  ];

  const roles = ["Staff", "Trial Staff", "Helper Team", "MM Team"];
  roles.forEach(role => {
    roleAchievements.forEach((ach, i) => {
      arr.push({
        id: `${role.substring(0, 3).toUpperCase()}${String(i + 1).padStart(3, "0")}`,
        name: `${role} - ${ach.name}`,
        description: ach.description,
        role: role,
        difficulty: difficulties[Math.min(i, difficulties.length - 1)],
        emoji: role === "Staff" ? "👑" : 
               role === "Trial Staff" ? "🌟" : 
               role === "Helper Team" ? "🤝" : "💰",
        requirement: ach.requirement
      });
    });
  });

  return arr;
})();

function checkAndUnlockAchievements(dbInstance, userId, memberRoles = []) {
  try {
    const user = dbInstance.get(userId);
    if (!user) return [];

    const unlocked = [];
    const userReviews = user.reviews || [];
    const totalReviews = userReviews.length;

    if (totalReviews === 0) return [];

    const userRoleNames = memberRoles.length > 0 
      ? memberRoles.map(r => config.roleMapping[r]?.name).filter(Boolean)
      : (user.roleName ? [user.roleName] : []);

    const avgRating = userReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    userReviews.forEach(r => {
      const star = Math.round(r.rating);
      starCounts[star] = (starCounts[star] || 0) + 1;
    });

    const positiveReviews = starCounts[5] + starCounts[4];
    const positivePercentage = totalReviews > 0 ? (positiveReviews / totalReviews) * 100 : 0;

    const generalAchievements = ACHIEVEMENTS.filter(a => a.role === "General");

    if (totalReviews >= 1 && !dbInstance.userHasAchievement(userId, "GEN001")) {
      const ach = generalAchievements.find(a => a.id === "GEN001");
      if (ach && dbInstance.grantAchievement(userId, ach)) unlocked.push(ach);
    }

    if (starCounts[5] >= 5 && !dbInstance.userHasAchievement(userId, "GEN002")) {
      const ach = generalAchievements.find(a => a.id === "GEN002");
      if (ach && dbInstance.grantAchievement(userId, ach)) unlocked.push(ach);
    }

    if (totalReviews >= 25 && !dbInstance.userHasAchievement(userId, "GEN004")) {
      const ach = generalAchievements.find(a => a.id === "GEN004");
      if (ach && dbInstance.grantAchievement(userId, ach)) unlocked.push(ach);
    }

    for (const roleName of userRoleNames) {
      const roleAchievements = ACHIEVEMENTS.filter(a => a.role === roleName);
      const roleReviews = userReviews.filter(r => r.roleName === roleName);
      const rolePositiveReviews = roleReviews.filter(r => Math.round(r.rating) >= 4).length;
      const roleTotalReviews = roleReviews.length;

      if (roleTotalReviews === 0) continue;

      const roleAvgRating = roleReviews.reduce((sum, r) => sum + r.rating, 0) / roleTotalReviews;

      if (rolePositiveReviews >= 5) {
        const ach = roleAchievements.find(a => a.name.includes("Bronce"));
        if (ach && !dbInstance.userHasAchievement(userId, ach.id) && dbInstance.grantAchievement(userId, ach)) {
          unlocked.push(ach);
        }
      }

      if (rolePositiveReviews >= 15) {
        const ach = roleAchievements.find(a => a.name.includes("Plata"));
        if (ach && !dbInstance.userHasAchievement(userId, ach.id) && dbInstance.grantAchievement(userId, ach)) {
          unlocked.push(ach);
        }
      }

      if (rolePositiveReviews >= 30) {
        const ach = roleAchievements.find(a => a.name.includes("Oro"));
        if (ach && !dbInstance.userHasAchievement(userId, ach.id) && dbInstance.grantAchievement(userId, ach)) {
          unlocked.push(ach);
        }
      }

      if (roleAvgRating >= 4.2 && roleTotalReviews >= 10) {
        const ach = roleAchievements.find(a => a.name.includes("Platino"));
        if (ach && !dbInstance.userHasAchievement(userId, ach.id) && dbInstance.grantAchievement(userId, ach)) {
          unlocked.push(ach);
        }
      }

      if (roleAvgRating >= 4.5 && roleTotalReviews >= 20) {
        const ach = roleAchievements.find(a => a.name.includes("Épico"));
        if (ach && !dbInstance.userHasAchievement(userId, ach.id) && dbInstance.grantAchievement(userId, ach)) {
          unlocked.push(ach);
        }
      }
    }

    return unlocked;
  } catch (e) {
    logger.error(`Error en checkAndUnlockAchievements: ${e.message}`);
    return [];
  }
}

/* ================= INIT DBs ================= */
const db = new Database(config.dataFile);
const reports = new ReportsDB(config.reportsFile);
const cooldowns = new CooldownManager();

/* ================= CLIENT CREATION ================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

/* ================= SLASH COMMANDS REGISTRATION ================= */
client.once("ready", async () => {
  logger.success(`✅ Bot: ${client.user.tag} | ZERO MEGA 2.0.4 PLUS ++++ OMEGA`);
  client.user.setActivity(`${config.prefix}perfil | /perfil`, { type: "LISTENING" });

  // Actualizar estado en el dashboard
  try {
    const { updateBotStatus } = require('./server.js');
    const reviewsCount = Object.values(db.data).reduce((acc, user) => 
      acc + (user.reviews ? user.reviews.length : 0), 0);
    
    updateBotStatus({
      isReady: true,
      startTime: new Date(),
      guildCount: client.guilds.cache.size,
      userCount: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
      reviewsCount
    });
  } catch (e) {
    logger.error(`Error actualizando estado: ${e.message}`);
  }

  try {
    const rest = new REST({ version: "10" }).setToken(config.token);

    const commands = [
      new SlashCommandBuilder()
        .setName("perfil")
        .setDescription("📊 Ver perfil y estadísticas de un usuario")
        .addUserOption(opt => 
          opt.setName("usuario")
            .setDescription("Usuario a consultar")
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

      new SlashCommandBuilder()
        .setName("top")
        .setDescription("🏆 Top 10 usuarios por estrellas o reseñas")
        .addStringOption(opt =>
          opt.setName("tipo")
            .setDescription("Tipo de ordenamiento")
            .setRequired(false)
            .addChoices(
              { name: "⭐ Por Estrellas", value: "stars" },
              { name: "📝 Por Reseñas", value: "reviews" }
            )
        )
        .addStringOption(opt =>
          opt.setName("rol")
            .setDescription("Filtrar por rol")
            .setRequired(false)
            .addChoices(
              { name: "General", value: "general" },
              { name: "Staff", value: "staff" },
              { name: "Trial Staff", value: "trial" },
              { name: "Helper", value: "helper" },
              { name: "MM Team", value: "mm" }
            )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

      new SlashCommandBuilder()
        .setName("estadisticas")
        .setDescription("📈 Ver estadísticas de un rol específico")
        .addStringOption(opt =>
          opt.setName("rol")
            .setDescription("Selecciona un rol")
            .setRequired(true)
            .addChoices(
              { name: "👑 Staff", value: "1430002824305180814" },
              { name: "🌟 Trial Staff", value: "1432195295378407454" },
              { name: "🤝 Helper Team", value: "1446861161088684164" },
              { name: "💰 MM Team", value: "1430002835910561903" }
            )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

      new SlashCommandBuilder()
        .setName("reportes")
        .setDescription("🚩 Ver reportes recientes (Solo Staff)")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

      new SlashCommandBuilder()
        .setName("logros")
        .setDescription("🏅 Ver logros de un usuario")
        .addUserOption(opt => 
          opt.setName("usuario")
            .setDescription("Usuario (opcional)")
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

      new SlashCommandBuilder()
        .setName("ayuda")
        .setDescription("❓ Mostrar ayuda del sistema")
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

      new SlashCommandBuilder()
        .setName("version")
        .setDescription("🤖 Ver información de la versión")
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

      new SlashCommandBuilder()
        .setName("global")
        .setDescription("🌍 Ver estadísticas globales del sistema")
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

      new SlashCommandBuilder()
        .setName("reseñas")
        .setDescription("📝 Ver reseñas de un usuario")
        .addUserOption(opt => 
          opt.setName("usuario")
            .setDescription("Usuario a consultar")
            .setRequired(true)
        )
        .addNumberOption(opt =>
          opt.setName("pagina")
            .setDescription("Número de página")
            .setRequired(false)
            .setMinValue(1)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)

    ].map(c => c.toJSON());

    await rest.put(Routes.applicationGuildCommands(client.user.id, config.serverId), { body: commands });
    logger.success("✅ 9 Comandos slash registrados exitosamente");
  } catch (error) {
    logger.error(`Error registrando slash: ${error.message}`);
  }
});

/* ================= MESSAGE (PREFIX) COMMANDS ================= */
client.on("messageCreate", async (msg) => {
  try {
    if (msg.guildId !== config.serverId || !msg.content.startsWith(config.prefix) || msg.author.bot) return;

    const args = msg.content.slice(config.prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (cmd === "perfil") {
      const target = msg.mentions.members?.first();
      if (!target) return msg.reply("❌ Uso: `.perfil @usuario`");

      const roles = utils.getUserRoles(target);
      if (!roles || roles.length === 0) return msg.reply("❌ Este usuario no tiene roles válidos para reseñas.");

      const userData = db.get(target.id) || { reviews: [], stars: {}, reported: 0 };
      const stats = utils.calculateStarDistribution(userData.reviews);

      const total = userData.reviews.length;
      const avg = total > 0 ? 
        (userData.reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(2) : 
        "0.00";

      const recommended = (userData.stars[4] || 0) + (userData.stars[5] || 0);
      const negative = (userData.stars[1] || 0) + (userData.stars[2] || 0);
      const trust = total > 0 ? Math.round((recommended / total) * 100) : 100;

      const roleNames = roles.map(r => `${r.emoji} ${r.name}`).join(", ");

      const userAchievements = db.getAchievements(target.id);
      const userRoles = roles.map(r => r.name);
      const achievementsForRoles = ACHIEVEMENTS.filter(a => userRoles.includes(a.role));
      const unlockedCount = userAchievements.filter(a => achievementsForRoles.some(ach => ach.id === a.id)).length;

      let description = total === 0 ? 
        `${config.stars.icon} **Sin reseñas aún**` : 
        `${config.stars.icon} **Calificación:** \`${avg}/5\`\n${utils.createStarsBar(parseFloat(avg))}`;

      let starDistribution = "";
      for (let i = 5; i >= 1; i--) {
        const count = stats.distribution[i] || 0;
        const percent = stats.percentages[i] || "0.0";
        const bar = utils.createStarPercentageBar(percent);
        starDistribution += `${config.stars.icon.repeat(i)} ${bar} ${percent}% (${count})\n`;
      }

      const embed = new EmbedBuilder()
        .setTitle(`${config.stars.animated} ${target.user.username}`)
        .setDescription(description)
        .addFields(
          { name: "📋 Roles", value: roleNames, inline: false },
          { name: "📝 Total Reseñas", value: `${total}`, inline: true },
          { name: "👍 Recomendadas (4★+)", value: `${recommended}`, inline: true },
          { name: "⭐ Promedio", value: `${avg}/5`, inline: true },
          { name: "🛡️ Confianza", value: `${trust}%`, inline: true },
          { name: "📛 Críticas y Reportes", value: `Críticas: ${negative} | Reportes: ${userData.reported || 0}`, inline: true },
          { name: "🏆 Logros", value: `${unlockedCount}/${achievementsForRoles.length}`, inline: true },
          { name: "📊 Distribución de Estrellas", value: starDistribution || "No hay reseñas", inline: false }
        )
        .setColor(roles[0]?.color || "Blue")
        .setThumbnail(target.user.displayAvatarURL({ size: 256 }))
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`review_${target.id}_${msg.author.id}`)
          .setLabel("✍️ Reseña")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`report_${target.id}_${msg.author.id}`)
          .setLabel("🚩 Reportar")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`achievements_menu_${target.id}_${msg.author.id}`)
          .setLabel("🏆 Logros")
          .setStyle(ButtonStyle.Success)
      );

      msg.reply({ embeds: [embed], components: [row] });
    }

    else if (cmd === "top") {
      let type = "stars";
      let roleArg = "general";

      if (args[0]) {
        if (args[0] === "stars" || args[0] === "reviews") {
          type = args[0];
          roleArg = args[1] || "general";
        } else {
          roleArg = args[0];
        }
      }

      const categoryMap = { 
        staff: "1430002824305180814", 
        trial: "1432195295378407454", 
        helper: "1446861161088684164", 
        mm: "1430002835910561903" 
      };

      let roleId = null, title = "🏆 Top 10 General", color = "Blue";
      if (roleArg !== "general" && categoryMap[roleArg]) {
        roleId = categoryMap[roleArg];
        const roleInfo = config.roleMapping[roleId];
        title = `${roleInfo.emoji} Top 10 ${roleInfo.name}`;
        color = roleInfo.color;
      }

      const top = db.getTopByRole(roleId, type);
      if (top.length === 0) return msg.reply("❌ No hay reseñas registradas.");

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(top.map((u, i) => {
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
          const stat = type === "stars" ? `⭐ ${u.avg}` : `📝 ${u.reviews} reseñas`;
          return `${medal} **${u.name}** - ${stat}`;
        }).join("\n"))
        .setColor(color)
        .setFooter({ text: `Ordenado por ${type === "stars" ? "estrellas" : "cantidad de reseñas"}` })
        .setTimestamp();

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`top_switch_${roleArg}_${type}_${msg.author.id}`)
          .setLabel(type === "stars" ? "📝 Ver por Reseñas" : "⭐ Ver por Estrellas")
          .setStyle(ButtonStyle.Primary)
      );

      msg.reply({ embeds: [embed], components: [buttonRow] });
    }

    else if (cmd === "estadisticas" || cmd === "stats") {
      const roleArg = args[0]?.toLowerCase();
      let roleId = null;

      const roleMap = { 
        staff: "1430002824305180814", 
        trial: "1432195295378407454", 
        helper: "1446861161088684164", 
        mm: "1430002835910561903" 
      };

      if (roleArg && roleMap[roleArg]) {
        roleId = roleMap[roleArg];
      } else {
        return msg.reply("❌ Uso: `.estadisticas <staff|trial|helper|mm>`");
      }

      const roleInfo = config.roleMapping[roleId];
      const stats = db.getStatsByRole(roleId);

      const embed = new EmbedBuilder()
        .setTitle(`${roleInfo.emoji} Estadísticas - ${roleInfo.name}`)
        .addFields(
          { name: "👥 Usuarios Activos", value: `${stats.totalUsers}`, inline: true },
          { name: "📝 Total Reseñas", value: `${stats.totalReviews}`, inline: true },
          { name: "⭐ Promedio General", value: `${stats.avgRating}/5`, inline: true },
          { name: "👍 Recomendadas (4★+)", value: `${stats.recommended}`, inline: true },
          { name: "📛 Críticas (1★+2★)", value: `${stats.negative}`, inline: true },
          { name: "🛡️ Confianza", value: `${stats.avgTrust}%`, inline: true },
          { name: "🏆 Mejor Calificado", value: stats.bestRated !== "N/A" ? `${stats.bestRated}` : "N/A", inline: true },
          { name: "📊 5 Estrellas", value: `${stats.mostRated}%`, inline: true },
          { name: "📈 Actividad", value: stats.totalReviews > 0 ? "✅ Activo" : "❌ Inactivo", inline: true }
        )
        .setColor(roleInfo.color)
        .setFooter({ text: "Estadísticas balanceadas como Play Store" })
        .setTimestamp();

      msg.reply({ embeds: [embed] });
    }

    else if (cmd === "logros") {
      const userMention = msg.mentions.users.first() || msg.author;
      const targetMember = await msg.guild.members.fetch(userMention.id).catch(() => null);

      if (!targetMember) return msg.reply("❌ Usuario no encontrado.");

      const roles = utils.getUserRoles(targetMember);
      if (roles.length === 0) return msg.reply("❌ Este usuario no tiene roles válidos.");

      const embed = new EmbedBuilder()
        .setTitle(`🏆 Logros de ${targetMember.user.username}`)
        .setDescription(`Selecciona un rol para ver los logros específicos:`)
        .setColor("Gold")
        .setTimestamp();

      const buttons = [
        new ButtonBuilder()
          .setCustomId(`back_to_profile_${targetMember.id}_${msg.author.id}`)
          .setLabel("👤 Perfil")
          .setStyle(ButtonStyle.Secondary)
      ];

      for (const role of roles) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`view_role_achievements_${targetMember.id}_${role.id}_${msg.author.id}`)
            .setLabel(`${role.emoji} ${role.name}`)
            .setStyle(ButtonStyle.Primary)
        );
      }

      const rows = [];
      for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
      }

      return msg.reply({ embeds: [embed], components: rows });
    }

    else if (cmd === "ayuda" || cmd === "help") {
      const embed = new EmbedBuilder()
        .setTitle("❓ Sistema de Reseñas ZERO MEGA 2.0.4")
        .setDescription("**Sistema dual:** Usa comandos `.` (prefix) o `/` (slash)")
        .addFields(
          { 
            name: "📋 9 Comandos Disponibles", 
            value: [
              "`.perfil @usuario` o `/perfil` - Ver perfil completo",
              "`.top [stars/reviews] [rol]` o `/top` - Ranking de usuarios",
              "`.estadisticas <rol>` o `/estadisticas` - Estadísticas por rol",
              "`.logros [@usuario]` o `/logros` - Ver logros",
              "`/reportes` - Ver reportes (solo staff)",
              "`.ayuda` o `/ayuda` - Esta ayuda",
              "`.version` o `/version` - Información del bot",
              "`/global` - Estadísticas globales",
              "`/reseñas @usuario` - Ver reseñas específicas"
            ].join("\n"), 
            inline: false 
          },
          { 
            name: "⭐ Características Principales", 
            value: [
              "• Sistema de reseñas balanceado",
              "• Top por estrellas o cantidad de reseñas",
              "• Logros específicos por rol",
              "• Sistema de reportes integrado",
              "• Estadísticas como Play Store",
              "• Cooldowns aleatorios (3-9 min)",
              "• Validación anti-cuentas falsas"
            ].join("\n"), 
            inline: false 
          }
        )
        .setColor("Blue")
        .setTimestamp();

      msg.reply({ embeds: [embed] });
    }

    else if (cmd === "version") {
      const embed = new EmbedBuilder()
        .setTitle("🤖 ZERO MEGA 2.0.4 PLUS ++++ OMEGA")
        .setDescription("Sistema de Reseñas Ultra Avanzado - Bugs Corregidos")
        .addFields(
          { name: "Versión", value: "2.0.4 PLUS ++++ OMEGA", inline: true },
          { name: "Lenguaje", value: "Node.js (JavaScript)", inline: true },
          { name: "Developer", value: "ultra3_dev", inline: true },
          { name: "Ideas", value: "samuu.zlp", inline: true },
          { name: "Testers", value: "samuu.zlp, ultra3_dev, marco_izx.", inline: true },
          { 
            name: "🛠️ Correcciones Implementadas", 
            value: [
              "• Estadísticas balanceadas (confianza, críticas)",
              "• Top por estrellas y reseñas funcionando",
              "• Solo autor puede usar botones",
              "• Logros por rol específico",
              "• Corrección bug estadísticas por rol",
              "• Reseñas para múltiples roles funcionando"
            ].join("\n"), 
            inline: false 
          }
        )
        .setColor("Purple")
        .setTimestamp();

      msg.reply({ embeds: [embed] });
    }

    else if (cmd === "global") {
      const stats = db.getGlobalStats();

      const embed = new EmbedBuilder()
        .setTitle("🌍 Estadísticas Globales del Sistema")
        .addFields(
          { name: "👥 Usuarios Registrados", value: `${stats.totalUsers}`, inline: true },
          { name: "📈 Usuarios Activos", value: `${stats.activeUsers}`, inline: true },
          { name: "📝 Total Reseñas", value: `${stats.totalReviews}`, inline: true },
          { name: "⭐ Promedio Global", value: `${stats.avgRating}/5`, inline: true },
          { name: "🚩 Reportes Totales", value: `${stats.totalReports}`, inline: true },
          { name: "🏆 Logros Desbloqueados", value: `${stats.totalAchievements}`, inline: true },
          { 
            name: "📊 Reseñas por Rol", 
            value: Object.entries(stats.reviewsByRole)
              .map(([role, count]) => `${role}: ${count} reseñas`)
              .join("\n"), 
            inline: false 
          }
        )
        .setColor("Purple")
        .setFooter({ text: "ZERO MEGA 2.0.4 PLUS ++++ OMEGA" })
        .setTimestamp();

      msg.reply({ embeds: [embed] });
    }

    else if (cmd === "reportes") {
      if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return msg.reply("❌ Solo el staff puede ver los reportes.");
      }

      const allReports = reports.getAll();
      if (allReports.length === 0) {
        return msg.reply("✅ No hay reportes registrados.");
      }

      const recentReports = allReports.slice(-10).reverse();

      const embed = new EmbedBuilder()
        .setTitle("🚩 Últimos 10 Reportes")
        .setDescription(recentReports.map((r, idx) => {
          const date = new Date(r.date);
          return `**${idx + 1}.** <@${r.userId}> reportado por **${r.reportedByName}**\n📅 ${date.toLocaleDateString()}\n📝 **Razón:** ${r.reason.substring(0, 100)}${r.reason.length > 100 ? '...' : ''}`;
        }).join("\n\n"))
        .setColor("Red")
        .setFooter({ text: `Total reportes: ${allReports.length}` })
        .setTimestamp();

      msg.reply({ embeds: [embed] });
    }

    else if (cmd === "reseñas" || cmd === "reviews") {
      const target = msg.mentions.members?.first();
      if (!target) return msg.reply("❌ Uso: `.reseñas @usuario`");

      const userData = db.get(target.id);
      if (!userData || !userData.reviews || userData.reviews.length === 0) {
        return msg.reply(`❌ ${target.user.username} no tiene reseñas registradas.`);
      }

      const page = parseInt(args[1]) || 1;
      const perPage = 5;
      const totalReviews = userData.reviews.length;
      const totalPages = Math.ceil(totalReviews / perPage);
      const currentPage = Math.min(Math.max(page, 1), totalPages);
      const startIdx = (currentPage - 1) * perPage;
      const endIdx = startIdx + perPage;
      const pageReviews = userData.reviews.slice(startIdx, endIdx).reverse();

      const embed = new EmbedBuilder()
        .setTitle(`📝 Reseñas de ${target.user.username}`)
        .setDescription(`**Página ${currentPage}/${totalPages}** • ${totalReviews} reseñas totales`)
        .setColor("Gold")
        .setThumbnail(target.user.displayAvatarURL({ size: 128 }))
        .setTimestamp();

      pageReviews.forEach((review, idx) => {
        const date = new Date(review.date);
        const roleInfo = config.roleMapping[review.roleId] || { name: "Desconocido", emoji: "❓" };

        embed.addFields({
          name: `${config.stars.icon.repeat(Math.round(review.rating))} ${review.rating}/5 • ${roleInfo.emoji} ${roleInfo.name}`,
          value: `**Por:** ${review.authorName}\n**Fecha:** ${date.toLocaleDateString()}\n**Comentario:** ${review.text.substring(0, 150)}${review.text.length > 150 ? '...' : ''}`,
          inline: false
        });
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`prev_page_${target.id}_${currentPage}_${msg.author.id}`)
          .setLabel("◀️ Anterior")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage <= 1),
        new ButtonBuilder()
          .setCustomId(`next_page_${target.id}_${currentPage}_${msg.author.id}`)
          .setLabel("Siguiente ▶️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage >= totalPages)
      );

      msg.reply({ embeds: [embed], components: [row] });
    }

  } catch (error) {
    logger.error(`Error messageCreate: ${error.message}`);
  }
});

/* ================= INTERACTION HANDLER ================= */
client.on("interactionCreate", async (i) => {
  try {
    if (i.guildId && i.guildId !== config.serverId) return;

    // SLASH COMMANDS
    if (i.isCommand()) {
      const cmd = i.commandName;

      if (cmd === "perfil") {
        const targetUser = i.options.getUser("usuario");
        const member = await i.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) return i.reply({ content: "❌ Usuario no encontrado", ephemeral: true });

        const roles = utils.getUserRoles(member);
        if (!roles || roles.length === 0) {
          return i.reply({ content: "❌ El usuario no tiene roles válidos para reseñas.", ephemeral: true });
        }

        const userData = db.get(member.id) || { reviews: [], stars: {}, reported: 0 };
        const stats = utils.calculateStarDistribution(userData.reviews);

        const total = userData.reviews.length;
        const avg = total > 0 ? 
          (userData.reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(2) : 
          "0.00";

        const recommended = (userData.stars[4] || 0) + (userData.stars[5] || 0);
        const negative = (userData.stars[1] || 0) + (userData.stars[2] || 0);
        const trust = total > 0 ? Math.round((recommended / total) * 100) : 100;

        const roleNames = roles.map(r => `${r.emoji} ${r.name}`).join(", ");

        const userAchievements = db.getAchievements(member.id);
        const userRoles = roles.map(r => r.name);
        const achievementsForRoles = ACHIEVEMENTS.filter(a => userRoles.includes(a.role));
        const unlockedCount = userAchievements.filter(a => achievementsForRoles.some(ach => ach.id === a.id)).length;

        let description = total === 0 ? 
          `${config.stars.icon} **Sin reseñas aún**` : 
          `${config.stars.icon} **Calificación:** \`${avg}/5\`\n${utils.createStarsBar(parseFloat(avg))}`;

        let starDistribution = "";
        for (let i = 5; i >= 1; i--) {
          const count = stats.distribution[i] || 0;
          const percent = stats.percentages[i] || "0.0";
          const bar = utils.createStarPercentageBar(percent);
          starDistribution += `${config.stars.icon.repeat(i)} ${bar} ${percent}% (${count})\n`;
        }

        const embed = new EmbedBuilder()
          .setTitle(`${config.stars.animated} ${member.user.username}`)
          .setDescription(description)
          .addFields(
            { name: "📋 Roles", value: roleNames, inline: false },
            { name: "📝 Total Reseñas", value: `${total}`, inline: true },
            { name: "👍 Recomendadas (4★+)", value: `${recommended}`, inline: true },
            { name: "⭐ Promedio", value: `${avg}/5`, inline: true },
            { name: "🛡️ Confianza", value: `${trust}%`, inline: true },
            { name: "📛 Críticas y Reportes", value: `Críticas: ${negative} | Reportes: ${userData.reported || 0}`, inline: true },
            { name: "🏆 Logros", value: `${unlockedCount}/${achievementsForRoles.length}`, inline: true },
            { name: "📊 Distribución de Estrellas", value: starDistribution || "No hay reseñas", inline: false }
          )
          .setColor(roles[0]?.color || "Blue")
          .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`review_${member.id}_${i.user.id}`)
            .setLabel("✍️ Reseña")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`report_${member.id}_${i.user.id}`)
            .setLabel("🚩 Reportar")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`achievements_menu_${member.id}_${i.user.id}`)
            .setLabel("🏆 Logros")
            .setStyle(ButtonStyle.Success)
        );

        return i.reply({ embeds: [embed], components: [row] });
      }

      else if (cmd === "top") {
        const type = i.options.getString("tipo") || "stars";
        const role = i.options.getString("rol") || "general";

        const categoryMap = { 
          staff: "1430002824305180814", 
          trial: "1432195295378407454", 
          helper: "1446861161088684164", 
          mm: "1430002835910561903" 
        };

        let roleId = null, title = "🏆 Top 10 General", color = "Blue";
        if (role !== "general" && categoryMap[role]) {
          roleId = categoryMap[role];
          const roleInfo = config.roleMapping[roleId];
          title = `${roleInfo.emoji} Top 10 ${roleInfo.name}`;
          color = roleInfo.color;
        }

        const top = db.getTopByRole(roleId, type);
        if (top.length === 0) return i.reply({ content: "❌ No hay reseñas registradas.", ephemeral: true });

        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(top.map((u, idx) => {
            const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
            const stat = type === "stars" ? `⭐ ${u.avg}` : `📝 ${u.reviews} reseñas`;
            return `${medal} **${u.name}** - ${stat}`;
          }).join("\n"))
          .setColor(color)
          .setFooter({ text: `Ordenado por ${type === "stars" ? "estrellas" : "cantidad de reseñas"}` })
          .setTimestamp();

        const buttonRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`top_switch_${role}_${type}_${i.user.id}`)
            .setLabel(type === "stars" ? "📝 Ver por Reseñas" : "⭐ Ver por Estrellas")
            .setStyle(ButtonStyle.Primary)
        );

        return i.reply({ embeds: [embed], components: [buttonRow] });
      }

      else if (cmd === "estadisticas") {
        const roleId = i.options.getString("rol");
        const roleInfo = config.roleMapping[roleId];
        const stats = db.getStatsByRole(roleId);

        const embed = new EmbedBuilder()
          .setTitle(`${roleInfo.emoji} Estadísticas - ${roleInfo.name}`)
          .addFields(
            { name: "👥 Usuarios Activos", value: `${stats.totalUsers}`, inline: true },
            { name: "📝 Total Reseñas", value: `${stats.totalReviews}`, inline: true },
            { name: "⭐ Promedio General", value: `${stats.avgRating}/5`, inline: true },
            { name: "👍 Recomendadas (4★+)", value: `${stats.recommended}`, inline: true },
            { name: "📛 Críticas (1★+2★)", value: `${stats.negative}`, inline: true },
            { name: "🛡️ Confianza", value: `${stats.avgTrust}%`, inline: true },
            { name: "🏆 Mejor Calificado", value: stats.bestRated !== "N/A" ? `${stats.bestRated}` : "N/A", inline: true },
            { name: "📊 5 Estrellas", value: `${stats.mostRated}%`, inline: true },
            { name: "📈 Actividad", value: stats.totalReviews > 0 ? "✅ Activo" : "❌ Inactivo", inline: true }
          )
          .setColor(roleInfo.color)
          .setFooter({ text: "ZERO MEGA 2.0.4 | Estadísticas balanceadas" })
          .setTimestamp();

        return i.reply({ embeds: [embed] });
      }

      else if (cmd === "reportes") {
        if (!i.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
          return i.reply({ 
            content: "❌ Solo el staff puede ver los reportes.", 
            ephemeral: true 
          });
        }

        const allReports = reports.getAll();
        if (allReports.length === 0) {
          return i.reply({ content: "✅ No hay reportes registrados.", ephemeral: true });
        }

        const recentReports = allReports.slice(-10).reverse();

        const embed = new EmbedBuilder()
          .setTitle("🚩 Últimos 10 Reportes")
          .setDescription(recentReports.map((r, idx) => {
            const date = new Date(r.date);
            return `**${idx + 1}.** <@${r.userId}> reportado por **${r.reportedByName}**\n📅 ${date.toLocaleDateString()} ${date.toLocaleTimeString()}\n📝 **Razón:** ${r.reason.substring(0, 150)}${r.reason.length > 150 ? '...' : ''}`;
          }).join("\n\n"))
          .setColor("Red")
          .setFooter({ text: `Total reportes: ${allReports.length}` })
          .setTimestamp();

        return i.reply({ embeds: [embed], ephemeral: true });
      }

      else if (cmd === "logros") {
        const targetUser = i.options.getUser("usuario") || i.user;
        const member = await i.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) return i.reply({ content: "❌ Usuario no encontrado", ephemeral: true });

        const roles = utils.getUserRoles(member);
        if (roles.length === 0) {
          return i.reply({ content: "❌ Este usuario no tiene roles válidos.", ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setTitle(`🏆 Logros de ${member.user.username}`)
          .setDescription(`Selecciona un rol para ver los logros específicos:`)
          .setColor("Gold")
          .setTimestamp();

        const buttons = [
          new ButtonBuilder()
            .setCustomId(`back_to_profile_${member.id}_${i.user.id}`)
            .setLabel("👤 Perfil")
            .setStyle(ButtonStyle.Secondary)
        ];

        for (const role of roles) {
          buttons.push(
            new ButtonBuilder()
              .setCustomId(`view_role_achievements_${member.id}_${role.id}_${i.user.id}`)
              .setLabel(`${role.emoji} ${role.name}`)
              .setStyle(ButtonStyle.Primary)
          );
        }

        const rows = [];
        for (let idx = 0; idx < buttons.length; idx += 5) {
          rows.push(new ActionRowBuilder().addComponents(buttons.slice(idx, idx + 5)));
        }

        return i.reply({ embeds: [embed], components: rows });
      }

      else if (cmd === "ayuda") {
        const embed = new EmbedBuilder()
          .setTitle("❓ Sistema de Reseñas ZERO MEGA 2.0.4")
          .setDescription("**Sistema dual:** Usa comandos `.` (prefix) o `/` (slash)")
          .addFields(
            { 
              name: "📋 9 Comandos Disponibles", 
              value: [
                "`.perfil @usuario` o `/perfil` - Ver perfil completo",
                "`.top [stars/reviews] [rol]` o `/top` - Ranking de usuarios",
                "`.estadisticas <rol>` o `/estadisticas` - Estadísticas por rol",
                "`.logros [@usuario]` o `/logros` - Ver logros",
                "`/reportes` - Ver reportes (solo staff)",
                "`.ayuda` o `/ayuda` - Esta ayuda",
                "`.version` o `/version` - Información del bot",
                "`/global` - Estadísticas globales",
                "`/reseñas @usuario` - Ver reseñas específicas"
              ].join("\n"), 
              inline: false 
            },
            { 
              name: "⭐ Características Principales", 
              value: [
                "• Sistema de reseñas balanceado",
                "• Top por estrellas o cantidad de reseñas",
                "• Logros específicos por rol",
                "• Sistema de reportes integrado",
                "• Estadísticas como Play Store",
                "• Cooldowns aleatorios (3-9 min)",
                "• Validación anti-cuentas falsas"
              ].join("\n"), 
              inline: false 
            }
          )
          .setColor("Blue")
          .setTimestamp();

        return i.reply({ embeds: [embed] });
      }

      else if (cmd === "version") {
        const embed = new EmbedBuilder()
          .setTitle("🤖 ZERO MEGA 2.0.4 PLUS ++++ OMEGA")
          .setDescription("Sistema de Reseñas Ultra Avanzado - Bugs Corregidos")
          .addFields(
            { name: "Versión", value: "2.0.4 PLUS ++++ OMEGA", inline: true },
            { name: "Lenguaje", value: "Node.js (JavaScript)", inline: true },
            { name: "Developer", value: "ultra3_dev", inline: true },
            { name: "Ideas", value: "samuu.zlp", inline: true },
            { name: "Testers", value: "samuu.zlp, ultra3_dev, marco_izx.", inline: true },
            { 
              name: "🛠️ Correcciones Implementadas", 
              value: [
                "1. **Estadísticas balanceadas** - Porcentaje de confianza y críticas corregido",
                "2. **Top funcionando** - Por estrellas y por reseñas",
                "3. **Botones restringidos** - Solo el autor puede usarlos",
                "4. **Logros por rol** - Solo para roles que tiene el usuario",
                "5. **Bug estadísticas** - Ahora muestra reseñas de todos los usuarios con el rol",
                "6. **Reseñas múltiples roles** - Sistema completamente funcional"
              ].join("\n\n"), 
              inline: false 
            }
          )
          .setColor("Purple")
          .setTimestamp();

        return i.reply({ embeds: [embed] });
      }

      else if (cmd === "global") {
        const stats = db.getGlobalStats();

        const embed = new EmbedBuilder()
          .setTitle("🌍 Estadísticas Globales del Sistema")
          .addFields(
            { name: "👥 Usuarios Registrados", value: `${stats.totalUsers}`, inline: true },
            { name: "📈 Usuarios Activos", value: `${stats.activeUsers}`, inline: true },
            { name: "📝 Total Reseñas", value: `${stats.totalReviews}`, inline: true },
            { name: "⭐ Promedio Global", value: `${stats.avgRating}/5`, inline: true },
            { name: "🚩 Reportes Totales", value: `${stats.totalReports}`, inline: true },
            { name: "🏆 Logros Desbloqueados", value: `${stats.totalAchievements}`, inline: true },
            { 
              name: "📊 Usuarios Más Reseñados", 
              value: stats.mostReviewed.map((u, idx) => 
                `${idx + 1}. **${u.name}** - ${u.reviews} reseñas (⭐ ${u.avg})`
              ).join("\n") || "No hay datos", 
              inline: false 
            }
          )
          .setColor("Purple")
          .setFooter({ text: "ZERO MEGA 2.0.4 PLUS ++++ OMEGA" })
          .setTimestamp();

        return i.reply({ embeds: [embed] });
      }

      else if (cmd === "reseñas") {
        const targetUser = i.options.getUser("usuario");
        const page = i.options.getNumber("pagina") || 1;
        const perPage = 5;

        const userData = db.get(targetUser.id);
        if (!userData || !userData.reviews || userData.reviews.length === 0) {
          return i.reply({ 
            content: `❌ ${targetUser.username} no tiene reseñas registradas.`, 
            ephemeral: true 
          });
        }

        const totalReviews = userData.reviews.length;
        const totalPages = Math.ceil(totalReviews / perPage);
        const currentPage = Math.min(Math.max(page, 1), totalPages);
        const startIdx = (currentPage - 1) * perPage;
        const endIdx = startIdx + perPage;
        const pageReviews = userData.reviews.slice(startIdx, endIdx).reverse();

        const embed = new EmbedBuilder()
          .setTitle(`📝 Reseñas de ${targetUser.username}`)
          .setDescription(`**Página ${currentPage}/${totalPages}** • ${totalReviews} reseñas totales`)
          .setColor("Gold")
          .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
          .setTimestamp();

        pageReviews.forEach((review, idx) => {
          const date = new Date(review.date);
          const roleInfo = config.roleMapping[review.roleId] || { name: "Desconocido", emoji: "❓" };

          embed.addFields({
            name: `${config.stars.icon.repeat(Math.round(review.rating))} ${review.rating}/5 • ${roleInfo.emoji} ${roleInfo.name}`,
            value: `**Por:** ${review.authorName}\n**Fecha:** ${date.toLocaleDateString()}\n**Comentario:** ${review.text.substring(0, 200)}${review.text.length > 200 ? '...' : ''}`,
            inline: false
          });
        });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`prev_page_${targetUser.id}_${currentPage}_${i.user.id}`)
            .setLabel("◀️ Anterior")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage <= 1),
          new ButtonBuilder()
            .setCustomId(`next_page_${targetUser.id}_${currentPage}_${i.user.id}`)
            .setLabel("Siguiente ▶️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage >= totalPages)
        );

        return i.reply({ embeds: [embed], components: [row] });
      }
    }

    // BOTONES
    if (i.isButton()) {
      const parts = i.customId.split("_");
      const buttonType = parts[0];
      const authorId = parts[parts.length - 1];

      // Verificar que solo el autor pueda usar los botones
      if (i.user.id !== authorId) {
        return i.reply({ 
          content: "❌ Solo el autor de este mensaje puede usar estos botones.", 
          ephemeral: true 
        });
      }

      // REVIEW BUTTON
      if (buttonType === "review") {
        const targetId = parts[1];

        if (cooldowns.hasRecentAttempt(i.user.id)) {
          return i.reply({ 
            content: "⚠️ Ya tienes un formulario de reseña abierto. Cierra el anterior primero.", 
            ephemeral: true 
          });
        }

        cooldowns.setAttempt(i.user.id);

        const member = await i.guild.members.fetch(i.user.id);
        const target = await i.guild.members.fetch(targetId).catch(() => null);
        const targetRoles = utils.getUserRoles(target);

        if (!target || !targetRoles.length) {
          cooldowns.clearAttempt(i.user.id);
          return i.reply({ content: "❌ Usuario no válido", ephemeral: true });
        }

        if (target.id === i.user.id) {
          cooldowns.clearAttempt(i.user.id);
          return i.reply({ content: "❌ No puedes reseñarte a ti mismo", ephemeral: true });
        }

        if (!utils.isValidAlt(member)) {
          cooldowns.clearAttempt(i.user.id);
          return i.reply({ 
            content: "🛑 Requisitos: +7 días de antigüedad, avatar personalizado, 2+ roles en el servidor", 
            ephemeral: true 
          });
        }

        const cd = cooldowns.check(i.user.id);
        if (cd.active) {
          cooldowns.clearAttempt(i.user.id);
          return i.reply({ 
            content: `⏳ Espera ${utils.formatTime(cd.remaining)} antes de dejar otra reseña.`, 
            ephemeral: true 
          });
        }

        const expiry = db.getReviewCooldownExpiry(targetId, i.user.id);
        if (expiry && expiry > Date.now()) {
          cooldowns.clearAttempt(i.user.id);
          return i.reply({ 
            content: `⚠️ Ya reseñaste a este usuario recientemente. Espera ${utils.formatTime(expiry - Date.now())}.`, 
            ephemeral: true 
          });
        }

        if (targetRoles.length > 1) {
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`select_review_role_${target.id}_${authorId}`)
            .setPlaceholder("Selecciona el rol a calificar")
            .addOptions(
              targetRoles.map(role => ({
                label: role.name,
                description: `Calificar como ${role.name}`,
                value: role.id,
                emoji: role.emoji
              }))
            );

          const row = new ActionRowBuilder().addComponents(selectMenu);

          const embed = new EmbedBuilder()
            .setTitle(`Seleccionar Rol - ${target.user.username}`)
            .setDescription(`**${target.user.username}** tiene ${targetRoles.length} roles. Selecciona cuál quieres calificar:`)
            .setColor("Blue")
            .addFields(
              targetRoles.map(role => ({
                name: `${role.emoji} ${role.name}`,
                value: "▸ Selecciona en el menú desplegable",
                inline: true
              }))
            )
            .setTimestamp();

          return i.reply({ embeds: [embed], components: [row], ephemeral: true });
        }

        const targetRole = targetRoles[0];
        const modal = new ModalBuilder()
          .setCustomId(`modal_${target.id}_${targetRole.id}_${authorId}`)
          .setTitle(`Reseña para ${target.user.username}`);

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("text")
              .setLabel("Tu experiencia (20-500 caracteres)")
              .setStyle(TextInputStyle.Paragraph)
              .setMinLength(config.minReviewLength)
              .setMaxLength(config.maxReviewLength)
              .setRequired(true)
              .setPlaceholder("Describe tu experiencia con este miembro...")
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("stars")
              .setLabel("Calificación (1.0 - 5.0)")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("Ej: 4.5 (decimales permitidos)")
              .setMinLength(1)
              .setMaxLength(4)
              .setRequired(true)
          )
        );

        return i.showModal(modal);
      }

      // REPORT BUTTON
      else if (buttonType === "report") {
        const targetId = parts[1];

        const modal = new ModalBuilder()
          .setCustomId(`report_modal_${targetId}_${authorId}`)
          .setTitle("🚩 Reportar Usuario");

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("reason")
              .setLabel("Razón del reporte (10-500 caracteres)")
              .setStyle(TextInputStyle.Paragraph)
              .setMinLength(10)
              .setMaxLength(500)
              .setRequired(true)
          )
        );

        return i.showModal(modal);
      }

      // ACHIEVEMENTS MENU BUTTON
      else if (buttonType === "achievements") {
        const targetId = parts[2];

        const target = await i.guild.members.fetch(targetId).catch(() => null);
        if (!target) return i.reply({ content: "❌ Usuario no encontrado", ephemeral: true });

        const roles = utils.getUserRoles(target);
        if (roles.length === 0) {
          return i.reply({ content: "❌ Este usuario no tiene roles válidos.", ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setTitle(`🏆 Logros de ${target.user.username}`)
          .setDescription(`Selecciona un rol para ver los logros específicos:`)
          .setColor("Gold")
          .setTimestamp();

        const buttons = [
          new ButtonBuilder()
            .setCustomId(`back_to_profile_${targetId}_${authorId}`)
            .setLabel("👤 Perfil")
            .setStyle(ButtonStyle.Secondary)
        ];

        for (const role of roles) {
          buttons.push(
            new ButtonBuilder()
              .setCustomId(`view_role_achievements_${targetId}_${role.id}_${authorId}`)
              .setLabel(`${role.emoji} ${role.name}`)
              .setStyle(ButtonStyle.Primary)
          );
        }

        const rows = [];
        for (let idx = 0; idx < buttons.length; idx += 5) {
          rows.push(new ActionRowBuilder().addComponents(buttons.slice(idx, idx + 5)));
        }

        return i.update({ embeds: [embed], components: rows });
      }

      // TOP SWITCH BUTTON
      else if (buttonType === "top") {
        const roleArg = parts[2];
        const currentType = parts[3];

        const newType = currentType === "stars" ? "reviews" : "stars";

        const categoryMap = { 
          staff: "1430002824305180814", 
          trial: "1432195295378407454", 
          helper: "1446861161088684164", 
          mm: "1430002835910561903" 
        };

        let roleId = null, title = "🏆 Top 10 General", color = "Blue";
        if (roleArg !== "general" && categoryMap[roleArg]) {
          roleId = categoryMap[roleArg];
          const roleInfo = config.roleMapping[roleId];
          title = `${roleInfo.emoji} Top 10 ${roleInfo.name}`;
          color = roleInfo.color;
        }

        const top = db.getTopByRole(roleId, newType);
        if (top.length === 0) {
          return i.update({ content: "❌ No hay reseñas registradas.", embeds: [], components: [] });
        }

        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(top.map((u, idx) => {
            const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
            const stat = newType === "stars" ? `⭐ ${u.avg}` : `📝 ${u.reviews} reseñas`;
            return `${medal} **${u.name}** - ${stat}`;
          }).join("\n"))
          .setColor(color)
          .setFooter({ text: `Ordenado por ${newType === "stars" ? "estrellas" : "cantidad de reseñas"}` })
          .setTimestamp();

        const buttonRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`top_switch_${roleArg}_${newType}_${authorId}`)
            .setLabel(newType === "stars" ? "📝 Ver por Reseñas" : "⭐ Ver por Estrellas")
            .setStyle(ButtonStyle.Primary)
        );

        return i.update({ embeds: [embed], components: [buttonRow] });
      }

      // PREV/NEXT PAGE BUTTONS
      else if (buttonType === "prev" || buttonType === "next") {
        const targetId = parts[2];
        const currentPage = parseInt(parts[3]);
        const newPage = buttonType === "prev" ? currentPage - 1 : currentPage + 1;
        const perPage = 5;

        const userData = db.get(targetId);
        if (!userData || !userData.reviews || userData.reviews.length === 0) {
          return i.update({ content: "❌ No hay reseñas registradas.", components: [] });
        }

        const totalReviews = userData.reviews.length;
        const totalPages = Math.ceil(totalReviews / perPage);
        const startIdx = (newPage - 1) * perPage;
        const endIdx = startIdx + perPage;
        const pageReviews = userData.reviews.slice(startIdx, endIdx).reverse();

        const target = await i.guild.members.fetch(targetId).catch(() => null);
        if (!target) return i.update({ content: "❌ Usuario no encontrado", components: [] });

        const embed = new EmbedBuilder()
          .setTitle(`📝 Reseñas de ${target.user.username}`)
          .setDescription(`**Página ${newPage}/${totalPages}** • ${totalReviews} reseñas totales`)
          .setColor("Gold")
          .setThumbnail(target.user.displayAvatarURL({ size: 128 }))
          .setTimestamp();

        pageReviews.forEach((review, idx) => {
          const date = new Date(review.date);
          const roleInfo = config.roleMapping[review.roleId] || { name: "Desconocido", emoji: "❓" };

          embed.addFields({
            name: `${config.stars.icon.repeat(Math.round(review.rating))} ${review.rating}/5 • ${roleInfo.emoji} ${roleInfo.name}`,
            value: `**Por:** ${review.authorName}\n**Fecha:** ${date.toLocaleDateString()}\n**Comentario:** ${review.text.substring(0, 150)}${review.text.length > 150 ? '...' : ''}`,
            inline: false
          });
        });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`prev_page_${targetId}_${newPage}_${authorId}`)
            .setLabel("◀️ Anterior")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(newPage <= 1),
          new ButtonBuilder()
            .setCustomId(`next_page_${targetId}_${newPage}_${authorId}`)
            .setLabel("Siguiente ▶️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(newPage >= totalPages)
        );

        return i.update({ embeds: [embed], components: [row] });
      }

      // BACK TO PROFILE BUTTON
      else if (buttonType === "back") {
        const targetId = parts[3];

        const target = await i.guild.members.fetch(targetId).catch(() => null);
        if (!target) return i.reply({ content: "❌ Usuario no encontrado", ephemeral: true });

        const roles = utils.getUserRoles(target);
        if (roles.length === 0) {
          return i.reply({ content: "❌ El usuario no tiene roles válidos.", ephemeral: true });
        }

        const userData = db.get(target.id) || { reviews: [], stars: {}, reported: 0 };
        const stats = utils.calculateStarDistribution(userData.reviews);

        const total = userData.reviews.length;
        const avg = total > 0 ? 
          (userData.reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(2) : 
          "0.00";

        const recommended = (userData.stars[4] || 0) + (userData.stars[5] || 0);
        const negative = (userData.stars[1] || 0) + (userData.stars[2] || 0);
        const trust = total > 0 ? Math.round((recommended / total) * 100) : 100;

        const roleNames = roles.map(r => `${r.emoji} ${r.name}`).join(", ");

        const userAchievements = db.getAchievements(target.id);
        const userRoles = roles.map(r => r.name);
        const achievementsForRoles = ACHIEVEMENTS.filter(a => userRoles.includes(a.role));
        const unlockedCount = userAchievements.filter(a => achievementsForRoles.some(ach => ach.id === a.id)).length;

        let description = total === 0 ? 
          `${config.stars.icon} **Sin reseñas aún**` : 
          `${config.stars.icon} **Calificación:** \`${avg}/5\`\n${utils.createStarsBar(parseFloat(avg))}`;

        let starDistribution = "";
        for (let i = 5; i >= 1; i--) {
          const count = stats.distribution[i] || 0;
          const percent = stats.percentages[i] || "0.0";
          const bar = utils.createStarPercentageBar(percent);
          starDistribution += `${config.stars.icon.repeat(i)} ${bar} ${percent}% (${count})\n`;
        }

        const embed = new EmbedBuilder()
          .setTitle(`${config.stars.animated} ${target.user.username}`)
          .setDescription(description)
          .addFields(
            { name: "📋 Roles", value: roleNames, inline: false },
            { name: "📝 Total Reseñas", value: `${total}`, inline: true },
            { name: "👍 Recomendadas (4★+)", value: `${recommended}`, inline: true },
            { name: "⭐ Promedio", value: `${avg}/5`, inline: true },
            { name: "🛡️ Confianza", value: `${trust}%`, inline: true },
            { name: "📛 Críticas y Reportes", value: `Críticas: ${negative} | Reportes: ${userData.reported || 0}`, inline: true },
            { name: "🏆 Logros", value: `${unlockedCount}/${achievementsForRoles.length}`, inline: true },
            { name: "📊 Distribución de Estrellas", value: starDistribution || "No hay reseñas", inline: false }
          )
          .setColor(roles[0]?.color || "Blue")
          .setThumbnail(target.user.displayAvatarURL({ size: 256 }))
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`review_${target.id}_${authorId}`)
            .setLabel("✍️ Reseña")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`report_${target.id}_${authorId}`)
            .setLabel("🚩 Reportar")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`achievements_menu_${target.id}_${authorId}`)
            .setLabel("🏆 Logros")
            .setStyle(ButtonStyle.Success)
        );

        return i.update({ embeds: [embed], components: [row] });
      }

      // VIEW ROLE ACHIEVEMENTS BUTTON
      else if (buttonType === "view") {
        const targetId = parts[3];
        const roleId = parts[4];

        const target = await i.guild.members.fetch(targetId).catch(() => null);
        if (!target) return i.reply({ content: "❌ Usuario no encontrado", ephemeral: true });

        const roleInfo = config.roleMapping[roleId];
        if (!roleInfo) return i.reply({ content: "❌ Rol no válido", ephemeral: true });

        const roleAchievements = ACHIEVEMENTS.filter(a => a.role === roleInfo.name);
        const userAchievements = db.getAchievements(targetId);
        const unlockedIds = userAchievements.map(a => a.id);

        const unlockedForRole = roleAchievements.filter(a => unlockedIds.includes(a.id));
        const pendingForRole = roleAchievements.filter(a => !unlockedIds.includes(a.id));

        const embed = new EmbedBuilder()
          .setTitle(`${roleInfo.emoji} Logros de ${roleInfo.name} - ${target.user.username}`)
          .setDescription(`**Desbloqueados:** ${unlockedForRole.length}/9\n**Pendientes:** ${pendingForRole.length}\n\n*Cada rol tiene 9 logros con diferentes dificultades*`)
          .setColor(roleInfo.color)
          .setTimestamp();

        if (unlockedForRole.length > 0) {
          embed.addFields({
            name: "✅ Desbloqueados",
            value: unlockedForRole.map(a => 
              `${a.emoji} **${a.name}**\n${a.description} (*${a.difficulty}*)`
            ).join("\n\n"),
            inline: true
          });
        }

        if (pendingForRole.length > 0) {
          embed.addFields({
            name: "🔒 Pendientes",
            value: pendingForRole.map(a => 
              `🔒 **${a.name}**\n${a.description} (*${a.difficulty}*)`
            ).join("\n\n"),
            inline: true
          });
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`back_to_profile_${targetId}_${authorId}`)
            .setLabel("👤 Volver al Perfil")
            .setStyle(ButtonStyle.Secondary)
        );

        return i.update({ embeds: [embed], components: [row] });
      }
    }

    // SELECT MENUS
    if (i.isStringSelectMenu()) {
      if (i.customId.startsWith("select_review_role_")) {
        const parts = i.customId.split("_");
        const targetId = parts[3];
        const authorId = parts[4];

        if (i.user.id !== authorId) {
          return i.reply({ 
            content: "❌ Solo el autor de este mensaje puede usar este menú.", 
            ephemeral: true 
          });
        }

        const roleId = i.values[0];
        const target = await i.guild.members.fetch(targetId).catch(() => null);
        const targetRole = config.roleMapping[roleId];

        if (!target || !targetRole) {
          cooldowns.clearAttempt(i.user.id);
          return i.reply({ content: "❌ Rol o usuario no válido", ephemeral: true });
        }

        const modal = new ModalBuilder()
          .setCustomId(`modal_${targetId}_${roleId}_${authorId}`)
          .setTitle(`Reseña para ${target.user.username} (${targetRole.name})`);

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("text")
              .setLabel("Tu experiencia (20-500 caracteres)")
              .setStyle(TextInputStyle.Paragraph)
              .setMinLength(config.minReviewLength)
              .setMaxLength(config.maxReviewLength)
              .setRequired(true)
              .setPlaceholder("Describe tu experiencia con este miembro...")
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("stars")
              .setLabel("Calificación (1.0 - 5.0)")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("Ej: 4.5 (decimales permitidos)")
              .setMinLength(1)
              .setMaxLength(4)
              .setRequired(true)
          )
        );

        return i.showModal(modal);
      }
    }

    // MODAL SUBMISSIONS
    if (i.isModalSubmit()) {
      // REVIEW MODAL
      if (i.customId.startsWith("modal_")) {
        const parts = i.customId.split("_");
        const targetId = parts[1];
        const roleId = parts[2];
        const authorId = parts[3];

        const text = i.fields.getTextInputValue("text");
        const ratingInput = i.fields.getTextInputValue("stars");
        const rating = utils.validateRating(ratingInput);

        if (!rating) {
          cooldowns.clearAttempt(i.user.id);
          return i.reply({ 
            content: "❌ Calificación inválida. Usa números entre 1.0 y 5.0 (ej: 4.5)", 
            ephemeral: true 
          });
        }

        if (text.length < config.minReviewLength || text.length > config.maxReviewLength) {
          cooldowns.clearAttempt(i.user.id);
          return i.reply({ 
            content: `❌ La reseña debe tener entre ${config.minReviewLength} y ${config.maxReviewLength} caracteres.`, 
            ephemeral: true 
          });
        }

        try {
          const target = await i.guild.members.fetch(targetId);
          const targetRole = config.roleMapping[roleId];

          if (!targetRole) {
            cooldowns.clearAttempt(i.user.id);
            return i.reply({ content: "❌ Rol no válido", ephemeral: true });
          }

          cooldowns.setCooldown(i.user.id);

          db.addReview(targetId, {
            author: i.user.id,
            authorName: i.user.username,
            targetName: target.user.username,
            roleId: roleId,
            roleName: targetRole.name,
            rating,
            text,
            date: Date.now()
          });

          const targetRoles = utils.getUserRoles(target);
          const roleIds = targetRoles.map(r => r.id);
          const unlockedAchievements = checkAndUnlockAchievements(db, targetId, roleIds);

          const logChannel = await client.channels.fetch(config.logChannelId).catch(() => null);
          if (logChannel && logChannel.isTextBased()) {
            const logEmbed = new EmbedBuilder()
              .setTitle("📥 Nueva Reseña Registrada")
              .addFields(
                { name: "Para", value: `${target.user.username} (${targetRole.emoji} ${targetRole.name})`, inline: true },
                { name: "Calificación", value: `${config.stars.icon} ${rating}/5`, inline: true },
                { name: "Por", value: i.user.username, inline: true }
              )
              .setColor(rating >= 4 ? "Green" : rating >= 3 ? "Yellow" : "Red")
              .setTimestamp();

            if (unlockedAchievements.length > 0) {
              logEmbed.addFields({
                name: "🏆 Logros Desbloqueados",
                value: unlockedAchievements.map(a => a.name).join(", ")
              });
            }

            await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
          }

          cooldowns.clearAttempt(i.user.id);

          return i.reply({ 
            content: `✅ ¡Reseña registrada correctamente! Has calificado a ${target.user.username} con ${rating}/5 estrellas.`, 
            ephemeral: true 
          });

        } catch (error) {
          logger.error(`Error procesando reseña: ${error.message}`);
          cooldowns.clearAttempt(i.user.id);
          return i.reply({ 
            content: "❌ Error al procesar tu reseña. Intenta de nuevo.", 
            ephemeral: true 
          });
        }
      }

      // REPORT MODAL
      else if (i.customId.startsWith("report_modal_")) {
        const parts = i.customId.split("_");
        const userId = parts[2];
        const authorId = parts[3];

        const reason = i.fields.getTextInputValue("reason");

        try {
          reports.add({
            userId,
            reportedBy: i.user.id,
            reportedByName: i.user.username,
            reason,
            date: Date.now()
          });

          db.ensureUser(userId);
          db.data[userId].reported = (db.data[userId].reported || 0) + 1;
          db.save();

          const logChannel = await client.channels.fetch(config.logChannelId).catch(() => null);
          if (logChannel && logChannel.isTextBased()) {
            const repEmbed = new EmbedBuilder()
              .setTitle("🚩 Nuevo Reporte")
              .addFields(
                { name: "Usuario Reportado", value: `<@${userId}>`, inline: true },
                { name: "Reportado por", value: i.user.username, inline: true },
                { name: "Razón", value: reason.substring(0, 500), inline: false }
              )
              .setColor("Red")
              .setTimestamp();

            await logChannel.send({ embeds: [repEmbed] }).catch(() => {});
          }

          return i.reply({ 
            content: "✅ Reporte enviado correctamente. Los administradores lo revisarán pronto.", 
            ephemeral: true 
          });

        } catch (error) {
          logger.error(`Error en reporte: ${error.message}`);
          return i.reply({ 
            content: "❌ Error al enviar reporte", 
            ephemeral: true 
          });
        }
      }
    }

  } catch (err) {
    logger.error(`Error en interactionCreate: ${err.message}`);
    if (i.user) cooldowns.clearAttempt(i.user.id);
  }
});

/* ================= MAINTENANCE ================= */
setInterval(() => {
  cooldowns.cleanup();
  db.save();
  reports.save();
}, 30000);

/* ================= LOGIN ================= */
if (config.token && config.token !== "") {
  client.login(config.token).catch(error => {
    logger.error(`❌ Error al iniciar el bot: ${error.message}`);
    process.exit(1);
  });
} else {
  logger.error('❌ No se encontró el token de Discord en las variables de entorno');
  console.log('ℹ️ Añade DISCORD_TOKEN en el archivo .env');
}

// Exportar para server.js
module.exports = { client };
