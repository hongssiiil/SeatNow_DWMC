/**
 * Cafe open/closed helper.
 * - businessHours / regularHoliday / weekday·weekend strings → compute
 * - cafe.isOpen === null → unknown (no CLOSED UI)
 * - cafe.isOpen === true|false → mock / API override (우선)
 */

export type CafeOpenInput = {
  /** null = 정보 없음, boolean = 명시적 상태(목업/API) */
  isOpen?: boolean | null;
  /** 0=Sun … 6=Sat, null = 그날 휴무, string = "09:00-22:00" | "09:00 - 22:00" */
  businessHours?: (string | null)[] | null;
  /** 정기휴무 요일 (0=Sun … 6=Sat) */
  regularHoliday?: number[] | null;
  hoursWeekday?: string;
  hoursWeekend?: string;
};

function seoulParts(d: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const day = weekdayMap[get('weekday')] ?? d.getDay();
  let hour = parseInt(get('hour'), 10);
  const minute = parseInt(get('minute'), 10);
  // en-US hour12:false can still yield "24" in some engines
  if (hour === 24) hour = 0;
  return { day, minutes: hour * 60 + minute };
}

/** "09:00 - 22:00" | "09:00-22:00" → [startMin, endMin] */
export function parseHoursRange(raw: string): [number, number] | null {
  const m = raw
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*[-–~]\s*(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const start = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  let end = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
  if (end === 0 && start > 0) end = 24 * 60; // 24:00
  return [start, end];
}

function resolveTodayRange(
  cafe: CafeOpenInput,
  day: number
): string | null | undefined {
  if (cafe.businessHours && cafe.businessHours.length === 7) {
    return cafe.businessHours[day];
  }
  if (cafe.hoursWeekday || cafe.hoursWeekend) {
    const isWeekend = day === 0 || day === 6;
    return isWeekend
      ? cafe.hoursWeekend ?? cafe.hoursWeekday
      : cafe.hoursWeekday ?? cafe.hoursWeekend;
  }
  return undefined;
}

/**
 * @returns true=영업중, false=휴무/영업종료, null=정보 없음(CLOSED 미표시)
 */
export function isCafeOpen(
  cafe: CafeOpenInput,
  currentTime: Date = new Date()
): boolean | null {
  // 명시적 목업/API 필드 (정보 없음 포함)
  if (cafe.isOpen === null) return null;
  if (typeof cafe.isOpen === 'boolean') return cafe.isOpen;

  const { day, minutes } = seoulParts(currentTime);

  if (cafe.regularHoliday?.includes(day)) return false;

  const today = resolveTodayRange(cafe, day);
  if (today === undefined) return null;
  if (today === null || today.trim() === '' || today === '휴무') return false;

  const range = parseHoursRange(today);
  if (!range) return null;

  const [start, end] = range;
  if (end < start) {
    // overnight e.g. 22:00-02:00
    return minutes >= start || minutes < end;
  }
  return minutes >= start && minutes < end;
}

export function isCafeClosed(cafe: CafeOpenInput, currentTime?: Date): boolean {
  return isCafeOpen(cafe, currentTime) === false;
}
