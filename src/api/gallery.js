export const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const imageUrl = (file) => `${API}/uploads/${file}`;

export async function getCategories() {
  const res = await fetch(`${API}/gallery/categories`);
  if (!res.ok) throw new Error("Could not load the galleries");
  return res.json(); // { categories: [{ slug, label, count }], max_upload_mb }
}

export async function getImages() {
  const res = await fetch(`${API}/gallery`);
  if (!res.ok) throw new Error("Could not load the photos");
  return res.json(); // [{ id, category, category_label, caption, file, created_at }]
}
