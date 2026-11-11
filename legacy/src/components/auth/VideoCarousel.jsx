import React, { useState, useRef } from "react";

export default function VideoCarousel({ videos, className = "" }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const videoRef = useRef(null);

  const goTo = (idx) => {
    setCurrentIdx((idx + videos.length) % videos.length);
  };

  const handleEnded = () => {
    goTo(currentIdx + 1);
  };

  return (
    <div className={`relative flex flex-col ${className}`}>
      {/* Video frame */}
      <div className="flex-1 min-h-0 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-2 shadow-xl overflow-hidden">
        <div key={currentIdx} className="popover-fade h-full">
          <video
            ref={videoRef}
            src={videos[currentIdx]}
            autoPlay
            muted
            playsInline
            onEnded={handleEnded}
            className="w-full h-full max-h-full object-contain rounded-xl"
          />
        </div>
      </div>

      {/* Dots indicator */}
      <div className="flex items-center justify-center gap-2 mt-3 flex-shrink-0">
        {videos.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Vidéo ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentIdx
                ? "w-6 bg-emerald-400"
                : "w-1.5 bg-white/30 hover:bg-white/50"
            }`}
            style={{ minHeight: "unset", minWidth: "unset" }}
          />
        ))}
      </div>
    </div>
  );
}