import { File, Paths } from 'expo-file-system';

/**
 * 빈자리 알림 on/off 설정을 기기에 저장한다.
 *
 * push_tokens 테이블은 RLS상 select가 막혀 있어(토큰 목록이 읽히면 제3자가 발송
 * 대상을 수집할 수 있음) "지금 등록돼 있나?"를 서버에 물어볼 수 없다. 그래서
 * 사용자의 선택을 기기에 남겨두고, 로그인 때 그 값을 따른다.
 *
 * expo-file-system을 쓰는 이유: 이미 설치돼 네이티브에 포함돼 있어 추가 모듈
 * (async-storage 등)로 인한 재빌드가 필요 없다.
 */

const FILE_NAME = 'push-pref.json';

type Prefs = { seatAlert: boolean };

/** 값이 없을 때의 기본값 — 로그인하면 알림을 받는다 */
const DEFAULT: Prefs = { seatAlert: true };

function prefFile(): File {
  return new File(Paths.document, FILE_NAME);
}

export function readPushPrefs(): Prefs {
  try {
    const f = prefFile();
    if (!f.exists) return DEFAULT;
    const parsed = JSON.parse(f.textSync()) as Partial<Prefs>;
    return { seatAlert: parsed.seatAlert !== false };
  } catch {
    // 파일이 깨져 있으면 기본값으로 되돌린다 — 설정 하나 때문에 앱이 죽으면 안 된다
    return DEFAULT;
  }
}

export function writePushPrefs(next: Prefs): void {
  try {
    const f = prefFile();
    if (!f.exists) f.create({ intermediates: true, overwrite: true });
    f.write(JSON.stringify(next));
  } catch {
    // 저장 실패는 조용히 넘긴다 (다음 실행에서 기본값으로 동작)
  }
}

export function isSeatAlertEnabled(): boolean {
  return readPushPrefs().seatAlert;
}

export function setSeatAlertEnabled(enabled: boolean): void {
  writePushPrefs({ seatAlert: enabled });
}
