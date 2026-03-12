const form = document.getElementById('email-form');
const input = document.getElementById('Chat');
const chatBody = document.querySelector('.chatbody');

// Helper to get cookie
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

// Ensure session cookie is set (server will set if missing)
if (!getCookie('sessionId')) {
  // Just a flag; the server will set it on first request
}

// Typing indicator element (we'll create and remove dynamically)
let typingIndicator = null;

function showTyping() {
  if (typingIndicator) return;
  typingIndicator = document.createElement('div');
  typingIndicator.className = 'chattext_bot';
  typingIndicator.innerHTML = `
    <div class="avatar bot">
      <img src="https://assets.website-files.com/5f21a3db5bf757b4a83cfd6b/5fbd03f3d83094e45ca0dc53_BrandScotty_Symbol.svg" alt="Bot Avatar">
    </div>
    <h2 class="chattext bot">...</h2>
  `;
  chatBody.appendChild(typingIndicator);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function hideTyping() {
  if (typingIndicator) {
    typingIndicator.remove();
    typingIndicator = null;
  }
}

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  // User bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'chattext_user';
  userBubble.style.display = 'flex';
  userBubble.innerHTML = `
    <h2 class="chattext user">${userMessage}</h2>
    <div class="avatar user">
      <img src="https://assets.website-files.com/5f21a3db5bf757b4a83cfd6b/5f21a7dbff29407b17327d46_UserAvatar.svg" alt="User Avatar">
    </div>
  `;
  chatBody.appendChild(userBubble);
  input.value = '';

  // Show typing indicator
  showTyping();

  try {
    const baseURL = window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : 'https://luna-9xcx.onrender.com'; // update to your production URL

    const res = await fetch(`${baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage }),
      credentials: 'include' // important for cookies
    });

    hideTyping();

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || `Server error ${res.status}`);
    }

    const data = await res.json();

    // Bot bubble
    const botBubble = document.createElement('div');
    botBubble.className = 'chattext_bot';
    botBubble.innerHTML = `
      <div class="avatar bot">
        <img src="https://assets.website-files.com/5f21a3db5bf757b4a83cfd6b/5fbd03f3d83094e45ca0dc53_BrandScotty_Symbol.svg" alt="Bot Avatar">
      </div>
      <h2 class="chattext bot">${data.reply || data.error || 'Sorry, I didn\'t understand.'}</h2>
    `;
    chatBody.appendChild(botBubble);

  } catch (err) {
    hideTyping();
    console.error('❌ Client error:', err);

    // Show error in chat
    const errorBubble = document.createElement('div');
    errorBubble.className = 'chattext_bot';
    errorBubble.innerHTML = `
      <div class="avatar bot">
        <img src="https://assets.website-files.com/5f21a3db5bf757b4a83cfd6b/5fbd03f3d83094e45ca0dc53_BrandScotty_Symbol.svg" alt="Bot Avatar">
      </div>
      <h2 class="chattext bot">Oops! Something went wrong. Try again later.</h2>
    `;
    chatBody.appendChild(errorBubble);
  }

  // Scroll to bottom
  chatBody.scrollTop = chatBody.scrollHeight;
});