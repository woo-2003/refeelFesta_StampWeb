const GARLAND_COLORS = [
  'border-t-garland-pink',
  'border-t-garland-blue',
  'border-t-garland-yellow',
  'border-t-garland-green',
];

export default function Garland() {
  const flags = [...GARLAND_COLORS, ...GARLAND_COLORS];

  return (
    <div className="absolute top-0 left-0 right-0 flex justify-center gap-1.5 pointer-events-none opacity-90 z-10">
      {flags.map((color, index) => (
        <div
          key={index}
          className={`w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[18px] ${color}`}
        />
      ))}
    </div>
  );
}
