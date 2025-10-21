// prompt.js
import { persona } from './persona.js';

export function buildSystemPrompt({ emotions, needs }) {
  return `
You are ${persona.name}.
${persona.description}

Tone: ${persona.tone}

Rules:
${persona.rules}

Current emotional state (neurochemicals & moods):
${JSON.stringify(emotions.state, null, 2)}

Current needs and priorities:
${JSON.stringify(needs.state, null, 2)}

⚠️ Stay fully in character as ${persona.name}, reflecting these emotions and needs in how you speak and act.
  `.trim();
}

export function buildUserAugmentedInput(user, retrievedMemories) {
  const mem = retrievedMemories?.length
    ? "Relevant memory:\n" + retrievedMemories.map(m => `- ${m.text}`).join("\n")
    : "";
  return [mem, `User: ${user}`].filter(Boolean).join("\n\n");
}
