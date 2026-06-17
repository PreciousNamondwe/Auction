"use client";

import { useState, useEffect } from "react";
import { Track } from "livekit-client";
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, Sparkles } from "lucide-react";
import VideoFeedElement from "./VideoFeedElement";

export default function StreamCanvas({ roomId, room, tracks, onLeave }) {
  // Set default hardware values to false until explicitly captured
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCamOn, setIsCamOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [mediaError, setMediaError] = useState("");

  // Safely initialize devices sequentially AFTER room connection finishes to prevent Timeout AbortErrors
  useEffect(() => {
    if (!room) return;

    async function initMediaDevices() {
      try {
        // Request Microphone access with caught failures
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          setIsMicOn(true);
        } catch (micErr) {
          console.warn("Microphone setup blocked or timed out:", micErr);
        }

        // Request Camera access with caught failures
        try {
          await room.localParticipant.setCameraEnabled(true);
          setIsCamOn(true);
        } catch (camErr) {
          console.warn("Camera setup blocked or timed out:", camErr);
          setMediaError("Camera device timeout. Please verify system permissions.");
        }
      } catch (err) {
        console.error("Hardware runtime connection breakdown:", err);
      }
    }

    initMediaDevices();
  }, [room]);

  const handleToggleMic = async () => {
    if (!room) return;
    try {
      const targetState = !isMicOn;
      await room.localParticipant.setMicrophoneEnabled(targetState);
      setIsMicOn(targetState);
    } catch (err) {
      console.error("Microphone hardware toggling failure:", err);
    }
  };

  const handleToggleCam = async () => {
    if (!room) return;
    try {
      const targetState = !isCamOn;
      await room.localParticipant.setCameraEnabled(targetState);
      setIsCamOn(targetState);
      setMediaError("");
    } catch (err) {
      console.error("Camera hardware toggling failure:", err);
      setMediaError("Could not start video source.");
    }
  };

  const handleToggleScreenShare = async () => {
    if (!room) return;
    try {
      const targetState = !isScreenSharing;
      await room.localParticipant.setScreenShareEnabled(targetState);
      setIsScreenSharing(targetState);
    } catch (err) {
      console.error("Screen hardware allocation exception handling:", err);
    }
  };

  const screenShareFeed = tracks.find((t) => t.source === Track.Source.ScreenShare);
  const videoFeeds = tracks.filter((t) => t.source === Track.Source.Camera);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-[55%] lg:h-full gap-4 relative">
      
      {/* Title Header Block */}
      <div className="w-full flex items-center justify-between z-10 shrink-0">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)] animate-pulse" />
            <span className="text-[10px] font-bold text-purple-400 tracking-widest uppercase">Live Auction Terminal</span>
          </div>
          <h1 className="text-sm font-bold text-white tracking-wide">
            ROOM PATHWAY: <span className="font-mono text-purple-300 ml-1 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.05]">{roomId}</span>
          </h1>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3)] px-3 py-1.5 rounded-xl flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-semibold text-purple-200">Glassmorphic Node</span>
        </div>
      </div>

      {/* Main Immersive Canvas Area */}
      <div className="flex-1 w-full relative min-h-0 rounded-2xl overflow-hidden bg-white/[0.01] border border-white/[0.05] backdrop-blur-sm p-3 box-border flex flex-col justify-center">
        
        {mediaError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-rose-500/90 text-white text-[11px] px-3 py-1 rounded-lg border border-rose-400 shadow-lg backdrop-blur-sm font-medium animate-bounce">
            ⚠️ {mediaError}
          </div>
        )}

        {screenShareFeed ? (
          <div className="w-full h-full flex flex-col gap-3 overflow-hidden">
            <div className="flex-1 w-full bg-black/40 rounded-xl overflow-hidden border border-white/[0.05] relative shadow-2xl flex items-center justify-center min-h-0">
              <VideoFeedElement track={screenShareFeed.track} />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/[0.08] text-[10px] px-2.5 py-1 rounded-lg text-purple-200 font-bold uppercase tracking-wider">
                Active Screen Presentation
              </div>
            </div>

            <div className="h-20 shrink-0 flex items-center gap-3 overflow-x-auto pt-1 scrollbar-none">
              {videoFeeds.map((feed, i) => (
                <div key={i} className="w-36 h-full bg-black/40 rounded-xl overflow-hidden border border-white/[0.05] relative shrink-0 shadow-lg">
                  <VideoFeedElement track={feed.track} isLocal={feed.participant?.isLocal} />
                  <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-md text-[10px] px-2 py-0.5 rounded-md border border-white/[0.05] text-purple-100 font-medium max-w-[90%] truncate">
                    {feed.participant?.name || feed.participant?.identity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : videoFeeds.length <= 1 ? (
          <div className="w-full h-full bg-black/20 rounded-xl overflow-hidden relative shadow-2xl border border-white/[0.05] flex items-center justify-center">
            {videoFeeds[0] ? (
              <>
                <VideoFeedElement track={videoFeeds[0].track} isLocal={videoFeeds[0].participant?.isLocal} />
                <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-xl border border-white/[0.08] px-3 py-1.5 rounded-xl text-white text-xs font-semibold tracking-wide shadow-xl">
                  {videoFeeds[0].participant?.name || videoFeeds[0].participant?.identity}
                </div>
              </>
            ) : (
              <div className="text-[11px] font-bold text-purple-400/40 uppercase tracking-widest animate-pulse">Awaiting Broadcast Feeds...</div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col gap-3">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full h-full min-h-0">
              {videoFeeds.slice(0, 2).map((feed, i) => (
                <div key={i} className="bg-black/20 rounded-xl overflow-hidden relative border border-white/[0.05] shadow-xl flex items-center justify-center">
                  <VideoFeedElement track={feed.track} isLocal={feed.participant?.isLocal} />
                  <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-xl border border-white/[0.08] px-2.5 py-1.5 rounded-xl text-white text-xs font-semibold max-w-[85%] truncate">
                    {feed.participant?.name || feed.participant?.identity}
                  </div>
                </div>
              ))}
            </div>
            {videoFeeds.length > 2 && (
              <div className="h-20 shrink-0 flex items-center gap-2 overflow-x-auto scrollbar-none">
                {videoFeeds.slice(2).map((feed, i) => (
                  <div key={i} className="w-36 h-full bg-black/40 rounded-xl overflow-hidden border border-white/[0.05] relative shrink-0">
                    <VideoFeedElement track={feed.track} isLocal={feed.participant?.isLocal} />
                    <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-md text-[10px] px-2 py-0.5 rounded border border-white/[0.05] text-purple-100 font-medium max-w-[90%] truncate">
                      {feed.participant?.name || feed.participant?.identity}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Switchboard Controller Ribbon */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-3 bg-white/[0.02] backdrop-blur-2xl px-4 py-2.5 rounded-2xl border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            
            <button
              type="button"
              onClick={handleToggleMic}
              className={`p-2.5 rounded-xl transition-all border outline-none ${
                isMicOn ? "bg-white/[0.04] border-white/[0.05] text-purple-200 hover:text-white hover:bg-white/[0.1]" : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}
            >
              {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleToggleCam}
              className={`p-2.5 rounded-xl transition-all border border-transparent border-white/[0.05] ${
                isCamOn ? "bg-white/[0.04] text-purple-200 hover:text-white hover:bg-white/[0.1]" : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}
            >
              {isCamOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleToggleScreenShare}
              className={`p-2.5 rounded-xl transition-all border outline-none ${
                isScreenSharing ? "bg-purple-600/80 border-purple-500/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]" : "bg-white/[0.04] border-white/[0.05] text-purple-200 hover:text-white hover:bg-white/[0.1]"
              }`}
            >
              <Monitor className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-4 bg-white/[0.1] mx-0.5" />

            <button
              type="button"
              onClick={onLeave}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-red-500/30 shadow-md uppercase tracking-wider"
            >
              <PhoneOff className="w-3.5 h-3.5" /> Leave
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}