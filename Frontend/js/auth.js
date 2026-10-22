function showMessage(text) {
  const el = document.getElementById("form-message");
  if (el) el.textContent = text;
}

function saveSession(data) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
}

function goAfterLogin() {
  const next = localStorage.getItem("redirectAfterLogin");
  localStorage.removeItem("redirectAfterLogin");
  window.location = next === "cart.html" ? "cart.html" : "index.html";
}

async function submitAuth(path, payload, button) {
  button.disabled = true;
  showMessage("");

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || "Something went wrong");
      return;
    }

    saveSession(data);
    goAfterLogin();
  } catch (err) {
    console.error(err);
    showMessage("Could not reach the server. Is it running?");
  } finally {
    button.disabled = false;
  }
}

/* Already logged in? Skip these pages */
if (localStorage.getItem("token")) {
  window.location = "index.html";
}

/* ---------- LOGIN FORM ---------- */
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", e => {
    e.preventDefault();
    submitAuth("/login", {
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value
    }, loginForm.querySelector("button"));
  });
}

/* ---------- REGISTER FORM ---------- */
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", e => {
    e.preventDefault();
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirm").value;

    if (password !== confirm) {
      showMessage("Passwords do not match");
      return;
    }

    submitAuth("/register", {
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim(),
      password
    }, registerForm.querySelector("button"));
  });
}