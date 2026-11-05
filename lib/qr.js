'use strict';
// Small deterministic QR Model 2, byte mode, error correction M, versions 1–10.
// Implemented from ISO/IEC 18004 placement rules; no remote QR API or trackers.
const BLOCKS = [
  [1,26,16],[1,44,28],[1,70,44],[2,50,32],[2,67,43],[4,43,27],
  [4,49,31],[2,60,38,2,61,39],[3,58,36,2,59,37],[4,69,43,1,70,44],
];
const POS = [[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54]];
function multiply(a,b) {
  let v=0; for(let i=7;i>=0;i--){ v=(v<<1)^((v&128)?0x11d:0); if(b>>>i&1)v^=a; } return v;
}
function rs(data, ec) {
  let poly=[1];
  let root=1;
  for(let i=0;i<ec;i++){const next=Array(poly.length+1).fill(0);poly.forEach((v,j)=>{next[j]^=v;next[j+1]^=multiply(v,root);});poly=next;root=multiply(root,2);}
  const rem=Array(ec).fill(0);
  for(const b of data){ const factor=b^rem[0];rem.shift();rem.push(0);for(let j=0;j<ec;j++)rem[j]^=multiply(poly[j+1],factor); }
  return rem;
}
function bch(n,div) {
  let x=n;
  const degree = Math.floor(Math.log2(div));
  x <<= degree;
  for(let i=Math.floor(Math.log2(x||1));i>=degree;i--)if(x & (1<<i))x^=div<<(i-degree);
  return (n<<degree)|x;
}
function encodeBytes(text) {
  const bytes=Buffer.from(text,'utf8');
  let version=0, groups, capacity;
  for(let v=1;v<=10;v++){
    const b=BLOCKS[v-1];let c=0;for(let i=0;i<b.length;i+=3)c+=b[i]*b[i+2];
    const need=4+(v<=9?8:16)+bytes.length*8;
    if(c*8>=need){version=v;capacity=c;groups=b;break;}
  }
  if(!version)throw Error('Join URL too long for QR (maximum version 10)');
  const bits=[];const push=(value,n)=>{for(let i=n-1;i>=0;i--)bits.push((value>>>i)&1);};
  push(4,4);push(bytes.length,version<=9?8:16);
  for(const b of bytes)push(b,8);
  for(let i=0;i<Math.min(4,capacity*8-bits.length);i++)bits.push(0);
  while(bits.length%8)bits.push(0);
  const data=[];for(let i=0;i<bits.length;i+=8)data.push(parseInt(bits.slice(i,i+8).join(''),2));
  for(let pad=0;data.length<capacity;pad++)data.push(pad%2?0x11:0xec);
  const blocks=[]; let offset=0;
  for(let i=0;i<groups.length;i+=3){const [n,total,count]=groups.slice(i,i+3);for(let k=0;k<n;k++){const d=data.slice(offset,offset+count);offset+=count;blocks.push({data:d,ec:rs(d,total-count)});}}
  const all=[];
  for(let j=0;j<Math.max(...blocks.map(b=>b.data.length));j++)for(const b of blocks)if(j<b.data.length)all.push(b.data[j]);
  for(let j=0;j<blocks[0].ec.length;j++)for(const b of blocks)all.push(b.ec[j]);
  return {version,all};
}
function qr(text) {
  const {version,all}=encodeBytes(text);const n=17+4*version;
  const m=Array.from({length:n},()=>Array(n).fill(null));
  const put=(r,c,v)=>{if(r>=0&&r<n&&c>=0&&c<n)m[r][c]=!!v;};
  function finder(r,c) {
    for(let y=-1;y<=7;y++)for(let x=-1;x<=7;x++){
      const ring=y===0||y===6||x===0||x===6;
      const core=y>=2&&y<=4&&x>=2&&x<=4;
      put(r+y,c+x,(y>=0&&y<=6&&x>=0&&x<=6)&&(ring||core));
    }
  }
  finder(0,0);finder(0,n-7);finder(n-7,0);
  for(const r of POS[version-1])for(const c of POS[version-1]){
    if(m[r][c]!==null)continue;
    for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)put(r+y,c+x,Math.max(Math.abs(x),Math.abs(y))===2||(x===0&&y===0));
  }
  for(let i=8;i<n-8;i++){if(m[6][i]===null)put(6,i,i%2===0);if(m[i][6]===null)put(i,6,i%2===0);}
  // ECC M uses format information prefix 00; mask 0 chosen deterministically.
  const format=bch(0,0x537)^0x5412;
  for(let i=0;i<15;i++){
    const bit=!!(format>>i&1);
    put(i<6?i:i<8?i+1:n-15+i,8,bit);
    put(8,i<8?n-1-i:i<9?15-i:14-i,bit);
  }
  put(n-8,8,true);
  if(version>=7){const info=bch(version,0x1f25);for(let i=0;i<18;i++){
    put(Math.floor(i/3),i%3+n-11,info>>i&1);
    put(i%3+n-11,Math.floor(i/3),info>>i&1);
  }}
  const dbits=[];for(const b of all)for(let i=7;i>=0;i--)dbits.push(!!(b>>i&1));
  let idx=0,up=true;
  for(let col=n-1;col>=1;col-=2){
    if(col===6)col=5;
    for(let rowi=0;rowi<n;rowi++){
      const r=up?n-1-rowi:rowi;
      for(let d=0;d<2;d++){const c=col-d;if(m[r][c]===null){const bit=idx<dbits.length?dbits[idx]:false;idx++;m[r][c]=bit!==((r+c)%2===0);}}
    }
    up=!up;
  }
  return m;
}
function svg(text) {
  const m=qr(text),border=4,n=m.length+border*2;
  const seg=[];
  for(let y=0;y<m.length;y++)for(let x=0;x<m.length;x++)if(m[y][x])seg.push(`M${x+border} ${y+border}h1v1h-1z`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="320" height="320" role="img" aria-label="Scan to join gallery"><rect width="${n}" height="${n}" fill="#fff"/><path d="${seg.join('')}" fill="#111"/></svg>`;
}
module.exports={qr,svg,encodeBytes};
