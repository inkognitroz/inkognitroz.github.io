(function(){
  const version='20260607-b0-06-02-route-benchmarks-v1';

  function clampScore(value){
    return Math.max(0,Math.min(100,Math.round(Number(value)||0)));
  }

  function defaultFormatDuration(value){
    const ms=Math.max(0,Math.round(Number(value)||0));
    if(ms<1000)return ms+'ms';
    const seconds=ms/1000;
    return (seconds<10?seconds.toFixed(1):Math.round(seconds))+'s';
  }

  function defaultLatencyClass(ms){
    if(ms<900)return 'fast';
    if(ms<2200)return 'acceptable';
    return 'slow';
  }

  function create({
    getBenchmarks=()=>({}),
    setBenchmarks=()=>{},
    writeBenchmarks=()=>{},
    routePinned=()=>false,
    formatDuration=defaultFormatDuration,
    latencyClass=defaultLatencyClass
  }={}){
    function routeKey(model){
      if(!model)return 'hosted:mmir-supergenius';
      return (model.route==='local'?'local:':'hosted:')+String(model.model||model.id||model.label||'auto').toLowerCase();
    }

    function routeBenchmark(model){
      const stats=getBenchmarks()?.[routeKey(model)];
      return stats&&typeof stats==='object'?stats:null;
    }

    function recordRouteBenchmark(model,score){
      if(!model||!score)return;
      const key=routeKey(model);
      const previous=routeBenchmark(model)||{samples:0,avgScore:Number(model.score)||50,avgLatencyMs:0,failures:0,lastSeenAt:''};
      const samples=Math.min(20,Number(previous.samples||0)+1);
      const priorWeight=Math.max(0,samples-1);
      const measuredScore=clampScore(score.score);
      const measuredLatency=Math.max(0,Number(score.elapsedMs||score.latency_ms)||0);
      const failed=score.answer_class==='failed'||score.failed||measuredScore<=0;
      const avgScore=Math.round(((Number(previous.avgScore)||Number(model.score)||50)*priorWeight+measuredScore)/samples);
      const avgLatencyMs=Math.round(((Number(previous.avgLatencyMs)||measuredLatency)*priorWeight+measuredLatency)/samples);
      const next={...(getBenchmarks()||{}),[key]:{
        samples,
        avgScore,
        avgLatencyMs,
        failures:(Number(previous.failures)||0)+(failed?1:0),
        lastScore:measuredScore,
        lastLatencyMs:Math.round(measuredLatency),
        lastClass:score.latency_class||latencyClass(measuredLatency),
        lastSeenAt:new Date().toISOString()
      }};
      setBenchmarks(next);
      writeBenchmarks(next);
    }

    function effectiveModelScore(model){
      const base=Number(model?.score)||50;
      const stats=routeBenchmark(model);
      if(!stats||!stats.samples)return clampScore(base);
      const avgScore=Number(stats.avgScore)||base;
      const avgLatency=Number(stats.avgLatencyMs)||0;
      const failures=Number(stats.failures)||0;
      let score=(base*0.45)+(avgScore*0.55);
      if(avgLatency>6000)score-=16;
      else if(avgLatency>3000)score-=10;
      else if(avgLatency>1800)score-=5;
      else if(avgLatency&&avgLatency<900)score+=4;
      if(failures)score-=Math.min(18,failures*6);
      return clampScore(score);
    }

    function rankedModels(models){
      return (models||[])
        .slice()
        .sort((a,b)=>{
          const pinnedDelta=(routePinned(b)?1:0)-(routePinned(a)?1:0);
          if(pinnedDelta)return pinnedDelta;
          return effectiveModelScore(b)-effectiveModelScore(a)||String(a.label||a.id).localeCompare(String(b.label||b.id));
        });
    }

    function routeRankMap(models=[]){
      const map={};
      rankedModels(models).forEach((model,index)=>{map[model.id]=index+1;});
      return map;
    }

    function routeBenchmarkSummary(model){
      const stats=routeBenchmark(model);
      if(!stats||!stats.samples)return '';
      const parts=[
        'Score '+effectiveModelScore(model),
        stats.avgLatencyMs?('avg '+formatDuration(stats.avgLatencyMs)):'',
        stats.samples+' sample'+(stats.samples===1?'':'s')
      ].filter(Boolean);
      if(stats.failures)parts.push(stats.failures+' failure'+(stats.failures===1?'':'s'));
      return parts.join(' · ');
    }

    function routeRankState(model){
      const stats=routeBenchmark(model);
      const score=effectiveModelScore(model);
      if((stats?.failures||0)>0||score<55)return 'demoted';
      if((stats?.avgLatencyMs||0)>3000)return 'slow';
      if(score>=82)return 'strong';
      return 'measured';
    }

    return {
      routeKey,
      routeBenchmark,
      recordRouteBenchmark,
      effectiveModelScore,
      rankedModels,
      routeRankMap,
      routeBenchmarkSummary,
      routeRankState
    };
  }

  window.MimirP0RouteBenchmarks={version,create,clampScore};
  window.dispatchEvent?.(new CustomEvent('mimir-p0-route-benchmarks-ready',{detail:{version}}));
})();
