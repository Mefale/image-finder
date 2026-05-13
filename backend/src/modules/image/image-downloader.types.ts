export type ImageDownloadRequest = {
  imageUrl: string;
  code: string;
};

export type ImageDownloadResult = {
  outputPath: string;
  bytes: number;
};
