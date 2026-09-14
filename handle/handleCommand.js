const fs = require('fs');
const path = require('path');

module.exports = function ({ api, event }) {
    const { threadID, messageID, body } = event;
    if (!body || !body.startsWith("/")) return false;

    const args = body.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const cmdsPath = path.join(__dirname, '..', 'scripts', 'cmds');

    // কমান্ড ডিরেক্টরি থেকে সরাসরি ফ্রেশ কমান্ড লোড করা
    if (fs.existsSync(cmdsPath)) {
        const cmdFiles = fs.readdirSync(cmdsPath).filter(file => file.endsWith('.js'));
        
        for (const file of cmdFiles) {
            const filePath = path.join(cmdsPath, file);
            try {
                // ক্যাশ ক্লিয়ার করে ফ্রেশ মোডিউল লোড
                delete require.cache[require.resolve(filePath)];
                const cmdModule = require(filePath);
                
                if (cmdModule.config && cmdModule.config.name.toLowerCase() === commandName) {
                    cmdModule.onStart({ api, event, args });
                    return true;
                }
            } catch (err) {
                console.log(`❌ Error executing ${file}:`, err.message);
            }
        }
    }

    return false;
};
