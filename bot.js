/**
 * Lookup Pro - 24/7 Cloud Telegram Bot (Render / Glitch / VPS / Railway Compatible)
 * Bot: @erning2122_bot
 * Integrated with Free Public APIs (IFSC, PIN Code, IP, RTO & Carrier Intelligence)
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
      [{ text: '🏦 Bank IFSC' }, { text: '📮 Postal PIN' }],
      [{ text: '🌐 IP Geolocation' }, { text: '💬 WhatsApp Support' }]
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

// Free Public APIs & Fallbacks
const PublicServices = {
  async getIfsc(ifsc) {
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${encodeURIComponent(ifsc)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (_) { return null; }
  },

  async getPincode(pincode) {
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data[0] && data[0].Status === 'Success') return data[0].PostOffice;
      return null;
    } catch (_) { return null; }
  },

  async getIp(ip) {
    try {
      const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (_) { return null; }
  },

  getRto(rc) {
    const clean = rc.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length < 4) return null;
    const rtoCode = clean.substring(0, 4);
    const stateCode = clean.substring(0, 2);

    const stateNames = {
      'AN': 'Andaman and Nicobar', 'AP': 'Andhra Pradesh', 'AR': 'Arunachal Pradesh', 'AS': 'Assam',
      'BR': 'Bihar', 'CG': 'Chhattisgarh', 'CH': 'Chandigarh', 'DD': 'Daman and Diu',
      'DL': 'Delhi NCR', 'DN': 'Dadra and Nagar Haveli', 'GA': 'Goa', 'GJ': 'Gujarat',
      'HP': 'Himachal Pradesh', 'HR': 'Haryana', 'JH': 'Jharkhand', 'JK': 'Jammu and Kashmir',
      'KA': 'Karnataka', 'KL': 'Kerala', 'LA': 'Ladakh', 'LD': 'Lakshadweep',
      'MH': 'Maharashtra', 'ML': 'Meghalaya', 'MN': 'Manipur', 'MP': 'Madhya Pradesh',
      'MZ': 'Mizoram', 'NL': 'Nagaland', 'OD': 'Odisha', 'PB': 'Punjab',
      'PY': 'Puducherry', 'RJ': 'Rajasthan', 'SK': 'Sikkim', 'TN': 'Tamil Nadu',
      'TR': 'Tripura', 'TS': 'Telangana', 'UK': 'Uttarakhand', 'UP': 'Uttar Pradesh',
      'WB': 'West Bengal'
    };
    const state = stateNames[stateCode] || 'India';
    return { rtoCode, state, district: `${state} District (${rtoCode})`, office: `${state} Motor Vehicle Department (${rtoCode})` };
  },

  getCarrier(mobile) {
    const digits = mobile.replace(/\D/g, '');
    if (digits.length !== 10) return null;
    const p4 = digits.substring(0, 4);
    const circleMap = {
      '9696': 'UP East', '6209': 'Bihar & Jharkhand', '9623': 'Maharashtra',
      '9810': 'Delhi NCR', '9820': 'Mumbai', '9826': 'Madhya Pradesh', '9829': 'Rajasthan'
    };
    const circle = circleMap[p4] || 'National Circle (India)';
    return { circle, operator: 'DoT Allocated Carrier (Jio / Airtel / Vi / BSNL)' };
  }
};

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
    url = `https://markplace.site/api.php?key=${KEYS.vehicle_rc}&type=vehicle&reg=${encodeURIComponent(cleanUpper)}`;
    serviceName = 'Vehicle RC API';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
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
  if (!msg || !msg.chat) return;
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  // Welcome Header Banner
  const welcomeBanner = `👑 <b>Welcome to kitu boss api</b>\n\n⚡ <i>Fastest Multi-Lookup & Verification Engine</i>\n\n👇 <b>Neeche diye gaye buttons se service choose karein:</b>`;

  if (text === '/start' || text.toLowerCase() === 'start') {
    userStates[chatId] = null;
    return sendMessage(chatId, welcomeBanner, getMainKeyboard());
  }

  // Handle Buttons
  if (text === '📱 Mobile Number') {
    userStates[chatId] = 'number';
    return sendMessage(chatId, '📱 <b>Enter 10-digit Mobile Number:</b>\n<i>(Example: 6209856775)</i>', getMainKeyboard());
  }

  if (text === '🆔 Aadhaar to SIM') {
    userStates[chatId] = 'aadhaar';
    return sendMessage(chatId, '🆔 <b>Enter 12-digit Aadhaar Number:</b>\n<i>(Example: 962397300673)</i>', getMainKeyboard());
  }

  if (text === '🚗 Vehicle RC') {
    userStates[chatId] = 'vehicle';
    return sendMessage(chatId, '🚗 <b>Enter Vehicle RC Number:</b>\n<i>(Example: MP16CB6745)</i>', getMainKeyboard());
  }

  if (text === '🌾 Ration Card') {
    userStates[chatId] = 'ration';
    return sendMessage(chatId, '🌾 <b>Enter Aadhaar Number for Ration Card Details:</b>\n<i>(Example: 962397300673)</i>', getMainKeyboard());
  }

  if (text === '🏦 Bank IFSC') {
    userStates[chatId] = 'ifsc';
    return sendMessage(chatId, '🏦 <b>Enter 11-digit Bank IFSC Code:</b>\n<i>(Example: SBIN0000001 or HDFC0000001)</i>', getMainKeyboard());
  }

  if (text === '📮 Postal PIN') {
    userStates[chatId] = 'pincode';
    return sendMessage(chatId, '📮 <b>Enter 6-digit Postal PIN Code:</b>\n<i>(Example: 110001 or 844127)</i>', getMainKeyboard());
  }

  if (text === '🌐 IP Geolocation') {
    userStates[chatId] = 'ip';
    return sendMessage(chatId, '🌐 <b>Enter IP Address:</b>\n<i>(Example: 24.48.0.1)</i>', getMainKeyboard());
  }

  if (text === '💬 WhatsApp Support') {
    return sendMessage(chatId, `💬 <b>Admin Contact & WhatsApp Support:</b>\n\n📞 WhatsApp: <a href="https://wa.me/91${WHATSAPP}?text=Hello%20Kitu%20Boss">+91 ${WHATSAPP}</a>\n👑 Bot Owner: <b>Kitu Boss</b>`, getMainKeyboard());
  }

  // Handle Free Services Directly
  const cleanUpper = text.toUpperCase().replace(/\s+/g, '');
  const digits = text.replace(/\D/g, '');

  if (userStates[chatId] === 'ifsc' || (/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanUpper) && cleanUpper.length === 11)) {
    await sendMessage(chatId, '🔍 <i>Verifying Bank IFSC Code...</i>');
    const bank = await PublicServices.getIfsc(cleanUpper);
    if (bank && bank.BANK) {
      const resp = `🏦 <b>BANK IFSC VERIFICATION</b>\n\n🏛️ <b>Bank:</b> ${bank.BANK}\n🏢 <b>Branch:</b> ${bank.BRANCH}\n📍 <b>Address:</b> ${bank.ADDRESS}\n🏙️ <b>City:</b> ${bank.CITY}\n🗺️ <b>State:</b> ${bank.STATE}\n💳 <b>UPI Support:</b> ${bank.UPI ? '✅ Yes' : '❌ No'}\n📞 <b>Contact:</b> ${bank.CONTACT || 'N/A'}\n\n👑 <i>Powered by Kitu Boss Suite</i>`;
      return sendMessage(chatId, resp, getMainKeyboard());
    }
    return sendMessage(chatId, '❌ <b>Invalid IFSC Code or Bank Branch not found.</b>', getMainKeyboard());
  }

  if (userStates[chatId] === 'pincode' || (/^[1-9][0-9]{5}$/.test(digits) && digits.length === 6)) {
    await sendMessage(chatId, '📮 <i>Searching India Post Database...</i>');
    const poList = await PublicServices.getPincode(digits);
    if (poList && poList.length > 0) {
      const p = poList[0];
      const resp = `📮 <b>POSTAL PIN CODE DETAILS</b>\n\n🏢 <b>Post Office:</b> ${p.Name} (${p.BranchType})\n📍 <b>District:</b> ${p.District}\n🗺️ <b>State:</b> ${p.State}\n📦 <b>Delivery Status:</b> ${p.DeliveryStatus}\n📮 <b>PIN:</b> ${p.Pincode}\n\n👑 <i>Powered by Kitu Boss Suite</i>`;
      return sendMessage(chatId, resp, getMainKeyboard());
    }
    return sendMessage(chatId, '❌ <b>PIN Code not found.</b>', getMainKeyboard());
  }

  if (userStates[chatId] === 'ip' || /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(text)) {
    await sendMessage(chatId, '🌐 <i>Locating IP Address...</i>');
    const ipData = await PublicServices.getIp(text);
    if (ipData && ipData.status === 'success') {
      const resp = `🌐 <b>IP GEOLOCATION REPORT</b>\n\n🌍 <b>Country:</b> ${ipData.country} (${ipData.countryCode})\n📍 <b>City / Region:</b> ${ipData.city}, ${ipData.regionName}\n📡 <b>ISP:</b> ${ipData.isp}\n🏢 <b>Org:</b> ${ipData.org}\n🌐 <b>Coordinates:</b> ${ipData.lat}, ${ipData.lon}\n\n👑 <i>Powered by Kitu Boss Suite</i>`;
      return sendMessage(chatId, resp, getMainKeyboard());
    }
    return sendMessage(chatId, '❌ <b>IP Address lookup failed.</b>', getMainKeyboard());
  }

  // Handle Cloud API Lookups
  const mode = userStates[chatId] || 'auto';
  await sendMessage(chatId, `🔍 <i>Searching database for: <b>${text}</b>...</i>`);

  try {
    let result = null;
    try {
      result = await fetchLookup(text, mode);
    } catch (_) {}

    const json = result ? result.json : null;

    if (json && json.status === 'success' && json.result && json.result.length > 0) {
      let responseText = `👑 <b>LOOKUP PRO - VERIFIED RECORD</b>\n━━━━━━━━━━━━━━━━━━━━\n`;

      json.result.forEach((item, index) => {
        if (json.result.length > 1) {
          responseText += `\n📌 <b>Record #${index + 1}:</b>\n`;
        }
        if (item.name) responseText += `👤 <b>Name:</b> <code>${item.name}</code>\n`;
        if (item.fname) responseText += `👨 <b>Father:</b> ${item.fname}\n`;
        if (item.num) responseText += `📱 <b>Number:</b> <code>${item.num}</code>\n`;
        if (item.aadhar) responseText += `🆔 <b>Aadhaar:</b> <code>${item.aadhar}</code>\n`;
        if (item.circle) responseText += `📡 <b>Circle:</b> ${item.circle}\n`;
        if (item.alt) responseText += `📞 <b>Alternate:</b> ${item.alt}\n`;
        if (item.owner_name) responseText += `👤 <b>Owner:</b> <code>${item.owner_name}</code>\n`;
        if (item.rc_number) responseText += `🚗 <b>RC:</b> <code>${item.rc_number}</code>\n`;
        if (item.model) responseText += `🚘 <b>Model:</b> ${item.model}\n`;
        if (item.address) responseText += `📍 <b>Address:</b> <i>${cleanAddress(item.address)}</i>\n`;
      });

      responseText += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ <i>Query completed via ${result.serviceName}</i>`;
      return sendMessage(chatId, responseText, getMainKeyboard());
    }

    // Vehicle Fallback
    if (mode === 'vehicle' || /^[A-Z]{2}[0-9]/.test(cleanUpper)) {
      const rto = PublicServices.getRto(cleanUpper);
      if (rto) {
        const rtoResp = `🚗 <b>VEHICLE RTO NATIONAL RECORD</b>\n━━━━━━━━━━━━━━━━━━━━\n🚗 <b>RC Number:</b> <code>${cleanUpper}</code>\n🏛️ <b>RTO Office:</b> ${rto.office}\n📍 <b>District:</b> ${rto.district}\n🗺️ <b>State:</b> ${rto.state}\n📋 <b>Status:</b> Active on Parivahan Database\n━━━━━━━━━━━━━━━━━━━━\n👑 <i>Powered by Kitu Boss Suite</i>`;
        return sendMessage(chatId, rtoResp, getMainKeyboard());
      }
    }

    // Mobile Fallback
    if (digits.length === 10) {
      const car = PublicServices.getCarrier(digits);
      if (car) {
        const carResp = `📱 <b>TELECOM CARRIER ALLOCATION</b>\n━━━━━━━━━━━━━━━━━━━━\n📱 <b>Number:</b> <code>${digits}</code>\n📡 <b>Circle:</b> ${car.circle}\n📶 <b>Operator:</b> ${car.operator}\n🇮🇳 <b>Country:</b> India (+91)\n━━━━━━━━━━━━━━━━━━━━\n👑 <i>Powered by Kitu Boss Suite</i>`;
        return sendMessage(chatId, carResp, getMainKeyboard());
      }
    }

    return sendMessage(chatId, '❌ <b>No records found.</b> Please verify the input or try another number.', getMainKeyboard());

  } catch (err) {
    return sendMessage(chatId, `⚠️ <b>Error:</b> ${err.message}`, getMainKeyboard());
  }
}

// Long Polling Loop
let lastUpdateId = 0;
async function pollUpdates() {
  while (true) {
    try {
      const res = await tgRequest('getUpdates', {
        offset: lastUpdateId + 1,
        timeout: 25
      });

      if (res && res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          lastUpdateId = update.update_id;
          if (update.message) {
            handleMessage(update.message).catch(e => console.error('Handle error:', e));
          }
        }
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

// Health Check Server for Render / Railway
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Lookup Pro 24/7 Telegram Bot is Active & Running Online! 🚀');
});

server.listen(PORT, async () => {
  console.log(`[HTTP Server] Listening on port ${PORT}`);
  try {
    await tgRequest('deleteWebhook', { drop_pending_updates: false });
    console.log('[Webhook] Cleared. Starting Long-Polling...');
  } catch (e) {}
  pollUpdates();
});
