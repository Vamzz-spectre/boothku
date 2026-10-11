"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { TEMPLATES, Template } from "@/data/templates";
import { FILTERS, FilterOption } from "@/data/filters";
import { renderPhotostrip, RenderOptions } from "@/utils/canvas";
import {
  Camera,
  RotateCcw,
  Sparkles,
  Download,
  Sliders,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Layers,
  Image as ImageIcon,
  CheckCircle,
  Flame,
  LayoutGrid,
  Zap,
} from "lucide-react";

type Stage = "select-template" | "camera" | "review";

export default function BoothkuPage() {
  const [stage, setStage] = useState<Stage>("select-template");
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(TEMPLATES[0]);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Filter & Color adjustment state
  const [activeFilter, setActiveFilter] = useState<string>("normal");
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [saturation, setSaturation] = useState<number>(0);
  const [warmth, setWarmth] = useState<number>(0);
  const [vignette, setVignette] = useState<number>(0);

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

  // Kategori template
  const categories = ["All", ...Array.from(new Set(TEMPLATES.map((t) => t.category)))];

  const filteredTemplates = activeCategory === "All"
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === activeCategory);

  // Initialize camera when entering camera stage
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
      alert("Gagal membuka kamera. Pastikan izin akses kamera sudah diberikan!");
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

  // Handle snap photo
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
    const photoUrl = canvas.toDataURL("image/jpeg", 0.92);

    // Flash effect
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 120);

    setCapturedPhotos((prev) => {
      const next = [...prev, photoUrl];
      if (next.length >= selectedTemplate.requiredPhotos) {
        setTimeout(() => {
          setStage("review");
        }, 500);
      } else {
        setCurrentSlotIndex(next.length);
      }
      return next;
    });
  }, [facingMode, selectedTemplate.requiredPhotos]);

  // Start countdown before shooting
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

  // Re-render photostrip result
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
      vignette,
    };

    renderPhotostrip(selectedTemplate, capturedPhotos, options)
      .then((url) => {
        if (isSubscribed) {
          setFinalResultUrl(url);
          setIsRendering(false);
        }
      })
      .catch((err) => {
        console.error("Gagal render final:", err);
        if (isSubscribed) setIsRendering(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [stage, capturedPhotos, selectedTemplate, activeFilter, brightness, contrast, saturation, warmth, vignette]);

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
    a.download = `boothku-${selectedTemplate.id}-${Date.now()}.png`;
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
      {/* NAVBAR MODERN STUDIO */}
      <header
        style={{
          height: 72,
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(9, 13, 22, 0.8)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          onClick={resetAll}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "var(--primary-gradient)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(244, 63, 94, 0.5)",
            }}
          >
            <Camera size={22} color="#ffffff" />
          </div>
          <div>
            <span
              style={{
                fontSize: "1.35rem",
                fontWeight: 800,
                letterSpacing: "-0.5px",
                color: "#ffffff",
              }}
            >
              Booth<span className="text-gradient">ku</span>
            </span>
            <span
              style={{
                display: "block",
                fontSize: "0.68rem",
                fontWeight: 600,
                letterSpacing: "1.5px",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                marginTop: -3,
              }}
            >
              Virtual Studio AI
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {stage !== "select-template" && (
            <button
              onClick={resetAll}
              className="btn-glass"
            >
              <RotateCcw size={15} />
              <span>Ganti Frame</span>
            </button>
          )}

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 999,
              background: "rgba(244, 63, 94, 0.12)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#fb7185",
            }}
          >
            <Zap size={14} />
            <span>Gratis & Unlimited</span>
          </div>
        </div>
      </header>

      {/* CONTENT AREA */}
      <div style={{ flex: 1, padding: "28px 20px 60px", maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        
        {/* STAGE 1: TEMPLATE GALLERY */}
        {stage === "select-template" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {/* Hero Header */}
            <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 16px",
                  borderRadius: 999,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "#cbd5e1",
                  marginBottom: 12,
                }}
              >
                <Flame size={15} color="#f43f5e" />
                <span>Next-Gen Online Photobooth Experience</span>
              </div>
              <h1
                style={{
                  fontSize: "clamp(2rem, 5vw, 3rem)",
                  fontWeight: 800,
                  letterSpacing: "-1px",
                  color: "#ffffff",
                  lineHeight: 1.15,
                  marginBottom: 12,
                }}
              >
                Tangkap Momen Terbaikmu Bersama{" "}
                <span className="text-gradient">Boothku</span>
              </h1>
              <p
                style={{
                  color: "var(--text-secondary)",
                  maxWidth: 620,
                  margin: "0 auto",
                  fontSize: "1rem",
                  lineHeight: 1.6,
                }}
              >
                Pilih dari 27 template studio kekinian (Y2K, Aesthetic Korean, Vintage News, Spotify, dll). Langsung foto pakai kamera HP atau laptop!
              </p>
            </div>

            {/* Category Filter Chips */}
            <div
              style={{
                display: "flex",
                gap: 10,
                overflowX: "auto",
                padding: "4px 2px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {categories.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 999,
                      fontSize: "0.86rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      border: isActive ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
                      background: isActive ? "var(--primary-gradient)" : "rgba(255, 255, 255, 0.05)",
                      color: isActive ? "#ffffff" : "var(--text-secondary)",
                      boxShadow: isActive ? "0 4px 16px rgba(244, 63, 94, 0.4)" : "none",
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Template Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 24,
                width: "100%",
                paddingTop: 10,
              }}
            >
              {filteredTemplates.map((tmpl) => {
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => {
                      setSelectedTemplate(tmpl);
                      setCapturedPhotos([]);
                      setCurrentSlotIndex(0);
                      setStage("camera");
                    }}
                    className="glass-panel-interactive"
                    style={{
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: 330,
                        borderRadius: 14,
                        overflow: "hidden",
                        background: "rgba(0, 0, 0, 0.35)",
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
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#ffffff" }}>{tmpl.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                          {tmpl.category}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: 8,
                          background: "rgba(255, 255, 255, 0.08)",
                          color: "#38bdf8",
                          border: "1px solid rgba(56, 189, 248, 0.2)",
                        }}
                      >
                        {tmpl.requiredPhotos} Shots
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STAGE 2: LIVE CAMERA VIEW */}
        {stage === "camera" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center", maxWidth: 840, margin: "0 auto" }}>
            {/* Top Bar Controls */}
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
              <button
                onClick={() => setStage("select-template")}
                className="btn-glass"
              >
                <ChevronLeft size={16} />
                <span>Pilih Template</span>
              </button>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontWeight: 800, fontSize: "1.2rem", color: "#ffffff" }}>{selectedTemplate.name}</span>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 2 }}>
                  Shot {capturedPhotos.length + 1} of {selectedTemplate.requiredPhotos}
                </div>
              </div>
              <button
                onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
                className="btn-glass"
                title="Switch Camera"
              >
                <RefreshCw size={18} />
              </button>
            </div>

            {/* Video Viewfinder Container */}
            <div
              className="glass-panel"
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "4/3",
                borderRadius: 28,
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "#000",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
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

              {/* Flash overlay */}
              <div className={`flash-overlay ${isFlashActive ? "flash-active" : ""}`} />

              {/* Countdown overlay */}
              {countdownTimer !== null && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0, 0, 0, 0.45)",
                    backdropFilter: "blur(8px)",
                    zIndex: 40,
                  }}
                >
                  <span className="countdown-number">{countdownTimer}</span>
                </div>
              )}

              {/* Slot Indicator Pills */}
              <div
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: "rgba(0, 0, 0, 0.65)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                {Array.from({ length: selectedTemplate.requiredPhotos }).map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: idx < capturedPhotos.length
                        ? "#10b981"
                        : idx === capturedPhotos.length
                        ? "#f43f5e"
                        : "rgba(255, 255, 255, 0.2)",
                      transition: "all 0.2s ease",
                      transform: idx === capturedPhotos.length ? "scale(1.25)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Capture Trigger Button */}
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <button
                onClick={triggerCapture}
                disabled={isCountingDown}
                className="btn-glow-primary"
                style={{ padding: "16px 40px", fontSize: "1.1rem" }}
              >
                <Camera size={22} />
                <span>{isCountingDown ? "Bersiap..." : "Ambil Foto (3s)"}</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: REVIEW & STUDIO ADJUSTMENT */}
        {stage === "review" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.25fr) 420px",
              gap: 32,
              alignItems: "start",
            }}
          >
            {/* Photostrip Preview Display */}
            <div
              className="glass-panel"
              style={{
                padding: 24,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 520,
              }}
            >
              {isRendering ? (
                <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>
                  <Sparkles size={36} color="#f43f5e" style={{ animation: "pulseScale 1s infinite" }} />
                  <div style={{ marginTop: 12, fontWeight: 700, color: "#ffffff" }}>Merender Photostrip HD...</div>
                </div>
              ) : finalResultUrl ? (
                <img
                  src={finalResultUrl}
                  alt="Photostrip Hasil"
                  style={{
                    maxHeight: "75vh",
                    width: "auto",
                    borderRadius: 16,
                    boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7)",
                  }}
                />
              ) : null}
            </div>

            {/* Studio Tools & Color Tuning */}
            <div
              className="glass-panel"
              style={{
                padding: 28,
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: 16 }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#ffffff" }}>Studio Retouch</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 2 }}>
                  Sesuaikan tone & warna foto sesukamu
                </p>
              </div>

              {/* Mood Filter Select */}
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>
                  Filter Estetik:
                </label>
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 14,
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                >
                  {FILTERS.map((f) => (
                    <option key={f.id} value={f.id} style={{ background: "#0f172a", color: "#ffffff" }}>
                      {f.name} — {f.desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sliders */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                    <span>Brightness</span>
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
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                    <span>Contrast</span>
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
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                    <span>Saturation</span>
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
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                    <span>Warmth (Suhu)</span>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
                <button
                  onClick={handleDownload}
                  disabled={!finalResultUrl || isRendering}
                  className="btn-glow-primary"
                  style={{ width: "100%", padding: "14px 20px" }}
                >
                  <Download size={18} />
                  <span>Download Photostrip (PNG)</span>
                </button>

                <button
                  onClick={() => {
                    setCapturedPhotos([]);
                    setCurrentSlotIndex(0);
                    setStage("camera");
                  }}
                  className="btn-glass"
                  style={{ width: "100%" }}
                >
                  <RotateCcw size={16} />
                  <span>Foto Ulang Sesi Ini</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
