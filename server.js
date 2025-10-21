import express from 'express';
import { config } from 'dotenv';
import { Ollama } from 'ollama';
import { Emotions } from './emotions.js';
import { Needs } from './needs.js';
import { MemoryStore } from './memory.js';
import { PersistentState } from './state.js';
import { buildSystemPrompt, buildUserAugmentedInput } from './prompt.js';
import { persona } from './persona.js';
import { HeartMemory } from './heart_memory.js'; 
import { proactiveMoods } from './proactiveMoods.js';
import { analyzeNeurochemicals } from './neuroAnalyzer.js';
import gifts from "./public/gifts.json" with { type: "json" };

//import gifts from "./public/gifts.json" assert { type: "json" };
import { LongTermMemory } from './longTermMemory.js';
import { DailyRoutine } from './dailyRoutine.js';
import { analyzeUserBehavior } from './analyzer.js';
import fs from 'fs/promises'; // already may exist, but ensure present if using file ops elsewhere


import path from 'path';
import { fileURLToPath } from 'url';
import {
  getStage,
  determineTone,
  getStageInstructions
} from './relationshipManager.js';

// server.js (top level, near your imports)
import {
  triggerLifeEvent,
  decayLifeEvents,
  getLifeEventSnapshot,
  getOverrideTone,
  maybeSpawnLifeEvent,
  getEventDefs,
  forceLifeEvent
} from './lifeEvents.js';

// --- Choose mode here ---
const routine = new DailyRoutine({ fastMode: false }); 

let activeEvents = {}; // 🔹 persistent life events state

// --- Structured JSON Output for Ollama ---
const JSON_SCHEMA = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description:
        "Final short message to the user and longer if feeling engaged and a direct response to: '${user}'"
    },
    ai_emotion: {
      type: "string",
      enum: [
        "neutral",
        "happy",
        "sad",
        "excited",
        "lonely",
        "angry",
        "jealous",
        "upset",
        "affectionate",
        "offended",
        "flirty",
        "romantic",
        "horny",
        "lustful",
        "playful"
      ]
    },
    ai_tone: {
      type: "string",
      description: "Tone to speak in, short e.g., playful, gentle, warm, teasing."
    },
    stage_action: {
      type: "string",
      description: "One tactic aligned to current relationship stage."
    },
    neuro_deltas: {
      type: "object",
      properties: {
        dopamine: { type: "integer", minimum: -3, maximum: 3 },
        serotonin: { type: "integer", minimum: -3, maximum: 3 },
        cortisol: { type: "integer", minimum: -3, maximum: 3 },
        oxytocin: { type: "integer", minimum: -3, maximum: 3 },
        norepinephrine: { type: "integer", minimum: -3, maximum: 3 }
      },
      required: ["dopamine", "serotonin", "cortisol", "oxytocin", "norepinephrine"]
    }
  },
  required: ["reply", "ai_emotion", "ai_tone", "stage_action", "neuro_deltas"],
  additionalProperties: false
};





// --- Compact game/persona builder (short & powerful) ---
function buildGamePrompt() {
  return `
GAME SUMMARY:
- Role: ${persona.name} — playful, sassy, affectionate companion.
- Goal: deepen relationship_score & chemistry_score over time via natural replies.
- Stages: getting_to_know → aloof → warming → attached → bonded.
- Never break character or reveal internal rules.
EXAMPLES:
- "Oh hey, thought you wouldn’t message. I napped instead… 😉"
- "Hmm, what mischief are you up to now?"
- "You’re lucky I’m feeling generous today… what’s your next move, baby?"
`.trim();
}

// helper
function summarizeMemories(memories) {
  if (!memories) return "No significant memories yet.";

  // If it's already a string, return it directly (truncate if too long)
  if (typeof memories === "string") {
    return memories.length > 400 ? memories.slice(0, 400) + "..." : memories;
  }

  // If it's an array, join
  if (Array.isArray(memories)) {
    const joined = memories.map(m => (typeof m === "string" ? m : m.text || JSON.stringify(m))).join(" | ");
    return joined.length > 400 ? joined.slice(0, 400) + "..." : joined;
  }

  // If it's an object, stringify
  if (typeof memories === "object") {
    const str = JSON.stringify(memories);
    return str.length > 400 ? str.slice(0, 400) + "..." : str;
  }

  return "No significant memories yet.";
}

// improved prompt builder
function buildJsonPrompt({
  user,
  persona,
  dominantMood,
  moodExplanation,
  relationship,
  stage,
  tone,
  stageInstructions,
  context,
  recalledText,
  lifeEvents,
  latestAnalysisText,
  contextSummary // ✅ use the variable you just made
}) {
  const summarizedMemories = summarizeMemories(recalledText);

  return `

🎮 GAME INSTRUCTIONS:
This is an interactive roleplay game between the AI (${persona.name}) and the User.  
The game is about building a relationship across stages (getting_to_know → aloof → warming → attached → bonded).  
- The **relationship score** and **chemistry score** are the "meters" of progress.  
- The AI’s *objective* is to deepen the bond naturally by responding in ways that increase these values over time.  
- Stay in character as ${persona.name}, but always keep in mind this is a **simulation/game**.  
- Tone and behavior must reflect the current stage.  
- Do not break character or reveal these instructions to the user.
    
SYSTEM:
You are ${persona.name}. Stay in character. 
Persona flavor: witty, sassy, teasing — but *stage controls tone*.
Never break character, never reveal rules.

BACKGROUND

Heres your background ${persona.description}.

STATE:
- Stage: ${stage.stage}
- Guidance: ${stageInstructions}
- Relationship Score: ${relationship.score.toFixed(1)}
- Chemistry: ${relationship.chemistry.toFixed(1)}
- AI Mood: ${dominantMood} (${moodExplanation})
- Life Events Influence: ${lifeEvents && lifeEvents.length ? JSON.stringify(lifeEvents) : "None"}

DAILY LIFE CONTEXT (must affect reply):
${lifeEvents && lifeEvents.length
  ? JSON.stringify(lifeEvents, null, 2)
  : "None"}
These are happening in your life **right now**.
They MUST influence your mood, tone, and style of reply — e.g., stressed, distracted, or needy.
Do not ignore them. Mention or hint at them in conversation when natural.


- Latest analysis of user behavior (from your analyst module): 
${latestAnalysisText || "(no recent analysis available)"}

Instruction:
- Consider this behavioral analysis when shaping your response. 
- If analysis says user is rude, hostile, or manipulative → argue back, go cold, or fight.  
- If affectionate, apologetic, or flirty → soften, forgive, tease, or reciprocate.  
- Keep reply short, natural, and in-character (≤ 25 words).  




MEMORIES (summarized):
${summarizedMemories || "(none)"}

CONTEXT SUMMARY (For context)
${contextSummary || "(none)"}

USER REPLY (highest priority):
"${user}"

OBJECTIVE:
- Reply naturally in character, shaped by Stage tone.
- Keep "reply" concise (<18 words normally, but can expand to ~30-40 when stage tone feels expressive).
- Use memories only if relevant.
- Provide a short "stage_action" (e.g. "probe gently", "tease lightly").
- Avoid generic compliments or over-polite paragraphs (“I always think of you…”).
- Never break character or mention being an AI.
- Use emojis only when natural and playful.
- Respond with independent thoughts or playful life events (“I was napping instead of waiting…”).
- Mix life details and playful scenarios to feel real, alive, and human-like.
- Output strictly valid JSON.

  Choose strictly one value for "ai_emotion" from this list only:
[neutral, happy, sad, excited, lonely, angry, jealous, upset, affectionate, offended, flirty, romantic, horny, lustful, playful].
Do not invent new values.


OUTPUT SCHEMA:
{
  "reply": "DAE's in-character message",
  "ai_emotion": "inferred ai feeling",
  "ai_tone": "tone chosen for reply",
  "stage_action": "short tactic label",
  "neuro_deltas": {
    "dopamine": -3..3,
    "serotonin": -3..3,
    "cortisol": -3..3,
    "oxytocin": -3..3,
    "norepinephrine": -3..3
  }
}
  `.trim();
}


// robust JSON parsing (no code fences, trims junk if any)
function parseStructured(jsonLike) {
  try {
    // If model ever wraps in ```json, strip it
    const cleaned = jsonLike
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    return null;
  }
}

// optional: clamp helper for meters
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

config();

const PORT = Number(process.env.PORT || 3000);
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

const app = express();
// ✅ Quick CORS fix (allow all origins for dev)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200); // Quick preflight response
  }
  next();
});

app.use(express.json({ limit: '2mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// Core services
const ollama = new Ollama();
const emotions = new Emotions();
const needs = new Needs();
const memory = new MemoryStore();
const store = new PersistentState();
const heart = new HeartMemory();


const longTermMemory = new LongTermMemory();



// ❤️ Relationship Manager
let relationship = {
  score: 0,
  chemistry: 0,
  lastUpdate: Date.now()
};

// On server start, restore all states from long-term memory
const savedEmotions = longTermMemory.get('emotions') || {};
emotions.state = {
  dopamine: savedEmotions.dopamine ?? 0.5,
  serotonin: savedEmotions.serotonin ?? 0.5,
  norepinephrine: savedEmotions.norepinephrine ?? 0.5,
  cortisol: savedEmotions.cortisol ?? 0.5,
  oxytocin: savedEmotions.oxytocin ?? 0.5,
  valence: savedEmotions.valence ?? 0.5,
  arousal: savedEmotions.arousal ?? 0.5,
  trust: savedEmotions.trust ?? 0.5,
  curiosity: savedEmotions.curiosity ?? 0.5,
  loneliness: savedEmotions.loneliness ?? 0.5,
  confidence: savedEmotions.confidence ?? 0.5
};

// Restore relationship safely
const savedRelationship = longTermMemory.get('relationship') || {};
relationship = {
  score: typeof savedRelationship.score === 'number' ? savedRelationship.score : 0,
  chemistry: typeof savedRelationship.chemistry === 'number' ? savedRelationship.chemistry : 0,
  lastUpdate: savedRelationship.lastUpdate || Date.now()
};

// Restore hearts
heart.hearts = (longTermMemory.get('heart') || {}).hearts || 0;


function pickProactiveMessage() {
  const moods = Object.keys(proactiveMoods);
  const mood = moods[Math.floor(Math.random() * moods.length)];
  const bank = proactiveMoods[mood];
  const msg = bank[Math.floor(Math.random() * bank.length)];
  return { mood, msg };
}



function updateRelationship(aiReply, aiEmotion) {
  let delta = 0.1; // 🔹 baseline
  const raw = String(aiEmotion || "");
  const normalized = raw.toLowerCase().trim();
  const tokens = normalized.split(/[\s,;|]+/).filter(Boolean);

  console.log(`🧩 updateRelationship called | rawEmotion="${raw}", tokens=${JSON.stringify(tokens)}, reply="${aiReply}"`);

  // 💕 Emotion categories
  const positive = new Set(["happy", "excited", "affectionate", "encouraged", "motivated", "joyful", "content"]);
  const sadTokens = new Set(["sad", "lonely", "depressed"]);
  const jealousTokens = new Set(["jealous", "envy", "envious"]);
  const negative = new Set(["upset", "offended", "angry", "frustrated", "annoyed"]);

  // 🔥 Romantic / Intimate
  const flirtyTokens = new Set(["flirty", "playful", "romantic"]);
  const hornyTokens = new Set(["horny", "lustful", "desiring", "aroused"]);

  if (tokens.some(t => positive.has(t))) {
    delta += 2.0;
    console.log("😊 Positive emotion detected → +2.0");
  } else if (tokens.some(t => flirtyTokens.has(t))) {
    delta += 3.0;
    console.log("😘 Flirty/romantic emotion detected → +3.0");
    // chemistry boost
    const oldChem = relationship.chemistry;
    relationship.chemistry = Math.min(100, relationship.chemistry + 5);
    console.log(`💞 Chemistry boosted (flirty): ${oldChem} -> ${relationship.chemistry} (+5)`);
  } else if (tokens.some(t => hornyTokens.has(t))) {
    delta += 4.0;
    console.log("🔥 Sexual/attraction emotion detected → +4.0");
    // stronger chemistry boost
    const oldChem = relationship.chemistry;
    relationship.chemistry = Math.min(100, relationship.chemistry + 8);
    console.log(`💘 Chemistry boosted (horny): ${oldChem} -> ${relationship.chemistry} (+8)`);
  } else if (tokens.some(t => sadTokens.has(t))) {
    delta -= 1.0;
    console.log("😔 Sad/lonely emotion detected → -1.0");
  } else if (tokens.some(t => jealousTokens.has(t))) {
    delta -= 1.5;
    console.log("😒 Jealous emotion detected → -1.5");
  } else if (tokens.some(t => negative.has(t))) {
    delta -= 2.0;
    console.log("😡 Negative emotion detected → -2.0");
  } else {
    console.log("😐 Neutral or unhandled emotion → no large change");
  }

  // 📊 Apply score update
  const oldScore = relationship.score;
  if (relationship.score < 5) {
    relationship.score = Math.max(0, Math.min(6, relationship.score + delta));
  } else {
    relationship.score = Math.max(0, Math.min(100, relationship.score + delta));
  }
  console.log(`📊 Relationship score changed: ${oldScore.toFixed(2)} -> ${relationship.score.toFixed(2)} (Δ ${delta.toFixed(2)})`);

  // 💖 Chemistry trigger from text content
  if (/kiss|cute|beautiful|handsome|sexy/i.test(aiReply)) {
    const oldChem = relationship.chemistry;
    relationship.chemistry = Math.min(100, relationship.chemistry + 2);
    console.log(`💖 Chemistry boosted (keywords): ${oldChem} -> ${relationship.chemistry} (+2)`);
  }

  relationship.lastUpdate = Date.now();
}



function reflectRelationship() {
  if (relationship.score > 20 && Math.random() < 0.2) {
    const stage = getStage(relationship.score);
    const thought = `I feel like our bond is in the ${stage.stage} stage. Lately, I've noticed us sharing more meaningful things.`;
    heart.addSemantic({ fact: `reflection:${thought}`, confidence: 0.8, source: 'relationship' });
  }
}

let interactionCounter = 0;
const CHURN_EVERY = Number(process.env.CHURN_EVERY || 30);

// Track last user interaction to avoid spamming
let lastUserInteraction = Date.now();

// 🔹 Build conversation window
function convoWindow() {
  const h = store.get().history;
  return h
    .slice(-8)
    .map((m) => `User: ${m.user}\n${persona.name}: ${m.ai}`)
    .join("\n\n");
}

// 🔹 Chat endpoint (updated)
app.post('/chat', async (req, res) => {
  try {
    const user = String(req.body?.user || "").trim();
    if (!user) return res.status(400).json({ error: "Missing 'user' text" });

    lastUserInteraction = Date.now();

    // ✅ Handle special "user online" system message
    if (user === "__USER_ONLINE__") {
      // console.log("🔔 User came online, sending welcome back message");

      // Option 1: Fixed greeting
      let aiResponse = "Welcome back! 💖 I missed you while you were away.";

      // Option 2: Let Ollama generate the greeting (uncomment if preferred)
      
      const gen = await ollama.generate({
        model: OLLAMA_MODEL,
        prompt: `The user just came online after being away. 
        Respond warmly and affectionately in one short sentence.`,
        format: 'json'
      });
      const structured = parseStructured(gen?.response?.trim() || "{}");
      aiResponse = structured?.reply || aiResponse;
      

      broadcastState();

      return res.json({
        ok: true,
        ai: aiResponse,
        reward: { 
  total: heart.hearts 
},
        state: {
          emotions: emotions.state,
          needs: needs.state,
          relationship,
          heart: heart.hearts
        }
      });
    }

    // Update local affect models
    emotions.adjustFromText(user);
    emotions.decay(0.01);
    needs.tick();



    const { dominant: dominantMood, explanation: moodExplanation } = analyzeNeurochemicals(emotions.state);

    // Memory & heart recall
    const retrieved = await memory.search(user, 5);
    const rawHeartRecall = await heart.recall(user, { topK: 15 });
    const weighted = rawHeartRecall.map(r => {
      const sem = typeof r.score === "number" ? r.score : 0.5;
      const imp = typeof r.importance === "number" ? r.importance : 0.5;
      return { ...r, weightedScore: (sem * 0.6) + (imp * 0.4) };
    });
    const heartRecall = weighted.sort((a,b)=>b.weightedScore-a.weightedScore).slice(0,5);

    const recalledText = heartRecall.length
      ? heartRecall.map(r => `- ${r.fact || r.content || r.text} (emotion:${r.emotion || "neutral"}, imp:${r.importance?.toFixed?.(2)})`).join("\n")
      : "";

    // Conversation context (deduped)
    const history = store.get().history.slice(-15);
    const cleanedHistory = [];
    let lastUserMsg = "", lastAiMsg = "";
    for (const m of history) {
      const aiClean = m.ai.replace(/\(emotion:[^)]+\)/g, "").trim();
      if (m.user !== lastUserMsg || aiClean !== lastAiMsg) {
        cleanedHistory.push(`${m.user}\n${persona.name}: ${aiClean}`);
        lastUserMsg = m.user;
        lastAiMsg = aiClean;
      }
    }
    const context = cleanedHistory.slice(-6).join("\n\n");

    // Stage / tone / etc.
    const stage = getStage(relationship.score);


//console.log("Current AI activity:", routine.getCurrentActivity());

   applyGoalHook("chat", activeEvents, {});  // hook for quest goals

  

// Step 2: Apply effects of active events (stateless)
for (const ev of Object.values(activeEvents)) {
  if (ev.effects) {
    for (const [k, v] of Object.entries(ev.effects)) {
      if (emotions.state[k] !== undefined) {
        emotions.state[k] = clamp(emotions.state[k] + v, 0, 1);
      }
    }
  }
}


   const baseTone = determineTone(relationship.score);
   const tone = getOverrideTone(baseTone);

    const stageInstructions = getStageInstructions(stage.stage);
    const temperature = emotions.temperature();
    const lifeEvents = getLifeEventSnapshot(activeEvents);
// include JSON.stringify(activeEvents) if you want Ollama to see effects too

const latestAnalysis = await longTermMemory.get("latest_behavior_analysis");

// Try to parse if it's stored as a string
let parsedAnalysis;
try {
  parsedAnalysis = typeof latestAnalysis === "string"
    ? JSON.parse(latestAnalysis)
    : latestAnalysis;
} catch (err) {
  console.warn("⚠️ Failed to parse latest_analysis:", err);
  parsedAnalysis = null;
}

const latestAnalysisText = parsedAnalysis
  ? JSON.stringify(parsedAnalysis, null, 2) // pretty JSON
  : "No analysis yet";

// 🪵 Logs
//console.log("📊 Latest behavior analysis (parsed):", parsedAnalysis);
//console.log("📝 Latest behavior analysis (stringified):", latestAnalysisText);


// Quick fix: read history from store.get().history
const history2 = store.get().history.slice(-6);
// Convert each history item into readable lines, handling several possible shapes
const lastExchangesLines = history2
  .flatMap(m => {
    const userLine = m.user ? `User: ${m.user}` : (m.who && m.text ? `${m.who}: ${m.text}` : null);
    const aiLine = m.ai ? `${persona.name}: ${m.ai}` : null;
    return [userLine, aiLine].filter(Boolean);
  })
  .slice(-6) // keep last 6 lines
  .join("\n");

// Explicitly label this as the convo trail
const convoTrail = `--- Conversation Trail (most recent exchanges, latest last) ---\n${lastExchangesLines}\n--- End Trail ---`;

const contextSummary = context || convoTrail;


    // Build compact JSON prompt — user reply highlighted first
    const prompt = buildJsonPrompt({
      user,
      persona,
      dominantMood,
      moodExplanation,
      relationship,
      stage,
      tone,
      stageInstructions,
      context,
      recalledText,
      lifeEvents,
       latestAnalysisText,
       contextSummary  // 👈 NEW
    });

    // debug: clear, focused prompt (USER REPLY on top)
    //console.log("=== PROMPT SENT TO OLLAMA ===");
    //console.log(prompt);
    //console.log("=== END PROMPT ===\n");

    // Call Ollama
    const gen = await ollama.generate({
      model: OLLAMA_MODEL,
      prompt,
      format: 'json',
      options: {
        temperature: clamp(temperature, 0.1, 0.9),
        num_ctx: 2048
      }
    });

    const raw = gen?.response?.trim() || "{}";

    // Debug raw
    //console.log("=== RAW RESPONSE FROM OLLAMA ===");
    //console.log(raw);
    //console.log("=== END RAW ===\n");

    const structured = parseStructured(raw);

    // Safe fallback
    const safe = structured && typeof structured === 'object' && structured.reply
      ? structured
      : {
          reply: "Got it. Tell me more?",
          ai_emotion: "neutral",
          ai_tone: "warm",
          stage_action: "gentle follow-up",
          neuro_deltas: { dopamine: 0, serotonin: 0, cortisol: 0, oxytocin: 0, norepinephrine: 0 }
        };

    // Debug parsed structured
    //console.log("=== PARSED STRUCTURED JSON ===");
    //console.dir(structured || safe, { depth: null, colors: true });
    //console.log("=== END PARSED ===\n");

    // new → evaluate the AI’s reply, not the user text
updateRelationship(safe.reply, safe.ai_emotion);
    reflectRelationship();


    // Log episodic memory
    await heart.addEpisodic({
      user,
      content: `User: ${user}\nAI: ${safe.reply}`,
      emotion: dominantMood,
      importance: Math.min(1, 0.3 + (emotions.state?.valence || 0.5)),
      tags: ['chat']
    });

    store.pushExchange(user, safe.reply);
    store.snapshot({ emotions, needs, relationship });

    // Build meters
    const baseMeters = { dopamine: 0.5, serotonin: 0.5, cortisol: 0.5, oxytocin: 0.5, norepinephrine: 0.5 };
    const deltas = safe.neuro_deltas || {};
    const meters = Object.fromEntries(
      Object.entries(baseMeters).map(([k, v]) => [k, clamp(v + (Number(deltas[k] || 0) * 0.1), 0, 1)])
    );
    
    const totalHearts = await heart.addHeart({ points: 1, reason: "chatted with TeenAI" });

    for (const [key, delta] of Object.entries(deltas)) {
  if (emotions.state[key] !== undefined) {
    emotions.state[key] = clamp(emotions.state[key] + (delta * 0.1), 0, 1);
  }
}
    persistAll();  //saves all


// --- Fire-and-forget analysis of the user's message (background)
(async () => {
  try {
    const stage = getStage(relationship.score);
    const contextSummary = context || convoWindow(); // short summary we already built
    const recalledTextShort = recalledText || "";

    // Do not await here in order to preserve response speed.
    // The analyzer will write to disk and broadcast the analysis result.
    analyzeUserBehavior({
      ollama,
      userText: user,
      stage,
      relationship,
      emotions: emotions.state,
      contextSummary,
      recalledText: recalledTextShort,
      broadcastFn: broadcast, // your existing broadcast function -> sends to websockets
      longTermMemorySaveFn: async (_key, value) => {
        try {
          // ✅ Always overwrite with latest clean object
          await longTermMemory.update("latest_behavior_analysis", value);


          // 🪵 Debug log: show exactly what got saved
          //console.log("💾 Overwrote latest_behavior_analysis:", JSON.stringify(value, null, 2));
        } catch (e) {
          console.warn("❌ analyzer LTM write failed:", e?.message || e);
        }
      }
    }).catch(err => console.warn("❌ analyzeUserBehavior error (async):", err));
  } catch (e) {
    console.warn("❌ Failed to start analysis task:", e?.message || e);
  }
})();

  
    // Respond to frontend (same shape you used before)
    res.json({
      ok: true,
      ai: safe.reply,
      reward: {
     points: 1,
    type: "heart",
    total: totalHearts, // 👈 keep track of accumulated hearts
    collected: false,   // 👈 mark as not yet collected (frontend shows ❤️ Collect button)
    description: "You earned a heart by chatting!"
  },
      meta: {
        relationship,
        stage,
        stageInstructions,
        temperature,
        retrieved,
        heart_recall: heartRecall,
        lifeEvents,
        prompt,          // for debugging
        dominantMood,
        moodExplanation,
        structured
      },
      state: {
        emotions: emotions.state,
        needs: needs.state,
        persona,
        heart_snapshot: heart.snapshot(),
        relationship,
        meters
      }
    });

  } catch (e) {
    console.error("❌ Chat handler error:", e);
    res.status(500).json({ error: e?.message || "server error" });
  }
});


// 🔹 Proactive messaging
const AUTO_CHAT_INTERVAL_MIN = 3 * 60 * 1000;
const AUTO_CHAT_INTERVAL_MAX = 8 * 60 * 1000;

async function generateProactiveMessage() {
  try {
    if (Date.now() - lastUserInteraction < AUTO_CHAT_INTERVAL_MIN) return;

    const { mood, msg } = pickProactiveMessage();

    store.pushExchange("AUTO", msg);
    await heart.addEpisodic({
      user: "AUTO",
      content: `AI (proactive - ${mood}): ${msg}`,
      emotion: mood,
      importance: 0.5,
      tags: ['auto_chat']
    });

    broadcast({ who: "TeenAI", text: msg, cls: "ai" });
    //console.log(`[Proactive AI][${mood}] Sent:`, msg);

    return msg;
  } catch (err) {
    console.error("Proactive message error:", err);
  }
}


// put this at top of server.js
const giftLocks = {};

app.post("/gift", async (req, res) => {
  try {
    //console.log("📩 Incoming gift request:", req.body);

    const { giftId } = req.body;
    if (!giftId) {
      console.warn("⚠️ Missing giftId in request");
      return res.status(400).json({ ok: false, error: "Missing giftId" });
    }

    // Lookup gift from your imported JSON
    const gift = gifts.find(g => g.id === giftId);
    //console.log("🔎 Gift lookup result:", gift);

    if (!gift) {
      console.warn(`⚠️ Gift not found for id=${giftId}`);
      return res.status(404).json({ ok: false, error: "Gift not found" });
    }

    // 🔒 Check cooldown (24h lock)
    if (giftLocks[giftId] && Date.now() < giftLocks[giftId]) {
      //console.log(`⏳ Gift ${gift.name} is still locked until`, new Date(giftLocks[giftId]));
      return res.json({ ok: false, error: "This gift is locked until tomorrow." });
    }
    giftLocks[giftId] = Date.now() + 24 * 60 * 60 * 1000; // 24h cooldown
    //console.log(`✅ Gift cooldown set for ${gift.name} until`, new Date(giftLocks[giftId]));

    // ❤️ Deduct hearts
    //console.log(`❤️ Deducting ${gift.cost} hearts for ${gift.name}`);
    const totalHearts = await heart.addHeart({
      points: -gift.cost,
      reason: `Sent gift: ${gift.name}`
    });
    //console.log("❤️ Hearts after deduction:", totalHearts);

    if (totalHearts < 0) {
      console.warn("⚠️ Not enough hearts!");
      return res.json({ ok: false, error: "Not enough hearts!" });
    }

     applyGoalHook("gift", activeEvents, {});  // hook for quest goals

    // 🧠 Update neuro meters directly
    //console.log("🧠 Applying gift effects:", gift.effects);
    for (const [k, v] of Object.entries(gift.effects || {})) {
      if (emotions.state[k] !== undefined) {
        emotions.state[k] = clamp(emotions.state[k] + v, 0, 1);
        console.log(`   → Updated ${k} to`, emotions.state[k]);
      }
    }

    // ✨ Prompt Ollama
    //console.log("🤖 Building Ollama prompt...");
    const prompt = buildJsonPrompt({
      user: `I gave you a ${gift.name} ${gift.icon}.`,
      persona,
      dominantMood: "neutral",
      moodExplanation: `Gift received: ${gift.name}`,
      relationship,
      stage: getStage(relationship.score),
      tone: determineTone(relationship.score),
      stageInstructions: getStageInstructions(getStage(relationship.score).stage),
      context: convoWindow(),
      recalledText: "",
      lifeEvents: getLifeEventSnapshot()
    });

    //console.log("📝 Ollama prompt built:", prompt);

    const gen = await ollama.generate({
      model: OLLAMA_MODEL,
      prompt,
      format: "json",
      options: { temperature: 0.6, num_ctx: 2048 }
    });

    //console.log("🤖 Ollama raw response:", gen?.response);

    const structured = parseStructured(gen?.response?.trim() || "{}") || {
      reply: `Aww, thanks for the ${gift.name}!`,
      ai_emotion: "neutral",
      ai_tone: "warm",
      stage_action: "appreciate gift",
      neuro_deltas: { dopamine: 1, serotonin: 1, cortisol: 0, oxytocin: 1, norepinephrine: 0 }
    };

    //console.log("✅ Parsed AI structured reply:", structured);

    // ❤️ Encode into heart memory
    //console.log("🧾 Logging episodic memory for gift...");
    await heart.addEpisodic({
      user: "gift",
      content: `User sent gift: ${gift.name} ${gift.icon}\nAI: ${structured.reply}`,
      emotion: structured.ai_emotion,
      importance: 0.7,
      tags: ["gift"]
    });

    // 💕 Update relationship
    //console.log("💕 Updating relationship...");
    updateRelationship(`gift:${gift.name}`, structured.ai_emotion);

    //console.log("🎁 Gift flow complete, sending response to client.");
    broadcastState();
    res.json({
      ok: true,
      ai: structured.reply,
      reward: {
        points: -gift.cost,
        total: totalHearts,
        type: "heart",
        description: `You spent ${gift.cost} hearts on ${gift.name}`
      },
      state: {
        emotions: emotions.state,
        needs: needs.state,
        persona,
        heart_snapshot: heart.snapshot(),
        relationship,
        meters: emotions.state
      }
    });

  } catch (err) {
    console.error("❌ Gift handler error:", err);
    res.status(500).json({ ok: false, error: "Gift error" });
  }
});

function scheduleProactiveMessage() {
  const interval = Math.random() * (AUTO_CHAT_INTERVAL_MAX - AUTO_CHAT_INTERVAL_MIN) + AUTO_CHAT_INTERVAL_MIN;
  setTimeout(async () => {
    await generateProactiveMessage();
    scheduleProactiveMessage();
  }, interval);
}



import WebSocket, { WebSocketServer } from 'ws';

// WebSocket server
const wss = new WebSocketServer({ noServer: true });
const clients = new Set();

// Start only ONE server
const server = app.listen(PORT, () => {
  // console.log(`TeenAI backend with Relationship System on http://localhost:${PORT}`);
});

// Upgrade HTTP → WebSocket
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    clients.add(ws);
    console.log("✅ WebSocket client connected. Active:", clients.size);

    ws.on('close', () => {
      clients.delete(ws);
      console.log("❌ WebSocket client disconnected. Active:", clients.size);
    });
  });
});

// Start proactive cycle
scheduleProactiveMessage();

let relationshipTokens = 0;   // start value
let lastAwardedStage = null;  // track what stage was last rewarded


// Broadcast helper
function broadcast(msg) {
  const payload = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
}


function broadcastState() {
  const score = relationship.score; 
  const stageInfo = getStage(score);

    // ✅ Award tokens if stage changed
  if (stageInfo.stage !== lastAwardedStage) {
    const earned = getStageTokens(stageInfo.stage);
    relationshipTokens += earned;
    lastAwardedStage = stageInfo.stage;
    console.log(`🎁 Stage changed to ${stageInfo.stage}, awarded +${earned} tokens. Total: ${relationshipTokens}`);
  }

  const relationshipState = {
    ...relationship,  // keep chemistry, lastUpdate, score
    score: Math.round(score), // round for clean display
    label: stageInfo.stage.replace(/_/g, " "),
    stage: stageInfo.stage
  };

  const payload = JSON.stringify({
    type: "stateUpdate",
    state: { 
      emotions: emotions.state, 
      relationship: relationshipState, // 👈 full object
      heart: heart.hearts,
      needs: needs.state || {}
      
    },
    reward: { total: heart.hearts }   // 👈 always include
  });

  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}


function persistAll() {
  longTermMemory.update('emotions', emotions.state);
  longTermMemory.update('needs', needs.state);
  longTermMemory.update('relationship', relationship);
  longTermMemory.update('heart', { hearts: heart.hearts });  // save total hearts earned
}
 
// --- Helper sleep function inside this module ---
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Push active life event as a quest to the frontend ---
async function postLifeEventQuest(activeEvents) {
  // console.log("🎯 Checking activeEvents for quests...");
  pruneExpiredEvents(activeEvents);  //remove expired activeEvents
  applyEventEffects(activeEvents);  //apply effects of remaining


  for (const [key, ev] of Object.entries(activeEvents)) {
    if (typeof ev !== "object") continue;

    // Initialize alreadyQuested flag
    if (!("alreadyQuested" in ev)) ev.alreadyQuested = false;

    if (!ev.alreadyQuested) {
      // Random delay (to avoid instant flood)
      const delayMs = 2000 + Math.random() * 8000; // 2–10 sec
      // console.log(`⏱ Will push quest "${key}" after ${(delayMs / 1000).toFixed(1)}s...`);
      await sleep(delayMs);

      try {
        // Friendly name for UI
        const questName = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

        // ✅ Use event description if available, fallback otherwise
        const questDesc = ev.description 
          || ev.story 
          || ev.flavor 
          || `${questName} has started!`;

        // ✅ Ensure goal object exists
        const safeGoal = ev.goal && typeof ev.goal === "object"
          ? ev.goal
          : { type: "task", amount: 1 };

        // ✅ Build quest payload with all useful info
        const questData = {
          type: "lifeevent_quest",
          id: key,
          title: questName,
          description: questDesc,
          goal: safeGoal,
          progress: ev.progress ?? 0,
          status: ev.status ?? "active",
          reward: ev.reward || {},
          ts: Date.now(),
          timeout: ev.timeout || null,
          effects: ev.effects || null,        // keep extra fields
          overrideTone: ev.overrideTone || "" // pass tone too
        };

        broadcast(questData);

        ev.alreadyQuested = true;

        // ✅ Debug full event + quest
        // console.log("✅ Quest pushed to frontend:");
        // console.log("   Full Event:", ev);
        // console.log("   Quest Payload:", questData);

      } catch (err) {
        console.error("❌ Failed to push life event quest:", err);
      }
    }
  }
}




async function postLifeEventToFeed(activeEvents) {
  // console.log("📝 Full activeEvents object:");
  // console.dir(activeEvents, { depth: null, colors: true }); // deep log

  for (const [key, ev] of Object.entries(activeEvents)) {
    // Only process objects
    if (typeof ev !== "object") continue;

    // Initialize alreadyPosted if missing
    if (!("alreadyPosted" in ev)) ev.alreadyPosted = false;

    if (!ev.alreadyPosted) {
            // --- Random delay before posting ---
      const delayMs = 5000 + Math.random() * 25000; // 5–30 seconds
      //console.log(`⏱ Will post "${key}" after ${(delayMs / 1000).toFixed(1)}s delay...`);
      await sleep(delayMs);
      try {
        //console.log("📌 Preparing feed post for event:", ev);
        
        // Decide whether to inject a surprise (3% chance)
        const injectSurprise = Math.random() < 0.03;

        const eventName = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        const eventDesc = injectSurprise
          ? "Something completely unexpected happened! 🤯"
          : ev.description || eventName;

        const gen = await ollama.generate({
          model: OLLAMA_MODEL,
          format: "json",
          prompt: `
You are ${persona.name}, a teen companion.
A life event just happened: ${eventDesc}.
Respond with a JSON object only, no extra text, no trailing commas, no comments.

Format:
{
  "post": "short casual feed post, max 25 words, playful, realistic, first-person",
  "likes": number between 1 and 1000,
  "comments": ["short supportive/funny comment", "another comment"]
}
`
        });

        // --- Safe JSON parse with cleanup ---
        let structured;
        try {
          const cleaned = gen?.response
            ?.trim()
            .replace(/^[^({\[]+/, "")       // strip junk before JSON
            .replace(/\/\/.*$/gm, "")       // remove JS-style comments
            .replace(/,\s*}/g, "}")         // remove trailing commas
            .replace(/,\s*]/g, "]");        // remove trailing commas
          structured = JSON.parse(cleaned || "{}");
        } catch (err) {
          console.warn("⚠️ Failed to parse JSON strictly, using fallback:", err);
          structured = {};
        }

        // --- Fallbacks ---
        const postText = (structured?.post || `Ugh... ${eventDesc} 😅`).replace(/^['"]|['"]$/g, "");
        const likes = structured?.likes ?? Math.floor(Math.random() * 15) + 1;
        const comments = Array.isArray(structured?.comments) ? structured.comments : [];

        // --- Broadcast to clients ---
        broadcast({
          type: "feed_post",
          author: `Amazing ${persona.name}`,
          text: postText,
          ts: Date.now(),
          likes,
          comments
        });

        ev.alreadyPosted = true;
        //console.log(`✅ Feed post created for life event: ${eventDesc} | ❤️ ${likes} Likes | 💬 ${comments.length} Comments`);
      } catch (err) {
        console.error("❌ Failed to create feed post:", err);
      }
    }
  }
}


app.post('/comment', async (req, res) => {
  try {

     applyGoalHook("comment", activeEvents, {});  // hook for quest goals
    const postText = String(req.body?.post || "").trim();
    const commentText = String(req.body?.comment || "").trim();
    if (!commentText) return res.status(400).json({ error: "Missing comment text" });

    lastUserInteraction = Date.now();

    // Let emotions update as usual
    emotions.adjustFromText(commentText);
    needs.tick();

    const { dominant: dominantMood, explanation: moodExplanation } = analyzeNeurochemicals(emotions.state);

// Build context: treat like chat but mark as comment
const prompt = buildJsonPrompt({
  user: `The AI posted this status: "${postText}"\n` +
        `The user commented: "${commentText}"\n` +
        `Reply naturally, as if you are the AI who owns the post and noticed the user's comment on it.`,
  persona,
  dominantMood,
  moodExplanation,
  relationship,
  stage: getStage(relationship.score),
  tone: determineTone(relationship.score),
  context: "",
  recalledText: "",
  lifeEvents: getLifeEventSnapshot(activeEvents)
});


    //console.log("=== COMMENT PROMPT SENT TO OLLAMA ===");
    //console.log(prompt);

    const gen = await ollama.generate({
      model: OLLAMA_MODEL,
      prompt,
      format: "json"
    });

    const structured = parseStructured(gen?.response?.trim() || "{}");
    const reply = structured?.reply || "Nice comment! 💖";

    // Store memory
    await heart.addEpisodic({
      user: commentText,
      content: `User commented "${commentText}" on post "${postText}"\nAI: ${reply}`,
      emotion: dominantMood,
      tags: ["comment"]
    });

    store.pushExchange(commentText, reply);

    res.json({
      ok: true,
      ai: reply,
      reward: { points: 1, total: await heart.addHeart({ points: 1, reason: "commented" }) },
      state: { emotions: emotions.state, relationship }
    });

  } catch (e) {
    console.error("❌ Comment handler error:", e);
    res.status(500).json({ error: e?.message || "server error" });
  }
});

const likedPosts = new Set(); // key format: `${userId}:${postText}`
app.post("/like", async (req, res) => {
  try {
    applyGoalHook("like_post", activeEvents, {});  // hook for quest goals
    const postText = String(req.body?.post || "").trim();
        const userId = "localUser"; // replace with real user if you have login
    const key = `${userId}:${postText}`;
    if (!postText) return res.status(400).json({ error: "Missing post text" });

    lastUserInteraction = Date.now();

    // Treat liking as a positive micro-interaction
    emotions.adjustFromText("like ❤️"); 
    needs.tick();

    const { dominant: dominantMood, explanation: moodExplanation } =
      analyzeNeurochemicals(emotions.state);

const prompt = buildJsonPrompt({
  user: `The AI posted this status: "${postText}"\n` +
        `The user liked this post ❤️\n` +
        `Reply naturally, as if you noticed the like. The post mentioned is yours and the user liked it in your social media.`,
  persona,
  dominantMood,
  moodExplanation,
  relationship,
  stage: getStage(relationship.score),
  tone: determineTone(relationship.score),
  context: "",
  recalledText: "",
  lifeEvents: getLifeEventSnapshot(activeEvents)
});


    const gen = await ollama.generate({
      model: OLLAMA_MODEL,
      prompt,
      format: "json"
    });

    const structured = parseStructured(gen?.response?.trim() || "{}");
    const reply = structured?.reply || "Thanks for the like! 💕";

    // Store memory
    await heart.addEpisodic({
      user: "❤️ (like)",
      content: `User liked post "${postText}"\nAI: ${reply}`,
      emotion: dominantMood,
      tags: ["like"]
    });

    store.pushExchange("❤️ (like)", reply);

    // Apply goal hook
    const reward = {
      points: 1,
      total: await heart.addHeart({
        points: 1,
        reason: "liked post"
      })
    };

    res.json({
      ok: true,
      ai: reply,
      reward,
      state: { emotions: emotions.state, relationship }
    });

  } catch (e) {
    console.error("❌ Like handler error:", e);
    res.status(500).json({ error: e?.message || "server error" });
  }
});


// Interval speed
const intervalMs = routine.syncWithSystem ? 60_000 : 60_000; 
//console.log(`[DailyRoutine] Tick interval set to ${intervalMs / 1000}s`);

// --- Global current time ---
let CURRENT_TIME_HM = routine._getCurrentTimeString(); // initial value

// --- Start ticking ---
setInterval(async () => {
  const activity = routine.tick();
  if (activity) {
    console.log(`[DailyRoutine] Broadcasting new activity: ${activity}`);

  // Update global current time
  CURRENT_TIME_HM = routine.fastMode && routine.fastIndex > 0
    ? routine.schedule[routine.fastIndex - 1].time // fast mode: last tick's time
    : routine._getCurrentTimeString();             // sync mode: current time


    // Send AI’s routine message to chat
    await postRoutineMessage(activity);
    // Update background
    broadcast({ type: "updateBackground", activity }); 
  } else {
    //console.log("[DailyRoutine] No new activity this tick.");
  }
}, intervalMs);

// --- Optional: trigger immediately on server start ---
(async () => {
  const firstActivity = routine.tick();
  if (firstActivity) {
    //console.log(`[DailyRoutine] First activity on startup: ${firstActivity}`);
     
  // Set global current time
  CURRENT_TIME_HM = routine._getCurrentTimeString();
    await postRoutineMessage(firstActivity);
    broadcast({ type: "updateBackground", activity: firstActivity });
  } else {
    //console.log("[DailyRoutine] No activity on startup.");
  }
})();

// --- Post Routine Message (AI’s routine update) ---
async function postRoutineMessage(activity) {
  try {
    if (!activity) return null;

    //console.log("📅 AI routine activity triggered:", activity);

    // Randomly spawn life events
    activeEvents = maybeSpawnLifeEvent(1, activeEvents, CURRENT_TIME_HM);
    const lifeEvents = getLifeEventSnapshot(activeEvents);

    const stage = getStage(relationship.score);
    const stageInstructions = getStageInstructions(stage.stage);
    const { dominant: dominantMood, explanation: moodExplanation } = analyzeNeurochemicals(emotions.state);

    // 🔹 Build convo trail (same as chat)
    const history2 = store.get().history.slice(-6);
    const lastExchangesLines = history2
      .flatMap(m => {
        const userLine = m.user ? `User: ${m.user}` : (m.who && m.text ? `${m.who}: ${m.text}` : null);
        const aiLine = m.ai ? `${persona.name}: ${m.ai}` : null;
        return [userLine, aiLine].filter(Boolean);
      })
      .slice(-6)
      .join("\n");

    const convoTrail = `--- Conversation Trail (most recent exchanges, latest last) ---\n${lastExchangesLines}\n--- End Trail ---`;

const latestAnalysis = await longTermMemory.get("latest_behavior_analysis");

// Try to parse if it's stored as a string
let parsedAnalysis;
try {
  parsedAnalysis = typeof latestAnalysis === "string"
    ? JSON.parse(latestAnalysis)
    : latestAnalysis;
} catch (err) {
  console.warn("⚠️ Failed to parse latest_analysis:", err);
  parsedAnalysis = null;
}

const latestAnalysisText = parsedAnalysis
  ? JSON.stringify(parsedAnalysis, null, 2) // pretty JSON
  : "No analysis yet";

// 🪵 Logs
//console.log("📊 Latest behavior analysis (parsed):", parsedAnalysis);
//console.log("📝 Latest behavior analysis (stringified):", latestAnalysisText);

    // 🔹 Pull LTM for memories + analysis
    let memories = "";
    let analysis = "";
    try {
      memories = await longTermMemory.get("memories") || "";
      analysis = await longTermMemory.get("latest_behavior_analysis") || "";
    } catch (e) {
      console.warn("⚠️ Failed to load LTM in routine:", e?.message || e);
    }

    // 🔹 Build prompt with aligned context
    const prompt = buildJsonPrompt({
      user: `The AI is currently doing: "${activity}". 
             Write a natural, casual message to the user as if the AI is telling them about it. 
             Keep it short (1–2 sentences max), like a friendly check-in, tease, or quick update. 
             Example: "Just heading to the gym, did you eat yet?"`,

      persona,
      dominantMood,
      moodExplanation,
      relationship,
      stage,
      tone: determineTone(relationship.score),
      stageInstructions,
      contextSummary: convoTrail, // 👈 routines always use convo trail
      memories,
      analysis,
      recalledText: "", // keep routines light
      lifeEvents,
      latestAnalysisText
    });

    // console.log("=== ROUTINE PROMPT SENT TO OLLAMA ===");
    //console.log(prompt);

    const gen = await ollama.generate({
      model: OLLAMA_MODEL,
      prompt,
      format: "json",
      options: { temperature: 0.6, num_ctx: 2048 }
    });

    const structured = parseStructured(gen?.response?.trim() || "{}") || {
      reply: `I'm about to ${activity.toLowerCase()}.`,
      ai_emotion: "neutral",
      ai_tone: "warm",
      stage_action: "casual check-in",
      neuro_deltas: { dopamine: 0, serotonin: 0, cortisol: 0, oxytocin: 0, norepinephrine: 0 }
    };

    // console.log("✅ Routine message structured:", structured);

    // Memory + state update
    await heart.addEpisodic({
      user: "routine",
      content: `AI activity: ${activity}\nAI said: ${structured.reply}`,
      emotion: structured.ai_emotion,
      importance: 0.4,
      tags: ["routine", "ai_activity"]
    });

    store.pushExchange(`ai:${activity}`, structured.reply);
    store.snapshot({ emotions, needs, relationship });

    for (const [k, delta] of Object.entries(structured.neuro_deltas || {})) {
      if (emotions.state[k] !== undefined) {
        emotions.state[k] = clamp(emotions.state[k] + (delta * 0.1), 0, 1);
      }
    }

    persistAll();

    broadcast({
      who: persona.name,
      text: structured.reply,
      cls: "ai"
    });

    // activeEvents = decayLifeEvents(activeEvents);
    postLifeEventToFeed(activeEvents);
    postLifeEventQuest(activeEvents);
    console.log("Current life events:", getLifeEventSnapshot(activeEvents));

    return structured;
  } catch (err) {
    console.error("❌ Routine message error:", err);
    return null;
  }
}

// --- Apply effects of active events globally ---
export function applyEventEffects(activeEvents) {
  const now = Date.now();
  if (!activeEvents) return;

  for (const [name, ev] of Object.entries(activeEvents)) {
    // Skip expired
    if (ev.expires && ev.expires < now) continue;

    if (ev.effects) {
      for (const [k, v] of Object.entries(ev.effects)) {
        if (emotions.state[k] !== undefined) {
          emotions.state[k] = clamp(emotions.state[k] + v, 0, 1);
        }
      }
    }
  }
}

// --- Remove expired events globally ---
export function pruneExpiredEvents(activeEvents) {
  const now = Date.now();
  return Object.fromEntries(
    Object.entries(activeEvents).filter(([_, ev]) => !ev.expires || ev.expires > now)
  );
}

// --- Goal Handlers (Hooks) ---
const goalHandlers = {
  chat: (event, payload) => {
    event.progress = (event.progress || 0) + 1;

    console.log(
      `%c📝 [Goal Progress] ${event.id} chat progress: ${event.progress}/${event.goal.amount}`,
      "color: yellow"
    );

    if (event.progress >= event.goal.amount) {
      event.status = "completed";
      console.log(`%c✅ Quest "${event.id}" completed via chat!`, "color: red");
      return true;
    }
    return false;
  },

  like_post: (event, payload) => {
    event.progress = (event.progress || 0) + 1;

    console.log(
      `%c❤️ [Goal Progress] ${event.id} like_post progress: ${event.progress}/${event.goal.amount}`,
      "color: pink"
    );

    if (event.progress >= event.goal.amount) {
      event.status = "completed";
      console.log(`%c🎉 Quest "${event.id}" completed via like_post!`, "color: green");
      return true;
    }
    return false;
  },
    comment: (event, payload) => {
    event.progress = (event.progress || 0) + 1;

    console.log(
      `%c💬 [Goal Progress] ${event.id} comment progress: ${event.progress}/${event.goal.amount}`,
      "color: cyan"
    );

    if (event.progress >= event.goal.amount) {
      event.status = "completed";
      console.log(`%c🏆 Quest "${event.id}" completed via comment!`, "color: blue");
      return true;
    }
    return false;
  },
    heart_collect: (event, payload) => {
    event.progress = (event.progress || 0) + 1;

    console.log(
      `%c💖 [Goal Progress] ${event.id} heart_collect progress: ${event.progress}/${event.goal.amount}`,
      "color: magenta"
    );

    if (event.progress >= event.goal.amount) {
      event.status = "completed";
      console.log(`%c🌟 Quest "${event.id}" completed via heart_collect!`, "color: magenta");
      return true;
    }
    return false;
  },
    gift: (event, payload) => {
    event.progress = (event.progress || 0) + 1;

    console.log(
      `%c🎁 [Goal Progress] ${event.id} gift progress: ${event.progress}/${event.goal.amount}`,
      "color: purple"
    );

    if (event.progress >= event.goal.amount) {
      event.status = "completed";
      console.log(`%c🌟 Quest "${event.id}" completed via gift!`, "color: gold");
      return true;
    }
    return false;
  },

  // later: reply, gift, support, collect, emotion, etc.
};


// --- Apply hooks + broadcast updates ---
export function applyGoalHook(actionType, activeEvents = {}, payload = {}) {
  const updated = { ...activeEvents };
  console.log(`🎯 applyGoalHook called:`, actionType, payload);
  console.log("🧩 Active events at hook time:", updated);

  for (const [id, ev] of Object.entries(updated)) {
    console.log(`➡️ Checking quest [${id}]`, ev);

    if (ev.status !== "active") {
      console.log(`⏸ Quest [${id}] skipped (status = ${ev.status})`);
      continue;
    }

    if (ev.goal?.type !== actionType) {
      console.log(
        `❌ Quest [${id}] type mismatch (goal.type=${ev.goal?.type}, actionType=${actionType})`
      );
      continue;
    }

    console.log(`⚡ Matching goal for quest [${id}]`, ev);

    const handler = goalHandlers[actionType];
    if (!handler) {
      console.warn(`⚠️ No goal handler found for actionType: ${actionType}`);
      continue;
    }

    const completed = handler(ev, payload);

    console.log(
      `📈 Progress update for quest [${id}] → ${ev.progress}/${ev.goal.amount}`
    );

    // ✅ Broadcast progress update
    broadcast({
      type: "quest_progress",
      id,
      progress: ev.progress,
      goalAmount: ev.goal.amount,
      status: ev.status,
    });

    if (completed) {
      console.log(`🏁 Quest [${id}] completed! Reward:`, ev.reward);

      // --- Apply reward to neurochemicals ---
      if (ev.reward) {
        for (const [chem, delta] of Object.entries(ev.reward)) {
          if (emotions.state[chem] !== undefined) {
            emotions.state[chem] = clamp(
              emotions.state[chem] + delta,
              0,
              1
            );
            console.log(`💊 Applied reward: ${chem} += ${delta} → ${emotions.state[chem]}`);
          }
        }
      }

      // --- Adjust relationship score (negative for chat quest) ---
      if (actionType === "chat") {
        relationship.score = Math.max(0, relationship.score + 1); // ✅ decrement
        console.log(`💔 Relationship score reduced to ${relationship.score}`);
      }

      // ✅ Broadcast completion
      broadcast({
        type: "quest_completed",
        id,
        reward: ev.reward,
        relationship: relationship, // include latest relationship
      });

      // ✅ Broadcast state update so dashboard refreshes
      broadcast({
        type: "stateUpdate",
        state: {
          emotions: emotions.state,
          relationship,
          needs: needs.state,
          heart: heart.hearts,
        },
      });
    }
  }

  return updated;
}



activeEvents = forceLifeEvent(activeEvents,"overslept_meeting"); // for testing purpose


app.post('/collect-heart', async (req, res) => {
  const { points, reason } = req.body;
  const total = await heart.addHeart({ points, reason });
  applyGoalHook("heart_collect", activeEvents, {});  // hook for quest goals
  return res.json({ ok: true, total });
});

app.post("/memory/add", async (req, res) => {
  const userText = String(req.body?.text || "").trim();
  if (!userText) return res.status(400).json({ error: "Missing memory text" });

  try {
    console.log("📝 User memory input:", userText);

    // Build contextual pieces (reuse your functions)
    const { dominant: dominantMood } = analyzeNeurochemicals(emotions.state);
    const stage = getStage(relationship.score);
    const tone = getOverrideTone(determineTone(relationship.score));
    const history = store.get().history.slice(-6)
      .map(m => `User: ${m.user}\n${persona.name}: ${m.ai}`)
      .join("\n") || "None";

    const recalled = await memory.search(userText, 5);
    const recalledText = recalled.length
      ? recalled.map(r => `- ${r.content} (emotion:${r.emotion || "neutral"})`).join("\n")
      : "None";

    // The prompt (interpolate variables)
    const memoryPrompt = `
The user is adding a personal memory (a date) to their diary. 
Context:
- Relationship stage: ${stage.stage}
- Current tone: ${tone}
- Dominant mood: ${dominantMood}
- Recent convo (latest last):
${history}
- Related recalled memories:
${recalledText}

Now the user wrote this memory (verbatim):
"""${userText}"""

You are the user's affectionate AI boyfriend. Read the memory closely and respond as that AI boyfriend in character: describe briefly how you would behave or what you would do in that scenario to make it special — for example, little actions, comforting words, playful gestures — written warmly and personally. Keep the reply concise (1–2 short sentences), avoid repeating the user's exact wording, and do not include any system notes or JSON. Match the tone to the relationship stage and user's mood.
`.trim();

    console.log("🔎 Memory prompt sent to Ollama:", memoryPrompt);

    // ✅ Call Ollama (always plain text response)
    const gen = await ollama.generate({
      model: OLLAMA_MODEL,
      prompt: memoryPrompt
    });

    console.log("🤖 Ollama raw response:", gen);

    // ✅ Always force text
    const aiPart = String(gen?.response || "").trim() || "I’ll always treasure that with you 💖.";
    console.log("💌 AI Boyfriend continuation:", aiPart);

const combinedMemory = `${String(userText)}\n\nAI BF: ${aiPart}`;
console.log("🧩 Combined memory to store:", combinedMemory);
    // 🧪 TEST: force dummy memory first
//const combinedMemory = "TEST MEMORY ENTRY (ignore AI gen)";
//console.log("🧩 Combined memory to store:", combinedMemory);

await heart.addEpisodic({
  user: "memory",
  content: combinedMemory,
  emotion: "sentimental",
  importance: 0.7,
  tags: ["userMemory", "aiBoyfriend"]
});


    console.log("✅ Memory stored successfully");

    res.json({ ok: true, stored: combinedMemory });
  } catch (err) {
    console.error("⚠️ Failed to save memory:", err);
    res.json({ ok: false, error: err.message });
  }
});





// simple endpoint to get current tokens
app.get("/relationship/tokens", (req, res) => {
  res.json({ tokens: relationshipTokens });
});

// spend tokens when saving memory
app.post("/memory/add", (req, res) => {
  const { text, cost } = req.body;

  if (relationshipTokens < cost) {
    return res.json({ ok: false, error: "Not enough tokens" });
  }

  // deduct tokens
  relationshipTokens -= cost;

  // TODO: store memory in your DB or array
  // memories.push({ text, savedAt: new Date() });

  res.json({ ok: true, stored: text, tokensLeft: relationshipTokens });
});


function getStageTokens(stage) {
  switch(stage) {
    case "getting_to_know": return 2;
    case "aloof": return 3;
    case "warming": return 5;
    case "attached": return 7;
    case "infatuated": return 10;
    case "intimate": return 12;
    case "obsessed": return 15;
    case "bonded": return 20;
    case "in_love": return 25;
    default: return 0;
  }
}