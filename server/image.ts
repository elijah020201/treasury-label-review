import sharp from "sharp";
export const MAX_BYTES = 2 * 1024 * 1024;
export async function prepareImage(bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_BYTES)
    throw new Error("Image must be 2 MB or smaller.");
  const png = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!png && !jpg)
    throw new Error("Only actual JPEG and PNG images are supported.");
  try {
    const image = sharp(bytes, {
      limitInputPixels: 20_000_000,
      failOn: "warning",
    });
    const meta = await image.metadata();
    if (
      (meta.pages ?? 1) > 1 ||
      !meta.width ||
      !meta.height ||
      meta.width < 64 ||
      meta.height < 64
    )
      throw new Error("Invalid image dimensions.");
    return await image
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 92 })
      .toBuffer();
  } catch {
    throw new Error(
      "Image cannot be decoded, is animated, or exceeds 20 megapixels. Supply a clear JPEG or PNG.",
    );
  }
}
