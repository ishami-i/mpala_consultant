import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "../components/header";
import Footer from "../components/footer";
import { getCategories, getImages, imageUrl } from "../api/gallery";

function Lightbox({ images, index, onIndex, onClose }) {
  const ref = useRef(null);
  const open = index !== null;
  const img = open ? images[index] : null;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const step = (n) => onIndex((index + n + images.length) % images.length);
  const onKeyDown = (e) => {
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  };

  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label="Photo viewer"
      onClose={onClose}
      onKeyDown={onKeyDown}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {img && (
        <div className="lightbox-body">
          <img src={imageUrl(img.file)} alt={img.caption || img.category_label} />
          <div className="lightbox-bar">
            <p>
              <strong>{img.category_label}</strong>
              {img.caption && <span> {img.caption}</span>}
            </p>
            <p className="lightbox-count">{index + 1} of {images.length}</p>
            <div className="lightbox-actions">
              {images.length > 1 && <button onClick={() => step(-1)}>Previous</button>}
              {images.length > 1 && <button onClick={() => step(1)}>Next</button>}
              <button onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}

export default function Gallery() {
  const { category } = useParams();
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let live = true;
    Promise.all([getCategories(), getImages()])
      .then(([c, i]) => {
        if (!live) return;
        setCategories(c.categories.filter((x) => x.count > 0));
        setImages(i);
        setState("ready");
      })
      .catch(() => live && setState("error"));
    return () => { live = false; };
  }, []);

  useEffect(() => setOpen(null), [category]);

  const shown = category ? images.filter((i) => i.category === category) : images;
  const current = categories.find((c) => c.slug === category);

  return (
    <>
      <Header />
      <main className="band gallery-page">
        <div className="wrap">
          <h1>Our work</h1>
          <p className="lede">
            {current ? current.label : "Photos from our projects. Choose a service to see its gallery."}
          </p>

          {categories.length > 0 && (
            <nav className="gal-tabs" aria-label="Galleries">
              <Link to="/gallery" aria-current={!category ? "page" : undefined}>All photos</Link>
              {categories.map((c) => (
                <Link key={c.slug} to={`/gallery/${c.slug}`} aria-current={category === c.slug ? "page" : undefined}>
                  {c.label} ({c.count})
                </Link>
              ))}
            </nav>
          )}

          {state === "loading" && <p className="adm-muted">Loading photos…</p>}
          {state === "error" && <p className="form-error" role="alert">We could not load the photos. Please try again in a moment.</p>}
          {state === "ready" && shown.length === 0 && (
            <p className="empty">
              No photos here yet. <Link to="/gallery">See all photos</Link> or <a href="/#contact">tell us about your project</a>.
            </p>
          )}

          <div className="gal-grid">
            {shown.map((img, i) => (
              <figure className="gal-item" key={img.id}>
                <button onClick={() => setOpen(i)} aria-label={`Open photo: ${img.caption || img.category_label}`}>
                  <img src={imageUrl(img.file)} alt={img.caption || img.category_label} loading="lazy" decoding="async" />
                </button>
                {img.caption && <figcaption>{img.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </div>
        <Lightbox images={shown} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
      </main>
      <Footer />
    </>
  );
}
