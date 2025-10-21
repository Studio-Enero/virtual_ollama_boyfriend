export class DailyRoutine {
  constructor({ fastMode = false } = {}) {
    this.schedule = [
      { time: "06:30", activity: "Wake up, stretch lightly" },
      { time: "06:35", activity: "Bathroom: brush teeth, wash face, morning skincare" },
      { time: "06:50", activity: "Quick morning exercise: stretches / push-ups" },
      { time: "07:10", activity: "Shower and get dressed" },
      { time: "07:30", activity: "Prepare breakfast: eggs, toast, tea/coffee" },
      { time: "08:00", activity: "Eat breakfast" },
      { time: "08:25", activity: "Wash dishes and clean kitchen" },
      { time: "08:30", activity: "Morning classes / lectures / study session" },
      { time: "10:00", activity: "Short break: walk around, drink water, check phone" },
      { time: "10:15", activity: "Homework / assignments / reading" },
      { time: "11:30", activity: "Prep snack: fruits or tea" },
      { time: "11:45", activity: "Relax briefly, maybe listen to music" },
      { time: "12:00", activity: "Lunch: cook simple dish or heat meal" },
      { time: "12:30", activity: "Eat lunch" },
      { time: "12:50", activity: "Wash dishes, tidy dining area" },
      { time: "13:00", activity: "Afternoon classes / lab / group work" },
      { time: "15:00", activity: "Exercise / sports / outdoor activity" },
      { time: "15:45", activity: "Cool down, shower or wash up" },
      { time: "16:00", activity: "Relax / hobbies: drawing, music, gaming" },
      { time: "17:00", activity: "Light snack / tea / check messages" },
      { time: "17:15", activity: "Tidy room, small chores" },
      { time: "18:00", activity: "Dinner: cook or help prepare family meal" },
      { time: "18:30", activity: "Eat dinner" },
      { time: "19:00", activity: "Evening study / projects / practice skills" },
      { time: "20:30", activity: "Short break: walk, stretch, grab water" },
      { time: "20:45", activity: "Continue study or creative projects" },
      { time: "21:30", activity: "Leisure: gaming, reading, watch videos" },
      { time: "22:15", activity: "Prepare for bed: brush teeth, wash face, skincare" },
      { time: "22:45", activity: "Set clothes for tomorrow, tidy desk" },
      { time: "23:00", activity: "Sleep" }
    ];

    this.currentActivity = null;
    this.lastCheckedHourMinute = null;

    this.fastMode = fastMode;
    this.fastIndex = 0;
  }

  _getCurrentTimeString(date = new Date()) {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  tick() {
    let activity = null;
    let currentHM;

    if (this.fastMode) {
      // --- fast mode ---
      if (this.fastIndex < this.schedule.length) {
        activity = this.schedule[this.fastIndex].activity;
        currentHM = this.schedule[this.fastIndex].time;
        this.fastIndex++;
      } else {
        // auto reset when end reached
        this.resetFastMode();
        console.log("[DailyRoutine] Fast mode cycle complete → restarting");
        return null;
      }
    } else {
      // --- sync mode ---
      const now = new Date();
      currentHM = this._getCurrentTimeString(now);

      // reset at midnight
      if (currentHM === "00:00") {
        this.currentActivity = null;
        console.log("[DailyRoutine] Midnight reset, new day started");
      }

      // Prevent multiple updates within the same minute
      if (currentHM === this.lastCheckedHourMinute) return null;
      this.lastCheckedHourMinute = currentHM;

      // Find last activity <= current time
      for (const slot of this.schedule) {
        if (slot.time <= currentHM) activity = slot.activity;
        else break;
      }
    }

    if (activity && activity !== this.currentActivity) {
      this.currentActivity = activity;
      console.log(`[DailyRoutine] ${currentHM} → AI is now: ${this.currentActivity}`);
      return this.currentActivity;
    }

    return null;
  }

  getCurrentActivity() {
    return this.currentActivity;
  }

  resetFastMode() {
    this.fastIndex = 0;
    this.currentActivity = null;
  }
}
