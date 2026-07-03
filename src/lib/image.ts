export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const IMAGE_BUCKET = "site-images";

export function validateImageFile(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("JPG, PNG, WEBP 형식의 이미지만 업로드할 수 있습니다.");
  }
}

export async function cropImageToSquare(
  file: File,
  scale: number,
  offsetX: number,
  offsetY: number,
  outputSize = 1600,
): Promise<Blob> {
  validateImageFile(file);

  const url = URL.createObjectURL(file);
  const image = await loadImage(url);
  URL.revokeObjectURL(url);

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("이미지를 편집할 수 없습니다.");
  }

  context.fillStyle = "#0B0D0F";
  context.fillRect(0, 0, outputSize, outputSize);

  const coverScale = Math.max(outputSize / image.width, outputSize / image.height) * scale;
  const drawWidth = image.width * coverScale;
  const drawHeight = image.height * coverScale;
  const dx = (outputSize - drawWidth) / 2 + (offsetX / 100) * outputSize;
  const dy = (outputSize - drawHeight) / 2 + (offsetY / 100) * outputSize;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, dx, dy, drawWidth, drawHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("이미지를 압축하지 못했습니다."));
      },
      "image/webp",
      0.86,
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    image.src = src;
  });
}
