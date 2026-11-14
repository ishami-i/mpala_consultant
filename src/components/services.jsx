import { useEffect, useState } from "react";
import { getCategories } from "../api/gallery";

// slug matches a gallery in backend/config.py (GALLERY_CATEGORIES)
const SERVICES = [
  ["construction", "Construction of infrastructure", "Roads, drainage, water and other infrastructure works, built to plan and to standard."],
  ["architecture", "Architectural study", "Design studies for buildings and sites, from the first concept to drawings you can build from."],
  ["consultancy", "General consultancy", "Practical advice on planning, costing and delivering your project."],
  ["supply", "General supply", "Supply of materials and goods your project needs."],
  ["land", "Land services", "Help with land matters on your plot, from the first check to the paperwork."],
  ["topography", "Topography", "Topographic work that shows the true shape of your land before you design or build."],
  ["brokerage", "Land sale and purchase brokerage", "We bring buyers and sellers together and guide both sides through the deal."],
];

export default function Services() {
  const [counts, setCounts] = useState({});

  // A "View gallery" link appears only for services that already have photos
  useEffect(() => {
    getCategories()
      .then((d) => setCounts(Object.fromEntries(d.categories.map((c) => [c.slug, c.count]))))
      .catch(() => {});
  }, []);

  return (
    <section id="services" className="band alt">
      <div className="wrap">
        <h2>Our services</h2>
        <p className="lede">Everything a project needs, from the land to the finished building, under one team.</p>
        <ol className="services-list">
          {SERVICES.map(([slug, title, text], i) => (
            <li key={slug}>
              <span className="num">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
                {counts[slug] > 0 && (
                  <p className="service-gallery"><a href={`/gallery/${slug}`}>View gallery ({counts[slug]} {counts[slug] === 1 ? "photo" : "photos"})</a></p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
