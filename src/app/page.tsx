"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { TEMPLATES, Template } from "@/data/templates";
import { FILTERS } from "@/data/filters";
import { renderPhotostrip, RenderOptions } from "@/utils/canvas";
import {
  Camera,
  RotateCcw,
  Download,
  ChevronLeft,
  RefreshCw,
  Sliders,
  Check,
} from "lucide-react";

type Stage = "select-template" | "camera" | "review";

export default function BoothkuPage() {
  const [stage, setStage] = useState<Stage>("select-template");
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(TEMPLATES[0]);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Filter & Color adjustments
  const [activeFilter, setActiveFilter] = useState<string>("normal");
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [saturation, setSaturation] = useState<number>(0);
  const [warmth, setWarmth] = useState<number>(0);

  // Camera settings
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [countdownTimer, setCountdownTimer] = useState<number | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);

  // Photostrip result
  const [finalResultUrl, setFinalResultUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const categories = ["All", ...Array.from(new Set(TEMPLATES.map((t) => t.category)))];

  const filteredTemplates = activeCategory === "All"
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === activeCategory);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Izin akses kamera diperlukan untuk mengambil foto.");
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (stage === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [stage, startCamera, stopCamera]);

  const takeSnapshot = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoUrl = canvas.toDataURL("image/jpeg", 0.94);

    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 100);

    setCapturedPhotos((prev) => {
      const next = [...prev, photoUrl];
      if (next.length >= selectedTemplate.requiredPhotos) {
        setTimeout(() => setStage("review"), 350);
      } else {
        setCurrentSlotIndex(next.length);
      }
      return next;
    });
  }, [facingMode, selectedTemplate.requiredPhotos]);

  const triggerCapture = () => {
    if (isCountingDown) return;
    setIsCountingDown(true);
    let count = 3;
    setCountdownTimer(count);

    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdownTimer(count);
      } else {
        clearInterval(interval);
        setCountdownTimer(null);
        setIsCountingDown(false);
        takeSnapshot();
      }
    }, 1000);
  };

  useEffect(() => {
    if (stage !== "review" || capturedPhotos.length < selectedTemplate.requiredPhotos) return;

    let isSubscribed = true;
    setIsRendering(true);

    const options: RenderOptions = {
      filter: activeFilter,
      brightness,
      contrast,
      saturation,
      warmth,
      vignette: 0,
    };

    renderPhotostrip(selectedTemplate, capturedPhotos, options)
      .then((url) => {
        if (isSubscribed) {
          setFinalResultUrl(url);
          setIsRendering(false);
        }
      })
      .catch((err) => {
        console.error("Gagal render:", err);
        if (isSubscribed) setIsRendering(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [stage, capturedPhotos, selectedTemplate, activeFilter, brightness, contrast, saturation, warmth]);

  const resetAll = () => {
    setCapturedPhotos([]);
    setCurrentSlotIndex(0);
    setFinalResultUrl(null);
    setStage("select-template");
  };

  const handleDownload = () => {
    if (!finalResultUrl) return;
    const a = document.createElement("a");
    a.href = finalResultUrl;
    a.download = `boothku-${selectedTemplate.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getActiveFilterCss = () => {
    const f = FILTERS.find((item) => item.id === activeFilter);
    return f ? f.cssFilter : "none";
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Editorial Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border-line)",
          background: "var(--bg-surface)",
          padding: "16px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          onClick={resetAll}
          style={{ display: "flex", alignItems: "baseline", gap: 10, cursor: "pointer" }}
        >
          <span className="font-display" style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--ink-primary)" }}>
            Boothku.
          </span>
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Self Photo Studio
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {stage !== "select-template" && (
            <button onClick={resetAll} className="btn-outline">
              <RotateCcw size={15} />
              <span>Ganti Frame</span>
            </button>
          )}
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--ink-secondary)", background: "var(--bg-surface-soft)", padding: "6px 12px", borderRadius: 8 }}>
            27 Template Pilihan
          </span>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ flex: 1, padding: "36px 24px 60px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        
        {/* STAGE 1: TEMPLATE GALLERY */}
        {stage === "select-template" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ maxWidth: 640 }}>
              <h1 className="font-display" style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 900, lineHeight: 1.15, marginBottom: 12 }}>
                Pilih layout strip foto favoritmu.
              </h1>
              <p style={{ color: "var(--ink-secondary)", fontSize: "0.98rem", lineHeight: 1.6 }}>
                Mulai sesi pemotretan langsung dari browser. Semua template siap pakai dengan format cetak photostrip beresolusi tinggi.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {categories.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`filter-pill ${isActive ? "filter-pill-active" : ""}`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Grid of Templates */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 20,
              }}
            >
              {filteredTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => {
                    setSelectedTemplate(tmpl);
                    setCapturedPhotos([]);
                    setCurrentSlotIndex(0);
                    setStage("camera");
                  }}
                  className="booth-card"
                  style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: 320,
                      borderRadius: 8,
                      background: "var(--bg-canvas)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 12,
                    }}
                  >
                    <img
                      src={tmpl.imageSrc}
                      alt={tmpl.name}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.98rem" }}>{tmpl.name}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)", marginTop: 2 }}>{tmpl.category}</div>
                    </div>
                    <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--ink-secondary)", border: "1px solid var(--border-line)", padding: "3px 8px", borderRadius: 6 }}>
                      {tmpl.requiredPhotos} frame
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STAGE 2: CAMERA VIEW */}
        {stage === "camera" && (
          <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => setStage("select-template")} className="btn-outline">
                <ChevronLeft size={16} />
                <span>Kembali</span>
              </button>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{selectedTemplate.name}</div>
                <div style={{ fontSize: "0.82rem", color: "var(--ink-muted)" }}>
                  Foto {capturedPhotos.length + 1} dari {selectedTemplate.requiredPhotos}
                </div>
              </div>
              <button
                onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
                className="btn-outline"
                style={{ padding: "10px 12px" }}
                title="Putar Kamera"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {/* Video Box */}
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "4/3",
                borderRadius: 14,
                overflow: "hidden",
                background: "var(--bg-dark-viewport)",
                border: "1px solid var(--border-dark)",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: facingMode === "user" ? "scaleX(-1)" : "none",
                  filter: getActiveFilterCss(),
                }}
              />

              <div className={`flash-overlay ${isFlashActive ? "flash-active" : ""}`} />

              {countdownTimer !== null && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0, 0, 0, 0.4)",
                    zIndex: 40,
                  }}
                >
                  <span className="viewfinder-countdown">{countdownTimer}</span>
                </div>
              )}

              {/* Progress counter dots */}
              <div
                style={{
                  position: "absolute",
                  bottom: 18,
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  gap: 8,
                  padding: "6px 14px",
                  borderRadius: 20,
                  background: "rgba(0, 0, 0, 0.7)",
                }}
              >
                {Array.from({ length: selectedTemplate.requiredPhotos }).map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: idx < capturedPhotos.length
                        ? "#ffffff"
                        : idx === capturedPhotos.length
                        ? "var(--accent-terracotta)"
                        : "rgba(255, 255, 255, 0.3)",
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
              <button
                onClick={triggerCapture}
                disabled={isCountingDown}
                className="btn-solid-primary"
                style={{ padding: "14px 44px", fontSize: "1rem" }}
              >
                <Camera size={18} />
                <span>{isCountingDown ? "Bersiap..." : "Ambil Foto"}</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: REVIEW & EXPORT */}
        {stage === "review" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.2fr) 380px",
              gap: 36,
              alignItems: "start",
            }}
          >
            {/* Photostrip View */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-line)",
                borderRadius: 14,
                padding: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 520,
              }}
            >
              {isRendering ? (
                <div style={{ textAlign: "center", color: "var(--ink-muted)", fontSize: "0.92rem" }}>
                  Memproses lembar cetak photostrip...
                </div>
              ) : finalResultUrl ? (
                <img
                  src={finalResultUrl}
                  alt="Hasil Photostrip"
                  style={{
                    maxHeight: "76vh",
                    width: "auto",
                    borderRadius: 8,
                    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.12)",
                  }}
                />
              ) : null}
            </div>

            {/* Adjustments Sidebar */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-line)",
                borderRadius: 14,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              <div>
                <h3 className="font-display" style={{ fontSize: "1.2rem", fontWeight: 800 }}>Pilihan Warna & Filter</h3>
                <p style={{ fontSize: "0.82rem", color: "var(--ink-muted)", marginTop: 2 }}>
                  Sentuhan akhir untuk hasil foto terbaikmu.
                </p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: 8 }}>
                  Gaya Filter:
                </label>
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border-line)",
                    background: "var(--bg-canvas)",
                    color: "var(--ink-primary)",
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                >
                  {FILTERS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.desc})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 600 }}>
                    <span>Brightness</span>
                    <span style={{ color: "var(--ink-muted)" }}>{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min={-40}
                    max={40}
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 600 }}>
                    <span>Contrast</span>
                    <span style={{ color: "var(--ink-muted)" }}>{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min={-40}
                    max={40}
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 600 }}>
                    <span>Saturation</span>
                    <span style={{ color: "var(--ink-muted)" }}>{saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 600 }}>
                    <span>Warmth</span>
                    <span style={{ color: "var(--ink-muted)" }}>{warmth}%</span>
                  </div>
                  <input
                    type="range"
                    min={-40}
                    max={40}
                    value={warmth}
                    onChange={(e) => setWarmth(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                <button
                  onClick={handleDownload}
                  disabled={!finalResultUrl || isRendering}
                  className="btn-solid-primary"
                  style={{ width: "100%" }}
                >
                  <Download size={16} />
                  <span>Download Photostrip PNG</span>
                </button>

                <button
                  onClick={() => {
                    setCapturedPhotos([]);
                    setCurrentSlotIndex(0);
                    setStage("camera");
                  }}
                  className="btn-outline"
                  style={{ width: "100%" }}
                >
                  <RotateCcw size={15} />
                  <span>Ulangi Sesi Foto</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
