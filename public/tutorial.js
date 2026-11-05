/* FORGER'S FINGER — illustrated, keyboard-accessible, on-device tutorial. */
(function () {
  'use strict';
  if (!window.FF) return;
  const chapters = [
  {
    "eyebrow": "The invitation",
    "title": "Welcome to FORGER’S FINGER",
    "script": "Good evening, ladies, gentlemen, and anyone with a suspiciously clean paintbrush! I am Lord Gavelby: judge of fine art, keeper of the gallery, and reluctant witness to what you lot call talent. Welcome to FORGER'S FINGER, where a masterpiece can make you rich and an enthusiastic scribble can make you a criminal against taste. You'll need three to eight players. The big screen is our gallery; your phones are your brushes, bidding paddles and instruments of deception. Scan the gallery code, choose a portrait, and prepare to make art history. Or at least a terrible mess of it.",
    "image": "/assets/logo.png",
    "background": "/assets/bg-gallery.webp",
    "label": "Gallery",
    "audio": "https://cdn.creativeclaw.co/u/f3e7a3b1/audio/6da3fb5a-9d63-4358-919b-ff0bb46850e1.mp3"
  },
  {
    "eyebrow": "The Head Curator",
    "title": "One curator, many dubious artists",
    "script": "First, somebody must run this establishment. The first player becomes Head Curator, a title that sounds grander than it pays. Everyone joins the same four-letter gallery, then the Curator chooses the collection: Family for the respectable crowd, or After Hours for adults of eighteen and over. Choose how long everybody gets to paint, and whether each artist takes one or two turns as Master. That is one or two complete trips around our delightfully corrupt gallery. Once at least three players have arrived, the Curator starts the exhibition. No bribery necessary. Not officially, anyway.",
    "image": "/assets/auctioneer.png",
    "background": "/assets/bg-gallery.webp",
    "label": "Curator",
    "audio": "https://cdn.creativeclaw.co/u/f3e7a3b1/audio/5677d799-511a-4b43-9be5-6d94aefacde7.mp3"
  },
  {
    "eyebrow": "The secret masterpiece",
    "title": "Master or forger?",
    "script": "Now the secret of the whole affair. For each lot, exactly one artist is our Master. Only the Master sees the genuine painting title, secretly, on their phone. The rest of you are forgers, entrusted with a vague catalogue description and far too much confidence. The Master paints an interpretation of the actual title; the forgers attempt to fool the room with convincing alternatives. Nobody should reveal their private instruction, point at a neighbour's screen, or announce that they are the Master. Keep a straight face. If you can. Remember, the real painting is a secret until the auction begins.",
    "image": "/assets/frame-gilt.png",
    "background": "/assets/bg-studio.webp",
    "label": "Secret",
    "audio": "https://cdn.creativeclaw.co/u/f3e7a3b1/audio/e4897d64-e77e-4c75-aa1f-9b4930c76afc.mp3"
  },
  {
    "eyebrow": "Paint your scandal",
    "title": "Sign your masterpiece",
    "script": "To your easels! Your phone is your painting studio. Pick a colour and brush size, then draw directly on the canvas. Made a ghastly mistake? Use Undo. Made several? Clear the whole thing and call it a creative decision. When you're satisfied, sign and submit your masterpiece before the drawing period ends. The game waits for the gallery to acknowledge your submission, so a brief Wi-Fi wobble needn't destroy your genius. The Master must paint just like everyone else. And please, no peeking. A cunning forgery is art; looking over someone's shoulder is merely cheating.",
    "image": "/assets/bg-studio.webp",
    "background": "/assets/bg-studio.webp",
    "label": "Paint",
    "audio": "https://cdn.creativeclaw.co/u/f3e7a3b1/audio/57c9fc98-2bda-484e-bee5-0cc492e531fa.mp3"
  },
  {
    "eyebrow": "The auction",
    "title": "Which work is genuine?",
    "script": "The curtains part, the paintings arrive, and the auction begins. Now the genuine title is announced to everyone. Study the framed works on the big screen. Which artist actually painted that secret title? Which one guessed it? Which one appears to have drawn a potato with ambition? Every painting has its own gallery letter. You must choose another player's work, not your own, and you cannot change your verdict once a valid bid is accepted. Our Master does not bid this round. Inspect the evidence with care, collectors. Confidence is expensive in this particular room.",
    "image": "/assets/bg-auction.webp",
    "background": "/assets/bg-auction.webp",
    "label": "Auction",
    "audio": "https://cdn.creativeclaw.co/u/f3e7a3b1/audio/3b83692a-a9d4-420a-a2a7-20a84cf3c839.mp3"
  },
  {
    "eyebrow": "Raise a paddle",
    "title": "Bid only what you can afford",
    "script": "Time to raise a paddle and put your guineas where your mouth is! Each eligible collector may bid one hundred, two hundred or three hundred guineas on a painting they believe is genuine. Your available balance must cover your bid. No imaginary money, no overdrafts, and absolutely no borrowing from the butler. If you have fewer than one hundred guineas, or simply wish to sit this one out, press Pass. Passing finishes your auction decision without placing a bet. Watch for confirmation on your phone: a frantic double-tap is not a second bid. And remember, never bid on your own picture.",
    "image": "/assets/auctioneer-shock.png",
    "background": "/assets/bg-auction.webp",
    "label": "Bids",
    "audio": "https://cdn.creativeclaw.co/u/f3e7a3b1/audio/040dcf84-82a7-4a0f-b6b9-d671c32ac626.mp3"
  },
  {
    "eyebrow": "A little admiration",
    "title": "One heart, one favourite",
    "script": "Even the worst work can have admirers. Each eligible player may award one heart to a painting they like, provided it isn't their own. You can vote for a favourite even if you passed the auction. This is admiration, not a wager, so there is no guinea stake attached. The painting with the most hearts earns its artist a one-hundred-guinea People's Favourite bonus. If several works tie for the most, each winning artist receives the bonus. Naturally, an audience might prefer an outrageous forgery to a masterpiece. Their taste is beyond my authority, and frankly beyond medical science.",
    "image": "/assets/rosette.png",
    "background": "/assets/bg-gallery.webp",
    "label": "Hearts",
    "audio": "https://cdn.creativeclaw.co/u/f3e7a3b1/audio/aa0588b2-1af8-42f2-9221-11e211a7f7bf.mp3"
  },
  {
    "eyebrow": "The truth comes out",
    "title": "A genuine fortune or an expensive fake",
    "script": "And now, the awful truth! If you backed the genuine painting, congratulations: you earn a bonus equal to the guineas you bid. If you backed a forgery, those guineas leave your purse and go directly to the forger who painted it. Exactly the amount you lost; not a penny is conjured from thin air. The Master has a special prize for well-judged deception: if some, but not all, actual bidders spotted the genuine work, the Master earns two hundred guineas for each correct bidder. If nobody bids, everybody guesses right, or everybody guesses wrong, that Master bonus does not apply. Hearts are counted separately.",
    "image": "/assets/stamp-forgery.png",
    "background": "/assets/bg-auction.webp",
    "label": "Reveal",
    "audio": "https://cdn.creativeclaw.co/u/f3e7a3b1/audio/e35f6d45-d970-4bb7-a2b1-81e6c29554b1.mp3"
  },
  {
    "eyebrow": "The grand reckoning",
    "title": "Who leaves with the most guineas?",
    "script": "At the end of each round, the ledger shows who gained, who lost, who fooled a collector and who deserves a quiet lie-down. Everyone takes their Master turn once, or twice if your Curator selected a longer exhibition. After the final lot, the artist with the largest guinea balance wins the game. But I have not finished humiliating you: there are special awards, and our collection of genuine masterpieces returns for one last glorious display. Then you can return to the lobby for another exhibition. Remember, in FORGER'S FINGER, beauty is in the eye of the bidder, and the bidder is usually wrong. Let the forgery begin!",
    "image": "/assets/award-forger.png",
    "background": "/assets/bg-final.webp",
    "label": "Awards",
    "audio": "https://cdn.creativeclaw.co/u/f3e7a3b1/audio/4f5add52-b015-434d-9ccd-84898f7290f9.mp3"
  }
];
  FF.tutorialChapters = chapters;
  let run = null;
  const audioReady = () => !!(FF.audio.enabled && FF.audio.voice);
  function cancelChapter() {
    if (!run) return;
    clearTimeout(run.timer); run.timer = null;
    if (run.recording) {
      run.recording.onended = null;
      run.recording.onerror = null;
      run.recording.pause();
      run.recording = null;
    }
    FF.stopVoice();
  }
  const stop = () => {
    if (!run) return;
    run.playing = false;
    cancelChapter();
    run.voiceToken++;
  };
  const cleanup = () => {
    const active = run;
    if (!active) return;
    stop();
    document.removeEventListener('keydown', active.keyboard);
    active.dialog.remove(); run = null;
    if (active.returnFocus && active.returnFocus.isConnected) active.returnFocus.focus();
  };
  function render() {
    if (!run) return;
    const c = chapters[run.index], d = run.dialog;
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
    d.querySelector('[data-ff-voice-status]').textContent = !audioReady()
      ? 'Voice or sound is off. Enable it in Audio options to hear Lord Gavelby.'
      : run.recording ? 'Lord Gavelby — recorded Northern English narration'
      : 'Lord Gavelby — recorded narration, with a browser-voice fallback if unavailable';
  }
  function scheduleNext(token) {
    if (!run || !run.playing || token !== run.voiceToken) return;
    clearTimeout(run.timer);
    run.timer = setTimeout(() => {
      if (!run || !run.playing || token !== run.voiceToken) return;
      cancelChapter();
      if (run.index >= chapters.length - 1) { stop(); render(); }
      else { run.index++; render(); queueSpeech(); }
    }, 900);
  }
  function queueSpeech() {
    if (!run || !run.playing) return;
    cancelChapter();
    const token = ++run.voiceToken, c = chapters[run.index];
    const next = () => scheduleNext(token);
    const readingFallback = () => {
      if (!run || token !== run.voiceToken || !run.playing) return;
      clearTimeout(run.timer);
      run.timer = setTimeout(next, Math.max(19000, Math.min(75000, c.script.length * 70)));
    };
    const voiceFallback = () => {
      if (!run || token !== run.voiceToken || !run.playing) return;
      if (!audioReady() || !FF.speak(c.script, next, readingFallback)) readingFallback();
      render();
    };
    if (audioReady() && c.audio && typeof Audio === 'function') {
      try {
        const a = new Audio(c.audio);
        a.preload = 'auto';
        a.volume = 0.94;
        run.recording = a;
        a.onended = next;
        a.onerror = () => { if (!run || token !== run.voiceToken) return; run.recording = null; voiceFallback(); };
        const playback = a.play();
        if (playback && typeof playback.catch === 'function') playback.catch(() => {
          if (!run || token !== run.voiceToken) return;
          run.recording = null; voiceFallback();
        });
        render();
        return;
      } catch { /* fallback to device speech */ }
    }
    voiceFallback();
  }
  function go(delta) {
    if (!run) return;
    stop();
    if (run.index === chapters.length - 1 && delta > 0) return cleanup();
    run.index = Math.min(chapters.length - 1, Math.max(0, run.index + delta));
    render();
  }
  function toggle() {
    if (!run) return;
    if (run.playing) {
      run.playing = false;
      clearTimeout(run.timer); run.timer = null;
      if (run.recording) run.recording.pause();
      else { FF.stopVoice(); ++run.voiceToken; }
    } else {
      run.playing = true;
      if (run.recording) {
        const token = run.voiceToken;
        const playback = run.recording.play();
        if (playback && typeof playback.catch === 'function') playback.catch(() => {
          if (!run || token !== run.voiceToken) return;
          cancelChapter(); queueSpeech();
        });
      } else queueSpeech();
    }
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
    run = { dialog, index: 0, playing: false, timer: null, recording: null, voiceToken: 0, keyboard,
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
