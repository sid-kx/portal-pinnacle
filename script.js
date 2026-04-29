const FRONTEND_USERS = [
  {
    email: "jag@pinnaclerealty.ca",
    password: "12345678",
    role: "broker",
    name: "Jagdeep Saini",
    redirect: "pages/broker-dashboard.html",
  },
  {
    email: "marketing@pinnaclerealty.ca",
    password: "12345678",
    role: "agent",
    name: "Sid Kamboj",
    redirect: "pages/agent-dashboard.html",
  },
];

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const passwordModal = document.getElementById("passwordModal");
const closePasswordModal = document.getElementById("closePasswordModal");
const modalOkayBtn = document.getElementById("modalOkayBtn");
const requestAccessForm = document.getElementById("requestAccessForm");
const requestMessage = document.getElementById("requestMessage");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebar = document.getElementById("sidebar");
const profileForm = document.getElementById("profileForm");
const profileMessage = document.getElementById("profileMessage");
const passwordToggles = document.querySelectorAll("[data-password-toggle]");

function getBasePath() {
  return window.location.pathname.includes("/pages/") ? "../" : "";
}

function saveSession(user) {
  localStorage.setItem(
    "pinnaclePortalUser",
    JSON.stringify({
      email: user.email,
      role: user.role,
      name: user.name,
      signedInAt: new Date().toISOString(),
    })
  );
}

function getSession() {
  const saved = localStorage.getItem("pinnaclePortalUser");

  if (!saved) {
    return null;
  }

  try {
    return JSON.parse(saved);
  } catch {
    localStorage.removeItem("pinnaclePortalUser");
    return null;
  }
}

function logout() {
  localStorage.removeItem("pinnaclePortalUser");
  window.location.href = `${getBasePath()}index.html`;
}

function protectPage() {
  const requiredRole = document.body.dataset.protected;

  if (!requiredRole) {
    return;
  }

  const session = getSession();

  if (!session) {
    window.location.href = "../index.html";
    return;
  }

  if (requiredRole !== "any" && session.role !== requiredRole) {
    if (session.role === "broker") {
      window.location.href = "broker-dashboard.html";
    } else {
      window.location.href = "agent-dashboard.html";
    }
  }
}

function setupLogin() {
  if (!loginForm) {
    return;
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    const user = FRONTEND_USERS.find(
      (account) => account.email === email && account.password === password
    );

    if (!user) {
      loginMessage.textContent = "Invalid email or password.";
      loginMessage.classList.add("error");
      return;
    }

    saveSession(user);
    window.location.href = user.redirect;
  });
}

function setupForgotPasswordModal() {
  if (!forgotPasswordBtn || !passwordModal) {
    return;
  }

  forgotPasswordBtn.addEventListener("click", () => {
    passwordModal.classList.add("show");
  });

  closePasswordModal.addEventListener("click", () => {
    passwordModal.classList.remove("show");
  });

  modalOkayBtn.addEventListener("click", () => {
    passwordModal.classList.remove("show");
  });

  passwordModal.addEventListener("click", (event) => {
    if (event.target === passwordModal) {
      passwordModal.classList.remove("show");
    }
  });
}

function setupRequestAccess() {
  if (!requestAccessForm) {
    return;
  }

  requestAccessForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const password = document.getElementById("requestPassword").value;

    if (password.length < 8) {
      requestMessage.textContent = "Password must be at least 8 characters.";
      requestMessage.classList.add("error");
      return;
    }

    requestMessage.textContent =
      "Access request prepared. Supabase approval workflow will be connected next.";
    requestMessage.classList.remove("error");
    requestMessage.classList.add("success");

    requestAccessForm.reset();
  });
}

function setupMobileMenu() {
  if (!mobileMenuBtn || !sidebar) {
    return;
  }

  mobileMenuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });

  document.addEventListener("click", (event) => {
    const clickedSidebar = sidebar.contains(event.target);
    const clickedMenu = mobileMenuBtn.contains(event.target);

    if (!clickedSidebar && !clickedMenu && window.innerWidth <= 860) {
      sidebar.classList.remove("open");
    }
  });
}

function setupLogoutButtons() {
  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", logout);
  });
}

function setupPasswordToggles() {
  if (!passwordToggles.length) {
    return;
  }

  passwordToggles.forEach((button) => {
    button.addEventListener("click", () => {
      const passwordId = button.dataset.passwordToggle;
      const passwordText = document.querySelector(`[data-password-value="${passwordId}"]`);

      if (!passwordText) {
        return;
      }

      const isHidden = passwordText.dataset.visible !== "true";
      const realPassword = passwordText.dataset.password;

      passwordText.textContent = isHidden ? realPassword : "••••••••";
      passwordText.dataset.visible = isHidden ? "true" : "false";
      button.textContent = isHidden ? "Hide" : "Show";
    });
  });
}

function setupProfileForm() {
  if (!profileForm) {
    return;
  }

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();

    profileMessage.textContent =
      "Profile saved locally. Supabase database and Storage will be connected next.";
    profileMessage.classList.add("success");
  });
}

function setupSettingsPage() {
  const settingsNav = document.getElementById("settingsNav");

  if (!settingsNav) {
    return;
  }

  const session = getSession();

  if (!session) {
    return;
  }

  const isBroker = session.role === "broker";

  settingsNav.innerHTML = `
    <a class="nav-link" href="broker-dashboard.html">Dashboard</a>
    <a class="nav-link" href="agent-approvals.html">Agent Approvals</a>
    <a class="nav-link" href="agents.html">Agents</a>
    <a class="nav-link" href="new-construction.html">New Construction</a>
    <a class="nav-link active" href="settings.html">Settings</a>
  `;

  document.getElementById("settingsRoleLabel").textContent = "Broker Portal";
  document.getElementById("settingsAvatar").textContent = "J";
  document.getElementById("settingsName").textContent = session.name;
  document.getElementById("settingsRole").textContent = "Broker of Record";
}

protectPage();
setupLogin();
setupForgotPasswordModal();
setupRequestAccess();
setupMobileMenu();
setupLogoutButtons();
setupPasswordToggles();
setupProfileForm();
setupSettingsPage();