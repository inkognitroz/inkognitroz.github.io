(function(){
  const version='20260714-truthful-chat-state-v1';

  function code(error){
    const value=Number(error?.status||error?.statusCode||error?.payload?.status||0);
    return Number.isFinite(value)?value:0;
  }

  function stopped(error){
    return error?.name==='AbortError'||error?.code==='ABORT_ERR';
  }

  function pending(label='Supergeni'){
    return String(label||'Supergeni').trim()+' tenker …';
  }

  function comparing(label='Supergeni'){
    return String(label||'Supergeni').trim()+' sammenligner svar …';
  }

  function synthesizing(){return 'Supergeni velger beste svar …';}
  function streaming(){return 'Skriver svar …';}
  function slow(){return 'Jobber fortsatt. Dette tar litt lengre tid enn vanlig.';}
  function stoppedText(){return 'Svaret ble stoppet.';}

  function transient(value){
    const text=String(value||'').trim();
    return /^(Thinking|Comparing active routes|Synthesizing best answer|Opening Feedback Inbox|Registrerer feedback|Response stopped)/i.test(text)||
      /\b(?:tenker|sammenligner svar)\s+…$/i.test(text)||
      text===synthesizing()||text===streaming()||text===slow()||text===stoppedText();
  }

  function errorText(error){
    if(stopped(error))return stoppedText();
    const status=code(error);
    if(status===401||status===403)return 'Tilkoblingen må fornyes. Prøv igjen.';
    if(status===413)return 'Meldingen eller vedlegget er for stort. Gjør det litt mindre og prøv igjen.';
    if(status===429)return 'Kapasitetsgrensen er nådd akkurat nå. Vent litt og prøv igjen.';
    if(status===502||status===503||status===504)return 'Supergeni svarer ikke akkurat nå. Prøv igjen om et øyeblikk.';
    if(status===404)return 'Denne svarruten er midlertidig utilgjengelig. Velg Prøv igjen.';
    return 'Noe gikk galt mens svaret ble hentet. Prøv igjen.';
  }

  window.MimirChatStateCopy={version,code,stopped,pending,comparing,synthesizing,streaming,slow,stoppedText,transient,errorText};
  window.dispatchEvent?.(new CustomEvent('mimir-chat-state-copy-ready',{detail:{version}}));
})();
