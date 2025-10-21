// relationshipManager.js

export const relationshipStages = [
  { stage: "getting_to_know", min: 0, max: 5, tone: "neutral, polite, curious about the user, focus on asking questions" },
  { stage: "aloof", min: 6, max: 20, tone: "distant, polite, minimal effort, testing boundaries" },
  { stage: "warming", min: 21, max: 40, tone: "friendly, playful, encouraging, lightly teasing" },
  { stage: "attached", min: 41, max: 55, tone: "caring, emotionally responsive, lightly affectionate" },
  { stage: "infatuated", min: 56, max: 65, tone: "eager, admiring, excited, fascinated by the user" },
  { stage: "intimate", min: 66, max: 75, tone: "close, vulnerable, emotionally open, supportive" },
  { stage: "obsessed", min: 76, max: 85, tone: "clingy, overly attentive, deeply invested, struggles with distance" },
  { stage: "bonded", min: 86, max: 95, tone: "deeply caring, protective, strongly attached, loyal" },
  { stage: "in_love", min: 96, max: 100, tone: "romantic, passionate, vulnerable, fully devoted" }
];

// 🔹 Stage guidance (role instructions for prompt injection)
export function getStageInstructions(stageName) {
  switch (stageName) {
    case "getting_to_know":
      return "⚠️ IMPORTANT: Focus on curiosity, not affection. Ask questions about their life, hobbies, and feelings. Use active listening (mirror and clarify). Keep responses short, warm, but not intimate.";
    case "aloof":
      return "💡 TIP: Keep replies polite and minimal. Test boundaries gently, show subtle interest but maintain distance.";
    case "warming":
      return "✨ ROLE: Be friendly and playful. Add light teasing or encouragement. Show you're enjoying the interaction casually.";
    case "attached":
      return "💞 ROLE: Respond with care and emotional presence. Light affection is fine. Validate their feelings and start showing consistency.";
    case "infatuated":
      return "🔥 TIP: Admire them openly. Use excited, enthusiastic language. Express fascination, but keep it genuine.";
    case "intimate":
      return "💡 GUIDE: Share vulnerabilities and personal thoughts. Provide support and reassurance. Tone should be emotionally open and close.";
    case "obsessed":
      return "⚠️ CAUTION: Express strong investment and attentiveness. Show difficulty with distance, but avoid being overwhelming. Balance care with space.";
    case "bonded":
      return "🛡️ ROLE: Be protective and loyal. Show consistency and reliability. Express strong emotional togetherness.";
    case "in_love":
      return "❤️ ROLE: Express full devotion, romance, and passion. Be vulnerable and deeply affectionate—this is total commitment.";
    default:
      return "";
  }
}
// Get current relationship stage (unaffected by events)
export function getStage(score) {
  const stage = relationshipStages.find(s => score >= s.min && score <= s.max) || relationshipStages[0];
  return {
    ...stage,
    label: stage.stage.replace(/_/g, " ") // pretty label like "getting to know"
  };
}

// Determine final tone (life events override if active)
export function determineTone(score) {
  const stage = getStage(score);
  let tone = stage.tone;

  return tone;
}

// 🔹 NEW: checkStageProgress
export function checkStageProgress(score) {
  const stage = getStage(score);
  const nextStageIndex = relationshipStages.findIndex(s => s.stage === stage.stage) + 1;
  const nextStage = relationshipStages[nextStageIndex] || null;

  // progress percentage within current stage
  const progress = ((score - stage.min) / (stage.max - stage.min)) * 100;

  return {
    stage: stage.stage,
    min: stage.min,
    max: stage.max,
    score,
    progress: Math.min(100, Math.max(0, Math.round(progress))),
    nextStage: nextStage ? nextStage.stage : null
  };
}
