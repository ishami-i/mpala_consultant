import { company } from "../data/company";
import { contact } from "../data/contact";

export default function Footer() {
  return (
    <footer className="site-footer">
      <p>
        <a href={company.mapsUrl} target="_blank" rel="noreferrer">{company.address}, Rwanda</a>
      </p>
      <p>© {new Date().getFullYear()} {company.name} · TIN {company.tin}</p>
    </footer>
  );
}
