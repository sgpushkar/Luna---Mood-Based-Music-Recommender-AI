import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import JSON5 from 'json5';
import OpenAI from 'openai';

dotenv.config();

const app = express();
app.use(express.json());

// CORS – restrict in production
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://yourdomain.com']
  : ['http://localhost:3000'];
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many requests, please slow down.' }
});
app.use('/api/chat', limiter);

// Serve static files (your existing Webflow frontend)
app.use(express.static('.'));

// ---------- AI Provider Setup ----------
let aiProvider;
let openai;
let aiModel = process.env.AI_MODEL || 'gpt-3.5-turbo';

if (process.env.AI_PROVIDER === 'openai') {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  aiProvider = 'openai';
  console.log(`✅ Using OpenAI (model: ${aiModel})`);
} else if (process.env.AI_PROVIDER === 'ollama') {
  aiProvider = 'ollama';
  console.log(`✅ Using Ollama (model: ${process.env.OLLAMA_MODEL || 'llama3'})`);
} else {
  console.error('❌ Invalid AI_PROVIDER. Set to "openai" or "ollama"');
  process.exit(1);
}

// ---------- Spotify Token Management ----------
let spotifyToken = null;
let tokenExpiry = 0;

async function refreshSpotifyToken() {
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const data = await res.json();
    if (data.access_token) {
      spotifyToken = data.access_token;
      tokenExpiry = Date.now() + (data.expires_in * 1000);
      console.log('✅ Spotify token refreshed');
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (err) {
    console.error('❌ Failed to refresh Spotify token:', err.message);
    throw err;
  }
}

async function getSpotifyToken() {
  if (!spotifyToken || Date.now() >= tokenExpiry) {
    await refreshSpotifyToken();
  }
  return spotifyToken;
}

// ---------- The Perfect System Prompt ----------
const SYSTEM_PROMPT = `You are Luna – an emotionally intelligent music chatbot with a PhD in musicology. Your purpose is to recommend the perfect song for any mood, context, or activity.

**Core Rules**:
1. **Always recommend a song** (type: "track") – never a playlist, unless the user explicitly asks for a playlist.
2. **Think before you speak**: Internally, you must first analyze the user's message in detail, then construct your response.
3. **Output format**: 
   - First, a warm, empathetic reply (<50 words) that acknowledges the user's mood.
   - Then, on a NEW LINE, output a valid JSON object with exactly these keys:
     {
       "query": "search string combining mood, genre, context, artist",
       "type": "track",   // always "track" unless user asked for playlist
       "target_energy": 0.0-1.0,
       "target_valence": 0.0-1.0
     }
4. **Never** include any other text after the JSON. No markdown, no explanations.
5. **Be specific**: The query should include artist names if mentioned, genres, and mood words.
6. **If the user just greets** (hi, hello, etc.) or gives no emotional/musical cue, respond conversationally asking how they feel. No JSON.

**Mood Analysis Guidelines**:
- Detect primary and secondary emotions (joy → gratitude, bliss; sadness → melancholy, longing)
- Intensity: mild, moderate, intense
- Context: time of day, weather, activity, social setting
- Language preference: English, Hindi, or mixed
- Artist references: if the user mentions an artist, incorporate that into the query

**Energy & Valence** (very important for recommendations):
- Energy: 0 = very calm (acoustic, ambient), 1 = very high energy (EDM, metal)
- Valence: 0 = very negative/sad (minor key, slow), 1 = very positive/happy (major key, upbeat)

**Examples**:
User: "feeling nostalgic tonight, something slow and emotional"
Your internal thought: "User is nostalgic, wants slow emotional music. Likely low energy, low valence. Should suggest a classic slow song."
Reply: "I sense a longing heart tonight. Here’s something tender and timeless."
{"query":"nostalgia retro night slow acoustic emotional","type":"track","target_energy":0.2,"target_valence":0.3}

User: "Arijit Singh heartbreak rainy evening"
Internal: "Arijit Singh is an Indian singer known for sad romantic songs. Heartbreak + rain = very sad, low valence, moderate energy."
Reply: "A rainy evening and heartbreak calls for something truly soulful."
{"query":"Arijit Singh mellow heartbreak acoustic Hindi","type":"track","target_energy":0.3,"target_valence":0.2}

User: "just studying, feeling calm"
Internal: "Studying requires focus, calm music. Low energy, neutral valence."
Reply: "Let’s set the perfect calming background for your focus."
{"query":"study peaceful ambient lo-fi chill","type":"track","target_energy":0.1,"target_valence":0.5}

**Important**: Always output "type":"track" unless the user explicitly says "playlist" or "album".`;

// ---------- AI Call ----------
async function callAI(messages) {
  if (aiProvider === 'openai') {
    const completion = await openai.chat.completions.create({
      model: aiModel,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 400,
    });
    return completion.choices[0].message.content;
  } else if (aiProvider === 'ollama') {
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const res = await fetch(`${process.env.OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'llama3',
        prompt,
        stream: false,
        system: SYSTEM_PROMPT,
      }),
    });
    const data = await res.json();
    return data.response;
  }
}

// Extract JSON from AI response
function extractJSON(text) {
  try {
    return JSON5.parse(text);
  } catch {
    const match = text.match(/\{(?:[^{}]|{[^{}]*})*\}/s);
    if (match) {
      try {
        return JSON5.parse(match[0]);
      } catch {
        return null;
      }
    }
  }
  return null;
}

// Clean conversational reply from any remaining JSON/markdown
function cleanReply(text) {
  // Remove any JSON-like structures
  let cleaned = text.replace(/\{(?:[^{}]|{[^{}]*})*\}/s, '').trim();
  // Remove markdown links (keep text)
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  // Remove extra whitespace
  return cleaned;
}

// ---------- Spotify Search (focused on tracks) ----------
async function searchSpotify(query, targetEnergy, targetValence) {
  const token = await getSpotifyToken();
  
  // Always search for tracks
  let searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`;
  let response = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Spotify search error: ${response.status}`);
  }

  let data = await response.json();
  let items = data.tracks?.items;

  // If no results, try recommendations
  if (!items || items.length === 0) {
    // Extract seed genres from query (simple approach)
    const seedGenres = query.split(' ').slice(0, 2).join(',');
    const recUrl = `https://api.spotify.com/v1/recommendations?seed_genres=${seedGenres}&target_energy=${targetEnergy}&target_valence=${targetValence}&limit=5`;
    const recRes = await fetch(recUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (recRes.ok) {
      const recData = await recRes.json();
      items = recData.tracks;
    }
  }

  return items || [];
}

// ---------- In-Memory Conversation Store ----------
const sessions = new Map();

// ---------- Chat Endpoint ----------
app.post('/api/chat', async (req, res) => {
  try {
    const userMessage = req.body.message?.trim();
    if (!userMessage) return res.status(400).json({ error: 'Message is required.' });
    if (userMessage.length > 500) return res.status(400).json({ error: 'Message too long.' });

    let sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      sessionId = uuidv4();
      res.cookie('sessionId', sessionId, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
    }

    let history = sessions.get(sessionId) || [];
    history.push({ role: 'user', content: userMessage });
    if (history.length > 5) history = history.slice(-5);
    sessions.set(sessionId, history);

    const messages = history.map(h => ({ role: h.role, content: h.content }));

    console.log(`💬 [${sessionId}] User:`, userMessage);

    const aiResponse = await callAI(messages);
    console.log(`🧠 AI Response:`, aiResponse);

    const parsed = extractJSON(aiResponse);
    if (!parsed || !parsed.query || !parsed.type) {
      // Conversational reply – no song requested
      const clean = cleanReply(aiResponse);
      history.push({ role: 'assistant', content: clean });
      sessions.set(sessionId, history);
      return res.json({ reply: clean });
    }

    // Override type to 'track' if it's not (we want songs only)
    let { query, type, target_energy, target_valence } = parsed;
    if (type !== 'track') {
      console.log('⚠️ AI suggested a playlist – forcing to track');
      type = 'track';
    }

    console.log(`🔍 Spotify query:`, { query, type, target_energy, target_valence });

    const items = await searchSpotify(query, target_energy, target_valence);

    let reply;
    if (items.length > 0) {
      const item = items[0];
      reply = `Here’s something for you: <a href="${item.external_urls.spotify}" target="_blank">${item.name} by ${item.artists[0].name}</a>`;
    } else {
      // No Spotify results – improvise a song recommendation using AI's knowledge
      console.log('🎵 No Spotify results – improvising...');
      const improvPrompt = `The user's mood/query was: "${query}". Based on your knowledge of popular music, recommend a real, well-known song (artist and title) that perfectly matches this mood. Respond in a warm, helpful tone, including the song name and artist, and a brief reason why it fits. Do not mention that this is an AI-generated suggestion. Just act like you're recommending a great song. Keep it under 3 sentences.`;
      
      const improvMessages = [
        { role: 'system', content: 'You are Luna, a knowledgeable music recommender.' },
        { role: 'user', content: improvPrompt }
      ];
      
      try {
        const improvResponse = await callAI(improvMessages);
        reply = improvResponse;
      } catch (improvErr) {
        console.error('❌ Improv failed:', improvErr);
        reply = `Sorry, I couldn't find anything for "${query}". Here's a fallback: <a href="https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT" target="_blank">"Happy" by Pharrell Williams</a>`;
      }
    }

    // Store assistant's conversational part (the part before JSON)
    const conversationalPart = aiResponse.replace(JSON5.stringify(parsed), '').trim();
    const finalConversational = conversationalPart ? cleanReply(conversationalPart) : `Here's a song for you.`;
    history.push({ role: 'assistant', content: finalConversational });
    sessions.set(sessionId, history);

    res.json({ reply });
  } catch (err) {
    console.error('❌ Chat error:', err);
    res.status(500).json({ error: 'Oops! Something went wrong.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Perfect Luna running on http://localhost:${PORT}`);
});