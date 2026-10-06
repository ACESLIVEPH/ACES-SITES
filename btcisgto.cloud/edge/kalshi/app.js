'use strict';
{const link=document.createElement('a');link.href='/edge/kalshi/experiments/';link.textContent='Paper strategy comparison →';document.querySelector('header').append(link);}
const $=id=>document.getElementById(id);let csrf='',forecastId='',markets=[];
async function request(path,body){const r=await fetch('/edge/kalshi/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{},body:body?JSON.stringify(body):undefined});const x=await r.json();if(!r.ok)throw Error(x.error||'Request failed');return x;}
const message=text=>$('message').textContent=text;
async function run(fn){try{await fn();}catch(e){message(e.message);}}
function clearForecast(){forecastId='';$('evaluate').disabled=true;$('proposal').disabled=true;proposal=null;$('proposal-result').textContent='No review proposal prepared.';$('paper').disabled=true;$('locked').textContent='';$('decision').textContent='No forecast evaluated.';}
async function status(){const s=await request('status');csrf=s.csrf;if(new URLSearchParams(location.search).get('next')==='reports'){location.replace('/edge/kalshi/reports/'+(['test','medium'].includes(new URLSearchParams(location.search).get('dataset'))?'?dataset='+new URLSearchParams(location.search).get('dataset'):''));return;}$('login').hidden=true;$('desk').hidden=false;$('metrics').replaceChildren();for(const text of ['Paper cash $'+(s.account.cashCents/100).toFixed(2),'Realized P&L $'+(s.account.totalPnlCents/100).toFixed(2),'Open positions '+s.account.openCount,s.account.halted?'HALTED':'Entries enabled']){const e=document.createElement('strong');e.textContent=text;$('metrics').append(e);}$('account-info').textContent=s.credentialsConfigured?'Kalshi key is configured on the server. Live orders remain disabled.':'Kalshi credentials not configured. Public market research and paper execution are available.';$('ledger').replaceChildren();for(const t of s.trades){const e=document.createElement('p');e.textContent=t.ticker+' · '+t.status+' · '+(t.pnl===null?'Awaiting settlement':'P&L $'+(t.pnl/100).toFixed(2));$('ledger').append(e);}const v=await request('validation');$('validation').textContent=(v.groups.length?v.groups.map(g=>g.source+': '+g.resolved+' settled / '+g.markets+' markets · Brier '+(g.brierScore===null?'pending':g.brierScore.toFixed(3))).join('\n'):'No settled forecasts yet.')+'\n'+v.method;}
$('login-form').onsubmit=e=>{e.preventDefault();run(async()=>{const password=$('password').value;$('password').value='';const x=await request('login',{password});csrf=x.csrf;await status();message('Signed in.');});};
$('logout').onclick=()=>run(async()=>{await request('logout',{});location.reload();});
$('refresh').onclick=()=>run(async()=>{await request('reconcile',{});await status();message('Ledger refreshed.');});
$('halt').onclick=()=>run(async()=>{const r=await request('halt',{});await status();message(r.message);});
$('account-check').onclick=()=>run(async()=>{const r=await request('account-check',{});$('account-info').textContent='Authenticated read-only connection verified. Reported balance: '+(Number.isFinite(r.balance.balance)?'$'+(r.balance.balance/100).toFixed(2):'available; see account')+'. Live execution is disabled.';});
$('markets').onclick=()=>run(async()=>{clearForecast();markets=(await request('markets')).markets;$('market').replaceChildren();for(const m of markets){const o=document.createElement('option');o.value=m.ticker;o.textContent=m.ticker+' · '+m.title;$('market').append(o);}showRules();message(markets.length+' markets loaded.');});
function showRules(){clearForecast();const m=markets.find(m=>m.ticker===$('market').value);$('rules').textContent=m?[m.title,m.rules_primary,m.rules_secondary,'Reference: '+m.floor_strike,'Close: '+m.close_time].join('\n\n'):'No open markets found.';$('reviewed').checked=false;}
$('market').onchange=showRules;
$('forecast').onsubmit=e=>{e.preventDefault();run(async()=>{const r=await request('forecast',{ticker:$('market').value,rulesHash:markets.find(m=>m.ticker===$('market').value)?.rulesHash,low:Number($('low').value)/100,mid:Number($('mid').value)/100,high:Number($('high').value)/100,evidence:$('evidence').value,rulesReviewed:$('reviewed').checked});forecastId=r.id;$('locked').textContent='Server-locked forecast '+r.id+'. Editing fields does not change this forecast until you lock again.';$('evaluate').disabled=false;$('proposal').disabled=false;$('paper').disabled=true;message('Forecast locked.');});};
$('evaluate').onclick=()=>run(async()=>{const r=await request('evaluate',{id:forecastId});showDecision(r);$('paper').disabled=!r.decision.order;message('Evaluation recorded, including passes.');});
$('paper').onclick=()=>run(async()=>{$('paper').disabled=true;const r=await request('paper',{id:forecastId});showDecision(r);await status();message(r.id?'Paper trade recorded. No real order submitted.':'Fresh checks did not allow a trade.');});
run(async()=>{try{await status();}catch{}});

function showDecision(r){
 if(r.duplicate){$('decision').textContent='This forecast already has a paper trade. No duplicate was recorded.';return;}
 const d=r.decision,o=d.order;
 const lines=[d.decision==='PASS'?'PASS — no trade':'Eligible paper trade: '+d.decision];
 if(o)lines.push(o.count+' contracts at '+(o.ask*100).toFixed(1)+'¢ each','Maximum modeled loss: $'+(o.costCents/100).toFixed(2)+' including estimated fees','Conservative raw edge: '+(o.rawEdge*100).toFixed(1)+'pp · net: '+(o.netEdge*100).toFixed(1)+'pp');
 lines.push(...d.blockers);
 if(r.id)lines.push('Recorded in the paper ledger. No real order was sent.');
 lines.push('Quote checked: '+new Date(r.quote.at).toLocaleTimeString(),'Fees are estimates. Orders are held to settlement.');
 $('decision').textContent=lines.join('\n');
}

$('readiness').onclick=()=>run(async()=>{
 $('readiness').disabled=true;
 try{const r=await request('readiness',{ticker:$('market').value||undefined});
 $('readiness-result').textContent=['Account cash: $'+(r.totalCashCents/100).toFixed(2),'BTC exchange cash: $'+(r.marketCashCents/100).toFixed(2),'Open positions: '+r.positionCount+' · resting orders: '+r.restingOrderCount,'Write permission: '+(r.writeScope?'verified':'not verified'),'Taker fee model: '+r.feeType+' × '+r.feeMultiplier,...r.blockers,...r.releaseBlockers,'Checked '+new Date(r.checkedAt).toLocaleString()].join('\n');message('Readiness check finished. No funds moved or orders submitted.');}
 finally{$('readiness').disabled=false;}
});
$('research').onclick=()=>run(async()=>{
 $('research').disabled=true;clearForecast();
 try{const r=await request('research',{ticker:$('market').value,rulesHash:markets.find(m=>m.ticker===$('market').value)?.rulesHash,rulesReviewed:$('reviewed').checked});
 forecastId=r.id;for(const k of ['low','mid','high'])$(k).value=(r.forecast[k]*100).toFixed(1);$('evidence').value=r.forecast.evidence;
 $('locked').textContent='Experimental paper forecast locked using '+r.forecast.samples+' BRTI samples. Not validated for live trading. Generated '+new Date(r.forecast.asOf).toLocaleTimeString()+'.';$('evaluate').disabled=false;$('proposal').disabled=false;message('Research forecast locked. Evaluate a fresh quote next.');}
 finally{$('research').disabled=false;}
});

let proposal=null;
function renderProposal(){if(!proposal)return;const p=proposal,o=p.order,expired=Date.now()>=p.expiresAt;
 $('proposal-result').textContent=[expired?'EXPIRED — refresh before review':'REVIEW ONLY — expires in '+Math.max(0,Math.ceil((p.expiresAt-Date.now())/1000))+' seconds',p.ticker,o?o.side+' × '+o.count+' at '+(o.ask*100).toFixed(2)+' cents':'PASS — no qualifying order',o?'Maximum modeled loss including fees: $'+(p.maximumLossCents/100).toFixed(2):'',...p.blockers,p.notice,'No order has been submitted.'].filter(Boolean).join('\n');}
$('proposal').onclick=()=>run(async()=>{$('proposal').disabled=true;try{proposal=(await request('proposal',{id:forecastId})).proposal;renderProposal();}finally{$('proposal').disabled=!forecastId;}});
setInterval(renderProposal,500);
