// needs.js
export class Needs {
  constructor() {
    this.state = {
      social: 0.5,   // wants interaction
      learning: 0.5, // wants to be taught
      rest: 0.5,     // wants to rest
    };
  }

  tick() {
    // drift slightly toward wanting more social & learning over time
    this.state.social = Math.min(1, this.state.social + 0.01);
    this.state.learning = Math.min(1, this.state.learning + 0.005);
    this.state.rest = Math.max(0, this.state.rest - 0.003);
  }

  reinforce(event) {
    if (event === "positive_interaction") this.state.social = Math.max(0, this.state.social - 0.1);
    if (event === "taught_something") this.state.learning = Math.max(0, this.state.learning - 0.1);
    if (event === "rested") this.state.rest = Math.min(1, this.state.rest + 0.2);
  }

  summaryLine() {
    const s = this.state;
    const needs = [];
    if (s.social > 0.7) needs.push("wants to connect");
    if (s.learning > 0.7) needs.push("wants to learn");
    if (s.rest < 0.3) needs.push("is getting tired");
    return needs.length ? `Right now, the AI ${needs.join(", ")}.` : "";
  }
}
