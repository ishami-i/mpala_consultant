import { company } from "../data/company";

export default function Footer() {
  return (
    <footer className="site-footer">
      <p>© {new Date().getFullYear()} {company.name} · TIN {company.tin}</p>
    </footer>
  );
}
