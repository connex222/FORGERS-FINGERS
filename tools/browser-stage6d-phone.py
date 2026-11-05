"""Phone drawing layout, true server state, simulated device viewports (browser bridge)."""
import sys,pathlib
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from importlib.machinery import SourceFileLoader
m=SourceFileLoader('qa',str(pathlib.Path(__file__).with_name('browser-stage6d-qa.py'))).load_module()
from playwright.sync_api import sync_playwright
p,tmp=m.start_server();bridge=m.Bridge(m.PORT)
others=[]
try:
 tv=m.DirectClient(m.PORT)
 tv.send({'t':'tv_create'});ok=tv.wait('tv_ok');code=ok['code']
 with sync_playwright() as pw:
  browser=m.Browser(pw,bridge)
  try:
   phone=browser.new('index.html',390,844)
   m.join(phone,code,'Painter')
   for i in range(2):
    c=m.DirectClient(m.PORT);others.append(c)
    c.send({'t':'join','code':code,'name':f'Collector{i+1}'});c.wait('joined')
   phone.locator('#startBtn').click()
   tv.wait('state',lambda s:s.get('phase')=='intro')
   tv.send({'t':'tv_cmd','cmd':'skip'})
   m.wait(phone,'#cv')
   for w,h,label in [(320,568,'small320'),(390,844,'phone390'),(844,390,'landscape844'),(768,1024,'tablet768')]:
    phone.set_viewport_size({'width':w,'height':h});phone.wait_for_timeout(170)
    selectors=['#cv','#phoneAudio','#drawHelp','#submit','.paint-masthead img']
    boxes={sel:phone.locator(sel).bounding_box() for sel in selectors}
    for sel,box in boxes.items():m.assert_visible(box,w,h,2)
    canvas=boxes['#cv'];assert canvas['width']>=115 and canvas['height']>=80,(label,canvas)
    logo=boxes['.paint-masthead img'];sound=boxes['#phoneAudio']
    horiz=min(logo['x']+logo['width'],sound['x']+sound['width'])-max(logo['x'],sound['x'])
    vert=min(logo['y']+logo['height'],sound['y']+sound['height'])-max(logo['y'],sound['y'])
    assert not(horiz>2 and vert>2),f'Sound button overlaps logo at {label}: {sound}, {logo}'
    m.screenshot(phone,f'18-phone-draw-{label}.png')
    print('PASS',label,'canvas',round(canvas['width']),round(canvas['height']),'logo and Sound non-overlap',flush=True)
   assert not browser.pages[0][1],browser.pages[0][1]
  finally:browser.stop()
finally:
 for c in others:c.close()
 tv.close();p.terminate();p.communicate(timeout=5);tmp.cleanup()
