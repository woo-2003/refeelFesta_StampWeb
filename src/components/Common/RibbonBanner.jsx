export default function RibbonBanner({ children, className = '' }) {
  return (
    <div className={`mt-2.5 flex justify-center ${className}`}>
      <p className="bg-festa-rose text-white text-[11px] font-bold px-7 py-1.5 rounded-sm shadow-xs font-sans tracking-wide text-center leading-snug">
        {children}
      </p>
    </div>
  );
}
