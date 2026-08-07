/**
 * 헤더 검색폼(`app-shell.tsx`)과 고객 화면 검색폼(`customers-page.tsx`)이 같은 목록을 쓴다.
 * 두 벌로 두면 한쪽에만 항목이 추가돼 같은 이름의 다른 드롭다운이 된다.
 */
export const searchModes: readonly (readonly [string, string])[] = [
  ["phone-or-name", "핸드폰 뒷번호/고객명"],
  ["nickname", "닉네임"],
  ["phone", "전화번호 뒷번호"],
  ["group", "그룹명"],
  ["memo", "메모"],
  ["address", "주소"],
  ["motive", "방문동기"],
  ["email", "이메일"],
  ["point-card", "포인트 카드"],
  ["family", "패밀리번호"],
];
