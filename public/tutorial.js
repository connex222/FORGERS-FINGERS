/* FORGER'S FINGER — illustrated, keyboard-accessible, on-device tutorial. */
(function () {
  'use strict';
  if (!window.FF) return;
  const chapters = [
    {"eyebrow": "The invitation", "title": "Welcome to FORGER’S FINGER", "script": "Gather three to eight questionable art experts. The television is your gallery; each person paints and bids using their phone.", "image": "/assets/logo.png", "background": "/assets/bg-gallery.webp", "label": "Gallery"},
    {"eyebrow": "The Head Curator", "title": "One curator, many dubious artists", "script": "The first player is Head Curator. Pick the Family collection or After Hours for adults only, choose the painting time and decide whether everyone masters one or two lots.", "image": "/assets/auctioneer.png", "background": "/assets/bg-gallery.webp", "label": "Curator"},
    {"eyebrow": "The secret masterpiece", "title": "Master or forger?", "script": "On each lot, one player becomes the Master and sees the real painting title in secret. Everyone else gets only a vague catalogue description. Keep the secret off the television.", "image": "/assets/frame-gilt.png", "background": "/assets/bg-studio.webp", "label": "Secret"},
    {"eyebrow": "Paint your scandal", "title": "Sign your masterpiece", "script": "Use your phone as an easel. Choose colours and brush sizes, undo a mistake, wash or clear the canvas, then sign and submit. Your drawing remains on your device until the gallery confirms receipt.", "image": "/assets/bg-studio.webp", "background": "/assets/bg-studio.webp", "label": "Paint"},
    {"eyebrow": "The auction", "title": "Which work is genuine?", "script": "Once the paintings are hung, the true title is announced. Inspect every framed lot and decide which artist produced the genuine masterpiece.", "image": "/assets/bg-auction.webp", "background": "/assets/bg-auction.webp", "label": "Auction"},
    {"eyebrow": "Raise a paddle", "title": "Bid only what you can afford", "script": "Bid one hundred, two hundred, or three hundred guineas on another player’s painting. You must have enough guineas. If you cannot afford a bid, or do not wish to make one, choose Pass.", "image": "/assets/auctioneer-shock.png", "background": "/assets/bg-auction.webp", "label": "Bids"},
    {"eyebrow": "A little admiration", "title": "One heart, one favourite", "script": "Give one heart to a painting you admire, but not your own. You can still admire another work even after passing the auction. The most-loved painting wins one hundred guineas, with ties rewarded too.", "image": "/assets/rosette.png", "background": "/assets/bg-gallery.webp", "label": "Hearts"},
    {"eyebrow": "The truth comes out", "title": "A genuine fortune or an expensive fake", "script": "A correct genuine bid wins you the amount you bid. An incorrect bid transfers that amount from your purse to the actual forger. If some, but not all, real buyers spot the genuine work, the Master earns two hundred per correct buyer.", "image": "/assets/stamp-forgery.png", "background": "/assets/bg-auction.webp", "label": "Reveal"},
    {"eyebrow": "The grand reckoning", "title": "Who leaves with the most guineas?", "script": "After everyone has been Master once or twice, the richest artist wins. Lord Gavelby presents special awards, and the genuine masterpieces return for one final exhibition. Now, on with the forgery!", "image": "/assets/award-forger.png", "background": "/assets/bg-final.webp", "label": "Awards"}
  ];
  FF.tutorialChapters = chapters;
  let run = null;
  const stop = () => {
    if (!run) return;
    run.playing = false;
    clearTimeout(run.timer); run.timer = null;
    FF.stopVoice();
  };
  const cleanup = () => {
    const active = run;
    if (!active) return;
    stop();
    document.removeEventListener('keydown', active.keyboard);
    active.dialog.remove(); run = null;
    if (active.returnFocus && active.returnFocus.isConnected) active.returnFocus.focus();
  };
  function voiceAvailable() {
    return FF.audio.enabled && FF.audio.voice &&
      typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined';
  }
  function render() {
    if (!run) return;
    const c = chapters[run.index];
    const d = run.dialog;
    d.querySelector('[data-ff-chapter]').textContent = `Chapter ${run.index + 1} of ${chapters.length}`;
    d.querySelector('[data-ff-kicker]').textContent = c.eyebrow;
    d.querySelector('[data-ff-title]').textContent = c.title;
    d.querySelector('[data-ff-copy]').textContent = c.script;
    d.querySelector('[data-ff-art]').src = c.image;
    d.querySelector('[data-ff-art]').alt = c.label + ' — original game artwork';
    d.querySelector('[data-ff-backdrop]').style.backgroundImage = 'url("' + c.background + '")';
    d.querySelector('[data-ff-progress]').style.width = (100 * (run.index + 1) / chapters.length) + '%';
    d.querySelector('[data-ff-prev]').disabled = run.index === 0;
    d.querySelector('[data-ff-next]').textContent = run.index === chapters.length - 1 ? 'Finish' : 'Next';
    d.querySelector('[data-ff-play]').textContent = run.playing ? 'Pause' : 'Play';
    d.querySelector('[data-ff-play]').setAttribute('aria-pressed', String(run.playing));
    d.querySelector('[data-ff-voice-status]').textContent = voiceAvailable()
      ? 'British English browser narration (voice varies by device)'
      : (FF.audio.voice && FF.audio.enabled ? 'No speech engine here — follow the on-screen captions' : 'Narration muted — captions are always visible');
  }
  function queueSpeech() {
    if (!run || !run.playing) return;
    clearTimeout(run.timer);
    const token = ++run.voiceToken;
    const c = chapters[run.index];
    // Automatic chapters follow spoken narration when supported; otherwise allow reading time.
    const next = () => {
      if (!run || !run.playing || run.voiceToken !== token) return;
      run.timer = setTimeout(() => {
        if (!run || !run.playing || run.voiceToken !== token) return;
        if (run.index === chapters.length - 1) { stop(); render(); }
        else { run.index += 1; render(); queueSpeech(); }
      }, 1200);
    };
    const readingFallback = () => {
      if (!run || !run.playing || run.voiceToken !== token) return;
      clearTimeout(run.timer);
      run.timer = setTimeout(next, Math.max(10000, Math.min(26000, c.script.length * 75)));
    };
    if (!voiceAvailable() || !FF.speak(c.title + '. ' + c.script, next, readingFallback)) readingFallback();
  }
  function go(delta) {
    if (!run) return;
    stop(); ++run.voiceToken;
    if (run.index === chapters.length - 1 && delta > 0) return cleanup();
    run.index = Math.min(chapters.length - 1, Math.max(0, run.index + delta));
    render();
    // Navigation is manual. Play continues from the selected chapter.
  }
  function toggle() {
    if (!run) return;
    if (run.playing) stop(); else { run.playing = true; queueSpeech(); }
    render();
  }
  FF.closeTutorial = cleanup;
  FF.showTutorial = function () {
    if (run) { cleanup(); return; }
    const dialog = document.createElement('div');
    dialog.id = 'ff-tutorial'; dialog.className = 'ff-tutorial';
    dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'FORGER’S FINGER illustrated How to Play');
    dialog.innerHTML = `<div class="ff-tutorial-window">
      <div class="ff-tutorial-top"><img src="/assets/logo.png" alt="Forgers Finger">
        <strong>Lord Gavelby’s Art of Deception</strong><span data-ff-chapter></span></div>
      <div class="ff-tutorial-progress"><span data-ff-progress></span></div>
      <div class="ff-tutorial-scene">
        <div class="ff-tutorial-picture"><div class="ff-tutorial-background" data-ff-backdrop></div>
          <img data-ff-art src="/assets/logo.png" alt=""></div>
        <div class="ff-tutorial-words"><span class="ff-tutorial-kicker" data-ff-kicker></span>
          <h2 data-ff-title></h2><p data-ff-copy></p>
          <span class="ff-tutorial-voice" data-ff-voice-status></span></div>
      </div>
      <nav class="ff-tutorial-controls" aria-label="Tutorial controls">
        <button type="button" data-ff-prev>◀ Previous</button>
        <button type="button" data-ff-play aria-pressed="false">Play</button>
        <button type="button" data-ff-next>Next ▶</button>
        <button type="button" data-ff-close>Back to lobby / game</button>
      </nav></div>`;
    document.body.appendChild(dialog);
    const keyboard = e => {
      if (e.key === 'Escape') { e.preventDefault(); cleanup(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      // Tab stays inside the modal; underlying TV controls cannot be triggered.
      if (e.key === 'Tab' && run) {
        const controls = [...run.dialog.querySelectorAll('button:not([disabled])')];
        const i = controls.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); controls[controls.length - 1].focus(); }
        else if (!e.shiftKey && i === controls.length - 1) { e.preventDefault(); controls[0].focus(); }
      }
    };
    run = { dialog, index: 0, playing: false, timer: null, voiceToken: 0, keyboard,
      returnFocus: document.activeElement };
    dialog.querySelector('[data-ff-prev]').addEventListener('click', () => go(-1));
    dialog.querySelector('[data-ff-play]').addEventListener('click', toggle);
    dialog.querySelector('[data-ff-next]').addEventListener('click', () => go(1));
    dialog.querySelector('[data-ff-close]').addEventListener('click', cleanup);
    document.addEventListener('keydown', keyboard);
    render(); dialog.querySelector('[data-ff-play]').focus();
  };
  FF.audioChanged = function () {
    if (!run) return;
    if (run.playing) { clearTimeout(run.timer); ++run.voiceToken; queueSpeech(); }
    render();
  };
  FF.showRules = FF.showTutorial;
})();
