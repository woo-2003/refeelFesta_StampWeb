export default function LiveTimer({ currentTime }) {
  return (
    <div className="bg-festa-navy text-white text-center py-3.5 rounded-full font-mono text-sm tracking-widest shadow-xs font-sans">
      <span>{currentTime}</span>
      <span className="text-white/70 text-[10px] ml-2 font-sans tracking-normal">캡처 사용 불가</span>
    </div>
  );
}
