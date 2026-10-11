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
} from "lucide-react";

type Stage = "select-template" | "camera" | "review";

export default function BoothkuPage() {
  const [stage, setStage] = useState<Stage>("select-template");
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(TEMPLATES[0]);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0);

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
  const [credits, setCredits] = useState(5);

  // Photostrip result
  const [finalResultUrl, setFinalResultUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

    // Mirror image if user-facing
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photoUrl = canvas.toDataURL("image/jpeg", 0.95);

    // Flash effect
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 120);

    setCapturedPhotos((prev) => {
      const next = [...prev, photoUrl];
      if (next.length >= selectedTemplate.requiredPhotos) {
        // Selesai semua slot foto
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

  // Re-render photostrip when entering review or changing filters
  useEffect(() => {
    if (stage === "review" && capturedPhotos.length > 0) {
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
          setFinalResultUrl(url);
          setIsRendering(false);
        })
        .catch((err) => {
          console.error("Render photostrip error:", err);
          setIsRendering(false);
        });
    }
  }, [
    stage,
    capturedPhotos,
    selectedTemplate,
    activeFilter,
    brightness,
    contrast,
    saturation,
    warmth,
    vignette,
  ]);

  const handleDownload = () => {
    if (!finalResultUrl) return;
    const a = document.createElement("a");
    a.href = finalResultUrl;
    a.download = `boothku-${selectedTemplate.id}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const resetAll = () => {
    setCapturedPhotos([]);
    setCurrentSlotIndex(0);
    setFinalResultUrl(null);
    setStage("select-template");
  };

  const getActiveFilterCss = () => {
    const f = FILTERS.find((item) => item.id === activeFilter);
    return f ? f.cssFilter : "none";
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--neo-bg)",
        color: "var(--neo-black)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Top Navbar Header */}
      <header
        className="no-print"
        style={{
          width: "100%",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#ffffff",
          borderBottom: "2.5px solid var(--neo-black)",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          onClick={resetAll}
        >
          <img
            src="/images/logo.png"
            alt="Boothku Logo"
            style={{
              height: 42,
              width: "auto",
              objectFit: "contain",
              filter: "drop-shadow(2px 2px 0px #0f172a)",
            }}
          />
          <span
            style={{
              fontSize: "1.45rem",
              fontWeight: 900,
              letterSpacing: "-0.5px",
              color: "var(--neo-black)",
            }}
          >
            Boothku
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 10,
              background: "#ffffff",
              border: "2px solid var(--neo-black)",
              fontSize: "0.85rem",
              fontWeight: 800,
              boxShadow: "2px 2px 0px var(--neo-black)",
            }}
          >
            <span>Credits:</span>
            <span
              style={{
                background: "var(--neo-primary)",
                padding: "2px 8px",
                borderRadius: 6,
                fontWeight: 900,
              }}
            >
              {credits}/5
            </span>
          </div>

          {stage !== "select-template" && (
            <button
              onClick={resetAll}
              className="neo-btn neo-btn-secondary"
              style={{ padding: "8px 16px", fontSize: "0.85rem" }}
            >
              <RotateCcw size={15} />
              <span>Ganti Template</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div style={{ flex: 1, padding: "20px 16px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        {/* STAGE 1: PILIH TEMPLATE */}
        {stage === "select-template" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              <div
                style={{
                  display: "inline-block",
                  background: "var(--neo-primary)",
                  border: "2px solid var(--neo-black)",
                  padding: "4px 14px",
                  borderRadius: 999,
                  boxShadow: "2.5px 2.5px 0px var(--neo-black)",
                  fontSize: "0.75rem",
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                PHOTOBOOTH STUDIO ONLINE
              </div>
              <h1
                style={{
                  fontSize: "clamp(1.5rem, 5vw, 2.2rem)",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  margin: "4px 0",
                }}
              >
                Pilih Template Favorit Kamu
              </h1>
              <p style={{ color: "var(--text-secondary)", maxWidth: 540, fontWeight: 600, fontSize: "0.95rem" }}>
                Tersedia 27 template aesthetic (Y2K Digicam, Korean Twin Strip, Vintage Newspaper, Spotify & Story). Klik template untuk mulai sesi foto!
              </p>
            </div>

            {/* Template Horizontal Scroll / Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
                gap: 20,
                width: "100%",
                padding: "10px 0 30px 0",
              }}
            >
              {TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate.id === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => {
                      setSelectedTemplate(tmpl);
                      setCapturedPhotos([]);
                      setCurrentSlotIndex(0);
                      setStage("camera");
                    }}
                    className="neo-card-interactive"
                    style={{
                      borderRadius: 18,
                      border: "2.5px solid var(--neo-black)",
                      background: isSelected ? "var(--neo-blue-light)" : "#ffffff",
                      boxShadow: isSelected ? "6px 6px 0px var(--neo-black)" : "4px 4px 0px var(--neo-black)",
                      padding: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      cursor: "pointer",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: 310,
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "#f8fafc",
                        border: "2px solid var(--neo-black)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 6,
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
                        <div style={{ fontWeight: 900, fontSize: "1rem" }}>{tmpl.name}</div>
                        <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 600 }}>
                          {tmpl.category}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 900,
                          padding: "3px 9px",
                          borderRadius: 999,
                          background: "var(--neo-primary)",
                          border: "1.8px solid var(--neo-black)",
                          boxShadow: "1.5px 1.5px 0px var(--neo-black)",
                        }}
                      >
                        {tmpl.requiredPhotos} Foto
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STAGE 2: LIVE CAMERA SHOOTING */}
        {stage === "camera" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
            {/* Header Info */}
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: 800, alignItems: "center" }}>
              <button
                onClick={() => setStage("select-template")}
                className="neo-btn neo-btn-secondary"
                style={{ padding: "8px 14px", fontSize: "0.85rem" }}
              >
                <ChevronLeft size={16} />
                <span>Pilih Template</span>
              </button>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontWeight: 900, fontSize: "1.1rem" }}>{selectedTemplate.name}</span>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                  Foto ke-{capturedPhotos.length + 1} dari {selectedTemplate.requiredPhotos}
                </div>
              </div>
              <button
                onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
                className="neo-btn neo-btn-icon"
                title="Putar Kamera"
              >
                <RefreshCw size={18} />
              </button>
            </div>

            {/* Video Viewfinder */}
            <div
              className="camera-video-container"
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 800,
                aspectRatio: "4/3",
                borderRadius: 20,
                border: "3px solid var(--neo-black)",
                overflow: "hidden",
                background: "#000",
                boxShadow: "6px 6px 0px var(--neo-black)",
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
                    background: "rgba(0,0,0,0.3)",
                    zIndex: 40,
                  }}
                >
                  <span className="countdown-number">{countdownTimer}</span>
                </div>
              )}
            </div>

            {/* Filter Selector Horizontal */}
            <div style={{ width: "100%", maxWidth: 800 }}>
              <div style={{ fontWeight: 800, fontSize: "0.88rem", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={16} />
                <span>Pilih Filter Real-time:</span>
              </div>
              <div className="filter-scroll-container">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 12,
                      border: "2px solid var(--neo-black)",
                      background: activeFilter === f.id ? "var(--neo-primary)" : "#ffffff",
                      boxShadow: activeFilter === f.id ? "2px 2px 0px var(--neo-black)" : "none",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Shoot Controls */}
            <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
              <button
                onClick={triggerCapture}
                disabled={isCountingDown}
                className="neo-btn neo-btn-primary"
                style={{
                  padding: "14px 40px",
                  fontSize: "1.1rem",
                  gap: 10,
                  opacity: isCountingDown ? 0.7 : 1,
                }}
              >
                <Camera size={22} />
                <span>{isCountingDown ? "Bersiap..." : "Ambil Foto (Countdown 3s)"}</span>
              </button>
            </div>

            {/* Thumbnails of captured photos */}
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              {Array.from({ length: selectedTemplate.requiredPhotos }).map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 12,
                    border: "2px solid var(--neo-black)",
                    background: capturedPhotos[idx] ? "#fff" : "#e2e8f0",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "2px 2px 0px var(--neo-black)",
                  }}
                >
                  {capturedPhotos[idx] ? (
                    <img
                      src={capturedPhotos[idx]}
                      alt={`Foto ${idx + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8" }}>
                      #{idx + 1}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STAGE 3: REVIEW & EXPORT */}
        {stage === "review" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: "1.8rem", fontWeight: 900, textTransform: "uppercase" }}>
                Photostrip Siap! 🎉
              </h2>
              <p style={{ color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.92rem" }}>
                Sesuaikan tone warna & filter sebelum download hasil cetak fotomu.
              </p>
            </div>

            <div className="review-preview-grid">
              {/* Photostrip Canvas / Output Image */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  background: "#ffffff",
                  borderRadius: 20,
                  border: "2.5px solid var(--neo-black)",
                  padding: 16,
                  boxShadow: "6px 6px 0px var(--neo-black)",
                  minHeight: 480,
                }}
              >
                {isRendering ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{ fontWeight: 900, fontSize: "1.1rem" }}>Merender Photostrip...</div>
                  </div>
                ) : finalResultUrl ? (
                  <img
                    src={finalResultUrl}
                    alt="Hasil Photostrip"
                    style={{
                      maxHeight: 650,
                      maxWidth: "100%",
                      objectFit: "contain",
                      borderRadius: 12,
                      border: "2px solid var(--neo-black)",
                    }}
                  />
                ) : null}
              </div>

              {/* Adjustments & Download Controls */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  background: "#ffffff",
                  borderRadius: 20,
                  border: "2.5px solid var(--neo-black)",
                  padding: 20,
                  boxShadow: "4px 4px 0px var(--neo-black)",
                }}
              >
                <div style={{ fontWeight: 900, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <Sliders size={20} />
                  <span>Koreksi Tone & Estetika</span>
                </div>

                {/* Filter Selector */}
                <div>
                  <label style={{ fontSize: "0.82rem", fontWeight: 800, display: "block", marginBottom: 6 }}>
                    Filter Mood:
                  </label>
                  <select
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "2px solid var(--neo-black)",
                      fontWeight: 800,
                      fontSize: "0.88rem",
                      outline: "none",
                    }}
                  >
                    {FILTERS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} — {f.desc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Brightness */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 800 }}>
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

                {/* Contrast */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 800 }}>
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

                {/* Saturation */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 800 }}>
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

                {/* Warmth */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 800 }}>
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

                {/* Vignette */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 800 }}>
                    <span>Vignette Edge</span>
                    <span>{vignette}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={vignette}
                    onChange={(e) => setVignette(Number(e.target.value))}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                  <button
                    onClick={handleDownload}
                    disabled={!finalResultUrl || isRendering}
                    className="neo-btn neo-btn-primary"
                    style={{ width: "100%", padding: "14px 20px", fontSize: "1rem" }}
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
                    className="neo-btn neo-btn-secondary"
                    style={{ width: "100%", padding: "10px 16px", fontSize: "0.88rem" }}
                  >
                    <RotateCcw size={16} />
                    <span>Foto Ulang Sesi Ini</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
