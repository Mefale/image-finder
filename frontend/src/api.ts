import { Product } from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Ngrok muestra una página de advertencia en requests de browser; este header la saltea
const extraHeaders: Record<string, string> = import.meta.env.VITE_API_URL
  ? { "ngrok-skip-browser-warning": "1" }
  : {};

async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...extraHeaders, ...(init.headers as Record<string, string> | undefined) },
  });
  return res;
}

export async function fetchNextProduct() {
  const res = await apiFetch(`${API_BASE}/products/next`);
  if (!res.ok) {
    throw new Error("Failed to load product");
  }
  return res.json() as Promise<{ current: Product | null; index: number; total: number }>;
}

export type ImageResult = {
  url: string;
  thumbnail: string;
};

export async function fetchImages(limit = 40) {
  const res = await apiFetch(`${API_BASE}/products/images?limit=${limit}`);
  if (!res.ok) {
    throw new Error("Failed to load images");
  }
  return res.json() as Promise<{ product: Product; images: ImageResult[] }>;
}

export async function approveImage(imageUrl: string, fallbackUrl?: string) {
  const res = await apiFetch(`${API_BASE}/products/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl, fallbackUrl })
  });
  if (!res.ok) {
    throw new Error("Failed to approve image");
  }
  return res.json();
}

export async function skipProduct() {
  const res = await apiFetch(`${API_BASE}/products/skip`, { method: "POST" });
  if (!res.ok) {
    throw new Error("Failed to skip product");
  }
  return res.json();
}

export async function importDefault() {
  const res = await apiFetch(`${API_BASE}/products/import-default`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to import default products");
  return res.json() as Promise<{ total: number }>;
}

export async function goToPrevious() {
  const res = await apiFetch(`${API_BASE}/products/previous`, { method: "POST" });
  if (!res.ok) {
    throw new Error("Failed to go to previous product");
  }
  return res.json() as Promise<{ current: Product | null; index: number; total: number }>;
}

export async function resetQueue() {
  const res = await apiFetch(`${API_BASE}/products/reset`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to reset queue");
  return res.json() as Promise<{ ok: boolean }>;
}

export async function gotoProduct(index: number) {
  const res = await apiFetch(`${API_BASE}/products/goto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ index })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error || "Error al saltar");
  }
  return res.json() as Promise<{ current: Product | null; index: number; total: number }>;
}

export async function fetchCloudinaryImage(code: string): Promise<string | null> {
  const res = await apiFetch(`${API_BASE}/products/cloudinary-image?code=${encodeURIComponent(code)}`);
  if (!res.ok) {
    return null;
  }
  const data = await res.json() as { url: string | null };
  return data.url;
}
