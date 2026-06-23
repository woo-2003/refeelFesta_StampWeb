import React, { useState, useEffect } from 'react';

export default function App() {
  // 1. 초기값 설정: 브라우저 창고(LocalStorage)에 저장된 데이터가 있으면 가져오고, 없으면 초기화합니다.
  const [stamps, setStamps] = useState(() => {
    const savedStamps = localStorage.getItem('refeel_stamps');
    return savedStamps ? JSON.parse(savedStamps) : { 1: false, 2: false, 3: false, 4: false };
  });

  const [isClaimed, setIsClaimed] = useState(() => {
    return localStorage.getItem('refeel_isClaimed') === 'true';
  });

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffPassword, setStaffPassword] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [tapCount, setTapCount] = useState(0);

  // 2. [핵심 기능] URL 주소창에서 ?section=번호 감지해서 자동 도장 찍기
  useEffect(() => {
    // 이미 경품을 수령한 기기라면 QR 코드 작동을 원천 차단
    if (isClaimed) return;

    const params = new URLSearchParams(window.location.search);
    const sectionId = params.get('section'); // URL에서 'section' 파라미터 추출

    // section 번호가 1, 2, 3, 4 중 하나인지 검증
    if (sectionId && ['1', '2', '3', '4'].includes(sectionId)) {
      const id = parseInt(sectionId, 10);
      
      setStamps((prev) => {
        // 기존에 찍혀있던 도장 상태를 그대로 유지하면서, 새로 찍은 부스만 true로 변경 (순서 상관 없음)
        const updated = { ...prev, [id]: true };
        localStorage.setItem('refeel_stamps', JSON.stringify(updated)); // 창고에 영구 저장
        return updated;
      });

      // 💡 깔끔한 처리를 위해 도장을 찍은 후 주소창 뒤의 ?section=n 문구를 깨끗하게 지워줍니다.
      // (유저가 화면을 수동 새로고침했을 때 도장이 중복으로 찍히는 알림이나 이펙트 오작동 방지)
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      alert(`🎉 SECTION ${id} 부스 인증 완료! 도장이 찍혔습니다.`);
    }
  }, [isClaimed]);

  // 3. 상태가 바뀔 때마다 로컬 스토리지 동기화
  useEffect(() => {
    localStorage.setItem('refeel_stamps', JSON.stringify(stamps));
  }, [stamps]);

  useEffect(() => {
    localStorage.setItem('refeel_isClaimed', isClaimed.toString());
  }, [isClaimed]);

  // 4. 어뷰징 방지용 실시간 타이머
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 5. 진행률 계산
  const acquiredCount = Object.values(stamps).filter(Boolean).length;
  const isEligibleForGift = acquiredCount >= 3;

  // 6. 개발자 전용 마스터 초기화 리셋 기능 (타이틀 5번 터치)
  const handleDeveloperReset = () => {
    setTapCount((prev) => prev + 1);
    if (tapCount + 1 >= 5) {
      const password = prompt('관리자 디벨로퍼 비밀번호를 입력하세요.');
      if (password === '9999') {
        const resetStamps = { 1: false, 2: false, 3: false, 4: false };
        setStamps(resetStamps);
        setIsClaimed(false);
        setTapCount(0);
        localStorage.setItem('refeel_stamps', JSON.stringify(resetStamps));
        localStorage.setItem('refeel_isClaimed', 'false');
        alert('개발자 모드로 인해 기기의 모든 세션 창고 데이터가 포맷되었습니다.');
      } else {
        alert('비밀번호가 일치하지 않습니다.');
        setTapCount(0);
      }
    }
  };

  // 7. 스태프 패스워드 검증
  const handleStaffVerify = (e) => {
    e.preventDefault();
    if (staffPassword === '2026') {
      setIsClaimed(true);
      setIsStaffModalOpen(false);
    } else {
      alert('스태프 암호가 일치하지 않습니다. 다시 입력해주세요.');
    }
    setStaffPassword('');
  };

  // 수동 클릭 도장 토글 (테스트용)
  const toggleStamp = (id) => {
    if (isClaimed) return;
    setStamps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
  // CASE B: 일반 메인 스탬프 투어 화면
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