const { adams } = require("../Ibrahim/adams");
const fs = require("fs-extra");
const { createContext } = require("../Ibrahim/helper");

// Configuration
const CONFIG = {
  BATCH_SIZE: 403,
  DELAY_MINUTES: 3,
  SENT_NUMBERS_FILE: "./sent_numbers.json"
};

// Branding with Newsletter Context
const BOT_BRANDING = {
  FOOTER: (text = "") => `${text}\n\n🚀 ʙᴡᴍ xᴍᴅ ʙʏ ɪʙʀᴀʜɪᴍ ᴀᴅᴀᴍs`,
  EMOJI: {
    PROCESSING: "⌛",
    SUCCESS: "✅",
    ERROR: "❌",
    WARNING: "⚠️",
    BROADCAST: "📡",
    SAVE: "💾"
  },
  NEWSLETTER_CONTEXT: {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363285388090068@newsletter",
      newsletterName: "BWM-XMD-QUANTUM",
      serverMessageId: Math.floor(100000 + Math.random() * 900000)
    }
  }
};

// Helper Functions
async function parseVCF(vcfData) {
  const entries = vcfData.split('BEGIN:VCARD');
  const contacts = [];

  for (const entry of entries) {
    if (!entry.trim()) continue;
    
    const contact = {
      name: '',
      number: '',
      email: ''
    };

    const lines = entry.split('\n');
    for (const line of lines) {
      if (line.startsWith('FN:')) {
        contact.name = line.substring(3).trim();
      } else if (line.startsWith('TEL:')) {
        contact.number = line.substring(4).replace(/\D/g, '');
      } else if (line.startsWith('EMAIL:')) {
        contact.email = line.substring(6).trim();
      }
    }

    if (contact.number) {
      contacts.push(contact);
    }
  }

  return contacts;
}

// Enhanced country detection for any country
function detectCountryCode(number) {
  // Try to extract country code (1-4 digits after +)
  const matches = number.match(/^\+(\d{1,4})/);
  if (!matches) {
    return { code: '+1', country: 'Unknown', flag: '🌍' };
  }
  
  const code = '+' + matches[1];
  
  // Extended country mapping
  const countryMap = {
    // North America
    '+1': { country: 'US/Canada', flag: '🇺🇸' },
    
    // Europe
    '+44': { country: 'United Kingdom', flag: '🇬🇧' },
    '+49': { country: 'Germany', flag: '🇩🇪' },
    '+33': { country: 'France', flag: '🇫🇷' },
    '+39': { country: 'Italy', flag: '🇮🇹' },
    '+34': { country: 'Spain', flag: '🇪🇸' },
    '+31': { country: 'Netherlands', flag: '🇳🇱' },
    '+41': { country: 'Switzerland', flag: '🇨🇭' },
    '+43': { country: 'Austria', flag: '🇦🇹' },
    '+45': { country: 'Denmark', flag: '🇩🇰' },
    '+46': { country: 'Sweden', flag: '🇸🇪' },
    '+47': { country: 'Norway', flag: '🇳🇴' },
    '+358': { country: 'Finland', flag: '🇫🇮' },
    '+32': { country: 'Belgium', flag: '🇧🇪' },
    '+351': { country: 'Portugal', flag: '🇵🇹' },
    '+30': { country: 'Greece', flag: '🇬🇷' },
    '+48': { country: 'Poland', flag: '🇵🇱' },
    '+7': { country: 'Russia', flag: '🇷🇺' },
    '+380': { country: 'Ukraine', flag: '🇺🇦' },
    
    // Asia
    '+86': { country: 'China', flag: '🇨🇳' },
    '+81': { country: 'Japan', flag: '🇯🇵' },
    '+82': { country: 'South Korea', flag: '🇰🇷' },
    '+91': { country: 'India', flag: '🇮🇳' },
    '+65': { country: 'Singapore', flag: '🇸🇬' },
    '+60': { country: 'Malaysia', flag: '🇲🇾' },
    '+66': { country: 'Thailand', flag: '🇹🇭' },
    '+84': { country: 'Vietnam', flag: '🇻🇳' },
    '+62': { country: 'Indonesia', flag: '🇮🇩' },
    '+63': { country: 'Philippines', flag: '🇵🇭' },
    '+90': { country: 'Turkey', flag: '🇹🇷' },
    '+98': { country: 'Iran', flag: '🇮🇷' },
    '+92': { country: 'Pakistan', flag: '🇵🇰' },
    '+880': { country: 'Bangladesh', flag: '🇧🇩' },
    '+94': { country: 'Sri Lanka', flag: '🇱🇰' },
    '+977': { country: 'Nepal', flag: '🇳🇵' },
    '+95': { country: 'Myanmar', flag: '🇲🇲' },
    '+855': { country: 'Cambodia', flag: '🇰🇭' },
    '+856': { country: 'Laos', flag: '🇱🇦' },
    
    // Africa
    '+234': { country: 'Nigeria', flag: '🇳🇬' },
    '+254': { country: 'Kenya', flag: '🇰🇪' },
    '+27': { country: 'South Africa', flag: '🇿🇦' },
    '+20': { country: 'Egypt', flag: '🇪🇬' },
    '+212': { country: 'Morocco', flag: '🇲🇦' },
    '+213': { country: 'Algeria', flag: '🇩🇿' },
    '+216': { country: 'Tunisia', flag: '🇹🇳' },
    '+218': { country: 'Libya', flag: '🇱🇾' },
    '+220': { country: 'Gambia', flag: '🇬🇲' },
    '+221': { country: 'Senegal', flag: '🇸🇳' },
    '+233': { country: 'Ghana', flag: '🇬🇭' },
    '+255': { country: 'Tanzania', flag: '🇹🇿' },
    '+256': { country: 'Uganda', flag: '🇺🇬' },
    '+260': { country: 'Zambia', flag: '🇿🇲' },
    '+263': { country: 'Zimbabwe', flag: '🇿🇼' },
    '+265': { country: 'Malawi', flag: '🇲🇼' },
    '+267': { country: 'Botswana', flag: '🇧🇼' },
    '+268': { country: 'Eswatini', flag: '🇸🇿' },
    '+251': { country: 'Ethiopia', flag: '🇪🇹' },
    '+252': { country: 'Somalia', flag: '🇸🇴' },
    '+253': { country: 'Djibouti', flag: '🇩🇯' },
    '+250': { country: 'Rwanda', flag: '🇷🇼' },
    '+257': { country: 'Burundi', flag: '🇧🇮' },
    
    // Americas
    '+52': { country: 'Mexico', flag: '🇲🇽' },
    '+55': { country: 'Brazil', flag: '🇧🇷' },
    '+54': { country: 'Argentina', flag: '🇦🇷' },
    '+56': { country: 'Chile', flag: '🇨🇱' },
    '+57': { country: 'Colombia', flag: '🇨🇴' },
    '+51': { country: 'Peru', flag: '🇵🇪' },
    '+58': { country: 'Venezuela', flag: '🇻🇪' },
    '+593': { country: 'Ecuador', flag: '🇪🇨' },
    '+595': { country: 'Paraguay', flag: '🇵🇾' },
    '+598': { country: 'Uruguay', flag: '🇺🇾' },
    '+591': { country: 'Bolivia', flag: '🇧🇴' },
    '+594': { country: 'French Guiana', flag: '🇬🇫' },
    '+597': { country: 'Suriname', flag: '🇸🇷' },
    '+592': { country: 'Guyana', flag: '🇬🇾' },
    
    // Oceania
    '+61': { country: 'Australia', flag: '🇦🇺' },
    '+64': { country: 'New Zealand', flag: '🇳🇿' },
    '+679': { country: 'Fiji', flag: '🇫🇯' },
    '+685': { country: 'Samoa', flag: '🇼🇸' },
    '+676': { country: 'Tonga', flag: '🇹🇴' },
    '+686': { country: 'Kiribati', flag: '🇰🇮' },
    '+687': { country: 'New Caledonia', flag: '🇳🇨' },
    '+689': { country: 'French Polynesia', flag: '🇵🇫' },
    
    // Middle East
    '+971': { country: 'UAE', flag: '🇦🇪' },
    '+966': { country: 'Saudi Arabia', flag: '🇸🇦' },
    '+974': { country: 'Qatar', flag: '🇶🇦' },
    '+973': { country: 'Bahrain', flag: '🇧🇭' },
    '+965': { country: 'Kuwait', flag: '🇰🇼' },
    '+968': { country: 'Oman', flag: '🇴🇲' },
    '+967': { country: 'Yemen', flag: '🇾🇪' },
    '+964': { country: 'Iraq', flag: '🇮🇶' },
    '+963': { country: 'Syria', flag: '🇸🇾' },
    '+961': { country: 'Lebanon', flag: '🇱🇧' },
    '+972': { country: 'Israel', flag: '🇮🇱' },
    '+970': { country: 'Palestine', flag: '🇵🇸' },
    '+962': { country: 'Jordan', flag: '🇯🇴' },
    '+93': { country: 'Afghanistan', flag: '🇦🇫' }
  };
  
  const countryInfo = countryMap[code];
  if (countryInfo) {
    return { code, ...countryInfo };
  }
  
  // If not found in map, still return the detected code
  return { code, country: 'Unknown Country', flag: '🌍' };
}

function generateRandomNumbers(countryCode, baseNumber, count) {
  const numbers = [];
  const cleanBase = baseNumber.replace(countryCode, '');
  const first5Digits = cleanBase.substring(0, 5);
  
  for (let i = 0; i < count; i++) {
    let randomNumber = countryCode + first5Digits;
    // Generate random digits for the remaining positions
    const remainingLength = cleanBase.length - 5;
    for (let j = 0; j < remainingLength; j++) {
      randomNumber += Math.floor(Math.random() * 10);
    }
    numbers.push(randomNumber);
  }
  
  return numbers;
}

// VCF Send Command (Reply to VCF file with command)
adams({ 
  nomCom: "vcfsent", 
  categorie: 'VCF Management', 
  reaction: "📡"
}, async (dest, zk, { ms, repondre, arg, verifAdmin, superUser }) => {
  
  if (!verifAdmin && !superUser) {
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.WARNING} *Permission Denied*\n\nThis command requires admin privileges to use.`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
    return;
  }

  if (!arg[0]) {
    const instructions = [
      `${BOT_BRANDING.EMOJI.BROADCAST} *VCF SENT COMMAND INSTRUCTIONS*`,
      ``,
      `*How to use:*`,
      `1. Reply to any VCF file with this command`,
      `2. Include amount and your message`,
      ``,
      `*Format:*`,
      `vcfsent <amount> <your_message>`,
      ``,
      `*Example:*`,
      `Reply to VCF file with:`,
      `vcfsent 500 Hello everyone! Welcome to our service.`,
      ``,
      `*What happens:*`,
      `• Bot processes the VCF file you replied to`,
      `• Extracts contact numbers from the file`,
      `• Sends your message to specified amount of contacts`,
      `• Provides delivery statistics`,
      ``,
      `*Note:* Make sure to reply to a valid VCF file`
    ];

    await repondre({
      text: BOT_BRANDING.FOOTER(instructions.join('\n')),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
    return;
  }

  // Check if this is a reply to a document
  if (!ms.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} *No VCF File Found*\n\nPlease reply to a VCF file with this command.\n\nFormat: vcfsent <amount> <message>`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
    return;
  }

  const amount = parseInt(arg[0]);
  const message = arg.slice(1).join(' ');

  if (isNaN(amount) || amount <= 0) {
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} *Invalid Amount*\n\nPlease enter a valid number.\n\nExample: vcfsent 100 Your message here`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
    return;
  }

  if (!message) {
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} *No Message Provided*\n\nPlease include your message.\n\nFormat: vcfsent ${amount} <your_message>`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
    return;
  }

  try {
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.PROCESSING} *Processing VCF File...*\n\n📊 Target Amount: ${amount}\n💬 Message: ${message}\n\nPlease wait while we process the contacts...`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });

    // Get the quoted message (VCF file)
    const quotedMessage = ms.message.extendedTextMessage.contextInfo.quotedMessage;
    
    // Check if it's a document
    if (!quotedMessage.documentMessage) {
      await repondre({
        text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} *Invalid File Type*\n\nPlease reply to a VCF document file.`),
        contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
      });
      return;
    }

    // Download the VCF file
    const stream = await zk.downloadContentFromMessage(quotedMessage.documentMessage, 'document');
    let buffer = Buffer.alloc(0);
    
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    
    const vcfData = buffer.toString('utf8');
    const contacts = await parseVCF(vcfData);

    if (!contacts.length) {
      await repondre({
        text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} *No Valid Contacts Found*\n\nThe VCF file doesn't contain valid contact numbers.`),
        contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
      });
      return;
    }

    const selectedContacts = contacts.slice(0, amount);
    let successCount = 0;
    const failedContacts = [];

    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.PROCESSING} *Sending Messages...*\n\n📞 Found: ${contacts.length} contacts\n🎯 Sending to: ${selectedContacts.length} contacts\n\nStarting delivery...`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });

    for (const contact of selectedContacts) {
      try {
        await zk.sendMessage(`${contact.number}@s.whatsapp.net`, {
          text: `Hey ${contact.name || 'there'}! 👋\n\n${message}`,
          contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
        });
        successCount++;
      } catch (error) {
        failedContacts.push(contact);
        console.error(`Failed to send to ${contact.number}:`, error);
      }
    }

    const successReport = [
      `${BOT_BRANDING.EMOJI.SUCCESS} *VCF Send Complete!*`,
      ``,
      `📊 *Delivery Statistics:*`,
      `✅ Successfully Sent: ${successCount}`,
      `❌ Failed: ${failedContacts.length}`,
      `📞 Total Processed: ${selectedContacts.length}`,
      `📁 Total in VCF: ${contacts.length}`,
      ``,
      `💬 *Message Sent:*`,
      `"${message.length > 50 ? message.substring(0, 50) + '...' : message}"`
    ];

    await repondre({
      text: BOT_BRANDING.FOOTER(successReport.join('\n')),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });

  } catch (error) {
    console.error('VCF processing error:', error);
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} *Error Processing VCF*\n\n${error.message}\n\nPlease make sure you replied to a valid VCF file.`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
  }
});

// Save Me Command (Random number generation based on user number - Any Country Support)
adams({ 
  nomCom: "saveme", 
  categorie: 'VCF Management', 
  reaction: "💾"
}, async (dest, zk, { ms, repondre, arg, verifAdmin, superUser }) => {
  
  if (!verifAdmin && !superUser) {
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.WARNING} *Permission Denied*\n\nThis command requires admin privileges to use.`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
    return;
  }

  if (!arg[0]) {
    const instructions = [
      `${BOT_BRANDING.EMOJI.SAVE} *SAVE ME COMMAND INSTRUCTIONS*`,
      ``,
      `*How to use:*`,
      `saveme <your_number> <amount> <message>`,
      ``,
      `*Examples:*`,
      `saveme +2547107726788 250 Hello from Kenya!`,
      `saveme +1234567890 100 Hello from USA!`,
      `saveme +447123456789 150 Hello from UK!`,
      `saveme +919876543210 200 Hello from India!`,
      `saveme +8613812345678 300 Hello from China!`,
      ``,
      `*What happens:*`,
      `1. System automatically detects your country from number`,
      `2. Keeps first 5 digits of your number`,
      `3. Auto-generates random digits for the rest`,
      `4. Creates the amount of numbers you specified`,
      `5. Sends your message to all generated numbers`,
      ``,
      `*Important Notes:*`,
      `• Your number must start with + and country code`,
      `• First 5 digits after country code are preserved`,
      `• Remaining digits are randomly generated`,
      `• Maximum 1000 numbers per command`,
      `• Works with ANY country code worldwide`,
      ``,
      `*Popular Country Codes:*`,
      `🇺🇸 +1 (US/CA), 🇬🇧 +44 (UK), 🇮🇳 +91 (India), 🇨🇳 +86 (China)`,
      `🇳🇬 +234 (Nigeria), 🇰🇪 +254 (Kenya), 🇿🇦 +27 (S.Africa)`,
      `🇩🇪 +49 (Germany), 🇫🇷 +33 (France), 🇯🇵 +81 (Japan)`,
      `🇧🇷 +55 (Brazil), 🇦🇺 +61 (Australia), 🇷🇺 +7 (Russia)`,
      ``,
      `*And 190+ more countries supported!*`
    ];

    await repondre({
      text: BOT_BRANDING.FOOTER(instructions.join('\n')),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
    return;
  }

  const userNumber = arg[0];
  const count = parseInt(arg[1]);
  const message = arg.slice(2).join(' ');

  if (!userNumber.startsWith('+')) {
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} *Invalid Number Format*\n\nYour number must start with + and country code.\n\nExamples:\n+2547107726788 (Kenya)\n+1234567890 (USA)\n+447123456789 (UK)`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
    return;
  }

  if (!count || count <= 0 || count > 1000) {
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} *Invalid Amount*\n\nAmount must be between 1 and 1000.\n\nExample: saveme ${userNumber} 250 Your message`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
    return;
  }

  if (!message) {
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} *No Message Provided*\n\nPlease include your message to send.\n\nFormat: saveme ${userNumber} ${count} <your_message>`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
    return;
  }

  try {
    const { code, country, flag } = detectCountryCode(userNumber);
    const cleanBase = userNumber.replace(code, '');
    const first5Digits = cleanBase.substring(0, 5);
    
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.PROCESSING} *Generating Random Numbers...*\n\n${flag} Country: ${country}\n📞 Country Code: ${code}\n📱 Your Number: ${userNumber}\n🔢 Pattern: ${code}${first5Digits}xxxxx\n📊 Generating: ${count} numbers\n\nStarting generation and sending...`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });

    const randomNumbers = generateRandomNumbers(code, userNumber, count);
    let successCount = 0;
    const failedNumbers = [];

    for (const number of randomNumbers) {
      try {
        await zk.sendMessage(`${number.replace('+', '')}@s.whatsapp.net`, {
          text: `📱 *Auto Generated Message*\n\n${message}`,
          contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
        });
        successCount++;
      } catch (error) {
        failedNumbers.push(number);
      }
      
      // Small delay to avoid spam
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const report = [
      `${BOT_BRANDING.EMOJI.SUCCESS} *Save Me Send Complete!*`,
      ``,
      `📊 *Generation Statistics:*`,
      `${flag} Country: ${country}`,
      `📞 Country Code: ${code}`,
      `📱 Base Pattern: ${code}${first5Digits}xxxxx`,
      `🎯 Numbers Generated: ${count}`,
      `✅ Successfully Sent: ${successCount}`,
      `❌ Failed Deliveries: ${failedNumbers.length}`,
      `📈 Success Rate: ${Math.round((successCount/count)*100)}%`,
      ``,
      `💬 *Message Sent:*`,
      `"${message.length > 100 ? message.substring(0, 100) + '...' : message}"`
    ];

    await repondre({
      text: BOT_BRANDING.FOOTER(report.join('\n')),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });

  } catch (error) {
    console.error('Save me error:', error);
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} *Error in Save Me Command*\n\n${error.message}\n\nPlease check your number format and try again.`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
  }
});
