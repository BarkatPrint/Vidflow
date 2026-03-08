// ── TRENDING TOPICS (Viral niches) ────────────────────────────
const VIRAL_TOPICS = [
  'Mehnat karo aur safal ho','Paisa kamao ghar baithe','Life changing tips',
  'Motivational story','Success secrets','Daily habits of successful people',
  'How to earn money online','Never give up','Hard work pays off',
  'Ek din sab badal jayega','Zindagi mein aage badhne ke tarike',
]

const EMOJIS = ['🔥','💯','✅','🚀','⚡','💪','🎯','🌟','👑','💎','🙏','😱']

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// ── TRENDING TITLE TEMPLATES ───────────────────────────────────
const TITLE_TEMPLATES = [
  t => `${rnd(EMOJIS)} ${t} — Ye Zaroor Dekho! | #Shorts #Viral`,
  t => `${t} 🔥 | Must Watch ${new Date().getFullYear()} #Trending #YouTube`,
  t => `💯 ${t} | Puri Sachchi Baat #Shorts #Hindi`,
  t => `${rnd(EMOJIS)} ${t} — Shocking Reality! 😱 #Viral #India`,
  t => `${t} 🚀 | Ye Secret Koi Nahi Batata #YouTube #Hindi`,
  t => `🙏 ${t} | Life Changing Video #Motivation #Shorts`,
  t => `${rnd(EMOJIS)} ${t} — Ek Baar Zaroor Suno! #Viral2024`,
  t => `${t} 💪 | ${new Date().getFullYear()} Ka Best Advice #Trending`,
]

// ── AI CONTENT GENERATOR ──────────────────────────────────────
export function generateAI(topic) {
  // If topic is a filename/garbage, use a viral topic instead
  const cleanTopic = topic
    .replace(/\.[^.]+$/, '')
    .replace(/[-_()[\]0-9]{3,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // If cleaned topic is too short or looks like random chars, use viral topic
  const isGarbage = cleanTopic.length < 4 || /^[a-z0-9_-]{1,6}$/i.test(cleanTopic)
  const finalTopic = isGarbage ? rnd(VIRAL_TOPICS) : cleanTopic

  const title = rnd(TITLE_TEMPLATES)(finalTopic)

  const hashTopic = finalTopic.replace(/\s+/g, '')
  const desc = `${rnd(EMOJIS)} ${finalTopic} ke baare mein ye video aapki zindagi badal sakta hai!

✅ LIKE karo agar ye helpful laga
🔔 SUBSCRIBE karo — notifications ON karo  
💬 COMMENT mein batao — aapka experience kaisa raha?
📤 SHARE karo un dosto ke saath jinhe zaroorat hai

━━━━━━━━━━━━━━━━━━━━━━━
📌 IS VIDEO MEIN:
00:00 - Intro
00:10 - Problem samjho
00:25 - Solution dekho
00:45 - Key Points
01:00 - Action Plan
━━━━━━━━━━━━━━━━━━━━━━━

🏷️ #${hashTopic} #Shorts #Viral #Trending #YouTube #Hindi #India #${new Date().getFullYear()} #Motivation #BarkatWork #Subscribe #Like #Share #Reels #viralvideo #ytshorts #youtubeshorts #trending${new Date().getFullYear()} #hindiMotivation #successmindset`

  const tags = [
    finalTopic, hashTopic,
    'shorts', 'viral', 'trending', 'youtube', 'hindi', 'india',
    String(new Date().getFullYear()), 'motivation', 'barkatwork',
    'subscribe', 'like', 'share', 'reels', 'viralvideo',
    'ytshorts', 'youtubeshorts', 'hindiMotivation', 'successmindset',
    'lifetips', 'dailymotivation',
  ].slice(0, 20)

  return { title, desc, tags, topic: finalTopic }
}

// ── ALIAS for old code ────────────────────────────────────────
export function aiFromFilename(filename) {
  return generateAI(filename)
}

// ── AI PAGE HELPERS ───────────────────────────────────────────
export function localTitles(topic) {
  return TITLE_TEMPLATES.map(fn => fn(topic))
}
export function localDesc(topic) {
  return generateAI(topic).desc
}
export function localTags(topic) {
  return generateAI(topic).tags
}
export function localScript(topic) {
  return `[INTRO - 5 seconds]
Namaste doston! Aaj hum baat karenge "${topic}" ke baare mein.

[HOOK - 10 seconds]
Kya aap jaante hain "${topic}" ke baare mein ye shocking facts?
Ye video dekhne ke baad aapki soch badal jayegi!

[MAIN CONTENT - 40 seconds]
1. Pehli baat: "${topic}" aaj ke time mein bahut important hai...
2. Doosri baat: Isko implement karne se aapko bahut faayda hoga...
3. Teesri baat: Ye secret jaanna bahut zaroori hai...
4. Chauthi baat: Isko daily life mein kaise use karein...

[CALL TO ACTION - 10 seconds]
Doston, agar ye video helpful lagi to LIKE zaroor karo.
SUBSCRIBE karo channel ko — daily motivation milega.
COMMENT mein batao — aapka sabse bada challenge kya hai?

[OUTRO - 5 seconds]
Milte hain next video mein — tab tak mehnat karte raho!
Jai Hind! 🇮🇳`
}