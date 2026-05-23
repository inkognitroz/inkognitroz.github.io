(function(){
  const WORKSPACE_KEY='mimir-active-workspace-v1';
  const DEFAULT_WORKSPACE_ID='personal';
  const STORAGE_PREFIX='mimir-data-analysis-v1:';
  const MAX_FILE_BYTES=1024*1024;
  const root=document.getElementById('data-analysis-root');
  let rows=sampleRows();
  let parsedName='Sample activation data';
  let analysis=analyzeRows(rows);
  let selectedMetric='';
  let selectedCategory='';

  if(!root)return;

  function workspaceId(){return localStorage.getItem(WORKSPACE_KEY)||DEFAULT_WORKSPACE_ID;}
  function storageKey(){return STORAGE_PREFIX+workspaceId();}
  function safe(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function setStatus(message,state){const el=document.getElementById('data-analysis-status');if(el){el.textContent=message||'';el.dataset.state=state||'idle';}}
  function finite(value){const number=Number(String(value).replace(',','.'));return Number.isFinite(number)?number:null;}
  function mean(values){return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;}
  function sampleRows(){
    return [
      {journey:'Free chat',visitors:420,activated:322,avg_minutes:1.8,route:'browser'},
      {journey:'Local model',visitors:210,activated:92,avg_minutes:7.4,route:'local-node'},
      {journey:'Model compare',visitors:96,activated:54,avg_minutes:4.2,route:'backend'},
      {journey:'Knowledge upload',visitors:74,activated:41,avg_minutes:5.1,route:'browser'},
      {journey:'Workflow build',visitors:65,activated:29,avg_minutes:6.6,route:'backend'}
    ];
  }

  function parseDelimited(text,delimiter){
    const rowsOut=[];
    let row=[];
    let cell='';
    let quoted=false;
    const value=String(text||'').replace(/^\uFEFF/,'');
    for(let index=0;index<value.length;index+=1){
      const char=value[index];
      const next=value[index+1];
      if(char==='"'&&quoted&&next==='"'){cell+='"';index+=1;continue;}
      if(char==='"'){quoted=!quoted;continue;}
      if(!quoted&&char===delimiter){row.push(cell);cell='';continue;}
      if(!quoted&&(char==='\n'||char==='\r')){
        if(char==='\r'&&next==='\n')index+=1;
        row.push(cell);
        if(row.some(item=>String(item).trim()))rowsOut.push(row);
        row=[];
        cell='';
        continue;
      }
      cell+=char;
    }
    row.push(cell);
    if(row.some(item=>String(item).trim()))rowsOut.push(row);
    if(!rowsOut.length)return [];
    const headers=rowsOut[0].map((header,index)=>String(header||('column_'+String(index+1))).trim()||('column_'+String(index+1)));
    return rowsOut.slice(1).map(values=>{
      const item={};
      headers.forEach((header,index)=>{item[header]=String(values[index]??'').trim();});
      return item;
    });
  }

  function detectDelimiter(text){
    const first=String(text||'').split(/\r?\n/).find(line=>line.trim())||'';
    const choices=[',','\t',';'];
    return choices.map(delimiter=>({delimiter,count:first.split(delimiter).length})).sort((a,b)=>b.count-a.count)[0]?.delimiter||',';
  }

  function parseInput(text){
    const trimmed=String(text||'').trim();
    if(!trimmed)return [];
    if(trimmed.startsWith('{')||trimmed.startsWith('[')){
      const parsed=JSON.parse(trimmed);
      const source=Array.isArray(parsed)?parsed:(Array.isArray(parsed.rows)?parsed.rows:[]);
      return source.filter(item=>item&&typeof item==='object'&&!Array.isArray(item)).map(item=>({...item}));
    }
    return parseDelimited(trimmed,detectDelimiter(trimmed));
  }

  function columnValues(data,column){
    return data.map(row=>row[column]).filter(value=>String(value??'').trim()!=='');
  }

  function inferColumns(data){
    const names=[...new Set(data.flatMap(row=>Object.keys(row||{})))];
    return names.map(name=>{
      const values=columnValues(data,name);
      const numbers=values.map(finite).filter(value=>value!==null);
      const numericRatio=values.length?numbers.length/values.length:0;
      const type=numericRatio>=0.7?'number':'category';
      const missing=Math.max(0,data.length-values.length);
      const unique=new Set(values.map(value=>String(value))).size;
      const top=[...values.reduce((map,value)=>{
        const key=String(value);
        map.set(key,(map.get(key)||0)+1);
        return map;
      },new Map()).entries()].sort((a,b)=>b[1]-a[1]).slice(0,8);
      return {
        name,
        type,
        count:values.length,
        missing,
        unique,
        numbers,
        min:numbers.length?Math.min(...numbers):null,
        max:numbers.length?Math.max(...numbers):null,
        mean:numbers.length?mean(numbers):null,
        sum:numbers.length?numbers.reduce((total,value)=>total+value,0):null,
        top
      };
    });
  }

  function analyzeRows(data){
    const safeRows=Array.isArray(data)?data.slice(0,5000):[];
    const columns=inferColumns(safeRows);
    const numeric=columns.filter(column=>column.type==='number');
    const categories=columns.filter(column=>column.type!=='number');
    return {
      name:parsedName,
      created_at:new Date().toISOString(),
      row_count:safeRows.length,
      column_count:columns.length,
      columns,
      numeric,
      categories,
      warnings:safeRows.length>=5000?['Only first 5000 rows are analyzed in-browser to keep the UI responsive.']:[]
    };
  }

  function metricOptions(){
    const options=analysis.numeric.map(column=>'<option value="'+safe(column.name)+'" '+(selectedMetric===column.name?'selected':'')+'>'+safe(column.name)+'</option>');
    return '<option value="">Auto metric</option>'+options.join('');
  }

  function categoryOptions(){
    const options=analysis.categories.map(column=>'<option value="'+safe(column.name)+'" '+(selectedCategory===column.name?'selected':'')+'>'+safe(column.name)+'</option>');
    return '<option value="">Auto group</option>'+options.join('');
  }

  function metricCards(){
    const activationRate=columnByName('activated')&&columnByName('visitors')
      ? Math.round((columnByName('activated').sum/Math.max(1,columnByName('visitors').sum))*1000)/10+'%'
      : 'not detected';
    return [
      ['Rows',analysis.row_count],
      ['Columns',analysis.column_count],
      ['Numeric',analysis.numeric.length],
      ['Activation',activationRate]
    ].map(([label,value])=>'<article class="data-analysis-card"><span>'+safe(label)+'</span><strong>'+safe(value)+'</strong></article>').join('');
  }

  function columnByName(name){
    return analysis.columns.find(column=>column.name===name)||null;
  }

  function selectedColumns(){
    const metric=columnByName(selectedMetric)||analysis.numeric[0]||null;
    const category=columnByName(selectedCategory)||analysis.categories[0]||null;
    return {metric,category};
  }

  function chartData(){
    const {metric,category}=selectedColumns();
    if(category&&metric){
      const grouped=new Map();
      rows.forEach(row=>{
        const label=String(row[category.name]??'empty')||'empty';
        const value=finite(row[metric.name])||0;
        grouped.set(label,(grouped.get(label)||0)+value);
      });
      return {
        title:metric.name+' by '+category.name,
        bars:[...grouped.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([label,value])=>({label,value}))
      };
    }
    if(metric){
      const values=metric.numbers.slice().sort((a,b)=>a-b);
      const min=values[0]||0;
      const max=values[values.length-1]||0;
      const span=Math.max(1,max-min);
      const buckets=Array.from({length:8},(_,index)=>({label:String(Math.round(min+(span/8)*index)),value:0}));
      values.forEach(value=>{
        const bucket=Math.min(7,Math.floor(((value-min)/span)*8));
        buckets[bucket].value+=1;
      });
      return {title:'Distribution of '+metric.name,bars:buckets};
    }
    if(category){
      return {title:'Top '+category.name,bars:category.top.map(([label,value])=>({label,value}))};
    }
    return {title:'No chartable columns yet',bars:[]};
  }

  function renderSvgChart(){
    const data=chartData();
    const bars=data.bars;
    if(!bars.length)return '<div class="data-analysis-empty">Paste CSV, TSV or JSON to create a chart.</div>';
    const max=Math.max(...bars.map(bar=>bar.value),1);
    const width=720;
    const height=260;
    const gap=10;
    const barWidth=(width-60-(bars.length-1)*gap)/bars.length;
    const barHtml=bars.map((bar,index)=>{
      const h=Math.max(3,(bar.value/max)*170);
      const x=40+index*(barWidth+gap);
      const y=200-h;
      return '<g><rect x="'+x+'" y="'+y+'" width="'+barWidth+'" height="'+h+'" rx="4"></rect><text x="'+(x+barWidth/2)+'" y="224" text-anchor="middle">'+safe(String(bar.label).slice(0,14))+'</text><text x="'+(x+barWidth/2)+'" y="'+(y-8)+'" text-anchor="middle">'+safe(formatNumber(bar.value))+'</text></g>';
    }).join('');
    return '<figure class="data-analysis-chart"><figcaption>'+safe(data.title)+'</figcaption><svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+safe(data.title)+'"><line x1="34" y1="202" x2="700" y2="202"></line>'+barHtml+'</svg></figure>';
  }

  function formatNumber(value){
    const number=Number(value);
    if(!Number.isFinite(number))return String(value);
    if(Math.abs(number)>=1000)return Math.round(number).toLocaleString('en-US');
    return String(Math.round(number*100)/100);
  }

  function columnTable(){
    if(!analysis.columns.length)return '<p class="empty-backends">No columns detected yet.</p>';
    return '<div class="data-analysis-table-wrap"><table class="data-analysis-table"><thead><tr><th>Column</th><th>Type</th><th>Rows</th><th>Missing</th><th>Summary</th></tr></thead><tbody>'+
      analysis.columns.map(column=>{
        const summary=column.type==='number'
          ? 'min '+formatNumber(column.min)+' / mean '+formatNumber(column.mean)+' / max '+formatNumber(column.max)
          : column.top.map(([label,count])=>String(label).slice(0,20)+' ('+count+')').join(', ');
        return '<tr><td>'+safe(column.name)+'</td><td>'+safe(column.type)+'</td><td>'+safe(column.count)+'</td><td>'+safe(column.missing)+'</td><td>'+safe(summary||'empty')+'</td></tr>';
      }).join('')+'</tbody></table></div>';
  }

  function savedSnapshots(){
    try{
      const value=JSON.parse(localStorage.getItem(storageKey())||'[]');
      return Array.isArray(value)?value:[];
    }catch(error){
      return [];
    }
  }

  function writeSnapshots(items){
    localStorage.setItem(storageKey(),JSON.stringify(items.slice(0,20)));
    window.dispatchEvent(new CustomEvent('mmir-data-analysis-updated',{detail:{workspaceId:workspaceId(),count:items.length}}));
  }

  function renderSaved(){
    const items=savedSnapshots();
    if(!items.length)return '<p class="empty-backends">No saved local analysis snapshots yet.</p>';
    return items.map(item=>'<article class="workflow-list-item"><div><strong>'+safe(item.name)+'</strong><small>'+safe(item.row_count)+' rows - '+safe(item.created_at.slice(0,16))+'</small></div><div class="runtime-message-actions"><button type="button" data-analysis-load="'+safe(item.id)+'">Load</button><button type="button" data-analysis-delete="'+safe(item.id)+'">Delete</button></div></article>').join('');
  }

  function summaryText(){
    const top=analysis.columns.slice(0,8).map(column=>{
      const summary=column.type==='number'
        ? 'min '+formatNumber(column.min)+', mean '+formatNumber(column.mean)+', max '+formatNumber(column.max)
        : 'top '+column.top.slice(0,3).map(([label,count])=>label+'='+count).join(', ');
      return '- '+column.name+' ('+column.type+'): '+summary;
    }).join('\n');
    return [
      'Dataset: '+parsedName,
      'Rows: '+analysis.row_count,
      'Columns: '+analysis.column_count,
      'Safety: browser-only analysis; no arbitrary code execution; raw data not sent unless the user explicitly does it.',
      top
    ].join('\n');
  }

  function render(){
    const sample=rows.slice(0,5);
    root.innerHTML=''+
      '<div class="data-analysis-layout">'+
        '<section class="data-analysis-panel">'+
          '<div class="data-analysis-policy"><strong>Safe analysis</strong><span>Browser-only, max 1 MB file, no arbitrary code, no provider keys, no paid backend.</span></div>'+
          '<div class="workflow-builder-row">'+
            '<label>Upload CSV/TSV/JSON<input id="data-analysis-file" type="file" accept=".csv,.tsv,.json,text/csv,application/json,text/tab-separated-values" /></label>'+
            '<label>Chart metric<select id="data-analysis-metric">'+metricOptions()+'</select></label>'+
          '</div>'+
          '<label>Paste data<textarea id="data-analysis-input" rows="7" placeholder="Paste CSV, TSV or JSON array here...">'+safe(toCsv(rows))+'</textarea></label>'+
          '<div class="workflow-builder-row">'+
            '<label>Group by<select id="data-analysis-category">'+categoryOptions()+'</select></label>'+
            '<label>Name<input id="data-analysis-name" value="'+safe(parsedName)+'" maxlength="120" /></label>'+
          '</div>'+
          '<div class="workflow-builder-actions">'+
            '<button id="data-analysis-run" type="button">Analyze</button>'+
            '<button id="data-analysis-sample" type="button">Load sample</button>'+
            '<button id="data-analysis-save" type="button">Save snapshot</button>'+
            '<button id="data-analysis-export" type="button">Export JSON</button>'+
            '<button id="data-analysis-send-chat" type="button">Send summary to chat</button>'+
            '<button id="data-analysis-clear" type="button">Clear</button>'+
          '</div>'+
          '<p id="data-analysis-status" class="workflow-status" data-state="idle" aria-live="polite"></p>'+
        '</section>'+
        '<section class="data-analysis-results">'+
          '<div class="data-analysis-card-grid">'+metricCards()+'</div>'+
          renderSvgChart()+
          columnTable()+
          '<details class="model-catalog-hint"><summary>+ Parsed preview</summary><pre class="data-analysis-preview">'+safe(JSON.stringify(sample,null,2))+'</pre></details>'+
          '<details class="model-catalog-hint"><summary>+ Saved local snapshots</summary><div class="workflow-list">'+renderSaved()+'</div></details>'+
        '</section>'+
      '</div>';
    bind();
  }

  function bind(){
    document.getElementById('data-analysis-run')?.addEventListener('click',runAnalysis);
    document.getElementById('data-analysis-sample')?.addEventListener('click',()=>{parsedName='Sample activation data';rows=sampleRows();analysis=analyzeRows(rows);selectedMetric='';selectedCategory='';render();setStatus('Sample analysis loaded.','ready');});
    document.getElementById('data-analysis-save')?.addEventListener('click',saveSnapshot);
    document.getElementById('data-analysis-export')?.addEventListener('click',exportJson);
    document.getElementById('data-analysis-send-chat')?.addEventListener('click',sendToChat);
    document.getElementById('data-analysis-clear')?.addEventListener('click',()=>{rows=[];parsedName='Untitled analysis';analysis=analyzeRows(rows);selectedMetric='';selectedCategory='';render();});
    document.getElementById('data-analysis-file')?.addEventListener('change',readFile);
    document.getElementById('data-analysis-metric')?.addEventListener('change',event=>{selectedMetric=event.target.value;render();});
    document.getElementById('data-analysis-category')?.addEventListener('change',event=>{selectedCategory=event.target.value;render();});
    root.querySelectorAll('[data-analysis-load]').forEach(button=>button.addEventListener('click',()=>loadSnapshot(button.dataset.analysisLoad)));
    root.querySelectorAll('[data-analysis-delete]').forEach(button=>button.addEventListener('click',()=>deleteSnapshot(button.dataset.analysisDelete)));
  }

  function runAnalysis(){
    try{
      const name=String(document.getElementById('data-analysis-name')?.value||'Untitled analysis').trim()||'Untitled analysis';
      const text=String(document.getElementById('data-analysis-input')?.value||'');
      if(new Blob([text]).size>MAX_FILE_BYTES){setStatus('Input is over 1 MB. Use a smaller sample for browser-only analysis.','error');return;}
      const parsed=parseInput(text);
      parsedName=name;
      rows=parsed;
      analysis=analyzeRows(rows);
      selectedMetric=document.getElementById('data-analysis-metric')?.value||'';
      selectedCategory=document.getElementById('data-analysis-category')?.value||'';
      render();
      setStatus('Analysis ready. No data left the browser.','ready');
    }catch(error){
      setStatus('Could not parse data: '+(error?.message||'unknown error'),'error');
    }
  }

  async function readFile(event){
    const file=event.target.files?.[0];
    if(!file)return;
    if(file.size>MAX_FILE_BYTES){setStatus('File is over 1 MB. Use a smaller sample for browser-only analysis.','error');return;}
    const text=await file.text();
    parsedName=file.name.replace(/\.[^.]+$/,'')||'Uploaded analysis';
    const input=document.getElementById('data-analysis-input');
    const name=document.getElementById('data-analysis-name');
    if(input)input.value=text;
    if(name)name.value=parsedName;
    runAnalysis();
  }

  function toCsv(data){
    if(!Array.isArray(data)||!data.length)return '';
    const headers=[...new Set(data.flatMap(row=>Object.keys(row)))];
    const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
    return headers.join(',')+'\n'+data.map(row=>headers.map(header=>quote(row[header])).join(',')).join('\n');
  }

  function snapshot(){
    return {
      id:'analysis-'+String(Date.now())+'-'+String(Math.random()).slice(2,6),
      workspace_id:workspaceId(),
      name:parsedName,
      created_at:new Date().toISOString(),
      row_count:analysis.row_count,
      column_count:analysis.column_count,
      summary:analysis,
      rows:rows.slice(0,200)
    };
  }

  function saveSnapshot(){
    const item=snapshot();
    writeSnapshots([item].concat(savedSnapshots()));
    render();
    setStatus('Local analysis snapshot saved.','ready');
  }

  function loadSnapshot(id){
    const item=savedSnapshots().find(snapshot=>snapshot.id===id);
    if(!item)return;
    parsedName=item.name||'Saved analysis';
    rows=Array.isArray(item.rows)?item.rows:[];
    analysis=analyzeRows(rows);
    selectedMetric='';
    selectedCategory='';
    render();
    setStatus('Saved snapshot loaded.','ready');
  }

  function deleteSnapshot(id){
    writeSnapshots(savedSnapshots().filter(item=>item.id!==id));
    render();
    setStatus('Saved snapshot deleted.','ready');
  }

  function exportJson(){
    const blob=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download='mmir-data-analysis-'+workspaceId()+'.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('Analysis JSON exported.','ready');
  }

  function sendToChat(){
    const prompt=document.getElementById('mimir-prompt');
    const send=document.getElementById('primary-chat-link');
    if(!prompt){setStatus('Chat composer is not available.','error');return;}
    prompt.value='Review this MMIR data analysis summary and recommend the next product action:\n\n'+summaryText();
    prompt.dispatchEvent(new Event('input',{bubbles:true}));
    document.getElementById('mimir-chat-runtime')?.scrollIntoView({block:'start',behavior:'smooth'});
    window.setTimeout(()=>send?.click(),40);
    setStatus('Summary sent to chat. Raw rows stayed local.','ready');
  }

  window.addEventListener('mmir-workspace-changed',()=>{analysis=analyzeRows(rows);render();});
  render();
})();
