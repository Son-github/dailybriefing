/* global process, console, sessionStorage */
import { chromium } from '@playwright/test';
const base=process.argv[2];
if(!base) throw new Error('frontend URL 필요');
const browser=await chromium.launch();
try {
  const page=await browser.newPage();
  const config=await page.request.get(`${base}/runtime-config.json`);
  if(!config.ok() || !["STATIC_DEMO","LIVE"].includes((await config.json()).mode)) throw new Error("AWS 공개 런타임 설정 확인 필요");
  await page.addInitScript(()=>sessionStorage.setItem('db-static-demo','1'));
  let calls=0;
  await page.route('**/api/**',route=>{calls++;return route.abort();});
  await page.goto(base,{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:/당신의 하루/}).waitFor();
  await page.getByText('샘플 데이터 · 실제 API 미호출').first().waitFor();
  if(calls) throw new Error('정적 DEMO가 backend에 의존합니다');
  console.log('PASS: backend 없는 STATIC_DEMO');
} finally { await browser.close(); }
