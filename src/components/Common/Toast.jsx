export default function Toast({ message }) {
  if (!message) return null;

  return (
    <div className="absolute top-4 left-4 right-4 z-[60] flex justify-center pointer-events-none font-sans">
      <p className="bg-festa-ink/90 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg">
        {message}
      </p>
    </div>
  );
}
