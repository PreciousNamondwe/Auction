"use client";

import { useEffect, useState, use, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getLiveKitToken, submitLiveBid } from "@/app/actions/liveAuction";
import { Room, Track, RoomEvent } from "livekit-client";
import { 
  Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, 
  Gavel, Tag, Search, MessageSquare, Sparkles, Volume2, Coins, Users, ShieldAlert
} from "lucide-react";
import Pusher from "pusher-js";

export default function LiveRoomPage({ params }) {
  const unpackedParams = use(params);
  const roomId = unpackedParams.roomId;
  const searchParams = useSearchParams();
  const auctionItemId = searchParams.get("id");
  const router = useRouter();
  
  // UI & LiveKit Streams Sync State Engine
  const [token, setToken] = useState("");
  const [bids, setBids] = useState([]);
  const [activeTab, setActiveTab] = useState("bids"); 
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [tracks, setTracks] = useState([]);
  
  // Local User Context Cache derived from LiveKit Access Token Client-Side
  const [currentUserRole, setCurrentUserRole] = useState("BIDDER"); 
  const [bidAmountInput, setBidAmountInput] = useState("");
  const [bidError, setBidError] = useState("");
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);

  // Interface Toggle Hardware Switches
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Concurrent Execution Lock Reference
  const connectingRef = useRef(false);

  // Pusher Real-Time Bid Tracker Pipeline
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

  // Authenticated Token Generation Handshake Hooks
  useEffect(() => {
    async function fetchRoomPass() {
      try {
        const res = await getLiveKitToken(roomId, auctionItemId);
        if (res.success) {
          setToken(res.token);
          
          // Secure client-side payload inspection to derive user roles
          try {
            const base64Url = res.token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const parsedToken = JSON.parse(jsonPayload);
            if (parsedToken.sub && parsedToken.sub.startsWith("auctioneer")) {
              setCurrentUserRole("AUCTIONEER");
            } else if (parsedToken.sub && parsedToken.sub.startsWith("admin")) {
              setCurrentUserRole("ADMIN");
            } else {
              setCurrentUserRole("BIDDER");
            }
          } catch (e) {
            console.error("Token structure parsing error:", e);
          }
        }
      } catch (err) {
        console.error("Authentication handshake failure:", err);
      }
    }
    if (roomId) fetchRoomPass();
  }, [roomId, auctionItemId]);

  // LiveKit Core Engine Lifecycle Hook
  useEffect(() => {
    if (!token || !process.env.NEXT_PUBLIC_LIVEKIT_URL) return;
    
    // Prevent double initialization errors (Code 1006) caused by React Strict Mode
    if (connectingRef.current) return;
    connectingRef.current = true;

    const liveKitRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    const getRemoteParticipantsArray = (roomInstance) => {
      if (!roomInstance || !roomInstance.remoteParticipants) return [];
      const rp = roomInstance.remoteParticipants;
      return typeof rp.values === "function" ? Array.from(rp.values()) : Object.values(rp);
    };

    async function connectToRoom() {
      try {
        await liveKitRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL, token);
        setRoom(liveKitRoom);
        
        await liveKitRoom.localParticipant.setMicrophoneEnabled(true);
        await liveKitRoom.localParticipant.setCameraEnabled(true);

        const updateParticipantsAndTracks = () => {
          const remotePeers = getRemoteParticipantsArray(liveKitRoom);
          const allParticipants = liveKitRoom.localParticipant ? [liveKitRoom.localParticipant, ...remotePeers] : remotePeers;
          setParticipants(allParticipants);
          
          const allTracks = [];
          remotePeers.forEach((p) => {
            p?.trackPublications?.forEach((pub) => {
              if (pub.track && pub.isSubscribed) allTracks.push({ participant: p, track: pub.track, source: pub.source });
            });
          });
          
          liveKitRoom.localParticipant?.trackPublications?.forEach((pub) => {
            if (pub.track) allTracks.push({ participant: liveKitRoom.localParticipant, track: pub.track, source: pub.source });
          });
          
          setTracks(allTracks);
        };

        liveKitRoom
          .on(RoomEvent.ParticipantConnected, updateParticipantsAndTracks)
          .on(RoomEvent.ParticipantDisconnected, updateParticipantsAndTracks)
          .on(RoomEvent.TrackSubscribed, updateParticipantsAndTracks)
          .on(RoomEvent.TrackUnsubscribed, updateParticipantsAndTracks)
          .on(RoomEvent.LocalTrackPublished, updateParticipantsAndTracks)
          .on(RoomEvent.LocalTrackUnpublished, updateParticipantsAndTracks)
          .on(RoomEvent.ActiveSpeakersChanged, () => {
            const remotePeers = getRemoteParticipantsArray(liveKitRoom);
            setParticipants(liveKitRoom.localParticipant ? [liveKitRoom.localParticipant, ...remotePeers] : remotePeers);
          });

        updateParticipantsAndTracks();
      } catch (error) {
        console.error("LiveKit running instance execution fault:", error);
        connectingRef.current = false;
      }
    }

    connectToRoom();
    
    return () => { 
      liveKitRoom.disconnect(); 
      connectingRef.current = false;
    };
  }, [token]);

  // Handle Bid Submission Click Action
  const handlePlaceBidSubmit = async (e) => {
    e.preventDefault();
    setBidError("");
    if (!bidAmountInput || isNaN(parseFloat(bidAmountInput))) {
      setBidError("Please input a valid numeric amount.");
      return;
    }

    try {
      setIsSubmittingBid(true);
      const res = await submitLiveBid(auctionItemId, bidAmountInput);
      if (res.success) {
        setBidAmountInput("");
        setBidError("");
      }
    } catch (err) {
      setBidError(err.message || "Failed to process live bid action.");
    } finally {
      setIsSubmittingBid(false);
    }
  };

  // Interactive Switching Callbacks
  const handleToggleMic = async () => {
    if (!room) return;
    setIsMicOn(!isMicOn);
    await room.localParticipant.setMicrophoneEnabled(!isMicOn);
  };

  const handleToggleCam = async () => {
    if (!room) return;
    setIsCamOn(!isCamOn);
    await room.localParticipant.setCameraEnabled(!isCamOn);
  };

  const handleToggleScreenShare = async () => {
    if (!room) return;
    try {
      setIsScreenSharing(!isScreenSharing);
      await room.localParticipant.setScreenShareEnabled(!isScreenSharing);
    } catch (err) {
      console.error("Screen hardware allocation exception handling:", err);
    }
  };

  const handleLeaveRoom = () => {
    if (room) room.disconnect();
    router.push("/dashboard");
  };

  if (!token || !room) {
    return (
      <div className="h-screen w-screen bg-[#06040a] flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-10 h-10 rounded-full border-4 border-purple-900/40 border-t-purple-400 animate-spin" />
        <p className="text-xs font-mono tracking-widest text-purple-300/80 uppercase">Connecting Secure Stream Channel...</p>
      </div>
    );
  }

  const screenShareFeed = tracks.find((t) => t.source === Track.Source.ScreenShare);
  const videoFeeds = tracks.filter((t) => t.source === Track.Source.Camera);

  return (
    <div className="h-screen w-screen bg-[#07050d] text-purple-100 flex flex-col lg:flex-row overflow-hidden font-sans p-4 lg:p-6 gap-5 relative antialiased">
      
      {/* Background Ambience Orbs */}
      <div className="absolute top-12 left-12 w-[450px] h-[450px] bg-purple-600/10 rounded-full filter blur-[140px] pointer-events-none" />
      <div className="absolute bottom-12 right-12 w-[350px] h-[350px] bg-fuchsia-600/5 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Audio Element Node Renderer */}
      <AudioRenderer tracks={tracks} />

      {/* =========================================================
          LEFT PANEL: IMMERSIVE STREAM CANVAS AREA
          ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 h-[55%] lg:h-full gap-4 relative">
        
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

        <div className="flex-1 w-full relative min-h-0 rounded-2xl overflow-hidden bg-white/[0.01] border border-white/[0.05] backdrop-blur-sm p-3 box-border flex flex-col justify-center">
          
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

          {/* Switchboard Floating Controls Row */}
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
                className={`p-2.5 rounded-xl transition-all border outline-none ${
                  isCamOn ? "bg-white/[0.04] border-white/[0.05] text-purple-200 hover:text-white hover:bg-white/[0.1]" : "bg-red-500/10 border-red-500/20 text-red-400"
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
                onClick={handleLeaveRoom}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-red-500/30 shadow-md uppercase tracking-wider"
              >
                <PhoneOff className="w-3.5 h-3.5" /> Leave
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* =========================================================
          RIGHT PANEL: COMPREHENSIVE CONTROL DESK SIDEBAR
          ========================================================= */}
      <div className="flex-1 lg:flex-none lg:w-80 xl:w-96 bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] rounded-2xl flex flex-col h-[45%] lg:h-full min-h-0 shadow-[0_24px_60px_rgba(0,0,0,0.4)] overflow-hidden shrink-0 z-30">
        
        <div className="flex items-center justify-between p-3 border-b border-white/[0.05] shrink-0 bg-white/[0.01]">
          <span className="text-[10px] uppercase tracking-widest text-purple-400 font-bold ml-1">Room Deck</span>
          <div className="flex items-center bg-black/20 p-1 rounded-xl border border-white/[0.04]">
            <button 
              onClick={() => setActiveTab("bids")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "bids" ? "bg-white/[0.06] text-white shadow-sm border border-white/[0.05]" : "text-purple-400 hover:text-purple-200"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Bids Log
            </button>
            
            <button 
              onClick={() => setActiveTab("people")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "people" ? "bg-white/[0.06] text-white shadow-sm border border-white/[0.05]" : "text-purple-400 hover:text-purple-200"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Active ({participants.length})
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeTab === "bids" ? (
            <div className="flex-1 flex flex-col min-h-0 justify-between">
              
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-4 mx-3 mt-3 bg-gradient-to-br from-white/[0.03] to-transparent rounded-xl border border-white/[0.05] flex items-center justify-between shadow-inner shrink-0">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-purple-400 font-bold flex items-center gap-1">
                      <Coins className="w-3 h-3" /> Top Entry Amount
                    </span>
                    <span className="text-base font-bold text-white tracking-tight font-mono">
                      MWK {bids.length > 0 ? Number(bids[0].amount).toLocaleString() : "0.00"}
                    </span>
                  </div>
                  <div className="text-right flex flex-col gap-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-purple-400 font-bold">Velocity</span>
                    <span className="text-xs font-bold text-purple-300 font-mono">{bids.length} placed</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-none min-h-0">
                  {bids.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-purple-500/40">
                      <Tag className="w-4 h-4 mb-2 opacity-50" />
                      <span className="text-xs">Waiting for room entries...</span>
                    </div>
                  ) : (
                    bids.map((bid, idx) => (
                      <div key={bid.id || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all shadow-sm">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {bid.bidderName ? bid.bidderName.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-medium text-white truncate">{bid.bidderName}</p>
                            <p className="text-[9px] text-purple-400/60 font-medium tracking-wider uppercase">Verified Room Connection</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-white font-mono shrink-0 pl-2">
                          MWK {Number(bid.amount).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Secure Action Interactive Input Form Footer Strip */}
              <div className="p-3 bg-black/30 border-t border-white/[0.05] shrink-0">
                {currentUserRole === "BIDDER" ? (
                  <form onSubmit={handlePlaceBidSubmit} className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-purple-500">
                          MWK
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={bidAmountInput}
                          onChange={(e) => setBidAmountInput(e.target.value)}
                          placeholder="Enter higher value amount..."
                          disabled={isSubmittingBid}
                          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl pl-14 pr-3 py-2.5 font-mono text-sm text-white focus:outline-none focus:border-purple-500 focus:bg-white/[0.04] transition-all placeholder-purple-700/60 disabled:opacity-50"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmittingBid}
                        className="px-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(168,85,247,0.3)] border border-purple-500/20 shrink-0 disabled:opacity-50"
                      >
                        <Gavel className="w-3.5 h-3.5" /> Place Bid
                      </button>
                    </div>
                    {bidError && (
                      <p className="text-[11px] font-medium text-rose-400 pl-1 animate-pulse">
                        ⚠️ {bidError}
                      </p>
                    )}
                  </form>
                ) : (
                  <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-900/40 flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-purple-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white uppercase tracking-wide">Observer Mode Active</p>
                      <p className="text-[10px] text-purple-400/80 leading-relaxed">Your authorization tier restricts entry creation inside this asset lot slot.</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-3 shrink-0">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 absolute left-3 text-purple-500 pointer-events-none" />
                  <input 
                    type="text" 
                    placeholder="Search connection identities..."
                    className="w-full pl-8 pr-4 py-1.5 bg-black/20 border border-white/[0.05] rounded-xl text-xs placeholder-purple-700 text-purple-100 focus:outline-none focus:border-white/[0.12] transition-colors"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 min-h-0 scrollbar-none">
                {participants.map((p, i) => {
                  const isLocal = room && p.identity === room.localParticipant?.identity;
                  return (
                    <div key={p.sid || i} className="p-2 rounded-xl flex items-center justify-between gap-3 hover:bg-white/[0.02] border border-transparent hover:border-white/[0.04] transition-all group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-white/[0.03] border border-white/[0.05] text-purple-300 text-xs font-bold flex items-center justify-center shrink-0">
                          {p.name ? p.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-purple-100 truncate">
                            {p.name || p.identity} {isLocal && <span className="text-[9px] text-purple-400 font-bold ml-1 uppercase opacity-80">(You)</span>}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center shrink-0">
                        {p.isSpeaking ? (
                          <div className="w-5 h-5 rounded-md bg-purple-500/10 flex items-center justify-center border border-purple-500/20 animate-pulse">
                            <Volume2 className="w-3 h-3 text-purple-400" />
                          </div>
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-white/10 mx-2" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

function VideoFeedElement({ track, isLocal = false }) {
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

function AudioRenderer({ tracks }) {
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

  return <div ref={audioContainerRef} className="hidden" />;
}