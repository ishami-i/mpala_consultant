import { useCallback, useEffect, useState } from "react";
import { API, imageUrl, getCategories, getImages } from "../api/gallery";

export default function AdminGallery({ token, onAuthFail }) {
  const [categories, setCategories] = useState([]);
  const [maxMb, setMaxMb] = useState(8);
  const [images, setImages] = useState([]);
  const [category, setCategory] = useState("construction");
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState([]);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    Promise.all([getCategories(), getImages()])
      .then(([c, i]) => {
        setCategories(c.categories);
        setMaxMb(c.max_upload_mb);
        setImages(i);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const authed = { Authorization: `Bearer ${token}` };

  const upload = async (e) => {
    e.preventDefault();
    const form = e.target;
    setError("");
    setNotice("");
    const tooBig = files.find((f) => f.size > maxMb * 1024 * 1024);
    if (tooBig) return setError(`${tooBig.name} is larger than ${maxMb} MB. Resize it and try again.`);

    const body = new FormData();
    body.append("category", category);
    body.append("caption", caption);
    files.forEach((f) => body.append("files", f));

    setBusy(true);
    try {
      const res = await fetch(`${API}/admin/gallery`, { method: "POST", headers: authed, body });
      if (res.status === 401 || res.status === 422) return onAuthFail();
      let data = {};
      try { data = await res.json(); } catch { /* not JSON, e.g. an error page */ }
      if (!res.ok) return setError(data.error || `Upload failed (error ${res.status})`);
      const label = categories.find((c) => c.slug === category)?.label;
      setNotice(`${data.uploaded} photo${data.uploaded === 1 ? "" : "s"} added to ${label}. They are now on the gallery page.`);
      setFiles([]);
      setCaption("");
      form.reset();
      load();
    } catch {
      setError("Cannot reach the server. Check that the backend is running.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (img) => {
    if (!window.confirm("Delete this photo from the gallery? This cannot be undone.")) return;
    setError("");
    const res = await fetch(`${API}/admin/gallery/${img.id}`, { method: "DELETE", headers: authed });
    if (res.status === 401 || res.status === 422) return onAuthFail();
    if (!res.ok) return setError("Could not delete the photo.");
    setNotice("Photo deleted.");
    load();
  };

  const shown = images.filter((i) => filter === "all" || i.category === filter);
  const totalMb = (files.reduce((n, f) => n + f.size, 0) / 1024 / 1024).toFixed(1);

  return (
    <div className="adm-gallery">
      <form className="adm-upload" onSubmit={upload}>
        <h2>Add photos</h2>
        <label>
          Service
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
        </label>
        <label>
          Caption (optional, shown under each photo)
          <input type="text" maxLength={255} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Road works in Kimironko, 2025" />
        </label>
        <label>
          Photos (JPG, PNG or WebP, up to {maxMb} MB each)
          <input type="file" multiple required accept="image/jpeg,image/png,image/webp"
                 onChange={(e) => setFiles(Array.from(e.target.files))} />
        </label>
        {files.length > 0 && <p className="adm-muted">{files.length} selected, {totalMb} MB in total</p>}
        <button type="submit" disabled={busy}>{busy ? "Uploading…" : "Upload photos"}</button>
        {error && <p className="adm-error" role="alert">{error}</p>}
        {notice && <p className="adm-notice" role="status">{notice} <a href="/gallery" target="_blank" rel="noreferrer">Open the gallery</a></p>}
      </form>

      <section>
        <div className="adm-gallery-top">
          <h2>Photos on the website ({images.length})</h2>
          <select aria-label="Filter by service" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All services</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.label} ({c.count})</option>)}
          </select>
        </div>
        {shown.length === 0 && <p className="adm-muted">No photos here yet. Add some with the form.</p>}
        <ul className="adm-thumbs">
          {shown.map((img) => (
            <li key={img.id}>
              <img src={imageUrl(img.file)} alt={img.caption || img.category_label} loading="lazy" />
              <p><strong>{img.category_label}</strong>{img.caption && <><br />{img.caption}</>}</p>
              <button type="button" className="adm-danger" onClick={() => remove(img)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
