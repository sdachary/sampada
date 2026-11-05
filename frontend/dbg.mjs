import { chromium } from '@playwright/test'
const base='https://sampada.vayalabs.in'
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}})
p.on('console', m=>console.log('CONSOLE:', m.type(), m.text().slice(0,200)))
p.on('response', async r=>{ if(r.url().includes('/api/auth')) console.log('RESP', r.status(), r.url(), (await r.text().catch(()=>'')).slice(0,300)) })
await p.goto(`${base}/register`,{waitUntil:'domcontentloaded'})
await p.waitForTimeout(1500)
const inputs = await p.locator('input').count()
console.log('inputs:', inputs)
for (let i=0;i<inputs;i++){ const el=p.locator('input').nth(i); console.log(i, await el.getAttribute('type'), await el.getAttribute('name'), await el.getAttribute('placeholder')) }
await b.close()
