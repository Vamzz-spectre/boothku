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
  Zap,
  Sparkles,
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
      alert("Izin kamera diperlukan!");
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
    setTimeout(() => setIsFlashActive(false), 120);

    setCapturedPhotos((prev) => {
      const next = [...prev, photoUrl];
      if (next.length >= selectedTemplate.requiredPhotos) {
        setTimeout(() => setStage("review"), 400);
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
      {/* COMIC STRIP HEADER */}
      <header
        className="comic-header-responsive"
        style={{
          background: "var(--comic-yellow)",
          borderBottom: "4px solid var(--comic-ink)",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 4px 0px var(--comic-ink)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          onClick={resetAll}
          style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
        >
          <div
            style={{
              background: "var(--comic-red)",
              border: "3px solid var(--comic-ink)",
              boxShadow: "3px 3px 0px var(--comic-ink)",
              padding: "4px 10px",
              transform: "rotate(-3deg)",
            }}
          >
            <span className="font-comic" style={{ fontSize: "1.8rem", color: "#ffffff", letterSpacing: 2 }}>
              BOOTHKU!
            </span>
          </div>
          <span
            className="comic-sticker"
            style={{
              background: "#ffffff",
              fontSize: "0.85rem",
              transform: "rotate(2deg)",
            }}
          >
            PHOTO COMIC #01
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {stage !== "select-template" && (
            <button onClick={resetAll} className="comic-btn-white" style={{ padding: "6px 14px" }}>
              <RotateCcw size={16} />
              <span>GANTI FRAME</span>
            </button>
          )}

          <div
            className="comic-sticker"
            style={{
              background: "var(--comic-red)",
              color: "#ffffff",
              fontSize: "0.95rem",
            }}
          >
            POW! 100% FREE
          </div>
        </div>
      </header>

      {/* MAIN COMIC STAGE */}
      <div style={{ flex: 1, padding: "28px 20px 60px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        
        {/* STAGE 1: COMIC ISSUE COVER & TEMPLATES */}
        {stage === "select-template" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {/* Comic Header Title Box */}
            <div
              className="comic-panel"
              style={{
                padding: "24px 28px",
                background: "#ffffff",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span className="comic-sticker" style={{ background: "var(--comic-blue)", color: "#ffffff", fontSize: "0.9rem" }}>
                    EDISI TERBARU
                  </span>
                  <span className="font-hand" style={{ fontSize: "1rem", color: "var(--comic-red)" }}>
                    Snap your strip story!
                  </span>
                </div>
                <h1 className="font-comic" style={{ fontSize: "clamp(2.2rem, 5vw, 3.4rem)", lineHeight: 1, margin: 0 }}>
                  PILIH FRAME KOMIKMU SEKARANG!
                </h1>
                <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#444", marginTop: 8 }}>
                  Tersedia 27 strip frame estetik. Klik frame favoritmu untuk langsung masuk ke bilik foto kamera!
                </p>
              </div>

              <div
                style={{
                  background: "var(--comic-yellow)",
                  border: "3px solid var(--comic-ink)",
                  boxShadow: "4px 4px 0px var(--comic-ink)",
                  padding: "10px 18px",
                  transform: "rotate(2deg)",
                  textAlign: "center",
                }}
              >
                <div className="font-comic" style={{ fontSize: "1.8rem", color: "var(--comic-red)", lineHeight: 1 }}>
                  27 FRAMES
                </div>
                <div className="font-comic" style={{ fontSize: "0.9rem" }}>
                  SIAP CETAK HD
                </div>
              </div>
            </div>

            {/* Category Filter Pills (Comic Speech Box Style) */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {categories.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="font-comic"
                    style={{
                      padding: "8px 16px",
                      fontSize: "1.1rem",
                      cursor: "pointer",
                      border: "3px solid var(--comic-ink)",
                      background: isActive ? "var(--comic-red)" : "#ffffff",
                      color: isActive ? "#ffffff" : "var(--comic-ink)",
                      boxShadow: isActive ? "4px 4px 0px var(--comic-ink)" : "2px 2px 0px var(--comic-ink)",
                      transform: isActive ? "translate(-2px, -2px) rotate(-1deg)" : "none",
                      transition: "all 0.1s ease",
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Template Gallery in Comic Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 24,
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
                  className="comic-panel-interactive"
                  style={{
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    background: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: 310,
                      background: "#fff8db",
                      border: "2.5px solid var(--comic-ink)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 10,
                    }}
                  >
                    <img
                      src={tmpl.imageSrc}
                      alt={tmpl.name}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div className="font-comic" style={{ fontSize: "1.25rem", lineHeight: 1.1 }}>
                        {tmpl.name}
                      </div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#666", textTransform: "uppercase" }}>
                        {tmpl.category}
                      </div>
                    </div>
                    <span
                      className="comic-sticker"
                      style={{
                        background: "var(--comic-yellow)",
                        fontSize: "0.85rem",
                        padding: "2px 8px",
                      }}
                    >
                      {tmpl.requiredPhotos} SHOTS
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STAGE 2: COMIC VIEWFINDER CAMERA */}
        {stage === "camera" && (
          <div style={{ maxWidth: 840, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Top Bar Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => setStage("select-template")} className="comic-btn-white">
                <ChevronLeft size={18} />
                <span>KEMBALI</span>
              </button>

              <div
                className="comic-panel"
                style={{ padding: "6px 20px", background: "var(--comic-yellow)", textAlign: "center" }}
              >
                <span className="font-comic" style={{ fontSize: "1.4rem" }}>
                  {selectedTemplate.name}: SHOT {capturedPhotos.length + 1} / {selectedTemplate.requiredPhotos}
                </span>
              </div>

              <button
                onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
                className="comic-btn-yellow"
                title="Putar Kamera"
              >
                <RefreshCw size={18} />
              </button>
            </div>

            {/* Video Viewfinder with Comic Frame */}
            <div className="comic-camera-viewport">
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

              {/* Huge Comic Countdown */}
              {countdownTimer !== null && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0, 0, 0, 0.45)",
                    zIndex: 40,
                  }}
                >
                  <span className="comic-countdown">{countdownTimer}</span>
                </div>
              )}

              {/* Comic Shots Progress Indicator */}
              <div
                style={{
                  position: "absolute",
                  bottom: 16,
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  gap: 10,
                  background: "#ffffff",
                  border: "3px solid var(--comic-ink)",
                  boxShadow: "3px 3px 0px var(--comic-ink)",
                  padding: "6px 14px",
                }}
              >
                {Array.from({ length: selectedTemplate.requiredPhotos }).map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: 14,
                      height: 14,
                      border: "2px solid var(--comic-ink)",
                      background: idx < capturedPhotos.length
                        ? "var(--comic-red)"
                        : idx === capturedPhotos.length
                        ? "var(--comic-yellow)"
                        : "#ffffff",
                      transform: idx === capturedPhotos.length ? "scale(1.2)" : "none",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Shutter Button */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
              <button
                onClick={triggerCapture}
                disabled={isCountingDown}
                className="comic-btn-red"
                style={{ fontSize: "1.7rem", padding: "16px 54px" }}
              >
                <Camera size={26} />
                <span>{isCountingDown ? "SIAP-SIAP..." : "JEPRET FOTO!"}</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: COMIC REVIEW & PRINT */}
        {stage === "review" && (
          <div className="comic-review-grid">
            {/* Photostrip View in Comic Box */}
            <div
              className="comic-panel"
              style={{
                padding: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 520,
                background: "#ffffff",
              }}
            >
              {isRendering ? (
                <div style={{ textAlign: "center" }}>
                  <div className="comic-sticker" style={{ fontSize: "1.4rem", background: "var(--comic-yellow)" }}>
                    PROSES CETAK STRIP...
                  </div>
                </div>
              ) : finalResultUrl ? (
                <img
                  src={finalResultUrl}
                  alt="Hasil Photostrip"
                  style={{
                    maxHeight: "76vh",
                    width: "auto",
                    border: "3.5px solid var(--comic-ink)",
                    boxShadow: "6px 6px 0px var(--comic-ink)",
                  }}
                />
              ) : null}
            </div>

            {/* Sidebar Controls */}
            <div
              className="comic-panel"
              style={{
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 20,
                background: "#ffffff",
              }}
            >
              <div style={{ borderBottom: "3px solid var(--comic-ink)", paddingBottom: 14 }}>
                <span className="comic-sticker" style={{ background: "var(--comic-red)", color: "#ffffff", fontSize: "0.85rem" }}>
                  STUDIO LAB
                </span>
                <h3 className="font-comic" style={{ fontSize: "1.8rem", margin: "6px 0 0" }}>
                  EDIT WARNA STRIP
                </h3>
              </div>

              {/* Filter selection */}
              <div>
                <label className="font-comic" style={{ display: "block", fontSize: "1.1rem", marginBottom: 6 }}>
                  FILTER MOOD:
                </label>
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "3px solid var(--comic-ink)",
                    boxShadow: "3px 3px 0px var(--comic-ink)",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    outline: "none",
                    background: "var(--comic-bg)",
                  }}
                >
                  {FILTERS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.desc})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tuning sliders */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "0.85rem" }}>
                    <span>BRIGHTNESS</span>
                    <span>{brightness}%</span>
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
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "0.85rem" }}>
                    <span>CONTRAST</span>
                    <span>{contrast}%</span>
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
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "0.85rem" }}>
                    <span>SATURATION</span>
                    <span>{saturation}%</span>
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
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "0.85rem" }}>
                    <span>WARMTH</span>
                    <span>{warmth}%</span>
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

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                <button
                  onClick={handleDownload}
                  disabled={!finalResultUrl || isRendering}
                  className="comic-btn-red"
                  style={{ width: "100%", padding: "14px" }}
                >
                  <Download size={20} />
                  <span>SIMPAN STRIP (PNG)</span>
                </button>

                <button
                  onClick={() => {
                    setCapturedPhotos([]);
                    setCurrentSlotIndex(0);
                    setStage("camera");
                  }}
                  className="comic-btn-white"
                  style={{ width: "100%" }}
                >
                  <RotateCcw size={18} />
                  <span>FOTO ULANG FRAME INI</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
