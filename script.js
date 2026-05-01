
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

  requestAccessForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(requestAccessForm);
    const requestPayload = {
      full_name: formData.get("full_name")?.trim(),
      email: formData.get("email")?.trim().toLowerCase(),
      phone: formData.get("phone")?.trim(),
      license_number: formData.get("license_number")?.trim(),
      role: formData.get("role") || "agent",
      status: formData.get("status") || "pending",
      is_public: formData.get("is_public") === "true",
      requested_at: new Date().toISOString(),
    };

    const password = formData.get("password") || "";

    if (password.length < 8) {
      requestMessage.textContent = "Password must be at least 8 characters.";
      requestMessage.classList.add("error");
      requestMessage.classList.remove("success");
      return;
    }

    console.log("Ready to submit access request to Supabase:", requestPayload);

    requestMessage.textContent =
      "Access request prepared. Supabase will save this as a pending request for broker approval.";
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

function setupDeactivateAgentButtons() {
  const deactivateButtons = document.querySelectorAll("[data-deactivate-agent]");

  if (!deactivateButtons.length) {
    return;
  }

  deactivateButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const session = getSession();
      const agentId = button.dataset.deactivateAgent;
      const agentCard = button.closest("[data-agent-id]");

      if (!session || session.role !== "broker") {
        alert("Only the Broker of Record can delete agent profiles.");
        return;
      }

      const confirmed = confirm(
        "Are you sure you want to delete this agent profile? Once Supabase is connected, this will disable their portal access and remove them from the public website."
      );

      if (!confirmed) {
        return;
      }

      const deactivatePayload = {
        agent_id: agentId,
        account_status: "disabled",
        profile_status: "inactive",
        is_public: false,
        deactivated_by: session.email,
        deactivated_at: new Date().toISOString(),
      };

      console.log("Ready to deactivate agent in Supabase:", deactivatePayload);

      if (agentCard) {
        agentCard.dataset.publicProfile = "false";
        const statusBadge = agentCard.querySelector(".status");
        const publicStatus = agentCard.querySelector(".agent-secure-info:last-of-type strong");

        if (statusBadge) {
          statusBadge.textContent = "Inactive";
          statusBadge.classList.remove("active");
          statusBadge.classList.add("pending");
        }

        if (publicStatus) {
          publicStatus.textContent = "Hidden";
        }
      }

      alert(
        "Delete profile action is ready. Supabase will deactivate this account and remove it from the public website next."
      );
    });
  });
}

function setupAgentApprovalActions() {
  if (!agentApprovalsTableBody) {
    return;
  }

  agentApprovalsTableBody.addEventListener("click", (event) => {
    const approveButton = event.target.closest("[data-approve-agent]");
    const rejectButton = event.target.closest("[data-reject-agent]");

    if (!approveButton && !rejectButton) {
      return;
    }

    const session = getSession();

    if (!session || session.role !== "broker") {
      alert("Only the Broker of Record can manage agent approvals.");
      return;
    }

    const action = approveButton ? "approved" : "rejected";
    const requestId = approveButton
      ? approveButton.dataset.approveAgent
      : rejectButton.dataset.rejectAgent;

    const confirmed = confirm(
      action === "approved"
        ? "Approve this agent request and allow portal access?"
        : "Reject this agent request?"
    );

    if (!confirmed) {
      return;
    }

    const approvalPayload = {
      request_id: requestId,
      status: action,
      approved_by: action === "approved" ? session.email : null,
      rejected_by: action === "rejected" ? session.email : null,
      reviewed_at: new Date().toISOString(),
      is_public: action === "approved",
      account_status: action === "approved" ? "active" : "rejected",
    };

    console.log("Ready to update agent request in Supabase:", approvalPayload);

    const row = event.target.closest("tr");

    if (row) {
      row.remove();
    }

    const hasPendingRows = agentApprovalsTableBody.querySelector("tr[data-request-id]");

    if (!hasPendingRows && agentApprovalsEmptyState) {
      agentApprovalsEmptyState.hidden = false;
    }

    alert(
      action === "approved"
        ? "Approval action is ready. Supabase will activate this agent and publish their profile next."
        : "Rejection action is ready. Supabase will keep this request rejected and block access next."
    );
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