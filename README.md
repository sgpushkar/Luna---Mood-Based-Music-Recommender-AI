Luna – Mood‑Based Music Recommender AI
Luna is an emotionally intelligent chatbot that understands your mood, context, and music preferences, then recommends the perfect song from Spotify. Powered by either OpenAI GPT or local Ollama (LLaMA), Luna delivers warm, empathetic responses and smart music suggestions.

✨ Features
Mood detection – Understands emotions, intensity, time of day, activity, language preference, and artist references.

Smart recommendations – Uses Spotify search + recommendation API with energy/valence parameters.

AI‑powered fallback – If Spotify returns no results, Luna improvises a real song suggestion using its music knowledge.

Conversation memory – Remembers last 5 messages per session for context‑aware follow‑ups.

Always recommends songs – Forced to output type:"track" (no playlists unless explicitly requested).

Two‑stage thinking – The AI internally analyzes mood before responding (simulated via prompt engineering).

Rate limited & secure – Protects against abuse; CORS restricted in production.

Beautiful chat UI – Uses your existing Webflow design (no visual changes required).

🛠️ Tech Stack
Backend: Node.js, Express

AI Providers: OpenAI (GPT‑3.5/4) or Ollama (LLaMA 3, Mistral, etc.)

Music API: Spotify Web API

Frontend: HTML/CSS (Webflow template) + vanilla JavaScript

Additional Libraries: cors, dotenv, express-rate-limit, json5, node-fetch, uuid

📋 Prerequisites
Node.js (v18 or later)

npm

Either:

An OpenAI API key (if using OpenAI), or

Ollama installed and running locally with a model (e.g., llama3)

A Spotify Developer account to get Client ID and Client Secret

🚀 Installation & Setup
Clone the repository

bash
git clone https://github.com/sgpushkar/Luna---Mood-Based-Music-Recommender-AI.git
cd Luna---Mood-Based-Music-Recommender-AI
Install dependencies

bash
npm install
Set up environment variables
Create a .env file in the root directory and add the following (fill in your actual credentials):

ini
# AI Provider: "openai" or "ollama"
AI_PROVIDER=ollama

# OpenAI (only if provider = openai)
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-3.5-turbo

# Ollama (only if provider = ollama)
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3

# Spotify
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

# Server
PORT=3000
NODE_ENV=development
Start the server

bash
npm start
You should see:

text
✅ Using Ollama (model: llama3)
✅ Spotify token refreshed
✅ Perfect Luna running on http://localhost:3000
Open your browser
Navigate to http://localhost:3000 and start chatting with Luna!

🎯 Usage
Type how you feel, e.g., “I’m feeling energetic and want to work out”, “A sad song for a rainy day”, or “Something romantic for a date night”.

Luna will respond with a warm message and a Spotify song link (or an improvised recommendation if no match is found).

The bot remembers the last few messages, so you can follow up with requests like “something more upbeat”.

⚙️ Configuration Options
AI Provider
OpenAI: Set AI_PROVIDER=openai and provide your OPENAI_API_KEY. You can also change the model via AI_MODEL (e.g., gpt-4).

Ollama: Set AI_PROVIDER=ollama and ensure Ollama is running. Adjust OLLAMA_MODEL if you use a different model (e.g., mistral).

Spotify
Obtain your credentials from the Spotify Developer Dashboard and fill in SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.

Rate Limiting
By default, each IP is limited to 10 requests per minute. You can adjust this in server.js under the limiter configuration.

CORS
In development, the server allows http://localhost:3000. For production, update allowedOrigins in server.js with your actual frontend domain.

📁 Project Structure
text
Luna---Mood-Based-Music-Recommender-AI/
├── server.js              # Main backend (Express + AI + Spotify)
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (not committed)
├── .gitignore             # Files/folders to ignore in Git
├── public/                # Frontend files (your Webflow HTML, CSS, JS)
│   ├── index.html
│   ├── script.js
│   ├── deeploy-scotty.webflow.a549a5cbe.css
│   └── webflow.226f03325.js
└── README.md              # This file
🤝 Contributing
Contributions are welcome! If you'd like to improve Luna, please:

Fork the repository.

Create a new branch (git checkout -b feature/YourFeature).

Commit your changes (git commit -m 'Add some feature').

Push to the branch (git push origin feature/YourFeature).

Open a pull request.

📄 License
This project is licensed under the MIT License – see the LICENSE file for details.

👥 Authors
Pushkar Mhatre – @sgpushkar

Nirav Thakur – @nirav1345

🙏 Acknowledgements
Webflow for the original template design.

Spotify for their amazing Web API.

OpenAI and Ollama for making advanced AI accessible.

Enjoy discovering music with Luna! 🎵
