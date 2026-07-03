export function friendlyError(error: unknown, fallback = "작업을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.") {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (!message) return fallback;
  if (/fetch|network|failed to fetch/i.test(message)) {
    return "네트워크 연결을 확인한 뒤 다시 시도해 주세요.";
  }
  if (/JWT|permission|policy|row-level|RLS|not authorized|Unauthorized/i.test(message)) {
    return "권한이 없거나 로그인 세션이 만료되었습니다. 다시 로그인해 주세요.";
  }
  if (/Invalid login credentials/i.test(message)) {
    return "비밀번호가 올바르지 않습니다.";
  }
  if (/supabase/i.test(message) && /setting|config|설정/i.test(message)) {
    return "Supabase 환경 변수가 아직 설정되지 않았습니다.";
  }

  return fallback;
}
