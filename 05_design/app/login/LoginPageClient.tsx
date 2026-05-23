'use client';
import { useSearchParams } from 'next/navigation';

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: '로그인 응답에 코드가 없습니다. 다시 시도해주세요.',
  invalid_state: '보안 검증에 실패했습니다. 다시 시도해주세요.',
  oauth_not_configured: '서버에 GitHub OAuth 자격 증명이 설정되지 않았습니다.',
  token_exchange_failed: 'GitHub 토큰 교환에 실패했습니다.',
  user_fetch_failed: 'GitHub 사용자 정보를 가져오지 못했습니다.',
  no_token: '액세스 토큰을 받지 못했습니다.',
};

export default function LoginPageClient() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error');
  const errorMessage = errorCode
    ? ERROR_MESSAGES[errorCode] ?? `로그인에 실패했습니다 (${errorCode}).`
    : null;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: '#f7f7f7' }}
    >
      <div
        className="w-full max-w-sm"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #dddddd',
          borderRadius: '14px',
          padding: '40px 32px',
          boxShadow:
            'rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0',
        }}
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
            style={{ backgroundColor: '#fff0f3' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff385c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#222222' }}>
            할일 + 계획
          </h1>
          <p className="text-sm mt-1.5" style={{ color: '#6a6a6a' }}>
            단기 실행과 장기 목표를 한 곳에서
          </p>
        </div>

        {/* Error */}
        {errorMessage && (
          <div
            className="mb-5 p-3 rounded-[8px] text-sm"
            style={{
              backgroundColor: '#fff0f0',
              border: '1px solid #ffd0d0',
              color: '#c13515',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* GitHub OAuth button */}
        <a
          href="/api/auth/github"
          className="flex items-center justify-center gap-2.5 w-full rounded-[8px] text-sm font-medium transition-colors"
          style={{
            backgroundColor: '#24292f',
            color: '#ffffff',
            padding: '12px 20px',
            textDecoration: 'none',
            height: '48px',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#1c2128')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#24292f')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.16 1.18.92-.26 1.91-.39 2.89-.4.98 0 1.97.13 2.89.39 2.2-1.49 3.16-1.18 3.16-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.26 5.69.41.36.78 1.06.78 2.13 0 1.54-.01 2.79-.01 3.17 0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12c0-6.35-5.15-11.5-11.5-11.5z" />
          </svg>
          GitHub로 로그인
        </a>

        <p className="text-xs text-center mt-6" style={{ color: '#929292' }}>
          로그인 시 GitHub 사용자명과 프로필 사진을 저장합니다.
        </p>
      </div>
    </div>
  );
}
