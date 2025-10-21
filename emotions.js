// emotions.js
export class Emotions {
  constructor() {
    this.state = {
      dopamine: 0.5,
      serotonin: 0.5,
      norepinephrine: 0.5,
      cortisol: 0.5,
      valence: 0.5,
      arousal: 0.5,
      trust: 0.5,
      curiosity: 0.5,
      loneliness: 0.5,
      confidence: 0.5,
    };
  }

  clampAll() {
    for (const k of Object.keys(this.state)) {
      this.state[k] = Math.max(0, Math.min(1, this.state[k]));
    }
  }

  decay(rate = 0.01) {
    for (const k of Object.keys(this.state)) {
      const v = this.state[k];
      this.state[k] = v + (0.5 - v) * rate;
    }
  }

  adjustFromText(text) {
    const t = (text || "").toLowerCase();
    const has = (arr) => arr.some((w) => t.includes(w));

    if (has(["thanks","thank you","love","nice","good","cool","amazing","great","yay","happy","awesome"])) {
      this.state.dopamine += 0.06; this.state.serotonin += 0.04; this.state.valence += 0.05; this.state.loneliness -= 0.05; this.state.trust += 0.03;
    }
    if (has(["hate","stupid","dumb","shut up","idiot","sucks","no ","wrong","angry","terrible","sad","upset"])) {
      this.state.cortisol += 0.07; this.state.valence -= 0.06; this.state.trust -= 0.03;
    }
    if (has(["wow","amazing","excited","hyped","so excited","yay"])) {
      this.state.norepinephrine += 0.06; this.state.arousal += 0.06; this.state.dopamine += 0.04;
    }
    if (has(["urgent","hurry","now!","! ", " angry", "stressed", "anxious", "worried", "problem"])) {
      this.state.cortisol += 0.08; this.state.norepinephrine += 0.05; this.state.arousal += 0.03;
    }
    if (has(["why","how","tell me","teach me","what do you think","do you know"])) {
      this.state.curiosity += 0.07; this.state.confidence -= 0.02;
    }
    if (has(["alone","lonely","i miss","nobody","no one","i'm lonely"])) {
      this.state.loneliness += 0.08; this.state.trust -= 0.03;
    }

    this.clampAll();
  }

  // affects creativity
  temperature() {
    const s = this.state;
    let t = 1.0 + 0.9*(s.cortisol-0.5) + 0.7*(s.norepinephrine-0.5) - 0.6*(s.serotonin-0.5) - 0.3*(s.valence-0.5);
    return Math.max(0.35, Math.min(2.2, t));
  }

  // a tiny style prefix for prompt
  stylePrefix() {
    const s = this.state;
    if (s.valence > 0.65 && s.arousal < 0.6) return "cheerfully";
    if (s.cortisol > 0.65) return "anxiously";
    if (s.loneliness > 0.6) return "softly";
    if (s.curiosity > 0.6) return "curiously";
    if (s.trust < 0.35) return "shortly";
    if (s.confidence > 0.7) return "confidently";
    return "";
  }
}
