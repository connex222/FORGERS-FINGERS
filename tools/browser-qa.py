#!/usr/bin/env python3
"""Real headless Chromium acceptance: TV, 3 phone pages, join, drawing, auction, reveal, tutorial, QR."""
import contextlib, json, os, re, socket, subprocess, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
sock=socket.socket();sock.bind(('127.0.0.1',0));PORT=sock.getsockname()[1];sock.close()
proc=subprocess.Popen(['node','server.js'],cwd=ROOT,env={**os.environ,'PORT':str(PORT)},stdout=subprocess.PIPE,stderr=subprocess.PIPE)
try:
    for _ in range(60):
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/health',timeout=.25) as r:
                if r.status==200:break
        except Exception: time.sleep(.1)
    else: raise RuntimeError('Server did not start')
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
        errors=[]
        tv=browser.new_page(viewport={'width':1920,'height':1080})
        tv.on('pageerror',lambda e:errors.append('TV: '+str(e)))
        tv.goto(f'http://127.0.0.1:{PORT}/tv')
        tv.locator('.join-card .code').wait_for(timeout=6000)
        code=''.join(tv.locator('.join-card .code span').all_text_contents())
        assert re.fullmatch(r'[A-HJ-NP-Z]{4}',code),code
        tv.locator('#joinQr').wait_for()
        assert tv.locator('#joinQr').get_attribute('src')==f'/qr?code={code}'
        with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/qr?code={code}') as r:
            assert r.status==200 and b'<svg' in r.read()
        tv.locator('#helpBtn').click()
        assert tv.locator('#ff-rules').is_visible()
        assert 'Passes are not bids' in tv.locator('#ff-rules').inner_text()
        tv.get_by_role('button',name='Back to game').click()
        assert not tv.locator('#ff-rules').count()
        tv.locator('#audioOptions').click()
        assert tv.locator('#audioPanel').is_visible()
        tv.locator('[data-audio="music"]').uncheck()
        assert tv.evaluate('localStorage.getItem("ff-audio")')
        tv.reload();tv.locator('.join-card .code').wait_for(timeout=6000)
        assert not tv.locator('[data-audio="music"]').is_checked()
        assert ''.join(tv.locator('.join-card .code span').all_text_contents())==code
        phones=[]
        for i in range(3):
            context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
            page=context.new_page();page.on('pageerror',lambda e,i=i:errors.append('PHONE'+str(i)+': '+str(e)))
            page.goto(f'http://127.0.0.1:{PORT}/?code={code}')
            page.locator('#joinBtn').wait_for()
            assert page.locator('#code').input_value()==code
            page.locator('#name').fill('E2E Artist '+str(i))
            page.locator('#joinBtn').click()
            page.get_by_text('Change portrait').wait_for(timeout=8000)
            assert page.evaluate('JSON.parse(localStorage.getItem("ff-player")).resumeToken')
            phones.append((context,page))
        vip=phones[0][1]
        vip.locator('#phoneHow').click()
        assert vip.locator('#ff-rules').is_visible()
        vip.get_by_role('button',name='Back to game').click()
        vip.locator('#startBtn').click()
        tv.locator('#ctl').wait_for(state='visible',timeout=8000)
        tv.locator('#ctl').click() # intro skip
        for context,page in phones:
            page.locator('#cv').wait_for(timeout=9000)
            cv=page.locator('#cv')
            rect=cv.bounding_box()
            # Pointer-enabled touch input; first stroke is a single dab.
            page.mouse.click(rect['x']+rect['width']/2,rect['y']+rect['height']/2)
            page.locator('#submit').click()
            page.get_by_text('Signed and sealed').wait_for(timeout=5000)
            assert page.evaluate('sessionStorage.getItem("ff-pending-drawing")') is None
        tv.locator('.auction-head').wait_for(timeout=8000)
        for context,page in phones:
            if page.locator('#passBtn').count(): page.locator('#passBtn').click()
        tv.locator('#revealRoot').wait_for(timeout=8000)
        tv.locator('#ctl').click()
        tv.locator('.ledger').wait_for(timeout=8000)
        for context,page in phones:
            assert page.locator('.big-num').count()>=1
        assert not errors,errors
        for context,page in phones: context.close()
        browser.close()
        print('PASS: Chromium TV and three mobile joins, private credentials, rules, QR, persistent audio, drawings/ACK, auction passes, reveal and ledger')
finally:
    proc.terminate()
    try:proc.wait(timeout=4)
    except subprocess.TimeoutExpired:proc.kill()
