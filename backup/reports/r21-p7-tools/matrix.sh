#!/bin/bash
# Screens for round 21 phase 7 against a production server on :3220.
U=http://localhost:3220/
O=reports/r21-p7-screens
pose() { echo "[...document.querySelectorAll('[data-companion] svg[data-cat]')].some(s=>s.dataset.catPose==='$1')"; }
DESK='[{"wait":2500},{"shot":"sit","zoom":1},{"until":"'"$(pose walk)"'","jiggle":[700,500],"timeout":20000},{"shot":"walk","zoom":1},{"click":"[aria-controls=\"companion-actions\"]"},{"shot":"react","zoom":1},{"wait":900},{"shot":"panel"},{"click":"[aria-controls=\"companion-actions\"]"},{"until":"'"$(pose startle)"'","jiggle":[1300,140],"timeout":90000},{"shot":"startle","zoom":1},{"until":"'"$(pose sniff)"'","timeout":15000},{"shot":"sniff","zoom":1},{"wait":2000},{"shot":"surprise","zoom":1},{"wait":23000},{"shot":"sleep","zoom":1}]'
PHONE='[{"wait":2500},{"shot":"top","zoom":1},{"click":"[aria-controls=\"companion-actions\"]"},{"shot":"react","zoom":1},{"wait":900},{"shot":"panel"},{"click":"[aria-controls=\"companion-actions\"]"},{"eval":"(()=>{const r=document.querySelector(\"[data-moon-off-duty]\").getBoundingClientRect();window.scrollTo(0,scrollY+r.top-500);return 1})()"},{"wait":1500},{"shot":"moon","zoom":1},{"scroll":4000},{"wait":1200},{"shot":"journey","zoom":1}]'
for t in day night; do
  node reports/r21-p7-tools/shoot.mjs $U 390 844 $t $O/390-$t "$PHONE"
  node reports/r21-p7-tools/shoot.mjs $U 768 1024 $t $O/768-$t "$DESK"
  node reports/r21-p7-tools/shoot.mjs $U 1366 768 $t $O/1366-$t "$DESK"
  node reports/r21-p7-tools/shoot.mjs $U 1440 900 $t $O/1440-$t "$DESK"
done
