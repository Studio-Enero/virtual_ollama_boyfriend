// state.js
import fs from 'fs';
import { config } from 'dotenv';
config();

const STATE_FILE = process.env.STATE_FILE || 'state.json';

export class PersistentState {
  constructor() {
    this.state = {
      history: [], // { user, ai }
      emotions: null, // snapshot
      needs: null,    // snapshot
    };
    this.load();
  }

  load() {
    if (fs.existsSync(STATE_FILE)) {
      try {
        this.state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      } catch {}
    }
  }

  save() {
    fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
  }

  pushExchange(user, ai) {
    this.state.history.push({ user, ai });
    if (this.state.history.length > 2000) this.state.history.shift();
    this.save();
  }

  snapshot({ emotions, needs }) {
    this.state.emotions = emotions.state;
    this.state.needs = needs.state;
    this.save();
  }

  get() { return this.state; }
}
