// require("dotenv").config();

// const { Telegraf } = require("telegraf");
// const { TelegramClient } = require("telegram");
// const { StringSession } = require("telegram/sessions");
// const input = require("input");
// const cron = require("node-cron");
// const fs = require("fs-extra");
// const Groq = require("groq-sdk");
// const express = require("express");

// const {
//   BOT_TOKEN,
//   CHAT_ID,
//   GROQ_API_KEY,
//   MODEL,
//   API_ID,
//   API_HASH,
//   CHANNEL_USERNAME,
//   PORT,
//   CRON,
// } = process.env;

// const bot = new Telegraf(BOT_TOKEN);
// const groq = new Groq({ apiKey: GROQ_API_KEY });

// const FILE = "./posted.json";
// const SESSION_FILE = "./session.txt";


// // ======================
// // 📁 FILE
// // ======================
// async function loadPosted() {
//   try {
//     return await fs.readJson(FILE);
//   } catch {
//     return [];
//   }
// }

// async function savePosted(data) {
//   await fs.writeJson(FILE, data);
// }


// // ======================
// // 📍 FILTER БІЛА ЦЕРКВА
// // ======================
// function isBilaTserkva(text) {
//   const t = text.toLowerCase();

//   return (
//     t.includes("біла церкв") ||
//     t.includes("біла-церкв") ||
//     t.includes("білоцеркв") ||
//     t.includes("білоцерків") ||
//     t.includes("білоцерківськ") ||
//     t.includes("білоцерківський") ||
//     t.includes(" бц") ||
//     t.includes("бц ") ||
//     t.includes("узин") ||
//     t.includes("сквира") ||
//     t.includes("рокитне") ||
//     t.includes("ставище") ||
//     t.includes("тетієв") ||
//     t.includes("володарка")
//   );
// }


// // ======================
// // 🧹 CLEAN
// // ======================
// function cleanText(text) {
//   return text
//     .replace(/https?:\/\/\S+/g, "")
//     .replace(/детальніше.*$/gi, "")
//     .replace(/\n{2,}/g, "\n")
//     .trim();
// }

// function cleanAI(text) {
//   return text
//     .replace(/детальніше.*$/gi, "")
//     .replace(/джерело.*$/gi, "")
//     .trim();
// }

// function limitSentences(text, max = 2) {
//   const sentences = text
//     .replace(/\n/g, " ")
//     .split(/(?<=[.!?])\s+/);

//   return sentences.slice(0, max).join(" ");
// }


// // ======================
// // 🤖 AI
// // ======================
// async function analyzeNews(title, content) {
//   try {
//     console.log("🤖 AI аналіз...");

//     const completion = await groq.chat.completions.create({
//       model: MODEL,
//       messages: [
//         {
//           role: "system",
//           content: `Ти пишеш як телеграм-канал "Хуйова Одеса".

//             Правила:
//             - жорстко
//             - коротко
//             - трохи сленг
//             - без офіціозу

//             Формат:
//             1 речення заголовок
//             2-4 рядки опис

//             JSON (якщо можеш):
//             { "status": "OK", "title": "...", "summary": "...", "emoji": "🔥" }`,
//         },
//         {
//           role: "user",
//           content: `Заголовок: ${title}\n\n${content.slice(0, 1500)}`,
//         },
//       ],
//       temperature: 0.7,
//     });

//     const text = completion.choices?.[0]?.message?.content?.trim();

//     console.log("🧠 AI raw:", text);

//     if (!text || text.toLowerCase().includes("skip")) {
//       return { status: "SKIP" };
//     }

//     // пробуємо JSON
//     const match = text.match(/\{[\s\S]*\}/);
//     if (match) return JSON.parse(match[0]);

//     // fallback
//     const lines = text.split("\n").filter(Boolean);

//     return {
//       status: "OK",
//       title: lines[0],
//       summary: lines.slice(1).join(" "),
//       emoji: "🚨",
//     };
//   } catch (e) {
//     console.log("❌ Groq error:", e.message);
//     return { status: "SKIP" };
//   }
// }


// // ======================
// // 📡 TELEGRAM CLIENT
// // ======================
// async function initClient() {
//   let session = "";

//   if (await fs.pathExists(SESSION_FILE)) {
//     session = await fs.readFile(SESSION_FILE, "utf-8");
//   }

//   const client = new TelegramClient(
//     new StringSession(session),
//     Number(API_ID),
//     API_HASH,
//     { connectionRetries: 5 }
//   );

//   await client.start({
//     phoneNumber: async () => await input.text("📱 Phone: "),
//     password: async () => await input.text("🔐 2FA: "),
//     phoneCode: async () => await input.text("📩 Code: "),
//   });

//   await fs.writeFile(SESSION_FILE, client.session.save());

//   console.log("✅ Telegram connected");

//   return client;
// }


// // ======================
// // 📥 POSTS
// // ======================
// async function getPosts(client) {
//   const entity = await client.getEntity(CHANNEL_USERNAME);

//   const messages = await client.getMessages(entity, {
//     limit: 6,
//   });

//   return messages.reverse();
// }


// // ======================
// // 📸 ALBUM FIX (ПОКРАЩЕНО)
// // ======================
// async function getAlbum(client, entity, msg) {
//   if (!msg.groupedId) return [msg];

//   try {
//     // Беремо повідомлення навколо поточного (±50)
//     const around = await client.getMessages(entity, {
//       limit: 100,
//       offsetId: msg.id,
//       addOffset: -50,
//     });

//     const album = around.filter(m => m.groupedId === msg.groupedId);

//     // Сортуємо за ID, щоб порядок фото був правильний
//     album.sort((a, b) => a.id - b.id);

//     console.log(`📸 Альбом: знайдено ${album.length} повідомлень`);
//     return album.length > 0 ? album : [msg];
//   } catch (e) {
//     console.log("⚠️ Помилка отримання альбому:", e.message);
//     return [msg]; // fallback: тільки поточне
//   }
// }


// // ======================
// // 🖼 IMAGES (ПОКРАЩЕНО)
// // ======================
// async function getImages(client, messages) {
//   const images = [];

//   for (const msg of messages) {
//     try {
//       let media;

//       // 1. Пряме поле photo
//       if (msg.photo) {
//         media = msg.photo;
//       }
//       // 2. media.photo (альбоми, стислі фото)
//       else if (msg.media?.photo) {
//         media = msg.media.photo;
//       }
//       // 3. Документ із зображенням
//       else if (msg.media?.document) {
//         const mime = msg.media.document.mimeType || "";
//         if (mime.startsWith("image/")) {
//           media = msg.media.document;
//         }
//       }

//       if (media) {
//         const buffer = await client.downloadMedia(media, {
//           progressCallback: () => {}, // зменшує помилки таймауту
//         });
//         if (buffer) {
//           images.push(buffer);
//           console.log(`🖼 Фото завантажено: ${msg.id}`);
//         }
//       }
//     } catch (e) {
//       console.log(`⚠️ Помилка завантаження фото (${msg.id}):`, e.message);
//     }
//   }

//   return images;
// }


// // ======================
// // 🚀 MAIN
// // ======================
// async function run(client) {
//   const entity = await client.getEntity(CHANNEL_USERNAME);
//   console.log("⏰ Перевірка Telegram...");

//   const posted = await loadPosted();
//   const messages = await getPosts(client);

//   for (const msg of messages) {
//     try {
//       if (!msg.message) continue;

//       const id = msg.id.toString();
//       if (posted.includes(id)) continue;

//       const raw = msg.message;
//       const content = cleanText(raw);
//       const titleRaw = content.slice(0, 80);

//       // 📍 ФІЛЬТР БЦ
//       if (!isBilaTserkva(content)) {
//         console.log("📍 Не БЦ:", titleRaw);
//         posted.push(id);
//         continue;
//       }

//       console.log("📰", titleRaw);

//       const ai = await analyzeNews(titleRaw, content);

//       if (ai.status === "SKIP") {
//         posted.push(id);
//         continue;
//       }

//       let summary = cleanAI(ai.summary);
//       summary = limitSentences(summary, 2);

//       const emoji = ai.emoji || "🟡";

//       const message = `${emoji} <b>${ai.title}</b>

// ${summary}

// ✅ <a href="https://t.me/huyova_bila_tserkva">Хуйова Біла Церква</a> | <a href="https://t.me/xy_dmin">Прислати новину</a>`;

//  const albumMessages = await getAlbum(client, entity, msg);

// const images = await getImages(client, albumMessages);
// console.log(`🖼 Всього фото для поста: ${images.length}`);

//       try {
//         if (images.length === 1) {
//           await bot.telegram.sendPhoto(
//             CHAT_ID,
//             { source: images[0], filename: "image.jpg" },
//             {
//               caption: message,
//               parse_mode: "HTML",
//             }
//           );
//         } else if (images.length > 1) {
//           const mediaGroup = images.map((img, i) => ({
//             type: "photo",
//             media: { source: img, filename: `img${i}.jpg` },
//             caption: i === 0 ? message : undefined,
//             parse_mode: "HTML",
//           }));

//           await bot.telegram.sendMediaGroup(CHAT_ID, mediaGroup);
//         } else {
//           throw new Error("no image");
//         }
//       } catch {
//         await bot.telegram.sendMessage(CHAT_ID, message, {
//           parse_mode: "HTML",
//         });
//       }

//       console.log("✅ Опубліковано");

//       posted.push(id);

//       await new Promise(r => setTimeout(r, 2000));
//     } catch (e) {
//       console.log("Item error:", e.message);
//     }
//   }

//   await savePosted(posted.slice(-500));
// }


// // ======================
// // 🌐 SERVER
// // ======================
// const app = express();
// app.get("/", (req, res) => res.send("Бот працює 🚀"));

// app.listen(PORT || 3000, () =>
//   console.log(`🚀 Server running on ${PORT || 3000}`)
// );


// // ======================
// // ▶️ START
// // ======================
// (async () => {
//   const client = await initClient();

//   cron.schedule(CRON || "*/10 * * * *", () => run(client));

//   await run(client);
// })();




require("dotenv").config();

const { Telegraf } = require("telegraf");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const cron = require("node-cron");
const fs = require("fs-extra");
const Groq = require("groq-sdk");
const express = require("express");
const { Redis } = require("@upstash/redis");

const {
  BOT_TOKEN,
  CHAT_ID,
  GROQ_API_KEY,
  MODEL,
  API_ID,
  API_HASH,
  CHANNEL_USERNAME,
  PORT,
  CRON,
  SESSION,
  UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN,
} = process.env;

const bot = new Telegraf(BOT_TOKEN);
const groq = new Groq({ apiKey: GROQ_API_KEY });

const redis = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN,
});

// ======================
// 📍 FILTER БІЛА ЦЕРКВА
// ======================
function isBilaTserkva(text) {
  const t = text.toLowerCase();

  return (
    t.includes("біла церкв") ||
    t.includes("біла-церкв") ||
    t.includes("білоцеркв") ||
    t.includes("білоцерків") ||
    t.includes("білоцерківськ") ||
    t.includes("білоцерківський") ||
    t.includes(" бц") ||
    t.includes("бц ") ||
    t.includes("узин") ||
    t.includes("сквира") ||
    t.includes("рокитне") ||
    t.includes("ставище") ||
    t.includes("тетієв") ||
    t.includes("володарка")
  );
}

// ======================
// 🧹 CLEAN
// ======================
function cleanText(text) {
  return text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/детальніше.*$/gi, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function cleanAI(text) {
  return text
    .replace(/детальніше.*$/gi, "")
    .replace(/джерело.*$/gi, "")
    .trim();
}

function limitSentences(text, max = 2) {
  const sentences = text
    .replace(/\n/g, " ")
    .split(/(?<=[.!?])\s+/);

  return sentences.slice(0, max).join(" ");
}

// ======================
// 🤖 AI
// ======================
async function analyzeNews(title, content) {
  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `Ти пишеш як телеграм-канал "Хуйова Одеса".

Правила:
- жорстко
- коротко
- трохи сленг
- без офіціозу

Формат:
1 речення заголовок
2-4 рядки опис

JSON:
{ "status": "OK", "title": "...", "summary": "...", "emoji": "🔥" }`,
        },
        {
          role: "user",
          content: `Заголовок: ${title}\n\n${content.slice(0, 1500)}`,
        },
      ],
      temperature: 0.7,
    });

    const text = completion.choices?.[0]?.message?.content?.trim();

    if (!text || text.toLowerCase().includes("skip")) {
      return { status: "SKIP" };
    }

    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);

    const lines = text.split("\n").filter(Boolean);

    return {
      status: "OK",
      title: lines[0],
      summary: lines.slice(1).join(" "),
      emoji: "🚨",
    };
  } catch (e) {
    console.log("❌ AI error:", e.message);
    return { status: "SKIP" };
  }
}

// ======================
// 📡 TELEGRAM CLIENT
// ======================
async function initClient() {
  const client = new TelegramClient(
    new StringSession(SESSION || ""),
    Number(API_ID),
    API_HASH,
    { connectionRetries: 5 }
  );

  await client.start({
    phoneNumber: async () => await input.text("📱 Phone: "),
    password: async () => await input.text("🔐 2FA: "),
    phoneCode: async () => await input.text("📩 Code: "),
  });

  console.log("✅ Telegram connected");
  console.log("📌 SESSION (збережи в .env):");
  console.log(client.session.save());

  return client;
}

// ======================
// 📥 POSTS
// ======================
async function getPosts(client) {
  const entity = await client.getEntity(CHANNEL_USERNAME);

  const messages = await client.getMessages(entity, {
    limit: 6,
  });

  return messages.reverse();
}

// ======================
// 🖼 IMAGES (без змін логіки)
// ======================
async function getImages(client, messages) {
  const images = [];

  for (const msg of messages) {
    try {
      let media;

      if (msg.photo) media = msg.photo;
      else if (msg.media?.photo) media = msg.media.photo;
      else if (msg.media?.document) {
        const mime = msg.media.document.mimeType || "";
        if (mime.startsWith("image/")) media = msg.media.document;
      }

      if (media) {
        const buffer = await client.downloadMedia(media);
        if (buffer) images.push(buffer);
      }
    } catch {}
  }

  return images;
}

// ======================
// 🚀 MAIN
// ======================
async function run(client) {
  const entity = await client.getEntity(CHANNEL_USERNAME);

  const messages = await getPosts(client);

  for (const msg of messages) {
    try {
      if (!msg.message) continue;

      const id = msg.id.toString();

      // ======================
      // 🔥 UPSTASH CHECK
      // ======================
      const isPosted = await redis.sismember("posted", id);
      if (isPosted) continue;

      const raw = msg.message;
      const content = cleanText(raw);
      const titleRaw = content.slice(0, 80);

      if (!isBilaTserkva(content)) {
        await redis.sadd("posted", id);
        continue;
      }

      const ai = await analyzeNews(titleRaw, content);

      if (ai.status === "SKIP") {
        await redis.sadd("posted", id);
        continue;
      }

      let summary = cleanAI(ai.summary);
      summary = limitSentences(summary, 2);

      const emoji = ai.emoji || "🟡";

      const message = `${emoji} <b>${ai.title}</b>

${summary}

✅ <a href="https://t.me/huyova_bila_tserkva">Хуйова Біла Церква</a> | <a href="https://t.me/xy_dmin">Прислати новину</a>`;

      const images = await getImages(client, [msg]);

      try {
        if (images.length === 1) {
          await bot.telegram.sendPhoto(
            CHAT_ID,
            { source: images[0] },
            { caption: message, parse_mode: "HTML" }
          );
        } else if (images.length > 1) {
          const mediaGroup = images.map((img, i) => ({
            type: "photo",
            media: { source: img },
            caption: i === 0 ? message : undefined,
            parse_mode: "HTML",
          }));

          await bot.telegram.sendMediaGroup(CHAT_ID, mediaGroup);
        } else {
          throw new Error("no image");
        }
      } catch {
        await bot.telegram.sendMessage(CHAT_ID, message, {
          parse_mode: "HTML",
        });
      }

      // ======================
      // 💾 SAVE TO REDIS
      // ======================
      await redis.sadd("posted", id);

      console.log("✅ Posted:", id);

      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.log("Error:", e.message);
    }
  }
}

// ======================
// 🌐 SERVER
// ======================
const app = express();
app.get("/", (req, res) => res.send("Бот працює 🚀"));

app.listen(PORT || 3000);

// ======================
// ▶️ START
// ======================
(async () => {
  const client = await initClient();

  cron.schedule(CRON || "*/10 * * * *", () => run(client));

  await run(client);
})();