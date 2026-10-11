import { Template } from "../data/templates";
import { FILTERS } from "../data/filters";

export interface RenderOptions {
  filter: string;
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  warmth: number; // -100 to 100
  vignette: number; // 0 to 100
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export async function renderPhotostrip(
  template: Template,
  capturedPhotos: string[],
  options: RenderOptions,
  targetWidth: number = 1333
): Promise<string> {
  let templateImg: HTMLImageElement | null = null;
  try {
    templateImg = await loadImage(template.imageSrc);
  } catch (err) {
    console.error("Gagal load template img:", template.imageSrc, err);
  }

  const canvasWidth = templateImg?.naturalWidth || targetWidth;
  const canvasHeight = templateImg?.naturalHeight || Math.round(targetWidth * 1.5);

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Context 2D tidak tersedia");

  // 1. Gambar background frame template jika template bukan transparan overlay
  // Note: Template boothku adalah background frame atau overlay dengan slot transparan
  // Kita gambar foto-foto ke slot dulu
  const filterDef = FILTERS.find((f) => f.id === options.filter);
  const baseFilter = filterDef && filterDef.id !== "normal" ? filterDef.cssFilter : "";

  let b = 1 + (options.brightness || 0) / 100;
  let c = 1 + (options.contrast || 0) / 100;
  let s = 1 + (options.saturation || 0) / 100;

  let filterStr = `brightness(${Math.max(0.2, b)}) contrast(${Math.max(0.2, c)}) saturate(${Math.max(0, s)})`;
  if (options.warmth && options.warmth !== 0) {
    if (options.warmth > 0) {
      const sep = Math.min(0.6, options.warmth / 100);
      filterStr += ` sepia(${sep}) hue-rotate(${-0.25 * options.warmth}deg)`;
    } else {
      filterStr += ` hue-rotate(${0.3 * Math.abs(options.warmth)}deg)`;
    }
  }

  const finalPhotoFilter = baseFilter ? `${baseFilter} ${filterStr}` : filterStr;

  // Load captured photos
  const loadedPhotos: (HTMLImageElement | null)[] = [];
  for (let i = 0; i < capturedPhotos.length; i++) {
    try {
      const img = await loadImage(capturedPhotos[i]);
      loadedPhotos.push(img);
    } catch {
      loadedPhotos.push(null);
    }
  }

  // Draw background frame terlebih dahulu
  if (templateImg) {
    ctx.save();
    ctx.drawImage(templateImg, 0, 0, canvasWidth, canvasHeight);
    ctx.restore();
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // Draw photos onto slots
  for (let i = 0; i < template.slots.length; i++) {
    const slot = template.slots[i];
    const photo = loadedPhotos[i] || null;
    if (!photo) continue;

    ctx.save();
    const sx = (slot.x / 100) * canvasWidth;
    const sy = (slot.y / 100) * canvasHeight;
    const sw = (slot.width / 100) * canvasWidth;
    const sh = (slot.height / 100) * canvasHeight;

    if (slot.rotation) {
      const cx = sx + sw / 2;
      const cy = sy + sh / 2;
      ctx.translate(cx, cy);
      ctx.rotate((slot.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    ctx.beginPath();
    if (slot.borderRadius) {
      const r = (slot.borderRadius / 1000) * canvasWidth;
      ctx.roundRect(sx, sy, sw, sh, r);
    } else {
      ctx.rect(sx, sy, sw, sh);
    }
    ctx.clip();

    ctx.filter = finalPhotoFilter;

    // Aspect cover positioning
    const photoRatio = photo.width / photo.height;
    const slotRatio = sw / sh;
    let renderW = sw;
    let renderH = sh;

    if (photoRatio > slotRatio) {
      renderH = sh;
      renderW = sh * photoRatio;
    } else {
      renderW = sw;
      renderH = sw / photoRatio;
    }

    const drawX = sx - (renderW - sw) / 2;
    const drawY = sy - (renderH - sh) / 2;

    ctx.drawImage(photo, drawX, drawY, renderW, renderH);

    // Vignette effect
    if (options.vignette && options.vignette > 0) {
      ctx.filter = "none";
      const vigIntensity = Math.min(0.85, options.vignette / 100);
      const rad = 0.75 * Math.max(sw, sh);
      const grad = ctx.createRadialGradient(
        sx + sw / 2,
        sy + sh / 2,
        0.35 * rad,
        sx + sw / 2,
        sy + sh / 2,
        rad
      );
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, `rgba(0,0,0,${vigIntensity})`);
      ctx.fillStyle = grad;
      ctx.fillRect(sx, sy, sw, sh);
    }

    ctx.restore();
  }

  // Jika template memiliki overlay frame transparan di atas photo
  // Kita gambar lagi dengan globalCompositeOperation jika diperlukan, atau gambar border
  return canvas.toDataURL("image/png", 0.95);
}
