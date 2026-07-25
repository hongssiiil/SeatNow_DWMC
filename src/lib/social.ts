import { supabase } from './supabase';

export type CafeReview = {
  id: string;
  cafeId: string;
  userKey: string;
  nickname: string;
  rating: number;
  text: string;
  createdAt: number;
};

/**
 * 앱 세션 내 리뷰 저장소.
 * - 목업 모드 (!supabase)
 * - DB insert 실패 시 폴백
 * fetchReviews가 항상 여기와 DB 결과를 합쳐 카페 상세에 반영.
 */
const memoryReviews: CafeReview[] = [];

function upsertMemoryReview(review: CafeReview) {
  const idx = memoryReviews.findIndex((r) => r.id === review.id);
  if (idx >= 0) memoryReviews[idx] = review;
  else memoryReviews.unshift(review);
}

function memoryReviewsForCafe(cafeId: string): CafeReview[] {
  return memoryReviews
    .filter((r) => r.cafeId === cafeId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

function memoryLatestReviewForUser(
  cafeId: string,
  userKey: string
): CafeReview | null {
  return (
    memoryReviews.find((r) => r.cafeId === cafeId && r.userKey === userKey) ??
    null
  );
}

function mergeReviews(db: CafeReview[], local: CafeReview[]): CafeReview[] {
  const map = new Map<string, CafeReview>();
  for (const r of [...local, ...db]) {
    // 같은 id면 최신 createdAt 우선; id 다르면 둘 다 유지
    const prev = map.get(r.id);
    if (!prev || r.createdAt >= prev.createdAt) map.set(r.id, r);
  }
  // 로컬 전용(local-*)과 DB를 합친 뒤 시간순
  return [...map.values()].sort((a, b) => b.createdAt - a.createdAt);
}

/** 목업 모드 visitCounts */
const mockVisitCounts = new Map<
  string,
  { visitCount: number; lastVisitedAt: number }
>();

/** 최근 테이크인 목록 기본 limit */
export const RECENT_TAKEIN_LIMIT = 20;

export type RecentTakeIn = {
  cafeId: string;
  visitCount: number;
  /** lastVisitedAt — visit_counts.updated_at */
  lastVisitedAt: number;
  /** 해당 카페에 유저가 남긴 최신 리뷰 (없으면 null) */
  myReview: CafeReview | null;
};

function visitKey(userKey: string, cafeId: string) {
  return `${userKey}::${cafeId}`;
}

/**
 * 유저×카페 테이크인 횟수 (visitCounts).
 * completed(PoC): take_in 성공 누적 − 취소. occupied 전환 파이프라인 안정화 후 기준 변경 가능.
 */
export async function fetchVisitCount(
  cafeId: string,
  userKey: string
): Promise<number> {
  if (!userKey) return 0;
  if (!supabase) {
    return mockVisitCounts.get(visitKey(userKey, cafeId))?.visitCount ?? 0;
  }
  const { data, error } = await supabase
    .from('visit_counts')
    .select('visit_count')
    .eq('user_key', userKey)
    .eq('cafe_id', cafeId)
    .maybeSingle();
  if (error) {
    console.warn('[visitCounts] fetch failed:', error.message);
    return 0;
  }
  return (data?.visit_count as number) ?? 0;
}

/** 로그인 유저의 전체 visitCounts 맵 (목록 카드용, 읽기 1회) */
export async function fetchAllVisitCounts(
  userKey: string
): Promise<Record<string, number>> {
  if (!userKey) return {};
  if (!supabase) {
    const prefix = `${userKey}::`;
    const out: Record<string, number> = {};
    for (const [key, v] of mockVisitCounts) {
      if (!key.startsWith(prefix) || v.visitCount <= 0) continue;
      out[key.slice(prefix.length)] = v.visitCount;
    }
    return out;
  }
  const { data, error } = await supabase
    .from('visit_counts')
    .select('cafe_id, visit_count')
    .eq('user_key', userKey)
    .gt('visit_count', 0);
  if (error || !data) {
    console.warn('[visitCounts] list failed:', error?.message);
    return {};
  }
  const out: Record<string, number> = {};
  for (const r of data) {
    out[r.cafe_id as string] = r.visit_count as number;
  }
  return out;
}

/** completed 카운트 ±delta (목업/RPC 공용) */
export async function bumpVisitCount(
  cafeId: string,
  userKey: string,
  delta: number
): Promise<number> {
  if (!userKey || delta === 0) return fetchVisitCount(cafeId, userKey);

  if (!supabase) {
    const key = visitKey(userKey, cafeId);
    const prev = mockVisitCounts.get(key);
    const next = Math.max(0, (prev?.visitCount ?? 0) + delta);
    if (next === 0) mockVisitCounts.delete(key);
    else {
      mockVisitCounts.set(key, {
        visitCount: next,
        lastVisitedAt: delta > 0 ? Date.now() : (prev?.lastVisitedAt ?? Date.now()),
      });
    }
    return next;
  }

  const { data, error } = await supabase.rpc('increment_visit_count', {
    p_user_key: userKey,
    p_cafe_id: cafeId,
    p_delta: delta,
  });
  if (error) {
    console.warn('[visitCounts] bump failed:', error.message);
    return fetchVisitCount(cafeId, userKey);
  }
  return typeof data === 'number' ? data : 0;
}

/** 유저의 최근 테이크인 카페 (lastVisitedAt desc, limit) */
export async function fetchRecentTakeIns(
  userKey: string,
  limit = RECENT_TAKEIN_LIMIT
): Promise<RecentTakeIn[]> {
  if (!userKey) return [];

  if (!supabase) {
    const prefix = `${userKey}::`;
    const rows: RecentTakeIn[] = [];
    for (const [key, v] of mockVisitCounts) {
      if (!key.startsWith(prefix) || v.visitCount <= 0) continue;
      const cafeId = key.slice(prefix.length);
      rows.push({
        cafeId,
        visitCount: v.visitCount,
        lastVisitedAt: v.lastVisitedAt,
        myReview: memoryLatestReviewForUser(cafeId, userKey),
      });
    }
    rows.sort((a, b) => b.lastVisitedAt - a.lastVisitedAt);
    return rows.slice(0, limit);
  }

  const { data, error } = await supabase
    .from('visit_counts')
    .select('cafe_id, visit_count, updated_at')
    .eq('user_key', userKey)
    .gt('visit_count', 0)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.warn('[recent-takein] fetch failed:', error?.message);
    return [];
  }

  const cafeIds = data.map((r) => r.cafe_id as string);
  const reviewByCafe = new Map<string, CafeReview>();

  if (cafeIds.length > 0) {
    const { data: reviews, error: revErr } = await supabase
      .from('reviews')
      .select('id, cafe_id, user_key, nickname, rating, body, created_at')
      .eq('user_key', userKey)
      .in('cafe_id', cafeIds)
      .order('created_at', { ascending: false });
    if (!revErr && reviews) {
      for (const r of reviews) {
        const cafeId = r.cafe_id as string;
        if (reviewByCafe.has(cafeId)) continue; // 카페당 최신 1건
        reviewByCafe.set(cafeId, {
          id: r.id as string,
          cafeId,
          userKey: r.user_key as string,
          nickname: (r.nickname as string) || '익명',
          rating: r.rating as number,
          text: (r.body as string) || '',
          createdAt: new Date(r.created_at as string).getTime(),
        });
      }
    }
  }

  // 메모리 리뷰로 보완 (DB 미반영·목업)
  for (const cafeId of cafeIds) {
    if (reviewByCafe.has(cafeId)) continue;
    const mem = memoryLatestReviewForUser(cafeId, userKey);
    if (mem) reviewByCafe.set(cafeId, mem);
  }

  return data.map((r) => ({
    cafeId: r.cafe_id as string,
    visitCount: r.visit_count as number,
    lastVisitedAt: new Date(r.updated_at as string).getTime(),
    myReview: reviewByCafe.get(r.cafe_id as string) ?? null,
  }));
}

/** Asia/Seoul YYYY-MM-DD */
export function seoulDateKey(d = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

function seoulDayBounds(dateKey = seoulDateKey()) {
  // Treat Seoul calendar day as UTC+9 window
  const start = new Date(`${dateKey}T00:00:00+09:00`);
  const end = new Date(`${dateKey}T24:00:00+09:00`);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export async function fetchLiked(
  cafeId: string,
  userKey: string
): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase
    .from('likes')
    .select('cafe_id')
    .eq('cafe_id', cafeId)
    .eq('user_key', userKey)
    .maybeSingle();
  return !!data;
}

export async function toggleLike(
  cafeId: string,
  userKey: string
): Promise<{ liked: boolean; likeCount: number } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('toggle_cafe_like', {
    p_user_key: userKey,
    p_cafe_id: cafeId,
  });
  if (error || !data) {
    console.warn('[likes] toggle failed:', error?.message);
    return null;
  }
  const row = data as { liked: boolean; like_count: number };
  return { liked: row.liked, likeCount: row.like_count };
}

export async function fetchReviews(cafeId: string): Promise<CafeReview[]> {
  const local = memoryReviewsForCafe(cafeId);
  if (!supabase) return local;

  const { data, error } = await supabase
    .from('reviews')
    .select('id, cafe_id, user_key, nickname, rating, body, created_at')
    .eq('cafe_id', cafeId)
    .order('created_at', { ascending: false });
  if (error || !data) {
    console.warn('[reviews] load failed:', error?.message);
    return local;
  }
  const db = data.map((r) => ({
    id: r.id as string,
    cafeId: r.cafe_id as string,
    userKey: r.user_key as string,
    nickname: (r.nickname as string) || '익명',
    rating: r.rating as number,
    text: (r.body as string) || '',
    createdAt: new Date(r.created_at as string).getTime(),
  }));
  return mergeReviews(db, local);
}

export async function submitReview(input: {
  cafeId: string;
  userKey: string;
  nickname: string;
  rating: number;
  text: string;
}): Promise<CafeReview | null> {
  if (input.rating < 1 || input.rating > 5) return null;

  const localReview: CafeReview = {
    id: `local-${Date.now()}`,
    cafeId: input.cafeId,
    userKey: input.userKey,
    nickname: input.nickname,
    rating: input.rating,
    text: input.text.trim(),
    createdAt: Date.now(),
  };

  if (!supabase) {
    upsertMemoryReview(localReview);
    return localReview;
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      cafe_id: input.cafeId,
      user_key: input.userKey,
      nickname: input.nickname,
      rating: input.rating,
      body: input.text.trim(),
    })
    .select('id, cafe_id, user_key, nickname, rating, body, created_at')
    .single();

  if (error || !data) {
    // DB 미준비(테이블 없음 등)여도 세션 내에는 저장·상세 반영
    console.warn('[reviews] insert failed, using memory fallback:', error?.message);
    upsertMemoryReview(localReview);
    return localReview;
  }

  const saved: CafeReview = {
    id: data.id as string,
    cafeId: data.cafe_id as string,
    userKey: data.user_key as string,
    nickname: (data.nickname as string) || '익명',
    rating: data.rating as number,
    text: (data.body as string) || '',
    createdAt: new Date(data.created_at as string).getTime(),
  };
  upsertMemoryReview(saved);
  return saved;
}

/** 기존 리뷰 수정 (리뷰 수정 버튼) */
export async function updateReview(input: {
  reviewId: string;
  cafeId: string;
  userKey: string;
  nickname: string;
  rating: number;
  text: string;
}): Promise<CafeReview | null> {
  if (input.rating < 1 || input.rating > 5) return null;

  const localReview: CafeReview = {
    id: input.reviewId,
    cafeId: input.cafeId,
    userKey: input.userKey,
    nickname: input.nickname,
    rating: input.rating,
    text: input.text.trim(),
    createdAt: Date.now(),
  };

  if (!supabase || input.reviewId.startsWith('local-')) {
    upsertMemoryReview(localReview);
    return localReview;
  }

  const { data, error } = await supabase
    .from('reviews')
    .update({
      nickname: input.nickname,
      rating: input.rating,
      body: input.text.trim(),
    })
    .eq('id', input.reviewId)
    .eq('user_key', input.userKey)
    .select('id, cafe_id, user_key, nickname, rating, body, created_at')
    .single();

  if (error || !data) {
    console.warn('[reviews] update failed, using memory fallback:', error?.message);
    upsertMemoryReview(localReview);
    return localReview;
  }

  const saved: CafeReview = {
    id: data.id as string,
    cafeId: data.cafe_id as string,
    userKey: data.user_key as string,
    nickname: (data.nickname as string) || '익명',
    rating: data.rating as number,
    text: (data.body as string) || '',
    createdAt: new Date(data.created_at as string).getTime(),
  };
  upsertMemoryReview(saved);
  return saved;
}

/**
 * 오늘(서울) 이 카페 "체크인"(방문 인증) 여부.
 * 현재는 reservations 이력을 사용. GPS 체크인 도입 시 그 테이블로 교체.
 * 좌석 테이크인(status=reserved)과는 별개.
 */
export async function hasCheckedInToday(
  cafeId: string,
  userKey: string
): Promise<boolean> {
  if (!supabase) return false;
  const { startIso, endIso } = seoulDayBounds();
  const { data, error } = await supabase
    .from('reservations')
    .select('id')
    .eq('cafe_id', cafeId)
    .eq('user_key', userKey)
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .limit(1);
  if (error) {
    console.warn('[checkin] query failed:', error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** 오늘(서울) 이 카페에 이미 리뷰를 썼는지 */
export async function hasReviewedToday(
  cafeId: string,
  userKey: string
): Promise<boolean> {
  const { startIso, endIso } = seoulDayBounds();
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  const memHit = memoryReviews.some(
    (r) =>
      r.cafeId === cafeId &&
      r.userKey === userKey &&
      r.createdAt >= startMs &&
      r.createdAt < endMs
  );
  if (memHit) return true;
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('reviews')
    .select('id')
    .eq('cafe_id', cafeId)
    .eq('user_key', userKey)
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .limit(1);
  if (error) {
    console.warn('[reviews] today check failed:', error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}
