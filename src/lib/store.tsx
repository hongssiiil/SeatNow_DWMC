import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Cafe, INITIAL_CAFES, cafeFromRow } from './data';
import { CafeRow, supabase } from './supabase';

export type User = {
  /** 즐겨찾기·예약 저장 키 (kakao:123 / apple:xxx). 목업 로그인은 mock 키 */
  key: string;
  name: string;
  email?: string;
  provider: 'kakao' | 'apple';
  joinedAt: number;
};

type AppState = {
  cafes: Cafe[];
  user: User | null;
  isGuest: boolean;
  bookmarks: string[];
  recentSearches: string[];
  now: number;
  /** Supabase 연결 여부 (false면 목업 데이터) */
  live: boolean;
  login: (
    provider: 'kakao' | 'apple',
    profile: { id?: string; name: string; email?: string }
  ) => void;
  continueAsGuest: () => void;
  logout: () => void;
  toggleBookmark: (cafeId: string) => boolean; // 게스트면 false 반환
  addRecentSearch: (q: string) => void;
  removeRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
  /** 예약(테이크인). 성공 시 true */
  reserve: (cafeId: string, seatNo: number | null) => Promise<boolean>;
};

const AppContext = createContext<AppState | null>(null);

const DAY = 24 * 60 * 60 * 1000;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [cafes, setCafes] = useState<Cafe[]>(INITIAL_CAFES);
  const [live, setLive] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    '톤즈',
    '성수동 카페',
    '콘센트 있는 카페',
  ]);
  const [now, setNow] = useState(Date.now());
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  // 시계 (업데이트 라벨 갱신)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  // ── Supabase: 카페 로드 + Realtime 구독 ──────────────────
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.from('cafes').select('*');
      if (cancelled || error || !data || data.length === 0) {
        if (error) console.warn('[supabase] cafes load failed:', error.message);
        return;
      }
      console.log(`[supabase] live mode: ${data.length} cafes loaded`);
      setCafes((data as CafeRow[]).map(cafeFromRow));
      setLive(true);
    })();

    const channel = supabase
      .channel('cafes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cafes' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: string })?.id;
            if (oldId) setCafes((prev) => prev.filter((c) => c.id !== oldId));
            return;
          }
          const row = payload.new as CafeRow;
          if (!row?.id) return;
          console.log(`[supabase] realtime: ${row.name} 좌석 ${row.seats_available}/${row.seats_total}`);
          const mapped = cafeFromRow(row);
          setCafes((prev) => {
            const exists = prev.some((c) => c.id === mapped.id);
            return exists
              ? prev.map((c) => (c.id === mapped.id ? mapped : c))
              : [...prev, mapped];
          });
          setNow(Date.now());
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase?.removeChannel(channel);
    };
  }, []);

  // ── 목업 모드일 때만: 가짜 실시간 좌석 변동 ────────────────
  useEffect(() => {
    if (live) return;
    const t = setInterval(() => {
      setCafes((prev) => {
        const idx = Math.floor(Math.random() * prev.length);
        return prev.map((c, i) => {
          if (i !== idx) return c;
          const delta = Math.random() > 0.5 ? 1 : -1;
          const next = Math.min(c.seatsTotal, Math.max(0, c.seatsAvailable + delta));
          if (next === c.seatsAvailable) return c;
          return { ...c, seatsAvailable: next, lastUpdated: Date.now() };
        });
      });
      setNow(Date.now());
    }, 25 * 1000);
    return () => clearInterval(t);
  }, [live]);

  // ── 즐겨찾기 로드 (로그인 시) ────────────────────────────
  const loadBookmarks = useCallback(async (userKey: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('favorites')
      .select('cafe_id')
      .eq('user_key', userKey);
    if (data) setBookmarks(data.map((r: { cafe_id: string }) => r.cafe_id));
  }, []);

  const login = useCallback(
    (
      provider: 'kakao' | 'apple',
      profile: { id?: string; name: string; email?: string }
    ) => {
      // id가 없으면 provider별 공유 키로 묶여 데이터가 섞이므로 provider 단독 키를 쓰지 않는다
      const key = profile.id ?? `${provider}:unknown`;
      setUser({
        key,
        name: profile.name,
        email: profile.email,
        provider,
        joinedAt: Date.now() - 12 * DAY,
      });
      setIsGuest(false);
      setBookmarks([]);
      loadBookmarks(key);
    },
    [loadBookmarks]
  );

  const continueAsGuest = useCallback(() => {
    setUser(null);
    setIsGuest(true);
    setBookmarks([]);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsGuest(false);
    setBookmarks([]);
  }, []);

  const toggleBookmark = useCallback((cafeId: string) => {
    const u = userRef.current;
    if (!u) return false;
    setBookmarks((prev) => {
      const adding = !prev.includes(cafeId);
      // DB 동기화 (fire-and-forget)
      if (supabase) {
        if (adding) {
          supabase
            .from('favorites')
            .upsert({ user_key: u.key, cafe_id: cafeId })
            .then(() => {});
        } else {
          supabase
            .from('favorites')
            .delete()
            .eq('user_key', u.key)
            .eq('cafe_id', cafeId)
            .then(() => {});
        }
      }
      return adding ? [...prev, cafeId] : prev.filter((id) => id !== cafeId);
    });
    return true;
  }, []);

  const reserve = useCallback(async (cafeId: string, seatNo: number | null) => {
    const u = userRef.current;
    if (!u) return false;
    if (!supabase) return true; // 목업 모드: 저장 없이 성공 처리
    const { error } = await supabase.from('reservations').insert({
      user_key: u.key,
      user_name: u.name,
      cafe_id: cafeId,
      seat_no: seatNo,
    });
    return !error;
  }, []);

  const addRecentSearch = useCallback((q: string) => {
    const query = q.trim();
    if (!query) return;
    setRecentSearches((prev) => [query, ...prev.filter((s) => s !== query)].slice(0, 10));
  }, []);

  const removeRecentSearch = useCallback((q: string) => {
    setRecentSearches((prev) => prev.filter((s) => s !== q));
  }, []);

  const clearRecentSearches = useCallback(() => setRecentSearches([]), []);

  const value = useMemo(
    () => ({
      cafes,
      user,
      isGuest,
      bookmarks,
      recentSearches,
      now,
      live,
      login,
      continueAsGuest,
      logout,
      toggleBookmark,
      addRecentSearch,
      removeRecentSearch,
      clearRecentSearches,
      reserve,
    }),
    [
      cafes,
      user,
      isGuest,
      bookmarks,
      recentSearches,
      now,
      live,
      login,
      continueAsGuest,
      logout,
      toggleBookmark,
      addRecentSearch,
      removeRecentSearch,
      clearRecentSearches,
      reserve,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
