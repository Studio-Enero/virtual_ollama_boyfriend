import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEMORY_FILE = path.join(__dirname, 'longTermMemory.json');

export class LongTermMemory {
  constructor() {
    this.state = {
      emotions: {},
      needs: {},
      heart: {},
      relationship: {},
      persona: {},
      history: [],
    };
    this.load();
  }

  save() {
    try {
      fs.writeFileSync(MEMORY_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
      console.log('💾 Long-term memory saved.');
    } catch (err) {
      console.error('❌ Error saving long-term memory:', err);
    }
  }

  load() {
    try {
      if (fs.existsSync(MEMORY_FILE)) {
        const raw = fs.readFileSync(MEMORY_FILE, 'utf-8');
        this.state = JSON.parse(raw);
        console.log('♻️ Long-term memory loaded.');
      }
    } catch (err) {
      console.error('❌ Error loading long-term memory:', err);
    }
  }

  // Helpers
  update(key, value) {
    this.state[key] = value;
    this.save();
  }

  pushHistory(entry) {
    this.state.history.push(entry);
    if (this.state.history.length > 200) this.state.history.shift(); // cap history
    this.save();
  }

  get(key) {
    return this.state[key];
  }

  snapshot() {
    return this.state;
  }
}
