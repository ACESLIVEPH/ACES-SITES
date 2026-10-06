'use strict';
{const link=document.createElement('a');link.href='/edge/kalshi/experiments/';link.textContent='Compare 3 strategies →';document.querySelector('header nav').prepend(link);}
const $=id=>document.getElementById(id),fields=['dataset','from','to','status','side','source','review','q'];
const money=c=>c==null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c/100);
const utc=ms=>ms?new Date(ms).toISOString().replace('T',' ').slice(0,19):'—';
let csrf='',params=new URLSearchParams(),page=1,current=null,busy=false,selected=null,lastSync=0;
{const dataset=new URLSearchParams(location.search).get('dataset');if(['test','medium'].includes(dataset)){params.set('dataset',dataset);$('dataset').value=dataset;}}
async function request(path,body){const r=await fetch('/edge/kalshi/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{},body:body?JSON.stringify(body):undefined});if(r.status===401){location.assign('/edge/kalshi/?next=reports'+(['test','medium'].includes(params.get('dataset'))?'&dataset='+params.get('dataset'):''));throw Error('Sign in to view your reports');}const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed');return data;}
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const color=n=>n>0?'positive':n<0?'negative':'';
function cells(parent,values){for(const v of values)parent.append(el('td',v));}
async function load(sync=false){if(busy)return;busy=true;try{
 if(sync&&(!params.get('dataset')||params.get('dataset')==='paper')){await request('reconcile',{});lastSync=Date.now();}
 const query=new URLSearchParams(params);query.set('page',page);current=await request('reports/data?'+query);page=current.page;render(current);$('message').textContent='';
}catch(e){$('message').textContent=e.message+' — last successful report, if any, remains shown.';}finally{busy=false;}}
function render(r){
 renderStrategy(r.strategyReview);
 $('coverage').textContent=r.coverage;$('ledger-badge').textContent=r.mode==='test'?'SYNTHETIC TEST':r.mode==='medium-paper'?'MEDIUM PAPER':'PAPER LEDGER';$('sync').disabled=r.mode!=='paper';
 $('pilot-panel').hidden=r.mode!=='medium-paper';if(r.pilotStatus){const p=r.pilotStatus;$('pilot-status').textContent=[p.phase||'Starting', 'Heartbeat: '+utc(p.lastTick)+' UTC', 'Observed markets: '+(p.observedMarkets||0), 'Entries: '+(p.trades||0)+' / 5', 'Scored forecasts: '+(p.resolvedForecasts||0)+' · Brier: '+(p.brierScore==null?'pending':p.brierScore.toFixed(3)), 'Spent: '+money(p.spentCents)+' / '+money(p.config?.budgetCents), 'Gross losses: '+money(p.grossLossCents)+' / $8.00', 'Entry window ends: '+utc(p.config?.deadline)+' UTC',p.lastError||''].filter(Boolean).join(' · ');$('pilot-toggle').textContent=p.paused?'Resume new entries':'Pause new entries';}
 $('asof').textContent='Updated '+utc(r.generatedAt)+' UTC · '+r.total+' matching trades';$('date-basis').textContent=r.dateBasis;
 const previous=$('source').value;$('source').replaceChildren(new Option('All sources','all'),...r.sources.map(s=>new Option(s,s)));$('source').value=r.sources.includes(previous)?previous:'all';
 const s=r.summary,metrics=[['Realized net P&L',money(s.realizedPnlCents),'Closed trades only · modeled fees included',color(s.realizedPnlCents)],['Win rate',s.winRate===null?'—':(s.winRate*100).toFixed(1)+'%',s.wins+' wins / '+s.losses+' losses / '+s.breakeven+' flat',''],['Open capital at risk',money(s.openRiskCents),s.open+' open positions · includes entry costs',''],['Closed trades',String(s.closed),s.trades+' total trades in this report',''],['Modeled fees',money(s.feesCents),'Includes open and settled entries',''],['Average closed trade',money(s.averagePnlCents),'Net realized P&L per closed trade',color(s.averagePnlCents)],['Max realized drawdown',money(s.maxDrawdownCents),'Peak-to-trough within the selected report',''],['Follow-ups',String(s.followups),'Trades marked for further review','']];
 $('metrics').replaceChildren(...metrics.map(([label,value,hint,cls])=>{const n=el('div',undefined,'metric');n.append(el('small',label),el('strong',value,cls),el('p',hint));return n;}));
 plot('curve',r.curve.map(p=>({label:utc(p.at)+' UTC',v:p.pnlCents})),false);plot('daily-chart',r.daily.map(p=>({label:p.date,v:p.pnlCents})),true);
 $('journal-count').textContent=r.total+' matching trades · page '+r.page+' of '+r.pages;$('empty').hidden=!!r.rows.length;$('trades').replaceChildren();
 for(const t of r.rows){const tr=el('tr');cells(tr,[utc(t.activityAt),t.ticker,t.side+' × '+t.count,t.status==='settled'?'Closed / settled':'Open',(t.entryPrice*100).toFixed(2)+'¢',money(t.costCents),money(t.feeCents)]);tr.append(el('td',money(t.realizedPnlCents),color(t.realizedPnlCents)));cells(tr,[t.reviewState]);const cell=el('td'),button=el('button','Review','secondary');button.setAttribute('aria-label','Review trade '+t.id);button.onclick=()=>details(t);cell.append(button);tr.append(cell);$('trades').append(tr);}
 $('page-label').textContent=r.page+' / '+r.pages;$('prev').disabled=r.page<=1;$('next').disabled=r.page>=r.pages;
 $('daily').replaceChildren(...r.daily.slice().reverse().map(d=>{const row=el('tr');cells(row,[d.date,d.trades,d.wins,money(d.feesCents)]);row.append(el('td',money(d.pnlCents),color(d.pnlCents)));return row;}));
 $('sources').replaceChildren(...r.bySource.map(d=>{const row=el('tr');cells(row,[d.source,d.trades+' / '+d.closed,money(d.feesCents)]);row.append(el('td',money(d.pnlCents),color(d.pnlCents)));return row;}));
 for(const kind of ['trades','daily']){const q=new URLSearchParams(params);q.set('kind',kind);$('export-'+kind).href='/edge/kalshi/reports/export?'+q;}
}
function plot(id,points,bars){const target=$(id);target.replaceChildren();if(!points.length){target.append(el('p','No closed trades in this report yet.'));return;}
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 600 230');svg.setAttribute('role','img');svg.setAttribute('aria-label',bars?'Daily realized paper P&L in dollars':'Cumulative realized paper P&L from zero');
 const node=(tag,attrs,text)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;};
 const data=bars?points:[{label:'Start of report',v:0},...points],min=Math.min(0,...data.map(p=>p.v)),max=Math.max(0,...data.map(p=>p.v)),span=Math.max(max-min,100),lo=min-(max===min?50:span*.12),hi=max+(max===min?50:span*.12),y=v=>190-(v-lo)/(hi-lo)*170;
 for(const v of [lo,0,hi]){svg.append(node('line',{x1:58,y1:y(v),x2:582,y2:y(v),stroke:v===0?'#789087':'#2c433a','stroke-dasharray':v===0?'0':'3 5'}),node('text',{x:3,y:y(v)+4,fill:'#94afa0','font-size':10},money(v)));}
 if(bars){const w=524/data.length;data.forEach((p,i)=>{const rect=node('rect',{x:58+i*w+w*.15,y:Math.min(y(0),y(p.v)),width:Math.max(.5,w*.7),height:Math.max(1,Math.abs(y(p.v)-y(0))),fill:p.v>=0?'#79d7b2':'#e99990',rx:2});rect.append(node('title',{},p.label+': '+money(p.v)));svg.append(rect);});}
 else {const x=i=>58+i*524/Math.max(1,data.length-1);svg.append(node('polyline',{points:data.map((p,i)=>x(i)+','+y(p.v)).join(' '),fill:'none',stroke:'#79d7b2','stroke-width':2.5}));data.forEach((p,i)=>{const dot=node('circle',{cx:x(i),cy:y(p.v),r:3,fill:'#c1ebd2'});dot.append(node('title',{},p.label+': '+money(p.v)));svg.append(dot);});}
 svg.append(node('text',{x:58,y:218,fill:'#94afa0','font-size':10},bars?data[0].label:'Trade sequence →'),node('text',{x:582,y:218,fill:'#94afa0','font-size':10,'text-anchor':'end'},bars?data.at(-1).label:points.length+' closed trades'));target.append(svg);
}
function details(t){selected=t.id;$('trade-detail').replaceChildren();const pairs=[['Trade ID',t.id],['Environment',current.mode==='test'?'SYNTHETIC TEST — preset outcomes':'PAPER — no real fill'],['Market',t.ticker],['Position',t.side+' × '+t.count],['Opened · UTC',utc(t.openedAt)+(t.openTimeEstimated?' (legacy quote timestamp)':'')],['Settlement observed',utc(t.closedAt)],['Entry price',(t.entryPrice*100).toFixed(2)+'¢'],['Cost incl. fees',money(t.costCents)],['Realized P&L',money(t.realizedPnlCents)],['Forecast source',t.source],['Forecast YES',t.probability===null?'—':(t.probability*100).toFixed(1)+'%'],['Net edge',t.netEdge===null?'—':(t.netEdge*100).toFixed(1)+'pp'],['Original evidence',t.evidence]];for(const [k,v] of pairs)$('trade-detail').append(el('dt',k),el('dd',v));$('note').value=t.note;$('review-state').value=t.reviewState;$('detail').showModal();}
$('pilot-toggle').onclick=async()=>{try{await request('reports/pilot-control',{action:current?.pilotStatus?.paused?'resume':'pause'});await load();}catch(e){$('message').textContent=e.message;}};
$('filters').onsubmit=e=>{e.preventDefault();params=new URLSearchParams();for(const id of fields)if($(id).value)params.set(id,$(id).value);page=1;load();};
$('reset').onclick=()=>{$('filters').reset();params=new URLSearchParams();page=1;load();};$('prev').onclick=()=>{page--;load();};$('next').onclick=()=>{page++;load();};$('sync').onclick=()=>load(true);$('print').onclick=()=>window.print();$('close-detail').onclick=()=>$('detail').close();
$('review-form').onsubmit=async e=>{e.preventDefault();$('save-review').disabled=true;try{await request('reports/review',{id:selected,dataset:params.get('dataset')||'paper',note:$('note').value,reviewState:$('review-state').value});$('detail').close();await load();}catch(e){$('message').textContent=e.message;}finally{$('save-review').disabled=false;}};
setInterval(()=>{if($('auto').checked&&!document.hidden&&!$('detail').open)load(!!current?.unfilteredOpenCount&&Date.now()-lastSync>60000);},30000);
(async()=>{try{const s=await request('status');csrf=s.csrf;await load();}catch(e){$('message').textContent=e.message;}})();

function renderStrategy(v){
 if(!v)return;
 $('strategy-scope').textContent=v.scope;$('strategy-limitations').textContent=v.limitations+' Live trading validation: incomplete.';
 $('strategy-validation').replaceChildren();
 for(const g of v.forecasts){const group=el('div');group.append(el('h3',g.source),el('p',g.resolved+' resolved / '+g.observed+' observed · Brier '+(g.brier==null?'pending':g.brier.toFixed(3))+' · constant 50% benchmark: 0.250'));
 for(const b of g.bins.filter(b=>b.count))group.append(el('p',(b.low*100).toFixed(0)+'–'+(b.high*100).toFixed(0)+'% bin: '+b.count+' markets · mean forecast '+(b.predicted*100).toFixed(1)+'% · observed YES '+(b.actual*100).toFixed(1)+'%'));
 $('strategy-validation').append(group);}
 if(!v.forecasts.length)$('strategy-validation').append(el('p','No forecasts recorded yet.'));
 $('fill-stress').textContent=v.stress.map(s=>'+'+s.adverseCents+'¢ per contract: '+money(s.pnlCents)+' net across '+s.closed+' closed trades'+(s.unsupported?' · '+s.unsupported+' excluded (missing fee data or invalid price)':'')).join(' | ');
 const table=el('table'),head=el('tr');for(const h of ['Time · UTC','Market','Decision','Reason'])head.append(el('th',h));table.append(head);
 for(const d of v.decisions){const row=el('tr');cells(row,[utc(d.at),d.ticker,d.decision,d.blockers.join('; ')||'Paper sizing and edge gates passed']);table.append(row);}
 $('decision-log').replaceChildren(v.decisions.length?table:el('p','No evaluations recorded yet.'));
}
