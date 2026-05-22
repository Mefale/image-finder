import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { approveImage, fetchCloudinaryImage, fetchImages, fetchNextProduct, goToPrevious, gotoProduct, importDefault, resetQueue, skipProduct } from "./api";
import { Product } from "./types";

export function App() {
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState({ index: 0, total: 0 });
  const [cloudinaryUrl, setCloudinaryUrl] = useState<string | null | "loading">("loading");
  const [gotoInput, setGotoInput] = useState("");
  const [tooSmall, setTooSmall] = useState<Set<string>>(new Set());

  const loadNext = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const next = await fetchNextProduct();
      setProduct(next.current);
      setProgress({ index: next.index + 1, total: next.total });
      if (next.current) {
        setCloudinaryUrl("loading");
        const [result, cloudUrl] = await Promise.all([
          fetchImages(20),
          fetchCloudinaryImage(next.current.code)
        ]);
        setImages(result.images); setTooSmall(new Set());
        setSelected(0);
        setCloudinaryUrl(cloudUrl);
      } else {
        setImages([]);
        setCloudinaryUrl(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error";
      setMessage(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNext();
  }, []);

  const handleApprove = async () => {
    if (!images[selected]) {
      setMessage("Selecciona una imagen");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await approveImage(images[selected]);
      await loadNext();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error";
      setMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await skipProduct();
      await loadNext();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error";
      setMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await goToPrevious();
      setProduct(result.current);
      setProgress({ index: result.index + 1, total: result.total });
      if (result.current) {
        setCloudinaryUrl("loading");
        const [imgs, cloudUrl] = await Promise.all([
          fetchImages(20),
          fetchCloudinaryImage(result.current.code)
        ]);
        setImages(imgs.images); setTooSmall(new Set());
        setSelected(0);
        setCloudinaryUrl(cloudUrl);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshImages = async () => {
    if (!product) {
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const result = await fetchImages(20);
      setImages(result.images); setTooSmall(new Set());
      setSelected(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error";
      setMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const progressPct = progress.total > 0 ? Math.round((progress.index / progress.total) * 100) : 0;

  return (
    <>
      <Analytics />
      <div className="page">
        <header className="header">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true" />
            <div>
              <h1>Image Finder</h1>
              <p className="subtitle">Revisión de imágenes de producto</p>
            </div>
          </div>
          {progress.total > 0 && (
            <div className="progress">
              <div className="progress-text">
                <span className="progress-count">{progress.index} <span className="progress-sep">/</span> {progress.total}</span>
                <span className="progress-label">productos</span>
              </div>
              <div className="progress-bar" aria-hidden="true">
                <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <form
                className="goto-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const num = parseInt(gotoInput, 10);
                  if (isNaN(num) || num < 1 || num > progress.total) {
                    setMessage(`Ingresá un número entre 1 y ${progress.total}`);
                    return;
                  }
                  setLoading(true);
                  setMessage(null);
                  try {
                    const result = await gotoProduct(num - 1);
                    setProduct(result.current);
                    setProgress({ index: result.index + 1, total: result.total });
                    setGotoInput("");
                    if (result.current) {
                      setCloudinaryUrl("loading");
                      const [imgs, cloudUrl] = await Promise.all([
                        fetchImages(12),
                        fetchCloudinaryImage(result.current.code)
                      ]);
                      setImages(imgs.images); setTooSmall(new Set());
                      setSelected(0);
                      setCloudinaryUrl(cloudUrl);
                    }
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : "Error");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <input
                  className="goto-input"
                  type="number"
                  min={1}
                  max={progress.total}
                  placeholder="Ir a #"
                  value={gotoInput}
                  onChange={(e) => setGotoInput(e.target.value)}
                  disabled={loading}
                />
                <button className="btn btn-ghost btn-sm" type="submit" disabled={loading}>
                  Ir
                </button>
              </form>
              <button
                className="btn btn-ghost btn-sm btn-danger"
                disabled={loading}
                onClick={async () => {
                  if (!confirm("¿Resetear la cola? Se pierden todos los productos cargados.")) return;
                  setLoading(true);
                  try {
                    await resetQueue();
                    setProduct(null);
                    setImages([]);
                    setCloudinaryUrl(null);
                    setProgress({ index: 0, total: 0 });
                  } catch {
                    setMessage("Error al resetear");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Resetear
              </button>
            </div>
          )}
        </header>

        {message && (
          <div className="message" role="alert">
            <span className="message-dot" aria-hidden="true" />
            {message}
          </div>
        )}

        {!product && !loading && (
          <div className="empty">
            <h2>No hay más productos</h2>
            <p>Cargá la lista por defecto para comenzar la revisión.</p>
            <button
              className="btn btn-primary"
              onClick={async () => {
                setLoading(true);
                setMessage(null);
                try {
                  await importDefault();
                  await loadNext();
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "Error");
                } finally {
                  setLoading(false);
                }
              }}
            >
              Cargar productos
            </button>
          </div>
        )}

        {product && (
          <>
            <div className="workspace">
              <aside className="sidebar">
                <section className="card product-card">
                  <div className="card-section">
                    <span className="label">Código</span>
                    <span className="value mono">{product.code}</span>
                  </div>
                  <div className="card-divider" />
                  <div className="card-section">
                    <span className="label">Nombre</span>
                    <span className="value">{product.name}</span>
                  </div>
                  <div className="card-divider" />
                  <div className="card-section">
                    <span className="label">Imagen actual</span>
                    <div className="cloudinary-slot">
                      {cloudinaryUrl === "loading" && (
                        <div className="cloudinary-state">Buscando…</div>
                      )}
                      {cloudinaryUrl === null && (
                        <div className="cloudinary-state cloudinary-empty">Sin imagen en Cloudinary</div>
                      )}
                      {cloudinaryUrl && cloudinaryUrl !== "loading" && (
                        <img className="cloudinary-preview" src={cloudinaryUrl} alt="Imagen actual en Cloudinary" />
                      )}
                    </div>
                  </div>
                </section>
              </aside>

              <section className="gallery-wrap">
                <div className="gallery-header">
                  <h2>Candidatos</h2>
                  <span className="gallery-meta">{images.length} resultados</span>
                </div>
                <div className="gallery">
                  {images.map((url, index) => {
                    if (tooSmall.has(url)) return null;
                    return (
                    <button
                      key={`${url}-${index}`}
                      className={index === selected ? "thumb selected" : "thumb"}
                      onClick={() => setSelected(index)}
                      type="button"
                    >
                      <img
                        src={url}
                        alt="Resultado"
                        loading="lazy"
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          if (Math.max(img.naturalWidth, img.naturalHeight) < 800) {
                            setTooSmall((prev) => new Set(prev).add(url));
                            if (selected === index) setSelected(0);
                          }
                        }}
                        onError={() => {
                          setTooSmall((prev) => new Set(prev).add(url));
                          if (selected === index) setSelected(0);
                        }}
                      />
                      {index === selected && (
                        <span className="thumb-badge" aria-hidden="true">✓</span>
                      )}
                    </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="action-bar-spacer" aria-hidden="true" />
            <div className="action-bar">
              <div className="action-bar-inner">
                {progress.index > 1 && (
                  <button className="btn btn-ghost" onClick={handlePrevious} disabled={loading}>
                    ← Anterior
                  </button>
                )}
                <button className="btn btn-ghost btn-danger" onClick={handleSkip} disabled={loading}>
                  Saltar
                </button>
                <div className="action-bar-sep" aria-hidden="true" />
                <button className="btn btn-secondary" onClick={handleRefreshImages} disabled={loading}>
                  Otra imagen
                </button>
                <button className="btn btn-primary btn-lg" onClick={handleApprove} disabled={loading}>
                  Aprobar
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
