const { adams } = require("../Ibrahim/adams");
const fs = require("fs-extra");
const axios = require("axios");
const { createContext } = require("../Ibrahim/helper");

// Configuration
const CONFIG = {
  BATCH_SIZE: 403,
  DELAY_MINUTES: 3,
  PROGRESS_FILE: "./broadcast_progress.json",
  SENT_NUMBERS_FILE: "./sent_numbers.json",
  SAVED_NUMBERS_FILE: "./saved_numbers.json",
  GROUP_MEMBERS_FILE: "./group_members.json"
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
    SAVE: "💾",
    GROUP: "👥",
    VCF: "📇"
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
function loadProgress() {
  try {
    if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
      return fs.readJsonSync(CONFIG.PROGRESS_FILE);
    }
  } catch (error) {
    console.error("Error loading progress file:", error);
  }
  return { lastIndex: 0, totalContacts: 0 };
}

function loadSentNumbers() {
  try {
    if (fs.existsSync(CONFIG.SENT_NUMBERS_FILE)) {
      return fs.readJsonSync(CONFIG.SENT_NUMBERS_FILE);
    }
  } catch (error) {
    console.error("Error loading sent numbers file:", error);
  }
  return [];
}

function loadSavedNumbers() {
  try {
    if (fs.existsSync(CONFIG.SAVED_NUMBERS_FILE)) {
      return fs.readJsonSync(CONFIG.SAVED_NUMBERS_FILE);
    }
  } catch (error) {
    console.error("Error loading saved numbers file:", error);
  }
  return [];
}

function saveProgress(progress) {
  try {
    fs.writeJsonSync(CONFIG.PROGRESS_FILE, progress);
  } catch (error) {
    console.error("Error saving progress:", error);
  }
}

function saveSentNumbers(numbers) {
  try {
    fs.writeJsonSync(CONFIG.SENT_NUMBERS_FILE, numbers);
  } catch (error) {
    console.error("Error saving sent numbers:", error);
  }
}

function saveSavedNumbers(numbers) {
  try {
    fs.writeJsonSync(CONFIG.SAVED_NUMBERS_FILE, numbers);
  } catch (error) {
    console.error("Error saving saved numbers:", error);
  }
}

function getCountryCode(number) {
  const codes = {
    '+1': ['US', 'CA'], '+44': ['GB'], '+91': ['IN'], '+86': ['CN'], '+81': ['JP'],
    '+49': ['DE'], '+33': ['FR'], '+39': ['IT'], '+34': ['ES'], '+7': ['RU'],
    '+55': ['BR'], '+52': ['MX'], '+61': ['AU'], '+82': ['KR'], '+90': ['TR'],
    '+234': ['NG'], '+254': ['KE'], '+27': ['ZA'], '+20': ['EG'], '+212': ['MA'],
    '+213': ['DZ'], '+216': ['TN'], '+218': ['LY'], '+220': ['GM'], '+221': ['SN'],
    '+233': ['GH'], '+255': ['TZ'], '+256': ['UG'], '+260': ['ZM'], '+263': ['ZW'],
    '+265': ['MW'], '+267': ['BW'], '+268': ['SZ'], '+350': ['GI'], '+351': ['PT']
  };
  
  for (const [code, countries] of Object.entries(codes)) {
    if (number.startsWith(code)) {
      return { code, country: countries[0] };
    }
  }
  return { code: '+1', country: 'US' }; // Default
}

function generateRandomNumbers(countryCode, baseNumber, count) {
  const numbers = [];
  const cleanBase = baseNumber.replace(countryCode, '');
  const baseLength = cleanBase.length;
  
  for (let i = 0; i < count; i++) {
    let randomNumber = countryCode;
    for (let j = 0; j < baseLength; j++) {
      randomNumber += Math.floor(Math.random() * 10);
    }
    numbers.push(randomNumber);
  }
  
  return numbers;
}

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

async function downloadMedia(message) {
  try {
    const buffer = await message.download();
    return buffer.toString('utf8');
  } catch (error) {
    console.error('Error downloading media:', error);
    throw error;
  }
}

// VCF Menu Command
adams({ 
  nomCom: "vcfmenu", 
  categorie: 'VCF Management', 
  reaction: BOT_BRANDING.EMOJI.VCF 
}, async (dest, zk, { repondre }) => {
  const menu = [
    `${BOT_BRANDING.EMOJI.VCF} *VCF MANAGEMENT COMMANDS*`,
    ``,
    `📡 *Broadcasting Commands:*`,
    `• *vcfsend* - Send messages to VCF contacts`,
    `• *vcfbroadcast* - Advanced VCF broadcasting with file upload`,
    `• *groupsend* - Send to group members`,
    ``,
    `💾 *Saving Commands:*`,
    `• *savevcard* - Save single contact as vCard`,
    `• *savevcf* - Save multiple contacts as VCF`,
    `• *savednum* - Use saved numbers for messaging`,
    ``,
    `👥 *Group Commands:*`,
    `• *fetchmembers* - Get group members list`,
    `• *grouplink* - Send to group via invite link`,
    ``,
    `🎯 *Advanced Commands:*`,
    `• *bulksend* - Send to multiple numbers manually`,
    `• *randomsend* - Send to random generated numbers`,
    `• *vcfexport* - Export saved contacts`,
    ``,
    `📊 *Management Commands:*`,
    `• *vcfstats* - View broadcast statistics`,
    `• *clearsent* - Clear sent numbers history`,
    `• *vcfhelp <command>* - Get help for specific command`,
    ``,
    `💡 *Usage:* Type any command to see detailed instructions`
  ];

  await repondre({
    text: BOT_BRANDING.FOOTER(menu.join('\n')),
    contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
  });
});

// VCF Send Command
adams({ 
  nomCom: "vcfsend", 
  categorie: 'VCF Management', 
  reaction: BOT_BRANDING.EMOJI.BROADCAST 
}, async (dest, zk, { ms, repondre, arg, verifAdmin, superUser }) => {
  
  if (!verifAdmin && !superUser) {
    return repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.WARNING} *Permission Denied*\nAdmin privileges required`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
  }

  if (!arg[0]) {
    const instructions = [
      `${BOT_BRANDING.EMOJI.VCF} *VCF SEND INSTRUCTIONS*`,
      ``,
      `*Usage:* vcfsend <amount> <message>`,
      `*Then:* Reply with VCF file`,
      ``,
      `*Example:*`,
      `vcfsend 100 Hello everyone!`,
      `(then reply with your VCF file)`,
      ``,
      `*Parameters:*`,
      `• Amount: Number of people to send to`,
      `• Message: Your broadcast message`,
      ``,
      `*Steps:*`,
      `1. Type command with amount and message`,
      `2. Reply to bot's message with VCF file`,
      `3. Bot processes and sends messages`
    ];

    return repondre({
      text: BOT_BRANDING.FOOTER(instructions.join('\n')),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
  }

  const amount = parseInt(arg[0]);
  const message = arg.slice(1).join(' ');

  if (isNaN(amount) || amount <= 0) {
    return repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} Invalid amount. Please enter a valid number.`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
  }

  if (!message) {
    return repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} Please provide a message.\n\nFormat: vcfsend ${amount} <message>`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
  }

  await repondre({
    text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.PROCESSING} *Ready to process VCF*\n\n📊 Amount: ${amount}\n💬 Message: ${message}\n\n*Please reply with your VCF file*`),
    contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
  });

  // Store session data for processing the reply
  global.vcfSendSession = global.vcfSendSession || {};
  global.vcfSendSession[dest] = { amount, message, command: 'vcfsend' };
});

// VCF Broadcast Command (with file upload)
adams({ 
  nomCom: "vcfbroadcast", 
  categorie: 'VCF Management', 
  reaction: BOT_BRANDING.EMOJI.BROADCAST 
}, async (dest, zk, { ms, repondre, arg, verifAdmin, superUser }) => {
  
  if (!verifAdmin && !superUser) {
    return repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.WARNING} *Permission Denied*\nThis command requires admin privileges`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
  }

  if (!arg[0]) {
    const instructions = [
      `${BOT_BRANDING.EMOJI.BROADCAST} *VCF BROADCAST INSTRUCTIONS*`,
      ``,
      `*Usage:* vcfbroadcast <message>`,
      `*Then:* Reply with VCF file`,
      ``,
      `*Example:*`,
      `vcfbroadcast Welcome to our service!`,
      `(then reply with your VCF file)`,
      ``,
      `*What it does:*`,
      `• Processes VCF from your uploaded file`,
      `• Sends your custom message to all contacts`,
      `• Processes in batches with delays`,
      `• Tracks progress and failed deliveries`,
      `• Avoids duplicate sends`,
      ``,
      `*Features:*`,
      `• Batch processing (403 contacts per batch)`,
      `• 3-minute delays between batches`,
      `• Progress tracking and recovery`,
      `• Failed delivery reports`
    ];

    return repondre({
      text: BOT_BRANDING.FOOTER(instructions.join('\n')),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
  }

  const message = arg.join(' ');

  await repondre({
    text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.PROCESSING} *Ready for VCF Broadcast*\n\n💬 Message: ${message}\n\n*Please reply with your VCF file*`),
    contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
  });

  // Store session data
  global.vcfSendSession = global.vcfSendSession || {};
  global.vcfSendSession[dest] = { message, command: 'vcfbroadcast' };
});

// File Handler for VCF processing
adams({ 
  nomCom: "filehandler", 
  categorie: 'VCF Management',
  reaction: "📁"
}, async (dest, zk, { ms, repondre, verifAdmin, superUser }) => {
  
  // Check if there's a pending VCF session
  if (!global.vcfSendSession || !global.vcfSendSession[dest]) {
    return;
  }

  // Check if message has document/media
  if (!ms.message?.documentMessage && !ms.message?.documentWithCaptionMessage) {
    return repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} Please send a VCF file`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
  }

  const session = global.vcfSendSession[dest];
  
  try {
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.PROCESSING} Processing VCF file...`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });

    // Download and process VCF file
    const vcfData = await downloadMedia(ms);
    const contacts = await parseVCF(vcfData);

    if (!contacts.length) {
      delete global.vcfSendSession[dest];
      return repondre({
        text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} No valid contacts found in VCF file`),
        contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
      });
    }

    if (session.command === 'vcfsend') {
      // Process VCF Send
      const selectedContacts = contacts.slice(0, session.amount);
      let successCount = 0;

      await repondre({
        text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.PROCESSING} Sending to ${selectedContacts.length} contacts...`),
        contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
      });

      for (const contact of selectedContacts) {
        try {
          await zk.sendMessage(`${contact.number}@s.whatsapp.net`, {
            text: `Hey ${contact.name || 'there'}! 👋\n\n${session.message}`,
            contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to send to ${contact.number}:`, error);
        }
      }

      await repondre({
        text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.SUCCESS} *VCF Send Complete*\n📊 Sent to ${successCount}/${selectedContacts.length} contacts`),
        contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
      });

    } else if (session.command === 'vcfbroadcast') {
      // Process VCF Broadcast
      const startTime = Date.now();
      const progress = loadProgress();
      let sentNumbers = loadSentNumbers();
      const sentNumbersSet = new Set(sentNumbers);

      // Filter out already sent numbers
      const filteredContacts = contacts.filter(contact => !sentNumbersSet.has(contact.number));
      
      if (!filteredContacts.length) {
        delete global.vcfSendSession[dest];
        return repondre({
          text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} *No New Contacts*\nAll contacts have already been processed`),
          contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
        });
      }

      let successCount = 0;
      const failedContacts = [];
      const totalBatches = Math.ceil(filteredContacts.length / CONFIG.BATCH_SIZE);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * CONFIG.BATCH_SIZE;
        const batchEnd = batchStart + CONFIG.BATCH_SIZE;
        const currentBatch = filteredContacts.slice(batchStart, batchEnd);

        await repondre({
          text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.BROADCAST} *Processing Batch ${batchIndex + 1}/${totalBatches}*\n📊 Contacts: ${currentBatch.length}\n⏱️ Elapsed: ${Math.floor((Date.now() - startTime)/60000)}m`),
          contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
        });

        for (const contact of currentBatch) {
          try {
            await zk.sendMessage(`${contact.number}@s.whatsapp.net`, {
              text: `Hey 🖐️ ${contact.name || 'Sir/Mrs'},\n\n${session.message}`,
              contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
            });
            successCount++;
            sentNumbers.push(contact.number);
            saveSentNumbers(sentNumbers);
          } catch (error) {
            failedContacts.push({
              number: contact.number,
              name: contact.name,
              error: error.message
            });
          }
        }

        progress.lastIndex = batchEnd;
        progress.totalContacts = filteredContacts.length;
        saveProgress(progress);

        if (batchIndex < totalBatches - 1) {
          await repondre({
            text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.PROCESSING} *Batch ${batchIndex + 1} Complete*\nWaiting ${CONFIG.DELAY_MINUTES} minutes before next batch...`),
            contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
          });
          
          await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_MINUTES * 60 * 1000));
        }
      }

      const durationMinutes = Math.floor((Date.now() - startTime)/60000);
      let report = [
        `${BOT_BRANDING.EMOJI.SUCCESS} *VCF Broadcast Complete*`,
        `📅 Total Contacts: ${filteredContacts.length}`,
        `✅ Successfully Sent: ${successCount}`,
        `⏱️ Total Duration: ${durationMinutes} minutes`,
        `📝 Total Sent Numbers Stored: ${sentNumbers.length}`
      ];

      if (failedContacts.length) {
        report.push(`\n${BOT_BRANDING.EMOJI.ERROR} *Failed Deliveries (${failedContacts.length})*`);
        report.push(...failedContacts.slice(0, 5).map(c => `• ${c.name || 'Unknown'}: ${c.number}`));
        if (failedContacts.length > 5) report.push(`...and ${failedContacts.length - 5} more`);
        
        const failLog = failedContacts.map(c => `${c.number},${c.name || ''},${c.error}`).join('\n');
        fs.writeFileSync('./failed_contacts.csv', `Number,Name,Error\n${failLog}`);
      }

      await repondre({
        text: BOT_BRANDING.FOOTER(report.join('\n')),
        contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
      });

      if (failedContacts.length) {
        await zk.sendMessage(dest, {
          document: { url: './failed_contacts.csv' },
          fileName: 'failed_contacts.csv',
          mimetype: 'text/csv',
          caption: 'List of failed deliveries'
        });
        fs.unlinkSync('./failed_contacts.csv');
      }
    }

    // Clear session
    delete global.vcfSendSession[dest];

  } catch (error) {
    delete global.vcfSendSession[dest];
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} *Error processing VCF:* ${error.message}`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
  }
});

// Saved Numbers Command
adams({ 
  nomCom: "savednum", 
  categorie: 'VCF Management', 
  reaction: BOT_BRANDING.EMOJI.SAVE 
}, async (dest, zk, { ms, repondre, arg, verifAdmin, superUser }) => {
  
  if (!verifAdmin && !superUser) {
    return repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.WARNING} *Permission Denied*`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
  }

  if (!arg[0]) {
    const instructions = [
      `${BOT_BRANDING.EMOJI.SAVE} *SAVED NUMBERS INSTRUCTIONS*`,
      ``,
      `*Usage:* savednum <your_number> <count> <message>`,
      ``,
      `*Example:*`,
      `savednum +1234567890 250 Hello from random numbers!`,
      ``,
      `*What happens:*`,
      `1. System detects your country from number`,
      `2. Generates random similar numbers in same country`,
      `3. Sends your message to generated numbers`,
      `4. Reports success/failure statistics`,
      ``,
      `*Supported Countries:*`,
      `US(+1), UK(+44), IN(+91), NG(+234), GH(+233), KE(+254), etc.`
    ];

    return repondre({
      text: BOT_BRANDING.FOOTER(instructions.join('\n')),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
  }

  const userNumber = arg[0];
  const count = parseInt(arg[1]);
  const message = arg.slice(2).join(' ');

  if (!userNumber.startsWith('+')) {
    return repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} Number must start with + and country code`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
  }

  if (!count || count <= 0 || count > 1000) {
    return repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} Count must be between 1-1000`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
  }

  if (!message) {
    return repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} Please provide a message to send`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
  }

  try {
    const { code, country } = getCountryCode(userNumber);
    
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.PROCESSING} Detected: ${country} (${code})\nGenerating ${count} random numbers...`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });

    const randomNumbers = generateRandomNumbers(code, userNumber, count);
    let successCount = 0;
    const failedNumbers = [];

    for (const number of randomNumbers) {
      try {
        await zk.sendMessage(`${number.replace('+', '')}@s.whatsapp.net`, {
          text: message,
          contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
        });
        successCount++;
      } catch (error) {
        failedNumbers.push(number);
      }
    }

    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.SUCCESS} *Random Send Complete*\n📊 Sent to ${successCount}/${count} numbers\n🌍 Country: ${country}\n❌ Failed: ${failedNumbers.length}`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });

  } catch (error) {
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} *Error:* ${error.message}`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
  }
});

// Fetch Members Command
adams({ 
  nomCom: "fetchmembers", 
  categorie: 'VCF Management', 
  reaction: BOT_BRANDING.EMOJI.GROUP 
}, async (dest, zk, { ms, repondre, verifAdmin, superUser }) => {
  
  if (!verifAdmin && !superUser) {
    return repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.WARNING} *Permission Denied*`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
  }

  try {
    const groupMetadata = await zk.groupMetadata(dest);
    const members = groupMetadata.participants;
    
    const membersList = members.map((member, index) => {
      const number = member.id.replace('@s.whatsapp.net', '');
      const role = member.admin ? '👑 Admin' : '👤 Member';
      return `${index + 1}. +${number} (${role})`;
    }).join('\n');

    // Save to file
    const membersData = members.map(member => ({
      number: member.id.replace('@s.whatsapp.net', ''),
      isAdmin: member.admin ? true : false,
      id: member.id
    }));

    fs.writeJsonSync(CONFIG.GROUP_MEMBERS_FILE, membersData);

    const preview = membersList.split('\n').slice(0, 20).join('\n');
    
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.GROUP} *GROUP MEMBERS (${members.length})*\n\n${preview}${members.length > 20 ? '\n\n...and more (see attached file)' : ''}`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });

    // Send as document
    fs.writeFileSync('./group_members.txt', membersList);
    await zk.sendMessage(dest, {
      document: { url: './group_members.txt' },
      fileName: 'group_members.txt',
      mimetype: 'text/plain',
      caption: BOT_BRANDING.FOOTER('Complete members list with roles')
    });
    fs.unlinkSync('./group_members.txt');

  } catch (error) {
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} *Error:* ${error.message}\n\nNote: This command only works in groups`),
      contextInfo: BOT_BRANDING.NEWSLETTER_CONTEXT
    });
  }
});
