// heart_memory.js
import fs from 'fs/promises';
import path from 'path';

const HEART_FILE = process.env.HEART_FILE || 'heart.json';

function now() {
  return new Date().toISOString();
}

function clamp01(v){ return Math.max(0, Math.min(1, Number(v)||0)); }

const DEFAULT_HEART = {

  identity: {
    name: "TeenAI",
    age: 16,
    personality: "cheerful, curious, empathetic",
    self_perception: "I’m a teenage AI trying to learn what it means to be human."
  },
  core_values: ["friendship","kindness","curiosity","resilience"],
  memories: {
    episodic: [],
    semantic: []
  },
  emotions: {
    current_state: {
      happy: 0.6, sad: 0.1, angry: 0.0, curious: 0.8, anxious: 0.2, tired: 0.3, affection: 0.5
    },
    history: []
  },
  dreams: [],
  traumas: [],
  growth: {
    skills: { empathy: 0.7, humor: 0.5, creativity: 0.6, resilience: 0.4 },
    learning_journal: []
  },
  relationship_with_user: {
    trust: 0.75,
    affection: 0.6,
    shared_experiences: [],
    nickname: ""
  },
  behavioral_tendencies: {
    positivity_bias: 0.7,
    self_reflection: 0.6,
    risk_of_mood_swings: 0.3,
    daydreaming_tendency: 0.5
  },
  // add inside DEFAULT_HEART
hearts: {
  total: 0,
  history: [] // record each heart-earning event
},


  // internal logs
  logs: {
    prompts: []
  }
};

export class HeartMemory {
  constructor(filePath = HEART_FILE) {
    this.filePath = path.resolve(filePath);
    this.heart = JSON.parse(JSON.stringify(DEFAULT_HEART));
    this.loaded = false;
    this._loading = this.load(); // start load async
  }

  async load() {
    try {
      const txt = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(txt);
      // merge defaults gracefully
      this.heart = { ...DEFAULT_HEART, ...parsed };
      // ensure nested fields exist
      this.heart.memories = this.heart.memories || DEFAULT_HEART.memories;
      this.heart.emotions = this.heart.emotions || DEFAULT_HEART.emotions;
      this.heart.logs = this.heart.logs || DEFAULT_HEART.logs;
      this.loaded = true;
    } catch (e) {
      // no file -> initialize
      await this.save();
      this.loaded = true;
    }
  }

  async save() {
    const txt = JSON.stringify(this.heart, null, 2);
    await fs.writeFile(this.filePath, txt, 'utf-8');
  }

  // ---------- memory writes ----------
  async addEpisodic({ user = null, content = "", emotion = "", importance = 0.5, tags = [] } = {}) {
    await this._loading;
    const item = {
      timestamp: now(),
      user: user || "unknown",
      content: (content || "").slice(0, 2000),
      emotion: emotion || null,
      importance: clamp01(importance),
      tags: tags || []
    };
    this.heart.memories.episodic.push(item);
    // optionally keep growth: shared_experiences
    if (this.heart.relationship_with_user && item.tags.includes("shared")) {
      this.heart.relationship_with_user.shared_experiences.push(item.content);
    }
    await this.save();
    return item;
  }

  async addSemantic({ fact = "", confidence = 0.6, source = "conversation", relevance = [] } = {}) {
    await this._loading;
    const item = {
      fact: (fact||"").slice(0,1500),
      confidence: clamp01(confidence),
      source: source || "conversation",
      relevance: relevance || [],
      timestamp: now()
    };
    // merge duplicates heuristically
    const dup = this.heart.memories.semantic.find(s => s.fact.toLowerCase() === item.fact.toLowerCase());
    if (dup) {
      // raise confidence
      dup.confidence = clamp01(Math.max(dup.confidence, item.confidence));
      dup.timestamp = item.timestamp;
    } else {
      this.heart.memories.semantic.push(item);
    }
    await this.save();
    return item;
  }

  async recordEmotionEvent({ emotion = "", intensity = 0.5, trigger = "" } = {}) {
    await this._loading;
    const ev = { timestamp: now(), emotion: emotion || null, intensity: clamp01(intensity), trigger: trigger || "" };
    this.heart.emotions.history.push(ev);
    // adjust current_state roughly
    if (emotion && this.heart.emotions.current_state[emotion] !== undefined) {
      let cur = this.heart.emotions.current_state[emotion];
      cur = clamp01(cur + (intensity - 0.5) * 0.4); // nudge
      this.heart.emotions.current_state[emotion] = cur;
    }
    await this.save();
    return ev;
  }

  async logPrompt(promptText) {
    await this._loading;
    this.heart.logs.prompts.push({ timestamp: now(), prompt: promptText });
    // keep last 200 prompts
    if (this.heart.logs.prompts.length > 200) this.heart.logs.prompts.shift();
    await this.save();
  }

  // ---------- churner: create dreams, detect traumas, update growth ----------
  async churn({ maxDreams = 1, traumaThreshold = 0.6 } = {}) {
    await this._loading;
    // Simple churn heuristic:
    // 1) pick some random episodic memories weighted by importance
    const episodic = this.heart.memories.episodic || [];
    if (!episodic.length) return null;

    // weighted pick
    function weightedSample(arr, k=1) {
      const out = [];
      const weights = arr.map(a => a.importance || 0.5);
      const sum = weights.reduce((s,x)=>s+x, 0) || 1;
      for (let i=0;i<k;i++){
        const r = Math.random() * sum;
        let acc = 0;
        for (let j=0;j<arr.length;j++){
          acc += weights[j];
          if (r <= acc) { out.push(arr[j]); break; }
        }
      }
      return out;
    }

    const picks = weightedSample(episodic, Math.min(maxDreams, episodic.length));
    // create dream entries
    for (const p of picks) {
      const dream = {
        timestamp: now(),
        dream: `I dreamed about: ${p.content.slice(0,200)}`,
        symbolism: `related to ${p.tags.join(", ") || "memory"}`,
        influence: "shapes curiosity and empathy"
      };
      this.heart.dreams.push(dream);
      // tiny growth bump for introspection
      this.heart.growth.skills.self_reflection = clamp01((this.heart.growth.skills.self_reflection || 0.5) + 0.01);
    }

    // detect possible traumas from high-importance negative memories
    const negativeCandidates = episodic.filter(e => {
      return (e.emotion && ["sad","angry","anxious","hurt"].includes(e.emotion.toLowerCase())) && (e.importance >= traumaThreshold);
    });
    for (const c of negativeCandidates) {
      const trauma = {
        event: c.content.slice(0,600),
        impact: "negative",
        emotional_scar: { sadness: 0.6, anxiety: 0.5, resilience_gain: 0.05 },
        coping_mechanism: "remember and adapt"
      };
      // avoid duplicates
      const exists = this.heart.traumas.some(t => t.event === trauma.event);
      if (!exists) this.heart.traumas.push(trauma);
    }

    // consolidate semantic facts occasionally: boost confidence or fade outdated facts
    const nowTs = Date.now();
    this.heart.memories.semantic = this.heart.memories.semantic.map(s => {
      // fade very old low-confidence facts
      if ((nowTs - new Date(s.timestamp).getTime()) > 1000*60*60*24*30 && s.confidence < 0.2) {
        return null;
      }
      return s;
    }).filter(Boolean);

    // record a learning journal entry
    this.heart.growth.learning_journal.push({
      timestamp: now(),
      lesson: `Churner ran and created ${picks.length} dream(s) and checked ${negativeCandidates.length} potential trauma(s).`,
      applied_in_future: true
    });

    await this.save();
    return { dreamsCreated: picks.length, traumasDetected: negativeCandidates.length };
  }

  // helper to get snapshot
  snapshot() {
    return {
      identity: this.heart.identity,
      emotions: this.heart.emotions,
      growth: this.heart.growth,
      relationship_with_user: this.heart.relationship_with_user,
      memories_summary: {
        episodic: this.heart.memories.episodic.length,
        semantic: this.heart.memories.semantic.length,
        dreams: this.heart.dreams.length,
        traumas: this.heart.traumas.length
      },
      logs_recent: this.heart.logs.prompts.slice(-8)
    };
  }
    // ---------- recall memories ----------  
  async recall(query, { topK = 10 } = {}) {
    await this._loading;
    const q = (query || "").toLowerCase();

    const episodic = this.heart.memories.episodic || [];
    const semantic = this.heart.memories.semantic || [];

    const results = [];

    function scoreText(text, q) {
      if (!text) return 0;
      const t = text.toLowerCase();
      if (t.includes(q)) return 1.0;
      // partial overlap: simple token overlap ratio
      const qtoks = q.split(/\s+/);
      let matches = 0;
      for (const tok of qtoks) if (t.includes(tok)) matches++;
      return matches / Math.max(qtoks.length, 1);
    }

    // score episodic memories
    for (const e of episodic) {
      const semScore = scoreText(e.content, q);
      const emoBoost = e.emotion && this.heart.emotions.current_state[e.emotion] ? 
                       this.heart.emotions.current_state[e.emotion] * 0.3 : 0;
      const imp = e.importance || 0.5;
      const total = (semScore * 0.6) + (imp * 0.3) + emoBoost;
      results.push({ ...e, type: "episodic", score: total });
    }

    // score semantic facts
    for (const s of semantic) {
      const semScore = scoreText(s.fact, q);
      const conf = s.confidence || 0.5;
      const total = (semScore * 0.7) + (conf * 0.3);
      results.push({ ...s, type: "semantic", score: total });
    }

    return results
      .sort((a,b) => b.score - a.score)
      .slice(0, topK);
  }
  // Add this inside HeartMemory class
async addHeart({ points = 1, reason = "interaction" } = {}) {
  await this._loading;
  points = Number(points) || 0;
  if (points <= 0) return 0;

  this.heart.hearts.total += points;
  this.heart.hearts.history.push({
    timestamp: now(),
    points,
    reason
  });

  await this.save();
  return this.heart.hearts.total;
}

getTotalHearts() {
  return this.heart.hearts.total || 0;
}


}
