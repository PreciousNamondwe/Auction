"use client";

import { useEffect, useRef } from "react";

export default function VideoFeedElement({ track, isLocal = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current || !track) return;
    const el = videoRef.current;
    track.attach(el);
    return () => { track.detach(el); };
  }, [track]);

  return (
    <video 
      ref={videoRef} 
      autoPlay 
      playsInline 
      className={`w-full h-full object-cover ${isLocal ? "transform scale-x-[-1]" : ""}`} 
    />
  );
}