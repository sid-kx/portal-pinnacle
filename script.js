
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
const agentApprovalsTableBody = document.getElementById("agentApprovalsTableBody");
const agentApprovalsEmptyState = document.getElementById("agentApprovalsEmptyState");
const projectFormCard = document.getElementById("projectFormCard");
const newConstructionForm = document.getElementById("newConstructionForm");
const projectMessage = document.getElementById("projectMessage");
const addProjectBtn = document.getElementById("addProjectBtn");
const cancelProjectBtn = document.getElementById("cancelProjectBtn");
const resetProjectBtn = document.getElementById("resetProjectBtn");

function hasSupabase() {
  return typeof supabaseClient !== "undefined" && supabaseClient;
}

function getRedirectForRole(role) {
  const basePath = getBasePath();

  if (role === "broker") {
    return `${basePath}pages/broker-dashboard.html`;
  }

  return `${basePath}pages/agent-dashboard.html`;
}

async function getPortalUserByAuthId(authUserId) {
  if (!hasSupabase() || !authUserId) {
    return null;
  }

  const { data, error } = await supabaseClient
    .from("portal_users")
    .select("id, auth_user_id, full_name, email, role, account_status, is_permanent_admin")
    .eq("auth_user_id", authUserId)
    .single();

  if (error) {
    console.error("Could not load portal user:", error);
    return null;
  }

  return data;
}

function getBasePath() {
  return window.location.pathname.includes("/pages/") ? "../" : "";
}

function saveSession(user) {
  localStorage.setItem(
    "pinnaclePortalUser",
    JSON.stringify({
      id: user.id,
      auth_user_id: user.auth_user_id,
      email: user.email,
      role: user.role,
      name: user.full_name || user.name,
      account_status: user.account_status,
      is_permanent_admin: Boolean(user.is_permanent_admin),
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

async function logout() {
  localStorage.removeItem("pinnaclePortalUser");

  if (hasSupabase()) {
    await supabaseClient.auth.signOut();
  }

  window.location.href = `${getBasePath()}index.html`;
}

async function protectPage() {
  const requiredRole = document.body.dataset.protected;

  if (!requiredRole) {
    return;
  }

  if (!hasSupabase()) {
    const session = getSession();

    if (!session) {
      window.location.href = "../index.html";
      return;
    }

    if (requiredRole !== "any" && session.role !== requiredRole) {
      window.location.href = session.role === "broker" ? "broker-dashboard.html" : "agent-dashboard.html";
    }

    return;
  }

  const { data: authData, error: authError } = await supabaseClient.auth.getUser();

  if (authError || !authData.user) {
    localStorage.removeItem("pinnaclePortalUser");
    window.location.href = "../index.html";
    return;
  }

  const portalUser = await getPortalUserByAuthId(authData.user.id);

  if (!portalUser || portalUser.account_status !== "active") {
    localStorage.removeItem("pinnaclePortalUser");
    await supabaseClient.auth.signOut();
    window.location.href = "../index.html";
    return;
  }

  saveSession(portalUser);

  if (requiredRole !== "any" && portalUser.role !== requiredRole) {
    window.location.href = portalUser.role === "broker" ? "broker-dashboard.html" : "agent-dashboard.html";
  }
}

function setupLogin() {
  if (!loginForm) {
    return;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    loginMessage.textContent = "Signing in...";
    loginMessage.classList.remove("error", "success");

    if (!hasSupabase()) {
      loginMessage.textContent = "Supabase is not connected yet. Add supabase-config.js first.";
      loginMessage.classList.add("error");
      return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      loginMessage.textContent = "Invalid email or password.";
      loginMessage.classList.add("error");
      return;
    }

    const portalUser = await getPortalUserByAuthId(data.user.id);

    if (!portalUser) {
      await supabaseClient.auth.signOut();
      loginMessage.textContent = "Your portal profile was not found. Please contact the Broker of Record.";
      loginMessage.classList.add("error");
      return;
    }

    if (portalUser.account_status !== "active") {
      await supabaseClient.auth.signOut();
      loginMessage.textContent = "Your portal account is not active yet. Please wait for broker approval.";
      loginMessage.classList.add("error");
      return;
    }

    saveSession(portalUser);
    window.location.href = getRedirectForRole(portalUser.role);
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

  requestAccessForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!hasSupabase()) {
      requestMessage.textContent = "Supabase is not connected.";
      requestMessage.classList.add("error");
      requestMessage.classList.remove("success");
      return;
    }

    const formData = new FormData(requestAccessForm);
    const fullName = formData.get("full_name")?.trim();
    const email = formData.get("email")?.trim().toLowerCase();
    const phone = formData.get("phone")?.trim();
    const licenseNumber = formData.get("license_number")?.trim();
    const password = formData.get("password") || "";

    if (password.length < 8) {
      requestMessage.textContent = "Password must be at least 8 characters.";
      requestMessage.classList.add("error");
      requestMessage.classList.remove("success");
      return;
    }

    requestMessage.textContent = "Submitting access request...";
    requestMessage.classList.remove("error", "success");

    const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: "agent",
        },
      },
    });

    if (signUpError) {
      requestMessage.textContent = signUpError.message;
      requestMessage.classList.add("error");
      requestMessage.classList.remove("success");
      return;
    }

    const authUserId = signUpData.user?.id || null;

    const { error: requestError } = await supabaseClient
      .from("access_requests")
      .insert({
        full_name: fullName,
        email,
        phone,
        license_number: licenseNumber || null,
        role: "agent",
        status: "pending",
        requested_auth_user_id: authUserId,
      });

    if (requestError) {
      requestMessage.textContent = requestError.message;
      requestMessage.classList.add("error");
      requestMessage.classList.remove("success");
      return;
    }

    await supabaseClient.auth.signOut();

    requestMessage.textContent =
      "Access request submitted. Jag Saini will review and approve your account before you can log in.";
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
    button.addEventListener("click", () => {
      logout();
    });
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

    const session = getSession();
    const formData = new FormData(profileForm);
    const profilePayload = {
      user_email: session?.email,
      full_name: formData.get("full_name")?.trim(),
      email: formData.get("email")?.trim().toLowerCase(),
      direct_phone: formData.get("direct_phone")?.trim(),
      office_phone: formData.get("office_phone")?.trim(),
      bio: formData.get("bio")?.trim(),
      instagram_url: formData.get("instagram_url")?.trim(),
      facebook_url: formData.get("facebook_url")?.trim(),
      linkedin_url: formData.get("linkedin_url")?.trim(),
      twitter_url: formData.get("twitter_url")?.trim(),
      youtube_url: formData.get("youtube_url")?.trim(),
      profile_status: formData.get("profile_status") || "active",
      is_public: formData.get("is_public") === "true",
      updated_at: new Date().toISOString(),
    };

    console.log("Ready to save agent profile to Supabase:", profilePayload);

    profileMessage.textContent =
      "Profile prepared. Supabase database and Storage will save this public profile next.";
    profileMessage.classList.remove("error");
    profileMessage.classList.add("success");
  });
}

async function loadAgentsForBroker() {
  const agentsGrid = document.getElementById("agentsGrid");

  if (!agentsGrid || !hasSupabase()) {
    return;
  }

  const { data, error } = await supabaseClient
    .from("portal_users")
    .select("id, full_name, email, role, account_status, is_permanent_admin, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Could not load agents:", error);
    return;
  }

  agentsGrid.innerHTML = "";

  data.forEach((agent) => {
    const initials = agent.full_name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const isActive = agent.account_status === "active";
    const isAdmin = agent.is_permanent_admin === true;

    const card = document.createElement("article");
    card.className = "mini-agent-card";
    card.dataset.agentId = agent.id;
    card.dataset.agentRole = agent.role;
    card.dataset.publicProfile = isActive ? "true" : "false";

    card.innerHTML = `
      <div class="mini-avatar">${initials}</div>
      <h3>${agent.full_name}</h3>
      <p>${agent.role === "broker" ? "Broker of Record" : "Agent Account"}</p>
      <span class="status ${isActive ? "active" : "pending"}">
        ${isActive ? "Active" : "Inactive"}
      </span>

      <div class="agent-secure-info">
        <span>Email</span>
        <strong>${agent.email}</strong>
      </div>

      <div class="agent-secure-info">
        <span>Public Profile</span>
        <strong>${isActive ? "Visible" : "Hidden"}</strong>
      </div>

      ${
        isAdmin
          ? `<button class="danger-btn" type="button" disabled title="Jag Saini's admin account cannot be deleted">
              Permanent Admin Account
            </button>`
          : `<button class="danger-btn" type="button" data-deactivate-agent="${agent.id}">
              Delete Profile
            </button>`
      }
    `;

    agentsGrid.appendChild(card);
  });
}

function setupDeactivateAgentButtons() {
  const agentsGrid = document.getElementById("agentsGrid");

  if (!agentsGrid) {
    return;
  }

  loadAgentsForBroker();

  agentsGrid.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-deactivate-agent]");

    if (!button) {
      return;
    }

    const session = getSession();
    const agentId = button.dataset.deactivateAgent;

    if (!session || session.role !== "broker") {
      alert("Only Jag Saini can delete agent profiles.");
      return;
    }

    const confirmed = confirm(
      "Are you sure you want to delete this agent profile? This will disable portal access and remove the agent from the public website later."
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabaseClient.rpc("disable_agent", {
      agent_portal_user_id: agentId,
    });

    if (error) {
      alert(error.message);
      console.error("Disable agent error:", error);
      return;
    }

    alert("Agent profile deleted/disabled successfully.");
    await loadAgentsForBroker();
  });
}

async function loadAgentApprovals() {
  if (!agentApprovalsTableBody || !hasSupabase()) {
    return;
  }

  const { data, error } = await supabaseClient
    .from("access_requests")
    .select("id, full_name, email, phone, license_number, status, requested_auth_user_id, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load agent approvals:", error);
    return;
  }

  const emptyRow = agentApprovalsEmptyState;
  agentApprovalsTableBody.innerHTML = "";

  if (!data.length) {
    if (emptyRow) {
      agentApprovalsTableBody.appendChild(emptyRow);
      emptyRow.hidden = false;
    }

    return;
  }

  data.forEach((request) => {
    const row = document.createElement("tr");
    row.dataset.requestId = request.id;
    row.dataset.authUserId = request.requested_auth_user_id || "";

    const date = request.created_at
      ? new Date(request.created_at).toLocaleDateString()
      : "Pending";

    row.innerHTML = `
      <td>${request.full_name}</td>
      <td>${request.email}</td>
      <td>${request.phone || "Not provided"}</td>
      <td>${request.license_number || "Not provided"}</td>
      <td>${date}</td>
      <td><span class="status pending">Pending</span></td>
      <td>
        <div class="table-actions">
          <button class="small-btn approve" type="button" data-approve-agent="${request.id}">
            Approve
          </button>
          <button class="small-btn reject" type="button" data-reject-agent="${request.id}">
            Reject
          </button>
        </div>
      </td>
    `;

    agentApprovalsTableBody.appendChild(row);
  });
}

function setupAgentApprovalActions() {
  if (!agentApprovalsTableBody) {
    return;
  }

  loadAgentApprovals();

  agentApprovalsTableBody.addEventListener("click", async (event) => {
    const approveButton = event.target.closest("[data-approve-agent]");
    const rejectButton = event.target.closest("[data-reject-agent]");

    if (!approveButton && !rejectButton) {
      return;
    }

    const session = getSession();

    if (!session || session.role !== "broker") {
      alert("Only Jag Saini can manage agent approvals.");
      return;
    }

    const row = event.target.closest("tr");
    const requestId = approveButton
      ? approveButton.dataset.approveAgent
      : rejectButton.dataset.rejectAgent;

    const requestedAuthUserId = row?.dataset.authUserId || null;
    const action = approveButton ? "approved" : "rejected";

    const confirmed = confirm(
      action === "approved"
        ? "Approve this agent request and allow portal access?"
        : "Reject this agent request?"
    );

    if (!confirmed) {
      return;
    }

    if (action === "approved") {
      const { error } = await supabaseClient.rpc("approve_access_request", {
        request_id: requestId,
        agent_auth_user_id: requestedAuthUserId,
      });

      if (error) {
        alert(error.message);
        console.error("Approval error:", error);
        return;
      }

      alert("Agent approved. They can now log into the portal.");
    }

    if (action === "rejected") {
      const { error } = await supabaseClient.rpc("reject_access_request", {
        request_id: requestId,
      });

      if (error) {
        alert(error.message);
        console.error("Rejection error:", error);
        return;
      }

      alert("Agent request rejected.");
    }

    await loadAgentApprovals();
  });
}

function setupNewConstructionTools() {
  if (addProjectBtn && projectFormCard) {
    addProjectBtn.addEventListener("click", () => {
      projectFormCard.hidden = false;
      projectFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (cancelProjectBtn && projectFormCard) {
    cancelProjectBtn.addEventListener("click", () => {
      projectFormCard.hidden = true;
    });
  }

  if (resetProjectBtn && newConstructionForm) {
    resetProjectBtn.addEventListener("click", () => {
      newConstructionForm.reset();
    });
  }

  if (newConstructionForm) {
    newConstructionForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const session = getSession();
      const formData = new FormData(newConstructionForm);
      const projectPayload = {
        project_name: formData.get("project_name")?.trim(),
        location: formData.get("location")?.trim(),
        starting_price: formData.get("starting_price")?.trim(),
        status: formData.get("status"),
        description: formData.get("description")?.trim(),
        is_public: formData.get("is_public") === "true",
        created_by: session?.email,
        updated_at: new Date().toISOString(),
      };

      console.log("Ready to save new construction project to Supabase:", projectPayload);

      if (projectMessage) {
        projectMessage.textContent =
          "Project prepared. Supabase database and Storage will save this listing next.";
        projectMessage.classList.remove("error");
        projectMessage.classList.add("success");
      }
    });
  }

  document.querySelectorAll("[data-edit-project]").forEach((button) => {
    button.addEventListener("click", () => {
      console.log("Ready to load project for editing from Supabase:", button.dataset.editProject);
      alert("Edit project action is ready for Supabase.");
    });
  });

  document.querySelectorAll("[data-delete-project]").forEach((button) => {
    button.addEventListener("click", () => {
      const confirmed = confirm(
        "Delete this new construction project? Once Supabase is connected, this will remove it from the public website."
      );

      if (!confirmed) {
        return;
      }

      console.log("Ready to delete project from Supabase:", button.dataset.deleteProject);
      alert("Delete project action is ready for Supabase.");
    });
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

async function initPortal() {
  await protectPage();
  setupLogin();
  setupForgotPasswordModal();
  setupRequestAccess();
  setupMobileMenu();
  setupLogoutButtons();
  setupPasswordToggles();
  setupProfileForm();
  setupDeactivateAgentButtons();
  setupAgentApprovalActions();
  setupNewConstructionTools();
  setupSettingsPage();
}

initPortal();