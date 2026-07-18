// Resize + square-crop a user-picked image entirely in the browser and return a compact
// `data:image/jpeg;base64,...` URL. The backend stores nothing but this string (no image libs,
// no object storage), so keeping it small here is what keeps the payload sane — a 256px JPEG is
// typically ~10–30 KB. Rejects non-images and anything that fails to decode.

const MAX_DIM = 256;
const QUALITY = 0.82;

export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("not-an-image");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) throw new Error("empty-image");

    const canvas = document.createElement("canvas");
    canvas.width = MAX_DIM;
    canvas.height = MAX_DIM;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no-canvas");

    // Center-crop the largest square, then scale it into the MAX_DIM box.
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, MAX_DIM, MAX_DIM);

    return canvas.toDataURL("image/jpeg", QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode-failed"));
    img.src = src;
  });
}
