import { supabase } from './supabase';

/**
 * 계정 삭제.
 *
 * App Store 가이드라인 5.1.1(v)와 Google Play 정책상, 계정 생성이 있는 앱은
 * 앱 안에서 계정을 삭제할 수 있어야 한다. 비활성화가 아니라 실제 삭제여야 한다.
 *
 * 이 앱은 Supabase Auth를 쓰지 않는다. 사용자 식별자는 로그인 시 만드는
 * user_key(`kakao:123` / `apple:xxx`)이고, 모든 사용자 데이터가 그 키로 묶여
 * 있으므로 키에 걸린 행을 전부 지우면 계정이 사라진다.
 */

/** user_key로 사용자 데이터를 보관하는 테이블 전체 */
const USER_DATA_TABLES = [
  'favorites',
  'likes',
  'reviews',
  'reservations',
  'visit_counts',
  'profiles',
  'push_tokens',
] as const;

export type DeleteAccountResult = {
  ok: boolean;
  /** 삭제에 실패한 테이블 — 부분 실패를 숨기지 않기 위해 그대로 돌려준다 */
  failedTables: string[];
  /** 카카오 연결 끊기 실패 여부 */
  unlinkFailed: boolean;
};

/** 카카오 앱 연결을 끊는다 (단순 로그아웃과 달리 동의 이력까지 해제된다) */
async function unlinkKakao(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const kakaoUser = require('@react-native-kakao/user');
    await kakaoUser.unlink();
    return true;
  } catch (e: any) {
    console.log('[account] 카카오 연결 끊기 실패:', e?.message ?? e);
    return false;
  }
}

/**
 * user_key에 걸린 모든 데이터를 지우고, 소셜 연결을 해제한다.
 *
 * 좌석 예약(seats.reserved_by)은 여기서 건드리지 않는다 — 예약은
 * RESERVATION_TIMEOUT_MINUTES 후 자동 해제되므로 방치해도 좌석이 묶이지 않고,
 * seats 갱신은 RPC(사장님/서버) 경로에 속한다.
 */
export async function deleteAccount(
  userKey: string,
  provider: 'kakao' | 'apple'
): Promise<DeleteAccountResult> {
  const failedTables: string[] = [];

  if (supabase) {
    for (const table of USER_DATA_TABLES) {
      const { error } = await supabase.from(table).delete().eq('user_key', userKey);
      if (error) {
        console.log(`[account] ${table} 삭제 실패:`, error.message);
        failedTables.push(table);
      }
    }
  }

  let unlinkFailed = false;
  if (provider === 'kakao') {
    unlinkFailed = !(await unlinkKakao());
  }
  // Apple은 토큰 폐기(revoke)에 서버가 필요하다.
  // Apple은 Sign in with Apple 사용 앱이 계정 삭제 시 refresh token을 폐기하도록
  // 요구하는데, client_secret으로 서명해 Apple REST API를 호출해야 하므로
  // 클라이언트에서 할 수 없다. Edge Function 추가가 필요한 후속 과제다.

  return {
    ok: failedTables.length === 0,
    failedTables,
    unlinkFailed,
  };
}
