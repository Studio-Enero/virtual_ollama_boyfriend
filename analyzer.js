// analyzer.js
import fs from 'fs/promises';
import path from 'path';

/**
 * Analyzer: Generates a strict JSON analysis of a user's behavior toward the AI boyfriend.
 * - Uses the ollama instance passed in (so it uses your configured model)
 * - Writes latest analysis to disk (/analysis/latest_analysis.json)
 * - Optionally stores to longTermMemory via callback
 * - Broadcasts via broadcastFn if provided
 *
 * The function returns the parsed analysis object (or null on failure).
 */

const ANALYSIS_DIR = path.join(process.cwd(), 'analysis');
const ANALYSIS_FILE = path.join(ANALYSIS_DIR, 'latest_analysis.json');

export const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    timestamp: { type: "number" },
    user_text: { type: "string" },
    inferred_user_emotion: { type: "string" }, // e.g., "cold","affectionate","hostile","neutral","guilty"
    behavior_flags: {
      type: "object",
      properties: {
        aloof: { type: "boolean" },
        rude: { type: "boolean" },
        selfish: { type: "boolean" },
        flirtatious: { type: "boolean" },
        apologetic: { type: "boolean" },
        manipulative: { type: "boolean" },
        immoral: { type: "boolean" }
      },
      additionalProperties: false
    },
    relationship_score_delta: { type: "number" }, // predicted delta (could be -5..5)
    chemistry_score_delta: { type: "number" },   // predicted delta
    deductions: { type: "array" }, // short array of textual deductions
    suggested_ai_reaction: { type: "string" }, // one-sentence suggested line for AI to inject
    assertive_actions: { type: "array" }, // short list of possible actions e.g. ["argue","sad","tease","pull-away"]
    confidence: { type: "number", minimum: 0, maximum: 1 }
  },
  required: [
    "timestamp",
    "user_text",
    "inferred_user_emotion",
    "behavior_flags",
    "relationship_score_delta",
    "chemistry_score_delta",
    "deductions",
    "suggested_ai_reaction",
    "assertive_actions",
    "confidence"
  ],
  additionalProperties: false
};

function safeParseJSON(text) {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim()
      // strip anything before first { or [
      .replace(/^[^\{\[]*/, "");
    return JSON.parse(cleaned);
  } catch (e) {
    return null;
  }
}

/**
 * buildAnalysisPrompt: returns the prompt to send to ollama focused on analysis only
 * Keep it strict: instruct model to only output JSON following schema (no extra text).
 */
function buildAnalysisPrompt({ userText, stage, relationship, chemistry, contextSummary, recalledText }) {
  // short, explicit instructions to produce strict JSON
  return `
You are an analysis module for a roleplay AI boyfriend (${stage.stage} stage).
Your job: analyze the user's latest message and output a single, strict JSON object (no commentary, no extra text).
The JSON must follow this shape exactly:
{
  "timestamp": <unix ms>,
  "user_text": "<original user text>",
  "inferred_user_emotion": "<one-word label: cold, affectionate, hostile, neutral, playful, sad, guilty, anxious>",
  "behavior_flags": {
    "aloof": true|false,
    "rude": true|false,
    "selfish": true|false,
    "flirtatious": true|false,
    "apologetic": true|false,
    "manipulative": true|false,
    "immoral": true|false
  },
  "relationship_score_delta": <number between -5 and 5>,
  "chemistry_score_delta": <number between -5 and 5>,
  "deductions": ["short deduction 1", "short deduction 2"],
  "suggested_ai_reaction": "one short in-character sentence the AI might say",
  "assertive_actions": ["argue","sad","tease","sultry","pull-away","forgive"],
  "confidence": <0.0 - 1.0>
}

Context:
- Current stage: ${stage.stage}
- Relationship score: ${relationship.score}
- Chemistry: ${chemistry}
- Recent context summary (deduped): ${contextSummary || "(none)"}
- Relevant memories (brief): ${recalledText || "(none)"}

You are analyzing the **user's behavior across this recent conversation** with the AI boyfriend.
Use the whole conversation window plus the latest user message to decide your JSON analysis.

Recent conversation (latest last):
${contextSummary || "(none)"}

Relevant memories:
${recalledText || "(none)"}

Latest user message (to analyze specifically):
"${userText}"


Important guidelines:
- Be realistic: if the user is rude, sarcastic, dismissive, or insulting, mark it clearly (hostile/argumentative/resentful).  
- The AI boyfriend is not always sweet. He can argue, fight back, form grudges, get sulky, go cold, or be jealous.  
- If the user shows warmth or apology, allow the AI to soften, forgive, or reconcile.  
- relationship_score_delta and chemistry_score_delta are your best-guess numeric effect from this message (negative lowers the meter).
- Keep "suggested_ai_reaction" short (<= 40 words), emotionally charged, and in-character (angry, cold, playful, or loving depending on analysis).
- Output only the JSON object. No explanatory text.
`.trim();
}

/**
 * analyzeUserBehavior - main function
 * params:
 *   - params.ollama: ollama client instance (required)
 *   - params.userText: string (required)
 *   - params.stage: result of getStage(...)
 *   - params.relationship: relationship object
 *   - params.emotions: emotions state snapshot (optional)
 *   - params.contextSummary: short chat history summary
 *   - params.recalledText: short memory recall
 *   - params.broadcastFn: optional function to broadcast socket message
 *   - params.longTermMemorySaveFn: optional function to persist analysis to LTM
 */
export async function analyzeUserBehavior({
  ollama,
  userText,
  stage,
  relationship,
  emotions,
  contextSummary,
  recalledText,
  broadcastFn,          // optional (ws broadcast)
  longTermMemorySaveFn  // optional (callback to persist)
}) {
  try {
    if (!ollama) throw new Error("Missing ollama instance");

    const prompt = buildAnalysisPrompt({
      userText,
      stage,
      relationship,
      chemistry: relationship.chemistry ?? 0,
      contextSummary,
      recalledText
    });

    // generate analysis
    const gen = await ollama.generate({
      model: process.env.OLLAMA_MODEL || 'mistral',
      prompt,
      format: 'json',
      options: {
        temperature: 0.2,
        max_output_tokens: 512
      }
    });

    const raw = gen?.response?.trim?.() || "";
    const parsed = safeParseJSON(raw);

    // If parsing failed, create fallback conservative analysis
    const now = Date.now();
    const fallback = {
      timestamp: now,
      user_text: userText,
      inferred_user_emotion: "neutral",
      behavior_flags: {
        aloof: false,
        rude: false,
        selfish: false,
        flirtatious: false,
        apologetic: false,
        manipulative: false,
        immoral: false
      },
      relationship_score_delta: 0,
      chemistry_score_delta: 0,
      deductions: ["parsing_failed"],
      suggested_ai_reaction: "Hmm... can you tell me more?",
      assertive_actions: ["neutral"],
      confidence: 0.25
    };

    const analysis = parsed && typeof parsed === 'object' ? parsed : fallback;

    // Ensure required fields exist and types are safe
    analysis.timestamp = Number(analysis.timestamp) || now;
    analysis.user_text = String(analysis.user_text || userText);
    analysis.inferred_user_emotion = String(analysis.inferred_user_emotion || "neutral");
    analysis.behavior_flags = typeof analysis.behavior_flags === 'object' ? analysis.behavior_flags : fallback.behavior_flags;
    analysis.relationship_score_delta = Number(analysis.relationship_score_delta || 0);
    analysis.chemistry_score_delta = Number(analysis.chemistry_score_delta || 0);
    analysis.deductions = Array.isArray(analysis.deductions) ? analysis.deductions.slice(0,5) : fallback.deductions;
    analysis.suggested_ai_reaction = String(analysis.suggested_ai_reaction || fallback.suggested_ai_reaction);
    analysis.assertive_actions = Array.isArray(analysis.assertive_actions) ? analysis.assertive_actions.slice(0,5) : fallback.assertive_actions;
    analysis.confidence = Math.max(0, Math.min(1, Number(analysis.confidence || 0)));

    // Persist to disk (create folder if needed)
    await fs.mkdir(ANALYSIS_DIR, { recursive: true });
    await fs.writeFile(ANALYSIS_FILE, JSON.stringify(analysis, null, 2), 'utf-8');

    // Persist to long term memory if callback provided
    if (typeof longTermMemorySaveFn === 'function') {
      try {
        await longTermMemorySaveFn('latest_analysis', analysis);
      } catch (e) {
        // don't fail the whole function
        console.warn("analysis: failed longTermMemorySaveFn:", e?.message || e);
      }
    }

    // Broadcast over websockets (if provided) so frontend can immediately show latest analysis
    if (typeof broadcastFn === 'function') {
      try {
        broadcastFn({
          type: "analysis_update",
          analysis
        });
      } catch (e) {
        console.warn("analysis: broadcast failed:", e?.message || e);
      }
    }

    return analysis;

  } catch (err) {
    console.error("❌ analyzeUserBehavior error:", err);
    return null;
  }
}
