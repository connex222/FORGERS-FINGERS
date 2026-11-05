#!/usr/bin/env python3
"""Optional Batch D: original game HTML/CSS/JS in Chromium, bridged to a *real* local WebSocket server.

Chromium in this environment is barred from localhost URLs by admin policy. We use
Playwright set_content and a tiny browser WebSocket adapter to forward browser messages
to a real Node server via Python websocket-client. Therefore this verifies real server
logic and real browser DOM/user interactions, but NOT direct browser networking, real
phone hardware, TV overscan or real-device sound. This distinction is deliberate.
"""
import base64, json, os, pathlib, re, subprocess, tempfile, threading, time, uuid
from collections import deque
from urllib.request import urlopen
from playwright.sync_api import sync_playwright
import websocket

ROOT=pathlib.Path(__file__).resolve().parents[1]
PUBLIC=ROOT/'public'
OUT=ROOT/'STAGE6D-BROWSER-EVIDENCE'
OUT.mkdir(exist_ok=True)
PORT=int(os.environ.get('FF_STAGE6D_PORT','39769'))
BRIDGE_JS=r"""
(() => {
  const LIVE=new Set();
  class TestBridgeSocket {
    constructor(url) {
      this.url=url;this.readyState=0;this.onmessage=null;this.onopen=null;
      this.onerror=null;this.onclose=null;this.handlers={};this.id=null;this.tick=null;this.polling=false;
      LIVE.add(this);window.__ffLatestSocket=this;
      window.__ffOpen().then(id => {
        if(this.readyState!==0)return;
        this.id=id;this.readyState=1;
        if(this.onopen)this.onopen({type:'open'});
        this.tick=setInterval(async () => {
          if(this.readyState!==1 || this.polling)return;
          this.polling=true;
          try {
            const ms=await window.__ffPoll(this.id);
            for(const m of ms) {
              if(m==='__close__') {this._close(false);break;}
              if(this.onmessage)this.onmessage({data:m,type:'message'});
            }
          }catch(e){this._close(false);}finally{this.polling=false;}
        }, 120);
      }).catch(e => {this._close(false);});
    }
    send(msg) {if(this.readyState===1)window.__ffSend(this.id,msg).catch(()=>this._close(false));}
    close() {this._close(true);}
    _close(ask) {if(this.readyState===3)return;this.readyState=3;clearInterval(this.tick);
      if(ask&&this.id)window.__ffClose(this.id).catch(()=>{});
      if(this.onclose)this.onclose({type:'close'});
      LIVE.delete(this);
    }
    addEventListener(type,handler) {this['on'+type]=handler;}
  }
  window.WebSocket=TestBridgeSocket;
  window.__ffCloseAll=()=>{for(const s of Array.from(LIVE))s.close();};
})();
"""

class Bridge:
    def __init__(self, port): self.port=port;self.sockets={};self.lock=threading.Lock()
    def open(self):
        ws=websocket.create_connection(f'ws://127.0.0.1:{self.port}/ws',timeout=3,enable_multithread=True)
        sid=uuid.uuid4().hex; q=deque()
        def reader():
            try:
                while True:
                    m=ws.recv()
                    if not m:break
                    with self.lock:q.append(m)
            except Exception: pass
            with self.lock:q.append('__close__')
        threading.Thread(target=reader,daemon=True).start()
        with self.lock:self.sockets[sid]=(ws,q)
        return sid
    def send(self, sid, msg):
        with self.lock:item=self.sockets.get(sid)
        if item: item[0].send(msg)
    def poll(self, sid):
        with self.lock:
            item=self.sockets.get(sid)
            if not item:return ['__close__']
            q=item[1]; messages=list(q);q.clear();return messages
    def close(self,sid):
        with self.lock:item=self.sockets.pop(sid,None)
        if item:
            try:item[0].close()
            except:pass
    def close_all(self):
        for sid in list(self.sockets): self.close(sid)

ASSETS={}
for asset in (PUBLIC/'assets').glob('*'):
    if asset.is_file() and asset.suffix.lower() in ('.png','.webp'):
        mime='image/png' if asset.suffix=='.png' else 'image/webp'
        ASSETS['/assets/'+asset.name]=f'data:{mime};base64,'+base64.b64encode(asset.read_bytes()).decode()
ASSET_JS='window.__ffArt='+json.dumps(ASSETS)+';\n'
# Embedded image references resolve without external network. Dynamic avatar/frame URLs
# created by template strings are replaced when added to the DOM.
ASSET_JS += r"""
(() => {
  function fixArt(root) {
    for(const img of root.querySelectorAll?.('img') || []) {
      const src=img.getAttribute('src');
      if(src && window.__ffArt[src] && img.src!==window.__ffArt[src])img.src=window.__ffArt[src];
    }
  }
  const obs=new MutationObserver(() => fixArt(document));
  obs.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
  document.addEventListener('DOMContentLoaded',()=>fixArt(document));
})();
"""

def page_html(name):
    html=(PUBLIC/name).read_text(encoding='utf8')
    def link(match):
        rel=match.group(1)
        return '<style>'+ (PUBLIC/rel).read_text(encoding='utf8')+'</style>'
    html=re.sub(r'<link rel="stylesheet" href="/([\w-]+\.css)">',link,html)
    def script(match): return '<script>\n'+(PUBLIC/match.group(1)).read_text(encoding='utf8')+'\n</script>'
    html=re.sub(r'<script src="/([\w-]+\.js)"></script>',script,html)
    # Static references to approved artwork. For dynamic refs use the mutation observer.
    html=re.sub(r'/assets/[a-z0-9-]+\.(?:png|webp)',lambda m:ASSETS.get(m.group(0),m.group(0)),html)
    html=html.replace('<head>', '<head><script>'+ASSET_JS+'</script>',1)
    return html

class Browser:
    def __init__(self,pw,bridge):
        self.br=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
        self.bridge=bridge; self.pages=[]
    def new(self,typ,width,height):
        page=self.br.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
        errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
        page.expose_binding('__ffOpen',lambda src: self.bridge.open())
        page.expose_binding('__ffSend',lambda src,sid,msg: self.bridge.send(sid,msg))
        page.expose_binding('__ffPoll',lambda src,sid: self.bridge.poll(sid))
        page.expose_binding('__ffClose',lambda src,sid: self.bridge.close(sid))
        page.evaluate(BRIDGE_JS)
        page.set_content(page_html(typ),wait_until='load')
        self.pages.append((page,errs))
        return page
    def stop(self):
        # Closing pages first avoids outstanding browser-side bridge polls during browser shutdown.
        for page,_ in self.pages:
            try:page.close(run_before_unload=False)
            except Exception:pass
        try:self.br.close()
        except Exception:pass
        self.bridge.close_all()

def assert_visible(box,w,h,edge=1):
    assert box and box['width']>0 and box['height']>0, 'missing/zero-size box'
    assert box['x']>=-edge and box['y']>=-edge, str(box)
    assert box['x']+box['width']<=w+edge and box['y']+box['height']<=h+edge, str(box)

def wait(page,css,timeout=8000):return page.locator(css).first.wait_for(state='visible',timeout=timeout)

def screenshot(page,name):
    page.screenshot(path=str(OUT/name),animations='disabled')

def app_state(page):return page.locator('body').get_attribute('data-phase')

def join(page, code, name):
    wait(page,'#joinBtn');page.locator('#code').fill(code);page.locator('#name').fill(name);
    page.locator('#joinBtn').click();wait(page,'.bar .me')

class DirectClient:
    def __init__(self,port):
        self.ws=websocket.create_connection(f'ws://127.0.0.1:{port}/ws',timeout=2)
        self.ws.settimeout(3)
        self.inbox=[]
    def send(self,m):self.ws.send(json.dumps(m))
    def wait(self,t,pred=lambda m:True,timeout=10):
        until=time.monotonic()+timeout
        while time.monotonic()<until:
            for i,m in enumerate(self.inbox):
                if m.get('t')==t and pred(m):return self.inbox.pop(i)
            self.ws.settimeout(max(.05,until-time.monotonic()))
            try:m=json.loads(self.ws.recv());self.inbox.append(m)
            except websocket.WebSocketTimeoutException: pass
        raise AssertionError('Timeout on '+t+':'+str(self.inbox[-3:]))
    def close(self):self.ws.close()

def start_server():
    data=tempfile.TemporaryDirectory(prefix='ff-stage6d-')
    env={**os.environ,'PORT':str(PORT),'FF_DATA_DIR':data.name,'FF_PERSISTENCE_KEY':'acceptance-local-32-characters-abc12345'}
    p=subprocess.Popen(['node','server.js'],cwd=ROOT,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    for i in range(100):
        try:
            with urlopen(f'http://127.0.0.1:{PORT}/health',timeout=.3) as r:
                if r.status==200: return p,data
        except Exception:time.sleep(.05)
    raise AssertionError('Node server could not start')

if __name__=='__main__':
    proc,temp=start_server(); bridge=Bridge(PORT)
    stats=[]
    try:
        with sync_playwright() as pw:
            browser=Browser(pw,bridge)
            try:
                tv=browser.new('tv.html',1920,1080)
                tv.locator('#codeChipText') # initialise
                wait(tv,'#joinQr')
                code=''.join(tv.locator('.join-card .code span').all_text_contents())
                assert re.fullmatch('[A-HJ-NP-Z]{4}',code),code
                print('TV created gallery',code,flush=True)
                screenshot(tv,'01-lobby-tv-1920.png')
                stats.append('PASS: TV creates a real gallery and shows a 4-letter code')
                phones=[browser.new('index.html',390,844) for _ in range(3)]
                for i,phone in enumerate(phones):join(phone,code,'Artist'+str(i+1))
                tv.wait_for_function("document.querySelectorAll('.slot-name').length===3",timeout=10000)
                assert tv.locator('.slot-name').count()==3
                screenshot(tv,'02-lobby-three-players.png')
                screenshot(phones[0],'03-phone-curator.png')
                stats.append('PASS: three real browser clients join the Node server and display curator')
                # Tutorial controls in both TV/phone.
                for label,page in [('TV',tv),('phone',phones[0])]:
                    page.locator('#helpBtn' if label=='TV' else '#phoneHow').click()
                    wait(page,'[data-ff-next]');page.locator('[data-ff-next]').click()
                    assert 'Chapter 2' in page.locator('[data-ff-chapter]').inner_text()
                    page.locator('[data-ff-prev]').click()
                    page.locator('[data-ff-play]').click()
                    assert page.locator('[data-ff-play]').inner_text()=='Pause'
                    page.locator('[data-ff-play]').click()
                    page.locator('[data-ff-close]').click()
                stats.append('PASS: real TV and phone tutorial opens, navigates, plays/pauses and closes')
                # Check the real After Hours confirmation and return to Family for the play-through.
                phones[0].locator('[data-set=deck][data-val=adult]').click()
                wait(phones[0],'#confirmAdult');phones[0].locator('#confirmAdult').click()
                phones[0].locator('[data-set=deck][data-val=family]').click()
                wait(phones[0],'#startBtn')
                stats.append('PASS: After Hours 18+ confirmation and Family return in browser')
                phones[0].locator('#startBtn').click()
                wait(tv,'body[data-phase="intro"]')
                tv.locator('#ctl').click() if not tv.locator('#ctl').is_hidden() else None
                wait(tv,'body[data-phase="draw"]')
                screenshot(phones[0],'04-phone-drawing.png')
                # Every phone draws one real pointer stroke before submission.
                for i,page in enumerate(phones):
                    print('draw phone',i,flush=True)
                    wait(page,'#submit');canvas=page.locator('#cv');
                    bb=canvas.bounding_box()
                    assert bb and bb['width']>=80 and bb['height']>=80,bb
                    page.mouse.move(bb['x']+bb['width']*.25,bb['y']+bb['height']*.25)
                    page.mouse.down();page.mouse.move(bb['x']+bb['width']*.55,bb['y']+bb['height']*.55,steps=6);page.mouse.up()
                    page.locator('#submit').click();print('submitted',i,flush=True)
                print('await auction',flush=True)
                wait(tv,'body[data-phase="auction"]',12000)
                screenshot(tv,'05-three-player-auction.png')
                screenshot(phones[1],'06-phone-auction.png')
                stats.append('PASS: browser phone drawings accepted by real server; auction starts')
                # Three player auction: Master cannot bid; others choose pass.
                for page in phones:
                    if page.locator('#passBtn').count() and page.locator('#passBtn').is_visible():
                        page.locator('#passBtn').click()
                wait(tv,'body[data-phase="reveal"]',12000)
                screenshot(tv,'07-reveal.png')
                tv.locator('#ctl').click();wait(tv,'body[data-phase="scores"]')
                screenshot(tv,'08-ledger.png')
                stats.append('PASS: browser auction, reveal and score ledger on the real server')
                # Stage D layout audit: live browser DOM at multiple target sizes.
                for w,h,label in [(1280,720,'tv720'),(1920,1080,'tv1080'),(3840,2160,'tv4k')]:
                    tv.set_viewport_size({'width':w,'height':h})
                    tv.wait_for_timeout(100)
                    assert_visible(tv.locator('#top').bounding_box(),w,h)
                    assert_visible(tv.locator('#view').bounding_box(),w,h)
                    screenshot(tv,f'09-scores-{label}.png')
                for w,h,label in [(320,568,'small'),(390,844,'phone'),(844,390,'landscape'),(768,1024,'tablet')]:
                    page=phones[0];page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(80)
                    assert_visible(page.locator('#app').bounding_box(),w,h)
                    screenshot(page,f'10-scores-{label}.png')
                stats.append('PASS: simulated screen edges for score views (TV 720p/1080p/4K and 4 mobile/tablet layouts)')
                # Audio persistence is tested through controlled reload elsewhere; browser mute toggles.
                tv.locator('#soundBtn').click()
                assert tv.locator('#soundBtn').inner_text()=='Sound on'
                tv.locator('#soundBtn').click()
                assert tv.locator('#soundBtn').inner_text()=='Turn sound on'
                stats.append('PASS: audio on/off control changes state in Chromium')
                for p,errors in browser.pages:
                    assert not errors,'Browser JS errors: '+repr(errors)
                stats.append('PASS: no page JS exceptions across browser bridge scenario')
            finally: browser.stop()
    finally:
        proc.terminate()
        try:proc.communicate(timeout=5)
        except subprocess.TimeoutExpired:proc.kill();proc.communicate()
        temp.cleanup()
    (OUT/'BROWSER-TEST-RESULTS.txt').write_text('\n'.join(stats)+'\n',encoding='utf8')
    print('\n'.join(stats))
