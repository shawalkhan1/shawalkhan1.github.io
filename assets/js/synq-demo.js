(function(){
"use strict";
var reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* ---------- SYNQ: living generative-agent campus world ---------- */
  (function(){
    var canvas = document.getElementById("agent-sim");
    if(!canvas) return;
    canvas.parentElement.hidden=false;
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, dpr = 1, raf = null, T = 0;
    var mouse = {x:-999, y:-999, on:false};

    // ---- world clock & seasons ----
    var DAY = 80 * 60;            // frames per in-sim day
    var clock = 0.32;            // 0..1 day fraction
    var paused = false;
    var season = "summer";       // "summer" | "winter"
    var seasonTimer = DAY * 2;
    var light = 1;               // 0..1 ambient brightness
    var nf = 0;                  // night factor 0..1
    var activeEvent = null;
    var eventCD = Math.round(DAY * 0.18);
    var evIdx = 0;
    var lastBlock = -2, lastEsig = "";
    var weather = "clear";       // "clear" | "rain" | "overcast"
    var beat = 0;                // 0..1 sawtooth for synced dancing
    var beatDrop = false;        // true briefly on each beat wrap
    var hud = document.getElementById("sim-hud");

    // ---- places ----
    var ZONES = [
      {name:"M7 Hostel",     x:.14, y:.34, type:"dorm",     roof:"#b8324a"},
      {name:"PDC Cafe",      x:.50, y:.20, type:"cafe",     roof:"#c2671f"},
      {name:"SSE LUMS",      x:.86, y:.34, type:"academic", roof:"#356a9e"},
      {name:"SDSB LUMS",     x:.84, y:.72, type:"academic", roof:"#7c5cbf"},
      {name:"Swimming Pool", x:.46, y:.82, type:"pool",     roof:"#2f8fb0"},
      {name:"LUMS Gym",      x:.15, y:.72, type:"gym",      roof:"#2f7d6b"},
      {name:"Khoka",         x:.66, y:.42, type:"cafe",     roof:"#caa14a"}
    ];
    var KHOKA = 6;               // index of Khoka in ZONES (appended last to keep indices stable)
    var QUAD = {x:.50, y:.54};
    var EDGES = [[0,5],[5,4],[4,1],[1,0],[1,2],[2,3],[3,4],[5,1],[1,6]];

    var NAMES = ["Shawal","Hassan","Hashim","Farhan","Salena","Mariam"];
    var CHARS = [
      {skin:"#e8b890", hair:"#2a211b", shirt:"#8C1515", swim:"#7a2230", long:false, coat:"#6e2b39", beanie:"#8C1515", scarf:"#d4af37", neon:"#ff2d8b"},
      {skin:"#d9a878", hair:"#171717", shirt:"#356a9e", swim:"#23506e", long:false, coat:"#2c4a66", beanie:"#356a9e", scarf:"#7fb0d6", neon:"#21e6c1"},
      {skin:"#e3b387", hair:"#3a2a1a", shirt:"#2f7d6b", swim:"#1f5d4f", long:false, coat:"#2f5d52", beanie:"#2f7d6b", scarf:"#a7d8cc", neon:"#19d3ff"},
      {skin:"#cf9d6e", hair:"#120f0c", shirt:"#c2671f", swim:"#9c4a16", long:false, coat:"#9c4a16", beanie:"#c2671f", scarf:"#f0b27a", neon:"#ffd400"},
      {skin:"#e8bd93", hair:"#6b4a2a", shirt:"#7c5cbf", swim:"#5a3f9c", long:true,  coat:"#4a3a7a", beanie:"#7c5cbf", scarf:"#d4af37", neon:"#b14bff"},
      {skin:"#e0b285", hair:"#241a12", shirt:"#b07d28", swim:"#8a5f1c", long:true,  coat:"#7a5a1c", beanie:"#b07d28", scarf:"#e8c97a", neon:"#ff7ad6"}
    ];

    var LINES = ["did you hear…","no way!","let's build it","chai later?","rooftop tonight?","i'm in!","that's wild","ranked #1","big if true","100%"];
    // ---- topic-threaded dialogue: alternating speaker A / B, short terminal-friendly lines ----
    var TOPICS = {
      politics: ["did the budget pass?","barely, with cuts","inflation's brutal now","subsidies miss villages","policy never reaches them","maybe next election"],
      ai:       ["lecture on attention today","transformers still scale","is it data or scale?","both, but data's king","reasoning needs more","scaling laws say maybe"],
      morality: ["the trolley problem again","would you pull it?","outcomes over intent?","intent has to matter","consequentialism is cold","yeah it breaks down"],
      food:     ["nihari or biryani?","nihari, no contest","khoka chai after?","always, double patti","PDC food's mid lately","the daal saved it"],
      research: ["paper got reviews back","accept or reject?","borderline, two weak","rebuttal time then","deadline's friday night","no sleep this week"],
      campus:   ["hostel wifi died again","deadline at midnight","slept four hours total","rooftop later to reset?","yeah, need the air","M7 rooftop it is"]
    };
    var TOPIC_KEYS = ["politics","ai","morality","food","research","campus"];
    var SOCIAL = {gossip:1, coffee:1, movie:1, study:1, "reading-book":1, "reading-notes":1};
    var ACT_LABEL = {
      coffee:"chai break", gossip:"gossiping", study:"studying", "reading-book":"reading",
      "reading-notes":"revising", swim:"swimming", phone:"scrolling", music:"vibing",
      movie:"movie night", workout:"workout", dance:"dancing", volleyball:"volleyball",
      hack:"hacking", sleep:"asleep", walk:""
    };

    // ---- daily schedule: per block, [zone, activity, partner] for each of 6 agents ----
    var SCHEDULE = [
      {t0:.00, t1:.22, a:[[0,"sleep",-1],[0,"sleep",-1],[0,"sleep",-1],[0,"sleep",-1],[0,"sleep",-1],[0,"sleep",-1]]},
      {t0:.22, t1:.40, a:[[1,"coffee",1],[1,"gossip",0],[2,"reading-book",-1],[3,"study",-1],[1,"reading-notes",-1],[2,"study",-1]]},
      {t0:.40, t1:.56, a:[[2,"study",5],[5,"workout",-1],[2,"study",0],[1,"phone",-1],[3,"reading-book",5],[3,"gossip",4]]},
      {t0:.56, t1:.70, a:[[4,"swim",-1],[4,"swim",-1],[5,"workout",-1],[1,"music",-1],[4,"swim",-1],[1,"gossip",3]]},
      {t0:.70, t1:.85, a:[[1,"gossip",5],[0,"music",-1],[0,"phone",-1],[1,"coffee",-1],[0,"music",-1],[1,"gossip",0]]},
      {t0:.85, t1:1.0, a:[[0,"movie",-1],[0,"movie",-1],[0,"phone",-1],[0,"movie",-1],[0,"music",-1],[0,"movie",-1]]}
    ];

    var EVENTS = [
      {type:"volleyball", zi:"quad", act:"volleyball", phase:"day",   season:"summer", label:"Volleyball @ Lawn"},
      {type:"hackathon",  zi:2,      act:"hack",       phase:"night",                  label:"Hackathon @ SSE"},
      {type:"rave",       zi:KHOKA,  act:"dance",      phase:"night",                  label:"Rave @ Khoka"},
      {type:"movie",      zi:0,      act:"movie",      phase:"night",                  label:"Movie night @ M7"}
    ];

    var agents = [], stars = [], snow = [], flies = [], fworks = [], fairy = [], wires = [], lamps = [], rain = [], splashes = [], puddles = [];
    var splashI = 0;

    function rnd(a,b){ return a + Math.random()*(b-a); }
    function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
    function lerp(a,b,t){ return a+(b-a)*t; }

    function spot(zi, ang, rad){
      var z = (zi==="quad") ? QUAD : ZONES[zi];
      rad = rad || .075;
      var x = clamp(z.x + Math.cos(ang)*rad, .05, .95);
      var y = clamp(z.y + Math.sin(ang)*rad*0.66, .12, .9);
      return {x:x, y:y};
    }
    function evZone(){ var ev=activeEvent; if(!ev) return QUAD; return ev.zi==="quad" ? QUAD : ZONES[ev.zi]; }
    // ---- deterministic outfit resolution; drawChar (Phase 2) reads ONLY this object ----
    function outfitFor(ag){
      var c = ag.ch, champ = (ag.idx===0 || ag.idx===4);
      var out = {top:c.shirt, bottom:"#3a3330", accent:c.shirt, hat:false, scarf:false, umbrella:false, swim:false};
      if(ag.act==="swim"){ out.top=false; out.bottom=false; out.accent=c.swim; out.swim=c.swim; return out; }
      var playingVB = (activeEvent && activeEvent.type==="volleyball" && ag.role==="play");
      if(playingVB){
        if(champ){ out.top="#8C1515"; out.accent="#d4af37"; out.bottom="#222"; }
        else { out.top = (ag.team===0 ? "#356a9e" : "#c2671f"); out.accent="#ffffff"; out.bottom="#2a2a2a"; }
        return out;
      }
      if(ag.act==="dance"){
        out.top = c.neon; out.accent = CHARS[(ag.idx+2)%CHARS.length].neon; out.bottom="#181024"; out.hat=false; return out;
      }
      if(season==="winter"){
        out.top = c.coat; out.bottom="#3a3330"; out.scarf = c.scarf; out.hat = c.beanie; return out;
      }
      if(weather==="rain" && (ag.act==="walk" || ag.moving)){
        out.top = "#3b5566"; out.accent="#9fb6c4"; out.umbrella = champ ? "#8C1515" : c.shirt; return out;
      }
      return out;
    }
    function build(){
      agents = [];
      for(var i=0;i<NAMES.length;i++){
        var s = spot(i % ZONES.length, i*1.1);
        agents.push({
          x:s.x, y:s.y, tx:s.x, ty:s.y, name:NAMES[i], ch:CHARS[i], you:(i===0), idx:i,
          spd:rnd(.0016,.0024), bob:rnd(0,6.28), moving:false, dir:1, moveDelay:0,
          act:"walk", zi:i%ZONES.length, partner:-1, status:"", line:"", lineT:rnd(0,120),
          mood:"good", energy:rnd(.6,.95), team:-1, role:"play", pose:null,
          convo:null, convoCD:0
        });
      }
    }
    function blockAt(c){
      for(var i=0;i<SCHEDULE.length;i++){ if(c>=SCHEDULE[i].t0 && c<SCHEDULE[i].t1) return i; }
      return 0;
    }
    function applyAssignments(){
      if(activeEvent){
        var ev = activeEvent;
        for(var i=0;i<agents.length;i++){
          var ag=agents[i];
          ag.zi=ev.zi; ag.act=ev.act; ag.convo=null; ag.line=""; ag.pose=null;
          ag.partner = (ev.act==="dance") ? ((i+1)%agents.length) : -1;
        }
        if(ev.type==="volleyball"){ placeVB(); serveRally(0); return; }
        if(ev.type==="rave"){
          var rzc = ZONES[ev.zi];
          for(var ri=0;ri<agents.length;ri++){ var ad=agents[ri], aa=(ri/agents.length)*Math.PI*2 + 0.3;
            ad.tx=clamp(rzc.x + Math.cos(aa)*.085, .05,.95);
            ad.ty=clamp(rzc.y + Math.sin(aa)*.05 + .012, .12,.9);
            ad.moveDelay=(rnd(0,40))|0; ad.danceStyle=ri%4;
          }
          return;
        }
        for(var k=0;k<agents.length;k++){ var ak=agents[k];
          var s = spot(ev.zi, (k/agents.length)*Math.PI*2 + 0.3, ev.zi==="quad" ? .13 : .085);
          ak.tx=s.x; ak.ty=s.y; ak.moveDelay=(rnd(0,55))|0;
        }
        return;
      }
      var blk = SCHEDULE[blockAt(clock)];
      for(var j=0;j<agents.length;j++){
        var a2=blk.a[j], g=agents[j];
        g.zi=a2[0]; g.act=a2[1]; g.partner=a2[2];
        var sp = spot(a2[0], 0.5 + j*1.07, a2[0]==="quad" ? .12 : .1);
        g.tx=sp.x; g.ty=sp.y; g.moveDelay=(rnd(0,55))|0; g.convo=null;
      }
    }
    function startEvent(ev){
      if(ev.type==="volleyball" && weather==="rain") return;   // no outdoor volleyball in the rain
      if(ev.type==="volleyball"){ season="summer"; if(clock<.55 || clock>.70) clock=.62; assignTeams(); }
      else if(light>.4){ clock=.90; }
      activeEvent = {type:ev.type, zi:ev.zi, act:ev.act, label:ev.label, t:Math.round(DAY*0.17)};
      computeLight();
      lastEsig = "__force";
    }
    function maybeAutoEvent(){
      var night = light < .35;
      var cands = [];
      for(var i=0;i<EVENTS.length;i++){
        var e=EVENTS[i];
        if(e.season && e.season!==season) continue;
        if(e.type==="volleyball" && weather==="rain") continue;
        if(e.phase==="night" ? night : (!night && season==="summer")) cands.push(e);
      }
      if(cands.length && Math.random()<0.012){ startEvent(cands[(evIdx++)%cands.length]); }
    }
    function triggerEvent(){
      for(var n=0;n<EVENTS.length;n++){
        var ev=EVENTS[(evIdx++)%EVENTS.length];
        if(ev.type==="volleyball" && weather==="rain") continue;  // skip to the next event when raining
        startEvent(ev); return;
      }
    }
    // ---- daily weather + mood/health roll (once per in-sim day) ----
    function rollWeather(){
      var r=Math.random();
      if(season==="winter"){ weather = r<.6 ? "clear" : "overcast"; }  // snow handles precip in winter
      else { weather = r<.60 ? "clear" : (r<.85 ? "overcast" : "rain"); }
    }
    var MOODS = ["good","good","good","tired","hyped","focused"];
    function assignDaily(){
      rollWeather();
      var sickIdx = Math.random()<0.4 ? (Math.random()*agents.length)|0 : -1;
      for(var i=0;i<agents.length;i++){
        var ag=agents[i];
        if(i===sickIdx){ ag.mood="sick"; ag.energy=rnd(.2,.45); }
        else {
          ag.mood = MOODS[(Math.random()*MOODS.length)|0];
          ag.energy = ag.mood==="tired" ? rnd(.3,.55) : (ag.mood==="hyped" ? rnd(.8,1) : rnd(.55,.95));
        }
      }
    }
    // ---- volleyball teams: champs Shawal(0) & Salena(4) always play, opposite sides ----
    function assignTeams(){
      var players=[], watchers=[];
      for(var i=0;i<agents.length;i++){ agents[i].team=-1; agents[i].role="play"; }
      for(var j=0;j<agents.length;j++){
        if(j===0 || j===4) continue;
        var m=agents[j].mood;
        if(m==="sick" || m==="tired") watchers.push(j); else players.push(j);
      }
      if(watchers.length===0 && players.length){ watchers.push(players.pop()); }  // ensure at least one watcher
      for(var w=0;w<watchers.length;w++){ agents[watchers[w]].role="watch"; agents[watchers[w]].team=-1; }
      agents[0].team=0; agents[0].role="play";
      agents[4].team=1; agents[4].role="play";
      for(var p=0;p<players.length;p++){ agents[players[p]].team = p%2; agents[players[p]].role="play"; }
    }
    function clearTeams(){ for(var i=0;i<agents.length;i++){ var a=agents[i]; a.team=-1; a.role="play"; a.pose=null; a.line=""; a.lineT=0; } rally.phase="idle"; }
    // ---- threaded conversation driver ----
    function pickTopic(ag){
      var zi=ag.zi;
      if(zi===2 || zi===3) return Math.random()<.5 ? "ai" : "research";       // SSE / SDSB
      if(zi===1 || zi===6) return Math.random()<.5 ? "food" : "politics";     // PDC / Khoka
      return Math.random()<.5 ? "morality" : "campus";                        // rooftop / movie / night
    }
    function startConvo(a,b){                      // a is the driver (lower idx); speaker A on even idx
      var key=pickTopic(a), lines=TOPICS[key];
      a.convo={topic:key, with:b.idx, lines:lines, idx:0, t:rnd(55,80)};
      b.convo={topic:key, with:a.idx, lines:lines, idx:0, t:rnd(55,80)};
      a.line=lines[0]; b.line="";
    }
    function endConvo(ag){
      var cd=(rnd(150,300))|0;
      if(ag.convo){
        var p=agents[ag.convo.with];
        if(p && p.convo && p.convo.with===ag.idx){ p.convo=null; p.line=""; p.convoCD=cd; }
      }
      ag.convo=null; ag.line=""; ag.convoCD=cd;
    }
    function runConvos(){
      for(var i=0;i<agents.length;i++){
        var a=agents[i];
        if(!a.convo || a.idx >= a.convo.with) continue;   // only the driver (lower idx) advances
        var b=agents[a.convo.with], cv=a.convo;
        if(!b || !b.convo || b.convo.with!==a.idx || a.moving || b.moving){ endConvo(a); continue; }
        cv.t--;
        if(cv.t<=0){
          cv.idx++; b.convo.idx=cv.idx; cv.t=rnd(55,80); b.convo.t=cv.t;
          if(cv.idx>=cv.lines.length){ endConvo(a); continue; }
        }
        if(cv.idx % 2 === 0){ a.line=cv.lines[cv.idx]; b.line=""; }
        else { b.line=cv.lines[cv.idx]; a.line=""; }
      }
    }
    function maybeStartConvos(){
      for(var i=0;i<agents.length;i++){
        var a=agents[i];
        if(a.moving || a.convo || a.convoCD>0 || !SOCIAL[a.act]) continue;
        var b=null;
        if(a.partner>=0){ var p=agents[a.partner];
          if(p && !p.moving && !p.convo && p.convoCD<=0 && SOCIAL[p.act]) b=p; }
        if(!b){
          for(var j=0;j<agents.length;j++){ if(j===i) continue; var q=agents[j];
            if(q.moving || q.convo || q.convoCD>0 || !SOCIAL[q.act]) continue;
            if(Math.hypot(a.x-q.x, a.y-q.y) < .10){ b=q; break; }
          }
        }
        if(b && Math.random()<0.04){ var lo=a.idx<b.idx?a:b, hi=a.idx<b.idx?b:a; startConvo(lo,hi); }
      }
    }

    function computeLight(){
      var c=clock;
      if(c < .20) light=.07;
      else if(c < .30) light=lerp(.07,1,(c-.20)/.10);
      else if(c < .72) light=1;
      else if(c < .84) light=lerp(1,.07,(c-.72)/.12);
      else light=.07;
      nf = 1 - clamp((light-.07)/.93, 0, 1);
    }

    function size(){
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W=r.width; H=r.height;
      canvas.width=Math.max(1,W*dpr); canvas.height=Math.max(1,H*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
      computeDecor();
    }
    function btop(z){ return {x:z.x*W, y:z.y*H-20}; }
    function computeDecor(){
      fairy=[]; wires=[];
      for(var e=0;e<EDGES.length;e++){
        var A=btop(ZONES[EDGES[e][0]]), B=btop(ZONES[EDGES[e][1]]);
        var C={x:(A.x+B.x)/2, y:(A.y+B.y)/2 + 20};
        wires.push({A:A,B:B,C:C});
        for(var i=1;i<6;i++){
          var t=i/6, mt=1-t;
          fairy.push({
            x: mt*mt*A.x + 2*mt*t*C.x + t*t*B.x,
            y: mt*mt*A.y + 2*mt*t*C.y + t*t*B.y,
            hue: [42,8,330,170][(e+i)%4], p: Math.random()*6.28
          });
        }
      }
      lamps = [{x:.31*W,y:.56*H},{x:.66*W,y:.64*H}];
      if(!stars.length){ for(var s=0;s<40;s++) stars.push({x:Math.random(),y:Math.random()*0.46,p:Math.random()*6.28}); }
      if(!snow.length){ for(var k=0;k<60;k++) snow.push({x:Math.random(),y:Math.random(),v:rnd(.0015,.004),d:rnd(0,6.28)}); }
      if(!flies.length){ for(var f=0;f<16;f++) flies.push({x:Math.random(),y:rnd(.4,.92),p:Math.random()*6.28,sx:rnd(-.0006,.0006),sy:rnd(-.0004,.0004)}); }
      if(!rain.length){ for(var ri=0;ri<70;ri++) rain.push({x:Math.random()*1.15, y:Math.random(), len:rnd(5,9), v:rnd(.020,.035)}); }
      if(!splashes.length){ for(var sl=0;sl<28;sl++) splashes.push({x:0,y:0,life:0}); }
      if(!puddles.length){ puddles.push({x:.30,y:.60,r:9,phase:0},{x:.58,y:.50,r:7,phase:.4},{x:.46,y:.83,r:8,phase:.7},{x:.72,y:.66,r:6,phase:.2}); }
    }

    function rr(x,y,w,h,r){
      ctx.beginPath();
      ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
      ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
    }

    // ---------- scene layers ----------
    function drawGround(){
      ctx.fillStyle = season==="summer" ? "rgb(183,207,152)" : "rgb(228,233,239)";
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle = season==="summer" ? "rgba(150,184,118,0.45)" : "rgba(255,255,255,0.55)";
      for(var i=0;i<ZONES.length;i++){ var z=ZONES[i]; ctx.beginPath(); ctx.ellipse(z.x*W, z.y*H+18, 33, 11, 0, 0, 6.28); ctx.fill(); }
    }
    function drawRoads(){
      ctx.lineCap="round"; ctx.strokeStyle="rgba(120,95,70,0.10)"; ctx.lineWidth=9;
      for(var e=0;e<EDGES.length;e++){ var a=ZONES[EDGES[e][0]], b=ZONES[EDGES[e][1]];
        ctx.beginPath(); ctx.moveTo(a.x*W,a.y*H); ctx.lineTo(b.x*W,b.y*H); ctx.stroke();
      }
    }
    function drawFairyWires(){
      ctx.strokeStyle="rgba(70,55,45,0.22)"; ctx.lineWidth=1;
      for(var i=0;i<wires.length;i++){ var w=wires[i];
        ctx.beginPath(); ctx.moveTo(w.A.x,w.A.y); ctx.quadraticCurveTo(w.C.x,w.C.y,w.B.x,w.B.y); ctx.stroke();
      }
    }
    function drawLampPosts(){
      for(var i=0;i<lamps.length;i++){ var l=lamps[i];
        ctx.strokeStyle="rgba(70,55,45,0.5)"; ctx.lineWidth=1.6;
        ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x, l.y-22); ctx.stroke();
        ctx.fillStyle = nf>0.2 ? "#ffd98a" : "rgba(120,100,70,0.55)";
        ctx.beginPath(); ctx.arc(l.x, l.y-24, 2.4, 0, 6.28); ctx.fill();
      }
    }
    function plaque(cx, by, name){
      ctx.font = "600 8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      var w = ctx.measureText(name).width + 12;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.strokeStyle = "rgba(140,21,21,0.28)"; ctx.lineWidth = 1;
      rr(cx - w/2, by, w, 13, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(92,56,40,0.95)";
      ctx.fillText(name, cx, by + 7);
    }
    function emblem(type, cx, cy){
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.strokeStyle = "rgba(0,0,0,0.14)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.save();
      ctx.strokeStyle = "rgba(45,33,26,0.85)"; ctx.fillStyle = "rgba(45,33,26,0.85)"; ctx.lineWidth = 1.4;
      if(type === "gym"){
        ctx.beginPath(); ctx.moveTo(cx-3.5,cy); ctx.lineTo(cx+3.5,cy); ctx.stroke();
        ctx.fillRect(cx-5,cy-2.6,2,5.2); ctx.fillRect(cx+3,cy-2.6,2,5.2);
      } else if(type === "cafe"){
        ctx.beginPath(); ctx.moveTo(cx-3,cy-3); ctx.lineTo(cx-2.3,cy+3); ctx.lineTo(cx+2.3,cy+3); ctx.lineTo(cx+3,cy-3); ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx+3.4,cy-0.6,1.9,-1.2,1.2); ctx.stroke();
      } else if(type === "academic"){
        ctx.beginPath(); ctx.moveTo(cx,cy-3.2); ctx.lineTo(cx+5,cy-0.6); ctx.lineTo(cx,cy+1.8); ctx.lineTo(cx-5,cy-0.6); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx+4,cy-0.8); ctx.lineTo(cx+4,cy+2.6); ctx.stroke();
      } else if(type === "dorm"){
        ctx.lineWidth = 1.2; ctx.strokeRect(cx-4.5,cy-0.5,9,4);
        ctx.fillRect(cx-4.5,cy-2.6,3.4,2.4);
      }
      ctx.restore();
    }
    function drawHouse(cx, cy, z){
      var wallW = 46, wallH = 26, wx = cx - wallW/2, wt = cy - 4;
      ctx.fillStyle = z.roof;
      ctx.beginPath();
      ctx.moveTo(cx - wallW/2 - 3, wt + 3); ctx.lineTo(cx, cy - 24); ctx.lineTo(cx + wallW/2 + 3, wt + 3);
      ctx.closePath(); ctx.fill();
      if(season === "winter"){ ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.beginPath(); ctx.moveTo(cx - wallW/2 - 3, wt + 3); ctx.lineTo(cx, cy - 24); ctx.lineTo(cx - 4, cy - 19); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "#fbf3e7";
      ctx.strokeStyle = "rgba(92,62,42,0.45)"; ctx.lineWidth = 1.2;
      rr(wx, wt, wallW, wallH, 4); ctx.fill(); ctx.stroke();
      function win(x,y){
        ctx.fillStyle = nf>0.25 ? "#ffd57a" : "#bcd4e0";
        ctx.fillRect(x,y,7,7);
        ctx.strokeStyle = "rgba(92,62,42,0.4)"; ctx.lineWidth = 0.8; ctx.strokeRect(x,y,7,7);
        ctx.strokeStyle = "rgba(92,62,42,0.25)";
        ctx.beginPath(); ctx.moveTo(x+3.5,y); ctx.lineTo(x+3.5,y+7); ctx.moveTo(x,y+3.5); ctx.lineTo(x+7,y+3.5); ctx.stroke();
      }
      win(cx-17, wt+5); win(cx+10, wt+5);
      if(z.type === "dorm"){ win(cx-3.5, wt+5); win(cx-17, wt+15); win(cx+10, wt+15); }
      ctx.fillStyle = "rgba(96,60,36,0.88)";
      rr(cx - 5, wt + wallH - 12, 10, 12, 2); ctx.fill();
      ctx.fillStyle = "rgba(250,210,120,0.95)";
      ctx.beginPath(); ctx.arc(cx + 3, wt + wallH - 6, 1, 0, Math.PI*2); ctx.fill();
      if(z.type === "cafe"){
        for(var s=0;s<6;s++){ ctx.fillStyle = (s % 2 === 0) ? "#c2671f" : "#fbf3e7"; ctx.fillRect(wx + s*(wallW/6), wt + wallH - 3.5, wallW/6, 3.5); }
      }
      if(z.type === "academic"){
        ctx.strokeStyle = "rgba(120,90,60,0.45)"; ctx.lineWidth = 1.4;
        for(var c2=-1;c2<=1;c2++){ var lx = cx + c2*9; ctx.beginPath(); ctx.moveTo(lx, wt+wallH-12); ctx.lineTo(lx, wt+wallH-1); ctx.stroke(); }
      }
      emblem(z.type, cx, cy - 12);
    }
    function drawPool(cx, cy){
      var w=52, h=30, x=cx-w/2, y=cy-12;
      ctx.fillStyle = "#e7dccb";
      ctx.strokeStyle = "rgba(92,62,42,0.4)"; ctx.lineWidth = 1.2;
      rr(x-4, y-4, w+8, h+8, 8); ctx.fill(); ctx.stroke();
      if(season === "winter"){
        ctx.fillStyle = "#dbe6ee"; rr(x, y, w, h, 5); ctx.fill();
        ctx.strokeStyle="rgba(150,170,185,0.6)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(x+6,y+10); ctx.lineTo(x+w-8,y+20); ctx.stroke();
        return;
      }
      var g = ctx.createLinearGradient(0, y, 0, y+h);
      g.addColorStop(0,"#67cbe2"); g.addColorStop(1,"#2f8fb0");
      ctx.fillStyle = g; rr(x, y, w, h, 5); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1;
      for(var r=0;r<3;r++){
        var ry = y + 8 + r*8; ctx.beginPath();
        for(var px=x+4; px<x+w-4; px+=8){ ctx.moveTo(px,ry); ctx.quadraticCurveTo(px+4,ry-2,px+8,ry); }
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(235,235,235,0.9)"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x+w-9,y-2); ctx.lineTo(x+w-9,y+9); ctx.moveTo(x+w-5,y-2); ctx.lineTo(x+w-5,y+9); ctx.stroke();
    }
    function drawBuilding(z){
      var cx = z.x*W, cy = z.y*H;
      ctx.fillStyle = "rgba(28,20,16,0.10)";
      ctx.beginPath(); ctx.ellipse(cx, cy+20, 28, 6, 0, 0, Math.PI*2); ctx.fill();
      if(z.type === "pool") drawPool(cx, cy); else drawHouse(cx, cy, z);
      plaque(cx, cy + 24, z.name);
    }

    function drawEventGround(){
      if(!activeEvent) return;
      var ev=activeEvent;
      if(ev.type==="volleyball") drawVolleyball();
      else if(ev.type==="rave") drawRaveFloor();
    }
    // ---- volleyball court + net (drawn on the ground, under the players) ----
    function drawVolleyball(){
      var cx=QUAD.x*W, cy=QUAD.y*H, hw=VB.hw*W, hd=VB.hd*H;
      // sand court over the grass
      ctx.fillStyle="rgba(198,154,96,0.34)"; rr(cx-hw, cy-hd, hw*2, hd*2, 7); ctx.fill();
      // boundary
      ctx.strokeStyle="rgba(255,255,255,0.85)"; ctx.lineWidth=2;
      rr(cx-hw, cy-hd, hw*2, hd*2, 7); ctx.stroke();
      // attack lines
      ctx.strokeStyle="rgba(255,255,255,0.4)"; ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(cx-hw, cy-hd*0.42); ctx.lineTo(cx+hw, cy-hd*0.42);
      ctx.moveTo(cx-hw, cy+hd*0.42); ctx.lineTo(cx+hw, cy+hd*0.42);
      ctx.stroke();
      // center line under the net
      ctx.strokeStyle="rgba(255,255,255,0.7)"; ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.moveTo(cx-hw, cy); ctx.lineTo(cx+hw, cy); ctx.stroke();
      drawNet(cx, cy, hw);
    }
    function drawNet(cx, cy, hw){
      var netH=26, px=cx-hw, qx2=cx+hw, topY=cy-netH;
      // posts
      ctx.strokeStyle="rgba(74,58,46,0.9)"; ctx.lineWidth=2.6; ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(px, cy+2); ctx.lineTo(px, topY); ctx.moveTo(qx2, cy+2); ctx.lineTo(qx2, topY); ctx.stroke();
      // mesh (fine grid) — translucent so far-side players read through it
      ctx.strokeStyle="rgba(255,255,255,0.30)"; ctx.lineWidth=0.6;
      ctx.beginPath();
      for(var gx=px; gx<=qx2+0.1; gx+=5){ ctx.moveTo(gx, topY+3); ctx.lineTo(gx, cy); }
      for(var gy=topY+3; gy<=cy; gy+=4){ ctx.moveTo(px, gy); ctx.lineTo(qx2, gy); }
      ctx.stroke();
      // white top tape
      ctx.strokeStyle="rgba(255,255,255,0.96)"; ctx.lineWidth=2.6; ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(px, topY); ctx.lineTo(qx2, topY); ctx.stroke();
      // cardinal post caps
      ctx.fillStyle="rgba(140,21,21,0.92)";
      ctx.beginPath(); ctx.arc(px, topY, 2.2, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.arc(qx2, topY, 2.2, 0, 6.28); ctx.fill();
    }
    // ---- a pretty volleyball: shaded sphere + curved seams + ground shadow ----
    function drawBall(){
      if(!activeEvent || activeEvent.type!=="volleyball") return;
      var bx=ball.x*W, gy=ball.y*H, by=gy-ball.z, r=4.3;
      // ground shadow shrinks & fades with height
      var sc=clamp(1-ball.z/64, 0.25, 1);
      ctx.fillStyle="rgba(28,20,16,"+(0.20*sc).toFixed(3)+")";
      ctx.beginPath(); ctx.ellipse(bx, gy+1.5, 5.2*sc, 1.9*sc, 0, 0, 6.28); ctx.fill();
      // motion lines on a hard spike
      if(rally.spikeLines>0){
        ctx.strokeStyle="rgba(140,21,21,"+(0.5*rally.spikeLines/14).toFixed(3)+")"; ctx.lineWidth=1.3;
        ctx.beginPath();
        for(var m=0;m<3;m++){ var yy=by-3+m*3; ctx.moveTo(bx-(9+m*2.5), yy); ctx.lineTo(bx-3.5, yy); }
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(bx, by); ctx.rotate(ball.spin*0.25);
      // sphere body
      var g=ctx.createRadialGradient(-1.5,-1.5,0.4, 0,0,r);
      g.addColorStop(0,"#ffffff"); g.addColorStop(0.6,"#f3f1ea"); g.addColorStop(1,"#cdc7ba");
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,r,0,6.28); ctx.fill();
      // curved panel seams
      ctx.strokeStyle="rgba(120,110,95,0.7)"; ctx.lineWidth=0.7; ctx.lineCap="round";
      ctx.beginPath();
      ctx.moveTo(-r, 0); ctx.quadraticCurveTo(0, -r*0.55, r, 0);
      ctx.moveTo(-r*0.6, -r*0.9); ctx.quadraticCurveTo(-r*0.05, 0, -r*0.6, r*0.9);
      ctx.moveTo(r*0.6, -r*0.9); ctx.quadraticCurveTo(r*0.05, 0, r*0.6, r*0.9);
      ctx.stroke();
      // rim
      ctx.strokeStyle="rgba(180,172,158,0.6)"; ctx.lineWidth=0.5;
      ctx.beginPath(); ctx.arc(0,0,r,0,6.28); ctx.stroke();
      ctx.restore();
    }
    // ---- rave dance-floor, DJ booth & speakers (drawn on the ground, under dancers) ----
    function drawRaveFloor(){
      var rz=evZone(), rx=rz.x*W, ry=rz.y*H, fw=64, fh=30;
      ctx.fillStyle="rgba(18,14,28,0.88)"; rr(rx-fw/2, ry-fh/2, fw, fh, 7); ctx.fill();
      for(var ti=0;ti<5;ti++){ for(var tj=0;tj<3;tj++){ if((ti+tj)%2) continue;
        var hue=[300,195,48,160,278][(ti+tj)%5];
        var a=0.10+0.13*Math.abs(Math.sin(beat*6.28 + ti*0.8 + tj));
        ctx.fillStyle="hsla("+hue+",85%,58%,"+a.toFixed(3)+")";
        ctx.fillRect(rx-fw/2+ti*(fw/5), ry-fh/2+tj*(fh/3), fw/5-1, fh/3-1);
      } }
      ctx.strokeStyle="rgba(120,90,160,0.5)"; ctx.lineWidth=1.4; rr(rx-fw/2, ry-fh/2, fw, fh, 7); ctx.stroke();
      // DJ booth behind the floor
      var by2=ry-fh/2-9;
      ctx.fillStyle="rgba(28,22,42,0.96)"; rr(rx-16, by2-6, 32, 13, 3); ctx.fill();
      ctx.fillStyle="rgba(140,21,21,0.92)"; rr(rx-16, by2-6, 32, 3, 2); ctx.fill();
      ctx.fillStyle="rgba(58,52,74,1)";
      ctx.beginPath(); ctx.arc(rx-8, by2+1, 3, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.arc(rx+8, by2+1, 3, 0, 6.28); ctx.fill();
      ctx.fillStyle="rgba(210,210,220,0.9)";
      ctx.beginPath(); ctx.arc(rx-8, by2+1, 0.9, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.arc(rx+8, by2+1, 0.9, 0, 6.28); ctx.fill();
      // speakers + pulsing cones
      var pulse=0.5+0.5*Math.abs(Math.sin(beat*6.28));
      ctx.fillStyle="rgba(22,18,30,0.96)"; rr(rx-28, by2-3, 8, 16, 2); ctx.fill(); rr(rx+20, by2-3, 8, 16, 2); ctx.fill();
      ctx.fillStyle="rgba(140,21,21,"+(0.35*pulse).toFixed(3)+")";
      ctx.beginPath(); ctx.arc(rx-24, by2+5, 1.6+pulse*2.4, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.arc(rx+24, by2+5, 1.6+pulse*2.4, 0, 6.28); ctx.fill();
    }

    // ---------- characters ----------
    // resolveArm: pose.armL/armR may be {x,y} hand offset from the shoulder, OR a
    // numeric angle (0 = straight down, +PI/2 = out to the side, PI = straight up).
    function resolveArm(sx, sy, spec, side){
      if(spec && typeof spec === "object") return { x: sx + (spec.x||0)*side, y: sy + (spec.y||0) };
      return { x: sx + Math.sin(spec)*4.4*side, y: sy + Math.cos(spec)*4.4 };
    }
    function drawCharLabel(ag, gx, gy){
      ctx.fillStyle = "rgba(82,55,42,0.92)";
      ctx.font = (ag.you ? "600 " : "500 ") + "8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(ag.name, gx, gy + 14);
      if(ag.status && !ag.line){
        ctx.fillStyle = "rgba(120,100,86,0.7)"; ctx.font = "500 6.5px 'JetBrains Mono', monospace";
        ctx.fillText(ag.status, gx, gy + 22.5);
      }
    }
    /* drawChar: pose-driven sprite. Phase 3 sets ag.pose for volleyball/rave gameplay;
       when non-null it augments limb placement. All fields optional — a missing field
       falls back to act/T/ag.bob-derived animation, so drawChar is safe with pose null.
       Supported pose fields:
         jump     0..1     vertical lift of the whole body (1 ~= 10px up); shadow shrinks
         crouch   0..1     load/dig bend: lowers torso, shortens & spreads the legs
         lean     -1..1    horizontal torso lean (~3px each way) for weight shift
         legPhase radians  drives alternating leg stride (overrides the walk gait)
         armL     {x,y} hand offset from the LEFT shoulder, OR numeric angle (0 down, +PI/2 side, PI up)
         armR     {x,y} hand offset from the RIGHT shoulder, OR numeric angle (mirrored)
         kind     string   optional cosmetic hint ("spike","set","dig","bump","wave","clap")
       outfitFor(ag) supplies ALL clothing colors. */
    function drawChar(ag){
      var o = outfitFor(ag), c = ag.ch, pose = ag.pose || null, act = ag.act;
      var gx = ag.x*W, gy = ag.y*H, cx = gx;
      var swimming = (act==="swim");

      // ----- swimmer: horizontal freestyle in the pool -----
      if(swimming){
        var dir = ag.dir || 1, ph = T*0.16 + ag.bob, by = gy;
        // trailing wake ripple
        ctx.strokeStyle = "rgba(255,255,255,0.30)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx - dir*3, by + 1.5, 10, 3, 0, 0, 6.28); ctx.stroke();
        // flutter-kick splash at the feet
        var feetX = cx - dir*6.5;
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        for(var spk=0;spk<3;spk++){ var pr=(T*0.22 + spk*2.0)%5;
          ctx.beginPath(); ctx.arc(feetX - dir*pr, by + Math.sin(T*0.5+spk)*1.6, 0.9, 0, 6.28); ctx.fill(); }
        // torso (bare back) + swimsuit band
        ctx.fillStyle = c.skin; rr(cx-6, by-1.8, 12, 4, 2); ctx.fill();
        ctx.fillStyle = o.accent || c.swim; ctx.fillRect(cx + (dir<0?-6:2), by-1.8, 4, 4);
        // alternating freestyle arms (one over, one under)
        var stroke = Math.sin(ph), shx = cx + dir*3, shy = by - 0.5;
        ctx.strokeStyle = c.skin; ctx.lineWidth = 2; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(shx, shy); ctx.lineTo(shx + dir*5, shy - stroke*4 - 1);
        ctx.moveTo(shx, shy); ctx.lineTo(shx - dir*4, shy - stroke*3 + 2);
        ctx.stroke();
        // head at the front with periodic breathing turn to the side
        var turn = Math.sin(T*0.05 + ag.bob) > 0.55 ? 1 : 0;
        var hxn = cx + dir*6.6, hyn = by - 1.8 - turn*1.4;
        ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(hxn, hyn, 2.6, 0, 6.28); ctx.fill();
        ctx.fillStyle = c.hair; ctx.beginPath(); ctx.arc(hxn, hyn-0.4, 2.6, Math.PI*1.1, Math.PI*2.0); ctx.fill();
        if(ag.you){ ctx.strokeStyle="rgba(140,21,21,0.5)"; ctx.lineWidth=1.4; ctx.beginPath(); ctx.arc(hxn, hyn, 5.4, 0, 6.28); ctx.stroke(); }
        drawCharLabel(ag, gx, gy);
        return;
      }

      // ----- upright sprite -----
      var hr = ag.you ? 6 : 5.4;
      var seated = (act==="study"||act==="reading-book"||act==="reading-notes"||act==="hack"||act==="movie");
      // vertical bob / jump / lean / crouch
      var bob;
      if(ag.moving) bob = Math.sin(ag.bob)*1.1;
      else if(act==="dance") bob = Math.sin(T*0.25 + ag.bob)*2.4 + (beatDrop?-1.5:0);
      else if(act==="volleyball") bob = ag.pose ? Math.sin(T*0.04 + ag.bob)*0.5 : -Math.abs(Math.sin(T*0.12 + ag.bob))*3;
      else bob = Math.sin(T*0.03 + ag.bob)*0.5;           // gentle breathing idle
      var lift = (pose && pose.jump) ? pose.jump*10 : 0;
      var lean = (pose && pose.lean) ? pose.lean*3 : 0;
      var crouch = (pose && pose.crouch) ? pose.crouch : 0;
      var cy = gy + bob - lift + crouch*2;
      cx = gx + lean;

      // shadow (shrinks with jump)
      var sj = clamp(1 - lift/14, 0.45, 1);
      ctx.fillStyle = "rgba(28,20,16,0.13)";
      ctx.beginPath(); ctx.ellipse(gx, gy + 13, 7*sj, 2.1*sj, 0, 0, 6.28); ctx.fill();

      // legs (stroked → clear alternating gait)
      var legCol = o.bottom || c.skin, swing;
      if(pose && typeof pose.legPhase === "number") swing = Math.sin(pose.legPhase);
      else if(ag.moving) swing = Math.sin(ag.bob);
      else if(act==="dance") swing = Math.sin(T*0.25 + ag.bob);
      else swing = 0;
      var hipY = cy + 6, legLen = seated ? 3.2 : 5, spread = crouch*2;
      ctx.strokeStyle = legCol; ctx.lineWidth = 2.4; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx-1.4, hipY); ctx.lineTo(cx-1.4 - spread + swing*2.4, hipY + legLen);
      ctx.moveTo(cx+1.4, hipY); ctx.lineTo(cx+1.4 + spread - swing*2.4, hipY + legLen);
      ctx.stroke();

      // long hair behind torso
      if(c.long){ ctx.fillStyle = c.hair; rr(cx - hr - 1.5, cy - hr - 1, (hr+1.5)*2, hr + 9, 4); ctx.fill(); }

      // torso (top color; bare/suit when top===false)
      var torsoH = seated ? 7 : 8;
      if(o.top !== false){
        ctx.fillStyle = o.top; rr(cx-5, cy+1, 10, torsoH, 3); ctx.fill();
        if(o.accent && o.accent !== o.top){ ctx.fillStyle = o.accent; ctx.fillRect(cx-5, cy+1.4, 10, 1.6); }
      } else {
        ctx.fillStyle = c.skin; rr(cx-5, cy+1, 10, 6, 3); ctx.fill();
        if(o.accent){ ctx.fillStyle = o.accent; ctx.fillRect(cx-5, cy+4, 10, 2.4); }
      }

      // ---- arms: per-activity hand targets, then pose overrides ----
      var shY = cy+3, shLx = cx-4.5, shRx = cx+4.5;
      var hLx = cx-6, hLy = cy+6, hRx = cx+6, hRy = cy+6;
      var penX = cx-3 + ((T*0.5)%6);                       // writing pen sweep (reused below)
      if(ag.moving){
        var asw = Math.sin(ag.bob);
        hLx = cx-5.5; hLy = cy+6 + asw*1.6; hRx = cx+5.5; hRy = cy+6 - asw*1.6;   // opposite arm swing
      } else if(act==="study"){
        hRx = penX; hRy = cy+7 + Math.sin(T*0.7)*0.4; hLx = cx-3; hLy = cy+7;     // pen hand + steadying hand
      } else if(act==="hack"){
        hLx = cx-2.6; hLy = cy+6 - Math.abs(Math.sin(T*0.6))*1.2;
        hRx = cx+2.6; hRy = cy+6 - Math.abs(Math.sin(T*0.6+1.5))*1.2;             // finger taps
      } else if(act==="reading-book" || act==="reading-notes"){
        hLx = cx-3.6; hLy = cy+5; hRx = cx+3.6; hRy = cy+5;                       // holding the book up
      } else if(act==="workout"){
        var curl = Math.sin(T*0.16)*1.6; hLx = cx-7; hLy = cy+4-curl; hRx = cx+7; hRy = cy+4-curl;
      } else if(act==="coffee"){
        hRx = cx+4; hRy = cy+3 + Math.sin(T*0.05)*0.6; hLx = cx-6; hLy = cy+6;
      } else if(act==="phone"){
        hRx = cx+3; hRy = cy+3.5; hLx = cx-6; hLy = cy+6;
      } else if(act==="gossip"){
        hRx = cx+6; hRy = cy+4 - Math.abs(Math.sin(T*0.12))*2.2; hLx = cx-6; hLy = cy+6;
      } else if(act==="music"){
        var swy = Math.sin(T*0.08)*1.2; hLx = cx-6+swy; hLy = cy+6; hRx = cx+6+swy; hRy = cy+6;
      } else if(act==="dance"){
        var aw = Math.sin(T*0.25 + ag.bob)*3.2; hLx = cx-7; hLy = cy-2+aw; hRx = cx+7; hRy = cy-2-aw;
      } else if(act==="volleyball"){
        hLx = cx-5; hLy = cy-1; hRx = cx+5; hRy = cy-1;                           // arms up, ready
      } else {
        var br = Math.sin(T*0.04 + ag.bob)*0.5; hLy += br; hRy += br;             // idle breathing
      }
      if(pose){
        if(pose.armL != null){ var aL = resolveArm(shLx, shY, pose.armL, -1); hLx=aL.x; hLy=aL.y; }
        if(pose.armR != null){ var aR = resolveArm(shRx, shY, pose.armR,  1); hRx=aR.x; hRy=aR.y; }
      }
      var armCol = (o.top !== false) ? o.top : c.skin;
      ctx.strokeStyle = armCol; ctx.lineWidth = 2.4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(shLx, shY); ctx.lineTo(hLx, hLy); ctx.moveTo(shRx, shY); ctx.lineTo(hRx, hRy); ctx.stroke();
      ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(hLx, hLy, 1.1, 0, 6.28); ctx.arc(hRx, hRy, 1.1, 0, 6.28); ctx.fill();

      // scarf (winter / outfit-driven)
      if(o.scarf){ ctx.fillStyle = o.scarf; ctx.fillRect(cx-4, cy+0.4, 8, 2.2); ctx.fillRect(cx+1.4, cy+1.4, 2.2, 4); }

      // head
      var hy = cy - hr + 1;
      ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(cx, hy, hr, 0, 6.28); ctx.fill();
      // hair cap
      ctx.fillStyle = c.hair; ctx.beginPath(); ctx.arc(cx, hy, hr+0.4, Math.PI, 2*Math.PI); ctx.closePath(); ctx.fill();
      ctx.fillRect(cx-hr, hy-0.3, hr*2, 2.1);
      // beanie / hat (outfit-driven)
      if(o.hat){
        ctx.fillStyle = o.hat;
        ctx.beginPath(); ctx.arc(cx, hy-0.4, hr+0.7, Math.PI, 2*Math.PI); ctx.closePath(); ctx.fill();
        ctx.fillRect(cx-hr-0.7, hy-1.4, (hr+0.7)*2, 2);
        ctx.beginPath(); ctx.arc(cx, hy-hr-1.4, 1.4, 0, 6.28); ctx.fill();        // pom
      }
      // headphones for music
      if(act==="music"){
        ctx.strokeStyle="#2a2a2a"; ctx.lineWidth=1.4;
        ctx.beginPath(); ctx.arc(cx, hy-0.5, hr+1.4, Math.PI*1.05, Math.PI*1.95); ctx.stroke();
        ctx.fillStyle="#2a2a2a"; ctx.beginPath(); ctx.arc(cx-hr-0.6, hy, 1.6, 0, 6.28); ctx.arc(cx+hr+0.6, hy, 1.6, 0, 6.28); ctx.fill();
      }
      // eyes
      var down = (act==="reading-book"||act==="reading-notes"||act==="study"||act==="phone"||act==="hack");
      var ex = hr*0.42, ey = hy + (down?2.4:1.4);
      if(act==="sleep"){
        ctx.strokeStyle="#241a16"; ctx.lineWidth=0.8;
        ctx.beginPath(); ctx.moveTo(cx-ex-1,ey); ctx.lineTo(cx-ex+1,ey); ctx.moveTo(cx+ex-1,ey); ctx.lineTo(cx+ex+1,ey); ctx.stroke();
      } else {
        ctx.fillStyle="#241a16";
        ctx.beginPath(); ctx.arc(cx-ex, ey, 0.95, 0, 6.28); ctx.arc(cx+ex, ey, 0.95, 0, 6.28); ctx.fill();
      }
      // mouth (open "O" when singing)
      if(pose && pose.kind==="sing"){ ctx.fillStyle="rgba(90,40,35,0.85)"; ctx.beginPath(); ctx.ellipse(cx, ey+2, 1.2, 1.7, 0, 0, 6.28); ctx.fill(); }
      else if(act!=="sleep"){ ctx.strokeStyle="rgba(150,70,55,0.7)"; ctx.lineWidth=0.7; ctx.beginPath(); ctx.arc(cx, ey+1.5, 1.3, 0.15*Math.PI, 0.85*Math.PI); ctx.stroke(); }

      // ---- props ----
      if(act==="study"){
        ctx.fillStyle="#f4efe4"; ctx.strokeStyle="rgba(40,30,20,0.5)"; ctx.lineWidth=0.8;
        rr(cx-4.5, cy+7, 9, 4, 1); ctx.fill(); ctx.stroke();
        ctx.strokeStyle="rgba(60,60,80,0.55)"; ctx.lineWidth=0.5;
        ctx.beginPath(); ctx.moveTo(cx-3, cy+9); ctx.lineTo(penX, cy+9); ctx.stroke();           // ink trail
        ctx.strokeStyle="#8C1515"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(penX, cy+9); ctx.lineTo(penX+1.2, cy+6.6); ctx.stroke(); // pen
      } else if(act==="hack"){
        ctx.fillStyle="#2a2f38"; rr(cx-4.5, cy+7.4, 9, 1.8, 0.5); ctx.fill();                    // keyboard base
        ctx.fillStyle="#11151b"; rr(cx-4, cy+3.4, 8, 4.6, 0.6); ctx.fill();                      // screen shell
        var flk = 0.6 + 0.4*Math.abs(Math.sin(T*0.3));
        ctx.fillStyle="rgba(120,200,255,"+(0.35+0.4*flk).toFixed(3)+")"; ctx.fillRect(cx-3.4, cy+3.9, 6.8, 3.4);
      } else if(act==="reading-book" || act==="reading-notes"){
        ctx.fillStyle = act==="reading-book" ? "#3f6ea5" : "#f4efe4";
        ctx.strokeStyle="rgba(40,30,20,0.5)"; ctx.lineWidth=0.8;
        rr(cx-4.5, cy+3.6, 9, 5, 1); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy+3.6); ctx.lineTo(cx, cy+8.6); ctx.stroke();
        var flip=(T*0.02 + ag.bob)%1;                                                            // occasional page turn
        if(flip<0.16){ ctx.fillStyle="rgba(255,255,255,0.75)"; ctx.beginPath(); ctx.moveTo(cx, cy+3.8); ctx.lineTo(cx+4*(flip/0.16), cy+4.2); ctx.lineTo(cx, cy+8.4); ctx.closePath(); ctx.fill(); }
      } else if(act==="phone"){
        ctx.fillStyle="#20242e"; rr(cx+2.2, cy+2.6, 3, 5, 1); ctx.fill();
      } else if(act==="workout"){
        ctx.strokeStyle="#3a3330"; ctx.lineWidth=1.6;
        ctx.beginPath(); ctx.moveTo(hLx, hLy); ctx.lineTo(hRx, hRy); ctx.stroke();
        ctx.fillStyle="#3a3330"; ctx.fillRect(hLx-1, hLy-2, 2, 4); ctx.fillRect(hRx-1, hRy-2, 2, 4);
      } else if(act==="coffee"){
        ctx.fillStyle="#fff"; ctx.strokeStyle="#caa"; ctx.lineWidth=0.8; rr(hRx-1.6, hRy-1.6, 3.2, 3.2, 0.6); ctx.fill(); ctx.stroke();
      } else if(act==="sleep"){
        var zp=(T*0.02 + ag.bob)%1; ctx.fillStyle="rgba(120,100,86,"+(0.7*(1-zp)).toFixed(3)+")"; ctx.font="6px 'JetBrains Mono', monospace"; ctx.textAlign="center"; ctx.fillText("z", cx+5+zp*3, cy-4-zp*7);
      }

      // umbrella (rain, walking outdoors)
      if(o.umbrella){
        var uy = hy - hr - 3;
        ctx.fillStyle = o.umbrella; ctx.beginPath(); ctx.arc(cx, uy, 7.5, Math.PI, 2*Math.PI); ctx.closePath(); ctx.fill();
        ctx.strokeStyle="rgba(40,30,20,0.45)"; ctx.lineWidth=0.7; ctx.beginPath(); ctx.moveTo(cx-7.5,uy); ctx.lineTo(cx+7.5,uy); ctx.stroke();
        ctx.strokeStyle="rgba(60,45,35,0.7)"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(cx, uy); ctx.lineTo(cx, cy+1); ctx.stroke();
      }

      // "you" halo + labels
      if(ag.you){ ctx.strokeStyle="rgba(140,21,21,0.5)"; ctx.lineWidth=1.4; ctx.beginPath(); ctx.arc(cx, hy, hr+4, 0, 6.28); ctx.stroke(); }
      drawCharLabel(ag, gx, gy);
    }
    function drawSpeech(ag){
      if(!ag.line || ag.moving) return;
      var cx = ag.x*W, cy = ag.y*H - (ag.you ? 6 : 5.4);
      ctx.font = "500 8.5px 'JetBrains Mono', monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      var w = ctx.measureText(ag.line).width + 12;
      ctx.fillStyle = "rgba(255,255,255,0.98)";
      ctx.strokeStyle = "rgba(140,21,21,0.25)"; ctx.lineWidth = 1;
      rr(cx - w/2, cy - 24, w, 15, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-3, cy-9); ctx.lineTo(cx+3, cy-9); ctx.lineTo(cx, cy-5); ctx.closePath();
      ctx.fillStyle = "rgba(255,255,255,0.98)"; ctx.fill();
      ctx.fillStyle = "rgba(110,16,16,0.95)";
      ctx.fillText(ag.line, cx, cy - 16.5);
    }
    function drawLinks(){
      ctx.lineWidth = 1.2;
      for(var a=0;a<agents.length;a++){
        for(var b=a+1;b<agents.length;b++){
          var ax=agents[a], bx=agents[b];
          var dx=ax.x-bx.x, dy=ax.y-bx.y, d=Math.hypot(dx,dy);
          var partners = (ax.partner===b || bx.partner===a);
          if(d < .14 || partners){
            var al = partners ? 0.5 : (1 - d/.14) * 0.4;
            if(al<=0) continue;
            ctx.strokeStyle = "rgba(184,50,74," + al.toFixed(3) + ")";
            if(!partners){ ctx.setLineDash([3,4]); }
            ctx.beginPath(); ctx.moveTo(ax.x*W, ax.y*H); ctx.lineTo(bx.x*W, bx.y*H); ctx.stroke(); ctx.setLineDash([]);
            if(partners && !ax.moving && !bx.moving){
              var mx=(ax.x+bx.x)/2*W, my=(ax.y+bx.y)/2*H;
              ctx.fillStyle="rgba(184,50,74,0.6)";
              ctx.beginPath(); ctx.arc(mx, my-1, 1.6, 0, 6.28); ctx.fill();
            }
          }
        }
      }
    }

    // ---------- additive light pass ----------
    function nightOverlay(){
      if(nf<=0.01) return;
      ctx.fillStyle = "rgba(14,18,44," + (nf*0.6).toFixed(3) + ")";
      ctx.fillRect(0,0,W,H);
    }
    function lighter(fn){ ctx.save(); ctx.globalCompositeOperation = "lighter"; fn(); ctx.restore(); }
    function drawStars(){
      if(nf < 0.4) return;
      var a = (nf-0.4)/0.6;
      for(var i=0;i<stars.length;i++){ var s=stars[i], tw=0.5+0.5*Math.sin(T*0.05+s.p);
        ctx.fillStyle="rgba(255,255,240,"+(a*tw*0.85).toFixed(3)+")"; ctx.fillRect(s.x*W, s.y*H, 1.6,1.6);
      }
    }
    function drawCelestial(){
      if(light>0.32){
        var p=clamp((clock-.20)/.62,0,1);
        var sx=W*(.12+.76*p), sy=H*.16 - Math.sin(p*Math.PI)*H*.1;
        ctx.fillStyle="rgba(255,224,130,0.9)"; ctx.beginPath(); ctx.arc(sx,sy,10,0,6.28); ctx.fill();
        ctx.fillStyle="rgba(255,224,130,0.16)"; ctx.beginPath(); ctx.arc(sx,sy,24,0,6.28); ctx.fill();
      } else {
        var np = clock<.20 ? (clock+.18)/.40 : (clock-.82)/.40; np=clamp(np,0,1);
        var mx=W*(.16+.68*np), my=H*.15 - Math.sin(np*Math.PI)*H*.07;
        ctx.fillStyle="rgba(226,232,255,0.95)"; ctx.beginPath(); ctx.arc(mx,my,8,0,6.28); ctx.fill();
        ctx.fillStyle="rgba(200,214,255,0.16)"; ctx.beginPath(); ctx.arc(mx,my,20,0,6.28); ctx.fill();
      }
    }
    function drawFairyBulbs(){
      if(nf<0.15) return;
      for(var i=0;i<fairy.length;i++){ var b=fairy[i];
        var tw=0.55+0.45*Math.sin(T*0.06+b.p), a=nf*tw;
        ctx.fillStyle="hsla("+b.hue+",90%,62%,"+(a*0.9).toFixed(3)+")";
        ctx.beginPath(); ctx.arc(b.x,b.y,2.3,0,6.28); ctx.fill();
        ctx.fillStyle="hsla("+b.hue+",90%,62%,"+(a*0.22).toFixed(3)+")";
        ctx.beginPath(); ctx.arc(b.x,b.y,6,0,6.28); ctx.fill();
      }
    }
    function drawWindowGlow(){
      if(nf<0.15) return;
      for(var i=0;i<ZONES.length;i++){ var z=ZONES[i]; if(z.type==="pool") continue;
        var cx=z.x*W, cy=z.y*H, wt=cy-4;
        var pts=[[cx-17,wt+5],[cx+10,wt+5]];
        if(z.type==="dorm") pts.push([cx-3.5,wt+5],[cx-17,wt+15],[cx+10,wt+15]);
        for(var k=0;k<pts.length;k++){ var fl=0.82+0.18*Math.sin(T*0.12+pts[k][0]);
          ctx.fillStyle="rgba(255,196,90,"+(nf*0.5*fl).toFixed(3)+")"; ctx.fillRect(pts[k][0]-1.5, pts[k][1]-1.5, 10, 10);
        }
      }
    }
    function drawLampGlow(){
      if(nf<0.15) return;
      for(var i=0;i<lamps.length;i++){ var l=lamps[i];
        var g=ctx.createRadialGradient(l.x,l.y-22,2,l.x,l.y-10,40);
        g.addColorStop(0,"rgba(255,210,130,"+(nf*0.5)+")"); g.addColorStop(1,"rgba(255,210,130,0)");
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(l.x,l.y-14,40,0,6.28); ctx.fill();
      }
    }
    function drawDeviceGlow(){
      for(var i=0;i<agents.length;i++){ var ag=agents[i]; if(ag.moving) continue;
        var cx=ag.x*W, cy=ag.y*H;
        if(ag.act==="phone"){ ctx.fillStyle="rgba(150,200,255,"+(0.4+0.4*nf)+")"; ctx.beginPath(); ctx.arc(cx+4, cy+5, 4, 0, 6.28); ctx.fill(); }
        else if(ag.act==="hack"){ ctx.fillStyle="rgba(120,200,255,"+(0.45+0.35*nf)+")"; ctx.beginPath(); ctx.arc(cx, cy+4, 5, 0, 6.28); ctx.fill(); }
      }
    }
    function drawRave(){
      if(!activeEvent || activeEvent.type!=="rave") return;
      var rz=evZone(), qx=rz.x*W, qy=rz.y*H;
      for(var b=0;b<4;b++){
        var ang=T*0.03 + b*Math.PI/2, hue=[330,200,50,140][b];
        ctx.fillStyle="hsla("+hue+",90%,60%,"+(0.10+0.06*Math.sin(beat*6.28+b)).toFixed(3)+")";
        ctx.beginPath(); ctx.moveTo(qx,qy-6);
        ctx.lineTo(qx+Math.cos(ang)*140, qy+Math.sin(ang)*78-54);
        ctx.lineTo(qx+Math.cos(ang+0.30)*140, qy+Math.sin(ang+0.30)*78-54);
        ctx.closePath(); ctx.fill();
      }
      // pulsing colored glow on the floor
      ctx.fillStyle="hsla("+((T*2)%360)+",80%,60%,0.06)";
      ctx.beginPath(); ctx.ellipse(qx, qy, 42, 18, 0, 0, 6.28); ctx.fill();
      // strobe flash synced to the drop
      if(beatDrop){ ctx.fillStyle="rgba(255,255,255,0.14)"; ctx.fillRect(0,0,W,H); }
    }
    function drawNotes(){
      // floating music notes for music/dance agents
      for(var i=0;i<agents.length;i++){ var ag=agents[i];
        if((ag.act==="music"||ag.act==="dance") && !ag.moving){
          var cx=ag.x*W, cy=ag.y*H, ph=(T*0.04+i)%3;
          ctx.fillStyle="rgba(184,50,74,"+(0.5*(1-ph/3)).toFixed(3)+")";
          ctx.font="9px 'JetBrains Mono', monospace"; ctx.textAlign="center";
          ctx.fillText("♪", cx+6+Math.sin(ph*3)*2, cy-12-ph*5);
        }
      }
    }
    function drawFireflies(){
      if(season!=="summer" || nf<0.3) return;
      for(var i=0;i<flies.length;i++){ var f=flies[i], tw=0.4+0.6*Math.abs(Math.sin(T*0.04+f.p));
        ctx.fillStyle="rgba(190,230,120,"+(nf*tw*0.7).toFixed(3)+")";
        ctx.beginPath(); ctx.arc(f.x*W, f.y*H, 1.6, 0, 6.28); ctx.fill();
      }
    }
    function drawFireworks(){
      for(var i=0;i<fworks.length;i++){ var p=fworks[i];
        ctx.fillStyle="hsla("+p.hue+",90%,65%,"+clamp(p.life/40,0,1).toFixed(3)+")";
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, 6.28); ctx.fill();
      }
    }
    function drawSnow(){
      if(season!=="winter") return;
      ctx.fillStyle="rgba(255,255,255,0.9)";
      for(var i=0;i<snow.length;i++){ var s=snow[i]; ctx.beginPath(); ctx.arc(s.x*W, s.y*H, 1.4, 0, 6.28); ctx.fill(); }
    }
    function drawRain(){
      if(weather!=="rain") return;
      // cool translucent overlay desaturates the daytime palette
      ctx.fillStyle="rgba(70,90,110,0.16)"; ctx.fillRect(0,0,W,H);
      // puddles with expanding ripple rings
      for(var p=0;p<puddles.length;p++){ var pd=puddles[p];
        ctx.fillStyle="rgba(120,150,170,0.22)";
        ctx.beginPath(); ctx.ellipse(pd.x*W, pd.y*H, pd.r, pd.r*0.34, 0, 0, 6.28); ctx.fill();
        var rp=(T*0.02 + pd.phase)%1;
        ctx.strokeStyle="rgba(200,220,235,"+(0.4*(1-rp)).toFixed(3)+")"; ctx.lineWidth=0.8;
        ctx.beginPath(); ctx.ellipse(pd.x*W, pd.y*H, pd.r*rp, pd.r*0.34*rp, 0, 0, 6.28); ctx.stroke();
      }
      // slanted raindrop streaks (one batched path)
      ctx.strokeStyle="rgba(180,200,220,0.42)"; ctx.lineWidth=1; ctx.lineCap="round";
      ctx.beginPath();
      for(var i=0;i<rain.length;i++){ var r=rain[i], x=r.x*W, y=r.y*H;
        ctx.moveTo(x, y); ctx.lineTo(x-3.2, y+r.len);
      }
      ctx.stroke();
      // ground splash ticks
      ctx.strokeStyle="rgba(200,220,235,0.5)";
      ctx.beginPath();
      for(var s=0;s<splashes.length;s++){ var sp=splashes[s]; if(sp.life<=0) continue;
        var sx=sp.x*W, sy=sp.y*H;
        ctx.moveTo(sx-2, sy); ctx.lineTo(sx, sy-2.5); ctx.moveTo(sx+2, sy); ctx.lineTo(sx, sy-2.5);
      }
      ctx.stroke();
    }
    function drawEventBanner(){
      if(!activeEvent) return;
      var z = activeEvent.zi==="quad" ? QUAD : ZONES[activeEvent.zi];
      var bx=z.x*W, by=z.y*H-34;
      ctx.font="600 8.5px 'JetBrains Mono', monospace"; ctx.textAlign="center"; ctx.textBaseline="middle";
      var w=ctx.measureText(activeEvent.label).width+16;
      ctx.fillStyle="rgba(140,21,21,0.92)"; rr(bx-w/2, by-9, w, 18, 9); ctx.fill();
      ctx.fillStyle="#fff"; ctx.fillText(activeEvent.label, bx, by);
    }

    // ---------- volleyball: court geometry, ball physics & rally state machine ----------
    var VB = { hw:.135, hd:.10 };                                       // court half-width / half-depth (fractional)
    var NEAR_SLOTS = [{x:0,y:.050},{x:-.10,y:.072},{x:.092,y:.094}];    // team 0 (near side, +y)
    var FAR_SLOTS  = [{x:0,y:-.050},{x:.10,y:-.072},{x:-.092,y:-.094}]; // team 1 (far side, -y)
    var VB_CHEER_CH = ["kill!","that's the point!","too easy!","mine!"];
    var VB_CHEER_TM = ["nice!","great spike!","let's go!","yes!"];
    var VB_CHEER_WT = ["yeahh!","unreal!","let's gooo","point!"];
    var RAVE_LINES  = ["la la la~","turn it up!","tune!","let's gooo","one more!","feel it","drop incoming","ayy!"];
    // single reused ball object: ground x,y (fractional) + height z (px) along a parabola
    var ball  = { x:.5, y:.54, z:0, sx:.5, sy:.54, sz:0, ex:.5, ey:.54, peak:30, ft:0, fd:30, spin:0 };
    var rally = { phase:"idle", team:0, hitter:-1, servingTeam:0, cdT:0, contactIdx:-1, contactT:99, contactKind:"", spikeLines:0 };

    function teamPlayers(team){ var r=[]; for(var i=0;i<agents.length;i++){ var a=agents[i]; if(a.role==="play" && a.team===team) r.push(a); } return r; }
    function assignSlots(list, slots){
      list.sort(function(a,b){ return ((b.idx===0||b.idx===4)?1:0) - ((a.idx===0||a.idx===4)?1:0); });  // champ takes the front slot
      for(var k=0;k<list.length;k++){ var s=slots[k%slots.length], ag=list[k];
        ag.hx=clamp(QUAD.x+s.x, .05,.95); ag.hy=clamp(QUAD.y+s.y, .12,.9);
        ag.tx=ag.hx; ag.ty=ag.hy; ag.moveDelay=0;
      }
    }
    function placeVB(){
      assignSlots(teamPlayers(0), NEAR_SLOTS);
      assignSlots(teamPlayers(1), FAR_SLOTS);
      var watch=[]; for(var i=0;i<agents.length;i++){ if(agents[i].role==="watch") watch.push(agents[i]); }
      for(var w=0;w<watch.length;w++){ var ag=watch[w];                        // seated spectator row on the sideline
        ag.hx=clamp(QUAD.x - (watch.length-1)*0.035 + w*0.07, .05,.95);
        ag.hy=clamp(QUAD.y + VB.hd + 0.075, .12,.9);
        ag.tx=ag.hx; ag.ty=ag.hy; ag.moveDelay=0;
      }
    }
    function courtPoint(team){
      var x = QUAD.x + rnd(-VB.hw*0.78, VB.hw*0.78);
      var y = (team===0) ? QUAD.y + rnd(0.028, VB.hd*0.9) : QUAD.y - rnd(0.028, VB.hd*0.9);
      return { x:clamp(x,.05,.95), y:clamp(y,.12,.9) };
    }
    function nearestPlayer(team, x, y){
      var pl=teamPlayers(team), best=pl[0], bd=1e9;
      for(var i=0;i<pl.length;i++){ var d=Math.hypot(pl[i].hx-x, pl[i].hy-y); if(d<bd){ bd=d; best=pl[i]; } }
      return best || agents[team===0?0:4];
    }
    function frontPlayer(team, notAg){                                         // setter: closest to net, prefer non-bumper
      var pl=teamPlayers(team), best=null, bd=1e9;
      for(var i=0;i<pl.length;i++){ var a=pl[i]; if(a===notAg) continue;
        var d=Math.abs(a.hy-QUAD.y); if(d<bd){ bd=d; best=a; } }
      return best || notAg;
    }
    function attacker(team, notAg){                                            // champ spikes when available
      var champ = agents[team===0?0:4];
      if(champ && champ.role==="play" && champ.team===team && champ!==notAg) return champ;
      return frontPlayer(team, notAg);
    }
    function launchBall(sx,sy,sz, ex,ey, peak, dur){
      ball.sx=sx; ball.sy=sy; ball.sz=sz; ball.ex=ex; ball.ey=ey;
      ball.x=sx; ball.y=sy; ball.z=sz; ball.peak=peak; ball.fd=Math.max(8,dur); ball.ft=0;
    }
    function serveRally(team){
      rally.servingTeam=team; rally.contactT=99; rally.spikeLines=0;
      var pl=teamPlayers(team); if(!pl.length){ rally.phase="idle"; return; }
      var srv=pl[0], bd=-1;
      for(var i=0;i<pl.length;i++){ var d=Math.abs(pl[i].hy-QUAD.y); if(d>bd){ bd=d; srv=pl[i]; } }   // back player serves
      var recvTeam = team===0?1:0, land=courtPoint(recvTeam), recv=nearestPlayer(recvTeam, land.x, land.y);
      rally.phase="bump"; rally.team=recvTeam; rally.hitter=recv.idx;
      rally.contactIdx=srv.idx; rally.contactT=0; rally.contactKind="serve";
      launchBall(srv.hx, srv.hy, 7, land.x, land.y, 44, 48);
    }
    function endRallyPoint(team, hitter){
      var champ=(hitter.idx===0||hitter.idx===4);
      hitter.line = VB_CHEER_CH[(Math.random()*VB_CHEER_CH.length)|0]; hitter.lineT=70;
      var tm=teamPlayers(team);
      for(var i=0;i<tm.length;i++){ var a=tm[i]; if(a!==hitter && Math.random()<0.5){ a.line=VB_CHEER_TM[(Math.random()*VB_CHEER_TM.length)|0]; a.lineT=60; } }
      for(var w=0;w<agents.length;w++){ var ag=agents[w]; if(ag.role==="watch" && Math.random()<0.7){ ag.line=VB_CHEER_WT[(Math.random()*VB_CHEER_WT.length)|0]; ag.lineT=70; } }
      rally.servingTeam=team;                                                  // winners serve next
      if(champ){ rally.spikeLines=14; var hx=hitter.hx*W, hy=hitter.hy*H-12;   // sparkle on a champ kill
        for(var k=0;k<10;k++){ var an=Math.random()*6.28, sp=rnd(.4,1.6);
          fworks.push({x:hx,y:hy,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp-0.4,life:34,hue:46}); } }
    }
    function resolveContact(){
      var phase=rally.phase, team=rally.team, hitter=agents[rally.hitter];
      if(!hitter){ rally.phase="dead"; rally.cdT=50; return; }
      rally.contactIdx=hitter.idx; rally.contactT=0; rally.contactKind=phase;
      if(phase==="bump"){
        var setter=frontPlayer(team, hitter);
        rally.phase="set"; rally.hitter=setter.idx; rally.team=team;
        launchBall(hitter.hx, hitter.hy, 6, setter.hx, setter.hy, 24, 26);
      } else if(phase==="set"){
        var atk=attacker(team, hitter);
        rally.phase="spike"; rally.hitter=atk.idx; rally.team=team;
        launchBall(hitter.hx, hitter.hy, 9, atk.hx, atk.hy-0.008, 30, 24);
      } else if(phase==="spike"){
        var champ=(hitter.idx===0||hitter.idx===4), opp=team===0?1:0, land=courtPoint(opp);
        var lift=(champ?13:9), kill=Math.random() < (champ?0.55:0.30);
        if(champ) rally.spikeLines=14;
        if(kill){ endRallyPoint(team, hitter); rally.phase="kill";
          launchBall(hitter.hx, hitter.hy, lift, land.x, land.y, champ?40:30, champ?26:24);
        } else {
          var recv=nearestPlayer(opp, land.x, land.y);
          rally.phase="bump"; rally.hitter=recv.idx; rally.team=opp;
          launchBall(hitter.hx, hitter.hy, lift, land.x, land.y, champ?40:30, champ?30:28);
        }
      } else if(phase==="kill"){
        rally.phase="dead"; rally.cdT=64;
      }
    }
    function setReady(ag){
      ag.pose = ag.pose || {};
      var p=ag.pose; p.jump=0; p.crouch=0.28; p.lean=clamp((ball.x-ag.x)*6,-1,1);
      p.legPhase=T*0.12 + ag.bob; p.armL=0.55; p.armR=0.55; p.kind="";
    }
    function setContactPose(ag, kind, intn){
      ag.pose = ag.pose || {}; var p=ag.pose; p.kind=kind; p.lean=0;
      if(kind==="bump" || kind==="serve"){ p.crouch=0.5; p.jump=(kind==="serve"?0.2:0); p.armL={x:-2,y:5}; p.armR={x:-2,y:5}; p.legPhase=0; }
      else if(kind==="set"){ p.crouch=0.15; p.jump=0; p.armL={x:-1.5,y:-6}; p.armR={x:-1.5,y:-6}; p.legPhase=0; }
      else if(kind==="spike"){ var champ=(ag.idx===0||ag.idx===4); p.crouch=0; p.jump=(champ?1.3:0.85)*intn; p.armR={x:1,y:-8}; p.armL={x:-3,y:2}; p.legPhase=0.6; }
    }
    function driveVBPlayers(){
      var landing = (rally.phase==="dead");
      for(var i=0;i<agents.length;i++){
        var ag=agents[i];
        if(ag.act!=="volleyball") continue;
        if(ag.lineT>0){ ag.lineT--; if(ag.lineT<=0) ag.line=""; }
        if(ag.role==="watch"){                                                 // spectators sit, track the ball, clap on points
          ag.tx=ag.hx; ag.ty=ag.hy; ag.pose = ag.pose || {};
          var pw=ag.pose; pw.crouch=0.58; pw.jump=0; pw.legPhase=0; pw.kind="";
          pw.lean=clamp((ball.x-ag.x)*5,-1,1);
          if(rally.phase==="dead" && (T%18)<9){ pw.armL={x:-3,y:-2}; pw.armR={x:-3,y:-2}; }
          else { pw.armL={x:-2,y:3}; pw.armR={x:-2,y:3}; }
          continue;
        }
        if(ag.idx===rally.contactIdx && rally.contactT<12){                    // just contacted: hold the strike pose
          setContactPose(ag, rally.contactKind, clamp(1-rally.contactT/12,0.3,1));
          ag.tx=ag.x; ag.ty=ag.y; continue;
        }
        if(!landing && ag.idx===rally.hitter && rally.phase!=="idle"){         // upcoming contacter: chase & pre-load
          ag.tx=clamp(ball.ex,.05,.95); ag.ty=clamp(ball.ey,.12,.9);
          var pr=clamp(ball.ft/ball.fd,0,1);
          if(rally.phase==="spike") setContactPose(ag,"spike",pr);
          else if(rally.phase==="set"){ if(pr>0.6) setContactPose(ag,"set",1); else setReady(ag); }
          else { if(pr>0.65) setContactPose(ag,"bump",1); else setReady(ag); }
          continue;
        }
        ag.tx=ag.hx; ag.ty=ag.hy; setReady(ag);                                // hold formation, stay ready
      }
    }
    function updateRally(){
      if(rally.phase==="idle"){ placeVB(); serveRally(0); }
      if(rally.phase==="dead"){
        rally.cdT--; if(rally.cdT<=0) serveRally(rally.servingTeam);
      } else {
        ball.ft++; ball.spin+=0.35;
        var p=clamp(ball.ft/ball.fd,0,1);
        ball.x=lerp(ball.sx,ball.ex,p); ball.y=lerp(ball.sy,ball.ey,p);
        ball.z=lerp(ball.sz,0,p) + 4*ball.peak*p*(1-p);
        if(p>=1) resolveContact();
      }
      if(rally.spikeLines>0) rally.spikeLines--;
      rally.contactT++;
      driveVBPlayers();
    }
    // ---------- rave: per-agent dancing driven by the global beat ----------
    function updateDance(){
      for(var i=0;i<agents.length;i++){
        var ag=agents[i];
        if(ag.act!=="dance" || ag.moving) continue;                            // settle onto the floor first
        if(ag.danceStyle==null) ag.danceStyle = ag.idx%4;
        var hyped=(ag.mood==="hyped"), low=(ag.mood==="tired"||ag.mood==="sick");
        var amp = hyped ? 1.3 : (low?0.42:1)*(0.7+ag.energy*0.4);
        var b=beat*6.28, st=ag.danceStyle, sing=(ag.idx%3===0);
        ag.pose = ag.pose || {}; var p=ag.pose;
        p.legPhase = beat*6.28*2 + ag.idx;                                     // footwork to the beat
        p.crouch = 0.12 + 0.06*Math.sin(b*2+ag.idx);
        p.lean = Math.sin(b+ag.idx)*0.4*amp;
        p.jump = 0; p.kind = sing ? "sing" : "";
        if(st===0){ p.armL = Math.PI*0.78 + Math.sin(b+ag.idx)*0.45*amp; p.armR = Math.PI*0.78 - Math.sin(b+ag.idx)*0.45*amp; }      // hands-up sway
        else if(st===1){ var cl=Math.abs(Math.sin(b)); p.armL={x:-2-cl*1.5,y:-1+cl*0.5}; p.armR={x:-2-cl*1.5,y:-1+cl*0.5}; }       // clap
        else if(st===2){ p.armR = Math.PI/2 + Math.abs(Math.sin(b))*Math.PI/2*amp; p.armL={x:-2,y:3}; }                            // fist pump
        else { p.armL = Math.PI*0.62 + Math.sin(b+ag.idx)*0.7*amp; p.armR = Math.PI*0.62 + Math.sin(b+ag.idx+1.6)*0.7*amp; }       // wave
        if(beatDrop){ p.jump = (hyped?0.95:(low?0.25:0.6))*amp; p.armL=Math.PI*0.92; p.armR=Math.PI*0.92; }
        if(ag.lineT>0){ ag.lineT--; if(ag.lineT<=0) ag.line=""; }
        else if(Math.random()<0.01){ ag.line=RAVE_LINES[(Math.random()*RAVE_LINES.length)|0]; ag.lineT=(rnd(60,110))|0; }
      }
    }
    function updateEffects(){
      // fireworks during rave
      if(activeEvent && activeEvent.type==="rave" && Math.random()<0.05){
        var ox=rnd(.3,.7)*W, oy=rnd(.12,.32)*H, hue=[330,200,50,140,280][(Math.random()*5)|0];
        for(var k=0;k<14;k++){ var an=Math.random()*6.28, sp=rnd(.5,2.2);
          fworks.push({x:ox,y:oy,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,life:40,hue:hue});
        }
      }
      for(var i=fworks.length-1;i>=0;i--){ var p=fworks[i];
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.04; p.vx*=0.97; p.vy*=0.97; p.life--;
        if(p.life<=0) fworks.splice(i,1);
      }
      // snow drift
      for(var s=0;s<snow.length;s++){ var sn=snow[s]; sn.y+=sn.v; sn.x+=Math.sin(T*0.02+sn.d)*0.0006;
        if(sn.y>1){ sn.y=0; sn.x=Math.random(); } }
      // fireflies drift
      for(var f=0;f<flies.length;f++){ var fl=flies[f]; fl.x+=fl.sx; fl.y+=fl.sy;
        if(fl.x<.05||fl.x>.95) fl.sx*=-1; if(fl.y<.4||fl.y>.92) fl.sy*=-1; }
      // rain fall + ground splashes (only while raining)
      if(weather==="rain"){
        for(var rd=0;rd<rain.length;rd++){ var r=rain[rd]; r.y+=r.v; r.x-=0.004;
          if(r.y>1 || r.x<-0.05){
            var sp=splashes[splashI]; sp.x=clamp(r.x,.02,.98); sp.y=rnd(.55,.96); sp.life=8; splashI=(splashI+1)%splashes.length;
            r.y=Math.random()*-0.12; r.x=Math.random()*1.15;
          }
        }
        for(var sk=0;sk<splashes.length;sk++){ if(splashes[sk].life>0) splashes[sk].life--; }
      }
    }

    // ---------- update ----------
    function update(){
      if(!paused){
        clock += 1/DAY; if(clock>=1){ clock-=1; assignDaily(); }   // new day: roll weather + moods
        seasonTimer--; if(seasonTimer<=0){ season = season==="summer"?"winter":"summer"; seasonTimer = DAY*2; }
        if(eventCD>0) eventCD--;
        if(!activeEvent && eventCD<=0) maybeAutoEvent();
        if(activeEvent){ activeEvent.t--; if(activeEvent.t<=0){ activeEvent=null; eventCD=Math.round(DAY*0.3); lastEsig="__end"; clearTeams(); } }
        beat += 1/24; if(beat>=1){ beat-=1; beatDrop=true; } else beatDrop=false;
      }
      computeLight();
      var bi = blockAt(clock), esig = activeEvent ? activeEvent.type : "";
      if(bi!==lastBlock || esig!==lastEsig){ lastBlock=bi; lastEsig=esig; applyAssignments(); }
      // per-frame event drivers set targets & poses BEFORE the movement integrator
      if(activeEvent && activeEvent.type==="volleyball") updateRally();
      else if(activeEvent && activeEvent.type==="rave") updateDance();
      for(var i=0;i<agents.length;i++){
        var ag=agents[i];
        if(ag.moveDelay>0){ ag.moveDelay--; ag.moving=false; continue; }   // staggered departure
        var dx=ag.tx-ag.x, dy=ag.ty-ag.y, d=Math.hypot(dx,dy);
        var spd = ag.spd * ((activeEvent && activeEvent.type==="volleyball" && ag.role==="play") ? 4 : 1);
        if(d>.006){
          ag.x+=dx/d*spd; ag.y+=dy/d*spd; ag.moving=true; ag.bob+=0.34; if(Math.abs(dx)>1e-5) ag.dir=dx<0?-1:1;
          ag.status=""; if(!activeEvent) ag.line=""; if(ag.convo) endConvo(ag);
        } else {
          ag.moving=false; ag.status=ACT_LABEL[ag.act]||"";
          if(ag.convoCD>0) ag.convoCD--;
          if(activeEvent){ /* lines & poses handled by the event drivers above */ }
          else if(!ag.convo){
            ag.line="";
            if(ag.act!=="sleep" && ag.act!=="swim" && Math.random()<0.004){   // gentle idle wander
              ag.tx=clamp(ag.tx + rnd(-.012,.012), .05,.95);
              ag.ty=clamp(ag.ty + rnd(-.01,.01), .12,.9);
            }
          }
        }
      }
      runConvos();
      maybeStartConvos();
      updateEffects();
      T++;
    }

    // ---------- render ----------
    function renderScene(){
      ctx.clearRect(0,0,W,H);
      drawGround();
      drawRoads();
      drawFairyWires();
      drawLampPosts();
      drawEventGround();
      var zs = ZONES.slice().sort(function(p,q){ return p.y-q.y; });
      for(var i=0;i<zs.length;i++) drawBuilding(zs[i]);
      var ord = agents.slice().sort(function(a,b){ return a.y-b.y; });
      for(var j=0;j<ord.length;j++) drawChar(ord[j]);
      // night darken + additive lights
      nightOverlay();
      lighter(drawStars);
      lighter(drawCelestial);
      lighter(drawWindowGlow);
      lighter(drawFairyBulbs);
      lighter(drawLampGlow);
      lighter(drawRave);
      lighter(drawDeviceGlow);
      lighter(drawFireflies);
      lighter(drawFireworks);
      lighter(drawNotes);
      // foreground (readable)
      drawLinks();
      drawSnow();
      drawRain();
      drawBall();
      for(var k=0;k<ord.length;k++) drawSpeech(ord[k]);
      drawEventBanner();
      if(mouse.on){ ctx.strokeStyle="rgba(140,21,21,0.14)"; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 15, 0, 6.28); ctx.stroke(); }
      updateHUD();
    }
    var hudT = 0;
    function updateHUD(){
      if(!hud || (hudT++ % 12)) return;
      var hh = clock*24, h=Math.floor(hh), m=Math.floor((hh-h)*60);
      var t2 = (h<10?"0":"")+h+":"+(m<10?"0":"")+m;
      var sName = season.charAt(0).toUpperCase()+season.slice(1);
      var wName = weather==="clear" ? "" : (weather==="rain" ? " · Rain" : " · Overcast");
      hud.textContent = t2 + " · " + sName + wName + (activeEvent ? " · " + activeEvent.label.split(" @ ")[0] : "");
    }
    function frame(){ update(); renderScene(); raf = requestAnimationFrame(frame); }

    // ---------- boot ----------
    size(); build(); assignDaily(); computeLight();

    if(reduceMotion){
      // a lively, clear-day freeze-frame that shows off the new sprites
      season = "summer"; clock = 0.46; weather = "clear"; computeLight();
      lastBlock = -2; lastEsig = "__static"; applyAssignments();
      for(var i=0;i<agents.length;i++){ var ag=agents[i]; ag.x=ag.tx; ag.y=ag.ty; ag.moving=false; ag.moveDelay=0; ag.line=""; }
      // someone writing, someone typing
      agents[0].act="study"; agents[0].x=agents[0].tx=.20; agents[0].y=agents[0].ty=.40;
      agents[1].act="hack";  agents[1].x=agents[1].tx=.86; agents[1].y=agents[1].ty=.36;
      // a pair mid-conversation with a visible topic bubble
      if(agents[4] && agents[5]){
        agents[4].act="gossip"; agents[4].x=agents[4].tx=.47; agents[4].y=agents[4].ty=.52;
        agents[5].act="gossip"; agents[5].x=agents[5].tx=.55; agents[5].y=agents[5].ty=.52;
        agents[4].partner=5; agents[5].partner=4;
        agents[4].line=TOPICS.ai[0]; agents[5].line="";
      }
      for(var j=0;j<agents.length;j++){ agents[j].status=ACT_LABEL[agents[j].act]||""; }
      renderScene();
      bindControls();
      return;
    }

    canvas.addEventListener("mousemove", function(ev){ var r=canvas.getBoundingClientRect(); mouse.x=ev.clientX-r.left; mouse.y=ev.clientY-r.top; mouse.on=true; });
    canvas.addEventListener("mouseleave", function(){ mouse.on=false; mouse.x=-999; mouse.y=-999; });
    var rsz; window.addEventListener("resize", function(){ clearTimeout(rsz); rsz=setTimeout(size, 200); });
    if("IntersectionObserver" in window){
      var aio = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if(e.isIntersecting){ if(!raf && !paused){ raf = requestAnimationFrame(frame); } }
          else { if(raf){ cancelAnimationFrame(raf); raf = null; } }
        });
      }, {threshold:0});
      aio.observe(canvas);
    }
    bindControls();
    raf = requestAnimationFrame(frame);

    function setBtn(el, icon, label, on){ if(!el) return; el.innerHTML = '<span class="ic">'+icon+'</span> '+label; el.classList.toggle("on", !!on); }
    function bindControls(){
      if(reduceMotion) return;
      document.querySelector(".sim-controls").hidden=false;
      var bT=document.getElementById("sim-time"), bS=document.getElementById("sim-season"),
          bE=document.getElementById("sim-event"), bP=document.getElementById("sim-pause");
      if(bT) bT.addEventListener("click", function(){
        if(light>.5){ clock=.88; } else { clock=.34; }
        computeLight(); setBtn(bT, light>.5?"☾":"☀", light>.5?"Night":"Day", false);
      });
      if(bS) bS.addEventListener("click", function(){
        season = season==="summer"?"winter":"summer"; seasonTimer=DAY*2;
        setBtn(bS, season==="summer"?"❄":"☀", season==="summer"?"Winter":"Summer", season==="winter");
      });
      if(bE) bE.addEventListener("click", function(){ triggerEvent(); });
      if(bP) bP.addEventListener("click", function(){
        paused=!paused;
        setBtn(bP, paused?"▶":"⏸", paused?"Play":"Pause", paused);
        if(!paused && !raf) raf=requestAnimationFrame(frame);
      });
    }
  })();


})();
