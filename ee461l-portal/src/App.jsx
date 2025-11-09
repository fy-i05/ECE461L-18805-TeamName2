import React, { useMemo, useState, useEffect, Suspense } from "react";

// Lazy-load Projects view
const Projects = React.lazy(() => import("./Projects"));

// ---- simple auth api helpers ----
const API_BASE = "http://localhost:3001";

async function apiLogin(email, password) {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: email, password }),
  });
  if (!res.ok) throw new Error("Invalid email or password");
  const { user } = await res.json();
  return user; // { id, username }
}

async function apiMe() {
  const res = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
  if (!res.ok) return null;
  const { user } = await res.json();
  return user; // or null
}

async function apiLogout() {
  await fetch(`${API_BASE}/api/logout`, { method: "POST", credentials: "include" });
}

async function apiSignup(username, password) {
  const res = await fetch(`${API_BASE}/api/signup`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    let msg = "Signup failed";
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  const { user } = await res.json();
  return user; // { id, username }
}

/* ---------- storage helpers ---------- */
const LS_KEYS = {
  USERS: "ee461_users",
  PROJECTS: "ee461_projects",
  HW: "ee461_hw",
  CURRENT_USER: "ee461_current_user",
};

// default seed data
const DEFAULT_PROJECTS = [
  { id: "JK3002", name: "Example Project", description: "This is an example Project.", members: [] },
];

const DEFAULT_HW = {
  HWSET1: { capacity: 250, checkedOut: 20 },
  HWSET2: { capacity: 300, checkedOut: 70 },
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ---------- small UI atoms ---------- */
function Card({ children, className = "" }) {
  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 ${className}`}>
      {children}
    </div>
  );
}
function Label({ children }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>;
}
function Input(props) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 " +
        (props.className || "")
      }
    />
  );
}
function Button({ children, variant = "primary", ...rest }) {
  const base = "px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : variant === "secondary"
      ? "bg-gray-100 text-gray-900 hover:bg-gray-200"
      : "bg-transparent text-gray-700 hover:bg-gray-100";
  return (
    <button {...rest} className={`${base} ${styles} ${rest.className || ""}`}>
      {children}
    </button>
  );
}

/* ---------- Login ---------- */
function LoginView({ onLogin, onSignup }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">461 Portal</h1>
        <p className="text-center text-gray-500 mb-8">Sign in to continue</p>

        <div className="space-y-5">
          <div>
            <Label>Username</Label>
            <Input placeholder="Enter username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <Input placeholder="Enter password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <Button
            className="w-full"
            onClick={() => {
              if (!username || !password) {
                alert("Enter username and password");
                return;
              }
              onLogin({ username, password });
            }}
          >
            Sign In
          </Button>

          <div className="text-center text-sm text-gray-600">
            <span>Don’t have an account? </span>
            <button
              className="underline underline-offset-2 hover:text-gray-800"
              onClick={() => {
                if (!username || !password) {
                  alert("Enter username and password");
                  return;
                }
                onSignup(username, password);
              }}
            >
              Sign up
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Dashboard ---------- */
function DashboardView({ user, projects, onOpenProject, onCreateProject, onJoinById, onLogout, hw }) {
  const myProjects = useMemo(
    () => projects.filter((p) => p.members?.includes(user.username)),
    [projects, user.username]
  );

  const [selectedId, setSelectedId] = useState(myProjects[0]?.id || "");
  const [newProj, setNewProj] = useState({ name: "", id: "", description: "" });
  const [joinId, setJoinId] = useState("");

  useEffect(() => {
    // update selected if myProjects changes
    if (!myProjects.find((p) => p.id === selectedId)) {
      setSelectedId(myProjects[0]?.id || "");
    }
  }, [myProjects, selectedId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">461 Portal</h1>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-700">
              Welcome, <span className="font-semibold">{user?.username || "Name"}</span>
            </div>
            <Button variant="secondary" onClick={onLogout}>Log out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid gap-6 md:grid-cols-5">
        {/* Open existing project (only those user is a member of) */}
        <Card className="p-6 md:col-span-3">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Open Project</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label>Your Projects</Label>
              <select
                className="w-full rounded-xl border border-gray-200 px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {myProjects.length === 0 ? (
                  <option value="">No projects yet</option>
                ) : (
                  myProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.id}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={() => selectedId && onOpenProject(selectedId)} disabled={!selectedId}>
                Open Project
              </Button>
            </div>
          </div>
        </Card>

        {/* Hardware quick status (global) */}
        <Card className="p-6 md:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hardware Status</h2>
          <HWQuickStatus hw={hw} />
        </Card>

        {/* Join project by ID */}
        <Card className="p-6 md:col-span-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Join Existing Project</h2>
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Enter existing project ID"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              className="w-64"
            />
            <Button
              onClick={() => {
                if (!joinId) return alert("Please enter a Project ID");
                const ok = onJoinById(joinId);
                if (ok) {
                  setJoinId("");
                }
              }}
            >
              Join Project
            </Button>
          </div>
        </Card>

        {/* Create new project */}
        <Card className="p-6 md:col-span-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Project</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Project Name</Label>
              <Input value={newProj.name} onChange={(e) => setNewProj({ ...newProj, name: e.target.value })} placeholder="Enter project name" />
            </div>
            <div>
              <Label>Project ID</Label>
              <Input value={newProj.id} onChange={(e) => setNewProj({ ...newProj, id: e.target.value })} placeholder="Unique ID" />
            </div>
            <div className="md:col-span-3">
              <Label>Description</Label>
              <Input
                value={newProj.description}
                onChange={(e) => setNewProj({ ...newProj, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="md:col-span-3 flex gap-3">
              <Button
                onClick={() => {
                  if (!newProj.name || !newProj.id) return alert("Enter name and unique ID");
                  onCreateProject(newProj);
                  setNewProj({ name: "", id: "", description: "" });
                }}
              >
                Create Project
              </Button>
              <Button variant="secondary" onClick={() => setNewProj({ name: "", id: "", description: "" })}>
                Clear
              </Button>
            </div>
          </div>
        </Card>

        {/* Active Projects List (only user's) */}
        <Card className="p-6 md:col-span-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Projects</h2>
          <div className="bg-white rounded-xl p-4">
            <Suspense fallback={<div className="text-sm text-gray-600">Loading Projects…</div>}>
              <Projects projects={myProjects} />
            </Suspense>
          </div>
        </Card>
      </main>
    </div>
  );
}

function HWQuickStatus({ hw }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(hw).map(([k, v]) => {
        const available = v.capacity - v.checkedOut;
        const pct = Math.round((available / v.capacity) * 100);
        return (
          <div key={k} className="p-4 rounded-xl border border-gray-200 bg-white">
            <div className="text-sm text-gray-500">{k}</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {available} / {v.capacity}
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full mt-3">
              <div className="h-2 bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProjectView({ project, onBack, onLogout, user, onHWChange }) {
  // hydrate from localStorage each mount so it's always global/shared
  const [hwState, setHwState] = useState(() => loadJSON(LS_KEYS.HW, DEFAULT_HW));
  const [qty, setQty] = useState({ HWSET1: 0, HWSET2: 0 });

  const availability = useMemo(
    () => ({
      HWSET1: hwState.HWSET1.capacity - hwState.HWSET1.checkedOut,
      HWSET2: hwState.HWSET2.capacity - hwState.HWSET2.checkedOut,
    }),
    [hwState]
  );

  function adjust(type) {
    setHwState((prev) => {
      const next = { ...prev };
      for (const k of ["HWSET1", "HWSET2"]) {
        const change = qty[k] || 0;
        if (type === "checkout") {
          const can = Math.max(0, Math.min(change, prev[k].capacity - prev[k].checkedOut));
          next[k] = { ...prev[k], checkedOut: prev[k].checkedOut + can };
        } else {
          const can = Math.max(0, Math.min(change, prev[k].checkedOut));
          next[k] = { ...prev[k], checkedOut: prev[k].checkedOut - can };
        }
      }
      saveJSON(LS_KEYS.HW, next);
      onHWChange(next); // bubble up to refresh dashboard status
      return next;
    });
    setQty({ HWSET1: 0, HWSET2: 0 });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onBack}>
              ← Back
            </Button>
            <h1 className="text-xl font-bold text-gray-900">461 Portal</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-700">Signed in as <span className="font-semibold">{user.username}</span></div>
            <Button variant="secondary" onClick={onBack}>Exit Project</Button>
            <Button variant="secondary" onClick={onLogout}>Log out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid gap-6 md:grid-cols-5">
        <Card className="p-6 md:col-span-3">
          <h2 className="text-lg font-semibold text-gray-900">Project Info</h2>
          <p className="text-sm text-gray-600 mb-4">{project.name}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <div className="text-sm text-gray-500">ID</div>
              <div className="text-xl font-semibold text-gray-900 mt-1">{project.id}</div>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <div className="text-sm text-gray-500">Description</div>
              <div className="text-sm text-gray-900 mt-1">{project.description || "No description"}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 md:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hardware Summary</h2>
          <div className="space-y-4">
            {Object.keys(hwState).map((k) => {
              const s = hwState[k];
              const available = s.capacity - s.checkedOut;
              const pct = Math.round((available / s.capacity) * 100);
              return (
                <div key={k} className="p-4 rounded-xl border border-gray-200 bg-white">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-sm text-gray-500">{k}</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {available} / {s.capacity}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">{pct}% available</div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full mt-3">
                    <div className="h-2 bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6 md:col-span-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Request or Check in Hardware</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {Object.keys(hwState).map((k) => (
              <div key={k} className="md:col-span-2">
                <Label>
                  Units for {k} (available {availability[k]})
                </Label>
                <Input
                  inputMode="numeric"
                  value={qty[k] || 0}
                  onChange={(e) => {
                    const v = parseInt(e.target.value || "0", 10);
                    const clean = isNaN(v) ? 0 : Math.max(0, v);
                    setQty((prev) => ({ ...prev, [k]: clean }));
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => adjust("checkout")}>Request Hardware</Button>
            <Button variant="secondary" onClick={() => adjust("checkin")}>
              Check in Hardware
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}

/* ---------- Root ---------- */
export default function App() {
  // seed storage on first load
  useEffect(() => {
    if (!localStorage.getItem(LS_KEYS.PROJECTS)) saveJSON(LS_KEYS.PROJECTS, DEFAULT_PROJECTS);
    if (!localStorage.getItem(LS_KEYS.HW)) saveJSON(LS_KEYS.HW, DEFAULT_HW);
    if (!localStorage.getItem(LS_KEYS.USERS)) saveJSON(LS_KEYS.USERS, []); // start empty
  }, []);

  const [user, setUser] = useState(() => loadJSON(LS_KEYS.CURRENT_USER, null));
  const [projects, setProjects] = useState(() => loadJSON(LS_KEYS.PROJECTS, DEFAULT_PROJECTS));
  const [hw, setHW] = useState(() => loadJSON(LS_KEYS.HW, DEFAULT_HW));
  const [activeProjectId, setActiveProjectId] = useState(null);

  // persist on change
  useEffect(() => saveJSON(LS_KEYS.PROJECTS, projects), [projects]);
  useEffect(() => saveJSON(LS_KEYS.HW, hw), [hw]);
  useEffect(() => saveJSON(LS_KEYS.CURRENT_USER, user), [user]);

  const activeProject = useMemo(() => projects.find((p) => p.id === activeProjectId) || null, [projects, activeProjectId]);

  /* ----- auth handlers ----- */
  const handleSignup = (username, password) => {
    const users = loadJSON(LS_KEYS.USERS, []);
    if (users.find((u) => u.username === username)) {
      alert("Username already exists");
      return;
    }
    const nextUsers = [...users, { username, password }];
    saveJSON(LS_KEYS.USERS, nextUsers);
    setUser({ username });
    // optional: auto-join no projects
  };

  const handleLogin = ({ username, password }) => {
    const users = loadJSON(LS_KEYS.USERS, []);
    const match = users.find((u) => u.username === username && u.password === password);
    if (!match) {
      alert("Invalid username/password");
      return;
    }
    setUser({ username });
  };

  const handleLogout = () => {
    setUser(null);
    setActiveProjectId(null);
  };

  /* ----- project handlers ----- */
  const handleCreateProject = ({ id, name, description }) => {
    // enforce unique ID
    if (projects.some((p) => p.id === id)) {
      alert("Project ID already exists");
      return;
    }
    const newProject = { id, name, description, members: [user.username] };
    const next = [...projects, newProject];
    setProjects(next);
  };

  const handleJoinById = (joinId) => {
    const idx = projects.findIndex((p) => p.id === joinId);
    if (idx < 0) {
      alert("Project ID not found");
      return false;
    }
    const proj = projects[idx];
    // add membership if not present
    if (!proj.members?.includes(user.username)) {
      const updated = { ...proj, members: [...(proj.members || []), user.username] };
      const next = [...projects];
      next[idx] = updated;
      setProjects(next);
    }
    setActiveProjectId(joinId);
    alert(`Joined project ${proj.name} (${proj.id})`);
    return true;
  };

  const handleOpenProject = (id) => {
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;
    // authorization: must be a member
    if (!proj.members?.includes(user.username)) {
      alert("You are not a member of this project. Join by ID first.");
      return;
    }
    setActiveProjectId(id);
  };

  if (!user) {
    return <LoginView onLogin={handleLogin} onSignup={handleSignup} />;
  }

  if (activeProject && user) {
    return (
      <ProjectView
        project={activeProject}
        onBack={() => setActiveProjectId(null)}
        onLogout={handleLogout}
        user={user}
        onHWChange={(next) => setHW(next)}
      />
    );
  }

  return (
    <DashboardView
      user={user}
      projects={projects}
      hw={hw}
      onOpenProject={handleOpenProject}
      onCreateProject={handleCreateProject}
      onJoinById={handleJoinById}
      onLogout={handleLogout}
    />
  );
}