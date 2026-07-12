!function(w,d){
  const VERSION='20260712-empty-composer-v1';
  const REQUIRED_FIELDS=[
    'name',
    'tagline',
    'theme',
    'icon',
    'starter_prompts',
    'feature_flags',
    'policy_profile',
    'default_route_label',
    'default_model_label'
  ];
  const BRANDS={
    mmir:{
      id:'mmir',
      name:'MMIR.ai',
      title:'MMIR.ai',
      tagline:'Intelligence. Connected.',
      description:'One chat surface for connected intelligence, verified answers, models, nodes, tools and trusted routes.',
      theme:{accent:'#0f766e',accent2:'#2563eb',surface:'#ffffff'},
      icon:'MM',
      starter_prompts:[
        'Ask anything. Show the best answer and proof when it matters.',
        'Find fresh sources before answering this.',
        'Compare active routes and explain why the best answer won.'
      ],
      feature_flags:{model_catalog:true,feedback:true,vision:true,proof_line:true,council:true},
      policy_profile:'public-demo-learning',
      default_route_label:'Supergeni',
      default_model_label:'Supergeni',
      hero_title:'Ask anything.',
      chat_description:'Supergeni answers now.',
      prompt_placeholder:'',
      active_title:'Supergeni active.',
      send_label:'Send prompt to Supergeni'
    },
    supergeni:{
      id:'supergeni',
      name:'Supergeni',
      title:'Supergeni by MMIR',
      tagline:'Best answer. Proven.',
      description:'A premium MMIR brand shell focused on one excellent answer with source proof, model agreement and clear uncertainty.',
      theme:{accent:'#7c3aed',accent2:'#0f766e',surface:'#ffffff'},
      icon:'SG',
      starter_prompts:[
        'Give me the best answer and show what evidence supports it.',
        'Check live sources and answer in Norwegian.',
        'Let several models challenge the answer, then converge.'
      ],
      feature_flags:{model_catalog:true,feedback:true,vision:true,proof_line:true,council:true},
      policy_profile:'premium-answer-proof',
      default_route_label:'Supergeni',
      default_model_label:'Supergeni',
      hero_title:'One best answer.',
      chat_description:'Supergeni compares intelligence and gives one clean answer.',
      prompt_placeholder:'',
      active_title:'Supergeni active.',
      send_label:'Send prompt to Supergeni'
    },
    skolechatten:{
      id:'skolechatten',
      name:'Skolechatten',
      title:'Skolechatten by MMIR',
      tagline:'Trygg hjelp. Gode kilder.',
      description:'An education-safe MMIR brand shell with stricter tone, sources and age-appropriate guidance.',
      theme:{accent:'#2563eb',accent2:'#f59e0b',surface:'#ffffff'},
      icon:'SK',
      starter_prompts:[
        'Forklar dette enkelt, med kilder og eksempler.',
        'Lag en trygg studieplan for dette temaet.',
        'Sjekk svaret mitt og vis hva jeg kan forbedre.'
      ],
      feature_flags:{model_catalog:false,feedback:true,vision:true,proof_line:true,council:false},
      policy_profile:'education-safe',
      default_route_label:'Supergeni',
      default_model_label:'Supergeni',
      hero_title:'Laer smartere.',
      chat_description:'Skolechatten bruker MMIR til trygge svar med kilder.',
      prompt_placeholder:'',
      active_title:'Skolechatten active.',
      send_label:'Send prompt to Skolechatten'
    },
    spakona:{
      id:'spakona',
      name:'Spakona',
      title:'Spakona by MMIR',
      tagline:'Lekent format. Samme beviskrav.',
      description:'A playful MMIR brand shell for interpretation and reflection while keeping the same safety and proof rails.',
      theme:{accent:'#be123c',accent2:'#7c3aed',surface:'#ffffff'},
      icon:'SP',
      starter_prompts:[
        'Tolk dette kreativt, men skill fakta fra fantasi.',
        'Gi meg tre mulige veier videre og hva som taler for hver.',
        'Svar lekent, men vis tydelig hva som er usikkert.'
      ],
      feature_flags:{model_catalog:false,feedback:true,vision:true,proof_line:true,council:true},
      policy_profile:'playful-proof',
      default_route_label:'Supergeni',
      default_model_label:'Supergeni',
      hero_title:'Still sporsmalet.',
      chat_description:'Spakona bruker MMIRs bevislinje bak et lekent skall.',
      prompt_placeholder:'',
      active_title:'Spakona active.',
      send_label:'Send prompt to Spakona'
    }
  };

  function selectedBrandId(){
    const params=new URLSearchParams(w.location.search||'');
    const raw=params.get('brand')||d.documentElement?.dataset?.mimirBrand||'mmir';
    return String(raw||'mmir').toLowerCase().replace(/[^a-z0-9-]/g,'');
  }

  function text(selector,value){
    const el=d.querySelector(selector);
    if(el&&typeof value==='string')el.textContent=value;
  }

  function attr(selector,name,value){
    const el=d.querySelector(selector);
    if(el&&typeof value==='string')el.setAttribute(name,value);
  }

  function meta(name,value){
    const el=d.querySelector('meta[name="'+name+'"]');
    if(el&&typeof value==='string')el.setAttribute('content',value);
  }

  function apply(config){
    if(!config)return;
    d.documentElement.dataset.mimirBrand=config.id;
    d.documentElement.style.setProperty('--mimir-brand-accent',config.theme.accent);
    d.documentElement.style.setProperty('--mimir-brand-accent-2',config.theme.accent2);
    d.title=config.title||config.name;
    meta('description',config.description);
    text('[data-brand-field="name"]',config.name);
    text('[data-brand-field="tagline"]',config.tagline);
    text('[data-brand-field="mark"]',config.icon);
    text('#mimir-title',config.hero_title);
    text('#active-chat-description',config.chat_description);
    text('#active-chat-title',config.active_title);
    attr('#mimir-prompt','placeholder',config.prompt_placeholder);
    attr('#primary-chat-link','aria-label',config.send_label);
    attr('.mimir-brand','aria-label',config.name+' home');
    text('#mmir-instant-start .instant-node.is-active',config.default_route_label);

    text('#mmir-p0-app .p0-brand-text strong',config.name);
    text('#mmir-p0-app .p0-brand-text span',config.tagline);
    text('#mmir-p0-app .p0-mark',config.icon);
    attr('#mmir-p0-app .p0-brand','aria-label',config.name+' chat');
    attr('#p0-input','placeholder',config.prompt_placeholder);
    attr('#p0-input','aria-label','Message '+config.name);
    text('#p0-model .p0-model-name',config.default_model_label);

    w.MimirBrandConfig={
      version:VERSION,
      active_brand:config.id,
      default_route_label:config.default_route_label,
      default_model_label:config.default_model_label,
      feature_flags:{...config.feature_flags},
      policy_profile:config.policy_profile,
      no_provider_secrets_in_browser:true,
      no_orchestration_decisions_in_browser:true
    };
    w.dispatchEvent(new CustomEvent('mimir-brand-config-applied',{detail:w.MimirBrandConfig}));
  }

  function applyActive(){
    const id=selectedBrandId();
    apply(BRANDS[id]||BRANDS.mmir);
  }

  w.MimirBrandRegistry=Object.freeze({
    version:VERSION,
    required_fields:REQUIRED_FIELDS.slice(),
    brands:BRANDS,
    preview_url:'./mmir.html?brand=supergeni'
  });
  w.MimirApplyBrandConfig=applyActive;

  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',applyActive,{once:true});
  else applyActive();
  w.addEventListener('load',()=>{applyActive();setTimeout(applyActive,100);setTimeout(applyActive,700);},{once:true});
}(window,document);
