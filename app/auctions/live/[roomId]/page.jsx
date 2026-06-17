"use client";

import { useEffect, useState, use, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getLiveKitToken } from "@/app/actions/liveAuction";
import { Room, RoomEvent } from "livekit-client";
import Pusher from "pusher-js";

// Sub-Component Imports targeted to your absolute components path
import StreamCanvas from "@/components/dashboard/StreamCanvas";
import DeckSidebar from "@/components/dashboard/DeckSidebar";
import AudioRenderer from "@/components/dashboard/AudioRenderer";

export default function LiveRoomPage({ params }) {
  const unpackedParams = use(params);
  const roomId = unpackedParams.roomId;
  const searchParams = useSearchParams();
  const auctionItemId = searchParams.get("id");
  const router = useRouter();
  
  // Immersive Connection & Synchronization State
  const [token, setToken] = useState("");
  const [bids, setBids] = useState([]);
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState("BIDDER"); 
  const [bidError, setBidError] = useState("");

  // Concurrent Execution Locks to stop premature "Client initiated disconnect"
  const connectingRef = useRef(false);
  const disconnectRef = useRef(false);

  // Pusher Real-Time Bid Sync Pipeline
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

  // Authenticated Token Handshake Engine
  useEffect(() => {
    async function fetchRoomPass() {
      try {
        const res = await getLiveKitToken(roomId, auctionItemId);
        if (res && res.success) {
          setToken(res.token);
          
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
        } else {
          setBidError(res?.error || "Could not acquire a valid system access token pass.");
        }
      } catch (err) {
        console.error("Authentication handshake failure:", err);
        setBidError("Network layer rejected authorization validation process.");
      }
    }
    if (roomId) fetchRoomPass();
  }, [roomId, auctionItemId]);

  // LiveKit WebRTC Core Infrastructure Hook
  useEffect(() => {
    if (!token || !process.env.NEXT_PUBLIC_LIVEKIT_URL) return;
    if (connectingRef.current) return;
    connectingRef.current = true;
    disconnectRef.current = false;

    const liveKitRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      // Extends time limit parameters for connecting media streams
      publishDefaults: {
        timeout: 15000, 
      }
    });

    const getRemoteParticipantsArray = (roomInstance) => {
      if (!roomInstance || !roomInstance.remoteParticipants) return [];
      const rp = roomInstance.remoteParticipants;
      return typeof rp.values === "function" ? Array.from(rp.values()) : Object.values(rp);
    };

    async function connectToRoom() {
      try {
        await liveKitRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL, token);
        
        // Safety guard against quick React remounts
        if (disconnectRef.current) {
          liveKitRoom.disconnect();
          return;
        }

        setRoom(liveKitRoom);

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
        console.error("LiveKit execution fault:", error);
        connectingRef.current = false;
      }
    }

    connectToRoom();
    
    return () => { 
      disconnectRef.current = true;
      if (liveKitRoom) {
        liveKitRoom.disconnect();
      }
      connectingRef.current = false;
    };
  }, [token]);

  // Handle Action Router Exits
  const handleLeaveRoom = () => {
    if (room) room.disconnect();
    router.push("/dashboard");
  };

  if (!token || !room) {
    return (
      <div className="h-screen w-screen bg-[#06040a] flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-10 h-10 rounded-full border-4 border-purple-900/40 border-t-purple-400 animate-spin" />
        <p className="text-xs font-mono tracking-widest text-purple-300/80 uppercase">Connecting Secure Stream Channel...</p>
        {bidError && <p className="text-xs text-rose-400 font-sans max-w-sm text-center">⚠️ {bidError}</p>}
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#07050d] text-purple-100 flex flex-col lg:flex-row overflow-hidden font-sans p-4 lg:p-6 gap-5 relative antialiased">
      
      <div className="absolute top-12 left-12 w-[450px] h-[450px] bg-purple-600/10 rounded-full filter blur-[140px] pointer-events-none" />
      <div className="absolute bottom-12 right-12 w-[350px] h-[350px] bg-fuchsia-600/5 rounded-full filter blur-[100px] pointer-events-none" />

      <AudioRenderer tracks={tracks} />

      <StreamCanvas 
        roomId={roomId}
        room={room}
        tracks={tracks}
        onLeave={handleLeaveRoom}
      />

      <DeckSidebar 
        room={room}
        bids={bids}
        participants={participants}
        auctionItemId={auctionItemId}
        currentUserRole={currentUserRole}
        initialError={bidError}
      />

    </div>
  );
}