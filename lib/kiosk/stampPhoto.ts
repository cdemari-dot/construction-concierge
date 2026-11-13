"use client";

// Draws the captured photo onto a canvas with a time/GPS stamp burned in,
// the same idea as the prototype's punch-clock demo photos. Returns a JPEG
// Blob ready to upload to Storage.
export function stampPhoto(
  file: File | null,
  opts: { label: string; lat: number | null; lon: number | null; geofenceOk: boolean | null },
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const W = 480;
    const H = 600;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas not supported"));
      return;
    }

    const draw = (img: HTMLImageElement | null) => {
      if (img) {
        const ratio = Math.max(W / img.width, H / img.height);
        const iw = img.width * ratio;
        const ih = img.height * ratio;
        ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
      } else {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#1b2a44");
        g.addColorStop(1, "#0b1424");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.fillStyle = "rgba(5,9,18,.78)";
      ctx.fillRect(0, H - 96, W, 96);
      ctx.fillStyle = "#C8A464";
      ctx.font = "bold 20px monospace";
      ctx.fillText(opts.label + "  " + new Date().toLocaleString("en-CA"), 16, H - 62);
      ctx.fillStyle = "#e6edf7";
      ctx.font = "16px monospace";
      const gps = opts.lat != null && opts.lon != null ? `GPS ${opts.lat.toFixed(4)}, ${opts.lon.toFixed(4)}` : "GPS unavailable";
      ctx.fillText(gps, 16, H - 36);
      ctx.fillStyle = opts.geofenceOk === false ? "#E5484D" : "#3FBF7F";
      ctx.fillText(opts.geofenceOk === false ? "OUTSIDE GEOFENCE" : "In geofence", 16, H - 14);

      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/jpeg", 0.85);
    };

    if (!file) {
      draw(null);
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      draw(img);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      draw(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
