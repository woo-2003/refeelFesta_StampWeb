import { signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';

let signInLock = null;

/**
 * IndexedDB에 저장된 익명 세션이 복원될 때까지 대기한 뒤,
 * 동시에 여러 탭에서 signInAnonymously가 중복 호출되지 않도록 보장합니다.
 */
export async function ensureAnonymousUser() {
  await auth.authStateReady();

  if (auth.currentUser) {
    return auth.currentUser;
  }

  if (!signInLock) {
    signInLock = signInAnonymously(auth).finally(() => {
      signInLock = null;
    });
  }

  const credential = await signInLock;
  return credential.user;
}
