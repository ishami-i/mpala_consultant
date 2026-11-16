import { useEffect, useState, useCallback } from "react";
import AdminGallery from "./adminGallery";
import AdminStats from "./adminStats";
import "./admin.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const STATUSES = ["new", "reviewing", "contacted", "closed"];

const money = (n) => `${Number(n).toLocaleString()} RWF`;
const day = (iso) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
// #gallery = photos, #projects or #project-12 = projects, anything else = the overview
const viewFromHash = () => {
  const h = window.location.hash;
  if (h === "#gallery") return "gallery";
  if (h === "#projects" || h.startsWith("#project-")) return "projects";
  return "overview";
};

// Read a JSON answer; a crashed server sends an HTML page, which gets a clear message instead of a parse error
async function readJson(res) {
  try {
    return await res.json();
  } catch {
    throw new Error(`The server sent an unexpected answer (error ${res.status}). The API may have a problem: see its log.`);
  }
}
const idFromHash = () => {
  const m = window.location.hash.match(/^#project-(\d+)$/);
  return m ? Number(m[1]) : null;
};

function useToken() {
  const [token, setToken] = useState(() => {
    try { return sessionStorage.getItem("mpala_token"); } catch { return null; }
  });
  const save = (t) => {
    setToken(t);
    try { t ? sessionStorage.setItem("mpala_token", t) : sessionStorage.removeItem("mpala_token"); } catch { /* ignore */ }
  };
  return [token, save];
}

function Login({ onToken }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Could not sign in");
      onToken(data.access_token);
    } catch {
      setError("Cannot reach the server. Check that the backend is running.");
    }
  };

  return (
    <main className="adm-login">
      <form onSubmit={submit}>
        <h1>Mpala dashboard</h1>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}

function Detail({ id, token, onStatus, onDeleted, onAuthFail }) {
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setProject(null);
    setError("");
    fetch(`${API}/admin/projects/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (r.status === 401 || r.status === 422) return onAuthFail();
        const d = await readJson(r);
        if (!r.ok) throw new Error(d.error || "Could not load project");
        if (live) setProject(d);
      })
      .catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [id, token, onAuthFail]);

  const changeStatus = async (status) => {
    const res = await fetch(`${API}/admin/projects/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setProject((p) => ({ ...p, status }));
      onStatus(id, status);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete the project from ${project.owner_name}? This cannot be undone.`)) return;
    setError("");
    try {
      const res = await fetch(`${API}/admin/projects/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401 || res.status === 422) return onAuthFail();
      if (!res.ok) {
        let d = {};
        try { d = await res.json(); } catch { /* not JSON */ }
        return setError(d.error || `The project could not be deleted (error ${res.status}).`);
      }
      onDeleted(id);
    } catch {
      setError("Cannot reach the server. Check that the backend is running.");
    }
  };

  if (error && !project) return <p className="adm-error" role="alert">{error}</p>;
  if (!project) return <p className="adm-muted">Loading project…</p>;

  return (
    <article className="adm-detail">
      <header>
        <h2>{project.owner_name}</h2>
        <p className="adm-budget">{money(project.budget)}</p>
      </header>

      <label className="adm-status">
        Status
        <select value={project.status} onChange={(e) => changeStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>

      <dl>
        <dt>Service</dt><dd>{project.service_label || "Not specified"}{project.paid_service && " (paid service)"}</dd>
        <dt>Email</dt><dd><a href={`mailto:${project.email}`}>{project.email}</a></dd>
        <dt>Phone</dt><dd><a href={`tel:${project.phone}`}>{project.phone}</a></dd>
        <dt>UPI</dt><dd>{project.upi}</dd>
        <dt>Location</dt><dd>{project.location}</dd>
        <dt>Received</dt><dd>{day(project.created_at)}</dd>
      </dl>

      <h3>Project details</h3>
      <p className="adm-body">{project.project_details}</p>

      {error && <p className="adm-error" role="alert">{error}</p>}
      <button type="button" className="adm-danger adm-delete" onClick={remove}>Delete this project</button>
    </article>
  );
}

export default function Admin() {
  const [token, setToken] = useToken();
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(idFromHash());
  const [view, setView] = useState(viewFromHash());
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  const signOut = useCallback(() => setToken(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onHash = () => { setSelected(idFromHash()); setView(viewFromHash()); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/admin/projects`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (r.status === 401 || r.status === 422) return signOut();
        const d = await readJson(r);
        if (!r.ok) throw new Error(r.status === 403 ? "This account is not an admin." : d.error);
        setProjects(d);
      })
      .catch((e) => setError(e.message));
  }, [token, signOut]);

  if (!token) return <Login onToken={setToken} />;

  const shown = projects.filter((p) => filter === "all" || p.status === filter);
  const removeProject = (id) => {
    setProjects((ps) => ps.filter((p) => p.project_id !== id));
    window.location.hash = "#projects";
  };
  const updateStatus = (id, status) =>
    setProjects((ps) => ps.map((p) => (p.project_id === id ? { ...p, status } : p)));

  return (
    <div className="adm">
      <header className="adm-top">
        <h1>Dashboard</h1>
        <nav className="adm-tabs" aria-label="Sections">
          <a href="#overview" aria-current={view === "overview" ? "page" : undefined}>Overview</a>
          <a href="#projects" aria-current={view === "projects" ? "page" : undefined}>Projects</a>
          <a href="#gallery" aria-current={view === "gallery" ? "page" : undefined}>Gallery</a>
        </nav>
        {view === "projects" && (
          <select aria-label="Filter by status" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        )}
        <button className="adm-link" onClick={signOut}>Sign out</button>
      </header>

      {error && <p className="adm-error" role="alert">{error}</p>}

      {view === "gallery" ? (
        <AdminGallery token={token} onAuthFail={signOut} />
      ) : view === "overview" ? (
        <AdminStats token={token} onAuthFail={signOut} />
      ) : (
        <div className="adm-grid">
          <ul className="adm-list">
            {shown.length === 0 && !error && <li className="adm-muted">No projects here yet.</li>}
            {shown.map((p) => (
              <li key={p.project_id}>
                <a
                  href={`#project-${p.project_id}`}
                  aria-current={selected === p.project_id ? "true" : undefined}
                >
                  <span className="adm-name">{p.owner_name}</span>
                  <span className="adm-meta">{p.service_label ? p.service_label + " · " : ""}{money(p.budget)} · {p.location}</span>
                  <span className={`adm-pill s-${p.status}`}>{p.status}</span>
                </a>
              </li>
            ))}
          </ul>

          <section className="adm-pane">
            {selected
              ? <Detail id={selected} token={token} onStatus={updateStatus} onDeleted={removeProject} onAuthFail={signOut} />
              : <p className="adm-muted">Choose a project to see everything the client sent.</p>}
          </section>
        </div>
      )}
    </div>
  );
}
