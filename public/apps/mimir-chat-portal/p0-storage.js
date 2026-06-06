(function(){
  const version='20260606-b1-06-p0-storage-v1';

  function readString(key,fallback=''){
    try{
      const value=localStorage.getItem(key);
      return value==null?fallback:String(value);
    }catch(error){
      return fallback;
    }
  }

  function writeString(key,value){
    try{
      localStorage.setItem(key,String(value));
      return true;
    }catch(error){
      return false;
    }
  }

  function remove(key){
    try{
      localStorage.removeItem(key);
      return true;
    }catch(error){
      return false;
    }
  }

  function readJson(key,fallback){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value==null?fallback:value;
    }catch(error){
      return fallback;
    }
  }

  function writeJson(key,value){
    try{
      localStorage.setItem(key,JSON.stringify(value));
      return true;
    }catch(error){
      return false;
    }
  }

  function ensureSchema(schemaKey,schema,resetKeys=[]){
    if(readString(schemaKey,'')===schema)return true;
    resetKeys.forEach(remove);
    writeString(schemaKey,schema);
    return false;
  }

  window.MimirP0Storage={
    version,
    readString,
    writeString,
    remove,
    readJson,
    writeJson,
    ensureSchema
  };

  window.dispatchEvent?.(new CustomEvent('mimir-p0-storage-ready',{detail:{version}}));
})();
