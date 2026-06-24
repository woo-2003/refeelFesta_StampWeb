import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './services/firebase';
import { ensureAnonymousUser } from './services/auth';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

// 📂 섹션별 고유 완료 도장 이미지 4개 매핑
import stampComplete1 from './assets/stamp_complete1.png'; 
import stampComplete2 from './assets/stamp_complete2.png'; 
import stampComplete3 from './assets/stamp_complete3.png'; 
import stampComplete4 from './assets/stamp_complete4.png';
import icon1 from './assets/icon1.png';
import icon2 from './assets/icon2.png';
import icon3 from './assets/icon3.png';
import icon4 from './assets/icon4.png';
import PageShell from './components/Layout/PageShell';
import FestaHeader from './components/Layout/FestaHeader';
import LoadingScreen from './components/Layout/LoadingScreen';
import Toast from './components/Common/Toast';
import SectionIcon from './components/Common/SectionIcon';
import ClaimedScreen from './features/reward/ClaimedScreen';

const EMPTY_STAMPS = { 1: false, 2: false, 3: false, 4: false };
const STAFF_PASSWORD = import.meta.env.VITE_STAFF_PASSWORD ?? '';
const DEV_RESET_PASSWORD = import.meta.env.VITE_DEV_RESET_PASSWORD ?? '';

function normalizeStamps(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_STAMPS };
  return {
    1: Boolean(raw[1] ?? raw['1']),
    2: Boolean(raw[2] ?? raw['2']),
    3: Boolean(raw[3] ?? raw['3']),
    4: Boolean(raw[4] ?? raw['4']),
  };
}

async function applyStamp(userDocRef, sectionId) {
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userDocRef);

    if (snap.exists() && snap.data().isClaimed) {
      return { applied: false, duplicate: false, claimed: true };
    }

    if (snap.exists()) {
      const stamps = normalizeStamps(snap.data().stamps);
      if (stamps[sectionId]) {
        return { applied: false, duplicate: true, claimed: false };
      }

      // 기존 문서: 해당 칸만 점 표기법으로 갱신 (stamps 맵 전체 교체 금지)
      transaction.update(userDocRef, {
        [`stamps.${sectionId}`]: true,
        updatedAt: serverTimestamp(),
      });
      return { applied: true, duplicate: false, claimed: false };
    }

    const initialStamps = { ...EMPTY_STAMPS };
    initialStamps[sectionId] = true;
    transaction.set(userDocRef, {
      stamps: initialStamps,
      isClaimed: false,
      createdAt: serverTimestamp(),
    });
    return { applied: true, duplicate: false, claimed: false };
  });
}

export default function App() {
  const [userId, setUserId] = useState(null);
  const [stamps, setStamps] = useState({ 1: false, 2: false, 3: false, 4: false });
  const [isClaimed, setIsClaimed] = useState(false);
  
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffPassword, setStaffPassword] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [tapCount, setTapCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [successModalSection, setSuccessModalSection] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const stampPipelineRanRef = useRef(false);
  const stampPipelineUserRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 🔐 [1단계] 익명 세션 복원 후에만 로그인 (QR 새 탭마다 UID가 바뀌는 문제 방지)
  useEffect(() => {
    let cancelled = false;

    ensureAnonymousUser()
      .then((user) => {
        if (!cancelled) setUserId(user.uid);
      })
      .catch((e) => console.error('익명 로그인 에러:', e));

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
    });

    return () => {
      cancelled = true;
      unsubscribeAuth();
    };
  }, []);

  // 🔐 [2단계] 트랜잭션 기반 도장 적립 (레이스 컨디션·Strict Mode 이중 실행 방지)
  useEffect(() => {
    if (!userId) return;

    const userDocRef = doc(db, 'users', userId);

    const handleStampPipeline = async () => {
      if (stampPipelineUserRef.current !== userId) {
        stampPipelineUserRef.current = userId;
        stampPipelineRanRef.current = false;
      }

      if (stampPipelineRanRef.current) return;
      stampPipelineRanRef.current = true;

      // replaceState 전에 URL 파라미터를 동기적으로 캡처
      const params = new URLSearchParams(window.location.search);
      const sectionId = params.get('section');

      if (sectionId && ['1', '2', '3', '4'].includes(sectionId)) {
        const id = parseInt(sectionId, 10);

        try {
          const { applied, duplicate, claimed } = await applyStamp(userDocRef, id);

          // Firestore 쓰기 성공 후에만 주소창 정리 (이중 실행 시 '일반 진입' 오판 방지)
          window.history.replaceState({}, document.title, window.location.pathname);

          if (claimed) return;
          if (duplicate) {
            setToastMessage('이미 완료된 부스입니다.');
            return;
          }
          if (applied) {
            setSuccessModalSection(id);
          }
        } catch (err) {
          console.error('도장 적립 실패:', err);
          setToastMessage('도장 적립에 실패했습니다. 네트워크를 확인해 주세요.');
        }
        return;
      }

      // QR 파라미터 없는 일반 진입: 빈 장부만 생성 (기존 도장 절대 덮어쓰지 않음)
      try {
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
          await setDoc(userDocRef, {
            stamps: { ...EMPTY_STAMPS },
            isClaimed: false,
            createdAt: serverTimestamp(),
          });
        }
      } catch (e) {
        console.error('초기 장부 생성 실패:', e);
      }
    };

    handleStampPipeline();

    const unsubscribeSnap = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.stamps) setStamps(normalizeStamps(data.stamps));
        if (data.isClaimed !== undefined) setIsClaimed(data.isClaimed);
      }
      setLoading(false);
    }, (error) => {
      console.error('실시간 미러링 실패:', error);
      setLoading(false);
    });

    return () => unsubscribeSnap();
  }, [userId]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const acquiredCount = Object.values(stamps).filter(Boolean).length;
  const isEligibleForGift = acquiredCount >= 3;

  const handleDeveloperReset = async () => {
    setTapCount((prev) => prev + 1);
    if (tapCount + 1 >= 5) {
      const password = prompt('관리자 디벨로퍼 비밀번호를 입력하세요.');
      if (password === DEV_RESET_PASSWORD && DEV_RESET_PASSWORD) {
        const userDocRef = doc(db, 'users', userId);
        await setDoc(userDocRef, { stamps: { 1: false, 2: false, 3: false, 4: false }, isClaimed: false }, { merge: true });
        setTapCount(0);
        alert('초기화되었습니다.');
      } else {
        setTapCount(0);
      }
    }
  };

  const handleStaffVerify = async (e) => {
    e.preventDefault();
    if (staffPassword === STAFF_PASSWORD && STAFF_PASSWORD) {
      const userDocRef = doc(db, 'users', userId);
      await setDoc(userDocRef, { isClaimed: true, claimedAt: new Date() }, { merge: true });
      setIsStaffModalOpen(false);
    } else {
      alert('비밀번호가 틀렸습니다.');
    }
    setStaffPassword('');
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (isClaimed) {
    return (
      <ClaimedScreen
        currentTime={currentTime}
        onTitleClick={handleDeveloperReset}
      />
    );
  }

  return (
    <PageShell contentClassName="justify-between p-4 pb-3">
      <FestaHeader
        showLogo
        onTitleClick={handleDeveloperReset}
        bannerText="4개 부스 중 3개 이상 모으면 경품을 드려요!"
      />

      {/* 메인 부스판 그리드 */}
      <main className="grid grid-cols-2 gap-3.5 my-auto z-20 px-1">
        
        {/* SECTION 1 */}
        <div className="bg-[#FFF2F4] border-2 border-dashed border-[#F3AFBC] rounded-2xl p-2.5 flex flex-col justify-between items-center aspect-square shadow-2xs">
          <div className="flex flex-col items-center text-center">
            <SectionIcon src={icon1} color="#DE6273" />
            <span className="text-[9px] font-black text-festa-rose tracking-wider font-sans">SECTION 1</span>
            <span className="font-sinchon text-[13px] text-slate-700 mt-0.5">감정 하나 볼펜 하나</span>
          </div>
          <div className="flex items-center justify-center w-full h-[5.25rem]">
            {stamps[1] ? (
              <img src={stampComplete1} alt="Complete 1" className="w-[4.5rem] h-[4.5rem] object-contain" />
            ) : (
              <div className="w-[72px] h-[72px] border-2 border-dashed border-[#F3AFBC] rounded-full flex flex-col items-center justify-center text-[10px] font-black text-[#F3AFBC] tracking-tight leading-none bg-white/50">
                <span>STAMP</span>
                <span className="mt-0.5">HERE!</span>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2 */}
        <div className="bg-[#EFF5FF] border-2 border-dashed border-[#A5C8FF] rounded-2xl p-2.5 flex flex-col justify-between items-center aspect-square shadow-2xs">
          <div className="flex flex-col items-center text-center">
            <SectionIcon src={icon2} color="#4D8BF5" />
            <span className="text-[9px] font-black text-[#4D8BF5] tracking-wider font-sans">SECTION 2</span>
            <span className="font-sinchon text-[13px] text-slate-700 mt-0.5">나의 감정 트럭: Crush !</span>
          </div>
          <div className="flex items-center justify-center w-full h-[5.25rem]">
            {stamps[2] ? (
              <img src={stampComplete2} alt="Complete 2" className="w-[4.5rem] h-[4.5rem] object-contain" />
            ) : (
              <div className="w-[72px] h-[72px] border-2 border-dashed border-[#A5C8FF] rounded-full flex flex-col items-center justify-center text-[10px] font-black text-[#4D8BF5] tracking-tight leading-none bg-white/50">
                <span>STAMP</span>
                <span className="mt-0.5">HERE!</span>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3 */}
        <div className="bg-[#FFFCEB] border-2 border-dashed border-[#FAD875] rounded-2xl p-2.5 flex flex-col justify-between items-center aspect-square shadow-2xs">
          <div className="flex flex-col items-center text-center">
            <SectionIcon src={icon3} color="#E5A91D" />
            <span className="text-[9px] font-black text-[#E5A91D] tracking-wider font-sans">SECTION 3</span>
            <span className="font-sinchon text-[13px] text-slate-700 mt-0.5">수뭉이의 행복 충전소</span>
          </div>
          <div className="flex items-center justify-center w-full h-[5.25rem]">
            {stamps[3] ? (
              <img src={stampComplete3} alt="Complete 3" className="w-[4.5rem] h-[4.5rem] object-contain" />
            ) : (
              <div className="w-[72px] h-[72px] border-2 border-dashed border-[#FAD875] rounded-full flex flex-col items-center justify-center text-[10px] font-black text-[#E5A91D] tracking-tight leading-none bg-white/50">
                <span>STAMP</span>
                <span className="mt-0.5">HERE!</span>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4 */}
        <div className="bg-[#EFFFFA] border-2 border-dashed border-[#A2EAD2] rounded-2xl p-2.5 flex flex-col justify-between items-center aspect-square shadow-2xs">
          <div className="flex flex-col items-center text-center">
            <SectionIcon src={icon4} color="#14B8A6" />
            <span className="text-[9px] font-black text-[#14B8A6] tracking-wider font-sans">SECTION 4</span>
            <span className="font-sinchon text-[13px] text-slate-700 mt-0.5">기록, 감정 보관소</span>
          </div>
          <div className="flex items-center justify-center w-full h-[5.25rem]">
            {stamps[4] ? (
              <img src={stampComplete4} alt="Complete 4" className="w-[4.5rem] h-[4.5rem] object-contain" />
            ) : (
              <div className="w-[72px] h-[72px] border-2 border-dashed border-[#A2EAD2] rounded-full flex flex-col items-center justify-center text-[10px] font-black text-[#14B8A6] tracking-tight leading-none bg-white/40">
                <span>STAMP</span>
                <span className="mt-0.5">HERE!</span>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* 하단 제어 바 */}
      <footer className="flex flex-col gap-2.5 pb-1.5 z-20 relative">
        <div className="bg-white border border-amber-200/40 rounded-xl p-2.5 flex justify-between items-center shadow-2xs overflow-hidden font-sans">
          <div className="absolute left-0 top-[22%] w-1.5 h-3 bg-festa-cream rounded-r-full border-y border-r border-amber-200/40"></div>
          <div className="absolute right-0 top-[22%] w-1.5 h-3 bg-festa-cream rounded-l-full border-y border-l border-amber-200/40"></div>
          
          <div className="flex items-center gap-1.5 pl-1.5">
            <span className="text-sm">🎉</span>
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">현재 진행률</span>
          </div>
          
          <div className="flex items-center gap-2 pr-1.5">
            <span className="text-xl font-black text-festa-rose font-mono">
              {acquiredCount} <span className="text-slate-300 text-xs font-normal">/ 4</span>
            </span>
          </div>
        </div>

        {isEligibleForGift ? (
          <button onClick={() => setIsStaffModalOpen(true)} className="font-sinchon w-full bg-festa-roseDark text-white font-bold py-3.5 rounded-full shadow-xs transition-all active:scale-98 text-center text-base animate-pulse tracking-wide">
            경품 교환하기 (조건 충족)
          </button>
        ) : (
          <button onClick={() => setIsGuideOpen(true)} className="font-sinchon w-full bg-festa-navy text-white font-bold py-3.5 rounded-full shadow-xs transition-all active:scale-98 text-center text-base tracking-wide">
            참여 방법 안내
          </button>
        )}
      </footer>

      <Toast message={toastMessage} />

      {/* 실시간 축하 모달 */}
      {successModalSection && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-6 backdrop-blur-xs font-sans">
          <div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="font-extrabold text-lg text-festa-rose mb-1">인증 성공!</h3>
            <p className="text-sm text-slate-600 font-medium mb-5 leading-relaxed">
              <span className="font-bold text-slate-800">SECTION {successModalSection}</span> 부스 확인 완료!<br />
              도장이 성공적으로 찍혔습니다.
            </p>
            <button onClick={() => setSuccessModalSection(null)} className="w-full bg-festa-navy text-white font-bold py-3 rounded-xl hover:bg-festa-navyDark transition-colors shadow-sm text-sm">
              확인 (도장 확인하기)
            </button>
          </div>
        </div>
      )}

      {/* 가이드 모달 */}
      {isGuideOpen && (
        <div className="absolute inset-0 bg-black/40 z-40 flex items-end justify-center p-4 backdrop-blur-3xs">
          <div className="bg-white w-full rounded-t-2xl p-5 shadow-2xl font-sans">
            <h3 className="font-extrabold text-base text-slate-800 mb-3 text-center">스탬프 투어 참여 가이드 📑</h3>
            <ol className="space-y-2.5 text-xs text-slate-600 pl-1 list-decimal list-inside font-medium">
              <li>스마트폰 기본 카메라 앱을 실행합니다.</li>
              <li>각 부스에 비치된 고유 QR 코드를 스캔합니다.</li>
              <li>자동으로 해당 부스의 도장이 완료 이미지로 업데이트됩니다.</li>
            </ol>
            <p className="text-[11px] text-festa-rose mt-3 text-center font-bold bg-rose-50 py-1.5 rounded-md">※ 4개 부스 중 3개 이상 모으면 선물을 드려요!</p>
            <button onClick={() => setIsGuideOpen(false)} className="w-full mt-4 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-lg text-xs">닫기</button>
          </div>
        </div>
      )}

      {/* 스태프 확인 모달 */}
      {isStaffModalOpen && (
        <div className="absolute inset-0 bg-black/40 z-40 flex items-center justify-center p-6 backdrop-blur-3xs">
          <div className="bg-white w-full max-w-xs rounded-xl p-5 shadow-2xl text-center font-sans">
            <h3 className="font-bold text-sm text-slate-800 mb-0.5">스태프 확인 🔒</h3>
            <p className="text-[11px] text-slate-400 mb-3">경품 교환소 스태프 전용 암호를 입력하세요.</p>
            <form onSubmit={handleStaffVerify}>
              <input type="password" maxLength={4} value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} placeholder="••••" className="w-full text-center text-lg font-bold tracking-widest border-2 border-slate-200 rounded-lg py-1.5 mb-3 focus:border-festa-rose outline-none" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsStaffModalOpen(false)} className="w-1/2 bg-slate-100 text-slate-600 font-bold py-2 rounded-md text-xs">취소</button>
                <button type="submit" className="w-1/2 bg-festa-rose text-white font-bold py-2 rounded-md text-xs">확인</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}