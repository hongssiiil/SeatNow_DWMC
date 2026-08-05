import { supabase } from './supabase';

/** 2~10자, 한글/영문/숫자/공백 */
export function validateNickname(raw: string): boolean {
  const t = raw.trim();
  if (t.length < 2 || t.length > 10) return false;
  return /^[가-힣a-zA-Z0-9 ]+$/.test(t);
}

export async function fetchNickname(userKey: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('user_key', userKey)
    .maybeSingle();
  if (error || !data) return null;
  return (data.nickname as string) || null;
}

/**
 * 닉네임 저장 + 과거 리뷰 nickname 일괄 갱신.
 * (review에 nickname denormalize 유지 — join 없이 즉시 반영)
 */
export async function saveNickname(
  userKey: string,
  nickname: string
): Promise<boolean> {
  const name = nickname.trim();
  if (!validateNickname(name)) return false;

  if (!supabase) return true;

  const { error: profileError } = await supabase.from('profiles').upsert({
    user_key: userKey,
    nickname: name,
    updated_at: new Date().toISOString(),
  });
  if (profileError) {
    console.warn('[profile] upsert failed:', profileError.message);
    return false;
  }

  const { error: reviewError } = await supabase
    .from('reviews')
    .update({ nickname: name })
    .eq('user_key', userKey);
  if (reviewError) {
    console.warn('[profile] review nickname sync failed:', reviewError.message);
    // 프로필은 저장됐으므로 성공으로 처리
  }

  return true;
}
