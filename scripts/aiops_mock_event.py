"""네트워크/장애 유발 없이 네 가지 합성 이벤트 JSON만 stdout에 생성합니다."""
import argparse
import base64
import gzip
import json

parser = argparse.ArgumentParser()
parser.add_argument('scenario', choices=['rds', 'environment', 'timeout', 'http500'])
args = parser.parse_args()
messages = {
    'rds': 'request_failed errorCode=INTERNAL httpStatus=500 exception=JDBCConnectionException',
    'environment': 'request_failed errorCode=PROVIDER_NOT_CONFIGURED httpStatus=503 exception=BeanCreationException',
    'timeout': 'request_failed errorCode=TIMEOUT httpStatus=504 exception=ApiException',
    'http500': 'request_failed errorCode=INTERNAL httpStatus=500 exception=IllegalStateException',
}
message='2026-10-23T09:00:00+09:00 ERROR requestId=mock-request com.dailybriefing.common.Errors - '+messages[args.scenario]
data={'messageType':'DATA_MESSAGE','logStream':'mock/never-real','logEvents':[{'id':'mock-event','message':message,'timestamp':1792713600000}]}
print(json.dumps({'awslogs':{'data':base64.b64encode(gzip.compress(json.dumps(data).encode())).decode()}}))
