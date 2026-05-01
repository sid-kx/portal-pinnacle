
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

let cachedPortalUser = null;
let cachedAgentProfile = null;
let cachedAuthUser = null;
let portalUserPromise = null;
let agentProfilePromise = null;

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

// Helper to get the current portal user, using Supabase if available, otherwise falling back to local session
async function getCurrentPortalUser() {
  if (cachedPortalUser) {
    return cachedPortalUser;
  }

  if (portalUserPromise) {
    return portalUserPromise;
  }

  if (!hasSupabase()) {
    cachedPortalUser = getSession();
    return cachedPortalUser;
  }

  portalUserPromise = (async () => {
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !authData.user) {
      return null;
    }

    cachedAuthUser = authData.user;
    cachedPortalUser = await getPortalUserByAuthId(authData.user.id);
    return cachedPortalUser;
  })();

  return portalUserPromise;
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

  cachedAuthUser = authData.user;
  const portalUser = await getPortalUserByAuthId(authData.user.id);
  cachedPortalUser = portalUser;
  portalUserPromise = Promise.resolve(portalUser);

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

function updateProfileImagePreview(imageUrl, fullName = "Agent") {
  if (!imageUrl) {
    return;
  }

  const avatarTargets = document.querySelectorAll(
    "[data-agent-avatar], .profile-pill .profile-avatar, .upload-preview, .agent-photo-preview"
  );

  if (!avatarTargets.length) {
    return;
  }

  const altText = `${fullName} profile photo`;

  avatarTargets.forEach((avatar) => {
    avatar.innerHTML = `<img src="${imageUrl}" alt="${altText}" loading="lazy" decoding="async" />`;
    avatar.classList.add("has-image");
    avatar.hidden = false;
  });
}

async function setupAgentIdentityUI() {
  const requiredRole = document.body.dataset.protected;

  if (requiredRole !== "agent") {
    return;
  }

  const portalUser = await getCurrentPortalUser();

  if (!portalUser) {
    return;
  }

  const profile = await getCurrentAgentProfile();

  const displayName = profile?.full_name || portalUser.full_name || portalUser.name || "Agent";
  const displayBio = profile?.bio || "Complete your profile to preview how your public information will appear.";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AG";

  document.querySelectorAll("[data-agent-name]").forEach((target) => {
    target.textContent = displayName;
  });

  const previewBio = document.querySelector("[data-agent-preview-bio]");
  if (previewBio) {
    previewBio.textContent = displayBio.length > 170 ? `${displayBio.slice(0, 170)}...` : displayBio;
  }

  const avatarTargets = document.querySelectorAll(
    "[data-agent-avatar], .profile-pill .profile-avatar, .upload-preview, .agent-photo-preview"
  );

  avatarTargets.forEach((avatar) => {
    if (profile?.profile_image_url) {
      avatar.innerHTML = `<img src="${profile.profile_image_url}" alt="${displayName} profile photo" loading="lazy" decoding="async" />`;
      avatar.classList.add("has-image");
    } else {
      avatar.textContent = initials;
      avatar.classList.remove("has-image");
    }
  });
}

// Loads the agent profile from Supabase and populates the form fields
async function getCurrentAgentProfile() {
  if (cachedAgentProfile) {
    return cachedAgentProfile;
  }

  if (agentProfilePromise) {
    return agentProfilePromise;
  }

  const portalUser = await getCurrentPortalUser();

  if (!portalUser || !hasSupabase()) {
    return null;
  }

  agentProfilePromise = (async () => {
    const { data, error } = await supabaseClient
      .from("agent_profiles")
      .select("full_name, email, direct_phone, office_phone, bio, profile_image_url, instagram_url, facebook_url, linkedin_url, twitter_url, youtube_url, profile_status, is_public")
      .eq("auth_user_id", portalUser.auth_user_id)
      .maybeSingle();

    if (error) {
      console.error("Could not load agent profile:", error);
      return null;
    }

    cachedAgentProfile = data;
    return cachedAgentProfile;
  })();

  return agentProfilePromise;
}

// Loads the agent profile from Supabase and populates the form fields
async function loadAgentProfile() {
  if (!profileForm || !hasSupabase()) {
    return;
  }

  const portalUser = await getCurrentPortalUser();

  if (!portalUser) {
    return;
  }
  const data = await getCurrentAgentProfile();

  const setValue = (selector, value) => {
    const field = profileForm.querySelector(selector);
    if (field) {
      field.value = value || "";
    }
  };

  setValue('[name="full_name"]', data?.full_name || portalUser.full_name || portalUser.name);
  setValue('[name="email"]', data?.email || portalUser.email);
  setValue('[name="direct_phone"]', data?.direct_phone);
  setValue('[name="office_phone"]', data?.office_phone || "(905) 609-7653");
  setValue('[name="bio"]', data?.bio);
  setValue('[name="instagram_url"]', data?.instagram_url);
  setValue('[name="facebook_url"]', data?.facebook_url);
  setValue('[name="linkedin_url"]', data?.linkedin_url);
  setValue('[name="twitter_url"]', data?.twitter_url);
  setValue('[name="youtube_url"]', data?.youtube_url);
  setValue('[name="profile_status"]', data?.profile_status || "active");

  const publicStatus = profileForm.querySelector('[name="is_public"]');
  if (publicStatus) {
    publicStatus.value = String(data?.is_public ?? true);
  }

  if (data?.profile_image_url) {
    updateProfileImagePreview(data.profile_image_url, data.full_name || portalUser.full_name || "Agent");
  } else {
    await setupAgentIdentityUI();
  }
}

async function uploadAgentProfileImage(portalUser) {
  const imageInput =
    profileForm.querySelector('[name="profile_image"]') ||
    profileForm.querySelector('[name="profileImage"]') ||
    profileForm.querySelector('#profileImage') ||
    profileForm.querySelector('#profile_image');

  const imageFile = imageInput?.files?.[0];

  if (!imageFile) {
    return null;
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(imageFile.type)) {
    throw new Error("Profile image must be a JPG, PNG, or WEBP file.");
  }

  const maxSize = 5 * 1024 * 1024;

  if (imageFile.size > maxSize) {
    throw new Error("Profile image must be smaller than 5 MB.");
  }

  const extension = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
  const filePath = `${portalUser.auth_user_id}/profile-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("agent-profile-images")
    .upload(filePath, imageFile, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabaseClient.storage
    .from("agent-profile-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

function setupProfileForm() {
  if (!profileForm) {
    return;
  }

  loadAgentProfile();

  const imageInput =
    profileForm.querySelector('[name="profile_image"]') ||
    profileForm.querySelector('[name="profileImage"]') ||
    profileForm.querySelector('#profileImage') ||
    profileForm.querySelector('#profile_image');

  if (imageInput) {
    imageInput.addEventListener("change", () => {
      const selectedImage = imageInput.files?.[0];
      if (!selectedImage) {
        return;
      }

      const localPreviewUrl = URL.createObjectURL(selectedImage);
      const currentName = profileForm.querySelector('[name="full_name"]')?.value?.trim() || "Agent";
      updateProfileImagePreview(localPreviewUrl, currentName);
    });
  }

  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!hasSupabase()) {
      profileMessage.textContent = "Supabase is not connected.";
      profileMessage.classList.add("error");
      profileMessage.classList.remove("success");
      return;
    }

    const portalUser = await getCurrentPortalUser();

    if (!portalUser) {
      profileMessage.textContent = "Your portal session could not be found. Please log in again.";
      profileMessage.classList.add("error");
      profileMessage.classList.remove("success");
      return;
    }

    const formData = new FormData(profileForm);
    const fullName = formData.get("full_name")?.trim();
    const email = formData.get("email")?.trim().toLowerCase();
    const bio = formData.get("bio")?.trim();

    if (!fullName || !email) {
      profileMessage.textContent = "Name and email are required.";
      profileMessage.classList.add("error");
      profileMessage.classList.remove("success");
      return;
    }

    const profilePayload = {
      portal_user_id: portalUser.id,
      auth_user_id: portalUser.auth_user_id,
      full_name: fullName,
      email,
      direct_phone: formData.get("direct_phone")?.trim() || null,
      office_phone: formData.get("office_phone")?.trim() || "(905) 609-7653",
      bio: bio || null,
      instagram_url: formData.get("instagram_url")?.trim() || null,
      facebook_url: formData.get("facebook_url")?.trim() || null,
      linkedin_url: formData.get("linkedin_url")?.trim() || null,
      twitter_url: formData.get("twitter_url")?.trim() || null,
      youtube_url: formData.get("youtube_url")?.trim() || null,
      profile_status: formData.get("profile_status") || "active",
      is_public: formData.get("is_public") === "true",
      updated_at: new Date().toISOString(),
    };

    profileMessage.textContent = "Saving profile...";
    profileMessage.classList.remove("error", "success");

    let profileImageUrl = null;

    try {
      profileImageUrl = await uploadAgentProfileImage(portalUser);
    } catch (imageError) {
      profileMessage.textContent = imageError.message || "Profile image upload failed.";
      profileMessage.classList.add("error");
      profileMessage.classList.remove("success");
      console.error("Profile image upload error:", imageError);
      return;
    }

    if (profileImageUrl) {
      profilePayload.profile_image_url = profileImageUrl;
    }

    const { error } = await supabaseClient
      .from("agent_profiles")
      .upsert(profilePayload, { onConflict: "auth_user_id" });

    if (error) {
      profileMessage.textContent = error.message;
      profileMessage.classList.add("error");
      profileMessage.classList.remove("success");
      console.error("Profile save error:", error);
      return;
    }

    profileMessage.textContent = bio
      ? "Profile saved. This profile can appear on the agents page."
      : "Profile saved. Add a bio before this profile appears on the public agents page.";
    profileMessage.classList.remove("error");
    profileMessage.classList.add("success");

    cachedAgentProfile = {
      ...(cachedAgentProfile || {}),
      ...profilePayload,
      profile_image_url: profileImageUrl || cachedAgentProfile?.profile_image_url,
    };
    agentProfilePromise = Promise.resolve(cachedAgentProfile);

    if (profileImageUrl) {
      updateProfileImagePreview(profileImageUrl, fullName);
    }

    document.querySelectorAll("[data-agent-name]").forEach((target) => {
      target.textContent = fullName;
    });

    const previewBio = document.querySelector("[data-agent-preview-bio]");
    if (previewBio) {
      previewBio.textContent = bio
        ? bio.length > 170
          ? `${bio.slice(0, 170)}...`
          : bio
        : "Complete your profile to preview how your public information will appear.";
    }
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
    .eq("account_status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Could not load agents:", error);
    return;
  }

  agentsGrid.innerHTML = "";

  const fragment = document.createDocumentFragment();

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

    fragment.appendChild(card);
  });

  agentsGrid.appendChild(fragment);
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

  const fragment = document.createDocumentFragment();

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

    fragment.appendChild(row);
  });

  agentApprovalsTableBody.appendChild(fragment);
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
  await setupAgentIdentityUI();
  setupProfileForm();
  setupDeactivateAgentButtons();
  setupAgentApprovalActions();
  setupNewConstructionTools();
  setupSettingsPage();
}

initPortal();