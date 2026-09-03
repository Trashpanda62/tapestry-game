// Reads WebP pixel dimensions straight from the container header.
//
// The shop needs to know how big each product photo actually is: half the catalogue
// is supplier imagery stored at 100x100 or 180x180, and blowing those up to fill a
// 250px card is what makes the grid look cheap. Knowing the real size lets the card
// pick the largest available photo as its hero and frame the genuinely small ones
// instead of upscaling them.
//
// Done by hand rather than with a dependency or an ffprobe subprocess: this runs over
// ~600 files on every build, the header is the first 30 bytes, and a build gate should
// not need a binary on PATH to tell you how wide a picture is.
//
// Layout: "RIFF" <u32 size> "WEBP" <fourCC> ... where fourCC selects the encoding.
// https://developers.google.com/speed/webp/docs/riff_container

export function readWebpSize(buffer) {
  if (buffer.length < 30) return null;
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") return null;
  const format = buffer.toString("ascii", 12, 16);

  // Lossy. The 14-bit dimensions sit after the 3-byte frame tag and the 3-byte sync code.
  if (format === "VP8 ") {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }

  // Lossless. 1 signature byte, then width-1 and height-1 packed as 14 bits each,
  // little-endian across the next four bytes.
  if (format === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }

  // Extended (alpha, animation, metadata). Canvas size is two 24-bit little-endian
  // minus-one values in the VP8X chunk payload.
  if (format === "VP8X") {
    const width = buffer.readUIntLE(24, 3) + 1;
    const height = buffer.readUIntLE(27, 3) + 1;
    return { width, height };
  }

  return null;
}

// The short edge is what governs perceived sharpness in a fixed-ratio frame, so it is
// the single number the card ranks and thresholds on.
export function shortEdge(size) {
  return size ? Math.min(size.width, size.height) : 0;
}
