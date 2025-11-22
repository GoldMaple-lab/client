import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

// ไว้เปลี่ยน ip public
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "postgresql://my_board_db_a33q_user:TV6yFi5mwd2qpmcgUP6Y62exLzTEFR7U@dpg-d4gs10ili9vc73dqp5k0-a/my_board_db_a33q"; 
const socket = io.connect(SERVER_URL);

const getPersistentUserId = () => {
  let id = localStorage.getItem('board_user_id');
  if (!id) {
    id = uuidv4();
    localStorage.setItem('board_user_id', id);
  }
  return id;
};

const MY_USER_ID = getPersistentUserId();

// สุ่มสี
const getRandomColor = () => {
  const colors = [
    'bg-rose-50 border-rose-300 text-rose-600',
    'bg-sky-50 border-sky-300 text-sky-600',
    'bg-emerald-50 border-emerald-300 text-emerald-600',
    'bg-violet-50 border-violet-300 text-violet-600',
    'bg-amber-50 border-amber-300 text-amber-600',
    'bg-fuchsia-50 border-fuchsia-300 text-fuchsia-600',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

function App() {
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [notes, setNotes] = useState([]);
  const [roomCreatorId, setRoomCreatorId] = useState(null);
  const [tempInput, setTempInput] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);

  // --- 🪐 Physics Engine (สำหรับห้องหน้าแรก) ---
  const roomRefs = useRef({});   
  const roomPhysicsRef = useRef({}); 
  const roomAnimationFrameId = useRef(null);

  // --- 📝 Physics Engine (สำหรับ Note ในห้อง) ---
  const noteRefs = useRef({});
  const notePhysicsRef = useRef({});
  const noteAnimationFrameId = useRef(null);

  useEffect(() => {
    // โหลด Notes และเตรียมข้อมูลฟิสิกส์เริ่มต้น
    socket.on('load_notes', (serverNotes) => {
      setNotes(serverNotes);
      // เตรียมข้อมูลฟิสิกส์ให้ Note แต่ละใบ (ถ้ายังไม่มี)
      serverNotes.forEach(note => {
        if (!notePhysicsRef.current[note.id]) {
          notePhysicsRef.current[note.id] = {
            x: note.x, // ใช้ตำแหน่งเริ่มต้นจากที่บันทึกไว้
            y: note.y,
            // สุ่มความเร็ว (ปรับเลข 0.5 ให้เร็ว/ช้าตามชอบ)
            vx: (Math.random() - 0.5) * 1.5, 
            vy: (Math.random() - 0.5) * 1.5,
            isHovered: false 
          };
        }
      });
    });

    socket.on('room_info', (info) => setRoomCreatorId(info.creatorId));
    
    socket.on('update_room_list', (serverRooms) => {
      setAvailableRooms(prev => {
        return serverRooms.map(newRoom => {
          const existing = prev.find(r => r.id === newRoom.id);
          return {
            ...newRoom,
            colorClass: existing ? existing.colorClass : getRandomColor()
          };
        });
      });
    });

    socket.on('room_deleted', () => {
      alert("ห้องนี้ถูกลบแล้ว");
      leaveRoom();
    });

    return () => socket.off();
  }, []);

  // --- 🔄 Physics Loop 1: สำหรับห้อง (หน้าแรก) ---
  useEffect(() => {
    if (isInRoom) return; // ถ้าอยู่ในห้อง ไม่ต้องรัน loop หน้าแรก

    // Init Physics Data สำหรับห้อง
    availableRooms.forEach(room => {
      if (!roomPhysicsRef.current[room.id]) {
        roomPhysicsRef.current[room.id] = {
          x: Math.random() * (window.innerWidth - 150),
          y: Math.random() * (window.innerHeight - 80),
          vx: (Math.random() - 0.5) * 0.8, 
          vy: (Math.random() - 0.5) * 0.8,
          isHovered: false 
        };
      }
    });

    const animateRooms = () => {
      availableRooms.forEach(room => {
        const phys = roomPhysicsRef.current[room.id];
        const el = roomRefs.current[room.id];
        if (phys && el) {
          if (!phys.isHovered) {
            phys.x += phys.vx;
            phys.y += phys.vy;
            if (phys.x <= 0 || phys.x >= window.innerWidth - el.offsetWidth) phys.vx *= -1;
            if (phys.y <= 0 || phys.y >= window.innerHeight - el.offsetHeight) phys.vy *= -1;
          }
          el.style.transform = `translate3d(${phys.x}px, ${phys.y}px, 0)`;
        }
      });
      roomAnimationFrameId.current = requestAnimationFrame(animateRooms);
    };

    roomAnimationFrameId.current = requestAnimationFrame(animateRooms);
    return () => cancelAnimationFrame(roomAnimationFrameId.current);
  }, [availableRooms, isInRoom]);

  // --- 🔄 Physics Loop 2: สำหรับ Note (ในห้อง) ---
  useEffect(() => {
    if (!isInRoom) return; // ถ้าไม่ได้อยู่ในห้อง ไม่ต้องรัน loop นี้

    const animateNotes = () => {
      notes.forEach(note => {
        const phys = notePhysicsRef.current[note.id];
        const el = noteRefs.current[note.id];

        if (phys && el) {
          // ถ้าไม่ได้เอาเมาส์ชี้ ให้ขยับ
          if (!phys.isHovered) {
            phys.x += phys.vx;
            phys.y += phys.vy;

            // ชนขอบจอเด้งกลับ
            // ใช้ el.offsetWidth/Height เพื่อคำนวณขนาดกล่องจริง
            if (phys.x <= 0 || phys.x >= window.innerWidth - (el.offsetWidth || 200)) phys.vx *= -1;
            if (phys.y <= 0 || phys.y >= window.innerHeight - (el.offsetHeight || 100)) phys.vy *= -1;
          }

          // สั่งย้าย DOM
          el.style.transform = `translate3d(${phys.x}px, ${phys.y}px, 0)`;
        }
      });
      noteAnimationFrameId.current = requestAnimationFrame(animateNotes);
    };

    noteAnimationFrameId.current = requestAnimationFrame(animateNotes);
    return () => cancelAnimationFrame(noteAnimationFrameId.current);
  }, [notes, isInRoom]);


  // --- Handlers สำหรับ Hover (ใช้ร่วมกันทั้งห้องและโน้ต) ---
  const handleMouseEnter = (ref, id) => { if (ref.current[id]) ref.current[id].isHovered = true; };
  const handleMouseLeave = (ref, id) => { if (ref.current[id]) ref.current[id].isHovered = false; };

  const joinRoom = (targetRoomId = roomId) => {
    if (targetRoomId.trim() !== "") {
      setRoomId(targetRoomId);
      socket.emit('join_room', { roomId: targetRoomId.trim(), userId: MY_USER_ID });
      setIsInRoom(true);
    }
  };

  const leaveRoom = () => {
    setIsInRoom(false);
    setNotes([]);
    setRoomId("");
    setRoomCreatorId(null);
    // เคลียร์ physics ref ของ note เมื่อออกจากห้อง
    notePhysicsRef.current = {};
  };

  const handleBoardClick = (e) => {
    if (e.target.closest('[data-no-trigger]')) return;
    setTempInput({ x: e.clientX, y: e.clientY, text: "" });
  };

  const submitNote = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tempInput.text.trim() !== "") {
        const noteData = {
          id: uuidv4(),
          x: tempInput.x, // บันทึกตำแหน่งเริ่มต้น
          y: tempInput.y,
          text: tempInput.text,
          authorId: MY_USER_ID,
        };
        socket.emit('add_note', { roomId, note: noteData });
      }
      setTempInput(null);
    }
  };

  const deleteNote = (note) => {
    const noteAuthor = note.author_id || note.authorId;
    if (noteAuthor === MY_USER_ID || roomCreatorId === MY_USER_ID) {
      socket.emit('delete_note', { roomId, noteId: note.id });
      // ลบข้อมูลฟิสิกส์ออกด้วย
      delete notePhysicsRef.current[note.id];
    } else {
      alert("คุณไม่มีสิทธิ์ลบข้อความนี้");
    }
  };

  const deleteRoom = () => {
    if (confirm("ยืนยันลบห้อง?")) {
      socket.emit('delete_room', { roomId, userId: MY_USER_ID });
    }
  };

  // --- หน้า Home ---
  if (!isInRoom) {
    return (
      <div className="relative w-screen h-screen overflow-hidden bg-slate-50">
        <div className="absolute inset-0 opacity-20"
             style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
        </div>
        <div className="absolute inset-0 z-0">
            {availableRooms.map((room) => (
              <div
                key={room.id}
                ref={el => roomRefs.current[room.id] = el}
                style={{ position: 'absolute', left: 0, top: 0, willChange: 'transform' }}
                onMouseEnter={() => handleMouseEnter(roomPhysicsRef, room.id)}
                onMouseLeave={() => handleMouseLeave(roomPhysicsRef, room.id)}
              >
                <button onClick={() => joinRoom(room.id)} className={`relative group px-6 py-3 rounded-2xl shadow-lg border-2 backdrop-blur-md cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:-translate-y-1 flex items-center gap-3 ${room.colorClass}`}>
                  <span className="text-2xl animate-float-icon drop-shadow-sm">☁️</span>
                  <span className="font-black text-lg tracking-wide animate-text-shimmer">{room.id}</span>
                </button>
              </div>
            ))}
            {availableRooms.length === 0 && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <span className="text-slate-300 font-bold text-4xl opacity-20 animate-pulse">WAITING FOR ROOMS...</span>
               </div>
            )}
        </div>
        {/* Login Form (ย่อไว้) */}
        <div className="relative z-20 flex h-full items-center justify-center pointer-events-none"><div className="pointer-events-auto w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 space-y-6 border border-white transform transition-all hover:scale-105"><div className="text-center space-y-2"><div className="inline-block p-3 bg-blue-100 rounded-full text-2xl mb-2">🎨</div><h1 className="text-4xl font-black text-slate-800 tracking-tight">Realtime Board</h1><p className="text-slate-500 text-sm font-medium">พื้นที่อิสระของความคิดเห็น</p></div><div className="space-y-3 pt-4"><input type="text" placeholder="ตั้งชื่อห้อง..." value={roomId} className="w-full px-5 py-4 border-0 bg-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold text-slate-700" onChange={(e) => setRoomId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && joinRoom()}/><button onClick={() => joinRoom()} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg active:scale-95 text-lg">🚀 สร้างห้องเพื่อพูดคุย</button></div><div className="text-center"><span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded">ID: {MY_USER_ID.split('-')[0]}...</span></div></div></div>
      </div>
    );
  }

  // --- หน้า Board  ---
  const isMeCreator = roomCreatorId === MY_USER_ID;
  return (
    <div className="h-screen w-screen relative overflow-hidden bg-slate-50 cursor-crosshair" onClick={handleBoardClick}
      style={{ backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}>
      
      {/* Control Panel (ย่อไว้) */}
      <div data-no-trigger className="fixed top-6 left-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg z-50 border border-slate-100 flex flex-col gap-2 min-w-[200px] transition-all hover:shadow-xl"><button onClick={leaveRoom} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors mb-2 text-sm font-bold group"><span className="group-hover:-translate-x-1 transition-transform">←</span> กลับหน้าหลัก</button><div className="h-[1px] bg-slate-200 w-full mb-2"></div><h3 className="text-lg font-bold text-slate-800 m-0 truncate max-w-[180px]">{roomId}</h3>{isMeCreator ? (<div className="space-y-2"><span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full inline-block">👑 Owner</span><button onClick={deleteRoom} className="w-full text-xs bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-2 rounded-lg transition-colors font-medium">ลบห้องทิ้ง</button></div>) : (<span className="text-xs text-slate-400 font-medium">Guest</span>)}</div>
      
      {notes.map((note) => {
        const noteAuthor = note.author_id || note.authorId;
        const canDelete = noteAuthor === MY_USER_ID || isMeCreator;
        return (
          // 1. Wrapper สำหรับ Physics: ใช้ ref และ style absolute ที่ควบคุมโดย JS
          <div 
            key={note.id} 
            data-no-trigger
            ref={el => noteRefs.current[note.id] = el}
            style={{ position: 'absolute', left: 0, top: 0, willChange: 'transform' }}
            onMouseEnter={() => handleMouseEnter(notePhysicsRef, note.id)}
            onMouseLeave={() => handleMouseLeave(notePhysicsRef, note.id)}
          >
            {/* 2. ตัว Note ข้างใน: เน้นความสวยงามและการขยายเมื่อ Hover */}
            <div className="bg-white p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] max-w-[280px] border border-slate-100 group animate-popIn transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:z-50">
              <p className="text-slate-700 text-[15px] break-words leading-relaxed pointer-events-none">{note.text}</p>
              {canDelete && (
                <button 
                  data-no-trigger
                  className="absolute -top-3 -right-3 bg-white text-slate-400 hover:bg-red-500 hover:text-white border border-slate-200 rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm text-sm font-bold scale-90 hover:scale-110"
                  onClick={(e) => { e.stopPropagation(); deleteNote(note); }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        );
      })}

      {tempInput && (
        <textarea autoFocus data-no-trigger className="absolute transform -translate-x-1/2 -translate-y-1/2 px-4 py-3 border-2 border-blue-400 rounded-2xl focus:outline-none bg-white/95 shadow-xl min-w-[220px] resize-none text-slate-700 z-50 overflow-hidden" style={{ left: tempInput.x, top: tempInput.y, height: 'auto' }} value={tempInput.text} onChange={(e) => { setTempInput({...tempInput, text: e.target.value}); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} onKeyDown={submitNote} onBlur={() => setTempInput(null)} placeholder="พิมพ์ข้อความ..." rows={1} />
      )}
    </div>
  );
}

export default App;