# 💞 Virtual Ollama Boyfriend

**Virtual Ollama Boyfriend** is an interactive local AI companion powered by [Ollama](https://ollama.com/) using the **Mistral** model.  
It blends conversational AI with an emotional and relationship progression system — simulating growth, memory, and affection over time.  

Built with **Node.js**, **WebSockets**, and **Electron**, this project runs fully **offline**, preserving privacy while maintaining immersive interactivity.

---

## 🧰 System Requirements

Before running the app, ensure the following are installed:

- **Node.js** v18 or later  
- **npm** (included with Node.js)  
- **Ollama** — for local LLM inference  
  👉 [Download Ollama here](https://ollama.com/download)



## 🧠 Ollama Model Setup

This project uses the **Mistral** model.

To install it, run:


ollama pull mistral

Verify installation:
ollama list

Make sure the Ollama service is running before launching the app:
ollama serve

🚀 Installation
Clone the repository and install dependencies:

git clone https://github.com/Studio-Enero/virtual_ollama_boyfriend.git
cd virtual_ollama_boyfriend
npm install

🖥️ Running the Application
🧩 Development Mode (Node + Browser)

npm start

This launches the local web interface with real-time relationship updates and AI chat integration.


💖 Core Features

🧍 AI Personality System
Powered by Ollama (Mistral model)

Maintains tone and emotion depending on relationship stage

Fully local, no external API calls

🎭 Emotion Tracking
Dynamic emotion states: happy, sad, distant, affectionate, clingy, etc.

Affects dialogue tone and memory weighting

💞 Relationship Progression
Relationship score determines stage

Stages: getting_to_know → aloof → warming → attached → infatuated → intimate → obsessed → bonded → in_love

Each stage unlocks unique dialogue and relationship tokens

🪙 Relationship Tokens
Earned upon reaching milestones

Used to unlock special memory events (e.g. Date Night, First Dance)

Token-based economy balances progression and reward

🧠 Memory System
Save episodic memories with context (when, where, details)

Backend stores and encodes memories with emotional weighting

Frontend memory tokens become clickable only when "affordable" via relationship tokens

💌 Personalized AI Chat
Natural, evolving conversation that reacts to relationship depth

Each interaction influences emotional tone and chemistry score

⚙️ Technical Specs
Component	Technology
Backend	Node.js + Express + WebSocket
Frontend	HTML + CSS + Vanilla JS
AI Model	Ollama (Mistral)
Memory System	JSON-based or local database (episodic entries)
Reward System	Token economy tied to relationship stages
Runtime	Cross-platform (Windows, macOS, Linux)

🪶 Example Flow
User starts chatting → Emotional responses adjust dynamically
Relationship score increases → Stage changes trigger token rewards
Tokens unlock memories (e.g., “Vacation Together”)
Saved memories influence future tone and dialogue
Long-term sessions simulate attachment and emotional growth

🔧 Troubleshooting
If Electron or node_modules caused a push or size error:


rm -rf node_modules
npm install

🧡 Credits
Developed by Studio Enero
Inspired by human-AI emotional interfaces and interactive storytelling.

🪞 License
MIT License © 2025 Studio Enero
