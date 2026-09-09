// Public runtime-contract fixtures only. No provider calls or credentials.
export function singleWriterStatus(){
  return {
    ok:true,
    no_paid_routes_started:true,
    live_verified_intelligence_route_count:1,
    operator_readiness:{
      readiness_state:'first_chat_degraded_ready',
      default_writer_readiness:{
        object:'mmir.default_writer_runtime_readiness',
        schema_version:'2026-07-22-default-writer-runtime-readiness-v1',
        deploy_readiness_schema_version:'2026-07-22-default-writer-deploy-readiness-v1',
        classification:'single_writer_degraded_ready',
        authenticated_release_ready:false,
        authenticated_single_writer_degraded_ready:true,
        promotion_bootstrap_ready:false,
        verification_mode:'keyed-hmac',
        authenticated_evaluation_completed:true,
        evaluated_at:new Date().toISOString(),
        gates:{
          fresh_public_proof_authenticated:true,
          provider_diversity_authenticated:false,
          single_writer_degraded_authenticated:true,
          provider_route_budget_release_admission_satisfied:false
        },
        counts:{evidence_route_count:1,fresh_public_provider_count:1,admitted_writer_provider_count:1,rejected_route_count:0},
        blocker_codes:['provider_diversity_not_authenticated','provider_route_budget_not_release_ready'],
        provider_calls_started:0,
        no_paid_routes_started:true,
        secrets_exposed:false
      },
      journeys:{first_chat_ready:true,compare_ready:false,swarm_preview_ready:false}
    }
  };
}

export function singleWriterInventory(){
  return {
    object:'list',
    inventory_view:'compact',
    default_model:'supergeni',
    no_paid_routes_started:true,
    total_visible_model_count:2,
    live_verified_intelligence_route_count:1,
    data:[
      {
        id:'supergeni',model:'supergeni',object:'model',display_name:'Supergeni',provider:'mmir',
        route_id:'supergeni/connected',route_state:'connected_meta_route_available',route_type:'connected_meta_route',
        executable:true,selectable:true,candidate:false,live_e2e_verified:false,live_e2e_proof:null,
        cost_class:null,cost_state:null,no_paid_routes_started:true
      },
      {
        id:'openai/gpt-oss-120b',model:'openai/gpt-oss-120b',object:'model',display_name:'Groq GPT OSS 120B',provider:'groq',
        route_id:'groq/openai/gpt-oss-120b',route_state:'public_untrusted_free_available',route_type:'external_untrusted_free',
        executable:true,selectable:true,candidate:false,live_e2e_verified:true,
        live_e2e_proof:{verified:true,stable_verified:true,no_paid_routes_started:true,route_key:'groq:openai/gpt-oss-120b'},
        cost_class:'free-quota',cost_state:'free_guarded',no_paid_routes_started:true
      }
    ]
  };
}
