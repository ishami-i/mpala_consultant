import { useEffect, useState } from "react";
import { company } from "../data/company";

export default function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="site-header">
      <a className="brand" href="/">
        <img src={company.logo} alt="" width="36" height="36" />
        <span>{company.name}</span>
      </a>

      <button
        className="menu-btn"
        aria-expanded={open}
        aria-controls="main-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen(!open)}
      >
        <span /><span /><span />
      </button>

      <nav id="main-nav" aria-label="Main" data-open={open} onClick={() => setOpen(false)}>
        <a href="/#about">About</a>
        <a href="/#services">Services</a>
        <a href="/#experience">Experience</a>
        <a href="/gallery">Gallery</a>
        <a className="nav-cta" href="/#contact">Submit a project</a>
      </nav>
    </header>
  );
}
