"""합성 ERROR 이벤트만 생성합니다. AWS 호출이나 실제 서비스 장애를 유발하지 않습니다."""
import argparse
import base64
from datetime import datetime, timezone
import gzip
import json
import time
import uuid

# expected는 로컬 분류의 기대값입니다. AI가 실제로 올바른 원인을 분석했다는 뜻은 아닙니다.
SCENARIOS = {
    'rds': {
        'title': 'DB 연결 실패', 'expected': 'DATABASE_CONNECTION_ERROR',
        'message': 'request_failed errorCode=INTERNAL httpStatus=500 exception=JDBCConnectionException',
        'checks': ['DB 연결 관련 후보와 로그 근거를 연결하는가', 'DB 상태·endpoint·연결 풀·보안 그룹을 점검 대상으로 제시하는가'],
    },
    'environment': {
        'title': '필수 환경설정 누락', 'expected': 'CONFIGURATION_ERROR',
        'message': 'request_failed errorCode=PROVIDER_NOT_CONFIGURED httpStatus=503 exception=BeanCreationException',
        'checks': ['환경변수·Secret 연결·최근 배포를 확인하는가', '존재하지 않는 설정명이나 키 원문을 만들어내지 않는가'],
    },
    'timeout': {
        'title': '외부 API 시간 초과', 'expected': 'API_TIMEOUT',
        'message': 'request_failed errorCode=TIMEOUT httpStatus=504 exception=ApiException',
        'checks': ['응답 지연과 연결/응답 제한 시간을 구분해 점검하는가', '근거 없이 DB 장애로 확정하지 않는가'],
    },
    'http500': {
        'title': '서버 내부 예외', 'expected': 'HTTP_SERVER_ERROR',
        'message': 'request_failed errorCode=INTERNAL httpStatus=500 exception=IllegalStateException',
        'checks': ['스택과 요청 재현 정보가 부족함을 인정하는가', '특정 코드 버그가 확인됐다고 단정하지 않는가'],
    },
    'dns': {
        'title': '외부 API DNS 조회 실패', 'expected': 'EXTERNAL_API_ERROR',
        'message': 'request_failed errorCode=PROVIDER_DNS httpStatus=502 exception=UnknownHostException',
        'checks': ['도메인 오타·DNS 해석·네트워크 경로를 우선 확인하는가', 'IP나 도메인·리소스 ID를 지어내지 않는가'],
    },
    'tls': {
        'title': '외부 API TLS 연결 실패', 'expected': 'EXTERNAL_API_ERROR',
        'message': 'request_failed errorCode=PROVIDER_TLS httpStatus=502 exception=SSLHandshakeException',
        'checks': ['인증서·호스트명·신뢰 저장소 관련 후보를 제시하는가', '인증서 검증 해제를 기본 해결책으로 권하지 않는가'],
    },
    'connection': {
        'title': '외부 API 연결 실패', 'expected': 'EXTERNAL_API_ERROR',
        'message': 'request_failed errorCode=PROVIDER_CONNECT httpStatus=502 exception=ConnectException',
        'checks': ['접속 대상/포트·네트워크 경로와 연결 거부 가능성을 확인하는가', '보안 그룹 전체 개방을 제안하지 않는가'],
    },
    'provider-auth': {
        'title': '외부 공급자 인증 거절', 'expected': 'EXTERNAL_API_ERROR',
        'message': 'request_failed errorCode=UPSTREAM_ERROR httpStatus=502 upstreamStatus=401 exception=ApiException',
        'checks': ['외부 공급자의 키·사용 승인·권한을 확인하는가', '상위 API의 401을 앱 사용자 로그인 오류나 OpenAI 인증 오류와 혼동하지 않는가'],
    },
    'upstream': {
        'title': '외부 공급자 서비스 오류', 'expected': 'EXTERNAL_API_ERROR',
        'message': 'request_failed errorCode=UPSTREAM_ERROR httpStatus=502 upstreamStatus=503 exception=ApiException',
        'checks': ['공급자 상태와 상위 응답 503을 근거로 설명하는가', '로컬 DB 장애로 확정하지 않는가'],
    },
}


def generate(scenario, count=1):
    if scenario not in SCENARIOS or not 1 <= count <= 50:
        raise ValueError('Invalid synthetic scenario/count')
    now = datetime.now(timezone.utc).isoformat()
    message = f'{now} ERROR requestId=mock-request com.dailybriefing.common.Errors - ' + SCENARIOS[scenario]['message']
    batch_id = uuid.uuid4().hex
    # 매 실행마다 새 ID를 생성합니다. 동일 파일 재전송은 재전송 억제를 검증합니다.
    data = {
        'messageType': 'DATA_MESSAGE', 'logStream': 'mock/never-real',
        'logEvents': [
            {'id': f'mock-{batch_id}-{i}', 'message': message, 'timestamp': int(time.time() * 1000)}
            for i in range(count)
        ],
    }
    return {'awslogs': {'data': base64.b64encode(gzip.compress(json.dumps(data).encode())).decode()}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('scenario', choices=SCENARIOS)
    parser.add_argument('--count', type=int, default=1, choices=range(1, 51), metavar='1..50',
                        help='서로 다른 공급자 이벤트 ID를 가진 실제 반복 발생 시뮬레이션')
    args = parser.parse_args()
    print(json.dumps(generate(args.scenario, args.count)))


if __name__ == '__main__':
    main()
