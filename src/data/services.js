// Order matters: the first two are our main business and get the most space on the home page.
// slug = the gallery and the service chosen in the project form (must match backend/config.py)
// paid = the client pays for this service; payment is arranged with our team, not on the website
export const SERVICES = [
  { slug: "architecture", title: "Architectural study", main: true,
    text: "Architectural design and study of your house, building or site, from the first concept to drawings you can build from." },
  { slug: "construction", title: "Construction of infrastructure", main: true,
    text: "Roads, drainage, water and other infrastructure works, built to plan and to standard." },
  { slug: "consultancy", title: "General consultancy",
    text: "Practical advice on planning, costing and delivering your project." },
  { slug: "supply", title: "General supply",
    text: "Supply of materials and goods your project needs." },
  { slug: "land", title: "Land services",
    text: "Help with land matters on your plot, from the first check to the paperwork." },
  { slug: "topography", title: "Topography and land survey", paid: true,
    text: "Topographic work that shows the true shape of your land before you design or build." },
  { slug: "brokerage", title: "Land sale and purchase brokerage", paid: true,
    text: "We bring buyers and sellers together and guide both sides through the deal." },
];

export const PAID_NOTE =
  "This is a paid service. Our team will contact you with the fee and how to pay. Payment is not made on this website.";
