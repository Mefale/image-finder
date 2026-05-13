import { Product, ProductStatus } from "../domain/product.types";

type CachedImage = { url: string };

type ProductState = {
  status: ProductStatus;
  approvedUrl?: string;
  skipped?: boolean;
  images?: CachedImage[];
};

class QueueService {
  private products: Product[] = [];
  private currentIndex = 0;
  private state = new Map<string, ProductState>();

  setProducts(products: Product[]) {
    this.products = products;
    this.currentIndex = 0;
    this.state.clear();
  }

  getTotal() {
    return this.products.length;
  }

  getCurrentIndex() {
    return this.currentIndex;
  }

  getCurrent(): Product | null {
    if (this.currentIndex >= this.products.length) {
      return null;
    }
    return this.products[this.currentIndex];
  }

  advance() {
    if (this.currentIndex < this.products.length) {
      this.currentIndex += 1;
    }
  }

  goBack(): { code: string; wasApproved: boolean } | null {
    if (this.currentIndex <= 0) return null;
    this.currentIndex -= 1;
    const prev = this.products[this.currentIndex];
    const prevState = this.state.get(prev.code);
    const wasApproved = prevState?.status === "approved";
    this.state.delete(prev.code);
    return { code: prev.code, wasApproved };
  }

  cacheImages(code: string, urls: string[]) {
    const entry = this.state.get(code) || { status: "pending" as ProductStatus };
    entry.images = urls.map((url) => ({ url }));
    this.state.set(code, entry);
  }

  markApproved(code: string, approvedUrl: string) {
    this.state.set(code, { status: "approved", approvedUrl });
  }

  markSkipped(code: string) {
    this.state.set(code, { status: "skipped", skipped: true });
  }

  getStatus() {
    const completed = Array.from(this.state.values()).filter(
      (item) => item.status === "approved" || item.status === "skipped"
    ).length;

    return {
      total: this.getTotal(),
      currentIndex: this.getCurrentIndex(),
      completed,
      pending: Math.max(this.getTotal() - completed, 0)
    };
  }
}

export const queueService = new QueueService();
