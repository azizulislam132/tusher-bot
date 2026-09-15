module.exports = {
  config: {
    name: "welcomeLeave",
    version: "1.0.0",
    author: "Tusher Khan",
    description: "গ্রুপে নতুন মেম্বার যুক্ত হলে স্টাইলিশ ওয়েলকাম এবং লিভ নিলে বিদায় জানাবে।"
  },

  onEvent: async function ({ api, event }) {
    const { threadID, logMessageType, logMessageData } = event;

    // ১. নতুন মেম্বার যুক্ত হলে (Welcome Event)
    if (logMessageType === "log:subscribe") {
      const addedParticipants = logMessageData.addedParticipants;

      try {
        // গ্রুপের তথ্য নিয়ে আসাই
        const threadInfo = await api.getThreadInfo(threadID);
        const groupName = threadInfo.threadName || "আমাদের গ্রুপে";

        for (let member of addedParticipants) {
          const memberName = member.fullName;
          const memberID = member.userFbId;

          const welcomeMsg = 
`╔═══•✿•════╗
  💐আ্ঁস্ঁসা্ঁলা্ঁমু্ঁ💚 
  💚আ্ঁলা্ঁই্ঁকু্ঁম্ঁ💐
╚═══•✿•════╝
       ❥~𝐍𝐄𝐖~❥
  🇲‌🇪‌🇲‌🇧‌🇪‌🇷‌
✺আ্ঁপ্ঁনা্ঁকে্ঁ      
         আ্ঁমা্ঁদে্ঁর্ঁ✺࿐

══1️⃣3️⃣≛⃝░⃟̎̎̎̎̐💕${groupName}💕≛⃝░⃟̎̎̎̎̐══

এ্ঁর্ঁ প্ঁক্ষ্ঁ🍀থে্ঁকে্ঁ🍀—🌸হা্ঁজা্ঁর্ঁ লা্ঁল্ঁ গো্ঁলা্ঁপে্ঁর্ঁ শু্ঁভে্ঁচ্ছা্ঁ
  🥀🥀💐 💐💐    
ভা্ঁলো্ঁবা্ঁসা্ঁ_অ্ঁভি্ঁরা্ঁম্ঁ_🌺♥️
𒍮ꔷ⃟ꔷ⃟ ـٰٖٖٖٖٖٜ۬ـٰٰٖٖ🥰🖤ꔷ⃟ꔷ⃟𒍮_
༄✺আ্ঁশা্ঁ ক্ঁরি্ঁ আ্ঁপ্ঁনি্ঁ আ্ঁপ্ঁনা্ঁর্ঁ মু্ঁল্য্ঁবা্ঁন্ঁ স্ঁম্ঁয়্ঁ আ্ঁমা্ঁদে্ঁর্ঁ কে্ঁ উ্ঁপ্ঁহা্ঁর্ঁ দি্ঁবে্ঁন্ঁ ❁࿐স্ঁব্ঁ স্ঁম্ঁয়্ঁ পা্ঁশে্ঁ থা্ঁক্ঁবে্ঁন্ঁ  🥀♥️🌺
 🫶🫶═💚═🫶🫶
🆆🅴🅻🅲🅾🅼🅴
🫶🫶═💚═🫶🫶
        ┊┊┊┊┊❤️‍🩹    
　    ┊┊┊┊💚  
　　┊┊┊🤍   
        ┊┊🖤         
　　┊💙
╔╦══✠❀✠══╦╗
   💘       ☟      💘               
      @${memberName}
╚╩══✠❀✠══╩╝`;

          // ইউজারকে ট্যাগ করার জন্য mentions অবজেক্ট
          const mentions = [{
            tag: `@${memberName}`,
            id: memberID
          }];

          api.sendMessage({ body: welcomeMsg, mentions }, threadID);
        }
      } catch (e) {
        console.log("❌ Welcome Error:", e.message || e);
      }
    }

    // ২. কোনো মেম্বার লিভ নিলে বা রিমুভ হলে (Leave Event)
    if (logMessageType === "log:unsubscribe") {
      const leftParticipantID = logMessageData.leftParticipantFbId;

      try {
        api.getUserInfo(leftParticipantID, (err, userInfo) => {
          let name = "একজন সদস্য";
          if (!err && userInfo[leftParticipantID]) {
            name = userInfo[leftParticipantID].name;
          }

          const leaveMsg = `👋 **${name}** গ্রুপ ছেড়ে চলে গেছেন (অথবা রিমুভ করা হয়েছে)।\n\nআপনার সুন্দর ভবিষ্যতের জন্য শুভকামনা রইল! ✨`;
          api.sendMessage(leaveMsg, threadID);
        });
      } catch (e) {
        console.log("❌ Leave Error:", e.message || e);
      }
    }
  }
};
