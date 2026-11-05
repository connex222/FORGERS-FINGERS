"""Companion automated live-server auction grid test; browser traffic is bridged due sandbox network restrictions."""
import os, sys, pathlib, json, re, time
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from importlib.machinery import SourceFileLoader
m=SourceFileLoader('qa',str(pathlib.Path(__file__).with_name('browser-stage6d-qa.py'))).load_module()
from playwright.sync_api import sync_playwright

p,tmp=m.start_server();brg=m.Bridge(m.PORT); results=[]
try:
 with sync_playwright() as pw:
  browser=m.Browser(pw,brg)
  try:
   for n in (3,4,6,8):
    print('case',n,flush=True)
    tv=browser.new('tv.html',1920,1080)
    m.wait(tv,'#joinQr')
    code=''.join(tv.locator('.join-card .code span').all_text_contents())
    clients=[]
    try:
     for i in range(n):
      c=m.DirectClient(m.PORT);clients.append(c)
      c.send({'t':'join','code':code,'name':f'A{i+1}'})
      c.wait('joined')
     tv.wait_for_function(f"document.querySelectorAll('.slot-name').length==={n}",timeout=9000)
     clients[0].send({'t':'cmd','cmd':'start'})
     intro=clients[0].wait('state',lambda s:s.get('phase')=='intro',12)
     clients[0].send({'t':'cmd','cmd':'skip'})
     draw=clients[0].wait('state',lambda s:s.get('phase')=='draw',12)
     for i,c in enumerate(clients):
      c.send({'t':'drawing','round':1,'submissionId':'gallery_d_'+str(i)+'_round1','strokes':[{'f':0},{'c':i%14,'w':1,'p':[100,100,600,900]}]})
      c.wait('drawing_received',lambda a:a.get('round')==1)
     m.wait(tv,'body[data-phase="auction"]',timeout=12000)
     tv.wait_for_function(f"document.querySelectorAll('.auction .frame').length==={n}",timeout=12000)
     for w,h,suffix in [(1280,720,'720'),(1920,1080,'1080'),(3840,2160,'4k')]:
      tv.set_viewport_size({'width':w,'height':h});tv.wait_for_timeout(100)
      frames=tv.locator('.auction .frame')
      assert frames.count()==n,(frames.count(),n)
      bounds=[]
      for j in range(n):
       box=frames.nth(j).bounding_box();m.assert_visible(box,w,h,2);bounds.append(box)
      # Reject visually overlapping paintings: each must have its own grid cell.
      for i,a in enumerate(bounds):
       for b in bounds[i+1:]:
        wover=min(a['x']+a['width'],b['x']+b['width'])-max(a['x'],b['x'])
        hover=min(a['y']+a['height'],b['y']+b['height'])-max(a['y'],b['y'])
        assert not(wover>3 and hover>3),f'overlapping frames at {n} players {w}x{h}'
      if n in (3,8):m.screenshot(tv,f'14-auction-{n}-players-{suffix}.png')
      print('  frame viewport',n,w,h,'PASS',flush=True)
      results.append(f'PASS: {n}-player framed auction, {w}x{h}: {n} full, distinct paintings')
     # settle with passes; 8 client pressure, score panels.
     # Identify the Master from personalised server state, not from client guesses.
     master=draw.get('masterId')
     for c in clients:
      # each client receives personal state with its own id
      st=c.wait('state',lambda s:s.get('phase')=='draw')
      if st['you']['id']==master: continue
      c.send({'t':'pass'});c.wait('pass_accepted')
     m.wait(tv,'body[data-phase="reveal"]',timeout=12000)
     tv.locator('#ctl').click();m.wait(tv,'body[data-phase="scores"]',timeout=12000)
     if n==8:
      m.screenshot(tv,'15-eight-player-ledger.png')
      assert tv.locator('.ledger-entry').count()==8
     print('  settled',n,'PASS',flush=True)
    finally:
     for c in clients:c.close()
     tv.evaluate('window.__ffCloseAll()');tv.close()
  finally:browser.stop()
finally:
 p.terminate()
 try:p.communicate(timeout=5)
 except: p.kill();p.communicate()
 tmp.cleanup()
(m.OUT/'GALLERY-TEST-RESULTS.txt').write_text('\n'.join(results)+'\n')
print('PASS ALL',len(results),'geometry combinations',flush=True)
