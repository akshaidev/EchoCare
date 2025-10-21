let mode = "login";
const btn = document.getElementById("btn-login");
const msg = document.getElementById("msg");
const toggle = document.getElementById("toggle-mode");
const overlay = document.getElementById("transition-overlay");

toggle.addEventListener("click", e => {
  e.preventDefault();
  if (mode === "login") {
    mode = "register";
    btn.textContent = "Create account";
    toggle.textContent = "Log in instead";
  } else {
    mode = "login";
    btn.textContent = "Continue";
    toggle.textContent = "Create one";
  }
  msg.textContent = "";
});

btn.addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  msg.textContent = "";

  if (!username || !password) {
    msg.textContent = "Please fill both fields";
    return;
  }

  const url = mode === "login" ? "/api/login" : "/api/register";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const j = await res.json();
    if (!res.ok) {
      msg.textContent = j.error || "Error";
      return;
    }

    localStorage.setItem("echocare_token", j.token);
    localStorage.setItem("echocare_username", username);

  // Trigger the smooth transition animation
  overlay.classList.add("active");
  const circle = overlay.querySelector(".fade-circle");
  circle.style.animation = "expandCircle 1.6s ease forwards";

  // Navigate to chat after animation completes
  setTimeout(() => {
    window.location.href = "/chat";
  }, 1650);

  } catch (err) {
    console.error(err);
    msg.textContent = "Network error. Ensure Flask is running.";
  }
});
