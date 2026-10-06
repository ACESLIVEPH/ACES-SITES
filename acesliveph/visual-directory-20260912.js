(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url = v => { try { const u = new URL(v); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
  const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const label = new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',dateStyle:'full'}).format(new Date());
  const old = date => !date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || (Date.now()-Date.parse(date+'T00:00:00+08:00'))>30*86400000;
  for(const id of ['todayDate','guideDate']) if($(id)) $(id).textContent=label;
  const seed = id => JSON.parse($(id)?.textContent || '[]');
  let venues=seed('directory-seed');
  let category='all';
  function renderVenues(){
    const q=$('businessSearch').value.trim().toLowerCase();
    const area=$('areaFilter').value;
    const filtered=venues.filter(v => (category==='all'||[v.category,...(v.tags||[])].join(' ').toLowerCase().includes(category)) && (area==='all'||v.area?.includes(area)) && [v.name,v.area,v.address,v.description,v.entertainment,...(v.tags||[])].join(' ').toLowerCase().includes(q));
    $('venueGrid').innerHTML=filtered.map(v=>{
      const source=url(v.sourceUrl);
      const research=String(v.sourceName).startsWith('Third-party:');
      const status=old(v.lastChecked)?'Needs refresh':research?'Research listing':'Official source reviewed';
      const map='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(v.name+' '+(v.address||v.area||''));
      const vibes={"hardin-founding-partner": "Garden dining \u00b7 Acoustic music", "bar20-hann": "Cocktails \u00b7 Live performances", "creekside-midori": "Alfresco dining \u00b7 Live entertainment", "treat-hilton": "Lounge \u00b7 Selected live music nights", "live-house-resto-lead": "Resto bar \u00b7 Live bands", "midnight-rodeo-lead": "Pub nights \u00b7 Live music", "clouds-bar": "Rooftop bar \u00b7 Acoustic & bands"};
      const vibe=vibes[v.id]||v.entertainment||v.category;
      return `<article class="listing" id="place-${esc(v.id)}"><span class="type">${esc(v.area)} · ${esc(v.category)}</span><h3>${esc(v.name)}</h3><p class="venue-vibe">${esc(vibe)}</p>${v.status==='partner'?'<p class="partner-disclosure">ACES partner · commercial relationship</p>':''}<details><summary>Details & schedule</summary><p>${esc(v.description)}</p><p>${esc(v.address)}</p><p>${esc(v.scheduleNotes||'Confirm current schedule directly.')}</p><p class="source-status">${status} · ${esc(v.lastChecked||'Date unavailable')}</p><p>${esc(v.sourceName||'Source not supplied')}</p><div class="listing-meta">${source?`<a href="${esc(source)}" target="_blank" rel="noopener">Venue source ↗</a>`:''}<a href="${esc(map)}" target="_blank" rel="noopener">Directions ↗</a><a href="https://wa.me/639629362007?text=${encodeURIComponent('Listing correction: '+v.name+'\nSource link:\nCorrection:')}">Suggest correction</a></div></details></article>`;
    }).join('');
    $('businessCount').textContent=filtered.length+(filtered.length===1?' venue':' venues');
    $('venueEmptyState').hidden=!!filtered.length;
  }
  if($('venueGrid')){
    document.querySelectorAll('[data-venue-filter]').forEach(b=>b.addEventListener('click',()=>{
      category=b.dataset.venueFilter;
      document.querySelectorAll('[data-venue-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});
      renderVenues();
    }));
    $('businessSearch').addEventListener('input',renderVenues);
    $('areaFilter').addEventListener('change',renderVenues);
    renderVenues();
    fetch('/api/venues').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
      if(!Array.isArray(data.venues))throw Error();
      venues=data.venues;renderVenues();
    }).catch(()=>{$('directoryStatus').textContent='Showing saved venue listings; current updates are unavailable. Source review dates appear on each listing.';});
  }
  if($('listingGrid')){
    let events=[],active='all',failed=false;
    const renderEvents=()=>{
      const q=$('venueSearch').value.trim().toLowerCase();
      const shown=events.filter(e=>(active==='all'||String(e.category).includes(active)) && [e.venue,e.title,e.description].join(' ').toLowerCase().includes(q));
      $('listingGrid').innerHTML=shown.map(e=>`<article class="listing"><div class="listing-top"><span class="type">${esc(e.date)} · ${esc(e.time)} Manila time</span><span class="source-status">Published schedule</span></div><h3>${esc(e.venue)}</h3><p><strong>${esc(e.title)}</strong><br>${esc(e.description)}</p><div class="listing-meta"><span>${esc(e.cover||'Ask venue about cover')}</span><a href="${esc(url(e.sourceUrl))}" target="_blank" rel="noopener">Event source ↗</a></div></article>`).join('');
      $('resultCount').textContent=shown.length+(shown.length===1?' dated event':' dated events');
      $('emptyState').hidden=!!shown.length;
      $('eventStatus').textContent=failed?'Tonight’s updates could not be loaded. Check venue sources directly.':events.length?(shown.length?'Published schedules for today; check for cancellations before travelling.':'No events match these filters.'):'No confirmed events published for today yet. Explore the venues above for inspiration.';
    };
    document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{active=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderEvents();}));
    document.querySelectorAll('[data-set-filter]').forEach(a=>a.addEventListener('click',()=>{document.querySelector(`[data-filter="${a.dataset.setFilter}"]`)?.click();}));
    $('venueSearch').addEventListener('input',renderEvents);
    fetch('/api/events').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{if(!Array.isArray(data.events))throw Error();events=data.events.filter(e=>e.date===today()&&url(e.sourceUrl));renderEvents();}).catch(()=>{failed=true;renderEvents();});
  }
  if($('pokerSearch')){
    const filterRooms=()=>{
      const query=$('pokerSearch').value.toLowerCase().trim(), area=$('pokerArea').value;
      let count=0;
      document.querySelectorAll('[data-room]').forEach(card=>{const show=card.textContent.toLowerCase().includes(query)&&(area==='all'||card.dataset.area.includes(area));card.hidden=!show;if(show)count++;});
      $('roomCount').textContent=count+(count===1?' room':' rooms');$('roomEmpty').hidden=!!count;
    };
    $('pokerSearch').addEventListener('input',filterRooms);$('pokerArea').addEventListener('change',filterRooms);filterRooms();
  }
})();
