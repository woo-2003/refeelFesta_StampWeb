import PageShell from './PageShell';
import FestaHeader from './FestaHeader';

export default function LoadingScreen() {
  return (
    <PageShell contentClassName="justify-center items-center p-4 pb-8">
      <FestaHeader className="pointer-events-none opacity-60 scale-95" />
      <p className="mt-10 text-festa-rose/60 font-medium animate-pulse font-sans text-sm tracking-wide">
        Re-Feel Festa 연결 중...
      </p>
    </PageShell>
  );
}
