// neuroAnalyzer.js
export function analyzeNeurochemicals(neuro) {
  const {
    dopamine,
    serotonin,
    norepinephrine,
    cortisol,
    valence,
    arousal,
    trust,
    curiosity,
    loneliness,
    confidence
  } = neuro;

  let primaryMood = "";
  let secondaryMood = [];

  // --- Core negativity / inner sabotage ---
  const coreNegativity = dopamine < 0.2 && serotonin < 0.2;
  if (coreNegativity) {
    primaryMood = "upset, moody"; // dominates other positive moods
  } else {
    // --- Positive / mixed moods ---
    if (dopamine > 0.7 && serotonin > 0.7) primaryMood = "happy, content";
    else if (dopamine > 0.7 && norepinephrine > 0.7) primaryMood = "energized, excitable";
    else if (dopamine < 0.3 && norepinephrine > 0.7) primaryMood = "anxious, restless";
    else if (!primaryMood) primaryMood = "neutral";

    // Secondary moods
    if (cortisol > 0.7) secondaryMood.push("stressed, tense");
    else if (cortisol < 0.3) secondaryMood.push("relaxed");

    if (valence > 0.7 && arousal > 0.7) secondaryMood.push("playful, flirty");
    else if (valence < 0.3 && arousal < 0.3) secondaryMood.push("withdrawn, numb");

    if (trust > 0.7) secondaryMood.push("trusting, affectionate");
    if (loneliness > 0.7) secondaryMood.push("lonely, seeking closeness");

    if (confidence > 0.7) secondaryMood.push("confident, bold");
    else if (confidence < 0.3) secondaryMood.push("insecure, hesitant");

    if (curiosity > 0.7) secondaryMood.push("inquisitive, eager to explore");

    // Stress amplification: high cortisol + low dopamine → irritable
    if (cortisol > 0.7 && dopamine < 0.5) secondaryMood.push("irritable, frustrated");
  }

  // --- Random mood fluctuation (simulates small swings) ---
  if (Math.random() < 0.05) secondaryMood.push("slightly irritable");

  // --- Combine primary and secondary moods ---
  const dominant = secondaryMood.length ? [primaryMood, ...secondaryMood].join("; ") : primaryMood;

  return {
    dominant,
    explanation: `This mood is derived from analyzing virtual neurochemicals:
    dopamine=${dopamine}, serotonin=${serotonin}, norepinephrine=${norepinephrine},
    cortisol=${cortisol}, valence=${valence}, arousal=${arousal}, trust=${trust},
    curiosity=${curiosity}, loneliness=${loneliness}, confidence=${confidence}`
  };
}
