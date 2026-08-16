/**
 * Lookup Pro - 24/7 Cloud Telegram Bot (Render / Glitch / VPS / Railway Compatible)
 * Bot: @erning2122_bot
 */

const http = require('http');
const https = require('https');

// Bot Configuration
const BOT_TOKEN = process.env.BOT_TOKEN || '8856201484:AAFJTe6T7LRVpvqZ2tPdN0JrlL7thF3svpk';
const WHATSAPP = '9696276477';
const PORT = process.env.PORT || 3000;

// 5 Active Cloud Keys
const KEYS = {
  number: 'kittu_f21468baa1c7606b',
  aadhaar: 'aadhar_545c3c6164c3ce5f',
  ration: 'kitturasan_3836489d9f0b36cf',
  vehicle_rc: 'car_a6433483a967d358',
  vehicle_info: 'car_a6433483a967d358'
};

const userStates = {};

// Clean Address Helper
function cleanAddress(raw) {
  if (!raw) return 'Not Available';
  const parts = raw.split('!').map(s => s.trim()).filter(s => s.length > 0 && s !== '00' && s !== '.');
  const unique = Array.from(new Set(parts));
  return unique.length > 0 ? unique.join(', ') : raw;
}

// Persistent Service Buttons Keyboard
function getMainKeyboard() {
  return {
    keyboard: [
      [{ text: '📱 Mobile Number' }, { text: '🆔 Aadhaar to SIM' }],
      [{ text: '🚗 Vehicle RC' }, { text: '🌾 Ration Card' }],
      [{ text: '💬 WhatsApp Support' }]
    ],
    resize_keyboard: true,
    is_persistent: true
  };
}

// Telegram API Requester
async function tgRequest(method, data) {
  const payload = JSON.stringify(data);
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 30000
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve(null); }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(payload);
    req.end();
  });
}

// Send Message Helper
async function sendMessage(chatId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return tgRequest('sendMessage', payload);
}

// Fetch Upstream Database
async function fetchLookup(query, mode = 'auto') {
  const cleanUpper = query.toUpperCase().replace(/\s+/g, '');
  const digits = query.replace(/\D/g, '');

  let url = '';
  let serviceName = '';

  if (mode === 'number' || (mode === 'auto' && digits.length === 10)) {
    url = `https://markplace.site/api.php?key=${KEYS.number}&type=number&num=${encodeURIComponent(digits)}`;
    serviceName = 'Mobile Number API';
  } else if (mode === 'aadhaar' || (mode === 'auto' && digits.length === 12)) {
    url = `https://markplace.site/api.php?key=${KEYS.aadhaar}&type=aadhaar&aadhaar=${encodeURIComponent(digits)}`;
    serviceName = 'Aadhaar / SIM API';
  } else if (mode === 'ration') {
    url = `https://markplace.site/api.php?key=${KEYS.ration}&type=ration&aadhaar=${encodeURIComponent(digits)}`;
    serviceName = 'Ration Card API';
  } else {
    url = `https://markplace.site/api.php?key=${KEYS.vehicle_rc}&type=veh2owner&rc=${encodeURIComponent(cleanUpper)}`;
    serviceName = 'Vehicle RC API';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const json = await res.json();
    return { json, serviceName };
  } finally {
    clearTimeout(timeoutId);
  }
}

// Message Handler
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const userId = msg.from.id.toString();
  const name = msg.from.first_name || 'User';

  console.log(`[MSG from ${name} (${userId})]: ${text}`);

  if (text === '/start') {
    let txt = `👑 <b>Welcome to kitu boss api</b>\n\n`;
    txt += `Neeche diye gaye <b>Buttons</b> par click karke search karein:\n\n`;
    txt += `📱 <b>Mobile Number</b> — Name, Aadhaar & Circle details\n`;
    txt += `🆔 <b>Aadhaar to SIM</b> — All Linked Mobile Numbers\n`;
    txt += `🚗 <b>Vehicle RC</b> — Owner Name, Model & RTO Address\n`;
    txt += `🌾 <b>Ration Card</b> — Ration & Family Details\n\n`;
    txt += `👉 <i>Kisi bhi button par click karein ya direct number send karein!</i>`;
    return sendMessage(chatId, txt, getMainKeyboard());
  }

  if (text === '📱 Mobile Number') {
    userStates[userId] = 'number';
    return sendMessage(chatId, '📱 <b>Mobile Number Lookup Mode!</b>\n\n👉 Kripya <b>10-Digit Mobile Number</b> send kijiye (e.g. <code>6209856775</code>):', getMainKeyboard());
  }

  if (text === '🆔 Aadhaar to SIM') {
    userStates[userId] = 'aadhaar';
    return sendMessage(chatId, '🆔 <b>Aadhaar to SIM Lookup Mode!</b>\n\n👉 Kripya <b>12-Digit Aadhaar Number</b> send kijiye (e.g. <code>962397300673</code>):', getMainKeyboard());
  }

  if (text === '🚗 Vehicle RC') {
    userStates[userId] = 'vehicle';
    return sendMessage(chatId, '🚗 <b>Vehicle RC Lookup Mode!</b>\n\n👉 Kripya <b>Vehicle Registration / RC Number</b> send kijiye (e.g. <code>MP16CB6745</code>):', getMainKeyboard());
  }

  if (text === '🌾 Ration Card') {
    userStates[userId] = 'ration';
    return sendMessage(chatId, '🌾 <b>Ration Card Lookup Mode!</b>\n\n👉 Kripya <b>Aadhaar Number</b> send kijiye:', getMainKeyboard());
  }

  if (text === '💬 WhatsApp Support') {
    const inline = {
      inline_keyboard: [
        [{ text: '💬 Contact WhatsApp Support', url: `https://wa.me/91${WHATSAPP}?text=Hello%20Support` }]
      ]
    };
    return sendMessage(chatId, `💬 <b>Customer Support:</b>\n\nWhatsApp: +${WHATSAPP}`, inline);
  }

  // Execute Search
  const selectedMode = userStates[userId] || 'auto';
  sendMessage(chatId, `⚡ <i>Searching Cloud Database for <b>${text}</b>... Please wait...</i>`);

  try {
    const { json: data, serviceName } = await fetchLookup(text, selectedMode);

    if (!data || data.status === 'error' || !data.result || data.result.length === 0) {
      return sendMessage(chatId, `❌ <b>No records found for:</b> <code>${text}</code>\n\n<i>Kripya number ya RC sahi se check karein.</i>`, getMainKeyboard());
    }

    let reply = `✅ <b>Found ${data.result.length} Record(s) via ${serviceName}:</b>\n\n`;
    data.result.forEach((rec, i) => {
      reply += `━━━━━━━━━━━━━━━━━━━\n`;
      reply += `<b>📋 Record #${i + 1}</b>\n`;
      if (rec.name || rec.owner_name) reply += `👤 <b>Name / Owner:</b> ${rec.name || rec.owner_name}\n`;
      if (rec.fname || rec.father_name) reply += `👨 <b>Father:</b> ${rec.fname || rec.father_name}\n`;
      if (rec.num) reply += `📱 <b>Mobile:</b> <code>${rec.num}</code>\n`;
      if (rec.aadhar || rec.aadhaar) reply += `🆔 <b>Aadhaar:</b> <code>${rec.aadhar || rec.aadhaar}</code>\n`;
      if (rec.rc_number || rec.reg_no) reply += `🚗 <b>Vehicle RC:</b> <code>${rec.rc_number || rec.reg_no}</code>\n`;
      if (rec.model) reply += `🏷️ <b>Maker / Model:</b> ${rec.model}\n`;
      if (rec.vehicle_class) reply += `⛽ <b>Class:</b> ${rec.vehicle_class}\n`;
      if (rec.circle) reply += `🏢 <b>Circle:</b> ${rec.circle}\n`;
      if (rec.address || rec.current_address) reply += `📍 <b>Address:</b> ${cleanAddress(rec.address || rec.current_address)}\n`;
    });
    reply += `━━━━━━━━━━━━━━━━━━━\n👑 <i>kitu boss api Suite</i>`;

    sendMessage(chatId, reply, getMainKeyboard());
    userStates[userId] = 'auto';
  } catch (err) {
    sendMessage(chatId, `❌ <b>Error:</b> ${err.message}`, getMainKeyboard());
  }
}

// Telegram Long Polling Loop
let lastUpdateId = 0;
let isPolling = false;

async function pollUpdates() {
  if (isPolling) return;
  isPolling = true;

  try {
    const res = await tgRequest('getUpdates', { offset: lastUpdateId + 1, timeout: 25 });
    if (res && res.ok && res.result && res.result.length > 0) {
      for (const update of res.result) {
        lastUpdateId = update.update_id;
        if (update.message && update.message.text) {
          handleMessage(update.message).catch(console.error);
        }
      }
    }
  } catch (err) {
    // silently continue
  } finally {
    isPolling = false;
    setTimeout(pollUpdates, 500);
  }
}

// Built-in HTTP Health Server (Keeps Cloud Hosting 24/7 Alive)
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('⚡ Lookup Pro Telegram Bot is Running 24/7 Live!\nBot: @erning2122_bot\n');
});

server.listen(PORT, () => {
  console.log(`🌐 Health Server listening on port ${PORT}`);
  console.log('🚀 Lookup Pro Telegram Bot Started Polling 24/7 Live...');
  console.log('🔗 Telegram Bot: @erning2122_bot');
  pollUpdates();
});
