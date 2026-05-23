(function(){
  const main=document.querySelector('.mimir-chat-main');
  let fileEl=null;
  let questionEl=null;
  let previewEl=null;
  let gateEl=null;
  let statusEl=null;
  let activeImage=null;

  if(!main)return;

  function clean(value,max=1000){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function setStatus(message,state){if(statusEl){statusEl.textContent=message||'';statusEl.dataset.state=state||'idle';}}
  function selectedModelLabel(){
    const select=document.getElementById('runtime-model');
    return clean(select?.selectedOptions?.[0]?.textContent||select?.value||'',200);
  }
  function selectedModelRuntime(){
    const select=document.getElementById('runtime-model');
    return clean(select?.selectedOptions?.[0]?.dataset?.runtime||'',80);
  }
  function looksVisionCapable(label){
    return /(vision|vl|llava|bakllava|minicpm|qwen.*vl|gemma3|gpt-4o|multimodal|image)/i.test(label||'');
  }
  function gate(id,label,status,detail){return {id,label,status,detail};}
  function routePlan(){
    const label=selectedModelLabel();
    const runtime=selectedModelRuntime();
    const capable=looksVisionCapable(label);
    const hasImage=!!activeImage;
    const gates=[
      gate('image-selected','Image or screenshot selected',hasImage?'passed':'blocked',hasImage?'Image is previewed locally only.':'Choose or paste an image first.'),
      gate('model-capability','Vision-capable model',capable?'passed':'blocked',capable?'Selected model label indicates vision capability.':'Select a vision-capable model such as LLaVA, Qwen-VL, MiniCPM-V or another trusted multimodal route.'),
      gate('runtime-boundary','Trusted runtime boundary',runtime==='live'||runtime==='ollama'||runtime==='starter'||runtime==='webllm'?'needs_review':'blocked','Raw images must only go to a paired local node or protected backend that supports multimodal content.'),
      gate('public-storage','No public persistence','passed','Image bytes are previewed in memory and are not stored in localStorage.'),
      gate('api-contract','Multimodal API contract','blocked','Text chat is live, but raw image upload stays blocked until the backend multimodal route is explicit.')
    ];
    return {
      object:'vision.route_plan',
      status:gates.some(item=>item.status==='blocked')?'blocked_until_capable_route':'ready_for_review',
      selected_model:label||'No model selected',
      runtime:runtime||'unknown',
      image:activeImage?{
        name:activeImage.name,
        type:activeImage.type,
        size_bytes:activeImage.size,
        width:activeImage.width,
        height:activeImage.height
      }:null,
      gates,
      raw_image_sent:false,
      next_actions:capable?[
        'Use a paired local/protected multimodal route before sending raw image bytes.',
        'For now, send only the image metadata and user question into chat.',
        'Keep screenshots with secrets out of public frontend storage.'
      ]:[
        'Install or select a trusted vision-capable local model.',
        'Keep the image local until the selected route advertises multimodal capability.',
        'Use the image metadata brief for planning today.'
      ]
    };
  }
  function renderGates(plan){
    if(!gateEl)return;
    gateEl.innerHTML='';
    const article=document.createElement('article');
    article.className='vision-route-result';
    article.innerHTML='<h3>Vision route - '+escapeHtml(clean(plan.status,80))+'</h3><p>Model: '+escapeHtml(clean(plan.selected_model,180))+'. Raw image sent: '+String(plan.raw_image_sent)+'.</p>';
    const grid=document.createElement('div');
    grid.className='vision-gate-grid';
    plan.gates.forEach(item=>{
      const cell=document.createElement('div');
      cell.className='vision-gate';
      cell.dataset.state=item.status;
      cell.innerHTML='<span>'+escapeHtml(clean(item.label,80))+'</span><strong>'+escapeHtml(clean(item.status,40))+'</strong><small>'+escapeHtml(clean(item.detail,240))+'</small>';
      grid.appendChild(cell);
    });
    article.appendChild(grid);
    const actions=document.createElement('ol');
    actions.className='vision-next-actions';
    plan.next_actions.forEach(action=>{
      const li=document.createElement('li');
      li.textContent=action;
      actions.appendChild(li);
    });
    article.appendChild(actions);
    gateEl.appendChild(article);
  }
  function readImage(file){
    if(!file||!/^image\//.test(file.type||'')){setStatus('Choose an image file first.','error');return;}
    const url=URL.createObjectURL(file);
    const image=new Image();
    image.onload=()=>{
      activeImage={name:file.name,type:file.type,size:file.size,width:image.naturalWidth,height:image.naturalHeight,url};
      renderPreview();
      setStatus('Image preview ready locally.','ready');
    };
    image.onerror=()=>{
      URL.revokeObjectURL(url);
      setStatus('Image preview failed.','error');
    };
    image.src=url;
  }
  function renderPreview(){
    if(!previewEl)return;
    if(!activeImage){
      previewEl.innerHTML='<p>No image selected.</p>';
      return;
    }
    previewEl.innerHTML='<img src="'+activeImage.url+'" alt="Local preview" /><div><strong>'+escapeHtml(clean(activeImage.name,120))+'</strong><span>'+activeImage.width+'x'+activeImage.height+' · '+Math.round(activeImage.size/1024)+' KB · local preview only</span></div>';
  }
  function checkRoute(){
    const plan=routePlan();
    renderGates(plan);
    setStatus('Vision route checked. Raw image was not sent.','ready');
  }
  function sendMetadataToChat(){
    const plan=routePlan();
    const prompt=document.getElementById('mimir-prompt');
    const question=clean(questionEl?.value,1000);
    if(!prompt)return;
    if(!plan.image){setStatus('Choose or paste an image first.','error');return;}
    prompt.value='Use this local image metadata only. Do not claim to see the raw image unless a trusted vision route is active. Image: '+JSON.stringify(plan.image)+'. Question: '+(question||'Help me decide the safest MMIR vision route.');
    prompt.dispatchEvent(new Event('input',{bubbles:true}));
    prompt.focus();
    setStatus('Image metadata sent to chat composer.','ready');
  }
  function clearImage(){
    if(activeImage?.url)URL.revokeObjectURL(activeImage.url);
    activeImage=null;
    if(fileEl)fileEl.value='';
    renderPreview();
    setStatus('Local image preview cleared.','ready');
  }
  function handlePasteImage(event){
    const items=Array.from(event.clipboardData?.items||[]);
    const imageItem=items.find(item=>/^image\//.test(item.type||''));
    if(!imageItem)return;
    const file=imageItem.getAsFile();
    if(file){
      readImage(file);
      setStatus('Pasted screenshot captured locally.','ready');
    }
  }
  function install(){
    if(document.getElementById('vision-input'))return;
    const details=document.createElement('details');
    details.id='vision-input';
    details.className='mimir-provider-drawer vision-input';
    details.innerHTML=''+
      '<summary>+ Vision / Screenshots</summary>'+
      '<section class="mimir-dashboard" aria-labelledby="vision-input-title">'+
        '<div class="dashboard-heading"><div><p class="eyebrow">Multimodal boundary</p><h2 id="vision-input-title">Image and screenshot context</h2></div></div>'+
        '<div class="vision-input-body">'+
          '<div class="workflow-builder-row">'+
            '<label for="vision-image-file">Image<input id="vision-image-file" type="file" accept="image/*" /></label>'+
            '<label for="vision-question">Question<input id="vision-question" type="text" maxlength="1000" placeholder="What should MMIR inspect or route?" /></label>'+
          '</div>'+
          '<div id="vision-preview" class="vision-preview" aria-live="polite"><p>No image selected.</p></div>'+
          '<div class="workflow-builder-actions">'+
            '<button id="vision-check-route" type="button">Check vision route</button>'+
            '<button id="vision-send-metadata" type="button">Send metadata to chat</button>'+
            '<button id="vision-clear-image" type="button">Clear image</button>'+
          '</div>'+
          '<p id="vision-status" class="dashboard-note" data-state="idle" aria-live="polite"></p>'+
          '<div id="vision-gates" class="vision-gates" aria-live="polite"></div>'+
        '</div>'+
      '</section>';
    const settings=document.getElementById('backend-settings');
    main.insertBefore(details,settings||null);
    fileEl=document.getElementById('vision-image-file');
    questionEl=document.getElementById('vision-question');
    previewEl=document.getElementById('vision-preview');
    gateEl=document.getElementById('vision-gates');
    statusEl=document.getElementById('vision-status');
    fileEl?.addEventListener('change',()=>readImage(fileEl.files?.[0]));
    document.getElementById('vision-check-route')?.addEventListener('click',checkRoute);
    document.getElementById('vision-send-metadata')?.addEventListener('click',sendMetadataToChat);
    document.getElementById('vision-clear-image')?.addEventListener('click',clearImage);
    document.addEventListener('paste',handlePasteImage);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
