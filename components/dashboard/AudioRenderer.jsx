"use client";

import { useEffect, useRef } from "react";
import { Track } from "livekit-client";

export default function AudioRenderer({ tracks }) {
  const audioContainerRef = useRef(null);

  useEffect(() => {
    if (!audioContainerRef.current) return;
    const container = audioContainerRef.current;
    const activeElements = [];

    tracks.forEach((item) => {
      if (item.source === Track.Source.Microphone && !item.participant?.isLocal) {
        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        audioEl.playsInline = true;
        item.track.attach(audioEl);
        container.appendChild(audioEl);
        activeElements.push({ track: item.track, element: audioEl });
      }
    });

    return () => {
      activeElements.forEach((ae) => {
        ae.track.detach(ae.element);
        ae.element.remove();
      });
    };
  }, [tracks]);

  return <div ref={audioContainerRef} className="hidden invisible pointer-events-none" />;
}