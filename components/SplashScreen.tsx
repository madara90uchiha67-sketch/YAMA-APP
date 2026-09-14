"use client";

import React, { useEffect, useRef, useState } from "react";

interface SplashScreenProps {
  onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.2;
    }
  }, []);

  const handleVideoReady = () => {
    setIsReady(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play();
        }
      });
    }
  };

  const handleUserInteraction = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
    }
  };

  return (
    <div
      onClick={handleUserInteraction}
      onTouchStart={handleUserInteraction}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000000",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: "65%",
          maxWidth: "220px", // Tamaño equilibrado y elegante (220px)
          maxHeight: "220px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          opacity: isReady ? 1 : 0,
          transition: "opacity 0.2s ease-in-out",
        }}
      >
        <video
          ref={videoRef}
          src="/1789392725096.mp4"
          playsInline
          preload="auto"
          onLoadedData={handleVideoReady}
          onEnded={onFinish}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            borderRadius: "10px",
            backgroundColor: "#000000",
            transform: "translate3d(0, 0, 0)",
            backfaceVisibility: "hidden",
          }}
        />
      </div>
    </div>
  );
}
