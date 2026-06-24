import PageShell from '../../components/Layout/PageShell';
import FestaHeader from '../../components/Layout/FestaHeader';
import LiveTimer from '../../components/Layout/LiveTimer';
import stampComplete1 from '../../assets/stamp_complete1.png';

export default function ClaimedScreen({ currentTime, onTitleClick }) {
  return (
    <PageShell contentClassName="justify-between p-4 pb-3">
      <FestaHeader
        showLogo
        onTitleClick={onTitleClick}
        bannerText="경품 수령이 완료되었습니다"
      />

      <main className="flex-1 flex flex-col items-center justify-center z-20 px-2 -mt-2">
        <div className="bg-brandPinkLight border-2 border-dashed border-brandPink rounded-2xl p-5 w-full max-w-[240px] flex flex-col items-center shadow-2xs">
          <img
            src={stampComplete1}
            alt="체험완료"
            className="w-44 h-44 object-contain"
          />
          <p className="mt-4 text-[10px] font-bold text-festa-rose/70 font-sans tracking-wider uppercase">
            Experience Complete
          </p>
        </div>

        <p className="mt-6 text-lg font-bold text-festa-ink font-sinchon text-center">
          경품 수령이 완료된 기기입니다
        </p>
        <p className="text-xs text-slate-500 mt-2 text-center font-sans leading-relaxed max-w-[260px]">
          중복 참여 및 화면 조작은 불가능합니다.
          <br />
          스태프에게 이 화면을 보여주세요.
        </p>
      </main>

      <footer className="z-20 pb-1">
        <LiveTimer currentTime={currentTime} />
      </footer>
    </PageShell>
  );
}
