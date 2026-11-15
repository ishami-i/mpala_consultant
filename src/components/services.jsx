import { useEffect, useState } from "react";
import { getCategories } from "../api/gallery";
import { SERVICES } from "../data/services";

const num = (i) => String(i + 1).padStart(2, "0");

export default function Services() {
  const [counts, setCounts] = useState({});

  // A "View gallery" link appears only for services that already have photos
  useEffect(() => {
    getCategories()
      .then((d) => setCounts(Object.fromEntries(d.categories.map((c) => [c.slug, c.count]))))
      .catch(() => {});
  }, []);

  const gallery = (s) =>
    counts[s.slug] > 0 && (
      <p className="service-gallery">
        <a href={`/gallery/${s.slug}`}>View gallery ({counts[s.slug]} {counts[s.slug] === 1 ? "photo" : "photos"})</a>
      </p>
    );

  const main = SERVICES.filter((s) => s.main);
  const others = SERVICES.filter((s) => !s.main);

  return (
    <section id="services" className="band alt">
      <div className="wrap">
        <h2>Our services</h2>
        <p className="lede">Architectural study and construction are our main business. We also support your project with land services and supply.</p>

        <div className="main-services">
          {main.map((s, i) => (
            <article key={s.slug}>
              <span className="num">{num(i)}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              {gallery(s)}
              <p className="service-gallery"><a href={`/?service=${s.slug}#contact`}>Request this service</a></p>
            </article>
          ))}
        </div>

        <h3 className="also">Also from us</h3>
        <ol className="services-list">
          {others.map((s, i) => (
            <li key={s.slug}>
              <span className="num">{num(i + main.length)}</span>
              <div>
                <h3>{s.title}{s.paid && <span className="paid-tag">Paid service</span>}</h3>
                <p>{s.text}</p>
                {gallery(s)}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
