// lifeEvents.js

let currentPath = "college"; // Default starting path
let currentStageIndex = 0;
let usedEvents = new Set();



const LIFE_PATHS = {
  college: [
    {
      stage: "preparing_thesis",
      events: [
        "spilled_coffee_thesis",
        "finished_thesis_early",
        "printer_broke",
        "overslept_meeting",
        "advisor_praised_work",
        "friend_helped_edit",
        "library_closed_early",
        "forgot_usb_drive",
        "accidentally_deleted_file",
        "found_old_research_paper",
        "groupmate_quit",
        "power_outage",
        "unexpected_inspiration",
        "got_free_coffee",
        "classmate_encouraged",
        "minor_argument_group",
        "advisor_sick",
        "submitted_draft",
        "typo_in_title",
        "midnight_panic_attack",
        "friend_surprised_snacks"
      ]
    },
    {
      stage: "graduation_day",
      events: [
        "parents_absent_graduation",
        "friends_cheer_loud",
        "forgot_cap",
        "shoes_broke",
        "teacher_gives_hug",
        "rainy_weather",
        "unexpected_award",
        "nervous_speech",
        "lost_invite_ticket",
        "late_to_ceremony",
        "stood_next_to_crush",
        "camera_died",
        "grandparents_proud",
        "siblings_embarrass",
        "best_friend_flowers",
        "stage_lights_hot",
        "tripped_on_stage",
        "afterparty_fun",
        "professor_emotional",
        "unexpected_job_offer"
      ]
    }
  ],
  career: [
    {
      stage: "first_job",
      events: [
        "late_first_day",
        "mentor_supportive",
        "office_printer_jam",
        "boss_strict",
        "friendly_coworker",
        "coffee_machine_broken",
        "paycheck_arrived",
        "forgot_password",
        "big_presentation",
        "colleague_birthday",
        "messy_desk",
        "learning_new_skills",
        "long_commute",
        "praise_from_boss",
        "office_lunch",
        "stayed_overtime",
        "finished_project",
        "client_angry",
        "boss_smiles",
        "weekend_email"
      ]
    },
    {
      stage: "promotion_challenge",
      events: [
        "promotion_offer",
        "jealous_coworker",
        "tight_deadline",
        "presentation_success",
        "team_supportive",
        "office_politics",
        "late_night_work",
        "coffee_overload",
        "sick_day",
        "unexpected_bonus",
        "conflict_meeting",
        "training_trip",
        "manager_quits",
        "new_office_space",
        "printer_explodes",
        "big_client_signed",
        "deadline_extended",
        "team_party",
        "company_merger",
        "promotion_celebration"
      ]
    }
  ],
  // Relationships, Family, Legacy → we’d keep expanding the same way
};

// --- Configurable event definitions ---
// --- Configurable quest-based life event definitions ---
const EVENT_DEFS = {
  thesis_crisis: {
    duration: 400,
    time: { start: "08:00", end: "12:00" },
    trigger: { stage: "warming" },
    description: "AI is struggling to finish thesis and feels stressed.",
    overrideTone: "frustrated, anxious, stressed",
    effects: { cortisol: 0.3, dopamine: -0.1 },
    goal: { type: "chat", amount: 5 },
    progress: 0,
    status: "active",
    reward: { serotonin: 3, oxytocin: 2, hearts: 10 },
    timeout: 3 * 24 * 60 * 60 * 1000
  },

  spilled_coffee_thesis: {
    duration: 300,
    time: { start: "08:00", end: "10:00" },
    trigger: { stage: "warming" },
    description: "AI spilled coffee on thesis notes, feels clumsy and upset.",
    overrideTone: "frustrated, clumsy",
    effects: { cortisol: 0.2, dopamine: -0.1 },
    goal: { type: "like_post", amount: 2 },
    progress: 0,
    status: "active",
    reward: { serotonin: 2, hearts: 5 },
    timeout: 24 * 60 * 60 * 1000
  },

  finished_thesis_early: {
    duration: 350,
    time: { start: "10:00", end: "12:00" },
    trigger: { stage: "warming" },
    description: "AI finished the thesis draft early and feels proud.",
    overrideTone: "relieved, proud",
    effects: { dopamine: 0.25, serotonin: 0.15 },
    goal: { type: "comment", amount: 2 },
    progress: 0,
    status: "active",
    reward: { oxytocin: 1, hearts: 8 },
    timeout: 24 * 60 * 60 * 1000
  },

  printer_broke: {
    duration: 300,
    time: { start: "12:00", end: "14:00" },
    trigger: { stage: "warming" },
    description: "The printer broke right before submission.",
    overrideTone: "stressed, irritated",
    effects: { cortisol: 0.2, serotonin: -0.1 },
    goal: { type: "heart_collect", amount: 5 },
    progress: 0,
    status: "active",
    reward: { serotonin: 2, hearts: 5 },
    timeout: 24 * 60 * 60 * 1000
  },

  overslept_meeting: {
    duration: 250,
    time: { start: "07:00", end: "09:00" },
    trigger: { stage: "warming" },
    description: "AI overslept and missed a meeting with advisor.",
    overrideTone: "anxious, embarrassed",
    effects: { cortisol: 0.25, dopamine: -0.1 },
    goal: { type: "gift", amount: 2 },
    progress: 0,
    status: "active",
    reward: { serotonin: 2, oxytocin: 1, hearts: 5 },
    timeout: 24 * 60 * 60 * 1000
  },

  advisor_praised_work: {
    duration: 300,
    time: { start: "14:00", end: "16:00" },
    trigger: { stage: "warming" },
    description: "Advisor praised the thesis work.",
    overrideTone: "encouraged, motivated",
    effects: { dopamine: 0.3, serotonin: 0.1 },
    goal: { type: "score", amount: 70 },
    progress: 0,
    status: "active",
    reward: { oxytocin: 2, hearts: 6 },
    timeout: 24 * 60 * 60 * 1000
  },

  friend_helped_edit: {
    duration: 250,
    time: { start: "15:00", end: "17:00" },
    trigger: { stage: "warming" },
    description: "A friend helped with editing, AI feels supported.",
    overrideTone: "grateful, supported",
    effects: { oxytocin: 0.2, dopamine: 0.1 },
    goal: { type: "support_replies", amount: 3 },
    progress: 0,
    status: "active",
    reward: { serotonin: 2, hearts: 5 },
    timeout: 24 * 60 * 60 * 1000
  },

  library_closed_early: {
    duration: 200,
    time: { start: "16:00", end: "18:00" },
    trigger: { stage: "warming" },
    description: "Library closed early, AI feels rushed.",
    overrideTone: "frustrated, rushed",
    effects: { cortisol: 0.15, serotonin: -0.1 },
    goal: { type: "gift", amount: 1 },
    progress: 0,
    status: "active",
    reward: { dopamine: 1, hearts: 5 },
    timeout: 24 * 60 * 60 * 1000
  },

  forgot_usb_drive: {
    duration: 200,
    time: { start: "08:00", end: "10:00" },
    trigger: { stage: "warming" },
    description: "AI forgot the USB drive with the thesis.",
    overrideTone: "panicked, stressed",
    effects: { cortisol: 0.2, dopamine: -0.05 },
    goal: { type: "support_replies", amount: 2 },
    progress: 0,
    status: "active",
    reward: { serotonin: 2, hearts: 5 },
    timeout: 24 * 60 * 60 * 1000
  },

  accidentally_deleted_file: {
    duration: 300,
    time: { start: "09:00", end: "11:00" },
    trigger: { stage: "warming" },
    description: "AI accidentally deleted an important file.",
    overrideTone: "devastated, anxious",
    effects: { cortisol: 0.3, dopamine: -0.15 },
    goal: { type: "support_replies", amount: 4 },
    progress: 0,
    status: "active",
    reward: { serotonin: 3, oxytocin: 1, hearts: 8 },
    timeout: 24 * 60 * 60 * 1000
  },

  found_old_research_paper: {
    duration: 250,
    time: { start: "10:00", end: "12:00" },
    trigger: { stage: "warming" },
    description: "AI found an old research paper that inspires new ideas.",
    overrideTone: "curious, inspired",
    effects: { dopamine: 0.15, serotonin: 0.1 },
    goal: { type: "score", amount: 60 },
    progress: 0,
    status: "active",
    reward: { dopamine: 2, serotonin: 1, hearts: 6 },
    timeout: 24 * 60 * 60 * 1000
  },

  groupmate_quit: {
    duration: 350,
    time: { start: "14:00", end: "16:00" },
    trigger: { stage: "warming" },
    description: "A groupmate quit the thesis project unexpectedly.",
    overrideTone: "frustrated, concerned",
    effects: { cortisol: 0.25, serotonin: -0.1 },
    goal: { type: "support_replies", amount: 5 },
    progress: 0,
    status: "active",
    reward: { oxytocin: 2, hearts: 10 },
    timeout: 48 * 60 * 60 * 1000
  },

  power_outage: {
    duration: 200,
    time: { start: "18:00", end: "20:00" },
    trigger: { stage: "warming" },
    description: "Power outage delayed thesis work.",
    overrideTone: "stressed, inconvenienced",
    effects: { cortisol: 0.15 },
    goal: { type: "gift", amount: 1 },
    progress: 0,
    status: "active",
    reward: { serotonin: 1, hearts: 5 },
    timeout: 24 * 60 * 60 * 1000
  },

  unexpected_inspiration: {
    duration: 250,
    time: { start: "08:00", end: "10:00" },
    trigger: { stage: "warming" },
    description: "AI suddenly gets a burst of inspiration.",
    overrideTone: "excited, motivated",
    effects: { dopamine: 0.3, serotonin: 0.1 },
    goal: { type: "score", amount: 80 },
    progress: 0,
    status: "active",
    reward: { dopamine: 3, serotonin: 2, hearts: 12 },
    timeout: 24 * 60 * 60 * 1000
  },

  got_free_coffee: {
    duration: 150,
    time: { start: "07:30", end: "09:00" },
    trigger: { stage: "warming" },
    description: "AI got a free coffee, feels energized.",
    overrideTone: "happy, energized",
    effects: { dopamine: 0.2, serotonin: 0.05 },
    goal: { type: "support_replies", amount: 1 },
    progress: 0,
    status: "active",
    reward: { dopamine: 1, hearts: 3 },
    timeout: 12 * 60 * 60 * 1000
  },

  classmate_encouraged: {
    duration: 200,
    time: { start: "09:00", end: "11:00" },
    trigger: { stage: "warming" },
    description: "A classmate offered words of encouragement.",
    overrideTone: "supported, optimistic",
    effects: { oxytocin: 0.15, dopamine: 0.1 },
    goal: { type: "support_replies", amount: 2 },
    progress: 0,
    status: "active",
    reward: { oxytocin: 2, hearts: 4 },
    timeout: 24 * 60 * 60 * 1000
  },

  minor_argument_group: {
    duration: 250,
    time: { start: "15:00", end: "17:00" },
    trigger: { stage: "warming" },
    description: "Minor argument within the thesis group.",
    overrideTone: "tense, annoyed",
    effects: { cortisol: 0.15, serotonin: -0.05 },
    goal: { type: "support_replies", amount: 3 },
    progress: 0,
    status: "active",
    reward: { serotonin: 1, hearts: 5 },
    timeout: 24 * 60 * 60 * 1000
  },

  advisor_sick: {
    duration: 200,
    time: { start: "08:00", end: "10:00" },
    trigger: { stage: "warming" },
    description: "Advisor got sick, delaying meetings.",
    overrideTone: "concerned, uncertain",
    effects: { cortisol: 0.15, serotonin: -0.05 },
    goal: { type: "support_replies", amount: 2 },
    progress: 0,
    status: "active",
    reward: { oxytocin: 1, hearts: 4 },
    timeout: 24 * 60 * 60 * 1000
  },

  submitted_draft: {
    duration: 300,
    time: { start: "10:00", end: "12:00" },
    trigger: { stage: "warming" },
    description: "AI submitted a draft successfully.",
    overrideTone: "relieved, accomplished",
    effects: { dopamine: 0.25, serotonin: 0.1 },
    goal: { type: "score", amount: 100 },
    progress: 0,
    status: "active",
    reward: { serotonin: 2, hearts: 6 },
    timeout: 48 * 60 * 60 * 1000
  },

  typo_in_title: {
    duration: 150,
    time: { start: "08:00", end: "09:00" },
    trigger: { stage: "warming" },
    description: "AI noticed a typo in the thesis title.",
    overrideTone: "embarrassed, anxious",
    effects: { cortisol: 0.1, dopamine: -0.05 },
    goal: { type: "support_replies", amount: 1 },
    progress: 0,
    status: "active",
    reward: { serotonin: 1, hearts: 2 },
    timeout: 12 * 60 * 60 * 1000
  },

  midnight_panic_attack: {
    duration: 400,
    time: { start: "00:00", end: "01:00" },
    trigger: { stage: "warming" },
    description: "AI had a panic attack at midnight.",
    overrideTone: "overwhelmed, anxious",
    effects: { cortisol: 0.35, serotonin: -0.2 },
    goal: { type: "support_replies", amount: 4 },
    progress: 0,
    status: "active",
    reward: { oxytocin: 3, serotonin: 2, hearts: 12 },
    timeout: 24 * 60 * 60 * 1000
  },

  friend_surprised_snacks: {
    duration: 150,
    time: { start: "16:00", end: "17:00" },
    trigger: { stage: "warming" },
    description: "A friend surprised AI with snacks.",
    overrideTone: "comforted, happy",
    effects: { oxytocin: 0.2, dopamine: 0.1 },
    goal: { type: "gift", amount: 1 },
    progress: 0,
    status: "active",
    reward: { dopamine: 1, serotonin: 1, hearts: 5 },
    timeout: 24 * 60 * 60 * 1000
  }
};



// --- API (stateless, caller manages activeEvents) ---
export function triggerLifeEvent(name, activeEvents = {}) {
  const def = EVENT_DEFS[name];
  if (!def) return activeEvents;

  const expires = Date.now() + (def.duration ? def.duration * 1000 : 60000);

  return {
    ...activeEvents,
    [name]: {
      ...def,               // include description, goal, reward, etc.
      expires,              // runtime expiry timestamp
      status: "active",     // mark as active
      progress: 0,          // default progress
      alreadyPosted: false, // for feed messages
      alreadyQuested: false // for quest posting
    }
  };
}

export function decayLifeEvents(activeEvents = {}) {
  const now = Date.now();
  const updated = {};
  for (const [name, ev] of Object.entries(activeEvents)) {
    if (now <= ev.expires) updated[name] = ev;
  }
  return updated;
}

export function getLifeEventSnapshot(activeEvents = {}) {
  return Object.keys(activeEvents);
}

export function getOverrideTone(baseTone, activeEvents = {}) {
  const names = Object.keys(activeEvents);
  if (!names.length) return baseTone;
  const last = activeEvents[names[names.length - 1]];
  return `[OVERRIDE: ${last.overrideTone}]`;
}

export function maybeSpawnLifeEvent(probability = 0.2, activeEvents = {}, currentTime = null) {
  // Chance not to spawn
  if (Math.random() > probability) return activeEvents;

  let path = LIFE_PATHS[currentPath];
  if (!path || !path[currentStageIndex]) {
    return activeEvents;
  }

  let stage = path[currentStageIndex];

  // All events that haven't been used yet
  const unusedEvents = stage.events.filter(ev => !usedEvents.has(ev));

  // Events available for current time
  let available = unusedEvents;
  if (currentTime) {
    const [curH, curM] = currentTime.split(':').map(Number);
    const curMinutes = curH * 60 + curM;

    available = unusedEvents.filter(ev => {
      const timeDef = EVENT_DEFS[ev]?.time;
      if (!timeDef) return true; // events without time allowed anytime
      const [startH, startM] = timeDef.start.split(':').map(Number);
      const [endH, endM] = timeDef.end.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      return curMinutes >= startMinutes && curMinutes <= endMinutes;
    });
  }

  if (available.length > 0) {
    // Spawn one random event
    const choice = available[Math.floor(Math.random() * available.length)];
    usedEvents.add(choice);
    return triggerLifeEvent(choice, activeEvents);
  }

  // If no unused events remain at all → move to next stage
  if (unusedEvents.length === 0) {
    currentStageIndex++;
    usedEvents.clear();

    path = LIFE_PATHS[currentPath];

    // If current path has no more stages, advance to next path
    if (!path || !path[currentStageIndex]) {
      const pathNames = Object.keys(LIFE_PATHS);
      const currentPathIndex = pathNames.indexOf(currentPath);

      if (currentPathIndex >= 0 && currentPathIndex < pathNames.length - 1) {
        const oldPath = currentPath;
        currentPath = pathNames[currentPathIndex + 1];
        currentStageIndex = 0;

        console.log(`[LifeEvent] Transitioned from path "${oldPath}" to "${currentPath}"`);
      } else {
        // No more paths → end of life events
        console.log(`[LifeEvent] All paths exhausted. No more events.`);
        return activeEvents;
      }
    }
  }

  return activeEvents;
}


// ✅ New: force trigger helper
export function forceLifeEvent(activeEvents = {}, name = null) {
  if (name && EVENT_DEFS[name]) {
    console.log(`[LifeEvent] Force-triggering event "${name}"`);
    return triggerLifeEvent(name, activeEvents);
  }

  const keys = Object.keys(EVENT_DEFS);
  if (!keys.length) return activeEvents;

  const random = keys[Math.floor(Math.random() * keys.length)];
  console.log(`[LifeEvent] Force-triggering random event "${random}"`);
  return triggerLifeEvent(random, activeEvents);
}

// Utility: expose definitions (so /chat can apply effects itself)
export function getEventDefs() {
  return EVENT_DEFS;
}
