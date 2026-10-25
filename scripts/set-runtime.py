"""미래 배포용. 실행하면 S3/CloudFront를 변경하므로 명시적 환경 확인이 필요합니다."""
import argparse,json,os,subprocess,tempfile
p=argparse.ArgumentParser();p.add_argument('--mode',choices=['LIVE','STATIC_DEMO'],required=True);p.add_argument('--bucket',required=True);p.add_argument('--distribution',required=True);a=p.parse_args()
if os.environ.get('ALLOW_AWS_MUTATIONS') != 'I_UNDERSTAND_COSTS': raise SystemExit('AWS 변경 차단: 명시적 승인 환경이 필요합니다.')
if a.mode == 'LIVE' and not os.environ.get('PUBLIC_KAKAO_MAP_KEY', '').strip(): raise SystemExit('LIVE 설정 중단: PUBLIC_KAKAO_MAP_KEY에 공개 JavaScript 지도 키를 입력하세요.')
config={'schemaVersion':1,'mode':a.mode,'liveEnabled':a.mode=='LIVE','apiBase':'/api/v1','kakaoMapKey':os.environ.get('PUBLIC_KAKAO_MAP_KEY','') if a.mode=='LIVE' else ''}
with tempfile.NamedTemporaryFile(mode='w',suffix='.json') as f:
    json.dump(config,f);f.flush()
    subprocess.run(['aws','s3','cp',f.name,f's3://{a.bucket}/runtime-config.json','--content-type','application/json','--cache-control','no-store,max-age=0'],check=True)
r=subprocess.run(['aws','cloudfront','create-invalidation','--distribution-id',a.distribution,'--paths','/runtime-config.json','--query','Invalidation.Id','--output','text'],check=True,capture_output=True,text=True)
subprocess.run(['aws','cloudfront','wait','invalidation-completed','--distribution-id',a.distribution,'--id',r.stdout.strip()],check=True)
