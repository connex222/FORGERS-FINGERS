"""Real Node multiplayer match to final awards; Chromium TV rendered over a local WebSocket bridge."""
import os,sys,pathlib
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from importlib.machinery import SourceFileLoader
m=SourceFileLoader('qa',str(pathlib.Path(__file__).with_name('browser-stage6d-qa.py'))).load_module()
from playwright.sync_api import sync_playwright
p,tmp=m.start_server();bridge=m.Bridge(m.PORT)
cs=[]
try:
 with sync_playwright() as pw:
  browser=m.Browser(pw,bridge)
  try:
   tv=browser.new('tv.html',1920,1080)
   m.wait(tv,'#joinQr');code=''.join(tv.locator('.join-card .code span').all_text_contents())
   for i in range(3):
    c=m.DirectClient(m.PORT);cs.append(c);c.send({'t':'join','code':code,'name':f'Gallerist{i+1}'})
    c.joined=c.wait('joined')
   tv.wait_for_function("document.querySelectorAll('.slot-name').length===3",timeout=10000)
   cs[0].send({'t':'cmd','cmd':'start'})
   for roundno in (1,2,3):
    print('playing round',roundno,flush=True)
    intro=cs[0].wait('state',lambda s:s.get('phase')=='intro' and s.get('round')==roundno)
    cs[0].send({'t':'cmd','cmd':'skip'})
    draw=cs[0].wait('state',lambda s:s.get('phase')=='draw' and s.get('round')==roundno)
    for i,c in enumerate(cs):
     c.send({'t':'drawing','round':roundno,'submissionId':f'finalstage_{roundno}_{i}','strokes':[{'f':0},{'c':3+i,'w':1,'p':[120,150,850,800]}]})
     c.wait('drawing_received',lambda a:a.get('round')==roundno)
    m.wait(tv,'body[data-phase="auction"]',timeout=10000)
    lotinfo={}
    for c in cs:
     lotinfo[c.joined['pid']]=next(l['letter'] for l in c.wait('lots',lambda s:s.get('round')==roundno)['lots'] if l['mine'])
    master=draw['masterId']
    other=[c for c in cs if c.joined['pid']!=master]
    if roundno==2:
     bidder,forger=other
     bidder.send({'t':'bid','lot':lotinfo[forger.joined['pid']],'amount':1,'heart':lotinfo[master]})
     bidder.wait('bid_accepted')
     forger.send({'t':'pass','heart':lotinfo[master]});forger.wait('pass_accepted')
    else:
     for c in other:
      c.send({'t':'pass','heart':lotinfo[master]})
      c.wait('pass_accepted')
    m.wait(tv,'body[data-phase="reveal"]',timeout=10000)
    tv.locator('#ctl').click();m.wait(tv,'body[data-phase="scores"]',timeout=10000)
    print('settled round',roundno,flush=True)
    cs[0].send({'t':'cmd','cmd':'next'})
   m.wait(tv,'body[data-phase="final"]',timeout=10000)
   print('final reached',flush=True)
   assert tv.locator('.pod').count()==3
   assert tv.locator('.award').count()>=2,tv.locator('.awards').inner_text()
   assert tv.locator('#galleryCount').inner_text()=='1 of 3'
   for w,h,tag in [(1280,720,'720'),(1920,1080,'1080'),(3840,2160,'4k')]:
    tv.set_viewport_size({'width':w,'height':h})
    m.assert_visible(tv.locator('#view').bounding_box(),w,h)
    m.screenshot(tv,f'16-final-ceremony-{tag}.png')
    print('final viewport',tag,'PASS',flush=True)
   tv.locator('[data-gallery-nav=next]').click()
   assert tv.locator('#galleryCount').inner_text()=='2 of 3'
   tv.locator('[data-gallery-nav=toggle]').click()
   assert tv.locator('[data-gallery-nav=toggle]').inner_text()=='Play gallery'
   m.screenshot(tv,'17-final-gallery-navigation.png')
   assert not browser.pages[0][1],browser.pages[0][1]
   print('PASS final score/awards/gallery navigation',flush=True)
  finally:browser.stop()
finally:
 for c in cs:c.close()
 p.terminate();p.communicate(timeout=5);tmp.cleanup()
