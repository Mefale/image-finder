export type ImageDownloadRequest = {
  imageUrl: string;
  code: string;
  /** URL alternativa (thumbnail de Bing) si la original bloquea el hotlinking */
  fallbackUrl?: string;
};

export type ImageDownloadResult = {
  outputPath: string;
  bytes: number;
};
