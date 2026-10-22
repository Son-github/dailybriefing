import { create } from "zustand";

export interface Failure {
  status?: number;
  code?: string;
  requestId?: string;
  message?: string;
  details?: { provider?: string; upstreamStatus?: number };
}
export interface ErrorGuide {
  title: string;
  cause: string;
  steps: string[];
  retryable: boolean;
}
// 공급자 원문/stack 대신 검토된 안내만 표시합니다. 새 오류 코드는 이 표에 해결 방법을 추가하세요.
function baseErrorGuide(error: Failure): ErrorGuide {
  const code = error.code || "UNKNOWN";
  if (code === "STATIC_DEMO_UNSUPPORTED")
    return {
      title: "샘플 체험에서는 사용할 수 없어요",
      cause: "계정과 개인 서버 저장은 LIVE 서버가 필요해요.",
      steps: ["날씨·뉴스·환율·경로 샘플과 대시보드 편집을 체험해 주세요."],
      retryable: false,
    };
  if (code === "BACKEND_UNAVAILABLE")
    return {
      title: "LIVE 서버에 연결하지 못했어요",
      cause: "LIVE 활성화 설정과 실제 서버 정상 동작 여부는 달라요.",
      steps: [
        "상단에서 샘플 체험으로 전환하거나 LIVE 다시 연결을 선택해 주세요.",
      ],
      retryable: false,
    };
  if (code === "UI_ERROR")
    return {
      title: "화면을 표시하지 못했어요",
      cause: "화면을 구성하는 중 예기치 않은 문제가 생겼어요.",
      steps: [
        "작성 중인 내용을 확인하고 화면을 새로고침해 주세요. 저장하지 않은 입력은 사라질 수 있어요.",
        "계속 발생하면 오류 코드를 관리자에게 전달해 주세요.",
      ],
      retryable: true,
    };
  if (code === "LOGIN_FAILED")
    return {
      title: "로그인 정보를 확인해 주세요",
      cause: "이메일 또는 비밀번호가 일치하지 않아요.",
      steps: [
        "이메일의 오타와 비밀번호의 대소문자를 확인해 주세요.",
        "가입한 계정으로 다시 입력해 주세요.",
      ],
      retryable: false,
    };
  if (code === "EMAIL_EXISTS")
    return {
      title: "이미 가입된 이메일이에요",
      cause: "이 이메일로 만든 계정이 있어요.",
      steps: [
        "로그인 화면에서 기존 계정으로 로그인해 주세요.",
        "다른 계정을 만들려면 다른 이메일을 입력해 주세요.",
      ],
      retryable: false,
    };
  if (code === "LOCATION_DENIED")
    return {
      title: "위치 권한이 꺼져 있어요",
      cause: "브라우저에서 현재 위치 사용을 허용하지 않았어요.",
      steps: [
        "주소창의 사이트 설정에서 위치 권한을 허용해 주세요.",
        "권한을 변경하지 않아도 장소 검색이나 지도 선택으로 계속할 수 있어요.",
      ],
      retryable: false,
    };
  if (code.startsWith("LOCATION"))
    return {
      title: "현재 위치를 확인하지 못했어요",
      cause: "기기의 위치 신호가 약하거나 위치 기능을 사용할 수 없어요.",
      steps: [
        "기기의 위치 서비스를 켜고 다시 시도해 주세요.",
        "장소 검색 또는 지도 선택을 이용해 주세요.",
      ],
      retryable: true,
    };
  if (code === "TIMEOUT")
    return {
      title: "응답이 늦어지고 있어요",
      cause: "정해진 시간 안에 정보를 받지 못했어요.",
      steps: [
        "인터넷 연결을 확인해 주세요.",
        "잠시 후 다시 시도해 주세요. 다른 정보는 계속 확인할 수 있어요.",
      ],
      retryable: true,
    };
  if (code === "NETWORK" || code === "OFFLINE")
    return {
      title: "서비스에 연결하지 못했어요",
      cause: "인터넷 연결이 끊겼거나 서버에 접속할 수 없어요.",
      steps: [
        "Wi-Fi 또는 모바일 데이터 연결을 확인해 주세요.",
        "연결이 정상이라면 잠시 후 다시 시도해 주세요.",
      ],
      retryable: true,
    };
  if (code.includes("NOT_CONFIGURED") || code === "MAP_NOT_CONFIGURED")
    return {
      title: "서비스 연결 설정이 필요해요",
      cause: "이 정보 서비스의 API 연결 준비가 완료되지 않았어요.",
      steps: [
        "다른 정보는 계속 이용할 수 있어요.",
        "서비스 관리자에게 오류 코드와 요청 번호를 전달해 주세요. 관리자는 API 설정 가이드를 확인해야 해요.",
      ],
      retryable: false,
    };
  if (code === "PROVIDER_AUTH" || code === "PROVIDER_FORBIDDEN")
    return {
      title: "정보 서비스 이용 승인이 필요해요",
      cause: "외부 서비스가 인증 또는 이용 권한을 승인하지 않았어요.",
      steps: [
        "서비스 관리자가 API 키와 서비스 활성화를 확인해야 해요.",
        "요청 번호를 복사해 관리자에게 전달해 주세요.",
      ],
      retryable: false,
    };
  if (code === "EXCHANGE_UNAVAILABLE")
    return {
      title: "환율이 아직 공표되지 않았어요",
      cause: "공표 전이거나 해당 날짜가 휴일이에요.",
      steps: [
        "영업일 오후에 다시 확인해 주세요.",
        "다른 정보는 계속 이용할 수 있어요.",
      ],
      retryable: true,
    };
  if (code === "KMA_KEY_ENCODING")
    return {
      title: "기상청 인증키 형식을 확인해 주세요",
      cause: "이미 URL 인코딩된 Encoding 키가 설정되어 있어요.",
      steps: [
        "공공데이터포털의 일반 인증키(Decoding)를 복사해 .env의 KMA_API_KEY에 넣어 주세요.",
        "Backend 컨테이너를 다시 생성한 뒤 확인해 주세요. 키 값은 문의 내용이나 로그에 넣지 마세요.",
      ],
      retryable: false,
    };
  if (code === "KMA_ENDPOINT_MISMATCH")
    return {
      title: "날씨 API 주소와 키 종류를 맞춰 주세요",
      cause:
        "현재 앱은 공공데이터포털 serviceKey 방식이며, 기상청 API허브 authKey 방식과 달라요.",
      steps: [
        "KMA_API_URL을 프로젝트 기본 공공데이터포털 주소로 되돌려 주세요.",
        "공공데이터포털의 일반 인증키(Decoding)를 사용해 주세요. API허브 키는 별도 연동이 필요해요.",
      ],
      retryable: false,
    };
  if (code === "WEATHER_UNAVAILABLE")
    return {
      title: "이 지역의 예보를 확인할 수 없어요",
      cause:
        "예보가 아직 없거나 해상 등 기상청에서 값을 제공하지 않는 위치예요.",
      steps: [
        "기본 지역 등 육지의 다른 위치를 선택해 주세요.",
        "새 예보가 제공된 뒤 다시 확인해 주세요.",
      ],
      retryable: true,
    };
  if (code === "WEATHER_REGION")
    return {
      title: "국내 지역을 선택해 주세요",
      cause: "기상청 단기예보는 대한민국 지역에서 제공해요.",
      steps: [
        "기본 지역을 대한민국의 지역으로 변경해 주세요.",
        "현재 위치가 해외라면 기본 지역 날씨를 확인해 주세요.",
      ],
      retryable: false,
    };
  if (code === "ROUTE_UNAVAILABLE")
    return {
      title: "이 경로를 찾지 못했어요",
      cause: "외부 서비스가 선택한 장소 사이의 경로를 제공하지 않았어요.",
      steps: [
        "출발지와 도착지를 다시 선택해 주세요.",
        "인근 역이나 정류장을 선택해 다시 검색해 주세요.",
      ],
      retryable: false,
    };
  if (error.status === 401)
    return {
      title: "로그인을 다시 해 주세요",
      cause: "로그인 시간이 만료되었거나 로그인 정보를 확인할 수 없어요.",
      steps: [
        "이메일과 비밀번호를 확인해 주세요.",
        "로그인 화면에서 다시 로그인한 뒤 이용해 주세요.",
      ],
      retryable: false,
    };
  if (error.status === 403)
    return {
      title: "이 작업을 진행할 수 없어요",
      cause: "접근 권한 또는 보안 연결을 확인할 수 없어요.",
      steps: [
        "본인 계정으로 로그인했는지 확인해 주세요.",
        "화면을 새로고침한 뒤 다시 시도해 주세요.",
      ],
      retryable: false,
    };
  if (error.status === 429 || code === "PROVIDER_LIMIT")
    return {
      title: "잠시 기다려 주세요",
      cause: "짧은 시간에 요청이 많거나 정보 서비스의 이용 한도에 도달했어요.",
      steps: [
        "잠시 후 다시 시도해 주세요.",
        "계속 발생하면 관리자에게 이용 한도 확인을 요청해 주세요.",
      ],
      retryable: true,
    };
  if (error.status === 409)
    return {
      title: "변경된 정보를 확인해 주세요",
      cause: "이미 저장된 정보이거나 다른 화면에서 먼저 변경되었어요.",
      steps: [
        "최신 정보를 다시 불러온 뒤 변경해 주세요.",
        "같은 정보를 중복 저장하지 않았는지 확인해 주세요.",
      ],
      retryable: false,
    };
  if (error.status === 400 || error.status === 404)
    return {
      title: "입력 내용을 확인해 주세요",
      cause: "입력값이 올바르지 않거나 요청한 정보가 존재하지 않아요.",
      steps: [
        "화면에 표시된 입력 안내와 선택한 항목을 확인해 주세요.",
        "삭제된 항목이라면 목록을 다시 불러와 주세요.",
      ],
      retryable: false,
    };
  if (code.includes("FORMAT"))
    return {
      title: "정보 형식을 확인하지 못했어요",
      cause: "외부 서비스의 데이터가 예상한 형식과 달라요.",
      steps: [
        "다른 정보는 계속 이용할 수 있어요.",
        "반복되면 관리자에게 요청 번호를 전달해 주세요.",
      ],
      retryable: true,
    };
  return {
    title: "정보를 불러오지 못했어요",
    cause: "서버 또는 외부 정보 서비스에 일시적인 문제가 생겼어요.",
    steps: [
      "잠시 후 다시 시도해 주세요.",
      "계속 발생하면 아래 오류 코드와 요청 번호를 관리자에게 전달해 주세요.",
    ],
    retryable: true,
  };
}
// 서버가 정제한 메타데이터만 표시합니다. 공급자 원문/secret/stack은 표시하지 않습니다.
export function errorGuide(error: Failure): ErrorGuide {
  const guide = baseErrorGuide(error);
  const labels: Record<string, string> = {
    NAVER: "NAVER API HUB 뉴스",
    KMA: "기상청 날씨",
    KASI: "공휴일",
    KoreaExim: "한국수출입은행 환율",
    KakaoPlace: "카카오 장소 검색",
    KakaoMapTransit: "카카오맵 길찾기",
  };
  const provider = labels[error.details?.provider || ""];
  const status = error.details?.upstreamStatus;
  const causes: Record<string, string> = {
    PROVIDER_AUTH: "인증키 또는 앱의 API 사용 권한이 거절됐어요.",
    PROVIDER_FORBIDDEN:
      "공급자가 이 앱의 요청을 거절했어요. API 사용 권한과 서비스 활성화를 확인해 주세요.",
    PROVIDER_LIMIT: "공급자의 호출 한도를 초과했어요.",
    PROVIDER_TLS:
      "외부 서버와 HTTPS 보안 연결을 맺지 못했어요. 인증서 또는 TLS 연결 확인이 필요해요.",
    PROVIDER_DNS: "외부 API 서버의 도메인 주소를 찾지 못했어요.",
    PROVIDER_CONNECT: "외부 API 서버에 연결하지 못했어요.",
    PROVIDER_CONNECTION: "외부 API와 통신하는 중 연결이 끊겼어요.",
    UPSTREAM_FORMAT:
      "외부 응답을 받았지만 필요한 JSON 데이터 형식으로 처리하지 못했어요.",
    TIMEOUT: "제한 시간 안에 외부 API의 응답을 받지 못했어요.",
  };
  if (error.code === "KAKAO_MAP_DISABLED")
    return {
      title: "카카오맵 사용 설정이 꺼져 있어요",
      cause: `${provider || "카카오맵"}: 앱의 OPEN_MAP_AND_LOCAL 서비스가 비활성화되어 요청이 거절됐어요. (공급자 HTTP 403)`,
      steps: [
        "Kakao Developers에서 현재 REST API 키가 속한 앱을 선택해 주세요.",
        "카카오맵 → 사용 설정을 ON으로 바꾼 뒤 다시 조회해 주세요. 다른 앱의 키를 넣었다면 .env를 수정하고 backend를 재생성해 주세요.",
      ],
      retryable: false,
    };
  if (!provider || !causes[error.code || ""]) return guide;
  const instructions: Record<string, string> = {
    NAVER:
      "네이버 클라우드 NAVER API HUB 앱의 뉴스 검색 권한과 Client ID/Secret을 확인해 주세요. Developers 키와 다릅니다.",
    KASI: "공공데이터포털 특일정보 활용신청 상태와 KASI_API_KEY의 Decoding 원본을 확인해 주세요.",
    KoreaExim:
      "한국수출입은행 API 주소와 서버의 HTTPS 인증서·네트워크 연결을 확인해 주세요. 인증서 검증을 끄지 마세요.",
  };
  return {
    ...guide,
    title: `${provider} 연결 오류`,
    cause: `${causes[error.code || ""]}${typeof status === "number" && status > 0 ? ` (공급자 HTTP ${status})` : " (HTTP 응답 수신 전 실패)"}`,
    steps: [
      instructions[error.details?.provider || ""] || guide.steps[0],
      "오류 코드와 요청 번호로 서버 로그를 확인해 주세요.",
    ],
    retryable: ![
      "PROVIDER_AUTH",
      "PROVIDER_FORBIDDEN",
      "PROVIDER_LIMIT",
      "PROVIDER_TLS",
    ].includes(error.code || ""),
  };
}
interface ErrorNotice {
  error: Failure;
  context?: string;
  retry?: () => unknown;
  key: string;
  count: number;
}
export const useErrorDialog = create<{
  notice: ErrorNotice | null;
  show: (error: Failure, context?: string, retry?: () => unknown) => void;
  close: () => void;
}>((set) => ({
  notice: null,
  // 하나의 창만 유지합니다. 동시 실패는 횟수만 합쳐 widget 접근을 계속 보장합니다.
  show: (error, context, retry) =>
    set((state) =>
      state.notice
        ? {
            notice: {
              ...state.notice,
              count:
                state.notice.key === `${error.code}:${error.requestId}`
                  ? state.notice.count
                  : state.notice.count + 1,
            },
          }
        : {
            notice: {
              error,
              context,
              retry,
              key: `${error.code}:${error.requestId}`,
              count: 1,
            },
          },
    ),
  close: () => set({ notice: null }),
}));
export const showError = (
  error: Failure,
  context?: string,
  retry?: () => unknown,
) => useErrorDialog.getState().show(error, context, retry);
