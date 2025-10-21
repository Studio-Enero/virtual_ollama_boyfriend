// memory.js
import fs from 'fs';
import { config } from 'dotenv';
import { Ollama } from 'ollama';
config();

const MEMORY_FILE = process.env.MEMORY_FILE || 'memory.json';
const EMBED_MODEL = process.env.EMBED_MODEL || 'nomic-embed-text';

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i];
  }
  return dot / (Math.sqrt(na)*Math.sqrt(nb) + 1e-9);
}

export class MemoryStore {
  constructor() {
    this.records = []; // { id, text, meta, vector }
    this.ollama = new Ollama();
    this.load();
  }

  load() {
    if (fs.existsSync(MEMORY_FILE)) {
      try {
        const raw = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf-8'));
        this.records = raw.records || [];
      } catch {}
    }
  }

  save() {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify({ records: this.records }, null, 2));
  }

  async embed(text) {
    const res = await this.ollama.embeddings({
      model: EMBED_MODEL,
      prompt: text,
    });
    return res?.embedding || [];
  }

  async add(text, meta = {}) {
    const vector = await this.embed(text);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.records.push({ id, text, meta, vector });
    this.save();
    return id;
  }

  async search(query, k = 5) {
    if (!this.records.length) return [];
    const qv = await this.embed(query);
    const scored = this.records.map(r => ({ r, score: cosine(qv, r.vector) }));
    scored.sort((a,b) => b.score - a.score);
    return scored.slice(0, k).map(s => ({ id: s.r.id, text: s.r.text, meta: s.r.meta, score: s.score }));
  }

  forget(matchSubstring) {
    const before = this.records.length;
    this.records = this.records.filter(r => !(r.text.toLowerCase().includes(matchSubstring.toLowerCase())));
    this.save();
    return before - this.records.length;
  }

  clear() {
    const n = this.records.length;
    this.records = [];
    this.save();
    return n;
  }

  all() { return this.records.slice(); }
}
