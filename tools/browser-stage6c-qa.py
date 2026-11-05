from pathlib import Path
from playwright.sync_api import sync_playwright
import base64,re
pub=Path(__file__).resolve().parents[1]/'public'
shared=(pub/'shared.js').read_text()
tutorial=(pub/'tutorial.js').read_text()
css=(pub/'tutorial.css').read_text()
# Embed approved original artwork directly for an offline browser rendering check.
def rep(match):
 path=pub/match.group(0).lstrip('/')
 if not path.exists():return match.group(0)
 mime='image/png' if path.suffix=='.png' else 'image/webp'
 return f'data:{mime};base64,'+base64.b64encode(path.read_bytes()).decode()
tutorial=re.sub(r'/assets/[A-Za-z0-9-]+\.(?:png|webp)',rep,tutorial)
logo='data:image/png;base64,'+base64.b64encode((pub/'assets/logo.png').read_bytes()).decode()
html=f'''<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>{css}</style></head><body><button id="help">How to Play</button><script>{shared}</script><script>{tutorial}</script><script>document.getElementById('help').onclick=FF.showRules;</script></body></html>'''
out=pub.parent/'STAGE6C-BROWSER-PREVIEWS';out.mkdir(exist_ok=True)
with sync_playwright() as pw:
 br=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 for name,w,h in [('tv1080',1920,1080),('phone390',390,844),('phone320',320,568),('tablet',768,1024)]:
  page=br.new_page(viewport={'width':w,'height':h})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html)
  page.locator('#help').click()
  assert page.locator('[data-ff-chapter]').inner_text()=='Chapter 1 of 9'
  page.locator('[data-ff-next]').click();assert page.locator('[data-ff-chapter]').inner_text()=='Chapter 2 of 9'
  page.locator('[data-ff-play]').click();assert page.locator('[data-ff-play]').inner_text()=='Pause'
  page.locator('[data-ff-play]').click();assert page.locator('[data-ff-play]').inner_text()=='Play'
  page.locator('[data-ff-prev]').click();assert page.locator('[data-ff-prev]').is_disabled()
  page.screenshot(path=str(out/f'{name}-tutorial.png'))
  box=page.locator('.ff-tutorial-controls').bounding_box()
  print(name,box,'scroll?',page.evaluate('document.querySelector(".ff-tutorial-window").scrollHeight>document.querySelector(".ff-tutorial-window").clientHeight'))
  assert box['x']>=-1 and box['x']+box['width']<=w+1 and box['y']>=-1 and box['y']+box['height']<=h+1
  page.keyboard.press('Escape');assert page.locator('#ff-tutorial').count()==0
  print('js errors',errors)
  assert not errors
  page.close()
 br.close()
