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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-6">
          <p className="text-3xl mb-2">📒</p>
          <h1 className="text-xl font-bold text-gray-900">할일 + 계획 관리</h1>
          <p className="text-sm text-gray-500 mt-1">단기 실행과 장기 목표를 한 곳에서</p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-sm">
            {errorMessage}
          </div>
        )}

        <a
          href="/api/auth/github"
          className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.16 1.18.92-.26 1.91-.39 2.89-.4.98 0 1.97.13 2.89.39 2.2-1.49 3.16-1.18 3.16-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.26 5.69.41.36.78 1.06.78 2.13 0 1.54-.01 2.79-.01 3.17 0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12c0-6.35-5.15-11.5-11.5-11.5z" />
          </svg>
          GitHub로 로그인
        </a>

        <p className="text-xs text-gray-400 text-center mt-6">
          로그인 시 GitHub 사용자명과 프로필 사진을 저장합니다.
        </p>
      </div>
    </div>
  );
}
