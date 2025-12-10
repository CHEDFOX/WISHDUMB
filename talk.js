// talk.js

// Backend API URL
const API_URL = "http://localhost:5000/chat";

const VOICE_API_URL = "http://localhost:5000/voice"; // adjust port if backend is different

// assign voices per persona (replace voice IDs with your own from ElevenLabs)
const personaVoices = {
  buddha: "HEjWyvmpnCCLpPZXRhby",
  socrates: "quYnT7HibMMDPdBtfkoY",
  nietzsche: "BbCuMPKmNN0R6RqZdjzw",
};


// Persona definitions
const personas = {
  buddha: {
    id: "buddha",
    name: "BUDDHA",
    video: "buddha.webm",
  },
  socrates: {
    id: "socrates",
    name: "SOCRATES",
    video: "socrates.webm",
  },
  nietzsche: {
    id: "nietzsche",
    name: "NEITZCHE",
    video: "nietzsche.webm",
  },
};

let currentPersona = "buddha";
let voiceModeOn = false;
let isSending = false;
let conversation = [];

// DOM elements
const avatarCircle = document.getElementById("avatarCircle");
const avatarVideo = document.getElementById("avatarVideo");
const personaSwitcher = document.getElementById("personaSwitcher");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendButton = document.getElementById("sendButton");
const voiceToggle = document.getElementById("voiceToggle");
const voiceLabel = document.getElementById("voiceLabel");

// Build persona selector buttons
if (personaSwitcher) {
  Object.values(personas).forEach((p) => {
    const btn = document.createElement("button");
    btn.textContent = p.name;
    btn.dataset.personaId = p.id;
    btn.addEventListener("click", () => switchPersona(p.id));
    personaSwitcher.appendChild(btn);
  });
}

// Update classes so selected button moves to center
// Map which order the buttons should appear in for each active persona
// decide order for each active persona
const personaOrder = {
  buddha: ["socrates", "buddha", "nietzsche"],
  socrates: ["buddha", "socrates", "nietzsche"],
  nietzsche: ["buddha", "nietzsche", "socrates"],
};

function updatePersonaButtons() {
  if (!personaSwitcher) return;

  const buttons = Array.from(personaSwitcher.children);
  const order = personaOrder[currentPersona];

  buttons.forEach((btn) => {
    const id = btn.dataset.personaId;

    // reset classes & order
    btn.classList.remove("active", "just-selected");
    btn.style.order = "";

    // set flex order so the active one is in the middle
    if (order && order.includes(id)) {
      const idx = order.indexOf(id); // 0,1,2
      btn.style.order = idx + 1;     // 1,2,3
    }

    if (id === currentPersona) {
      btn.classList.add("active", "just-selected");
      setTimeout(() => {
        btn.classList.remove("just-selected");
      }, 260);
    }
  });
}


// Switch active philosopher
function switchPersona(id) {
  currentPersona = id;
  const p = personas[id];
  if (!p) return;

  // Update buttons (center + bounce)
  updatePersonaButtons();

  // 🔥 SIMPLE VIDEO SWITCH
  if (avatarVideo) {
    avatarVideo.src = p.video;
    avatarVideo.load();
    avatarVideo.play().catch(() => {});
  }

  // Clear chat when persona changes
  if (chatMessages) {
    chatMessages.innerHTML = "";
  }
  conversation = [];
}


// Render a chat message
function addMessage(role, text) {
  if (!chatMessages) return;

  const row = document.createElement("div");
  row.classList.add("chat-message-row", role);

  const bubble = document.createElement("div");
  bubble.classList.add("chat-bubble", role);
  bubble.textContent = text;

  row.appendChild(bubble);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  conversation.push({ role, content: text });
}


async function speakReply(text) {
  try {
    const voiceId = personaVoices[currentPersona] || personaVoices.buddha;

    const res = await fetch(VOICE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceId }),
    });

    if (!res.ok) {
      console.error("TTS error:", await res.text());
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    audioPlayer.src = url;
    audioPlayer.play().catch((err) => {
      console.error("Audio play error:", err);
    });
  } catch (err) {
    console.error("speakReply error:", err);
  }
}


// Send message to backend
async function handleSend() {
  if (!chatInput || !sendButton) return;

  const text = chatInput.value.trim();
  if (!text || isSending) return;

  addMessage("user", text);
  chatInput.value = "";
  isSending = true;
  sendButton.disabled = true;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona: currentPersona,
        message: text,
        history: conversation.slice(-6),
      }),
    });

    const data = await res.json();

if (data && data.reply) {
  addMessage("assistant", data.reply);

  // trigger voice if voiceModeOn is active
  if (voiceModeOn) {
    speakReply(data.reply);
  }

  if (avatarCircle) {
    avatarCircle.classList.add("speaking");
    setTimeout(() => avatarCircle.classList.remove("speaking"), 800);
  }
} else {
  addMessage("assistant", "Error: No reply from server.");
}


  } catch (err) {
    console.error("Chat error:", err);
    addMessage("assistant", "Error: Could not reach the philosopher right now.");
  }

  isSending = false;
  sendButton.disabled = false;
}

// Wire up send button + Enter
if (sendButton) {
  sendButton.addEventListener("click", handleSend);
}

if (chatInput) {
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
}

// SAY button (UI only unless you wire TTS)
if (voiceToggle && voiceLabel && avatarCircle) {
  voiceToggle.addEventListener("click", () => {
    voiceModeOn = !voiceModeOn;
    if (voiceModeOn) {
      voiceToggle.classList.add("on");
      avatarCircle.classList.add("listening");
    } else {
      voiceToggle.classList.remove("on");
      avatarCircle.classList.remove("listening");
    }
  });
}

// Init default persona
switchPersona("buddha");


