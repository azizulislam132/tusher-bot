const fs = require('fs');
const path = require('path');

const commands = new Map();
const cmdsPath = path.join(__dirname, '..', 'scripts', 'cmds');

// scripts/cmds ফোল্ডারের ফাইল অটো-লোড করা
if (fs.existsSync(cmdsPath)) {
    const cmdFiles = fs.readdirSync(cmdsPath).filter(file => file.endsWith('.js'));
    for (const file of cmdFiles) {
        try {
            const cmdModule = require(path.join(cmdsPath, file));
            if (cmdModule.config && cmdModule.config.name) {
                commands.set(cmdModule.config.name, cmdModule);
                console.log(`✅ Loaded Command: ${cmdModule.config.name}`);
            }
        } catch (err) {
            console.log(`❌ Failed to load ${file}:`, err.message);
        }
    }
}

module.exports = function ({ api, event }) {
    const { threadID, messageID, body } = event;
    if (!body || !body.startsWith("/")) return false;

    const args = body.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (commands.has(commandName)) {
        const cmd = commands.get(commandName);
        try {
            cmd.onStart({ api, event, args });
            return true; // কমান্ড রান হলে true রিটার্ন করবে
        } catch (cmdErr) {
            api.sendMessage(`❌ Command Exec Error: ${cmdErr.message}`, threadID, messageID);
            return true;
        }
    }

    return false;
};

