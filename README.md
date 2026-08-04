# 연극공연지원사업 정보

연극 공연·단체를 위한 지원사업(중앙정부/공공기관, 지역문화재단, 민간/기업) 정보를 모아 보여주는 정적 사이트입니다. 빌드 도구 없이 순수 HTML/CSS/JS로 동작하며 GitHub Pages로 배포됩니다.

## 로컬 실행

```bash
python -m http.server 8000
```

`http://localhost:8000` 접속. (`index.html`을 `file://`로 직접 열면 `fetch`가 실패합니다.)

## 파일 구조

- `index.html`, `styles.css`, `app.js` — 정적 프론트엔드
- `data/programs.json` — 지원사업 데이터 (이 파일이 매일 자동 갱신됨)

## `data/programs.json` 스키마

```json
{
  "last_updated": "ISO 8601 timestamp",
  "programs": [
    {
      "id": "사업명+주관기관 기반 고유 슬러그",
      "사업명": "string",
      "주관기관": "string",
      "카테고리": "중앙정부/공공기관 | 지역문화재단 | 민간/기업",
      "지역": "string | null (전국 단위면 null)",
      "지원대상": "string",
      "지원내용": "string (자유 텍스트, 금액/규모)",
      "신청기간_시작": "YYYY-MM-DD | null",
      "신청기간_마감": "YYYY-MM-DD | null",
      "원문상태": "string | null (예: 상시모집, 예산 소진 시까지)",
      "신청방법": "string",
      "신청링크": "URL | null",
      "원본공고링크": "URL (필수)",
      "문의처": "string | null",
      "최종확인일": "YYYY-MM-DD",
      "비고": "string | null"
    }
  ]
}
```

모집중/예정/마감/상시 상태는 저장하지 않고 `app.js`가 오늘 날짜 기준으로 계산합니다.

## 일일 자동 갱신 작업 (스케줄)

매일 1회 아래 절차로 `data/programs.json`을 갱신하고 git push 합니다:

1. 기존 `data/programs.json` 읽기
2. WebSearch로 조사: 문화체육관광부, 한국문화예술위원회(ARKO), 예술경영지원센터, 각 시·도 문화재단, 주요 민간 문화재단 + "연극 지원사업 공모 [연도]" 등 일반 검색
3. **이번 검색에서 실제로 확인된 내용만 반영** — 모델의 사전 지식으로 필드를 채우지 않음. 불확실한 값은 `null` + `비고`에 "확인필요"
4. `사업명`+`주관기관` 기준으로 dedupe 병합 (기존 갱신 또는 신규 추가, `최종확인일` 갱신)
5. 보존 규칙: 마감일이 지난 지 14일 넘은 항목만 제거. 검색에 단순히 안 나왔다는 이유로는 삭제하지 않음
6. 쓰기 전 검증: JSON 유효성, `id` 중복 없음, 날짜 형식, 필수 필드(사업명/주관기관/카테고리/원본공고링크) 비어있지 않음
7. `last_updated` 갱신. 변경 없으면 커밋 스킵, 있으면 커밋(`chore: 지원사업 데이터 갱신 (YYYY-MM-DD)`) 후 push
