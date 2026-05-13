import { ImageResult, Product } from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export async function fetchNextProduct() {
  const res = await fetch(`${API_BASE}/products/next`);
  if (!res.ok) {
    throw new Error("Failed to load product");
  }
  return res.json() as Promise<{ current: Product | null; index: number; total: number }>;
}

export async function fetchImages(limit = 12) {
  const res = await fetch(`${API_BASE}/products/images?limit=${limit}`);
  if (!res.ok) {
    throw new Error("Failed to load images");
  }
  return res.json() as Promise<{ product: Product; images: string[] }>; 
}

export async function approveImage(imageUrl: string) {
  const res = await fetch(`${API_BASE}/products/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl })
  });
  if (!res.ok) {
    throw new Error("Failed to approve image");
  }
  return res.json();
}

export async function skipProduct() {
  const res = await fetch(`${API_BASE}/products/skip`, { method: "POST" });
  if (!res.ok) {
    throw new Error("Failed to skip product");
  }
  return res.json();
}

export async function importDefault() {
  const res = await fetch(`${API_BASE}/products/import-default`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to import default products");
  return res.json() as Promise<{ total: number }>;
}

export async function goToPrevious() {
  const res = await fetch(`${API_BASE}/products/previous`, { method: "POST" });
  if (!res.ok) {
    throw new Error("Failed to go to previous product");
  }
  return res.json() as Promise<{ current: Product | null; index: number; total: number }>;
}
