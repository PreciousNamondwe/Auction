// app/auctions/live/[roomId]/page.jsx
"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getLiveKitToken } from "@/app/actions/liveAuction";
import { 
  LiveKitRoom, 
  RoomAudioRenderer, 
  VideoTrack,
  useTracks,
  useLocalParticipant,
  useRoomContext,
  useParticipants
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { 
  Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, 
  Loader2, Gavel, Users, DollarSign, TrendingUp, Clock, User
} from "lucide-react";
import Pusher from "pusher-js";

export default function LiveRoomPage({ params }) {
  const unpackedParams = use(params);
  const roomId = unpackedParams.roomId;
  const searchParams = useSearchParams();
  const auctionItemId = searchParams.get("id");
  const router = useRouter();
  
  const [token, setToken] = useState("");
  const [bids, setBids] = useState([]);

  // Live WebSocket synchronization framework for global bid distribution
  useEffect(() => {
    if (!auctionItemId) return;

    const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "",
    });

    const channelName = `auction-room-${auctionItemId}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind("new-bid", (incomingBid) => {
      setBids((prev) => [incomingBid, ...prev]);
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(channelName);
    };
  }, [auctionItemId]);

  useEffect(() => {
    async function fetchRoomPass() {
      try {
        const res = await getLiveKitToken(roomId, auctionItemId);
        if (res.success) setToken(res.token);
      } catch (err) {
        console.error("Authentication check failed", err);
      }
    }
    if (roomId) fetchRoomPass();
  }, [roomId, auctionItemId]);

  if (!token) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs font-medium tracking-wide text-slate-400">Securing real-time WebRTC media tokens...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex overflow-hidden font-sans select-none">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        onDisconnected={() => router.push("/dashboard")}
      >
        {/* Single-Page Split Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 h-full w-full overflow-hidden">
          
          {/* =========================================================
              LEFT COLUMN (3 PARTS): MAIN GOOGLE MEET MEDIA CANVAS
              ========================================================= */}
          <div className="lg:col-span-3 flex flex-col h-full min-h-0 relative bg-slate-900">
            
            {/* Floating Room Info Banner */}
            <div className="absolute top-4 left-4 z-20 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 shadow-xl flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <div className="flex items-center gap-1.5 text-xs font-black tracking-wider uppercase text-slate-200">
                <Gavel className="w-3.5 h-3.5 text-indigo-400" /> Room Ref: {roomId}
              </div>
            </div>

            {/* Google Meet Grid Core Area */}
            <div className="flex-1 w-full min-h-0 p-4 lg:p-6 flex flex-col justify-between">
              <div className="flex-1 w-full flex items-center justify-center min-h-0">
                <MeetVideoGrid />
              </div>
              
              {/* Media Control System Anchor Deck */}
              <div className="pt-4 shrink-0">
                <MeetControls />
              </div>
            </div>

          </div>

          {/* =========================================================
              RIGHT COLUMN (1 PART): SIDEBAR LEDGER & MEMBERS ATTENDANCE
              ========================================================= */}
          <div className="lg:col-span-1 bg-slate-950 border-l border-slate-800 flex flex-col h-full min-h-0">
            
            {/* Section A: Live Bid Ledger Tracking */}
            <div className="flex-1 flex flex-col min-h-[50%] border-b border-slate-800">
              <div className="p-4 border-b border-slate-800 bg-slate-900/40 shrink-0">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Bid Ledger Desk</h2>
                </div>
              </div>

              {/* Real-time Bid Row Loop Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-0 scrollbar-thin scrollbar-thumb-slate-800">
                {bids.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <DollarSign className="w-5 h-5 text-slate-600 animate-pulse mb-1" />
                    <h4 className="text-xs font-semibold text-slate-400">Awaiting Offers</h4>
                  </div>
                ) : (
                  bids.map((bid, idx) => (
                    <div key={bid.id || idx} className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${idx === 0 ? "bg-emerald-950/20 border-emerald-500/40" : "bg-slate-900/50 border-slate-800"}`}>
                      <div>
                        <p className="text-xs font-bold text-slate-200 truncate">{bid.bidderName}</p>
                        <span className="text-[10px] text-slate-500">{bid.createdAt ? new Date(bid.createdAt).toLocaleTimeString() : "Just Now"}</span>
                      </div>
                      <span className={`text-xs font-black ${idx === 0 ? "text-emerald-400" : "text-slate-300"}`}>
                        MWK {Number(bid.amount).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section B: Google Meet Active Participant List */}
            <div className="flex-1 flex flex-col min-h-[50%]">
              <MeetAttendanceList />
            </div>

          </div>

        </div>

        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

// 1. TRUE OPEN GOOGLE MEET MULTI-CAMERA TILES GRID
function MeetVideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false }
    ],
    { onlySubscribed: false }
  );

  const screenShareTrack = tracks.find(t => t.source === Track.Source.ScreenShare);
  const cameraTracks = tracks.filter(t => t.source === Track.Source.Camera);

  // If anyone toggles screensharing, switch to presentation viewport setup
  if (screenShareTrack) {
    return (
      <div className="w-full h-full grid grid-cols-1 xl:grid-cols-4 gap-4 overflow-hidden">
        <div className="xl:col-span-3 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative flex items-center justify-center">
          <VideoTrack trackRef={screenShareTrack} className="w-full h-full object-contain" />
          <div className="absolute bottom-4 left-4 bg-slate-950/90 text-xs px-3 py-1.5 rounded-xl border border-slate-700/80 font-bold">
            {screenShareTrack.participant.identity}’s Screen Share
          </div>
        </div>

        <div className="xl:col-span-1 flex flex-row xl:flex-col gap-3 overflow-x-auto xl:overflow-y-auto min-h-0">
          {cameraTracks.map((track) => (
            <div key={track.sid || track.participant.identity} className="w-44 xl:w-full h-28 xl:h-36 shrink-0 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative">
              <VideoTrack trackRef={track} className={`w-full h-full object-cover ${track.participant.isLocal ? "transform scale-x-[-1]" : ""}`} />
              <div className="absolute bottom-2 left-2 bg-black/70 text-[10px] px-2 py-0.5 rounded-md font-semibold truncate max-w-[85%]">
                {track.participant.identity.includes("auctioneer") ? "🎙️ Auctioneer" : track.participant.identity}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Symmetric layout architecture for all connected peers to communicate face-to-face
  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <div className={`grid w-full h-full gap-4 max-w-6xl mx-auto
        ${cameraTracks.length <= 1 ? "grid-cols-1" : cameraTracks.length <= 2 ? "grid-cols-1 md:grid-cols-2" : cameraTracks.length <= 4 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3"}
      `}>
        {cameraTracks.map((track) => {
          const isAuctioneer = track.participant.identity.includes("auctioneer");
          return (
            <div 
              key={track.sid || track.participant.identity} 
              className={`bg-slate-950 rounded-2xl overflow-hidden relative flex items-center justify-center shadow-2xl transition-all border ${
                isAuctioneer ? "border-indigo-500/60 ring-2 ring-indigo-500/20" : "border-slate-800/80"
              }`}
            >
              <VideoTrack 
                trackRef={track} 
                className={`w-full h-full object-cover ${track.participant.isLocal ? "transform scale-x-[-1]" : ""}`} 
              />
              <div className={`absolute bottom-3 left-3 backdrop-blur-md text-xs font-semibold px-3 py-1.5 rounded-xl border ${
                isAuctioneer ? "bg-indigo-950/90 text-indigo-300 border-indigo-500/40" : "bg-slate-900/90 text-slate-200 border-slate-800"
              }`}>
                {isAuctioneer ? "⭐ Auctioneer (Host)" : track.participant.isLocal ? "You" : track.participant.identity}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 2. REAL-TIME WHO IS IN THE ROOM PRESENCE ROSTER
function MeetAttendanceList() {
  const participants = useParticipants(); // Active WebRTC state tracker loop array

  return (
    <>
      <div className="p-4 border-b border-slate-800 bg-slate-900/40 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Room Call Roster</h2>
        </div>
        <span className="px-2 py-0.5 text-3xs font-extrabold rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
          {participants.length} Active
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0 scrollbar-thin scrollbar-thumb-slate-800">
        {participants.map((p) => {
          const isAuctioneer = p.identity.includes("auctioneer");
          return (
            <div key={p.sid} className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-1.5 rounded-lg border ${isAuctioneer ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-300 truncate">
                    {p.isLocal ? `${p.name || p.identity} (You)` : p.name || p.identity}
                  </p>
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500 mt-0.5">
                    {isAuctioneer ? "Presiding Host" : "Verified Bidder"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`w-1.5 h-1.5 rounded-full ${p.isSpeaking ? "bg-emerald-400 animate-bounce" : "bg-slate-600"}`} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// 3. DOCK BAR PRESET (Mic/Camera control actions toggle input globally)
function MeetControls() {
  const { isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled, localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  return (
    <div className="w-full flex items-center justify-between bg-slate-950 px-5 py-3.5 rounded-2xl border border-slate-800 shadow-2xl max-w-2xl mx-auto z-10">
      
      <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-bold tracking-wide">
        <Users className="w-4 h-4" />
        <span className="uppercase text-[10px] tracking-widest">WebRTC Node</span>
      </div>

      <div className="flex items-center gap-3.5 mx-auto sm:mx-0">
        <button
          type="button"
          onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
          className={`p-3 rounded-xl transition-all border ${isMicrophoneEnabled ? "bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800" : "bg-red-500/10 border-red-500/20 text-red-400"}`}
        >
          {isMicrophoneEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
          className={`p-3 rounded-xl transition-all border ${isCameraEnabled ? "bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800" : "bg-red-500/10 border-red-500/20 text-red-400"}`}
        >
          {isCameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => localParticipant.setScreenShareEnabled(!isScreenShareEnabled)}
          className={`p-3 rounded-xl transition-all border ${isScreenShareEnabled ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800"}`}
          title="Share screen display"
        >
          <Monitor className="w-4 h-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => room.disconnect()}
        className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all border border-red-700 shadow-md shadow-red-900/20"
      >
        <PhoneOff className="w-4 h-4" />
      </button>

    </div>
  );
}