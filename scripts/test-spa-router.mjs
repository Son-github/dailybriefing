import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context = vm.createContext({});
vm.runInContext(readFileSync('infra/modules/frontend/spa-router.js','utf8'),context);
for (const path of ['/', '/transit', '/news/', '/settings']) assert.equal(context.handler({request:{uri:path}}).uri,'/index.html');
for (const path of ['/assets/missing.js','/missing.css','/api/v1/news','/runtime-config.json','/unknown']) assert.equal(context.handler({request:{uri:path}}).uri,path);
console.log('PASS: CloudFront SPA 경로/파일/API 구분');
