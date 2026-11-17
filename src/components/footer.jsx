import { company } from "../data/company";
import { contact } from "../data/contact";

export default function Footer() {
  return (
    <footer className="site-footer">
      <nav className="footer-links" aria-label="Footer">
        <a href="/#about">About</a>
        <a href="/#services">Services</a>
        <a href="/gallery">Gallery</a>
        <a href="/#contact">Contact</a>
        {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
      </nav>
      <p>
        <a href={company.mapsUrl} target="_blank" rel="noreferrer">{company.address}, Rwanda</a>
      </p>
      <p>© {new Date().getFullYear()} {company.name} · TIN {company.tin}</p>
    </footer>
  );
}
