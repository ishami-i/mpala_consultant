import { useEffect, useState } from "react";
import { API } from "../api/gallery";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STATUS_LABEL = { new: "New", reviewing: "Reviewing", contacted: "Contacted", closed: "Closed" };

function Bars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="adm-hbars">
      {rows.map((r) => (
        <li key={r.name}>
          <span className="adm-hbar-name">{r.name}{r.paid && <em> paid</em>}</span>
          <span className="adm-hbar-track" aria-hidden="true">
            <span className="adm-hbar-fill" style={{ width: `${(r.count / max) * 100}%` }} />
          </span>
          <strong className="adm-hbar-n">{r.count}</strong>
        </li>
      ))}
    </ul>
  );
}

export default function AdminStats({ token, onAuthFail }) {
  const [s, setS] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    fetch(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (r.status === 401 || r.status === 422) return onAuthFail();
        let d = {};
        try { d = await r.json(); } catch { /* not JSON */ }
        if (!r.ok) throw new Error(d.error || `The statistics could not be loaded (error ${r.status}).`);
        if (live) setS(d);
      })
      .catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [token, onAuthFail]);

  if (error) return <p className="adm-error" role="alert">{error}</p>;
  if (!s) return <p className="adm-muted">Loading the overview…</p>;

  const maxMonth = Math.max(1, ...s.by_month.map((m) => m.count));
  const growth =
    s.growth_percent !== null
      ? `${s.growth_percent > 0 ? "+" : ""}${s.growth_percent}% compared with the 30 days before`
      : s.last_30_days > 0
        ? "None in the 30 days before"
        : "No projects in the last 60 days";
  const provinces = s.by_province;
  const services = s.by_service;

  return (
    <div className="adm-stats">
      <div className="adm-cards">
        <div className="adm-card"><p>Projects in total</p><strong>{s.total}</strong></div>
        <div className="adm-card"><p>Last 30 days</p><strong>{s.last_30_days}</strong><small>{growth}</small></div>
        <div className="adm-card"><p>Still new</p><strong>{s.by_status.new}</strong><small>Not opened or answered yet</small></div>
        <div className="adm-card"><p>Paid services</p><strong>{s.paid_services}</strong><small>Topography, land survey and brokerage</small></div>
      </div>

      <section className="adm-panel">
        <h2>Projects per month</h2>
        <p className="adm-muted">
          This month: {s.this_month}. Last month: {s.last_month}.
        </p>
        <div
          className="adm-months"
          role="img"
          aria-label={`Projects per month: ${s.by_month.map((m) => `${MONTHS[m.number - 1]} ${m.year}: ${m.count}`).join(", ")}`}
        >
          {s.by_month.map((m) => (
            <div className="adm-month" key={m.month}>
              <span className="adm-month-n">{m.count}</span>
              <span className="adm-month-wrap">
                <span className="adm-month-bar" style={{ height: `${(m.count / maxMonth) * 100}%` }} />
              </span>
              <span className="adm-month-l">{MONTHS[m.number - 1]}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="adm-two">
        <section className="adm-panel">
          <h2>Projects per province</h2>
          <Bars rows={provinces} />
        </section>
        <section className="adm-panel">
          <h2>Projects per service</h2>
          <Bars rows={services} />
        </section>
      </div>

      <section className="adm-panel">
        <h2>Where projects stand</h2>
        <ul className="adm-status-list">
          {["new", "reviewing", "contacted", "closed"].map((k) => (
            <li key={k}><span className={`adm-pill s-${k}`}>{STATUS_LABEL[k]}</span><strong>{s.by_status[k] ?? 0}</strong></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
