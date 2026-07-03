# SMOKED JEWEL CASE

뮤지션 프로필, 외부 링크, 노래/가사 아카이브를 Supabase에 저장하고 GitHub Pages로 배포하는 React + Vite + TypeScript 프로젝트입니다.

## 1. Supabase 프로젝트 만들기

1. [Supabase](https://supabase.com/)에 로그인합니다.
2. New project를 누릅니다.
3. 프로젝트 이름과 데이터베이스 비밀번호를 정하고 생성합니다.
4. 프로젝트가 준비될 때까지 기다립니다.

## 2. SQL 실행 순서

Supabase 대시보드의 SQL Editor에서 아래 파일을 순서대로 실행합니다.

1. `supabase/schema.sql`
2. `supabase/visitor-rpc.sql`
3. `supabase/storage-policies.sql`
4. 필요한 경우 `supabase/seed.sql`

`schema.sql`은 테이블, RLS 정책, 관리자 확인 함수, 기본 프로필 행을 만듭니다. `visitor-rpc.sql`은 페이지 로드마다 방문자 수를 원자적으로 증가시키는 `increment_visit()` 함수를 만듭니다. `storage-policies.sql`은 `site-images` 버킷과 이미지 정책을 만듭니다.

## 3. Storage bucket 확인

`storage-policies.sql`을 실행하면 `site-images` 버킷이 생성됩니다. Storage 메뉴에서 다음을 확인하세요.

- Bucket 이름: `site-images`
- Public bucket: 켜짐
- 허용 MIME 타입: `image/jpeg`, `image/png`, `image/webp`

이미지 업로드는 관리자 인증 사용자만 가능하고, 공개 화면에서는 이미지를 읽을 수 있습니다.

## 4. 관리자 계정 만들기

1. Supabase 대시보드에서 Authentication 메뉴로 이동합니다.
2. Users 탭에서 Add user를 누릅니다.
3. 관리자 이메일을 입력합니다.
4. 비밀번호는 이 작업 요청서에서 전달한 관리자 비밀번호로 설정합니다.
5. Email confirmed 옵션이 있다면 켜서 바로 로그인할 수 있게 합니다.

이 저장소에는 관리자 비밀번호를 코드, `.env.example`, README에 저장하지 않습니다.

## 5. 관리자 UUID 등록

Authentication의 Users 목록에서 방금 만든 관리자 사용자의 User UID를 복사합니다. SQL Editor에서 아래 SQL의 UUID 부분을 바꿔 실행합니다.

```sql
insert into public.site_admins (user_id)
values ('여기에-관리자-사용자-UUID')
on conflict (user_id) do nothing;
```

이 등록이 끝나야 관리자 화면에서 프로필, 링크, 노래, 이미지를 수정할 수 있습니다.

## 6. Supabase URL과 anon key 확인

1. Supabase 대시보드에서 Project Settings로 이동합니다.
2. API 메뉴를 엽니다.
3. Project URL을 복사합니다.
4. Project API keys의 anon public key를 복사합니다.

service role key는 이 앱에 넣지 않습니다.

## 7. 로컬 `.env` 작성

프로젝트 루트에 `.env` 파일을 만들고 아래처럼 입력합니다.

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_ADMIN_EMAIL=admin@example.com
```

`VITE_ADMIN_EMAIL`에는 Supabase Authentication에서 만든 관리자 이메일을 입력합니다. 관리자 비밀번호는 `.env`에 쓰지 않습니다.

## 8. 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 터미널에 표시된 로컬 주소를 엽니다. 하단의 작은 자물쇠 버튼을 누르면 관리자 로그인 화면이 열립니다.

## 9. GitHub 저장소에 올리기

```bash
git init
git add .
git commit -m "Initial smoked jewel case archive"
git branch -M main
git remote add origin https://github.com/USER/REPOSITORY.git
git push -u origin main
```

이미 저장소가 있다면 remote 주소만 기존 저장소에 맞게 사용하면 됩니다.

## 10. GitHub Pages 설정

1. GitHub 저장소의 Settings로 이동합니다.
2. Pages 메뉴를 엽니다.
3. Build and deployment의 Source를 GitHub Actions로 선택합니다.

`vite.config.ts`는 GitHub Actions의 저장소 이름을 감지해 `/저장소이름/` base 경로를 자동으로 사용합니다. 로컬에서는 `./` base로 빌드됩니다.

## 11. GitHub Actions 변수 등록

GitHub 저장소의 Settings > Secrets and variables > Actions > Variables에 아래 값을 등록합니다.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAIL`

anon key는 공개 클라이언트 키이지만, 저장소에 직접 쓰지 않도록 Actions Variables에 넣는 구성을 권장합니다.

## 12. 배포 주소 확인

`main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 실행됩니다. Actions 탭에서 배포가 성공했는지 확인한 뒤, Settings > Pages에서 표시되는 URL로 접속합니다.

일반적인 주소 형식은 다음과 같습니다.

```text
https://USER.github.io/REPOSITORY/
```

## 13. 이후 수정과 재배포

코드를 수정한 뒤 아래 명령으로 다시 push하면 GitHub Actions가 자동으로 빌드하고 Pages에 배포합니다.

```bash
git add .
git commit -m "Update archive"
git push
```

## 구현된 기능

- Supabase 기반 프로필, 외부 링크, 노래/가사 저장
- 관리자 비밀번호 입력 화면과 Supabase Auth 로그인
- `site_admins` 테이블 기반 관리자 권한 확인
- 이미지 정사각형 크롭, 브라우저 WebP 압축, Storage 업로드
- 프로필 이미지와 곡 이미지 교체 시 기존 파일 정리 시도
- 공개 곡만 일반 방문자에게 표시
- 임시 저장, 공개, 비공개 상태 관리
- CD 케이스 그리드, 목록 보기, 제목 검색
- 가사 모달, ESC 닫기, 내부 스크롤
- `Asia/Seoul` 기준 방문자 증가 RPC
- GitHub Pages Actions 배포

## 주의할 점

- GitHub Pages는 정적 호스팅이므로 서버 전용 secret을 사용할 수 없습니다.
- Supabase service role key를 클라이언트 코드나 GitHub Pages 변수에 넣지 마세요.
- 방문자 수는 한 번의 페이지 로드마다 한 번 RPC를 호출하도록 구성되어 있습니다.
- 실제 Supabase 프로젝트 연결 전에는 화면에 설정 안내가 표시됩니다.
