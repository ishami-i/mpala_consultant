const SERVICES = [
  ["Construction of infrastructure", "Roads, drainage, water and other infrastructure works, built to plan and to standard."],
  ["Architectural study", "Design studies for buildings and sites, from the first concept to drawings you can build from."],
  ["General consultancy", "Practical advice on planning, costing and delivering your project."],
  ["General supply", "Supply of materials and goods your project needs."],
  ["Land services", "Help with land matters on your plot, from the first check to the paperwork."],
  ["Topography", "Topographic work that shows the true shape of your land before you design or build."],
  ["Land sale and purchase brokerage", "We bring buyers and sellers together and guide both sides through the deal."],
];

export default function Services() {
  return (
    <section id="services" className="band alt">
      <div className="wrap">
        <h2>Our services</h2>
        <p className="lede">Everything a project needs, from the land to the finished building, under one team.</p>
        <ol className="services-list">
          {SERVICES.map(([title, text], i) => (
            <li key={title}>
              <span className="num">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
