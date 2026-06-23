import Garland from './Garland';

export default function PageShell({
  children,
  showGarland = true,
  className = '',
  contentClassName = '',
}) {
  return (
    <div
      className={`max-w-md mx-auto h-dvh bg-festa-cream flex flex-col relative select-none shadow-2xl overflow-hidden text-slate-800 ${className}`}
    >
      {showGarland && <Garland />}
      <div className={`flex flex-col flex-1 min-h-0 ${contentClassName}`}>{children}</div>
    </div>
  );
}
