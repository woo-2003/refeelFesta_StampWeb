import React, { useState, useEffect } from 'react';
import { auth, db } from './services/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export default function App() {
  // 1. 상태(State) 정의
  const [userId, setUserId] = useState(null);
  const [stamps, setStamps] = useState({ 1: false, 2: false, 3: false, 4: false });
  const [isClaimed, setIsClaimed] = useState(false);
  
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffPassword, setStaffPassword] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [tapCount, setTapCount] = useState(0);
  const [loading, setLoading] = useState(true); // 서버 로딩 상태 관리

  // 2. 어뷰징 방지용 실시간 시계 타이머
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. [핵심 관문] 구글 익명 로그인 및 파이어스토어 실시간 DB 구독 연동
  useEffect(() => {
    signInAnonymously(auth)
      .then((cred) => {
        const uid = cred.user.uid;
        setUserId(uid);

        const userDocRef = doc(db, 'users', uid);
        
        // 데이터베이스 실시간 감시 (성공/실패 콜백을 모두 분리하여 무한 로딩 방지)
        const unsubscribe = onSnapshot(
          userDocRef, 
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.stamps) setStamps(data.stamps);
              if (data.isClaimed !== undefined) setIsClaimed(data.isClaimed);
            } else {
              // 서버에 문서가 없는 완전 최초 진입 유저인 경우 초기 틀 생성
              setDoc(userDocRef, {
                stamps: { 1: false, 2: false, 3: false, 4: false },
                isClaimed: false,
                createdAt: new Date()
              }).catch(e => console.error("신규 유저 생성 실패:", e));
            }
            setLoading(false); // 데이터 로드 성공 시 로딩 해제
          },
          (error) => {
            // Firestore 규칙 차단 등으로 에러 발생 시 무한 로딩을 풀고 로그 출력
            console.error("🔴 파이어스토어 DB 연결 에러 발생:", error);
            setLoading(false); 
          }
        );

        return () => unsubscribe();
      })
      .catch((err) => {
        console.error("🔴 구글 익명 로그인 자체 에러:", err);
        setLoading(false);
      });
  }, []);

  // 4. [자유 동선 QR] 주소창 파라미터(?section=n) 감지 및 서버 자동 적립
  useEffect(() => {
    if (!userId || isClaimed) return;

    const params = new URLSearchParams(window.location.search);
    const sectionId = params.get('section');

    if (sectionId && ['1', '2', '3', '4'].includes(sectionId)) {
      const id = parseInt(sectionId, 10);
      const userDocRef = doc(db, 'users', userId);

      // 기존 스탬프 상태를 복사하고 현재 QR 찍은 부스만 true로 병합
      const updatedStamps = { ...stamps, [id]: true };
      setDoc(userDocRef, { stamps: updatedStamps }, { merge: true })
        .then(() => {
          // 중복 알림 방지를 위해 주소창에서 ?section=n 파라미터 깔끔하게 제거
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
          alert(`🎉 SECTION ${id} 부스 인증 완료! 도장이 찍혔습니다.`);
        });
    }
  }, [userId, isClaimed, stamps]);

  // 진행률 계산
  const acquiredCount = Object.values(stamps).filter(Boolean).length;
  const isEligibleForGift = acquiredCount >= 3;

  // 수동 스탬프 클릭 토글 (개발 및 현장 테스트 전용)
  const toggleStamp = async (id) => {
    if (!userId || isClaimed) return;
    const userDocRef = doc(db, 'users', userId);
    const updatedStamps = { ...stamps, [id]: !stamps[id] };
    await setDoc(userDocRef, { stamps: updatedStamps }, { merge: true });
  };

  // 현장 스태프 경품 수령 확인 핸들러
  const handleStaffVerify = async (e) => {
    e.preventDefault();
    if (staffPassword === '2026') {
      const userDocRef = doc(db, 'users', userId);
      await setDoc(userDocRef, { isClaimed: true, claimedAt: new Date() }, { merge: true });
      setIsStaffModalOpen(false);
    } else {
      alert('스태프 암호가 일치하지 않습니다. 다시 입력해주세요.');
    }
    setStaffPassword('');
  };

  // 디벨로퍼 마스터 리셋 (타이틀 5번 터치 시 서버 데이터 포맷)
  const handleDeveloperReset = async () => {
    setTapCount((prev) => prev + 1);
    if (tapCount + 1 >= 5) {
      const password = prompt('관리자 디벨로퍼 비밀번호를 입력하세요.');
      if (password === '9999') {
        const userDocRef = doc(db, 'users', userId);
        await setDoc(userDocRef, {
          stamps: { 1: false, 2: false, 3: false, 4: false },
          isClaimed: false
        }, { merge: true });
        setTapCount(0);
        alert('서버 데이터베이스가 초기화되었습니다.');
      } else {
        alert('비밀번호가 일치하지 않습니다.');
        setTapCount(0);
      }
    }
  };

  // ==========================================
  // LOADING: 초기 서버 통신 중 스플래시 화면
  // ==========================================
  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-dvh bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 font-medium animate-pulse">서버와 연결 중입니다...</p>
      </div>
    );
  }

  // ==========================================
  // CASE A: 최종 경품 교환 완료 화면 (영구 잠금)
  // ==========================================
  if (isClaimed) {
    return (
      <div className="max-w-md mx-auto min-h-dvh bg-slate-100 flex flex-col justify-between p-6 relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-black/5 pointer-events-none z-10" />
        <div className="my-auto text-center z-20 flex flex-col items-center">
          <h1 onClick={handleDeveloperReset} className="font-sinchon text-3xl text-slate-800 mb-8 tracking-wider cursor-pointer active:opacity-50">
            Re-Feel Festa
          </h1>
          <div className="w-56 h-56 rounded-full border-4 border-purple-600 bg-white flex flex-col justify-center items-center p-4 shadow-2xl animate-bounce">
            <span className="text-purple-600 font-bold text-2xl tracking-widest mb-1">체험완료</span>
            <span className="text-purple-500 text-sm font-medium">수뭉이</span>
          </div>
          <p className="mt-8 text-lg font-bold text-slate-700">경품 수령이 완료된 기기입니다.</p>
          <p className="text-sm text-slate-500 mt-2">중복 참여 및 화면 조작은 불가능합니다.</p>
        </div>
        <div className="bg-purple-600 text-white text-center py-3 rounded-xl font-mono tracking-widest shadow-md">
          {currentTime} (캡처 사용 불가)
        </div>
      </div>
    );
  }

  // ==========================================
  // CASE B: 일반 메인 스탬프 투어 판 화면
  // ==========================================
  return (
    <div className="max-w-md mx-auto min-h-dvh bg-slate-50 flex flex-col justify-between p-6 relative select-none shadow-2xl">
      <header className="text-center pt-4 cursor-pointer" onClick={handleDeveloperReset}>
        <h1 className="font-sinchon text-2xl text-slate-800 tracking-tight">
          Re-Feel Festa Stamp Tour
        </h1>
        <p className="text-xs text-slate-400 mt-1">부스에서 QR을 찍으면 자동으로 도장이 찍혀요!</p>
      </header>

      <main className="grid grid-cols-2 gap-4 my-auto">
        <div onClick={() => toggleStamp(1)} className="aspect-square rounded-2xl p-4 flex flex-col justify-between items-center cursor-pointer transition-all active:scale-95 shadow-sm bg-brandPinkLight">
          <span className="text-xs font-bold text-slate-500">SECTION 1</span>
          <div className={`w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center ${stamps[1] ? 'bg-orange-400 border-none text-white font-bold' : 'border-slate-300'}`}>
            {stamps[1] ? 'Stamp' : ''}
          </div>
          <span className="text-xs font-medium text-slate-700 text-center break-keep">감정 하나 볼펜 하나</span>
        </div>

        <div onClick={() => toggleStamp(2)} className="aspect-square rounded-2xl p-4 flex flex-col justify-between items-center cursor-pointer transition-all active:scale-95 shadow-sm bg-brandPink">
          <span className="text-xs font-bold text-slate-600">SECTION 2</span>
          <div className={`w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center ${stamps[2] ? 'bg-orange-400 border-none text-white font-bold' : 'border-slate-400'}`}>
            {stamps[2] ? 'Stamp' : ''}
          </div>
          <span className="text-xs font-medium text-slate-800 text-center break-keep">나의 감정 트럭: Crush !</span>
        </div>

        <div onClick={() => toggleStamp(3)} className="aspect-square rounded-2xl p-4 flex flex-col justify-between items-center cursor-pointer transition-all active:scale-95 shadow-sm bg-brandBlueLight">
          <span className="text-xs font-bold text-slate-500">SECTION 3</span>
          <div className={`w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center ${stamps[3] ? 'bg-orange-400 border-none text-white font-bold' : 'border-slate-300'}`}>
            {stamps[3] ? 'Stamp' : ''}
          </div>
          <span className="text-xs font-medium text-slate-700 text-center break-keep">수뭉이의 행복 충전소</span>
        </div>

        <div onClick={() => toggleStamp(4)} className="aspect-square rounded-2xl p-4 flex flex-col justify-between items-center cursor-pointer transition-all active:scale-95 shadow-sm bg-brandBlue">
          <span className="text-xs font-bold text-slate-600">SECTION 4</span>
          <div className={`w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center ${stamps[4] ? 'bg-orange-400 border-none text-white font-bold' : 'border-slate-400'}`}>
            {stamps[4] ? 'Stamp' : ''}
          </div>
          <span className="text-xs font-medium text-slate-800 text-center break-keep">기록, 감정 보관소</span>
        </div>
      </main>

      <footer className="flex flex-col gap-4 pb-4">
        <div className="flex justify-between items-center px-2">
          <span className="text-sm font-medium text-slate-500">현재 진행률</span>
          <span className="text-lg font-bold text-slate-800 font-mono">{acquiredCount} / 4</span>
        </div>

        {isEligibleForGift ? (
          <button onClick={() => setIsStaffModalOpen(true)} className="w-full bg-red-500 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-98 animate-pulse text-center">
            경품 교환하기 (조건 충족)
          </button>
        ) : (
          <button onClick={() => setIsGuideOpen(true)} className="w-full bg-slate-800 text-white font-medium py-4 rounded-2xl shadow-md transition-all active:scale-98 text-center">
            참여방법안내
          </button>
        )}
      </footer>

      {isGuideOpen && (
        <div className="absolute inset-0 bg-black/60 z-40 flex items-end justify-center p-6">
          <div className="bg-white w-full rounded-t-3xl p-6 shadow-2xl">
            <h3 className="font-bold text-lg text-slate-800 mb-4 text-center">스탬프 투어 참여 가이드</h3>
            <ol className="space-y-3 text-sm text-slate-600 pl-2 list-decimal list-inside">
              <li>스마트폰 기본 카메라 앱을 실행합니다.</li>
              <li>각 부스에 비치된 고유 QR 코드를 스캔합니다.</li>
              <li>자동으로 해당 부스의 도장이 쾅 찍힙니다.</li>
            </ol>
            <p className="text-xs text-red-400 mt-4 text-center font-medium">※ 4개 중 3개 이상 모으면 선물을 드려요!</p>
            <button onClick={() => setIsGuideOpen(false)} className="w-full mt-6 bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition-colors">
              닫기
            </button>
          </div>
        </div>
      )}

      {isStaffModalOpen && (
        <div className="absolute inset-0 bg-black/60 z-40 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl text-center">
            <h3 className="font-bold text-base text-slate-800 mb-2">스태프 확인</h3>
            <p className="text-xs text-slate-400 mb-4">경품 교환소 스태프 전용 암호를 입력하세요.</p>
            <form onSubmit={handleStaffVerify}>
              <input type="password" maxLength={4} value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} placeholder="••••" className="w-full text-center text-xl font-bold tracking-widest border-2 border-slate-200 rounded-xl py-2 mb-4 focus:border-slate-400 outline-none" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsStaffModalOpen(false)} className="w-1/2 bg-slate-100 text-slate-600 font-medium py-2 rounded-lg text-sm">취소</button>
                <button type="submit" className="w-1/2 bg-red-500 text-white font-medium py-2 rounded-lg text-sm">확인</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}