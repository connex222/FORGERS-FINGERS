"""Decode actual HTTP QR SVG at local and HTTPS-host forms, using optional cairosvg/OpenCV."""
import os,sys,tempfile,subprocess,time
from urllib.request import urlopen, Request
import cairosvg, cv2, numpy as np
sys.path.insert(0,os.path.dirname(__file__))
from importlib.machinery import SourceFileLoader
m=SourceFileLoader('qa',os.path.join(os.path.dirname(__file__),'browser-stage6d-qa.py')).load_module()
p,temp=m.start_server()
try:
 from websocket import create_connection
 ws=create_connection(f'ws://127.0.0.1:{m.PORT}/ws');ws.send('{"t":"tv_create"}')
 import json
 while True:
  msg=json.loads(ws.recv())
  if msg.get('t')=='tv_ok': code=msg['code']; break
 ws.close()
 for host,scheme in [('192.168.4.22:3000','http'),('forgers.example','https')]:
  url=f'http://127.0.0.1:{m.PORT}/qr?code={code}'
  hdr={'Host':host}
  if scheme=='https':hdr['X-Forwarded-Proto']='https'
  with urlopen(Request(url,headers=hdr),timeout=4) as r:
   assert r.status==200 and r.headers['Content-Type'].startswith('image/svg+xml')
   svg=r.read()
  png=cairosvg.svg2png(bytestring=svg,output_width=860,output_height=860)
  arr=cv2.imdecode(np.frombuffer(png,dtype=np.uint8),cv2.IMREAD_COLOR)
  decoded,_,_=cv2.QRCodeDetector().detectAndDecode(arr)
  expected=f'{scheme}://{host}/?code={code}'
  assert decoded==expected,(decoded,expected)
  assert b'resumeToken' not in svg and b'token=' not in svg
  print('PASS: scanned real QR SVG decodes to',decoded,flush=True)
finally:
 p.terminate();p.communicate(timeout=5);temp.cleanup()
