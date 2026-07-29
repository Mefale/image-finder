import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { approveImage, fetchCloudinaryImage, fetchImages, fetchNextProduct, goToPrevious, gotoProduct, importDefault, resetQueue, skipProduct } from "./api";
import type { ImageResult } from "./api";
import { Product } from "./types";

export function App() {
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ImageResult[]>([]);
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
          fetchImages(),
          fetchCloudinaryImage(next.current.code)
        ]);
        setImages(result.images);
        setTooSmall(new Set());
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
    const image = images[selected];
    if (!image) {
      setMessage("Selecciona una imagen");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await approveImage(image.url, image.thumbnail);
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
          fetchImages(),
          fetchCloudinaryImage(result.current.code)
        ]);
        setImages(imgs.images);
        setTooSmall(new Set());
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
      const result = await fetchImages();
      setImages(result.images);
      setTooSmall(new Set());
      setSelected(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error";
      setMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Analytics />
      <div className="page">
        <header className="header">
          <div>
            <h1>Image Finder</h1>
            <p className="subtitle">Revision de imagenes de producto</p>
          </div>
          <div className="progress">
            <span>Producto {progress.index} / {progress.total}</span>
            {progress.total > 0 && (
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
                        fetchImages(),
                        fetchCloudinaryImage(result.current.code)
                      ]);
                      setImages(imgs.images);
                      setTooSmall(new Set());
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
                <button className="goto-btn" type="submit" disabled={loading}>
                  Ir
                </button>
              </form>
            )}
            {progress.total > 0 && (
              <button
                className="reset-btn"
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
            )}
          </div>
        </header>

        {message && <div className="message">{message}</div>}

        {!product && !loading && (
          <div className="empty">
            <p>No hay mas productos</p>
            <button onClick={async () => {
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
            }}>
              Cargar productos
            </button>
          </div>
        )}

        {product && (
          <section className="product">
            <div className="product-info">
              <div className="label">Codigo</div>
              <div className="value">{product.code}</div>
              <div className="label">Nombre</div>
              <div className="value">{product.name}</div>
              <div className="label">Imagen actual</div>
              <div className="value">
                {cloudinaryUrl === "loading" && <span className="cloudinary-status">Buscando...</span>}
                {cloudinaryUrl === null && <span className="cloudinary-status cloudinary-empty">No hay imagen en Cloudinary</span>}
                {cloudinaryUrl && cloudinaryUrl !== "loading" && (
                  <img className="cloudinary-preview" src={cloudinaryUrl} alt="Imagen actual en Cloudinary" />
                )}
              </div>
            </div>

            <div className="actions">
              <button onClick={handleApprove} disabled={loading}>
                Aprobar
              </button>
              {progress.index > 1 && (
                <button onClick={handlePrevious} disabled={loading}>
                  Anterior
                </button>
              )}
              <button onClick={handleRefreshImages} disabled={loading}>
                Otra imagen
              </button>
              <button onClick={handleSkip} disabled={loading}>
                Saltar
              </button>
            </div>
          </section>
        )}

        <section className="gallery">
          {images.map((image, index) => {
            if (tooSmall.has(image.url)) return null;
            return (
              <button
                key={`${image.url}-${index}`}
                className={index === selected ? "thumb selected" : "thumb"}
                onClick={() => setSelected(index)}
                type="button"
              >
                <img
                  src={image.thumbnail}
                  alt="Resultado"
                  loading="lazy"
                  onError={() => {
                    setTooSmall((prev) => new Set(prev).add(image.url));
                    if (selected === index) setSelected(0);
                  }}
                />
              </button>
            );
          })}
        </section>
      </div>
    </>
  );
}
