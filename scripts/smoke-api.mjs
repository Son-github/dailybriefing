// 인증정보·응답 본문은 출력하지 않습니다. 실제 서버가 있을 때만 사용합니다.
const url=process.argv[2];
if(!url?.startsWith('https://') && !url?.startsWith('http://localhost:')) throw new Error('HTTPS frontend URL 필요');
for(let attempt=0;attempt<30;attempt++) {
  try {
    const r=await fetch(`${url}/api/v1/health`,{signal:AbortSignal.timeout(10000),cache:'no-store'});
    if(!r.ok || (await r.json()).status!=='UP') throw new Error('readiness');
    const csrf=await fetch(`${url}/api/v1/auth/csrf`,{signal:AbortSignal.timeout(10000)});
    if(!csrf.ok || typeof (await csrf.json()).token!=='string') throw new Error('csrf');
    const me=await fetch(`${url}/api/v1/users/me`,{signal:AbortSignal.timeout(10000)});
    if(me.status!==401 || !(me.headers.get('content-type') || '').includes('application/json')) throw new Error('authorization');
    console.log('PASS: readiness/CSRF/unauthorized API');process.exit(0);
  } catch { if(attempt===29) throw new Error('LIVE smoke 실패: 활성화하지 마세요');await new Promise(resolve=>setTimeout(resolve,10000)); }
}
