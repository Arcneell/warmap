(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))n(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const l of i.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&n(l)}).observe(document,{childList:!0,subtree:!0});function s(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(o){if(o.ep)return;o.ep=!0;const i=s(o);fetch(o.href,i)}})();const be={accessToken:null,tokenExpiresAt:0,currentUser:null,mineOnly:!1,viewMode:"markers",showBtLayer:!1,showCellLayer:!1},we=new Map;function h(e){return be[e]}function k(e,t){be[e]=t;const s=we.get(e);s&&s.forEach(n=>n(t))}function ke(){const e=h("accessToken");return e?{Authorization:`Bearer ${e}`}:{}}async function $(e,t={}){const s=h("accessToken"),n=h("tokenExpiresAt");return s&&Date.now()>n-3e4&&await Le(),t.headers={...t.headers,...ke()},fetch(e,t)}async function Le(){try{const e=await fetch("/api/v1/auth/refresh",{method:"POST",credentials:"include"});if(e.ok){const t=await e.json();return k("accessToken",t.access_token),k("tokenExpiresAt",Date.now()+t.expires_in*1e3),!0}}catch{}return k("accessToken",null),k("tokenExpiresAt",0),!1}function g(e){if(!e)return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}function a(e){return document.getElementById(e)}async function $e(){if(await xe()){await me();return}await Le()?await me():re(null)}async function xe(){const t=new URLSearchParams(window.location.search).get("auth_code");if(!t)return!1;window.history.replaceState({},"","/");try{const s=await fetch("/api/v1/auth/exchange",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({auth_code:t})});if(s.ok){const n=await s.json();return k("accessToken",n.access_token),k("tokenExpiresAt",Date.now()+n.expires_in*1e3),!0}}catch(s){console.error("Auth exchange failed:",s)}return!1}async function me(){try{const e=await $("/api/v1/auth/me");if(e.ok){const t=await e.json();return k("currentUser",t),re(t),t}}catch{}return re(null),null}function re(e){const t=a("loginBtn"),s=a("logoutBtn"),n=a("headerProfile"),o=a("headerAvatar");e?(t.style.display="none",s.style.display="",n.style.display="",a("headerPseudo").textContent=e.username,a("headerLevel").textContent="Lvl "+e.level,e.avatar_url?(o.src=e.avatar_url,o.style.display=""):o.style.display="none"):(t.style.display="",s.style.display="none",o.style.display="none");const i=a("btnMineOnly");i&&(i.style.display=h("accessToken")?"":"none")}function Se(){a("headerProfile").addEventListener("click",()=>{h("accessToken")&&(a("newTokenDisplay").style.display="none",pe(),a("tokenModal").classList.add("active"))}),a("loginBtn").addEventListener("click",()=>a("loginModal").classList.add("active")),a("closeLoginModal").addEventListener("click",()=>a("loginModal").classList.remove("active")),a("loginModal").addEventListener("click",t=>{t.target.id==="loginModal"&&t.target.classList.remove("active")});const e=a("loginGithub");e&&e.addEventListener("click",async()=>{try{const s=await(await fetch("/api/v1/auth/login/github")).json();window.location.href=s.redirect_url}catch(t){console.error("GitHub login failed:",t)}}),a("logoutBtn").addEventListener("click",async()=>{await fetch("/api/v1/auth/logout",{method:"POST",credentials:"include"}),k("accessToken",null),k("tokenExpiresAt",0),k("currentUser",null),re(null)}),a("closeTokenModal").addEventListener("click",()=>a("tokenModal").classList.remove("active")),a("tokenModal").addEventListener("click",t=>{t.target.id==="tokenModal"&&t.target.classList.remove("active")}),a("createTokenBtn").addEventListener("click",async()=>{const t=a("tokenNameInput").value.trim();if(t)try{const s=await $("/api/v1/auth/tokens",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:t})});if(s.ok){const n=await s.json();a("newTokenValue").textContent=n.token,a("newTokenDisplay").style.display="",a("tokenNameInput").value="",pe()}}catch(s){console.error("Token creation failed:",s)}})}async function pe(){try{const e=await $("/api/v1/auth/tokens");if(!e.ok)return;const t=await e.json(),s=a("tokenList");if(t.length===0){s.innerHTML='<div style="color:var(--text-secondary);font-size:0.85rem;">No API tokens yet</div>';return}s.innerHTML=t.map(n=>{const o=new Date(n.created_at).toLocaleDateString(),i=n.revoked?" token-revoked":"",l=n.revoked?'<span style="color:var(--text-secondary);font-size:0.75rem;">revoked</span>':`<button class="token-revoke" onclick="window.__revokeToken(${n.id})">Revoke</button>`;return`<div class="token-item">
                <div><span class="token-name${i}">${g(n.name)}</span><br><span class="token-meta">Created ${o}</span></div>
                ${l}
            </div>`}).join("")}catch{}}window.__revokeToken=async function(e){try{await $(`/api/v1/auth/tokens/${e}`,{method:"DELETE"}),pe()}catch{}};const ee={};let le=null;function P(e,{nav:t,page:s,onEnter:n,onLeave:o}){ee[e]={nav:t,page:s,onEnter:n,onLeave:o}}function x(e){if(e===le)return;const t=ee[le];t&&t.onLeave&&t.onLeave(),le=e,window.location.hash=e,Object.entries(ee).forEach(([o,{nav:i,page:l}])=>{const r=o===e;i&&i.classList.toggle("active",r),l&&(l.id==="map"?l.style.display=r?"":"none":l.style.display=r?"flex":"none")});const s=a("sidebar");s&&(s.style.display=e==="#map"?"":"none");const n=ee[e];n&&n.onEnter&&n.onEnter()}function _e(){window.addEventListener("hashchange",()=>{const t=window.location.hash||"#map";x(t)});const e=window.location.hash||"#map";x(e)}const U={WPA3:"#0d9373",WPA2:"#3b82f6",WPA:"#e07832",WEP:"#dc3545",Open:"#9ca3af",Unknown:"#d1d5db"};let m,T,M,G,V,D=[],W=[],E=0,te=null,ce=!0,Q=null,A=null;const Ee="#8b5cf6",Ce="#3b82f6";function Te(){m=L.map("map",{zoomControl:!0}).setView([0,0],2),L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",{attribution:'&copy; <a href="https://carto.com/">CARTO</a>',maxZoom:19}).addTo(m),"geolocation"in navigator&&navigator.geolocation.getCurrentPosition(n=>m.setView([n.coords.latitude,n.coords.longitude],14),()=>{},{enableHighAccuracy:!0,timeout:8e3}),T=L.markerClusterGroup({maxClusterRadius:40,disableClusteringAtZoom:17,spiderfyOnMaxZoom:!1,showCoverageOnHover:!1,chunkedLoading:!0}),m.addLayer(T),G=L.layerGroup(),V=L.layerGroup(),a("btnViewMarkers").addEventListener("click",()=>ye("markers")),a("btnViewHeat").addEventListener("click",()=>ye("heat")),a("btnLayerWifi").addEventListener("click",n=>{n.currentTarget.classList.toggle("active"),n.currentTarget.classList.contains("active")?m.addLayer(T):m.removeLayer(T)}),a("btnLayerBt").addEventListener("click",n=>{const o=!h("showBtLayer");k("showBtLayer",o),n.currentTarget.classList.toggle("active",o),o?(m.addLayer(G),ue()):m.removeLayer(G)}),a("btnLayerCell").addEventListener("click",n=>{const o=!h("showCellLayer");k("showCellLayer",o),n.currentTarget.classList.toggle("active",o),o?(m.addLayer(V),ve()):m.removeLayer(V)}),a("btnMineOnly").addEventListener("click",()=>{const n=!h("mineOnly");k("mineOnly",n),a("btnMineOnly").classList.toggle("mine-active",n),_(!1)});let e;m.on("moveend",()=>{clearTimeout(e),e=setTimeout(()=>{_(!1),h("showBtLayer")&&ue(),h("showCellLayer")&&ve()},300)});let t;a("ssidSearch").addEventListener("input",()=>{clearTimeout(t),t=setTimeout(()=>_(!1),400)}),document.querySelectorAll("#encFilters input").forEach(n=>{n.addEventListener("change",()=>_(!1))});let s;a("mapSearch").addEventListener("input",n=>{clearTimeout(s);const o=n.target.value.trim();s=setTimeout(()=>{a("ssidSearch").value=o,_(!1)},400)}),window.popupNav=function(n){if(!W.length||!te)return;E=(E+n+W.length)%W.length;const o=te.getElement();if(!o)return;o.querySelectorAll(".popup-ap").forEach(p=>{p.style.display=parseInt(p.dataset.popupIdx)===E?"block":"none"});const i=o.querySelector("#popupIdx");i&&(i.textContent=E+1);const l=W[E],[r,c]=l.geometry.coordinates;te.setLatLng(L.latLng(c,r)),m.panTo(L.latLng(c,r),{animate:!0,duration:.25})},_(!0)}function ye(e){k("viewMode",e),a("btnViewMarkers").classList.toggle("active",e==="markers"),a("btnViewHeat").classList.toggle("active",e==="heat"),e==="markers"?(M&&m.removeLayer(M),m.addLayer(T)):(m.removeLayer(T),M&&m.addLayer(M))}function Me(e){const[t,s]=e.geometry.coordinates,n=8e-5;return D.filter(o=>{const[i,l]=o.geometry.coordinates;return Math.abs(l-s)<n&&Math.abs(i-t)<n})}function Be(e,t){const s=e.length,n=s>1;let o='<div class="popup-multi">';return n&&(o+=`<div class="popup-nav"><button class="popup-nav-btn" onclick="popupNav(-1)">&larr;</button><span class="popup-nav-count"><span id="popupIdx">${t+1}</span> / ${s}</span><button class="popup-nav-btn" onclick="popupNav(1)">&rarr;</button></div>`),e.forEach((i,l)=>{const r=i.properties,[c,p]=i.geometry.coordinates,d=U[r.encryption]||U.Unknown,y=n&&l!==t?"none":"block",b=`https://www.google.com/maps?q=${p},${c}`;o+=`<div class="popup-ap" data-popup-idx="${l}" style="display:${y}">
            <div><span class="popup-label">SSID:</span> ${g(r.ssid)||"<i>hidden</i>"}</div>
            <div><span class="popup-label">BSSID:</span> ${g(r.bssid)}</div>
            <div><span class="popup-label">Encryption:</span> <span class="popup-enc" style="background:${d}20;color:${d}">${r.encryption}</span></div>
            <div><span class="popup-label">Channel:</span> ${r.channel}</div>
            <div><span class="popup-label">Signal:</span> ${r.rssi} dBm</div>
            <div><span class="popup-label">GPS:</span> <a href="${b}" target="_blank" class="popup-gps">${p.toFixed(5)}, ${c.toFixed(5)}</a></div>
            <div><span class="popup-label">First seen:</span> ${r.first_seen}</div>
            <div><span class="popup-label">Last seen:</span> ${r.last_seen}</div>
        </div>`}),o+="</div>",o}async function _(e=!1){try{Q&&Q.abort(),Q=new AbortController;const t=[...document.querySelectorAll("#encFilters input:checked")].map(p=>p.value),s=a("ssidSearch").value.trim(),n=new URLSearchParams;t.length<6&&n.set("encryption",t.join(",")),s&&n.set("ssid",s),h("mineOnly")&&n.set("mine_only","true");const o=m.getBounds();!ce&&o&&(n.set("lat_min",o.getSouth().toFixed(6)),n.set("lat_max",o.getNorth().toFixed(6)),n.set("lon_min",o.getWest().toFixed(6)),n.set("lon_max",o.getEast().toFixed(6)));const l=await(await fetch("/api/v1/networks/wifi/geojson?"+n,{signal:Q.signal})).json();if(T.clearLayers(),D=l.features||[],D.length===0)return;const r=L.latLngBounds();D.forEach(p=>{const[d,y]=p.geometry.coordinates,b=p.properties.encryption||"Unknown",u=L.latLng(y,d);r.extend(u);const f=L.circleMarker(u,{radius:6,fillColor:U[b]||U.Unknown,color:"rgba(0,0,0,0.15)",weight:1,fillOpacity:.85});f.on("click",()=>{const v=Me(p);W=v,E=v.indexOf(p),E===-1&&(E=0),te=L.popup({maxWidth:280,maxHeight:300,className:"custom-popup"}).setLatLng(u).setContent(Be(v,E)).openOn(m)}),T.addLayer(f)});const c=D.map(p=>{const[d,y]=p.geometry.coordinates,b=p.properties.rssi||-100;return[y,d,Math.max(.05,Math.min(1,(b+100)/60))]});M&&m.removeLayer(M),M=L.heatLayer(c,{radius:18,blur:22,maxZoom:17,gradient:{.2:"#3b82f6",.5:"#f0883e",.8:"#f85149",1:"#ffffff"}}),h("viewMode")==="heat"&&m.addLayer(M),(e||ce)&&(r.isValid()&&m.fitBounds(r,{padding:[30,30]}),ce=!1)}catch(t){if(t.name==="AbortError")return;console.error("Failed to load GeoJSON:",t)}}async function ue(){if(h("showBtLayer"))try{const e=m.getBounds(),t=new URLSearchParams({lat_min:e.getSouth().toFixed(6),lat_max:e.getNorth().toFixed(6),lon_min:e.getWest().toFixed(6),lon_max:e.getEast().toFixed(6)}),n=await(await fetch("/api/v1/networks/bt/geojson?"+t)).json();G.clearLayers();for(const o of n.features||[]){const[i,l]=o.geometry.coordinates,r=o.properties,c=L.circleMarker([l,i],{radius:5,fillColor:Ee,color:"rgba(0,0,0,0.15)",weight:1,fillOpacity:.8});c.bindPopup(`<b>${g(r.name)||"<i>unnamed</i>"}</b><br>MAC: ${g(r.mac)}<br>Type: ${r.device_type}<br>Signal: ${r.rssi} dBm`),G.addLayer(c)}}catch(e){console.error("Failed to load BT layer:",e)}}async function ve(){if(h("showCellLayer"))try{const e=m.getBounds(),t=new URLSearchParams({lat_min:e.getSouth().toFixed(6),lat_max:e.getNorth().toFixed(6),lon_min:e.getWest().toFixed(6),lon_max:e.getEast().toFixed(6)}),n=await(await fetch("/api/v1/networks/cell/geojson?"+t)).json();V.clearLayers();for(const o of n.features||[]){const[i,l]=o.geometry.coordinates,r=o.properties,c=L.circleMarker([l,i],{radius:8,fillColor:Ce,color:"rgba(0,0,0,0.2)",weight:2,fillOpacity:.7});c.bindPopup(`<b>${r.radio}</b> Tower<br>MCC: ${r.mcc} / MNC: ${r.mnc}<br>LAC: ${r.lac||"--"} / CID: ${r.cid}<br>Signal: ${r.rssi} dBm`),V.addLayer(c)}}catch(e){console.error("Failed to load cell layer:",e)}}function Pe(){m&&(m.invalidateSize(),A&&clearInterval(A),A=setInterval(()=>{_(!1),h("showBtLayer")&&ue(),h("showCellLayer")&&ve()},5e3))}function je(){A&&(clearInterval(A),A=null)}let de=null;async function ae(){if(!h("currentUser")){a("profileCard").style.display="none";return}try{const t=await $("/api/v1/profile");if(!t.ok)return;const s=await t.json();Fe(s)}catch(t){console.error("Failed to load profile:",t)}}function Fe(e){a("profileCard").style.display="",a("profilePseudo").textContent=e.username,a("profileRank").textContent=e.rank,a("xpLevel").textContent="Lvl "+e.level,a("xpText").textContent=e.xp_progress+" / "+e.xp_needed+" XP",a("xpTotal").textContent=(e.xp||0).toLocaleString()+" XP total";const t=e.xp_needed>0?Math.min(100,e.xp_progress/e.xp_needed*100):0;a("xpBarFill").style.width=t+"%"}async function se(){try{const t=await(await fetch("/api/v1/stats")).json();a("totalAps").textContent=(t.total_wifi||0).toLocaleString();const s=Object.keys(U),n=s.map(c=>(t.by_encryption||{})[c]||0),o=s.map(c=>U[c]),i=a("encChart").getContext("2d");de&&de.destroy(),de=new Chart(i,{type:"doughnut",data:{labels:s,datasets:[{data:n,backgroundColor:o,borderWidth:0}]},options:{responsive:!0,maintainAspectRatio:!1,cutout:"65%",plugins:{legend:{position:"bottom",labels:{color:"#6b7280",padding:10,font:{family:"JetBrains Mono",size:11},usePointStyle:!0,pointStyleWidth:8}}}}});const l=a("topSsidList"),r=t.top_ssids||[];r.length===0?l.innerHTML='<li><span class="ssid-name">No data</span></li>':l.innerHTML=r.map(c=>`<li><span class="ssid-name">${g(c.ssid)}</span><span class="ssid-count">${c.count}</span></li>`).join(""),a("totalSessions").textContent=t.total_uploads||0,a("lastSession").textContent="--",Ae()}catch(e){console.error("Failed to load stats:",e)}}async function Ae(){var e;if(h("accessToken"))try{const t=await $("/api/v1/upload?limit=20");if(!t.ok)return;const s=await t.json(),n=a("sessionBar");if(s.length===0){n.innerHTML="";return}a("lastSession").textContent=(e=s[0])!=null&&e.uploaded_at?new Date(s[0].uploaded_at).toLocaleString():"--";const o=Math.max(...s.map(l=>(l.new_networks||0)+(l.updated_networks||0)),1),i=s.slice(0,20).reverse();n.innerHTML=i.map(l=>{const r=(l.new_networks||0)+(l.updated_networks||0);return`<div class="session-bar-item" style="height:${Math.max(4,r/o*36)}px" title="${l.filename}: ${l.new_networks} new, +${l.xp_earned} XP"></div>`}).join("")}catch{}}function Oe(){const e=a("pseudoSubmit");e&&e.addEventListener("click",()=>{a("pseudoModal").classList.remove("active"),a("loginModal").classList.add("active")})}const X=100;let B=0;function Ne(){let e;a("btSearch").addEventListener("input",()=>{clearTimeout(e),e=setTimeout(()=>{B=0,ne()},400)});const t=a("btPrev"),s=a("btNext");t&&t.addEventListener("click",()=>{B=Math.max(0,B-X),ne()}),s&&s.addEventListener("click",()=>{B+=X,ne()})}async function ne(){try{const e=a("btSearch").value.trim(),t=new URLSearchParams;e&&t.set("name",e),t.set("limit",String(X)),t.set("offset",String(B));const n=await(await fetch("/api/v1/networks/bt?"+t)).json(),o=n.results||[],i=n.total||0;a("btTotal").textContent=i;const l=a("btTableBody");if(o.length===0){l.innerHTML='<tr><td colspan="7" class="bt-empty">No Bluetooth devices found</td></tr>';return}l.innerHTML=o.map(d=>{const y=d.device_type==="BLE"?"ble":"bt",b=d.name?`<span class="bt-name">${g(d.name)}</span>`:'<span class="bt-name empty">unnamed</span>',u=d.latitude?d.latitude.toFixed(4):"--",f=d.longitude?d.longitude.toFixed(4):"--";return`<tr>
                <td>${b}</td>
                <td><span class="bt-mac">${g(d.mac)}</span></td>
                <td><span class="bt-type-badge ${y}">${d.device_type}</span></td>
                <td><span class="bt-signal">${d.rssi} dBm</span></td>
                <td><span class="bt-coords">${u}, ${f}</span></td>
                <td><span class="bt-date">${d.first_seen||"--"}</span></td>
                <td><span class="bt-date">${d.last_seen||"--"}</span></td>
            </tr>`}).join("");const r=a("btPageInfo"),c=a("btPrev"),p=a("btNext");r&&(r.textContent=`Page ${Math.floor(B/X)+1}`),c&&(c.disabled=B===0),p&&(p.disabled=B+X>=i)}catch(e){console.error("Failed to load bluetooth:",e)}}const Z=100;let C=0;function Ie(){let e;a("cellSearch").addEventListener("input",()=>{clearTimeout(e),e=setTimeout(()=>{C=0,q()},400)}),a("cellRadioFilter").addEventListener("change",()=>{C=0,q()});const t=a("cellPrev"),s=a("cellNext");t&&t.addEventListener("click",()=>{C=Math.max(0,C-Z),q()}),s&&s.addEventListener("click",()=>{C+=Z,q()})}async function q(){try{const e=a("cellRadioFilter").value,t=new URLSearchParams;e&&t.set("radio",e),t.set("limit",String(Z)),t.set("offset",String(C));const n=await(await fetch("/api/v1/networks/cell?"+t)).json(),o=n.results||[],i=n.total||0;a("cellTotal").textContent=i;const l=a("cellTableBody");if(o.length===0){l.innerHTML='<tr><td colspan="8" class="bt-empty">No cell towers found</td></tr>';return}l.innerHTML=o.map(d=>{const y=d.radio==="LTE"||d.radio==="NR"?"ble":"bt",b=d.latitude?d.latitude.toFixed(4):"--",u=d.longitude?d.longitude.toFixed(4):"--";return`<tr>
                <td><span class="bt-type-badge ${y}">${d.radio}</span></td>
                <td>${d.mcc}</td><td>${d.mnc}</td><td>${d.lac||"--"}</td><td>${d.cid}</td>
                <td><span class="bt-signal">${d.rssi} dBm</span></td>
                <td><span class="bt-coords">${b}, ${u}</span></td>
                <td><span class="bt-date">${d.first_seen||"--"}</span></td>
            </tr>`}).join("");const r=a("cellPageInfo"),c=a("cellPrev"),p=a("cellNext");r&&(r.textContent=`Page ${Math.floor(C/Z)+1}`),c&&(c.disabled=C===0),p&&(p.disabled=C+Z>=i)}catch(e){console.error("Failed to load cell towers:",e)}}let ge=null;function Ue(e){ge=e}async function He(){const e=a("profilePageContent");if(!e||!ge){e&&(e.innerHTML='<div class="bt-empty">User not found</div>');return}try{const t=await fetch(`/api/v1/profile/${ge}`);if(!t.ok){e.innerHTML='<div class="bt-empty">User not found</div>';return}const s=await t.json(),n=s.badges||[],o=n.filter(f=>f.earned).length,i=n.length,l=s.xp_needed>0?Math.min(100,Math.round(s.xp_progress/s.xp_needed*100)):100,r=s.level>=100,c=s.created_at?new Date(s.created_at).toLocaleDateString():"--",p={};n.forEach(f=>{const v=f.category||"other";p[v]||(p[v]=[]),p[v].push(f)});const d={wifi:"WiFi Discoveries",bluetooth:"Bluetooth",cell:"Cell Towers",upload:"Uploads",xp:"Experience",level:"Level Milestones",special:"Special"},y={wifi:"📡",bluetooth:"🔵",cell:"📶",upload:"📤",xp:"⭐",level:"🎯",special:"🌟"},b=Object.entries(p).map(([f,v])=>{const w=v.map(S=>{const j=`tier-${S.tier||1}`;return`<div class="rpg-badge ${S.earned?"earned":"locked"} ${j}" title="${g(S.description)}">
                    <span class="rpg-badge-icon">${S.icon_emoji||"🏅"}</span>
                    <span class="rpg-badge-name">${g(S.name)}</span>
                </div>`}).join("");return`<div class="rpg-badge-category">
                <div class="rpg-badge-category-title">${y[f]||""} ${d[f]||f}</div>
                <div class="rpg-badge-grid">${w}</div>
            </div>`}).join(""),u=s.avatar_url?`<img src="${s.avatar_url}" class="rpg-profile-avatar" alt="${g(s.username)}">`:`<div class="rpg-profile-avatar rpg-profile-avatar-placeholder">${g((s.username||"?")[0].toUpperCase())}</div>`;e.innerHTML=`
            <div class="rpg-profile-hero">
                <div class="rpg-profile-avatar-section">
                    <div class="rpg-level-ring">
                        <svg viewBox="0 0 120 120" class="rpg-level-svg">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(13,147,115,0.15)" stroke-width="6"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--accent)" stroke-width="6"
                                stroke-dasharray="${Math.round(339.3*l/100)} 339.3"
                                stroke-linecap="round" transform="rotate(-90 60 60)"
                                class="rpg-level-progress"/>
                        </svg>
                        ${u}
                        <div class="rpg-level-badge">${s.level}</div>
                    </div>
                    <div class="rpg-profile-info">
                        <div class="rpg-profile-name">${g(s.username||"--")}</div>
                        <div class="rpg-profile-rank">${g(s.rank||"Script Kiddie")}</div>
                        <div class="rpg-profile-global-rank">Global #${(s.global_rank||0).toLocaleString()} • Member since ${c}</div>
                    </div>
                </div>
                <div class="rpg-xp-section">
                    <div class="rpg-xp-bar-wrap">
                        <div class="rpg-xp-bar">
                            <div class="rpg-xp-bar-fill" style="width:${l}%"></div>
                            <div class="rpg-xp-bar-glow" style="width:${l}%"></div>
                        </div>
                        <div class="rpg-xp-labels">
                            <span>${r?"MAX LEVEL":`${s.xp_progress.toLocaleString()} / ${s.xp_needed.toLocaleString()} XP`}</span>
                            <span>${s.xp.toLocaleString()} XP total</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="rpg-stats-grid">
                <div class="rpg-stat-card">
                    <div class="rpg-stat-icon">📡</div>
                    <div class="rpg-stat-value">${(s.wifi_discovered||0).toLocaleString()}</div>
                    <div class="rpg-stat-label">WiFi Networks</div>
                </div>
                <div class="rpg-stat-card">
                    <div class="rpg-stat-icon">🔵</div>
                    <div class="rpg-stat-value">${(s.bt_discovered||0).toLocaleString()}</div>
                    <div class="rpg-stat-label">Bluetooth</div>
                </div>
                <div class="rpg-stat-card">
                    <div class="rpg-stat-icon">📶</div>
                    <div class="rpg-stat-value">${(s.cell_discovered||0).toLocaleString()}</div>
                    <div class="rpg-stat-label">Cell Towers</div>
                </div>
                <div class="rpg-stat-card">
                    <div class="rpg-stat-icon">📤</div>
                    <div class="rpg-stat-value">${(s.total_uploads||0).toLocaleString()}</div>
                    <div class="rpg-stat-label">Uploads</div>
                </div>
            </div>

            <div class="rpg-badges-section">
                <div class="rpg-badges-header">
                    <h3>Badges</h3>
                    <span class="rpg-badges-count">${o} / ${i}</span>
                </div>
                ${b}
            </div>
        `}catch(t){console.error("Failed to load profile:",t),e.innerHTML='<div class="bt-empty">Failed to load profile</div>'}}const z=50;let O=0;const Re={1:"🥇",2:"🥈",3:"🥉"};function De(){a("lbSortBy").addEventListener("change",oe);const e=a("lbPrev"),t=a("lbNext");e&&e.addEventListener("click",()=>{O=Math.max(0,O-z),oe()}),t&&t.addEventListener("click",()=>{O+=z,oe()})}function We(e){Ue(e),x("#profile")}window._viewProfile=We;async function oe(){try{const e=a("lbSortBy").value,s=await(await fetch(`/api/v1/stats/leaderboard?sort_by=${e}&limit=${z}&offset=${O}`)).json(),n=a("lbTableBody");if(!s||s.length===0){n.innerHTML='<tr><td colspan="7" class="bt-empty">No users yet</td></tr>';return}n.innerHTML=s.map(r=>{const c=r.avatar_url?`<img src="${r.avatar_url}" class="lb-avatar">`:`<div class="lb-avatar lb-avatar-placeholder">${g((r.username||"?")[0].toUpperCase())}</div>`,p=r.rank===1?"lb-top1":r.rank===2?"lb-top2":r.rank===3?"lb-top3":"",d=Re[r.rank]||`#${r.rank}`,y=r.rank_title||"";return`<tr class="${p} lb-row-clickable" onclick="window._viewProfile(${r.user_id})">
                <td class="lb-rank-cell"><span class="lb-rank-icon">${d}</span></td>
                <td class="lb-user-cell">
                    ${c}
                    <div class="lb-user-info">
                        <span class="lb-username">${g(r.username)}</span>
                        <span class="lb-rank-title">${g(y)}</span>
                    </div>
                </td>
                <td><span class="lb-level-badge">Lvl ${r.level}</span></td>
                <td class="lb-xp">${(r.xp||0).toLocaleString()}</td>
                <td>${(r.wifi_discovered||0).toLocaleString()}</td>
                <td>${(r.bt_discovered||0).toLocaleString()}</td>
                <td>${(r.cell_discovered||0).toLocaleString()}</td>
            </tr>`}).join("");const o=a("lbPageInfo"),i=a("lbPrev"),l=a("lbNext");o&&(o.textContent=`Page ${Math.floor(O/z)+1}`),i&&(i.disabled=O===0),l&&(l.disabled=!s||s.length<z)}catch(e){console.error("Failed to load leaderboard:",e)}}function Y(e,t){const s=Object.entries(t||{});if(!s.length)return`<div class="card"><div class="card-title">${g(e)}</div><div class="bt-empty">No data</div></div>`;const n=s.sort((o,i)=>Number(i[1])-Number(o[1])).slice(0,20).map(([o,i])=>`<tr><td>${g(String(o))}</td><td>${Number(i).toLocaleString()}</td></tr>`).join("");return`<div class="card">
        <div class="card-title">${g(e)}</div>
        <table class="bt-table"><tbody>${n}</tbody></table>
    </div>`}async function qe(){const e=a("advancedStatsContent");if(e)try{const[t,s,n,o,i]=await Promise.all([fetch("/api/v1/stats/channels"),fetch("/api/v1/stats/encryption"),fetch("/api/v1/stats/manufacturers?limit=30"),fetch("/api/v1/stats/countries"),fetch("/api/v1/stats/top-ssids?limit=20")]),l=t.ok?await t.json():{},r=s.ok?await s.json():{},c=n.ok?await n.json():{},p=o.ok?await o.json():{},y=((i.ok?await i.json():[])||[]).map(u=>`<tr><td>${g(u.ssid||"<hidden>")}</td><td>${(u.count||0).toLocaleString()}</td></tr>`).join(""),b=p.by_cell_mcc||{};e.innerHTML=`
            ${Y("Channels",l)}
            ${Y("Encryption Distribution",r)}
            ${Y("Top Manufacturers (OUI)",c)}
            ${Y("Countries (Cell MCC)",b)}
            <div class="card">
                <div class="card-title">Top SSIDs</div>
                <table class="bt-table"><tbody>${y||'<tr><td colspan="2" class="bt-empty">No data</td></tr>'}</tbody></table>
            </div>
        `}catch(t){console.error("Failed to load advanced stats:",t),e.innerHTML='<div class="card"><div class="card-title">Advanced Stats</div><div class="bt-empty">Failed to load advanced stats</div></div>'}}async function Ge(){const e=a("myStatsContent");if(e)try{const t=await $("/api/v1/profile");if(!t.ok){e.innerHTML='<div class="card"><div class="card-title">My Stats</div><div class="bt-empty">Login required</div></div>';return}const s=await t.json(),n=await $(`/api/v1/profile/${s.user_id}/badges`),o=n.ok?await n.json():[],i=o.filter(u=>u.earned).length,l=o.length,r=s.xp_needed>0?Math.min(100,Math.round(s.xp_progress/s.xp_needed*100)):100,c=s.level>=100,p={};o.forEach(u=>{const f=u.category||"other";p[f]||(p[f]=[]),p[f].push(u)});const d={wifi:"WiFi Discoveries",bluetooth:"Bluetooth",cell:"Cell Towers",upload:"Uploads",xp:"Experience",level:"Level Milestones",special:"Special"},y={wifi:"📡",bluetooth:"🔵",cell:"📶",upload:"📤",xp:"⭐",level:"🎯",special:"🌟"},b=Object.entries(p).map(([u,f])=>{const v=f.map(w=>{const S=`tier-${w.tier||1}`,j=w.earned?"earned":"locked",F=w.earned_at?new Date(w.earned_at).toLocaleDateString():"";return`<div class="rpg-badge ${j} ${S}" title="${g(w.description)}${F?" - Earned "+F:""}">
                    <span class="rpg-badge-icon">${w.icon_emoji||"🏅"}</span>
                    <span class="rpg-badge-name">${g(w.name)}</span>
                    <span class="rpg-badge-desc">${g(w.description)}</span>
                </div>`}).join("");return`<div class="rpg-badge-category">
                <div class="rpg-badge-category-title">${y[u]||""} ${d[u]||u}</div>
                <div class="rpg-badge-grid">${v}</div>
            </div>`}).join("");e.innerHTML=`
            <div class="rpg-profile-hero">
                <div class="rpg-profile-avatar-section">
                    <div class="rpg-level-ring">
                        <svg viewBox="0 0 120 120" class="rpg-level-svg">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(13,147,115,0.15)" stroke-width="6"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--accent)" stroke-width="6"
                                stroke-dasharray="${Math.round(339.3*r/100)} 339.3"
                                stroke-linecap="round" transform="rotate(-90 60 60)"
                                class="rpg-level-progress"/>
                        </svg>
                        <div class="rpg-level-number">${s.level}</div>
                    </div>
                    <div class="rpg-profile-info">
                        <div class="rpg-profile-name">${g(s.username||"--")}</div>
                        <div class="rpg-profile-rank">${g(s.rank||"Script Kiddie")}</div>
                        <div class="rpg-profile-global-rank">Global #${(s.global_rank||0).toLocaleString()}</div>
                    </div>
                </div>
                <div class="rpg-xp-section">
                    <div class="rpg-xp-bar-wrap">
                        <div class="rpg-xp-bar">
                            <div class="rpg-xp-bar-fill" style="width:${r}%"></div>
                            <div class="rpg-xp-bar-glow" style="width:${r}%"></div>
                        </div>
                        <div class="rpg-xp-labels">
                            <span>${c?"MAX LEVEL":`${s.xp_progress.toLocaleString()} / ${s.xp_needed.toLocaleString()} XP`}</span>
                            <span>${s.xp.toLocaleString()} XP total</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="rpg-stats-grid">
                <div class="rpg-stat-card">
                    <div class="rpg-stat-icon">📡</div>
                    <div class="rpg-stat-value">${(s.wifi_discovered||0).toLocaleString()}</div>
                    <div class="rpg-stat-label">WiFi Networks</div>
                </div>
                <div class="rpg-stat-card">
                    <div class="rpg-stat-icon">🔵</div>
                    <div class="rpg-stat-value">${(s.bt_discovered||0).toLocaleString()}</div>
                    <div class="rpg-stat-label">Bluetooth</div>
                </div>
                <div class="rpg-stat-card">
                    <div class="rpg-stat-icon">📶</div>
                    <div class="rpg-stat-value">${(s.cell_discovered||0).toLocaleString()}</div>
                    <div class="rpg-stat-label">Cell Towers</div>
                </div>
                <div class="rpg-stat-card">
                    <div class="rpg-stat-icon">📤</div>
                    <div class="rpg-stat-value">${(s.total_uploads||0).toLocaleString()}</div>
                    <div class="rpg-stat-label">Uploads</div>
                </div>
            </div>

            <div class="rpg-badges-section">
                <div class="rpg-badges-header">
                    <h3>Badges</h3>
                    <span class="rpg-badges-count">${i} / ${l}</span>
                </div>
                ${b}
            </div>
        `}catch(t){console.error("Failed to load my stats:",t),e.innerHTML='<div class="card"><div class="card-title">My Stats</div><div class="bt-empty">Failed to load stats</div></div>'}}let N=null;const J=50;let I=0;function Ve(e){const t=(e||"").toLowerCase();return t==="done"?'<span class="upload-badge done">Done</span>':t==="error"?'<span class="upload-badge error">Error</span>':["processing","parsing","trilaterating","indexing"].includes(t)?'<span class="upload-badge processing">Processing</span>':'<span class="upload-badge pending">Pending</span>'}function he(e){if(!e)return"--";const t=new Date(e);return Number.isNaN(t.getTime())?"--":t.toLocaleString()}async function R(){const e=a("uploadsTableBody"),t=a("uploadStatusBadge");if(e)try{const s=await $(`/api/v1/upload?limit=${J}&offset=${I}`);if(!s.ok){e.innerHTML='<tr><td colspan="8" class="bt-empty">Login required</td></tr>';return}const n=await s.json(),o=n.some(c=>["pending","processing","parsing","trilaterating","indexing"].includes((c.status||"").toLowerCase()));if(t&&(t.style.display=o?"":"none",t.classList.toggle("active",o)),!n.length){e.innerHTML='<tr><td colspan="8" class="bt-empty">No uploads yet</td></tr>';return}e.innerHTML=n.map(c=>{const p=(c.new_networks||0)+(c.updated_networks||0),d=c.queue_position&&c.queue_total?`Queue ${c.queue_position}/${c.queue_total}`:"",y=[c.status_message||"",d].filter(Boolean).join(" - ");return`<tr>
                <td>${g(c.filename||"--")}</td>
                <td>${Ve(c.status)}</td>
                <td>${p}</td>
                <td>${c.skipped_networks||0}</td>
                <td>${c.xp_earned||0}</td>
                <td>${he(c.uploaded_at)}</td>
                <td>${he(c.completed_at)}</td>
                <td>${g(y||"--")}</td>
            </tr>`}).join("");const i=a("uploadsPageInfo"),l=a("uploadsPrev"),r=a("uploadsNext");i&&(i.textContent=`Page ${Math.floor(I/J)+1}`),l&&(l.disabled=I===0),r&&(r.disabled=n.length<J)}catch(s){console.error("Failed to load uploads history:",s),e.innerHTML='<tr><td colspan="8" class="bt-empty">Failed to load history</td></tr>'}}function Xe(){R();const e=a("refreshUploadsBtn");e&&(e.onclick=R);const t=a("uploadsPrev"),s=a("uploadsNext");t&&(t.onclick=()=>{I=Math.max(0,I-J),R()}),s&&(s.onclick=()=>{I+=J,R()}),N&&clearInterval(N),N=setInterval(R,3e3)}function Ze(){N&&(clearInterval(N),N=null)}function ze(){const e=a("uploadModal"),t=a("dropZone"),s=a("fileInput"),n=a("progressBar"),o=a("progressFill"),i=a("uploadResult"),l=a("uploadStatusBadge"),r=a("toastContainer");function c(u){l&&(l.style.display=u?"":"none",l.classList.toggle("active",u))}function p(u,f="info"){if(!r)return;const v=document.createElement("div");v.className=`toast ${f}`,v.textContent=u,r.appendChild(v),requestAnimationFrame(()=>v.classList.add("visible")),setTimeout(()=>{v.classList.remove("visible"),setTimeout(()=>v.remove(),180)},2800)}a("uploadBtn").addEventListener("click",()=>{if(!h("accessToken")){a("loginModal").classList.add("active");return}e.classList.add("active"),d()}),a("closeModal").addEventListener("click",()=>e.classList.remove("active")),e.addEventListener("click",u=>{u.target===e&&e.classList.remove("active")}),a("browseBtn").addEventListener("click",u=>{u.stopPropagation(),s.click()}),t.addEventListener("click",()=>s.click()),t.addEventListener("dragover",u=>{u.preventDefault(),t.classList.add("dragover")}),t.addEventListener("dragleave",()=>t.classList.remove("dragover")),t.addEventListener("drop",u=>{u.preventDefault(),t.classList.remove("dragover"),u.dataTransfer.files.length&&y(u.dataTransfer.files)}),s.addEventListener("change",()=>{s.files.length&&y(s.files)});function d(){n.style.display="none",o.style.width="0%",o.style.background="",i.style.display="none",s.value=""}async function y(u){n.style.display="block",i.style.display="none",o.style.width="30%";const f=new FormData;for(const v of u)f.append("files",v);try{c(!0),o.style.width="50%";const v=await $("/api/v1/upload",{method:"POST",body:f});if(!v.ok)throw new Error("Upload failed");const w=await v.json();o.style.width="100%",setTimeout(()=>{e.classList.remove("active"),d(),x("#uploads")},250),p("Upload envoye, traitement en cours","success"),b(w),se(),_(!1),ae()}catch(v){console.error("Upload error:",v),o.style.background="#dc3545",p("Echec de l'upload","error")}finally{setTimeout(()=>c(!1),1200)}}async function b(u){if(!Array.isArray(u)||u.length===0)return;const f=u.map(F=>F.transaction_id).filter(Boolean);let v=0,w=0,S=0,j=0;for(const F of f)for(let fe=0;fe<180;fe++){await new Promise(H=>setTimeout(H,1e3));try{const H=await $(`/api/v1/upload/status/${F}`);if(!H.ok)break;const K=await H.json(),ie=(K.status||"").toLowerCase();if(ie==="done"||ie==="error"){ie==="error"?j+=1:(v+=K.new_networks||0,w+=K.updated_networks||0,S+=K.xp_earned||0,se(),_(!1),ae());break}}catch{break}}j>0&&p(`${j} upload(s) en erreur`,"error"),p(`Upload fini: ${v} nouveaux, ${w} updates, +${S} XP`,"success"),se(),_(!1),ae()}}Se();Oe();Te();Ne();Ie();De();ze();P("#map",{nav:a("navMap"),page:a("map"),onEnter:Pe,onLeave:je});P("#bluetooth",{nav:a("navBt"),page:a("btPage"),onEnter:ne});P("#cell",{nav:a("navCell"),page:a("cellPage"),onEnter:q});P("#leaderboard",{nav:a("navLeaderboard"),page:a("leaderboardPage"),onEnter:oe});P("#advanced-stats",{nav:a("navAdvancedStats"),page:a("advancedStatsPage"),onEnter:qe});P("#my-stats",{nav:a("navMyStats"),page:a("myStatsPage"),onEnter:Ge});P("#uploads",{nav:a("navUploads"),page:a("uploadsPage"),onEnter:Xe,onLeave:Ze});P("#profile",{nav:null,page:a("profilePage"),onEnter:He});a("navMap").addEventListener("click",()=>x("#map"));a("navBt").addEventListener("click",()=>x("#bluetooth"));a("navCell").addEventListener("click",()=>x("#cell"));a("navLeaderboard").addEventListener("click",()=>x("#leaderboard"));a("navAdvancedStats").addEventListener("click",()=>x("#advanced-stats"));a("navMyStats").addEventListener("click",()=>x("#my-stats"));a("navUploads").addEventListener("click",()=>x("#uploads"));a("hamburgerBtn").addEventListener("click",()=>{a("sidebar").classList.toggle("open")});$e();ae();se();_e();
