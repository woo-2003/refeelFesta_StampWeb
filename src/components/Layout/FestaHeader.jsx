import titleLogo from '../../assets/titleLogo.png';
import logo from '../../assets/logo.jpg';
import RibbonBanner from '../Common/RibbonBanner';

export default function FestaHeader({
  onTitleClick,
  bannerText,
  className = '',
  showTitleLogo = false,
  showLogo = false,
}) {
  return (
    <header
      className={`text-center pt-5 pb-1 z-20 flex flex-col items-center ${onTitleClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onTitleClick}
    >
      {showTitleLogo && (
        <img
          src={titleLogo}
          alt="REFILL FESTA"
          className="w-56 max-w-[92%] h-auto mb-2 object-contain"
          draggable={false}
        />
      )}
      {showLogo && (
        <img
          src={logo}
          alt="REFILL FESTA"
          className="h-[18px] w-auto mb-1.5 object-contain"
          draggable={false}
        />
      )}
      <h1 className="font-sinchon text-3xl text-festa-ink tracking-wide leading-none flex flex-col items-center gap-0.5">
        <span>REFILL FESTA</span>
        <span className="text-festa-rose text-4xl font-black tracking-widest">STAMP TOUR</span>
      </h1>

      {bannerText && (
        <div className="flex justify-center w-full">
          <RibbonBanner>{bannerText}</RibbonBanner>
        </div>
      )}
    </header>
  );
}
