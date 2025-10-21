async function sendMessage() {
  const userInput = document.getElementById("user-input");
  const chatBox = document.getElementById("chat-box");

  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  chatBox.innerHTML += `<div class="message user"><strong>You:</strong> ${userMessage}</div>`;
  userInput.value = "";

  const response = await fetch("/chat", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({message: userMessage})
  });

  const data = await response.json();
  chatBox.innerHTML += `<div class="message ai"><strong>Echo Care:</strong> ${data.response}</div>`;
  chatBox.scrollTop = chatBox.scrollHeight;
}
