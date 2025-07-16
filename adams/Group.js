const { adams } = require("../Ibrahim/adams");
const fs = require("fs-extra");
const axios = require("axios");
const { createContext } = require("../Ibrahim/helper");

// Configuration
const CONFIG = {
  VCF_URL: "https://app.bwmxmd.online/bwm-xmd-contacts-1752520364958.vcf",
  BATCH_SIZE: 250,
  DELAY_MINUTES: 5,
  MESSAGE: `Hello 🎉  

If you've previously registered in our vcf, download your VCF file here:  

Download Options:  
🔹 Get it on Telegram: t.me/bwmxmd  
🔹 Or use direct download: app.bwmxmd.online/bwm-xmd-status-boost.vcf  

How to use:  
1️⃣ Download the file  
2️⃣ Open it with your Contacts app  
3️⃣ Select your email account  
4️⃣ Enjoy unlimited status views!  

> Ibrahim Adams`
};

// Branding
const BOT_BRANDING = {
  FOOTER: (text = "") => `${text}\n\n🚀 ʙᴡᴍ xᴍᴅ ʙʏ ɪʙʀᴀʜɪᴍ ᴀᴅᴀᴍs`,
  EMOJI: {
    PROCESSING: "⌛",
    SUCCESS: "✅",
    ERROR: "❌",
    WARNING: "⚠️",
    BROADCAST: "📡"
  }
};

// Improved VCF Parser
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

// Enhanced Broadcast Command
adams({ 
  nomCom: "abuu", 
  categorie: 'Broadcast', 
  reaction: BOT_BRANDING.EMOJI.BROADCAST 
}, async (dest, zk, { ms, repondre, verifAdmin, superUser }) => {
  
  // Permission Check
  if (!verifAdmin && !superUser) {
    return repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.WARNING} *Permission Denied*\nThis command requires admin privileges`),
      ...createContext(dest, {
        title: "Admin Access Required",
        body: "Contact your administrator"
      })
    });
  }

  try {
    // Initialization
    const startTime = Date.now();
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.PROCESSING} *Starting VCF Broadcast*\nDownloading contacts from: ${CONFIG.VCF_URL}`),
      ...createContext(dest, {
        title: "VCF Broadcast Initiated",
        body: "Fetching contact data"
      })
    });

    // Download and Parse VCF
    const response = await axios.get(CONFIG.VCF_URL);
    const contacts = await parseVCF(response.data);
    
    if (!contacts.length) {
      return repondre({
        text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} *Empty VCF*\nNo valid contacts found in the VCF file`),
        ...createContext(dest, {
          title: "Processing Error",
          body: "VCF file appears empty"
        })
      });
    }

    // Batch Processing
    let successCount = 0;
    const failedContacts = [];
    const totalBatches = Math.ceil(contacts.length / CONFIG.BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * CONFIG.BATCH_SIZE;
      const batchEnd = batchStart + CONFIG.BATCH_SIZE;
      const currentBatch = contacts.slice(batchStart, batchEnd);

      // Batch Progress
      await repondre({
        text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.BROADCAST} *Processing Batch ${batchIndex + 1}/${totalBatches}*\n📊 Contacts: ${currentBatch.length}\n⏱️ Elapsed: ${Math.floor((Date.now() - startTime)/60000)}m`),
        ...createContext(dest, {
          title: `Batch ${batchIndex + 1} of ${totalBatches}`,
          body: `Processing ${currentBatch.length} contacts`
        })
      });

      // Send Messages
      for (const contact of currentBatch) {
        try {
          await zk.sendMessage(`${contact.number}@s.whatsapp.net`, {
            text: `Dear ${contact.name || 'User'},\n\n${CONFIG.MESSAGE}`
          });
          successCount++;
        } catch (error) {
          failedContacts.push({
            number: contact.number,
            name: contact.name,
            error: error.message
          });
        }
      }

      // Delay between batches (except last batch)
      if (batchIndex < totalBatches - 1) {
        await repondre({
          text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.PROCESSING} *Batch ${batchIndex + 1} Complete*\nWaiting ${CONFIG.DELAY_MINUTES} minutes before next batch...`),
          ...createContext(dest, {
            title: "Batch Complete",
            body: "Waiting before next batch"
          })
        });
        
        await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_MINUTES * 60 * 1000));
      }
    }

    // Generate Report
    const durationMinutes = Math.floor((Date.now() - startTime)/60000);
    let report = [
      `${BOT_BRANDING.EMOJI.SUCCESS} *VCF Broadcast Complete*`,
      `📅 Total Contacts: ${contacts.length}`,
      `✅ Successfully Sent: ${successCount}`,
      `⏱️ Total Duration: ${durationMinutes} minutes`
    ];

    if (failedContacts.length) {
      report.push(`\n${BOT_BRANDING.EMOJI.ERROR} *Failed Deliveries (${failedContacts.length})*`);
      report.push(...failedContacts.slice(0, 5).map(c => `• ${c.name || 'Unknown'}: ${c.number} (${c.error})`));
      if (failedContacts.length > 5) report.push(`...and ${failedContacts.length - 5} more`);
      
      // Save failed contacts to file
      const failLog = failedContacts.map(c => `${c.number},${c.name || ''},${c.error}`).join('\n');
      fs.writeFileSync('./failed_contacts.csv', `Number,Name,Error\n${failLog}`);
    }

    // Send Final Report
    await zk.sendMessage(dest, {
      text: BOT_BRANDING.FOOTER(report.join('\n')),
      ...createContext(dest, {
        title: "Broadcast Complete",
        body: `Processed ${contacts.length} contacts`
      })
    }, { quoted: ms });

    // Attach failed contacts file if any
    if (failedContacts.length) {
      await zk.sendMessage(dest, {
        document: { url: './failed_contacts.csv' },
        fileName: 'failed_contacts.csv',
        mimetype: 'text/csv',
        caption: 'List of failed deliveries'
      });
      fs.unlinkSync('./failed_contacts.csv');
    }

  } catch (error) {
    await repondre({
      text: BOT_BRANDING.FOOTER(`${BOT_BRANDING.EMOJI.ERROR} *Critical Error*\n${error.message}\n\nStack Trace:\n${error.stack}`),
      ...createContext(dest, {
        title: "Broadcast Failed",
        body: "Check error details"
      })
    });
  }
});
