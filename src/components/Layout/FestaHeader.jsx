export default function FestaHeader({ onTitleClick, bannerText, className = '' }) {
  return (
    <header
      className={`text-center pt-5 pb-1 z-20 flex flex-col items-center ${onTitleClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onTitleClick}
    >
      <div className="bg-festa-navy text-white text-[9px] font-black px-2.5 py-0.5 rounded-sm mb-1.5 shadow-xs tracking-widest font-sans">
        RE-FEEL FESTA
      </div>
      <h1 className="font-sinchon text-3xl text-festa-ink tracking-wide leading-none flex flex-col items-center gap-0.5">
        <span>Re-Feel Festa</span>
        <span className="text-festa-rose text-4xl font-black tracking-widest">STAMP TOUR</span>
      </h1>

      {bannerText && (
        <div className="mt-2.5 relative flex items-center justify-center">
          <div className="absolute -left-1.5 top-2 w-0 h-0 border-t-[6px] border-t-festa-ribbon border-l-[6px] border-l-transparent" />
          <div className="bg-festa-rose text-white text-[11px] font-bold px-7 py-1.5 rounded-sm shadow-xs font-sans tracking-wide">
            {bannerText}
          </div>
          <div className="absolute -right-1.5 top-2 w-0 h-0 border-t-[6px] border-t-festa-ribbon border-r-[6px] border-r-transparent" />
        </div>
      )}
    </header>
  );
}
