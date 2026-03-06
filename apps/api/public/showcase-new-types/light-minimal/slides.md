---
marp: true
theme: default
paginate: false
---

<style>
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Inter:wght@400;600;700&display=swap');

  section {
    width: 1280px;
    height: 720px;
    background: #ffffff;
    color: #1e293b;
    font-family: 'Inter', sans-serif;
    font-size: 18px;
    line-height: 1.5;
    padding: 0;
    margin: 0;
    overflow: hidden;
    position: relative;
  }

  h1, h2, h3 {
    font-family: 'Montserrat', sans-serif;
    color: #1e293b;
    margin: 0;
    padding: 0;
    line-height: 1.2;
  }
  h1 { font-size: 40px; font-weight: 700; }
  h1::after {
    content: '';
    display: block;
    width: 60px;
    height: 3px;
    background: #3b82f6;
    margin-top: 8px;
    border-radius: 2px;
  }
  h2 { font-size: 28px; font-weight: 600; color: #64748b; }
  h3 { font-size: 22px; font-weight: 600; }
  p { margin: 8px 0; color: #1e293b; }
  strong { color: #3b82f6; font-weight: 700; }
  em { color: #64748b; }

  ul, ol { margin: 8px 0; padding-left: 24px; }
  li {
    margin-bottom: 6px;
    color: #1e293b;
    font-size: 17px;
    line-height: 1.4;
  }
  li::marker { color: #3b82f6; }

  section div[style*="position:absolute"],
  section div[style*="position: absolute"] {
    box-sizing: border-box;
  }

  svg text { font-family: 'Inter', 'Montserrat', sans-serif; }

  foreignObject div, foreignObject p, foreignObject span {
    font-family: 'Inter', sans-serif;
    line-height: 1.4;
    box-sizing: border-box;
  }

  section img:not([alt*="bg"]) { object-fit: cover; border-radius: 0; }

  .mood-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  section > div {
    position: relative;
    z-index: 1;
  }

  .glass-card {
    background: rgba(255,255,255,0.8);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(0,0,0,0.06);
    box-shadow: 0 2px 12px rgba(0,0,0,0.05);
    border-radius: 16px;
    padding: 20px 24px;
  }

  li:nth-child(4n+1) strong { color: #3b82f6; }
  li:nth-child(4n+2) strong { color: #1e293b; }
  li:nth-child(4n+3) strong { color: #22c55e; }
  li:nth-child(4n+4) strong { color: #64748b; }

  ::-webkit-scrollbar { display: none; }
  * { scrollbar-width: none; }
</style>

<!-- _backgroundColor: #ffffff -->
<!-- _color: #1e293b -->

<style scoped>
section { padding: 0 !important; display: block !important; overflow: visible !important; position: relative !important; }
section > * { flex-shrink: unset; }
section::after { position: absolute !important; bottom: 14px !important; right: 20px !important; font-size: 12px !important; z-index: 50 !important; padding: 2px 8px !important; border-radius: 4px !important; color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.08) !important; }
</style>
<div style="position:relative;width:1280px;height:720px;background:#ffffff;overflow:hidden">
  <div style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;background:radial-gradient(ellipse 70% 60% at 20% 50%, rgba(59,130,246,0.15) 0%, transparent 55%),radial-gradient(ellipse 60% 50% at 80% 50%, rgba(59,130,246,0.08) 0%, transparent 50%),radial-gradient(ellipse 90% 80% at 50% 50%, rgba(59,130,246,0.04) 0%, transparent 65%)"></div>
  <div style="position:absolute;left:540px;top:226px;width:200px;height:200px;font-size:200px;line-height:200px;text-align:center;color:#3b82f6;opacity:0.08;font-weight:900;pointer-events:none">?</div>
  <div style="position:absolute;left:192px;top:180px;width:896px;height:360px;background:radial-gradient(ellipse at center,rgba(59,130,246,0.12) 0%,transparent 70%);pointer-events:none"></div>
  <div style="position:absolute;left:53px;top:53px;width:1174px;text-align:center;font-size:34px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:#1e293b;line-height:1.2">The $4.7 Trillion Question</div>
  <div style="position:absolute;left:610px;top:109px;width:60px;height:3px;background:#3b82f6;border-radius:2px"></div>
  <div style="position:absolute;left:73px;top:274px;width:1134px;text-align:center;font-size:38px;font-weight:bold;line-height:1.3;color:#1e293b">What if every presentation you made looked like it was designed by McKinsey?</div>
  
</div>

---

<!-- _backgroundColor: #ffffff -->
<!-- _color: #1e293b -->

<svg style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;z-index:0" viewBox="0 0 1280 720"><defs><pattern id="mood-dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1" fill="rgba(0,0,0,0.05)"/></pattern></defs><rect width="1280" height="720" fill="url(#mood-dots)"/><path d="M53,53 L73,53 M53,53 L53,73" stroke="rgba(162,28,175,0.08)" stroke-width="2" fill="none"/><path d="M1227,667 L1207,667 M1227,667 L1227,647" stroke="rgba(162,28,175,0.08)" stroke-width="2" fill="none"/></svg>
<style scoped>
section { padding: 0 !important; display: block !important; overflow: visible !important; position: relative !important; }
section > * { flex-shrink: unset; }
section::after { position: absolute !important; bottom: 14px !important; right: 20px !important; font-size: 12px !important; z-index: 50 !important; padding: 2px 8px !important; border-radius: 4px !important; color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.08) !important; }
</style>
<div style="position:relative;width:1280px;height:720px;background:#ffffff;overflow:hidden">
  <div style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;background:radial-gradient(ellipse 70% 60% at 20% 50%, rgba(162,28,175,0.15) 0%, transparent 55%),radial-gradient(ellipse 60% 50% at 80% 50%, rgba(162,28,175,0.08) 0%, transparent 50%),radial-gradient(ellipse 90% 80% at 50% 50%, rgba(162,28,175,0.04) 0%, transparent 65%)"></div>
  <div style="position:absolute;left:53px;top:53px;width:1174px;font-size:40px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:#a21caf;line-height:1.2">Strategic Priority Matrix</div>
  <div style="position:absolute;left:53px;top:109px;width:50px;height:3px;border-radius:2px;background:repeating-linear-gradient(to right,#3b82f6 0px,#3b82f6 8px,transparent 8px,transparent 14px)"></div>
  <div style="position:absolute;left:93px;top:143px;width:513px;height:247px;background:rgba(30,41,59,0.06);border:1px solid rgba(226,232,240,0.2)"></div><div style="position:absolute;left:105px;top:151px;width:489px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#a21caf;opacity:0.8">Stars</div><div style="position:absolute;left:606px;top:143px;width:513px;height:247px;background:rgba(100,116,139,0.06);border:1px solid rgba(226,232,240,0.2)"></div><div style="position:absolute;left:618px;top:151px;width:489px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#a21caf;opacity:0.8">Question Marks</div><div style="position:absolute;left:93px;top:390px;width:513px;height:247px;background:rgba(34,197,94,0.06);border:1px solid rgba(226,232,240,0.2)"></div><div style="position:absolute;left:105px;top:398px;width:489px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#a21caf;opacity:0.8">Cash Cows</div><div style="position:absolute;left:606px;top:390px;width:513px;height:247px;background:rgba(245,158,11,0.06);border:1px solid rgba(226,232,240,0.2)"></div><div style="position:absolute;left:618px;top:398px;width:489px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#a21caf;opacity:0.8">Dogs</div>
  <div style="position:absolute;left:93px;top:643px;width:1025px;text-align:center;font-size:12px;color:#a21caf;opacity:0.6">Axis: Speed of Implementation</div>
  <div style="position:absolute;left:63px;top:143px;width:494px;font-size:12px;color:#a21caf;opacity:0.6;transform:rotate(-90deg);transform-origin:0 0;white-space:nowrap">Axis: Business Impact</div>
  <svg style="position:absolute;left:0;top:0" width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
    <line x1="93" y1="390" x2="1118" y2="390" stroke="#e2e8f0" stroke-width="2" opacity="0.4" /><line x1="606" y1="143" x2="606" y2="637" stroke="#e2e8f0" stroke-width="2" opacity="0.4" />
    <circle cx="150" cy="188" r="18" fill="rgba(30,41,59,0.25)" stroke="#1e293b" stroke-width="2" /><text x="150" y="192" text-anchor="middle" fill="#1e293b" font-size="10" font-weight="bold">Quick </text><circle cx="670" cy="201" r="18" fill="rgba(100,116,139,0.25)" stroke="#64748b" stroke-width="2" /><text x="670" y="205" text-anchor="middle" fill="#1e293b" font-size="10" font-weight="bold">Strate</text><circle cx="526" cy="489" r="18" fill="rgba(34,197,94,0.25)" stroke="#22c55e" stroke-width="2" /><text x="526" y="493" text-anchor="middle" fill="#1e293b" font-size="10" font-weight="bold">Low Ha</text><circle cx="1011" cy="437" r="18" fill="rgba(245,158,11,0.25)" stroke="#f59e0b" stroke-width="2" /><text x="1011" y="441" text-anchor="middle" fill="#1e293b" font-size="10" font-weight="bold">Avoid</text>
  </svg>
</div>

---

<!-- _backgroundColor: #ffffff -->
<!-- _color: #1e293b -->

<div style="position:absolute;left:0;top:0;width:1280px;height:720px;background:linear-gradient(to top right,rgba(34,197,94,0.06) 0%,transparent 60%);pointer-events:none;z-index:0"></div><svg style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;z-index:0" viewBox="0 0 1280 720"><line x1="128" y1="648" x2="384" y2="288" stroke="rgba(5,150,105,0.04)" stroke-width="2"/><line x1="448" y1="612" x2="704" y2="251.99999999999997" stroke="rgba(34,197,94,0.05)" stroke-width="1.5"/><line x1="768" y1="576" x2="1024" y2="216" stroke="rgba(34,197,94,0.06)" stroke-width="1"/></svg>
<style scoped>
section { padding: 0 !important; display: block !important; overflow: visible !important; position: relative !important; }
section > * { flex-shrink: unset; }
section::after { position: absolute !important; bottom: 14px !important; right: 20px !important; font-size: 12px !important; z-index: 50 !important; padding: 2px 8px !important; border-radius: 4px !important; color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.08) !important; }
</style>
<div style="position:relative;width:1280px;height:720px;background:#ffffff;overflow:hidden">
  <div style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;background:radial-gradient(ellipse 70% 60% at 20% 40%, rgba(5,150,105,0.15) 0%, transparent 55%),radial-gradient(ellipse 60% 50% at 80% 60%, rgba(5,150,105,0.08) 0%, transparent 50%),radial-gradient(ellipse 90% 80% at 50% 50%, rgba(5,150,105,0.04) 0%, transparent 65%)"></div>
  <div style="position:absolute;left:53px;top:53px;width:1174px;font-size:40px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:#059669;line-height:1.2">Revenue Bridge Q3 to Q4</div>
  <div style="position:absolute;left:53px;top:109px;width:50px;height:3px;background:#059669;border-radius:2px;transform:rotate(-2deg)"></div>
  <div style="position:absolute;left:155px;top:633px;width:88px;text-align:center;font-size:10px;color:#059669;opacity:0.7;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Starting Revenue</div><div style="position:absolute;left:331px;top:633px;width:88px;text-align:center;font-size:10px;color:#059669;opacity:0.7;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">New Business</div><div style="position:absolute;left:507px;top:633px;width:88px;text-align:center;font-size:10px;color:#059669;opacity:0.7;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Expansion</div><div style="position:absolute;left:683px;top:633px;width:88px;text-align:center;font-size:10px;color:#059669;opacity:0.7;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Contraction</div><div style="position:absolute;left:859px;top:633px;width:88px;text-align:center;font-size:10px;color:#059669;opacity:0.7;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Churn</div><div style="position:absolute;left:1035px;top:633px;width:88px;text-align:center;font-size:10px;color:#059669;opacity:0.7;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Ending Revenue</div>
  <svg style="position:absolute;left:0;top:0" width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
    <rect x="159" y="249" width="80" height="165" rx="4" fill="#22c55e" opacity="0.85" /><text x="199" y="243" text-anchor="middle" fill="#1e293b" font-size="11" font-weight="bold">+12</text><rect x="335" y="191" width="80" height="58" rx="4" fill="#22c55e" opacity="0.85" /><text x="375" y="185" text-anchor="middle" fill="#1e293b" font-size="11" font-weight="bold">+4.2</text><rect x="511" y="152" width="80" height="39" rx="4" fill="#22c55e" opacity="0.85" /><text x="551" y="146" text-anchor="middle" fill="#1e293b" font-size="11" font-weight="bold">+2.8</text><rect x="687" y="153" width="80" height="15" rx="4" fill="#ef4444" opacity="0.85" /><text x="727" y="147" text-anchor="middle" fill="#1e293b" font-size="11" font-weight="bold">-1.1</text><rect x="863" y="168" width="80" height="33" rx="4" fill="#ef4444" opacity="0.85" /><text x="903" y="162" text-anchor="middle" fill="#1e293b" font-size="11" font-weight="bold">-2.4</text><rect x="1039" y="-12" width="80" height="213" rx="4" fill="#22c55e" opacity="0.85" /><text x="1079" y="-18" text-anchor="middle" fill="#1e293b" font-size="11" font-weight="bold">+15.5</text><line x1="63" y1="414" x2="1217" y2="414" stroke="rgba(226,232,240,0.3)" stroke-width="1" />
    <line x1="239" y1="249" x2="335" y2="249" stroke="rgba(226,232,240,0.4)" stroke-width="1" stroke-dasharray="4,3" /><line x1="415" y1="191" x2="511" y2="191" stroke="rgba(226,232,240,0.4)" stroke-width="1" stroke-dasharray="4,3" /><line x1="591" y1="152" x2="687" y2="152" stroke="rgba(226,232,240,0.4)" stroke-width="1" stroke-dasharray="4,3" /><line x1="767" y1="168" x2="863" y2="168" stroke="rgba(226,232,240,0.4)" stroke-width="1" stroke-dasharray="4,3" /><line x1="943" y1="201" x2="1039" y2="201" stroke="rgba(226,232,240,0.4)" stroke-width="1" stroke-dasharray="4,3" />
  </svg>
</div>

---

<!-- _backgroundColor: #ffffff -->
<!-- _color: #1e293b -->

<div style="position:absolute;left:0;top:0;width:1280px;height:720px;background:radial-gradient(70% 60% at 70% 65%,rgba(245,158,11,0.05) 0%,transparent 70%);pointer-events:none;z-index:0"></div><svg style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;z-index:0" viewBox="0 0 1280 720"><path d="M128,576 Q512,144 1152,432" stroke="rgba(245,158,11,0.06)" stroke-width="2" fill="none"/></svg>
<style scoped>
section { padding: 0 !important; display: block !important; overflow: visible !important; position: relative !important; }
section > * { flex-shrink: unset; }
section::after { position: absolute !important; bottom: 14px !important; right: 20px !important; font-size: 12px !important; z-index: 50 !important; padding: 2px 8px !important; border-radius: 4px !important; color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.08) !important; }
</style>
<div style="position:relative;width:1280px;height:720px;background:#ffffff;overflow:hidden">
  <div style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;background:radial-gradient(ellipse 70% 60% at 20% 50%, rgba(217,119,6,0.15) 0%, transparent 55%),radial-gradient(ellipse 60% 50% at 80% 50%, rgba(217,119,6,0.08) 0%, transparent 50%),radial-gradient(ellipse 90% 80% at 50% 50%, rgba(217,119,6,0.04) 0%, transparent 65%)"></div>
  <div style="position:absolute;left:53px;top:53px;width:1174px;font-size:34px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:#d97706;line-height:1.2">Customer Acquisition Funnel</div>
  <div style="position:absolute;left:53px;top:109px;width:60px;height:4px;background:#d97706;border-radius:6px"></div>
  <div style="position:absolute;left:858px;top:177px;width:369px"><div style="font-size:14px;font-weight:bold;color:#d97706">Website Visitors</div><div style="font-size:12px;color:#d97706;opacity:0.7">100,000 (100%)</div></div><div style="position:absolute;left:848px;top:240px;font-size:10px;color:#d97706;opacity:0.5">↓ 12%</div><div style="position:absolute;left:805px;top:280px;width:422px"><div style="font-size:14px;font-weight:bold;color:#d97706">Sign-ups</div><div style="font-size:12px;color:#d97706;opacity:0.7">12,000 (12%)</div></div><div style="position:absolute;left:753px;top:383px;width:474px"><div style="font-size:14px;font-weight:bold;color:#d97706">Activated Users</div><div style="font-size:12px;color:#d97706;opacity:0.7">4,800</div></div><div style="position:absolute;left:700px;top:486px;width:527px"><div style="font-size:14px;font-weight:bold;color:#d97706">Paying Customers</div><div style="font-size:12px;color:#d97706;opacity:0.7">960</div></div><div style="position:absolute;left:647px;top:589px;width:580px"><div style="font-size:14px;font-weight:bold;color:#d97706">Enterprise Deals</div><div style="font-size:12px;color:#d97706;opacity:0.7">48</div></div>
  <svg style="position:absolute;left:0;top:0" width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
    <polygon points="134,143 838,143 785,246 187,246" fill="rgba(217,119,6,0.7)" stroke="rgba(100,116,139,0.9)" stroke-width="1" /><text x="486" y="198.5" text-anchor="middle" fill="#fff" font-size="13" font-weight="bold">Website Visitor</text><polygon points="187,246 785,246 733,349 239,349" fill="rgba(217,119,6,0.7)" stroke="rgba(34,197,94,0.9)" stroke-width="1" /><text x="486" y="301.5" text-anchor="middle" fill="#fff" font-size="13" font-weight="bold">Sign-ups</text><polygon points="239,349 733,349 680,452 292,452" fill="rgba(217,119,6,0.7)" stroke="rgba(245,158,11,0.9)" stroke-width="1" /><text x="486" y="404.5" text-anchor="middle" fill="#fff" font-size="13" font-weight="bold">Activated Users</text><polygon points="292,452 680,452 627,555 345,555" fill="rgba(217,119,6,0.7)" stroke="rgba(239,68,68,0.9)" stroke-width="1" /><text x="486" y="507.5" text-anchor="middle" fill="#fff" font-size="13" font-weight="bold">Paying Customer</text><polygon points="345,555 627,555 574,658 398,658" fill="rgba(217,119,6,0.7)" stroke="rgba(59,130,246,0.9)" stroke-width="1" /><text x="486" y="610.5" text-anchor="middle" fill="#fff" font-size="13" font-weight="bold">Enterprise Deal</text>
  </svg>
</div>

---

<!-- _backgroundColor: #ffffff -->
<!-- _color: #1e293b -->

<svg style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;z-index:0" viewBox="0 0 1280 720"><defs><pattern id="mood-dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1" fill="rgba(0,0,0,0.05)"/></pattern></defs><rect width="1280" height="720" fill="url(#mood-dots)"/><path d="M53,53 L73,53 M53,53 L53,73" stroke="rgba(162,28,175,0.08)" stroke-width="2" fill="none"/><path d="M1227,667 L1207,667 M1227,667 L1227,647" stroke="rgba(162,28,175,0.08)" stroke-width="2" fill="none"/></svg>
<style scoped>
section { padding: 0 !important; display: block !important; overflow: visible !important; position: relative !important; }
section > * { flex-shrink: unset; }
section::after { position: absolute !important; bottom: 14px !important; right: 20px !important; font-size: 12px !important; z-index: 50 !important; padding: 2px 8px !important; border-radius: 4px !important; color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.08) !important; }
</style>
<div style="position:relative;width:1280px;height:720px;background:#ffffff;overflow:hidden">
  <div style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;background:radial-gradient(ellipse 70% 60% at 20% 50%, rgba(162,28,175,0.15) 0%, transparent 55%),radial-gradient(ellipse 60% 50% at 80% 50%, rgba(162,28,175,0.08) 0%, transparent 50%),radial-gradient(ellipse 90% 80% at 50% 50%, rgba(162,28,175,0.04) 0%, transparent 65%)"></div>
  <div style="position:absolute;left:53px;top:53px;width:1174px;font-size:40px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:#a21caf;line-height:1.2">Feature Comparison</div>
  <div style="position:absolute;left:53px;top:109px;width:50px;height:3px;border-radius:2px;background:repeating-linear-gradient(to right,#3b82f6 0px,#3b82f6 8px,transparent 8px,transparent 14px)"></div>
  <div style="position:absolute;left:63px;top:143px;width:346px;height:50px;background:rgba(248,250,252,0.3);border-bottom:2px solid #e2e8f0;display:flex;align-items:center;padding-left:12px;font-size:12px;font-weight:bold;color:#a21caf;opacity:0.6">Feature</div><div style="position:absolute;left:409px;top:143px;width:269px;height:50px;background:rgba(59,130,246,0.12);border-bottom:2px solid #e2e8f0;text-align:center;line-height:50px;font-size:13px;font-weight:bold;color:#a21caf">Us</div><div style="position:absolute;left:678px;top:143px;width:269px;height:50px;background:rgba(248,250,252,0.3);border-bottom:2px solid #e2e8f0;text-align:center;line-height:50px;font-size:13px;font-weight:bold;color:#a21caf">Comp A</div><div style="position:absolute;left:947px;top:143px;width:269px;height:50px;background:rgba(248,250,252,0.3);border-bottom:2px solid #e2e8f0;text-align:center;line-height:50px;font-size:13px;font-weight:bold;color:#a21caf">Comp B</div><div style="position:absolute;left:63px;top:193px;width:346px;height:50px;background:transparent;border-bottom:1px solid rgba(226,232,240,0.2);line-height:50px;padding-left:12px;font-size:13px;color:#a21caf">Feature 1</div><div style="position:absolute;left:409px;top:193px;width:269px;height:50px;background:rgba(59,130,246,0.06);border-bottom:1px solid rgba(226,232,240,0.2);text-align:center;line-height:50px;font-size:18px;font-weight:bold;color:#a21caf">✓</div><div style="position:absolute;left:678px;top:193px;width:269px;height:50px;background:transparent;border-bottom:1px solid rgba(226,232,240,0.2);text-align:center;line-height:50px;font-size:18px;font-weight:bold;color:#a21caf">✗</div><div style="position:absolute;left:947px;top:193px;width:269px;height:50px;background:transparent;border-bottom:1px solid rgba(226,232,240,0.2);text-align:center;line-height:50px;font-size:18px;font-weight:bold;color:#a21caf">✓</div><div style="position:absolute;left:63px;top:243px;width:346px;height:50px;background:rgba(248,250,252,0.15);border-bottom:1px solid rgba(226,232,240,0.2);line-height:50px;padding-left:12px;font-size:13px;color:#a21caf">Feature 2</div><div style="position:absolute;left:409px;top:243px;width:269px;height:50px;background:rgba(59,130,246,0.06);border-bottom:1px solid rgba(226,232,240,0.2);text-align:center;line-height:50px;font-size:18px;font-weight:bold;color:#a21caf">✓</div><div style="position:absolute;left:678px;top:243px;width:269px;height:50px;background:rgba(248,250,252,0.15);border-bottom:1px solid rgba(226,232,240,0.2);text-align:center;line-height:50px;font-size:18px;font-weight:bold;color:#a21caf">✓</div><div style="position:absolute;left:947px;top:243px;width:269px;height:50px;background:rgba(248,250,252,0.15);border-bottom:1px solid rgba(226,232,240,0.2);text-align:center;line-height:50px;font-size:18px;font-weight:bold;color:#a21caf">✗</div>
</div>

---

<!-- _backgroundColor: #ffffff -->
<!-- _color: #1e293b -->

<div style="position:absolute;left:0;top:0;width:1280px;height:720px;background:linear-gradient(to right,rgba(59,130,246,0.05) 0%,transparent 50%);pointer-events:none;z-index:0"></div><svg style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;z-index:0" viewBox="0 0 1280 720"><line x1="128" y1="360" x2="1088" y2="360" stroke="rgba(59,130,246,0.07)" stroke-width="1.5"/><polyline points="1049.6,324 1126.4,360 1049.6,396.00000000000006" stroke="rgba(59,130,246,0.07)" stroke-width="1.5" fill="none"/></svg>
<style scoped>
section { padding: 0 !important; display: block !important; overflow: visible !important; position: relative !important; }
section > * { flex-shrink: unset; }
section::after { position: absolute !important; bottom: 14px !important; right: 20px !important; font-size: 12px !important; z-index: 50 !important; padding: 2px 8px !important; border-radius: 4px !important; color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.08) !important; }
</style>
<div style="position:relative;width:1280px;height:720px;background:#ffffff;overflow:hidden">
  <div style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;background:radial-gradient(ellipse 70% 60% at 20% 45%, rgba(13,148,136,0.15) 0%, transparent 55%),radial-gradient(ellipse 60% 50% at 80% 55%, rgba(13,148,136,0.08) 0%, transparent 50%),radial-gradient(ellipse 90% 80% at 50% 50%, rgba(13,148,136,0.04) 0%, transparent 65%)"></div>
  <div style="position:absolute;left:53px;top:53px;width:1174px;font-size:40px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:#0d9488;line-height:1.2">Product Roadmap 2026</div>
  <div style="position:absolute;left:53px;top:109px;width:50px;height:3px;background:#0d9488;clip-path:polygon(0 0,92% 0,100% 50%,92% 100%,0 100%);border-radius:2px"></div>
  <div style="position:absolute;left:53px;top:143px;width:381px;height:524px;background:rgba(248,250,252,0.3);border:1px solid rgba(226,232,240,0.2);border-radius:12px;border-top:3px solid #0d9488"></div><div style="position:absolute;left:53px;top:153px;width:381px;text-align:center;font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#0d9488">Now</div><div style="position:absolute;left:63px;top:185px;width:361px;height:60px;background:#f8fafc;border:1px solid rgba(226,232,240,0.15);border-radius:8px;border-left:3px solid rgba(13,148,136,0.6);box-shadow:0 1px 3px rgba(0,0,0,0.08)"></div><div style="position:absolute;left:73px;top:208px;width:341px;font-size:12px;line-height:1.4;color:#0d9488;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">Core platform stability, API v2 launch, Enterprise SSO, SOC 2 certification</div><div style="position:absolute;left:450px;top:143px;width:381px;height:524px;background:rgba(248,250,252,0.3);border:1px solid rgba(226,232,240,0.2);border-radius:12px;border-top:3px solid #0d9488"></div><div style="position:absolute;left:450px;top:153px;width:381px;text-align:center;font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#0d9488">Next</div><div style="position:absolute;left:460px;top:185px;width:361px;height:60px;background:#f8fafc;border:1px solid rgba(226,232,240,0.15);border-radius:8px;border-left:3px solid rgba(13,148,136,0.6);box-shadow:0 1px 3px rgba(0,0,0,0.08)"></div><div style="position:absolute;left:470px;top:208px;width:341px;font-size:12px;line-height:1.4;color:#0d9488;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">AI copilot beta, International expansion, Partner marketplace, Custom branding</div><div style="position:absolute;left:847px;top:143px;width:381px;height:524px;background:rgba(248,250,252,0.3);border:1px solid rgba(226,232,240,0.2);border-radius:12px;border-top:3px solid #0d9488"></div><div style="position:absolute;left:847px;top:153px;width:381px;text-align:center;font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#0d9488">Later</div><div style="position:absolute;left:857px;top:185px;width:361px;height:60px;background:#f8fafc;border:1px solid rgba(226,232,240,0.15);border-radius:8px;border-left:3px solid rgba(13,148,136,0.6);box-shadow:0 1px 3px rgba(0,0,0,0.08)"></div><div style="position:absolute;left:867px;top:208px;width:341px;font-size:12px;line-height:1.4;color:#0d9488;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">Autonomous generation, Industry-specific templates, White-label offering, Mobile app</div>
  <svg style="position:absolute;left:0;top:0" width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
    <line x1="436" y1="405" x2="448" y2="405" stroke="rgba(226,232,240,0.4)" stroke-width="2" /><polygon points="445,401 451,405 445,409" fill="rgba(226,232,240,0.4)" /><line x1="833" y1="405" x2="845" y2="405" stroke="rgba(226,232,240,0.4)" stroke-width="2" /><polygon points="842,401 848,405 842,409" fill="rgba(226,232,240,0.4)" />
  </svg>
</div>

---

<!-- _backgroundColor: #ffffff -->
<!-- _color: #1e293b -->

<style scoped>
section { padding: 0 !important; display: block !important; overflow: visible !important; position: relative !important; }
section > * { flex-shrink: unset; }
section::after { position: absolute !important; bottom: 14px !important; right: 20px !important; font-size: 12px !important; z-index: 50 !important; padding: 2px 8px !important; border-radius: 4px !important; color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.08) !important; }
</style>
<div style="position:relative;width:1280px;height:720px;background:#ffffff;overflow:hidden">
  <div style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;background:radial-gradient(ellipse 70% 60% at 20% 50%, rgba(30,41,59,0.15) 0%, transparent 55%),radial-gradient(ellipse 60% 50% at 80% 50%, rgba(30,41,59,0.08) 0%, transparent 50%),radial-gradient(ellipse 90% 80% at 50% 50%, rgba(30,41,59,0.04) 0%, transparent 65%)"></div>
  <div style="position:absolute;left:53px;top:53px;width:1174px;text-align:center;font-size:34px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:#1e293b;line-height:1.2">Simple, Transparent Pricing</div>
  <div style="position:absolute;left:610px;top:109px;width:60px;height:3px;background:#3b82f6;border-radius:2px"></div>
  <div style="position:absolute;left:53px;top:143px;width:381px;height:524px;background:#f8fafc;border:1px solid rgba(226,232,240,0.2);border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden"></div><div style="position:absolute;left:53px;top:159px;width:381px;text-align:center;font-size:16px;font-weight:bold;color:#22c55e">Starter</div><div style="position:absolute;left:53px;top:189px;width:381px;text-align:center;font-size:28px;font-weight:bold;color:#1e293b">$0/mo</div><div style="position:absolute;left:73px;top:231px;width:341px;height:1px;background:rgba(226,232,240,0.2)"></div><div style="position:absolute;left:69px;top:245px;width:349px;font-size:12px;line-height:1.4;color:#1e293b;opacity:0.8"><span style="color:#22c55e;margin-right:6px">✓</span>5 presentations/month</div><div style="position:absolute;left:69px;top:269px;width:349px;font-size:12px;line-height:1.4;color:#1e293b;opacity:0.8"><span style="color:#22c55e;margin-right:6px">✓</span>Basic themes</div><div style="position:absolute;left:69px;top:293px;width:349px;font-size:12px;line-height:1.4;color:#1e293b;opacity:0.8"><span style="color:#22c55e;margin-right:6px">✓</span>PDF export</div><div style="position:absolute;left:450px;top:135px;width:381px;height:532px;background:#f8fafc;border:2px solid #3b82f6;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,0.1),0 4px 12px rgba(0,0,0,0.06);overflow:hidden"></div><div style="position:absolute;left:450px;top:135px;width:381px;height:28px;background:#3b82f6;border-radius:16px 16px 0 0;text-align:center;line-height:28px;font-size:11px;font-weight:bold;color:#fff;letter-spacing:1px">RECOMMENDED</div><div style="position:absolute;left:450px;top:171px;width:381px;text-align:center;font-size:16px;font-weight:bold;color:#f59e0b">Pro</div><div style="position:absolute;left:450px;top:201px;width:381px;text-align:center;font-size:28px;font-weight:bold;color:#1e293b">$29/mo</div><div style="position:absolute;left:470px;top:243px;width:341px;height:1px;background:rgba(226,232,240,0.2)"></div><div style="position:absolute;left:466px;top:257px;width:349px;font-size:12px;line-height:1.4;color:#1e293b;opacity:0.8"><span style="color:#22c55e;margin-right:6px">✓</span>Unlimited presentations</div><div style="position:absolute;left:466px;top:281px;width:349px;font-size:12px;line-height:1.4;color:#1e293b;opacity:0.8"><span style="color:#22c55e;margin-right:6px">✓</span>All 16 premium themes</div><div style="position:absolute;left:466px;top:305px;width:349px;font-size:12px;line-height:1.4;color:#1e293b;opacity:0.8"><span style="color:#22c55e;margin-right:6px">✓</span>PDF + PPTX export</div><div style="position:absolute;left:466px;top:329px;width:349px;font-size:12px;line-height:1.4;color:#1e293b;opacity:0.8"><span style="color:#22c55e;margin-right:6px">✓</span>AI image generation</div><div style="position:absolute;left:847px;top:143px;width:381px;height:524px;background:#f8fafc;border:1px solid rgba(226,232,240,0.2);border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden"></div><div style="position:absolute;left:847px;top:159px;width:381px;text-align:center;font-size:16px;font-weight:bold;color:#ef4444">Enterprise</div><div style="position:absolute;left:847px;top:189px;width:381px;text-align:center;font-size:28px;font-weight:bold;color:#1e293b">Custom</div><div style="position:absolute;left:867px;top:231px;width:341px;height:1px;background:rgba(226,232,240,0.2)"></div><div style="position:absolute;left:863px;top:245px;width:349px;font-size:12px;line-height:1.4;color:#1e293b;opacity:0.8"><span style="color:#22c55e;margin-right:6px">✓</span>Everything in Pro</div><div style="position:absolute;left:863px;top:269px;width:349px;font-size:12px;line-height:1.4;color:#1e293b;opacity:0.8"><span style="color:#22c55e;margin-right:6px">✓</span>Custom branding</div><div style="position:absolute;left:863px;top:293px;width:349px;font-size:12px;line-height:1.4;color:#1e293b;opacity:0.8"><span style="color:#22c55e;margin-right:6px">✓</span>SSO &amp; SAML</div><div style="position:absolute;left:863px;top:317px;width:349px;font-size:12px;line-height:1.4;color:#1e293b;opacity:0.8"><span style="color:#22c55e;margin-right:6px">✓</span>Dedicated support</div>
</div>

---

<!-- _backgroundColor: #ffffff -->
<!-- _color: #1e293b -->

<div style="position:absolute;left:0;top:0;width:1280px;height:720px;background:linear-gradient(to top right,rgba(34,197,94,0.06) 0%,transparent 60%);pointer-events:none;z-index:0"></div><svg style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;z-index:0" viewBox="0 0 1280 720"><line x1="128" y1="648" x2="384" y2="288" stroke="rgba(5,150,105,0.04)" stroke-width="2"/><line x1="448" y1="612" x2="704" y2="251.99999999999997" stroke="rgba(34,197,94,0.05)" stroke-width="1.5"/><line x1="768" y1="576" x2="1024" y2="216" stroke="rgba(34,197,94,0.06)" stroke-width="1"/></svg>
<style scoped>
section { padding: 0 !important; display: block !important; overflow: visible !important; position: relative !important; }
section > * { flex-shrink: unset; }
section::after { position: absolute !important; bottom: 14px !important; right: 20px !important; font-size: 12px !important; z-index: 50 !important; padding: 2px 8px !important; border-radius: 4px !important; color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.08) !important; }
</style>
<div style="position:relative;width:1280px;height:720px;background:#ffffff;overflow:hidden">
  <div style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;background:radial-gradient(ellipse 70% 60% at 20% 50%, rgba(5,150,105,0.15) 0%, transparent 55%),radial-gradient(ellipse 60% 50% at 80% 50%, rgba(5,150,105,0.08) 0%, transparent 50%),radial-gradient(ellipse 90% 80% at 50% 50%, rgba(5,150,105,0.04) 0%, transparent 65%)"></div>
  <div style="position:absolute;left:53px;top:53px;width:1174px;text-align:center;font-size:40px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:#059669;line-height:1.2">Unit Economics That Scale</div>
  <div style="position:absolute;left:610px;top:109px;width:60px;height:3px;background:#059669;border-radius:2px;transform:rotate(-2deg)"></div>
  <div style="position:absolute;left:530px;top:264px;width:220px;height:220px;border-radius:50%;background:rgba(5,150,105,0.08);border:3px solid rgba(5,150,105,0.3)"></div><div style="position:absolute;left:530px;top:344px;width:220px;text-align:center;font-size:48px;font-weight:bold;color:#059669">4.2x</div><div style="position:absolute;left:530px;top:400px;width:220px;text-align:center;font-size:14px;font-weight:bold;color:#059669;opacity:0.6;text-transform:uppercase;letter-spacing:1px">LTV:CAC</div>
  <div style="position:absolute;left:565px;top:114px;width:150px;height:60px;background:#f8fafc;border:1px solid rgba(226,232,240,0.2);border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.08);text-align:center;overflow:hidden"></div><div style="position:absolute;left:565px;top:122px;width:150px;text-align:center;font-size:18px;font-weight:bold;color:#059669">$340</div><div style="position:absolute;left:565px;top:146px;width:150px;text-align:center;font-size:10px;color:#059669;opacity:0.6;text-transform:uppercase;letter-spacing:0.5px">CAC</div><div style="position:absolute;left:784px;top:273px;width:150px;height:60px;background:#f8fafc;border:1px solid rgba(226,232,240,0.2);border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.08);text-align:center;overflow:hidden"></div><div style="position:absolute;left:784px;top:281px;width:150px;text-align:center;font-size:18px;font-weight:bold;color:#059669">$1,428</div><div style="position:absolute;left:784px;top:305px;width:150px;text-align:center;font-size:10px;color:#059669;opacity:0.6;text-transform:uppercase;letter-spacing:0.5px">LTV</div><div style="position:absolute;left:700px;top:530px;width:150px;height:60px;background:#f8fafc;border:1px solid rgba(226,232,240,0.2);border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.08);text-align:center;overflow:hidden"></div><div style="position:absolute;left:700px;top:538px;width:150px;text-align:center;font-size:18px;font-weight:bold;color:#059669">4.2 months</div><div style="position:absolute;left:700px;top:562px;width:150px;text-align:center;font-size:10px;color:#059669;opacity:0.6;text-transform:uppercase;letter-spacing:0.5px">Payback</div><div style="position:absolute;left:430px;top:530px;width:150px;height:60px;background:#f8fafc;border:1px solid rgba(226,232,240,0.2);border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.08);text-align:center;overflow:hidden"></div><div style="position:absolute;left:430px;top:538px;width:150px;text-align:center;font-size:18px;font-weight:bold;color:#059669">82%</div><div style="position:absolute;left:430px;top:562px;width:150px;text-align:center;font-size:10px;color:#059669;opacity:0.6;text-transform:uppercase;letter-spacing:0.5px">Gross Margin</div><div style="position:absolute;left:346px;top:273px;width:150px;height:60px;background:#f8fafc;border:1px solid rgba(226,232,240,0.2);border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.08);text-align:center;overflow:hidden"></div><div style="position:absolute;left:346px;top:281px;width:150px;text-align:center;font-size:18px;font-weight:bold;color:#059669">124%</div><div style="position:absolute;left:346px;top:305px;width:150px;text-align:center;font-size:10px;color:#059669;opacity:0.6;text-transform:uppercase;letter-spacing:0.5px">Net Revenue Retention</div>
  <svg style="position:absolute;left:0;top:0" width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
    <line x1="640" y1="254" x2="640" y2="144" stroke="rgba(226,232,240,0.2)" stroke-width="1" stroke-dasharray="4,4" /><line x1="754" y1="337" x2="859" y2="303" stroke="rgba(226,232,240,0.2)" stroke-width="1" stroke-dasharray="4,4" /><line x1="711" y1="471" x2="775" y2="560" stroke="rgba(226,232,240,0.2)" stroke-width="1" stroke-dasharray="4,4" /><line x1="569" y1="471" x2="505" y2="560" stroke="rgba(226,232,240,0.2)" stroke-width="1" stroke-dasharray="4,4" /><line x1="526" y1="337" x2="421" y2="303" stroke="rgba(226,232,240,0.2)" stroke-width="1" stroke-dasharray="4,4" />
  </svg>
</div>

---

<!-- _backgroundColor: #ffffff -->
<!-- _color: #1e293b -->

<div style="position:absolute;left:0;top:0;width:1280px;height:720px;background:linear-gradient(to top right,rgba(34,197,94,0.06) 0%,transparent 60%);pointer-events:none;z-index:0"></div><svg style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;z-index:0" viewBox="0 0 1280 720"><line x1="128" y1="648" x2="384" y2="288" stroke="rgba(5,150,105,0.04)" stroke-width="2"/><line x1="448" y1="612" x2="704" y2="251.99999999999997" stroke="rgba(34,197,94,0.05)" stroke-width="1.5"/><line x1="768" y1="576" x2="1024" y2="216" stroke="rgba(34,197,94,0.06)" stroke-width="1"/></svg>
<style scoped>
section { padding: 0 !important; display: block !important; overflow: visible !important; position: relative !important; }
section > * { flex-shrink: unset; }
section::after { position: absolute !important; bottom: 14px !important; right: 20px !important; font-size: 12px !important; z-index: 50 !important; padding: 2px 8px !important; border-radius: 4px !important; color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.08) !important; }
</style>
<div style="position:relative;width:1280px;height:720px;background:#ffffff;overflow:hidden">
  <div style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;background:radial-gradient(ellipse 70% 60% at 20% 50%, rgba(5,150,105,0.15) 0%, transparent 55%),radial-gradient(ellipse 60% 50% at 80% 50%, rgba(5,150,105,0.08) 0%, transparent 50%),radial-gradient(ellipse 90% 80% at 50% 50%, rgba(5,150,105,0.04) 0%, transparent 65%)"></div>
  <div style="position:absolute;left:53px;top:53px;width:1174px;font-size:34px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:#059669;line-height:1.2">Strategic Position Analysis</div>
  <div style="position:absolute;left:53px;top:101px;width:50px;height:3px;background:#059669;border-radius:2px;transform:rotate(-2deg)"></div>
  <div style="position:absolute;left:63px;top:133px;width:571px;height:261px;background:rgba(34,197,94,0.06);border:1px solid rgba(5,150,105,0.15);border-radius:12px;overflow:hidden"></div><div style="position:absolute;left:63px;top:133px;width:571px;height:3px;background:#059669;border-radius:12px 12px 0 0"></div><div style="position:absolute;left:77px;top:143px;font-size:13px;font-weight:bold;color:#059669;text-transform:uppercase;letter-spacing:1px">Strengths</div><div style="position:absolute;left:77px;top:167px;width:543px;font-size:12px;line-height:1.4;color:#059669;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical"><span style="color:#22c55e;margin-right:4px">•</span>Strong AI capabilities, 16 premium themes, Fast generation speed, First-mover advantage</div><div style="position:absolute;left:646px;top:133px;width:571px;height:261px;background:rgba(245,158,11,0.06);border:1px solid rgba(5,150,105,0.15);border-radius:12px;overflow:hidden"></div><div style="position:absolute;left:646px;top:133px;width:571px;height:3px;background:#059669;border-radius:12px 12px 0 0"></div><div style="position:absolute;left:660px;top:143px;font-size:13px;font-weight:bold;color:#059669;text-transform:uppercase;letter-spacing:1px">Weaknesses</div><div style="position:absolute;left:660px;top:167px;width:543px;font-size:12px;line-height:1.4;color:#059669;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical"><span style="color:#f59e0b;margin-right:4px">•</span>Limited offline support, No mobile app, Small engineering team</div><div style="position:absolute;left:63px;top:406px;width:571px;height:261px;background:rgba(30,41,59,0.06);border:1px solid rgba(5,150,105,0.15);border-radius:12px;overflow:hidden"></div><div style="position:absolute;left:63px;top:406px;width:571px;height:3px;background:#059669;border-radius:12px 12px 0 0"></div><div style="position:absolute;left:77px;top:416px;font-size:13px;font-weight:bold;color:#059669;text-transform:uppercase;letter-spacing:1px">Opportunities</div><div style="position:absolute;left:77px;top:440px;width:543px;font-size:12px;line-height:1.4;color:#059669;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical"><span style="color:#1e293b;margin-right:4px">•</span>Enterprise market expansion, API partnerships, International growth, Education vertical</div><div style="position:absolute;left:646px;top:406px;width:571px;height:261px;background:rgba(239,68,68,0.06);border:1px solid rgba(5,150,105,0.15);border-radius:12px;overflow:hidden"></div><div style="position:absolute;left:646px;top:406px;width:571px;height:3px;background:#059669;border-radius:12px 12px 0 0"></div><div style="position:absolute;left:660px;top:416px;font-size:13px;font-weight:bold;color:#059669;text-transform:uppercase;letter-spacing:1px">Threats</div><div style="position:absolute;left:660px;top:440px;width:543px;font-size:12px;line-height:1.4;color:#059669;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical"><span style="color:#ef4444;margin-right:4px">•</span>Big tech competition, AI commoditization, Economic slowdown, Open-source alternatives</div>
</div>

---

<!-- _backgroundColor: #ffffff -->
<!-- _color: #1e293b -->

<div style="position:absolute;left:0;top:0;width:1280px;height:720px;background:linear-gradient(to top right,rgba(34,197,94,0.06) 0%,transparent 60%);pointer-events:none;z-index:0"></div><svg style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;z-index:0" viewBox="0 0 1280 720"><line x1="128" y1="648" x2="384" y2="288" stroke="rgba(5,150,105,0.04)" stroke-width="2"/><line x1="448" y1="612" x2="704" y2="251.99999999999997" stroke="rgba(34,197,94,0.05)" stroke-width="1.5"/><line x1="768" y1="576" x2="1024" y2="216" stroke="rgba(34,197,94,0.06)" stroke-width="1"/></svg>
<style scoped>
section { padding: 0 !important; display: block !important; overflow: visible !important; position: relative !important; }
section > * { flex-shrink: unset; }
section::after { position: absolute !important; bottom: 14px !important; right: 20px !important; font-size: 12px !important; z-index: 50 !important; padding: 2px 8px !important; border-radius: 4px !important; color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.08) !important; }
</style>
<div style="position:relative;width:1280px;height:720px;background:#ffffff;overflow:hidden">
  <div style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;background:radial-gradient(ellipse 70% 60% at 20% 50%, rgba(5,150,105,0.15) 0%, transparent 55%),radial-gradient(ellipse 60% 50% at 80% 50%, rgba(5,150,105,0.08) 0%, transparent 50%),radial-gradient(ellipse 90% 80% at 50% 50%, rgba(5,150,105,0.04) 0%, transparent 65%)"></div>
  <div style="position:absolute;left:53px;top:53px;width:1174px;text-align:center;font-size:40px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:#059669;line-height:1.2">Our Unfair Advantage</div>
  <div style="position:absolute;left:610px;top:109px;width:60px;height:3px;background:#059669;border-radius:2px;transform:rotate(-2deg)"></div>
  <div style="position:absolute;left:53px;top:143px;width:378px;height:524px;background:#f8fafc;border:1px solid rgba(226,232,240,0.15);border-radius:16px;box-shadow:0 4px 16px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.04);overflow:hidden"></div><div style="position:absolute;left:53px;top:143px;width:378px;height:4px;background:#059669;border-radius:16px 16px 0 0"></div><div style="position:absolute;left:53px;top:157px;width:378px;text-align:center;font-size:48px;font-weight:900;color:rgba(100,116,139,0.12);line-height:1">01</div><div style="position:absolute;left:69px;top:213px;width:346px;text-align:center;font-size:16px;font-weight:bold;color:#059669;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">Speed</div><div style="position:absolute;left:69px;top:257px;width:346px;text-align:center;font-size:13px;line-height:1.5;color:#059669;opacity:0.75;overflow:hidden;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical">Generate complete decks in under 60 seconds with AI-powered content and design automation</div><div style="position:absolute;left:451px;top:143px;width:378px;height:524px;background:#f8fafc;border:1px solid rgba(226,232,240,0.15);border-radius:16px;box-shadow:0 4px 16px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.04);overflow:hidden"></div><div style="position:absolute;left:451px;top:143px;width:378px;height:4px;background:#059669;border-radius:16px 16px 0 0"></div><div style="position:absolute;left:451px;top:157px;width:378px;text-align:center;font-size:48px;font-weight:900;color:rgba(34,197,94,0.12);line-height:1">02</div><div style="position:absolute;left:467px;top:213px;width:346px;text-align:center;font-size:16px;font-weight:bold;color:#059669;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">Quality</div><div style="position:absolute;left:467px;top:257px;width:346px;text-align:center;font-size:13px;line-height:1.5;color:#059669;opacity:0.75;overflow:hidden;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical">Figma-grade templates with 16 premium themes rivaling professional design agencies</div><div style="position:absolute;left:849px;top:143px;width:378px;height:524px;background:#f8fafc;border:1px solid rgba(226,232,240,0.15);border-radius:16px;box-shadow:0 4px 16px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.04);overflow:hidden"></div><div style="position:absolute;left:849px;top:143px;width:378px;height:4px;background:#059669;border-radius:16px 16px 0 0"></div><div style="position:absolute;left:849px;top:157px;width:378px;text-align:center;font-size:48px;font-weight:900;color:rgba(245,158,11,0.12);line-height:1">03</div><div style="position:absolute;left:865px;top:213px;width:346px;text-align:center;font-size:16px;font-weight:bold;color:#059669;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">Intelligence</div><div style="position:absolute;left:865px;top:257px;width:346px;text-align:center;font-size:13px;line-height:1.5;color:#059669;opacity:0.75;overflow:hidden;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical">Context-aware AI adapts content density, tone, and visuals to your audience</div>
</div>

---

<!-- _backgroundColor: #ffffff -->
<!-- _color: #1e293b -->

<style scoped>
section { padding: 0 !important; display: block !important; overflow: visible !important; position: relative !important; }
section > * { flex-shrink: unset; }
section::after { position: absolute !important; bottom: 14px !important; right: 20px !important; font-size: 12px !important; z-index: 50 !important; padding: 2px 8px !important; border-radius: 4px !important; color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.08) !important; }
</style>
<div style="position:relative;width:1280px;height:720px;background:#ffffff;overflow:hidden">
  <div style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;background:radial-gradient(ellipse 70% 60% at 20% 50%, rgba(30,41,59,0.15) 0%, transparent 55%),radial-gradient(ellipse 60% 50% at 80% 50%, rgba(30,41,59,0.08) 0%, transparent 50%),radial-gradient(ellipse 90% 80% at 50% 50%, rgba(30,41,59,0.04) 0%, transparent 65%)"></div>
  <div style="position:absolute;left:53px;top:53px;width:1174px;text-align:center;font-size:40px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:#1e293b;line-height:1.2">The Transformation</div>
  <div style="position:absolute;left:610px;top:109px;width:60px;height:3px;background:#3b82f6;border-radius:2px"></div>
  <div style="position:absolute;left:53px;top:143px;width:562px;height:524px;background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.15);border-radius:12px"></div><div style="position:absolute;left:53px;top:153px;width:562px;text-align:center;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#ef4444">✗ BEFORE</div><div style="position:absolute;left:69px;top:183px;width:530px;font-size:13px;line-height:1.4;color:#1e293b;opacity:0.8;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical"><span style="color:#ef4444;margin-right:6px">•</span>4-6 hours per deck, inconsistent branding, generic templates, manual formatting</div><div style="position:absolute;left:665px;top:143px;width:562px;height:524px;background:rgba(34,197,94,0.04);border:1px solid rgba(34,197,94,0.15);border-radius:12px"></div><div style="position:absolute;left:665px;top:153px;width:562px;text-align:center;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#22c55e">✓ AFTER</div><div style="position:absolute;left:681px;top:183px;width:530px;font-size:13px;line-height:1.4;color:#1e293b;opacity:0.8;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical"><span style="color:#22c55e;margin-right:6px">•</span>60-second generation, pixel-perfect themes, AI-adapted content, one-click export</div>
  <svg style="position:absolute;left:0;top:0" width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
    <line x1="624" y1="405" x2="656" y2="405" stroke="#3b82f6" stroke-width="3" /><polygon points="652,399 662,405 652,411" fill="#3b82f6" />
  </svg>
</div>

---

<!-- _backgroundColor: #ffffff -->
<!-- _color: #1e293b -->

<style scoped>
section { padding: 0 !important; display: block !important; overflow: visible !important; position: relative !important; }
section > * { flex-shrink: unset; }
section::after { position: absolute !important; bottom: 14px !important; right: 20px !important; font-size: 12px !important; z-index: 50 !important; padding: 2px 8px !important; border-radius: 4px !important; color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.08) !important; }
</style>
<div style="position:relative;width:1280px;height:720px;background:#ffffff;overflow:hidden">
  <div style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;background:radial-gradient(ellipse 70% 60% at 20% 40%, rgba(59,130,246,0.15) 0%, transparent 55%),radial-gradient(ellipse 60% 50% at 80% 60%, rgba(59,130,246,0.08) 0%, transparent 50%),radial-gradient(ellipse 90% 80% at 50% 50%, rgba(59,130,246,0.04) 0%, transparent 65%)"></div>
  <div style="position:absolute;left:53px;top:53px;width:1174px;text-align:center;font-size:34px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:#1e293b;line-height:1.2">Trusted by Industry Leaders</div>
  <div style="position:absolute;left:610px;top:109px;width:60px;height:3px;background:#3b82f6;border-radius:2px"></div>
  <div style="position:absolute;left:558px;top:224px;font-size:28px;color:#f59e0b">★</div><div style="position:absolute;left:592px;top:224px;font-size:28px;color:#f59e0b">★</div><div style="position:absolute;left:626px;top:224px;font-size:28px;color:#f59e0b">★</div><div style="position:absolute;left:660px;top:224px;font-size:28px;color:#f59e0b">★</div><div style="position:absolute;left:694px;top:224px;font-size:28px;color:rgba(226,232,240,0.3)">★</div>
  <div style="position:absolute;left:53px;top:274px;width:1174px;text-align:center;font-size:22px;color:#1e293b;opacity:0.85;overflow:hidden">4.9/5 average rating from 2,400+ users</div>
  <div style="position:absolute;left:53px;top:334px;width:579px;height:55px;background:#f8fafc;border:1px solid rgba(226,232,240,0.15);border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden"></div><div style="position:absolute;left:65px;top:355px;width:555px;font-size:13px;color:#1e293b;text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis"><span style="color:#3b82f6;margin-right:6px">★</span>Featured in TechCrunch, Product Hunt #1, Forbes 30 Under 30</div><div style="position:absolute;left:648px;top:334px;width:579px;height:55px;background:#f8fafc;border:1px solid rgba(226,232,240,0.15);border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden"></div><div style="position:absolute;left:660px;top:355px;width:555px;font-size:13px;color:#1e293b;text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis"><span style="color:#3b82f6;margin-right:6px">★</span>Trusted by teams at Stripe, Notion, Linear, Vercel, Figma</div>
</div>

---

<!-- _backgroundColor: #ffffff -->
<!-- _color: #1e293b -->

<style scoped>
section { padding: 0 !important; display: block !important; overflow: visible !important; position: relative !important; }
section > * { flex-shrink: unset; }
section::after { position: absolute !important; bottom: 14px !important; right: 20px !important; font-size: 12px !important; z-index: 50 !important; padding: 2px 8px !important; border-radius: 4px !important; color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.08) !important; }
</style>
<div style="position:relative;width:1280px;height:720px;background:#ffffff;overflow:hidden">
  <div style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;background:radial-gradient(ellipse 70% 60% at 20% 50%, rgba(30,41,59,0.15) 0%, transparent 55%),radial-gradient(ellipse 60% 50% at 80% 50%, rgba(30,41,59,0.08) 0%, transparent 50%),radial-gradient(ellipse 90% 80% at 50% 50%, rgba(30,41,59,0.04) 0%, transparent 65%)"></div>
  <div style="position:absolute;left:53px;top:53px;width:1174px;font-size:40px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:#1e293b;line-height:1.2">Addressing the Skeptics</div>
  <div style="position:absolute;left:53px;top:109px;width:50px;height:3px;background:#3b82f6;border-radius:2px"></div>
  <div style="position:absolute;left:53px;top:143px;width:376px;height:524px;background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.15);border-radius:12px;border-left:4px solid #ef4444"></div><div style="position:absolute;left:69px;top:157px;font-size:14px;font-weight:bold;color:#ef4444">But...</div><div style="position:absolute;left:69px;top:187px;width:344px;font-size:15px;font-style:italic;line-height:1.5;color:#1e293b;opacity:0.85;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical">&ldquo;&quot;AI-generated slides all look the same&quot;&rdquo;</div><div style="position:absolute;left:449px;top:143px;width:778px;height:524px;background:rgba(34,197,94,0.03);border:1px solid rgba(34,197,94,0.15);border-radius:12px;border-left:4px solid #22c55e"></div><div style="position:absolute;left:465px;top:157px;font-size:14px;font-weight:bold;color:#22c55e">The Data Says...</div><div style="position:absolute;left:465px;top:187px;width:746px;font-size:14px;line-height:1.5;color:#1e293b;opacity:0.85;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical"><span style="color:#22c55e;font-weight:bold;margin-right:6px">✓</span>Our 16 Figma-grade themes produce slides indistinguishable from agency work. In blind tests, 78% of executives preferred Pitchable output over manually designed decks. Each theme has 400+ unique layout combinations.</div>
</div>

---

<!-- _backgroundColor: #ffffff -->
<!-- _color: #1e293b -->

<svg style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;z-index:0" viewBox="0 0 1280 720"><defs><pattern id="mood-dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1" fill="rgba(0,0,0,0.05)"/></pattern></defs><rect width="1280" height="720" fill="url(#mood-dots)"/><path d="M53,53 L73,53 M53,53 L53,73" stroke="rgba(162,28,175,0.08)" stroke-width="2" fill="none"/><path d="M1227,667 L1207,667 M1227,667 L1227,647" stroke="rgba(162,28,175,0.08)" stroke-width="2" fill="none"/></svg>
<style scoped>
section { padding: 0 !important; display: block !important; overflow: visible !important; position: relative !important; }
section > * { flex-shrink: unset; }
section::after { position: absolute !important; bottom: 14px !important; right: 20px !important; font-size: 12px !important; z-index: 50 !important; padding: 2px 8px !important; border-radius: 4px !important; color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.08) !important; }
</style>
<div style="position:relative;width:1280px;height:720px;background:#ffffff;overflow:hidden">
  <div style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;background:radial-gradient(ellipse 70% 60% at 20% 50%, rgba(162,28,175,0.15) 0%, transparent 55%),radial-gradient(ellipse 60% 50% at 80% 50%, rgba(162,28,175,0.08) 0%, transparent 50%),radial-gradient(ellipse 90% 80% at 50% 50%, rgba(162,28,175,0.04) 0%, transparent 65%)"></div>
  <div style="position:absolute;left:53px;top:53px;width:1174px;font-size:34px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:#a21caf;line-height:1.2">Frequently Asked Questions</div>
  <div style="position:absolute;left:53px;top:109px;width:50px;height:3px;border-radius:2px;background:repeating-linear-gradient(to right,#3b82f6 0px,#3b82f6 8px,transparent 8px,transparent 14px)"></div>
  <div style="position:absolute;left:53px;top:143px;width:1174px;height:100px;background:#f8fafc;border:1px solid rgba(226,232,240,0.15);border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden"></div><div style="position:absolute;left:65px;top:153px;width:1150px;font-size:14px;font-weight:bold;color:#a21caf;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical"><span style="color:#22c55e;font-weight:900;margin-right:6px">Q:</span>Can I customize the AI-generated content?</div><div style="position:absolute;left:65px;top:193px;width:1150px;font-size:12px;line-height:1.4;color:#a21caf;opacity:0.75;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">Yes — every slide is fully editable after generation with real-time preview</div><div style="position:absolute;left:53px;top:255px;width:1174px;height:100px;background:#f8fafc;border:1px solid rgba(226,232,240,0.15);border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden"></div><div style="position:absolute;left:65px;top:265px;width:1150px;font-size:14px;font-weight:bold;color:#a21caf;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical"><span style="color:#f59e0b;font-weight:900;margin-right:6px">Q:</span>What export formats are supported?</div><div style="position:absolute;left:65px;top:305px;width:1150px;font-size:12px;line-height:1.4;color:#a21caf;opacity:0.75;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">PDF, PPTX, Google Slides, and Reveal.js for web presentations</div><div style="position:absolute;left:53px;top:367px;width:1174px;height:100px;background:#f8fafc;border:1px solid rgba(226,232,240,0.15);border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden"></div><div style="position:absolute;left:65px;top:377px;width:1150px;font-size:14px;font-weight:bold;color:#a21caf;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical"><span style="color:#ef4444;font-weight:900;margin-right:6px">Q:</span>Is my data secure?</div><div style="position:absolute;left:65px;top:417px;width:1150px;font-size:12px;line-height:1.4;color:#a21caf;opacity:0.75;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">SOC 2 Type II certified with end-to-end encryption and GDPR compliance</div>
</div>

---

<!-- _backgroundColor: #ffffff -->
<!-- _color: #1e293b -->

<div style="position:absolute;left:0;top:0;width:1280px;height:720px;clip-path:polygon(0 0,100% 0,100% 70%,0 100%);background:rgba(225,29,72,0.04);pointer-events:none;z-index:0"></div><svg style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;z-index:0" viewBox="0 0 1280 720"><line x1="0" y1="216" x2="1280" y2="503.99999999999994" stroke="rgba(239,68,68,0.03)" stroke-width="1.5"/><line x1="0" y1="360" x2="1280" y2="648" stroke="rgba(239,68,68,0.05)" stroke-width="1"/></svg>
<style scoped>
section { padding: 0 !important; display: block !important; overflow: visible !important; position: relative !important; }
section > * { flex-shrink: unset; }
section::after { position: absolute !important; bottom: 14px !important; right: 20px !important; font-size: 12px !important; z-index: 50 !important; padding: 2px 8px !important; border-radius: 4px !important; color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.08) !important; }
</style>
<div style="position:relative;width:1280px;height:720px;background:#ffffff;overflow:hidden">
  <div style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;background:radial-gradient(ellipse 70% 60% at 20% 50%, rgba(225,29,72,0.15) 0%, transparent 55%),radial-gradient(ellipse 60% 50% at 80% 50%, rgba(225,29,72,0.08) 0%, transparent 50%),radial-gradient(ellipse 90% 80% at 50% 50%, rgba(225,29,72,0.04) 0%, transparent 65%)"></div>
  <div style="position:absolute;left:53px;top:53px;width:1174px;text-align:center;font-size:34px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:#e11d48;line-height:1.2">Investment Committee Recommendation</div>
  <div style="position:absolute;left:610px;top:109px;width:60px;height:2px;background:#e11d48;border-radius:2px"></div><div style="position:absolute;left:619px;top:114px;width:42px;height:2px;background:#e11d48;border-radius:2px;opacity:0.5"></div>
  <div style="position:absolute;left:53px;top:230px;width:1174px;text-align:center;font-size:32px;font-weight:bold;color:#e11d48;line-height:1.3">Approve: Proceed with Platform Migration</div><div style="position:absolute;left:288px;top:280px;width:704px;height:6px;background:rgba(226,232,240,0.15);border-radius:3px"></div><div style="position:absolute;left:288px;top:280px;width:704px;height:6px;background:#e11d48;border-radius:3px;box-shadow:0 0 12px rgba(34,197,94,0.4)"></div><div style="position:absolute;left:93px;top:310px;width:1094px;text-align:center;font-size:15px;line-height:1.5;color:#e11d48;opacity:0.8">The analysis confirms 340bps margin improvement potential with 18-month payback period. Risk-adjusted NPV of $2.1B exceeds threshold by 3.2x. Management team has demonstrated execution capability.</div>
</div>

---

<!-- _backgroundColor: #ffffff -->
<!-- _color: #1e293b -->

<style scoped>
section { padding: 0 !important; display: block !important; overflow: visible !important; position: relative !important; }
section > * { flex-shrink: unset; }
section::after { position: absolute !important; bottom: 14px !important; right: 20px !important; font-size: 12px !important; z-index: 50 !important; padding: 2px 8px !important; border-radius: 4px !important; color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.08) !important; }
</style>
<div style="position:relative;width:1280px;height:720px;background:#ffffff;overflow:hidden">
  <div style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;background:radial-gradient(ellipse 70% 60% at 20% 45%, rgba(30,41,59,0.15) 0%, transparent 55%),radial-gradient(ellipse 60% 50% at 80% 55%, rgba(30,41,59,0.08) 0%, transparent 50%),radial-gradient(ellipse 90% 80% at 50% 50%, rgba(30,41,59,0.04) 0%, transparent 65%)"></div>
  <div style="position:absolute;left:53px;top:53px;width:1174px;font-size:40px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:#1e293b;line-height:1.2">Monthly Retention Cohorts</div>
  <div style="position:absolute;left:53px;top:109px;width:50px;height:3px;background:#3b82f6;border-radius:2px"></div>
  <div style="position:absolute;left:63px;top:143px;width:173px;height:45px;border-bottom:2px solid #e2e8f0;line-height:45px;font-size:11px;font-weight:bold;color:#1e293b;opacity:0.5;padding-left:8px">Cohort</div><div style="position:absolute;left:236px;top:143px;width:196px;height:45px;border-bottom:2px solid #e2e8f0;text-align:center;line-height:45px;font-size:11px;font-weight:bold;color:#1e293b;opacity:0.5">P0</div><div style="position:absolute;left:432px;top:143px;width:196px;height:45px;border-bottom:2px solid #e2e8f0;text-align:center;line-height:45px;font-size:11px;font-weight:bold;color:#1e293b;opacity:0.5">P1</div><div style="position:absolute;left:628px;top:143px;width:196px;height:45px;border-bottom:2px solid #e2e8f0;text-align:center;line-height:45px;font-size:11px;font-weight:bold;color:#1e293b;opacity:0.5">P2</div><div style="position:absolute;left:824px;top:143px;width:196px;height:45px;border-bottom:2px solid #e2e8f0;text-align:center;line-height:45px;font-size:11px;font-weight:bold;color:#1e293b;opacity:0.5">P3</div><div style="position:absolute;left:1020px;top:143px;width:196px;height:45px;border-bottom:2px solid #e2e8f0;text-align:center;line-height:45px;font-size:11px;font-weight:bold;color:#1e293b;opacity:0.5">P4</div><div style="position:absolute;left:63px;top:188px;width:173px;height:45px;border-bottom:1px solid rgba(226,232,240,0.15);line-height:45px;font-size:12px;font-weight:bold;color:#1e293b;padding-left:8px">Jan</div><div style="position:absolute;left:236px;top:188px;width:196px;height:45px;background:rgba(59,130,246,0.39999999999999997);border-bottom:1px solid rgba(226,232,240,0.1);text-align:center;line-height:45px;font-size:12px;font-weight:bold;color:#fff">100%</div><div style="position:absolute;left:432px;top:188px;width:196px;height:45px;background:rgba(59,130,246,0.32999999999999996);border-bottom:1px solid rgba(226,232,240,0.1);text-align:center;line-height:45px;font-size:12px;font-weight:bold;color:#fff">80%</div><div style="position:absolute;left:628px;top:188px;width:196px;height:45px;background:rgba(59,130,246,0.27749999999999997);border-bottom:1px solid rgba(226,232,240,0.1);text-align:center;line-height:45px;font-size:12px;font-weight:bold;color:#fff">65%</div><div style="position:absolute;left:824px;top:188px;width:196px;height:45px;background:rgba(59,130,246,0.22499999999999998);border-bottom:1px solid rgba(226,232,240,0.1);text-align:center;line-height:45px;font-size:12px;font-weight:bold;color:#1e293b">50%</div><div style="position:absolute;left:1020px;top:188px;width:196px;height:45px;background:rgba(59,130,246,0.197);border-bottom:1px solid rgba(226,232,240,0.1);text-align:center;line-height:45px;font-size:12px;font-weight:bold;color:#1e293b">42%</div><div style="position:absolute;left:63px;top:233px;width:173px;height:45px;border-bottom:1px solid rgba(226,232,240,0.15);line-height:45px;font-size:12px;font-weight:bold;color:#1e293b;padding-left:8px">Feb</div><div style="position:absolute;left:236px;top:233px;width:196px;height:45px;background:rgba(59,130,246,0.39999999999999997);border-bottom:1px solid rgba(226,232,240,0.1);text-align:center;line-height:45px;font-size:12px;font-weight:bold;color:#fff">100%</div><div style="position:absolute;left:432px;top:233px;width:196px;height:45px;background:rgba(59,130,246,0.31249999999999994);border-bottom:1px solid rgba(226,232,240,0.1);text-align:center;line-height:45px;font-size:12px;font-weight:bold;color:#fff">75%</div><div style="position:absolute;left:628px;top:233px;width:196px;height:45px;background:rgba(59,130,246,0.26);border-bottom:1px solid rgba(226,232,240,0.1);text-align:center;line-height:45px;font-size:12px;font-weight:bold;color:#1e293b">60%</div><div style="position:absolute;left:824px;top:233px;width:196px;height:45px;background:rgba(59,130,246,0.21799999999999997);border-bottom:1px solid rgba(226,232,240,0.1);text-align:center;line-height:45px;font-size:12px;font-weight:bold;color:#1e293b">48%</div><div style="position:absolute;left:1020px;top:233px;width:196px;height:45px;border-bottom:1px solid rgba(226,232,240,0.1)"></div><div style="position:absolute;left:63px;top:278px;width:173px;height:45px;border-bottom:1px solid rgba(226,232,240,0.15);line-height:45px;font-size:12px;font-weight:bold;color:#1e293b;padding-left:8px">Mar</div><div style="position:absolute;left:236px;top:278px;width:196px;height:45px;background:rgba(59,130,246,0.39999999999999997);border-bottom:1px solid rgba(226,232,240,0.1);text-align:center;line-height:45px;font-size:12px;font-weight:bold;color:#fff">100%</div><div style="position:absolute;left:432px;top:278px;width:196px;height:45px;background:rgba(59,130,246,0.33699999999999997);border-bottom:1px solid rgba(226,232,240,0.1);text-align:center;line-height:45px;font-size:12px;font-weight:bold;color:#fff">82%</div><div style="position:absolute;left:628px;top:278px;width:196px;height:45px;background:rgba(59,130,246,0.288);border-bottom:1px solid rgba(226,232,240,0.1);text-align:center;line-height:45px;font-size:12px;font-weight:bold;color:#fff">68%</div><div style="position:absolute;left:824px;top:278px;width:196px;height:45px;border-bottom:1px solid rgba(226,232,240,0.1)"></div><div style="position:absolute;left:1020px;top:278px;width:196px;height:45px;border-bottom:1px solid rgba(226,232,240,0.1)"></div><div style="position:absolute;left:63px;top:323px;width:173px;height:45px;border-bottom:1px solid rgba(226,232,240,0.15);line-height:45px;font-size:12px;font-weight:bold;color:#1e293b;padding-left:8px">Apr</div><div style="position:absolute;left:236px;top:323px;width:196px;height:45px;background:rgba(59,130,246,0.39999999999999997);border-bottom:1px solid rgba(226,232,240,0.1);text-align:center;line-height:45px;font-size:12px;font-weight:bold;color:#fff">100%</div><div style="position:absolute;left:432px;top:323px;width:196px;height:45px;background:rgba(59,130,246,0.32299999999999995);border-bottom:1px solid rgba(226,232,240,0.1);text-align:center;line-height:45px;font-size:12px;font-weight:bold;color:#fff">78%</div><div style="position:absolute;left:628px;top:323px;width:196px;height:45px;border-bottom:1px solid rgba(226,232,240,0.1)"></div><div style="position:absolute;left:824px;top:323px;width:196px;height:45px;border-bottom:1px solid rgba(226,232,240,0.1)"></div><div style="position:absolute;left:1020px;top:323px;width:196px;height:45px;border-bottom:1px solid rgba(226,232,240,0.1)"></div>
</div>

---

<!-- _backgroundColor: #ffffff -->
<!-- _color: #1e293b -->

<div style="position:absolute;left:0;top:0;width:1280px;height:720px;background:radial-gradient(70% 60% at 70% 65%,rgba(245,158,11,0.05) 0%,transparent 70%);pointer-events:none;z-index:0"></div><svg style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;z-index:0" viewBox="0 0 1280 720"><path d="M128,576 Q512,144 1152,432" stroke="rgba(245,158,11,0.06)" stroke-width="2" fill="none"/></svg>
<style scoped>
section { padding: 0 !important; display: block !important; overflow: visible !important; position: relative !important; }
section > * { flex-shrink: unset; }
section::after { position: absolute !important; bottom: 14px !important; right: 20px !important; font-size: 12px !important; z-index: 50 !important; padding: 2px 8px !important; border-radius: 4px !important; color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.08) !important; }
</style>
<div style="position:relative;width:1280px;height:720px;background:#ffffff;overflow:hidden">
  <div style="position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:none;background:radial-gradient(ellipse 70% 60% at 20% 45%, rgba(217,119,6,0.15) 0%, transparent 55%),radial-gradient(ellipse 60% 50% at 80% 55%, rgba(217,119,6,0.08) 0%, transparent 50%),radial-gradient(ellipse 90% 80% at 50% 50%, rgba(217,119,6,0.04) 0%, transparent 65%)"></div>
  <div style="position:absolute;left:53px;top:53px;width:1174px;font-size:34px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:#d97706;line-height:1.2">Migration Status Dashboard</div>
  <div style="position:absolute;left:53px;top:109px;width:60px;height:4px;background:#d97706;border-radius:6px"></div>
  <div style="position:absolute;left:63px;top:165px;width:323px;font-size:14px;font-weight:600;color:#d97706;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Platform Migration</div><div style="position:absolute;left:396px;top:164px;width:771px;height:18px;background:rgba(226,232,240,0.15);border-radius:9px"></div><div style="position:absolute;left:396px;top:164px;width:655px;height:18px;background:#d97706;border-radius:9px;box-shadow:0 0 8px rgba(217,119,6,0.3)"></div><div style="position:absolute;left:1175px;top:166px;font-size:14px;font-weight:bold;color:#d97706">85%</div><div style="position:absolute;left:63px;top:217px;width:323px;font-size:14px;font-weight:600;color:#d97706;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Data Integration</div><div style="position:absolute;left:396px;top:216px;width:771px;height:18px;background:rgba(226,232,240,0.15);border-radius:9px"></div><div style="position:absolute;left:396px;top:216px;width:478px;height:18px;background:#d97706;border-radius:9px;box-shadow:0 0 8px rgba(217,119,6,0.3)"></div><div style="position:absolute;left:1175px;top:218px;font-size:14px;font-weight:bold;color:#d97706">62%</div><div style="position:absolute;left:63px;top:269px;width:323px;font-size:14px;font-weight:600;color:#d97706;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">User Training</div><div style="position:absolute;left:396px;top:268px;width:771px;height:18px;background:rgba(226,232,240,0.15);border-radius:9px"></div><div style="position:absolute;left:396px;top:268px;width:308px;height:18px;background:#d97706;border-radius:9px;box-shadow:0 0 8px rgba(217,119,6,0.3)"></div><div style="position:absolute;left:1175px;top:270px;font-size:14px;font-weight:bold;color:#d97706">40%</div><div style="position:absolute;left:63px;top:321px;width:323px;font-size:14px;font-weight:600;color:#d97706;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Security Audit</div><div style="position:absolute;left:396px;top:320px;width:771px;height:18px;background:rgba(226,232,240,0.15);border-radius:9px"></div><div style="position:absolute;left:396px;top:320px;width:732px;height:18px;background:#d97706;border-radius:9px;box-shadow:0 0 8px rgba(217,119,6,0.3)"></div><div style="position:absolute;left:1175px;top:322px;font-size:14px;font-weight:bold;color:#d97706">95%</div><div style="position:absolute;left:63px;top:373px;width:323px;font-size:14px;font-weight:600;color:#d97706;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Documentation</div><div style="position:absolute;left:396px;top:372px;width:771px;height:18px;background:rgba(226,232,240,0.15);border-radius:9px"></div><div style="position:absolute;left:396px;top:372px;width:424px;height:18px;background:#d97706;border-radius:9px;box-shadow:0 0 8px rgba(217,119,6,0.3)"></div><div style="position:absolute;left:1175px;top:374px;font-size:14px;font-weight:bold;color:#d97706">55%</div>
</div>
