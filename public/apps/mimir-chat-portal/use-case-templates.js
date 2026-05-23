(function(){
  const chatCenter=document.querySelector('.mimir-chat-center');
  const promptEl=document.getElementById('mimir-prompt');
  const primaryLink=document.getElementById('primary-chat-link');
  const TEMPLATE_KEY='mimir-use-case-template-v1';

  if(!chatCenter)return;

  function templateOptions(){
    return [
      {
        id:'repo-analysis',
        label:'Repo analysis',
        meta:'Code and docs',
        target:'#multi-model-workspace',
        prompt:'Run a repo analysis plan in MMIR. Start free-first: tell me what to upload or connect, which local/free model route to use, what risks to inspect, and produce a concrete review checklist.'
      },
      {
        id:'product-plan',
        label:'Product plan',
        meta:'Users and money',
        target:'#workflow-builder',
        prompt:'Create a MMIR product plan focused on getting users and revenue. Prioritize free activation, useful first workflows, premium boundaries, marketplace potential and what should be built next.'
      },
      {
        id:'security-review',
        label:'Security review',
        meta:'Zero-trust',
        target:'#user-journeys',
        prompt:'Run a MMIR security review. Check public/private repo boundaries, local node pairing, provider-key handling, frontend/backend separation, data retention and zero-trust risks. Give concrete fixes.'
      },
      {
        id:'model-comparison',
        label:'Model comparison',
        meta:'Pick the best route',
        target:'#multi-model-workspace',
        prompt:'Compare the best available MMIR model routes for this task. Use live models if connected, otherwise explain free browser and installable local options with speed, privacy, cost and quality tradeoffs.'
      },
      {
        id:'workflow-planning',
        label:'Workflow planning',
        meta:'Automate work',
        target:'#workflow-builder',
        prompt:'Build my first MMIR workflow plan. Keep it simple, local/free-first, and useful immediately. Include steps, roles, inputs, outputs, safety gates and what can be automated now.'
      }
    ];
  }

  function openTarget(target){
    const el=document.querySelector(target);
    if(!el)return;
    if(el.tagName==='DETAILS')el.setAttribute('open','');
    el.scrollIntoView({block:'start',behavior:'smooth'});
  }

  function sendPrompt(value){
    if(!promptEl)return;
    promptEl.value=String(value||'').trim();
    promptEl.dispatchEvent(new Event('input',{bubbles:true}));
    promptEl.focus();
    window.setTimeout(()=>primaryLink?.click(),80);
  }

  function selectTemplate(template){
    localStorage.setItem(TEMPLATE_KEY,template.id);
    openTarget(template.target);
    sendPrompt(template.prompt);
    window.dispatchEvent(new CustomEvent('mmir-template-started',{detail:{id:template.id,label:template.label,target:template.target}}));
  }

  function card(template){
    const article=document.createElement('article');
    article.className='use-case-template-card';
    article.dataset.templateId=template.id;
    const meta=document.createElement('span');
    meta.textContent=template.meta;
    const title=document.createElement('strong');
    title.textContent=template.label;
    const button=document.createElement('button');
    button.type='button';
    button.textContent='Start';
    button.addEventListener('click',()=>selectTemplate(template));
    article.append(meta,title,button);
    return article;
  }

  function install(){
    if(document.getElementById('use-case-templates'))return;
    const section=document.createElement('section');
    section.id='use-case-templates';
    section.className='use-case-templates';
    section.setAttribute('aria-label','MMIR use-case templates');
    const head=document.createElement('div');
    head.className='use-case-template-head';
    head.innerHTML='<div><p class="eyebrow">Useful now</p><h2>Start with a real use case</h2></div><small>Free-first templates. No account, paid provider or hidden compute required.</small>';
    const grid=document.createElement('div');
    grid.className='use-case-template-grid';
    templateOptions().forEach(template=>grid.appendChild(card(template)));
    section.append(head,grid);

    const quick=document.querySelector('.quick-suggestions');
    if(quick&&quick.nextSibling)chatCenter.insertBefore(section,quick.nextSibling);
    else chatCenter.appendChild(section);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  window.MimirUseCaseTemplates={templateOptions};
})();
