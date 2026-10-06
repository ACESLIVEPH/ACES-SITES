import {parseCSV,syntheticBars} from './engine.js';
const $=id=>document.getElementById(id);let worker=null,report=null,history=[];
const pct=n=>(n>=0?'+':'')+n.toFixed(2)+'%';
$('source').addEventListener('change',()=>{$('upload-area').hidden=$('source').value!=='uploaded';$('data-summary').textContent=$('source').value==='uploaded'?'Upload your own historical observations. Provenance is supplied by you and is not independently verified.':'1,200 fictional hourly observations. This is an engineering demonstration, not market evidence.';});
function idle(){worker?.terminate();worker=null;$('run').disabled=false;$('cancel').hidden=true;}
$('cancel').addEventListener('click',()=>{idle();$('run-state').textContent='Cancelled';$('run-error').textContent='Experiment cancelled. No new result was added.';});
$('run').addEventListener('click',async()=>{
  $('run-error').textContent='';$('run').disabled=true;$('run-state').textContent='Preparing data';
  try{
    const source=$('source').value;let bars,sourceName;
    if(source==='uploaded'){const file=$('csv').files[0];if(!file)throw Error('Choose a CSV file first.');if(file.size>2000000)throw Error('CSV must be smaller than 2 MB.');bars=parseCSV(await file.text());sourceName=file.name;}else{bars=syntheticBars();sourceName='Synthetic hourly series · seed 42';}
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(bars)));
    const dataHash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    worker=new Worker('/agents/worker.js',{type:'module'});$('cancel').hidden=false;
    worker.onmessage=e=>{const msg=e.data;if(msg.type==='progress')$('run-state').textContent=msg.message;if(msg.type==='error'){idle();$('run-state').textContent='Run failed';$('run-error').textContent=msg.message;}if(msg.type==='result'){report=msg.report;idle();render();}};
    worker.onerror=()=>{idle();$('run-state').textContent='Run failed';$('run-error').textContent='The research worker failed to load or execute. No result was recorded.';};
    worker.postMessage({bars,options:{source,sourceName,dataHash}});
  }catch(e){idle();$('run-state').textContent='Needs attention';$('run-error').textContent=e.message;}
});
function render(){
  window.dispatchEvent(new CustomEvent('hydra-report',{detail:report}));
  $('empty').hidden=true;$('results').hidden=false;$('run-state').textContent='Run complete';
  $('selected').textContent=report.selectedAgent.family+' agent · '+report.selectedAgent.id;
  $('provenance').textContent=report.sourceName+' · '+report.observations.toLocaleString()+' observations · final '+(report.split.test[1]-report.split.test[0])+' observations tested';
  $('verdict').textContent=report.verdict+'. Live trading remains disabled.';
  $('return').textContent=pct(report.test.returnPct);$('return').className=report.test.returnPct>=0?'up':'down';
  $('benchmark').textContent=pct(report.benchmark.returnPct);$('drawdown').textContent=report.test.drawdownPct.toFixed(2)+'%';$('trades').textContent=report.test.trades;
  $('gates').replaceChildren(...report.gates.map(g=>{const li=document.createElement('li'),name=document.createElement('span'),value=document.createElement('strong');name.textContent=g.name;value.textContent=g.pass?'PASS':'FAIL';if(!g.pass)value.className='fail';li.append(name,value);return li;}));
  $('limitations').replaceChildren(...report.limitations.map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));
  const table=document.createElement('table');table.innerHTML='<thead><tr><th>Candidate</th><th>Train net</th><th>Validation net</th><th>Status</th></tr></thead>';const tbody=document.createElement('tbody');
  for(const candidate of report.trained){const validated=report.validated.find(v=>v.agent.id===candidate.agent.id);const tr=document.createElement('tr');for(const text of [candidate.agent.id,pct(candidate.train.returnPct),validated?pct(validated.validation.returnPct):'Not advanced',candidate.agent.id===report.selectedAgent.id?'Selected':validated?'Validation finalist':'Training only']){const td=document.createElement('td');td.textContent=text;tr.append(td);}tbody.append(tr);}table.append(tbody);$('candidate-table').replaceChildren(table);
  history.push({at:report.createdAt,id:report.selectedAgent.id,returnPct:report.test.returnPct,source:report.source,hash:report.dataHash});
  $('history').replaceChildren(...history.map(h=>{const li=document.createElement('li');li.textContent=new Date(h.at).toLocaleTimeString()+' · '+h.id+' · '+h.source+' · '+pct(h.returnPct)+' test return · data '+h.hash.slice(0,10);return li;}));
  draw();
}
function draw(){if(!report)return;const canvas=$('equity-chart'),dpr=window.devicePixelRatio||1,width=canvas.clientWidth,height=230;canvas.width=width*dpr;canvas.height=height*dpr;const c=canvas.getContext('2d');c.scale(dpr,dpr);const pad={l:53,r:12,t:18,b:24};const curves=[report.test.curve,report.benchmark.curve];let values=curves.flatMap(a=>a.map(p=>p.equity));let low=Math.min(...values),high=Math.max(...values);if(high-low<5){low-=5;high+=5;}const buffer=(high-low)*.08;low-=buffer;high+=buffer;c.font='11px Arial';c.fillStyle='#b7beb7';for(let i=0;i<4;i++){const y=pad.t+(height-pad.t-pad.b)*i/3;c.strokeStyle='#344139';c.beginPath();c.moveTo(pad.l,y);c.lineTo(width-pad.r,y);c.stroke();c.fillText((high-(high-low)*i/3).toFixed(0),0,y+4);}curves.forEach((curve,k)=>{c.strokeStyle=k===0?'#f6ad62':'#a4bdc6';c.lineWidth=2;c.beginPath();curve.forEach((p,i)=>{const x=pad.l+i/(curve.length-1)*(width-pad.l-pad.r),y=pad.t+(high-p.equity)/(high-low)*(height-pad.t-pad.b);if(i===0)c.moveTo(x,y);else c.lineTo(x,y);});c.stroke();});c.fillStyle='#b7beb7';c.fillText('PTS · test observations only',pad.l,height-4);}
new ResizeObserver(draw).observe($('equity-chart'));
$('download').addEventListener('click',()=>{if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='hydra-report-'+report.createdAt.replaceAll(':','-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
