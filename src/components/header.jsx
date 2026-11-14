export default function Header() {
  return (
    <header className="site-header">
      <a className="brand" href="/">Mpala Consultant</a>
      <nav aria-label="Main">
        <a href="/#about">About</a>
        <a href="/#services">Services</a>
        <a href="/#experience">Experience</a>
        <a href="/gallery">Gallery</a>
        <a className="nav-cta" href="/#contact">Submit a project</a>
      </nav>
    </header>
  );
}
