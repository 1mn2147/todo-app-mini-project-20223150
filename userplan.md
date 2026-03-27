**목표**  
- 프론트엔드(React + Vite), 백엔드(Express), 데이터베이스(MongoDB Atlas)를 모두 연결한 Todo 앱을 만들어라.
- 소프트웨어공학 프로세스(요구사항 → 구현 → 테스팅 → 배포)를 미리 맛보기
### 1. MVP (최소 기능)
- Todo 항목 추가 (제목 입력)
- Todo 목록 보기
- Todo 완료 체크 (체크박스)
- Todo 삭제
### 2. 추가 기능
- 계정 관리
- 로그인
- 회원가입
- 계정 정보
### 3. 기술 스택
- **Frontend**: React + Vite (빠르고 현대적, CRA보다 훨씬 빠름)
- **Backend**: Node.js + Express (간단 REST API)
- **Database**: MongoDB Atlas (무료 클라우드 DB, 연결 쉬움)
- **배포**: Vercel (프론트 + 백엔드 모두 지원, GitHub 연동 자동 배포)
- **스타일링**: Tailwind CSS 또는 기본 CSS (시간 절약용)
- **HTTP 클라이언트**: Axios 또는 fetch

### 4. 추가 사항
1. 프론트엔드는 stitch mcp에 있는 정보들을 활용해 개발할것.
2. README.md를 작성하라.
3. `src/App.jsx`에 Todo UI 구현 (axios로 백엔드 호출)
   - GET /api/todos 로 목록 불러오기
   - POST /api/todos 로 추가
   - PUT /api/todos/:id 로 체크
   - DELETE /api/todos/:id 로 삭제