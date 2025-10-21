# 💞 Virtual Ollama Boyfriend

An interactive AI companion powered by **Ollama** and the **Mistral** model.  
Features include emotion tracking, relationship stages, and memory tokens — all running locally through Node.js and Electron.

---

## 🧰 Requirements

Before running, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)
- [Ollama](https://ollama.com/download) — for local AI inference  
  *(Make sure the Ollama service is running on your system)*

---

## 🧠 Ollama Model Setup

This project requires the **Mistral** model.  
Run this command once after installing Ollama:

```bash
ollama pull mistral
You can verify it’s installed with:

bash
Copy code
ollama list
🚀 Installation
Clone the repository and install dependencies:

bash
Copy code
git clone https://github.com/Studio-Enero/virtual_ollama_boyfriend.git
cd virtual_ollama_boyfriend
npm install
🖥️ Running the App
Start the development version:

bash
Copy code
npm start
If you’re running a Node-only server version:

bash
Copy code
node server.js
(Adjust filename if your main entry file is different.)

🧩 Folder Structure
php
Copy code
virtual_ollama_boyfriend/
├── server.js             # Main backend logic and WebSocket broadcast
├── public/               # Frontend HTML/CSS/JS files
├── src/                  # Core logic for relationship, emotions, and memory
│   ├── relationshipManager.js
│   ├── emotionManager.js
│   └── memoryHandler.js
├── package.json
└── README.md
💖 Features
🎭 Emotion system (happy, sad, curious, etc.)

💞 Relationship stage progression with tokens

🧠 Memory creation & saving

🧍 Local AI personality powered by Ollama + Mistral

💌 Customizable interactions per relationship stage

