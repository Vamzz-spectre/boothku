export interface FilterOption {
  id: string;
  name: string;
  cssFilter: string;
  desc: string;
}

export const FILTERS: FilterOption[] = [
  { id: "normal", name: "Natural", cssFilter: "none", desc: "Warna asli natural" },
  { id: "white-glow", name: "Putih Glowing", cssFilter: "brightness(1.18) contrast(1.04) saturate(1.08) hue-rotate(-2deg)", desc: "Wajah tampak putih, cerah & glowing bersinar" },
  { id: "snow-white", name: "Snow White", cssFilter: "brightness(1.22) contrast(1.08) saturate(0.96)", desc: "Efek memutihkan kulit wajah secara maksimal & mulus" },
  { id: "porcelain", name: "Porcelain Skin", cssFilter: "brightness(1.15) contrast(1.12) saturate(1.12) hue-rotate(-4deg)", desc: "Kulit putih halus seperti porselen & merona" },
  { id: "korean-glow", name: "Korean Glow", cssFilter: "brightness(1.08) contrast(0.96) saturate(1.15) hue-rotate(-3deg)", desc: "Kulit glowing & cerah khas Korea" },
  { id: "korean-clean", name: "K-Beauty Clean", cssFilter: "brightness(1.12) contrast(1.02) saturate(1.08)", desc: "Filter bersih & tone cerah estetik" },
  { id: "korean-film", name: "Korean Film", cssFilter: "brightness(1.06) contrast(1.1) saturate(1.22) sepia(0.12)", desc: "Tone film lembut estetik Seoul" },
  { id: "vintage", name: "Vintage 90s", cssFilter: "sepia(0.25) contrast(1.12) brightness(1.05) saturate(1.2)", desc: "Nuansa hangat film analog" },
  { id: "mono", name: "Noir Mono", cssFilter: "grayscale(1) contrast(1.25) brightness(0.98)", desc: "Hitam putih klasik kontras" },
  { id: "pastel", name: "Soft Pastel", cssFilter: "brightness(1.1) contrast(0.94) saturate(1.2) hue-rotate(-5deg)", desc: "Warna lembut & cerah" },
  { id: "sunset", name: "Golden Hour", cssFilter: "sepia(0.2) saturate(1.35) brightness(1.08) hue-rotate(-12deg)", desc: "Cahaya hangat matahari" },
  { id: "cyberpunk", name: "Cyber Sky", cssFilter: "hue-rotate(190deg) contrast(1.15) saturate(1.3)", desc: "Aksen biru neon futuristik" },
  { id: "sepia", name: "Antique Sepia", cssFilter: "sepia(0.8) contrast(1.08) brightness(0.96)", desc: "Klasik antik vintage" },
  { id: "dramatic", name: "Cinematic", cssFilter: "contrast(1.3) saturate(1.15) brightness(0.92)", desc: "Sinematik kontras tegas" }
];
