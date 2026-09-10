BUYSOR V4.1 - macOS local preview

1) ZIP 파일을 완전히 압축 해제합니다.
2) 00_START_BUYSOR_MAC.command 를 더블클릭합니다.
3) 처음 실행이면 npm 패키지 설치 때문에 몇 분 걸릴 수 있습니다.
4) 준비가 끝나면 http://127.0.0.1:5173/ 이 자동으로 열립니다.
5) 종료할 때는 00_STOP_BUYSOR_MAC.command 를 더블클릭합니다.

필수: Node.js 22.13 이상

macOS가 처음 실행을 차단하면:
- Finder에서 00_START_BUYSOR_MAC.command를 Control-클릭(또는 우클릭) -> 열기
- 그래도 실행 권한 오류가 나면 Terminal에서 압축 푼 폴더로 이동 후:
  chmod +x 00_START_BUYSOR_MAC.command 00_STOP_BUYSOR_MAC.command

이 Mac 버전은 사용자가 업로드한 BUYSOR RELEASE V4.1 룰렛 수정본의 사이트 코드는 변경하지 않고,
Windows 실행 파일만 Mac용 .command 실행기로 교체한 버전입니다.
