#!/usr/bin/env python3
"""Stage 6E: genuine server-backed QR and responsive premium lobby rendering.

Chromium cannot navigate localhost directly in this environment; this uses the
same real-server WebSocket / HTTP bridges as the full Stage 6D browser suite.
"""
import importlib.util, os, pathlib, re, tempfile
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('ff_bridge',ROOT/'tools/browser-stage6d-qa.py')
bridge_module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge_module)
from urllib.request import urlopen
import cv2, numpy as np
OUT=ROOT/'STAGE6E-BROWSER-EVIDENCE';OUT.mkdir(exist_ok=True)
proc,temp=bridge_module.start_server()
bridge=bridge_module.Bridge(bridge_module.PORT)
checks=[]
try:
    with sync_playwright() as pw:
        browser=bridge_module.Browser(pw,bridge)
        try:
            for width,height,label in [(1920,1080,'1920-1080'),(1280,720,'1280-720'),(3840,2160,'3840-2160')]:
                tv=browser.new('tv.html',width,height)
                tv.locator('#joinQr').wait_for(timeout=9000)
                tv.wait_for_function("document.querySelector('#joinQr') && document.querySelector('#joinQr').naturalWidth > 0",timeout=12000)
                qr=tv.locator('#joinQr').evaluate('(el) => ({ok:el.naturalWidth>0,src:el.currentSrc,width:el.clientWidth,height:el.clientHeight,alt:el.alt})')
                assert qr['ok'],qr
                code=''.join(tv.locator('.join-card .code span').all_text_contents())
                assert re.fullmatch('[A-HJ-NP-Z]{4}',code),code
                with urlopen(f'http://127.0.0.1:{bridge_module.PORT}/qr.png?code={code}') as r:
                    assert r.status==200 and r.headers.get('Content-Type')=='image/png'
                    decoded=cv2.QRCodeDetector().detectAndDecode(cv2.imdecode(np.frombuffer(r.read(),dtype=np.uint8),cv2.IMREAD_COLOR))[0]
                    assert decoded.endswith('/?code='+code),decoded
                for selector in ['.lobby-premium','.join-card','.wall-wrap','#joinQr','.wall-heading','.lobby-status']:
                    box=tv.locator(selector).bounding_box()
                    bridge_module.assert_visible(box,width,height,2)
                assert not tv.locator('#joinQr').is_hidden()
                assert tv.locator('.slot').count()==8
                assert tv.locator('.slot.empty').count()==8
                errors=[e for page,errs in browser.pages if page==tv for e in errs]
                assert not errors,errors
                tv.screenshot(path=str(OUT/f'premium-lobby-{label}.png'),animations='disabled')
                checks.append(f'PASS: {label} real HTTP QR image loads, decodes, remains visible; no lobby text/card clipping')
                print(checks[-1],flush=True)
            phone=browser.new('index.html',390,844)
            phone.locator('#code').wait_for(timeout=8000)
            assert phone.locator('#joinBtn').is_visible()
            assert phone.locator('body.join-view').count()==1
            phone.screenshot(path=str(OUT/'premium-phone-390-844.png'),animations='disabled')
            small=browser.new('index.html',320,568)
            small.locator('#joinBtn').wait_for(timeout=8000)
            small.screenshot(path=str(OUT/'premium-phone-320-568.png'),animations='disabled')
            assert small.locator('#joinBtn').is_visible()
            checks.append('PASS: premium phone join at 390×844 and 320×568; all form actions remain available')
            print(checks[-1],flush=True)
        finally:
            browser.stop()
finally:
    bridge.close_all();proc.terminate();proc.wait(timeout=5);temp.cleanup()
(OUT/'TEST-RESULTS.txt').write_text('\n'.join(checks)+'\n',encoding='utf8')
