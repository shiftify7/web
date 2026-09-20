import asyncio, sys
from playwright.async_api import async_playwright

async def main():
    url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4321/"
    out = sys.argv[2] if len(sys.argv) > 2 else "/tmp/shot.png"
    width = int(sys.argv[3]) if len(sys.argv) > 3 else 1440
    height = int(sys.argv[4]) if len(sys.argv) > 4 else 900
    wait = int(sys.argv[5]) if len(sys.argv) > 5 else 3500
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": width, "height": height})
        errors = []
        pg.on("console", lambda m: errors.append(m.text) if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errors.append(str(e)))
        await pg.goto(url, wait_until="networkidle")
        await pg.wait_for_timeout(wait)
        await pg.evaluate("document.querySelector('.svcc')?.scrollIntoView({block:'center'})")
        await pg.wait_for_timeout(800)
        await pg.screenshot(path=out)
        info = await pg.evaluate("""() => {
            const el = document.querySelector('.svcc-slide.is-active');
            const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules] } catch { return [] } });
            return {
                svccRules: css.filter(r => r.cssText && r.cssText.includes('svcc')).length,
                hasGlobal: [...document.querySelectorAll('style')].some(s => s.textContent.includes('svcc-slide')),
                activeText: el ? el.querySelector('.svcc-name')?.textContent : null,
                grid: el ? getComputedStyle(el).gridTemplateColumns : null,
                slidePos: el ? getComputedStyle(el).position : null,
                stageH: document.querySelector('.svcc-stage')?.style.height,
                opacity: el ? getComputedStyle(el).opacity : null,
            };
        }""")
        print("INFO:", info)
        if errors: print("ERRORS:", errors[:8])
        await b.close()

asyncio.run(main())
