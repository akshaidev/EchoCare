// ===================================================
// EchoCare Chat Logic (v2.8)
// Features:
// ✅ Chat persistence (per user)
// ✅ Multiple chats with switch
// ✅ Inline rename / delete
// ✅ Smooth typing + message handling
// ✅ Logout, new chat, welcome text
// ===================================================

// ---------------------- Auth Check ----------------------
const token = localStorage.getItem("echocare_token");
if (!token) window.location.href = "/login";

let username = localStorage.getItem("echocare_username") || "default_user";
const chatKey = "echocare_chats_" + username;

// ---------------------- DOM Elements ----------------------
const chatBox = document.getElementById("chat-box");
const input = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const welcome = document.getElementById("welcome");
const logoutBtn = document.getElementById("logout");
const newChatBtn = document.getElementById("new-chat");
const chatList = document.getElementById("chat-list");

// ---------------------- Storage Helpers ----------------------
function saveChats() {
  localStorage.setItem(chatKey, JSON.stringify(chats));
}

function loadChats() {
  try {
    const data = localStorage.getItem(chatKey);
    if (!data) return [];
    return JSON.parse(data);
  } catch (err) {
    console.error("Error loading chats:", err);
    return [];
  }
}

// ---------------------- Initialization ----------------------
let chats = loadChats();
if (!Array.isArray(chats) || chats.length === 0) {
  chats = [{ id: Date.now(), name: "Home Chat", messages: [] }];
}
let activeChat = chats[0];

// ---------------------- Logout ----------------------
logoutBtn.addEventListener("click", async () => {
  try {
    await fetch("/api/logout", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
    });
  } catch {}
  localStorage.removeItem("echocare_token");
  window.location.href = "/login";
});

// ---------------------- Chat List Rendering ----------------------
function renderChatList() {
  chatList.innerHTML = "";

  chats.forEach((chat) => {
    const item = document.createElement("div");
    item.className = "chat-item" + (chat.id === activeChat.id ? " active" : "");

    // Chat name
    const nameSpan = document.createElement("span");
    nameSpan.textContent = chat.name;
    nameSpan.className = "chat-name";
    nameSpan.addEventListener("click", (e) => {
      e.stopPropagation();
      switchChat(chat.id);
    });

    // Options button (⋯)
    const options = document.createElement("div");
    options.className = "chat-options";
    const dotBtn = document.createElement("button");
    dotBtn.textContent = "⋯";
    options.appendChild(dotBtn);
    item.appendChild(nameSpan);
    item.appendChild(options);

    // Dropdown menu
    const menu = document.createElement("div");
    menu.className = "chat-menu";
    menu.innerHTML = `
      <button class="rename">Rename</button>
      <button class="delete">Delete</button>
    `;
    item.appendChild(menu);

    // Show menu
    dotBtn.onclick = (e) => {
      e.stopPropagation();
      closeAllMenus();
      menu.style.display = "flex";
    };

    // Inline rename
    menu.querySelector(".rename").onclick = (e) => {
      e.stopPropagation();
      menu.style.display = "none";

      const renameInput = document.createElement("input");
      renameInput.type = "text";
      renameInput.value = chat.name;
      renameInput.className = "chat-rename-input";

      item.replaceChild(renameInput, nameSpan);
      renameInput.focus();

      const finishRename = () => {
        const newName = renameInput.value.trim();
        if (newName && newName !== chat.name) {
          chat.name = newName;
          saveChats();
        }
        item.replaceChild(nameSpan, renameInput);
        nameSpan.textContent = chat.name;
        nameSpan.addEventListener("click", () => switchChat(chat.id));
        renderChatList();
      };

      renameInput.addEventListener("blur", finishRename);
      renameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") finishRename();
      });
    };

    // Delete chat
    menu.querySelector(".delete").onclick = (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${chat.name}"?`)) {
        chats = chats.filter((c) => c.id !== chat.id);
        if (activeChat.id === chat.id) {
          activeChat = chats[0] || { id: Date.now(), name: "Home Chat", messages: [] };
        }
        saveChats();
        renderChatList();
        displayMessages();
      }
      menu.style.display = "none";
    };

    chatList.appendChild(item);
  });
}

// Close menus
function closeAllMenus() {
  document.querySelectorAll(".chat-menu").forEach((m) => (m.style.display = "none"));
}
document.body.addEventListener("click", (e) => {
  if (!e.target.closest(".chat-options") && !e.target.closest(".chat-menu")) {
    closeAllMenus();
  }
});

// ---------------------- Switching Chats ----------------------
function switchChat(id) {
  const chat = chats.find((c) => c.id === id);
  if (!chat) return;
  activeChat = chat;
  renderChatList();
  displayMessages();
  chatBox.classList.add("fade-switch");
  setTimeout(() => chatBox.classList.remove("fade-switch"), 300);
}

// ---------------------- New Chat ----------------------
function newChat() {
  const id = Date.now();
  const name = "Chat " + (chats.length + 1);
  const chat = { id, name, messages: [] };
  chats.push(chat);
  activeChat = chat;
  renderChatList();
  displayMessages();
  if (welcome) welcome.style.display = "block";
  saveChats();
}
newChatBtn.addEventListener("click", newChat);

// ---------------------- Messaging Logic ----------------------
function appendMessage(role, text, skipSave = false) {
  const msg = document.createElement("div");
  msg.className = `message ${role}`;
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;

  if (!skipSave) {
    activeChat.messages.push({ role, text });
    saveChats();
  }
}

function displayMessages() {
  chatBox.innerHTML = "";
  if (activeChat.messages.length === 0 && welcome) {
    welcome.style.display = "block";
  } else if (welcome) {
    welcome.style.display = "none";
  }
  activeChat.messages.forEach((m) => appendMessage(m.role, m.text, true));
}

function getLocalReply(i) {
  i = i.toLowerCase();
  if (i.includes("sad")) return "It’s okay to feel that way. Want to tell me what’s been tough lately?";
  if (i.includes("stress")) return "Let’s slow down and breathe. You’ve got this.";
  if (i.includes("exam")) return "Exams are temporary — your growth is permanent.";
  return "I'm here and listening.";
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  input.value = "";

  if (welcome) welcome.style.display = "none";
  appendMessage("user", text);

  const typing = document.createElement("div");
  typing.className = "message ai typing";
  typing.textContent = "EchoCare is typing…";
  chatBox.appendChild(typing);
  chatBox.scrollTop = chatBox.scrollHeight;

  setTimeout(() => {
    typing.remove();
    const reply = getLocalReply(text);
    appendMessage("ai", reply);
  }, 900);
}

sendBtn.onclick = sendMessage;
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// ---------------------- Start ----------------------
renderChatList();
displayMessages();
