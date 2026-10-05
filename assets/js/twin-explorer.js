(function(){
"use strict";
var reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* ---------- LLM Twin pipeline accordion (one open at a time) ---------- */
  var twinStages = Array.prototype.slice.call(document.querySelectorAll(".twin-stage"));
  var twinDetails = Array.prototype.slice.call(document.querySelectorAll(".twin-detail"));
  var twinHint = document.getElementById("twin-hint");
  var twinRig = document.getElementById("twin-rig");
  function closeAllTwin(except){
    twinStages.forEach(function(btn){
      if(btn === except) return;
      btn.setAttribute("aria-expanded","false");
    });
    twinDetails.forEach(function(d){ d.classList.remove("show"); });
  }
  twinStages.forEach(function(btn){
    btn.addEventListener("click", function(){
      var open = btn.getAttribute("aria-expanded") === "true";
      closeAllTwin(btn);
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      if(open){
        btn.setAttribute("aria-expanded","false");
        if(panel) panel.classList.remove("show");
        if(twinHint) twinHint.style.display = "";
      }else{
        btn.setAttribute("aria-expanded","true");
        if(panel) panel.classList.add("show");
        if(twinHint) twinHint.style.display = "none";
        if(twinRig && !reduceMotion){
          twinRig.classList.remove("shine");
          void twinRig.offsetWidth;
          twinRig.classList.add("shine");
        }
      }
    });
  });


})();
