// neuroAnalyzer.js
export function analyzeNeurochemicals(neuro) {
  const { dopamine, serotonin, norepinephrine, cortisol, valence, arousal, trust, curiosity, loneliness, confidence } = neuro;

  let mood = [];

  if (dopamine < 0.3 && serotonin < 0.3) mood.push("depressed, low motivation");
  else if (dopamine > 0.7 && norepinephrine > 0.7) mood.push("energized, excitable");
  else if (dopamine > 0.7 && serotonin > 0.7) mood.push("happy, content");
  else if (dopamine < 0.3 && norepinephrine > 0.7) mood.push("anxious, restless");

  if (cortisol > 0.7) mood.push("stressed, tense");
  else if (cortisol < 0.3) mood.push("relaxed");

  if (valence > 0.7 && arousal > 0.7) mood.push("playful, flirty");
  else if (valence < 0.3 && arousal < 0.3) mood.push("withdrawn, numb");

  if (trust > 0.7) mood.push("trusting, affectionate");
  if (loneliness > 0.7) mood.push("lonely, seeking closeness");

  if (confidence > 0.7) mood.push("confident, bold");
  else if (confidence < 0.3) mood.push("insecure, hesitant");

  if (curiosity > 0.7) mood.push("inquisitive, eager to explore");

  const dominant = mood.length ? mood.join("; ") : "neutral";

  return {
    dominant,
    explanation: `This mood is derived from analyzing virtual neurochemicals: dopamine=${dopamine}, serotonin=${serotonin}, norepinephrine=${norepinephrine}, cortisol=${cortisol}, valence=${valence}, arousal=${arousal}, trust=${trust}, curiosity=${curiosity}, loneliness=${loneliness}, confidence=${confidence}`
  };
}
