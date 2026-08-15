import puppeteer from 'puppeteer-core'

const URL = process.argv[2]
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--no-sandbox', '--window-size=1600,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 900 })
// SEM emulateMediaFeatures: queremos exatamente o que o headless reporta

const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[PAGEERROR] ${e.message}\n${(e.stack || '').split('\n').slice(0, 6).join('\n')}`))
page.on('requestfailed', (r) => logs.push(`[FAIL] ${r.url()} :: ${r.failure()?.errorText}`))
page.on('response', (r) => { if (r.status() >= 400) logs.push(`[HTTP ${r.status()}] ${r.url()}`) })

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 })
await new Promise((r) => setTimeout(r, 6000))

const state = await page.evaluate(() => ({
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  preloaderPresent: !!document.querySelector('.preloader'),
  preloaderDisplay: document.querySelector('.preloader') ? getComputedStyle(document.querySelector('.preloader')).display : null,
  preloaderPct: document.querySelector('.preloader__meta .mono')?.textContent,
  videoEl: !!document.querySelector('.video-stage__video'),
  videoSrc: document.querySelector('.video-stage__video')?.getAttribute('src'),
  videoReadyState: document.querySelector('.video-stage__video')?.readyState,
  videoCurrentTime: document.querySelector('.video-stage__video')?.currentTime,
  canvasEl: !!document.querySelector('.sky-canvas canvas'),
  skyTrack: !!document.querySelector('.sky-track'),
  scrollHeight: document.documentElement.scrollHeight,
  bodyOverflow: getComputedStyle(document.body).overflow,
  htmlLocked: document.documentElement.className,
}))
console.log(JSON.stringify(state, null, 2))
console.log('--- console ---')
console.log(logs.join('\n') || '(vazio)')
await browser.close()
