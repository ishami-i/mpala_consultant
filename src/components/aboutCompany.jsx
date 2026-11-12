import { company } from "../data/company";

export default function AboutCompany() {
  return (
    <section id="about" className="band">
      <div className="wrap split">
        <div>
          <h2>About {company.name}</h2>
          <p>
            We are a consulting and construction company working with clients on land, design and building projects. Our team has more than two decades of experience in the business.
          </p>
          <p>
            We are a registered business, TIN <strong>{company.tin}</strong>.
          </p>
          <h3>Our mission</h3>
          <p>
            To give every client honest advice and solid work, so that their land and their projects turn into something they can rely on.
          </p>
        </div>
        <div>
          <h3>Our values</h3>
          <dl className="values">
            <dt>Integrity</dt><dd>We uphold the highest ethical standards in all our dealings.</dd>
            <dt>Experience</dt><dd>Our team has over 20 years in the business and knows what works.</dd>
            <dt>Collaboration</dt><dd>We listen first and work closely with every client.</dd>
            <dt>Excellence</dt><dd>We are committed to outstanding results on every project.</dd>
          </dl>
        </div>
      </div>
    </section>
  );
}
