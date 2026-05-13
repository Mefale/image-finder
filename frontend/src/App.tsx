import { useEffect, useState } from "react";
import { approveImage, fetchImages, fetchNextProduct, goToPrevious, importDefault, skipProduct } from "./api";
import { Product } from "./types";

export function App() {
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState({ index: 0, total: 0 });

  const loadNext = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const next = await fetchNextProduct();
      setProduct(next.current);
      setProgress({ index: next.index + 1, total: next.total });
      if (next.current) {
        const result = await fetchImages(12);
        setImages(result.images);
        setSelected(0);
      } else {
        setImages([]);
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
        const imgs = await fetchImages(12);
        setImages(imgs.images);
        setSelected(0);
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
      const result = await fetchImages(12);
      setImages(result.images);
      setSelected(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error";
      setMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Image Finder</h1>
          <p className="subtitle">Revision de imagenes de producto</p>
        </div>
        <div className="progress">
          <span>
            Producto {progress.index} / {progress.total}
          </span>
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
        {images.map((url, index) => (
          <button
            key={`${url}-${index}`}
            className={index === selected ? "thumb selected" : "thumb"}
            onClick={() => setSelected(index)}
            type="button"
          >
            <img src={url} alt="Resultado" loading="lazy" />
          </button>
        ))}
      </section>
    </div>
  );
}
