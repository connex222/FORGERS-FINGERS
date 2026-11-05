"""Original procedural music and effects; no third-party recordings/samples."""
from pathlib import Path
import numpy as np, math, wave, subprocess, tempfile, hashlib
out=Path(__file__).resolve().parents[1]/'public/assets/sfx';out.mkdir(parents=True,exist_ok=True)
SR=32000
rng=np.random.default_rng(8675309)

def note_freq(n):return 440*2**((n-69)/12)

def tone(freq,n,kind='piano',velocity=1.0):
 t=np.arange(int(SR*n))/SR
 if len(t)==0:return np.zeros(0)
 if kind=='string':
  amps=[1,.35,.16,.11,.06];attack=.065;release=.19;body=np.sin(2*np.pi*freq*t)
  for h,a in enumerate(amps[1:],2):body+=a*np.sin(2*np.pi*freq*h*t+.3*h)
  env=(1-np.exp(-t/attack))*np.minimum(1,np.maximum(0,(n-t)/release))
 elif kind=='flute':
  body=np.sin(2*np.pi*freq*t)+.11*np.sin(2*np.pi*freq*2*t)+.03*np.sin(2*np.pi*freq*3*t)
  env=(1-np.exp(-t/.024))*np.minimum(1,np.maximum(0,(n-t)/.12))
 elif kind=='brass':
  body=sum((1/h**.75)*np.sin(2*np.pi*freq*h*t+.05*h) for h in range(1,7))
  env=(1-np.exp(-t/.018))*np.minimum(1,np.maximum(0,(n-t)/.20))
 elif kind=='bass':
  body=np.sin(2*np.pi*freq*t)+.35*np.sin(2*np.pi*freq*2*t)+.15*np.sin(2*np.pi*freq*3*t)
  env=(1-np.exp(-t/.012))*np.exp(-t/.54)*np.minimum(1,np.maximum(0,(n-t)/.10))
 elif kind=='bell':
  body=sum(a*np.sin(2*np.pi*freq*mult*t) for mult,a in [(1,1),(2,.5),(2.72,.24),(3.33,.12),(4.7,.06)])
  env=np.exp(-t/(.1+.32*n))*np.minimum(1,np.maximum(0,(n-t)/.08))
 else: # plucked salon piano (procedural)
  body=sum(a*np.sin(2*np.pi*freq*h*t+(h*.15)) for h,a in [(1,1), (2,.35),(3,.17),(4,.09),(5,.045)])
  env=(1-np.exp(-t/.003))*np.exp(-t/(.21+.12*(freq<330))) * np.minimum(1,np.maximum(0,(n-t)/.05))
 return .22*velocity*body*env

def music(name,bpm,bars,prog,variation):
 beat=60/bpm;length=bars*3*beat;buf=np.zeros(int((length+.25)*SR),dtype=np.float64)
 def put(midi,start,duration,kind='piano',amp=1):
  idx=int(start*SR);snd=tone(note_freq(midi),duration,kind,amp)
  edge=min(len(snd),len(buf)-idx)
  if edge>0:buf[idx:idx+edge]+=snd[:edge]
 for bar in range(bars):
  base=bar*3*beat
  root,quality=prog[bar%len(prog)]
  triad=[root,root+(3 if quality=='min' else 4),root+7]
  # hallmark waltz 'oom-pah-pah' with plucked bass and piano chord stabs
  put(root-12,base,.72*beat,'bass',.55)
  for j in (1,2):
   for k in triad:put(k,base+j*beat,.65*beat,'piano',.55)
  # separate counterline low strings every other bar
  if bar%2==0:put(root-5,base+beat,.95*beat,'string',.13)
  # expressive playable original melody, 4-note turn + neighbour notes
  third=3 if quality=='min' else 4
  if variation=='lobby':
   patterns=[[7,4,2,0],[4,7,9,7],[3,4,7,4],[9,7,4,2],[0,2,4,7],[7,9,11,7],[4,3,2,0],[2,4,2,0]]
   seq=patterns[bar%len(patterns)]
   for j,step in enumerate(seq):
    # scale degrees adjusted relative to major / minor chord
    offset=step-(1 if quality=='min' and step==4 else 0)
    put(root+12+offset,base+j*.75*beat,.65*beat,'flute',.42 if j in (0,2) else .34)
  else:
   patterns=[[0,7,4,9,7,4],[7,4,2,4,7,9],[0,3,7,10,7,3],[7,5,4,2,4,7]]
   seq=patterns[bar%4]
   for j,x in enumerate(seq):
    put(root+12+x,base+j*.50*beat,.43*beat,'string',.27)
    if j%3==0:put(root+24+x,base+j*.50*beat,.33*beat,'piano',.17)
 # small chamber reflection / spatial depth, not sample reverb
 audio=buf.copy()
 for delay,amp in [(0.084,.13),(0.181,.10),(0.32,.055)]:
  shift=int(delay*SR);audio[shift:]+=buf[:-shift]*amp
 audio=audio[:int(length*SR)]
 fade=int(.19*SR);audio[:fade]*=np.linspace(0,1,fade)
 audio[-fade:]*=np.linspace(1,0,fade)
 return audio

def add(buf,signal,start=0):
 i=int(start*SR);m=min(len(signal),len(buf)-i)
 if m>0:buf[i:i+m]+=signal[:m]

def noise(s,amp=.5,hp=False):
 x=rng.normal(size=int(s*SR));
 if hp:x=np.r_[0,np.diff(x)]
 return amp*x

def fx(name):
 dur={'join':1.5,'gavel':.8,'submit':.9,'bid':.95,'tick':.22,'drumroll':2.3,'stamp-forgery':1.0,'stamp-genuine':1.5,'applause':2.6,'coins':1.6,'fanfare':2.8,'sad-trombone':2.5}[name]
 b=np.zeros(int(SR*dur))
 if name=='join':
  for i,pitch in enumerate([81,88,93]):add(b,tone(note_freq(pitch),.55,'bell',.55),.12+i*.25)
  add(b,noise(.13,.013)*np.exp(-np.arange(int(SR*.13))/SR/.025),.01)
 elif name=='gavel':
  for start,scale in [(0,.8),(.16,.32)]:
   x=noise(.24,.24)*np.exp(-np.arange(int(SR*.24))/SR/.027)
   x[:int(.17*SR)]+=tone(108,.17,'bass',.9)
   add(b,x*scale,start)
 elif name=='submit':
  for i in range(5):
   crack=noise(.08,.035,True)*np.exp(-np.arange(int(SR*.08))/SR/.019)
   add(b,crack,.08+i*.065)
  add(b,tone(note_freq(74),.35,'bell',.7),.42)
 elif name=='bid':
  for i,pitch in enumerate([74,81]):add(b,tone(note_freq(pitch),.45,'bell',.8),i*.17)
 elif name=='tick':
  x=noise(.06,.13,True)*np.exp(-np.arange(int(SR*.06))/SR/.006)
  add(b,x,.035)
 elif name=='drumroll':
  for i in range(35):
   at=(i/35)**.8*1.95
   x=noise(.085,.095,True)*np.exp(-np.arange(int(SR*.085))/SR/.026)
   add(b,x*(.25+.75*(i/35)),at)
  add(b,tone(note_freq(55),.27,'brass',.6),2.04)
 elif name=='stamp-forgery':
  add(b,noise(.20,.22,True)*np.exp(-np.arange(int(SR*.2))/SR/.032),.03)
  pitch=np.linspace(230,115,int(.62*SR));phase=np.cumsum(pitch)/SR*2*np.pi
  add(b,.21*np.sin(phase)*np.exp(-np.arange(len(pitch))/SR/0.25),.22)
 elif name=='stamp-genuine':
  add(b,noise(.11,.19,True)*np.exp(-np.arange(int(SR*.11))/SR/.018),.05)
  for i,pitch in enumerate([72,76,79,84]):add(b,tone(note_freq(pitch),.76,'bell',.49),.19+i*.13)
 elif name=='applause':
  # many unique short handclaps, stochastic but reproducible, no recorded audio
  for i in range(125):
   at=float(rng.uniform(.03,2.42));durcl=.025+float(rng.uniform(.005,.055))
   x=noise(durcl,float(rng.uniform(.013,.05)),True)
   t=np.arange(len(x))/SR;add(b,x*np.exp(-t/(durcl*.38)),at)
 elif name=='coins':
  for i in range(13):
   at=.08+i*.075+float(rng.uniform(0,.035))
   add(b,tone(float(rng.uniform(900,2100)),.42,'bell',float(rng.uniform(.20,.40))),at)
 elif name=='fanfare':
  for j,pitches in enumerate([[60,64,67],[62,65,69],[64,67,72],[60,67,72,76]]):
   for note in pitches:add(b,tone(note_freq(note),.51 if j<3 else .86,'brass',.33),j*.40)
 elif name=='sad-trombone':
  for j,note in enumerate([64,62,60,57]):
   t=np.arange(int(.5*SR))/SR;f=note_freq(note)*np.linspace(1.0,.93,len(t));w=np.sin(2*np.pi*np.cumsum(f)/SR)+.27*np.sin(4*np.pi*np.cumsum(f)/SR)
   add(b,w*.12*(1-np.exp(-t/.025))*np.minimum(1,(.5-t)/.1),j*.48)
 b=np.tanh(b*1.4)
 return b

def save(name,x):
 # double channel with delicate spatial cross-delay, no library soundtrack used
 if len(x)==0 or np.max(abs(x))<.002:raise ValueError('silent '+name)
 gain=.84/max(.85,np.max(abs(x)))
 left=x*gain;right=left*.97
 if len(right)>600:right[500:]+=left[:-500]*.06
 stereo=np.stack([left,right],axis=1)
 pcm=(np.clip(stereo,-.96,.96)*32767).astype('<i2')
 with tempfile.NamedTemporaryFile(suffix='.wav',delete=False) as tmp:
  wav=Path(tmp.name)
 try:
  with wave.open(str(wav),'wb') as f:
   f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes(pcm.tobytes())
  outpath=out/(name+'.mp3')
  r=subprocess.run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','128k',str(outpath)],capture_output=True)
  if r.returncode:raise Exception(r.stderr.decode())
  print(f'{name:18s} {len(x)/SR:5.2f}s {outpath.stat().st_size:7,d} bytes max={np.max(abs(x)):.3f}')
 finally:wav.unlink(missing_ok=True)

# Composed from scratch: distinct original leitmotifs and harmonic patterns.
lobby=[(60,'maj'),(67,'maj'),(69,'min'),(64,'maj'),(65,'maj'),(60,'maj'),(62,'min'),(67,'maj')]
draw=[(57,'min'),(64,'maj'),(60,'maj'),(67,'maj'),(62,'min'),(69,'min'),(65,'maj'),(64,'maj')]
save('music-lobby',music('music-lobby',118,24,lobby,'lobby'))
save('music-draw',music('music-draw',135,24,draw,'draw'))
for n in ['join','gavel','submit','bid','tick','drumroll','stamp-forgery','stamp-genuine','applause','coins','fanfare','sad-trombone']:save(n,fx(n))
print('audio generated original procedural synthesis, no external samples')
