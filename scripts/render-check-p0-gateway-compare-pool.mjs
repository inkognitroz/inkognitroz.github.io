import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { resolveRenderPort } from './render-port-helper.mjs';

const host = '127.0.0.1';
let port = Number(process.env.MMIR_GATEWAY_COMPARE_RENDER_PORT || 8796);
let baseUrl = `http://${host}:${port}`;
const screenshotDir = process.env.MMIR_GATEWAY_COMPARE_SCREENSHOTS || 'test-results/p0-gateway-compare';
const failures = [];
const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type,x-mmir-local-token',
  'access-control-allow-private-network': 'true'
};

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function startServer() {
  const child = spawn(process.execPath, ['scripts/serve-public.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, HOST: host, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', chunk => process.stdout.write(String(chunk)));
  child.stderr.on('data', chunk => process.stderr.write(String(chunk)));
  return child;
}

async function waitForServer(url) {
  const deadline = Date.now() + 10000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error(`Server did not become ready at ${url}: ${lastError?.message || 'timeout'}`);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fulfillJson(route, body, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: corsHeaders,
    body: JSON.stringify(body)
  });
}

async function installFixtures(page) {
  await page.route('https://api.mmir.ai/v1/models', async route => {
    await fulfillJson(route, {
      object: 'list',
      data: [
        {
          id: 'supergeni',
          name: 'Supergeni',
          display_name: 'Supergeni',
          provider: 'mmir',
          executable: true,
          selectable: true,
          recommended: true,
          availability: 'available',
          route_state: 'managed_provider_available',
          route_type: 'managed_provider',
          route_class: 'free',
          trust_level: 'public-free',
          cost_class: 'free'
        },
        {
          id: 'poolside/laguna-xs.2:free',
          name: 'OpenRouter Laguna XS',
          display_name: 'Laguna XS',
          provider: 'openrouter',
          executable: true,
          selectable: true,
          availability: 'available',
          route_state: 'managed_provider_available',
          route_type: 'external_untrusted_free',
          route_class: 'external-untrusted-free',
          trust_level: 'external-untrusted-free',
          cost_class: 'free'
        },
        {
          id: 'openai/gpt-oss-20b:free',
          name: 'OpenRouter GPT OSS 20B',
          display_name: 'OpenRouter GPT OSS 20B',
          provider: 'openrouter',
          executable: true,
          selectable: true,
          availability: 'available',
          route_state: 'managed_provider_available',
          route_type: 'external_untrusted_free',
          route_class: 'external-untrusted-free',
          trust_level: 'external-untrusted-free',
          cost_class: 'free'
        },
        {
          id: 'gemini-2.5-flash',
          name: 'Google Gemini 2.5 Flash',
          display_name: 'Gemini 2.5 Flash',
          provider: 'google',
          executable: true,
          selectable: true,
          availability: 'available',
          route_state: 'managed_provider_available',
          route_type: 'external_untrusted_free',
          route_class: 'external-untrusted-free',
          trust_level: 'external-untrusted-free',
          cost_class: 'free'
        },
        {
          id: 'qwen/qwen3-32b',
          name: 'qwen/qwen3-32b',
          display_name: 'Groq: qwen/qwen3-32b',
          provider: 'groq',
          executable: true,
          selectable: true,
          candidate: false,
          visible_to_public_ui: true,
          availability: 'available',
          route_state: 'public_untrusted_free_available',
          route_type: 'external_untrusted_free',
          route_class: 'external-untrusted-free',
          trust_level: 'external-untrusted-free',
          cost_class: 'free-quota'
        }
      ]
    });
  });

  await page.route('https://api.mmir.ai/prompts/presets', async route => {
    await fulfillJson(route, { object: 'list', data: [] });
  });

  await page.route(/https:\/\/api\.mmir\.ai\/chat\/(swarm|superboost)\/preview/, async route => {
    const isSuperboost = route.request().url().includes('/chat/superboost/preview');
    await delay(1200);
    await fulfillJson(route, {
      object: isSuperboost ? 'chat.superboost.preview' : 'chat.swarm.preview',
      status: isSuperboost ? 'superboost_ready' : 'first_round_ready',
      mode: isSuperboost ? 'superboost' : 'sync_swarm_preview',
      vision: 'Intelligence. Connected.',
      default_meta_model: 'Supergeni',
      route: isSuperboost ? '/chat/superboost/preview' : '/chat/swarm/preview',
      underlying_route: isSuperboost ? '/chat/swarm/preview' : undefined,
      target_route_count: 472,
      sync_route_limit: 40,
      current_round: 1,
      planned_debate_rounds: 3,
      superboost: isSuperboost ? {
        label: 'Superboost',
        promise: 'Ask many AI routes, cross-check the result, and return one clean answer.',
        execution: 'round_2_cross_review_executed',
        attempted_route_count: 5,
        all_answer_count: 3,
        council_review_count: 2,
        async_472_route_plan_required: true,
        continuation_ready: true,
        continuation_display: true,
        continuation: {
          object: 'mmir.answer_continuation',
          policy_version: '2026-06-24-continuation-v1',
          needed: true,
          display: true,
          reason: 'best_answer_truncated',
          user_action_label: 'Fortsett svaret',
          suggested_user_message: 'Fortsett svaret fra der det stoppet. Ikke start på nytt; fullfør med samme kontekst.',
          prompt_included_in_metadata: false,
          answer_included_in_metadata: false,
          provider_called: false,
          provider_secrets_in_browser: false,
          no_paid_routes_started: true
        },
        no_paid_routes_started: true,
        provider_secrets_in_browser: false
      } : undefined,
      continuation: isSuperboost ? {
        object: 'mmir.answer_continuation',
        policy_version: '2026-06-24-continuation-v1',
        needed: true,
        display: true,
        reason: 'best_answer_truncated',
        user_action_label: 'Fortsett svaret',
        suggested_user_message: 'Fortsett svaret fra der det stoppet. Ikke start på nytt; fullfør med samme kontekst.',
        prompt_included_in_metadata: false,
        answer_included_in_metadata: false,
        provider_called: false,
        provider_secrets_in_browser: false,
        no_paid_routes_started: true
      } : undefined,
      first_round: {
        object: 'chat.compare',
        compare_status: 'ready',
        candidate_count: 5,
        response_count: 3,
        route_attempt_count: 5,
        active_public_provider_route_count: 4,
        successful_public_provider_route_count: 3,
        quiet_blocked_candidate_count: 2,
        total_blocked_candidate_count: 2
      },
      intelligence_pool: {
        object: 'mmir.intelligence_pool',
        mode: 'active_public_free_fanout',
        strategy: 'fanout_score_select_best',
        route_attempt_count: 5,
        active_answer_route_count: 3,
        active_public_provider_route_count: 4,
        successful_public_provider_route_count: 3,
        blocked_candidate_count: 0,
        quiet_blocked_candidate_count: 2,
        total_blocked_candidate_count: 2,
        target_route_count: 472,
        sync_route_limit: 40,
        swarm_ready: true,
        arena_ready: true,
        no_paid_routes_started: true,
        provider_secrets_in_browser: false,
        free_or_free_quota_only: true,
        signals_available: {
          signed_route_receipts: true,
          route_scoring: true,
          best_answer: true,
          capability_graph_ingest_candidate: true
        },
        connection_lift: {
          object: 'mmir.connection_lift',
          measured: true,
          active_answer_count: 3,
          baseline_score: 72,
          best_connected_score: 96,
          lift_score: 24,
          lift_positive: true,
          not_parameter_count: true
        }
      },
      fusion_analysis: {
        object: 'mmir.supergeni_fusion_analysis',
        status: 'analysis_ready',
        judge: 'Supergeni Council cross-review',
        independent_answer_count: 3,
        independent_provider_or_node_count: 2,
        consensus: {
          status: 'high',
          supporting_route_count: 2,
          supporting_routes: [
            { route: 'mmir · Supergeni', score: 96, latency_ms: 420 },
            { route: 'openrouter · Laguna XS', score: 83, latency_ms: 1370 }
          ]
        },
        partial_coverage: {
          blocked_candidate_count: 2,
          async_472_not_run_in_sync_preview: true
        },
        blind_spots: [
          'No live-data grounding signal was active for this prompt.'
        ],
        unique_insight_routes: [
          { route: 'openrouter · GPT OSS 20B', score: 81, value: 'Keep as specialist signal.' }
        ],
        no_paid_routes_started: true,
        provider_secrets_in_browser: false
      },
      best_answer: {
        model_id: 'supergeni',
        model_display_name: 'Supergeni',
        content: '4',
        score: 96,
        receipt: {
          provider: 'mmir',
          model_id: 'supergeni',
          route_id: 'browser-guide/free',
          latency_ms: 420,
          no_paid_routes_started: true
        }
      },
      data: [
        {
          model: 'supergeni',
          choices: [{ message: { content: '4' } }],
          mmir: {
            receipt: {
              provider: 'mmir',
              model_id: 'supergeni',
              model_display_name: 'Supergeni',
              latency_ms: 420,
              no_paid_routes_started: true
            }
          }
        },
        {
          model: 'poolside/laguna-xs.2:free',
          choices: [{ message: { content: 'The answer is 4.' } }],
          mmir: {
            receipt: {
              provider: 'openrouter',
              model_id: 'poolside/laguna-xs.2:free',
              model_display_name: 'Laguna XS',
              latency_ms: 1370,
              no_paid_routes_started: true,
              receipt_signature: 'hmac-sha256:test'
            }
          }
        },
        {
          model: 'openai/gpt-oss-20b:free',
          choices: [{ message: { content: '4.' } }],
          mmir: {
            receipt: {
              provider: 'openrouter',
              model_id: 'openai/gpt-oss-20b:free',
              model_display_name: 'OpenRouter GPT OSS 20B',
              latency_ms: 1260,
              no_paid_routes_started: true,
              receipt_signature: 'hmac-sha256:test'
            }
          }
        }
      ],
      route_attempts: [
        {
          status: 'succeeded',
          provider: 'mmir',
          model_id: 'supergeni',
          model_display_name: 'Supergeni',
          score: 96,
          latency_ms: 420,
          answer_class: 'complete',
          latency_class: 'fast',
          receipt: { provider: 'mmir', model_id: 'supergeni', route_id: 'browser-guide/free', latency_ms: 420, receipt_signature: 'hmac-sha256:test' }
        },
        {
          status: 'succeeded',
          provider: 'openrouter',
          model_id: 'poolside/laguna-xs.2:free',
          model_display_name: 'Laguna XS',
          score: 83,
          latency_ms: 1370,
          answer_class: 'complete',
          latency_class: 'responsive',
          receipt: { provider: 'openrouter', model_id: 'poolside/laguna-xs.2:free', route_id: 'external/openrouter/poolside/laguna-xs.2:free', latency_ms: 1370, receipt_signature: 'hmac-sha256:test' }
        },
        {
          status: 'succeeded',
          provider: 'openrouter',
          model_id: 'openai/gpt-oss-20b:free',
          model_display_name: 'OpenRouter GPT OSS 20B',
          score: 81,
          latency_ms: 1260,
          answer_class: 'complete',
          latency_class: 'responsive',
          receipt: { provider: 'openrouter', model_id: 'openai/gpt-oss-20b:free', route_id: 'openrouter/openai-gpt-oss-20b:free', latency_ms: 1260, receipt_signature: 'hmac-sha256:test' }
        }
      ],
      ranking: [
        { model_id: 'supergeni', score: 96 },
        { model_id: 'poolside/laguna-xs.2:free', score: 83 },
        { model_id: 'openai/gpt-oss-20b:free', score: 81 }
      ],
      debate_plan: {
        object: 'mmir.swarm_debate_plan',
        consensus_ready: true,
        ranking_ready: true,
        planned_rounds: [{ round: 1 }, { round: 2 }, { round: 3 }]
      },
      no_paid_routes_started: true,
      provider_secrets_in_browser: false
    });
  });

  await page.route('https://api.mmir.ai/chat/compare', async route => {
    await fulfillJson(route, {
      object: 'chat.compare',
      compare_status: 'ready',
      candidate_count: 5,
      active_public_provider_route_count: 4,
      successful_public_provider_route_count: 3,
      quiet_blocked_candidate_count: 2,
      total_blocked_candidate_count: 2,
      intelligence_pool: {
        object: 'mmir.intelligence_pool',
        mode: 'active_public_free_fanout',
        strategy: 'fanout_score_select_best',
        route_attempt_count: 3,
        active_answer_route_count: 3,
        active_public_provider_route_count: 4,
        successful_public_provider_route_count: 3,
        blocked_candidate_count: 0,
        quiet_blocked_candidate_count: 2,
        total_blocked_candidate_count: 2,
        no_paid_routes_started: true,
        provider_secrets_in_browser: false,
        free_or_free_quota_only: true,
        signals_available: {
          signed_route_receipts: true,
          route_scoring: true,
          best_answer: true,
          capability_graph_ingest_candidate: true
        }
      },
      best_answer: {
        model_id: 'supergeni',
        model_display_name: 'Supergeni',
        content: '4',
        score: 96,
        receipt: {
          provider: 'mmir',
          model_id: 'supergeni',
          route_id: 'browser-guide/free',
          latency_ms: 420,
          no_paid_routes_started: true
        }
      },
      data: [
        {
          model: 'supergeni',
          choices: [{ message: { content: '4' } }],
          mmir: {
            receipt: {
              provider: 'mmir',
              model_id: 'supergeni',
              model_display_name: 'Supergeni',
              latency_ms: 420,
              no_paid_routes_started: true
            }
          }
        },
        {
          model: 'poolside/laguna-xs.2:free',
          choices: [{ message: { content: 'The answer is 4.' } }],
          mmir: {
            receipt: {
              provider: 'openrouter',
              model_id: 'poolside/laguna-xs.2:free',
              model_display_name: 'Laguna XS',
              latency_ms: 1370,
              no_paid_routes_started: true
            }
          }
        },
        {
          model: 'openai/gpt-oss-20b:free',
          choices: [{ message: { content: '4.' } }],
          mmir: {
            receipt: {
              provider: 'openrouter',
              model_id: 'openai/gpt-oss-20b:free',
              model_display_name: 'OpenRouter GPT OSS 20B',
              latency_ms: 1260,
              no_paid_routes_started: true
            }
          }
        }
      ],
      route_attempts: [
        {
          status: 'succeeded',
          provider: 'mmir',
          model_id: 'supergeni',
          model_display_name: 'Supergeni',
          score: 96,
          latency_ms: 420,
          answer_class: 'complete',
          latency_class: 'fast',
          receipt: { provider: 'mmir', model_id: 'supergeni', route_id: 'browser-guide/free', latency_ms: 420 }
        },
        {
          status: 'succeeded',
          provider: 'openrouter',
          model_id: 'poolside/laguna-xs.2:free',
          model_display_name: 'Laguna XS',
          score: 83,
          latency_ms: 1370,
          answer_class: 'complete',
          latency_class: 'responsive',
          receipt: { provider: 'openrouter', model_id: 'poolside/laguna-xs.2:free', route_id: 'external/openrouter/poolside/laguna-xs.2:free', latency_ms: 1370, receipt_signature: 'hmac-sha256:test' }
        },
        {
          status: 'succeeded',
          provider: 'openrouter',
          model_id: 'openai/gpt-oss-20b:free',
          model_display_name: 'OpenRouter GPT OSS 20B',
          score: 81,
          latency_ms: 1260,
          answer_class: 'complete',
          latency_class: 'responsive',
          receipt: { provider: 'openrouter', model_id: 'openai/gpt-oss-20b:free', route_id: 'openrouter/openai-gpt-oss-20b:free', latency_ms: 1260, receipt_signature: 'hmac-sha256:test' }
        },
      ],
      blocked_candidates: [],
      no_paid_routes_started: true
    });
  });
}

async function checkViewport(browser, viewport) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.width <= 430
  });
  const logs = [];
  page.on('console', message => {
    if (['warning', 'error'].includes(message.type())) logs.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', error => logs.push(`pageerror: ${error.message}`));
  await installFixtures(page);
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${baseUrl}/mmir.html?gateway_compare_pool=${viewport.name}#mimir-chat-runtime`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#mmir-p0-app');
  await page.waitForFunction(() => {
    const route = document.getElementById('p0-route');
    return /Verifisert/i.test(route?.textContent || '') &&
      /live routes|model routes visible|Score 100/i.test(route?.getAttribute('aria-label') || '');
  });
	  const routeCta = page.locator('#p0-superboost');
	  const routeCtaCount = await routeCta.count();
	  assert(routeCtaCount === 1, `${viewport.name}: composer should keep exactly one Superboost route action`);
	  if (routeCtaCount === 1) {
	    const routeCtaText = await routeCta.innerText();
	    assert(/Superboost\s+·\s+5 AI/i.test(routeCtaText), `${viewport.name}: Superboost action should show active route count`);
	    assert(!(await routeCta.isVisible()), `${viewport.name}: Superboost should be behind the settings menu on the launch shell`);
	  }

  await page.locator('#p0-input').fill('What is 2 + 2? Reply with one number.');
  await page.locator('#p0-add').click();
  await page.waitForSelector('#p0-add-menu:not([hidden])');
  const addMenu = await page.locator('#p0-add-menu').innerText();
	  assert(/Mange AI/i.test(addMenu), `${viewport.name}: add menu should put scaled intelligence in its own first-class group`);
  assert(/More answers/i.test(addMenu), `${viewport.name}: add menu should expose compact More answers tools when hosted routes are active`);
  assert(/Superboost/i.test(addMenu), `${viewport.name}: add menu should expose Superboost without adding toolbar clutter`);
  assert(/Ask all active/i.test(addMenu), `${viewport.name}: add menu should expose Ask all active without adding toolbar clutter`);
	  assert(/Spør 5 gratis AI-kilder/i.test(addMenu), `${viewport.name}: Superboost should explain the active free AI count`);
	  assert(/Debate/i.test(addMenu), `${viewport.name}: add menu should expose model debate without hiding it behind advanced wording`);
	  assert(/Spør 5 AI-kilder gjennom MMIR/i.test(addMenu), `${viewport.name}: add menu should explain active AI count subtly`);
  assert(/Best answer benchmark/i.test(addMenu), `${viewport.name}: add menu should expose Best Answer without adding toolbar clutter`);
  assert(/Supergeni Council/i.test(addMenu), `${viewport.name}: add menu should expose Supergeni Council without adding toolbar clutter`);
	  await page.locator('#p0-add-menu [data-p0-action="boost-answer-live"]').click();
	  await page.waitForFunction(() => {
	    const text = document.getElementById('p0-transcript')?.innerText || '';
	    const status = document.getElementById('p0-status')?.textContent || '';
    return /Intelligence Boost is running/i.test(text) &&
      /Scoring answer quality/i.test(text) &&
      /asking|ranking|synthesizing/i.test(status);
  });
  await page.waitForFunction(() => {
    const text = document.getElementById('p0-transcript')?.innerText || '';
    const routeFull = document.getElementById('p0-route')?.getAttribute('aria-label') || '';
    return /\b4\b/.test(text) && /Spør 5 AI - beste vinner/i.test(text) && /Superboost/i.test(routeFull) && /round 1\/3/i.test(routeFull) && /5 routes compared/i.test(routeFull);
  });

  const text = await page.locator('#p0-transcript').innerText();
  assert(text.includes('4'), `${viewport.name}: gateway compare should render the best answer`);
  assert(/Spør 5 AI - beste vinner/i.test(text), `${viewport.name}: boost receipt should show the user-value swarm line`);
  assert(/Fortsett svaret/i.test(text), `${viewport.name}: truncated Superboost answer should expose the plain-language continuation action`);
  assert(/Svarvakt/i.test(text), `${viewport.name}: truncated Superboost answer should explain why continuation is available`);
  assert(/Detaljer/i.test(text), `${viewport.name}: boost receipt should keep raw telemetry behind Details`);
  assert(!text.includes('5 routes compared'), `${viewport.name}: gateway compare receipt should keep raw route telemetry behind Details`);

  const layout = await page.evaluate(() => ({
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
	    status: document.getElementById('p0-status')?.textContent || '',
	    route: document.getElementById('p0-route')?.textContent || '',
	    routeFull: document.getElementById('p0-route')?.getAttribute('aria-label') || '',
	    routeCta: document.querySelector('#p0-superboost')?.textContent || '',
	    routeCtaVisible: Boolean(document.querySelector('#p0-superboost')?.getClientRects().length),
    toolbarButtons: document.querySelectorAll('.p0-toolbar button').length
  }));
  assert(layout.docScrollWidth <= viewport.width + 1, `${viewport.name}: gateway compare must not create horizontal overflow`);
  assert(layout.bodyScrollWidth <= viewport.width + 1, `${viewport.name}: gateway compare body must not overflow`);
  assert(/ready/i.test(layout.status), `${viewport.name}: boost compare should finish cleanly`);
  assert(!/Winner:/i.test(layout.route), `${viewport.name}: visible green route line should stay subtle`);
  assert(/Spør 5 AI - beste vinner/i.test(layout.route), `${viewport.name}: visible green route line should show swarm value, not machinery`);
  assert(/Verifisert/i.test(layout.route), `${viewport.name}: visible green route line should show verified value`);
  assert(/privat/i.test(layout.route), `${viewport.name}: visible green route line should show privacy value`);
	  assert(/Superboost\s+·\s+5 AI/i.test(layout.routeCta), `${viewport.name}: Superboost route action should survive after Boost finishes`);
	  assert(!layout.routeCtaVisible, `${viewport.name}: Superboost route action should remain hidden behind settings after Boost finishes`);
  assert(!/Swarm 472/i.test(layout.route), `${viewport.name}: visible green route line should keep swarm internals behind details`);
  assert(/Superboost/i.test(layout.routeFull), `${viewport.name}: full boost receipt should identify the dedicated Superboost route`);
  assert(!/5 routes compared/i.test(layout.route), `${viewport.name}: visible green route line should keep compared route count behind details`);
  assert(!/3 answered/i.test(layout.route), `${viewport.name}: visible green route line should keep successful provider count behind details`);
  assert(!/2 quiet/i.test(layout.route), `${viewport.name}: visible green route line should keep quiet provider count behind details`);
  assert(!/demoted/i.test(layout.route), `${viewport.name}: quiet provider throttling should not render as demoted error text`);
  assert(!/signed receipts/i.test(layout.route), `${viewport.name}: visible green route line should keep receipt proof behind details`);
  assert(!/Why: complete answer, fast/i.test(layout.route), `${viewport.name}: visible green route line should keep winner reason behind details`);
  assert(/round 1\/3/i.test(layout.routeFull), `${viewport.name}: full receipt should preserve current swarm round truth`);
  assert(/sync 40/i.test(layout.routeFull), `${viewport.name}: full receipt should preserve sync fanout limit`);
  assert(/arena ready/i.test(layout.routeFull), `${viewport.name}: full receipt should preserve arena readiness`);
  assert(/Fusion analysis/i.test(layout.routeFull), `${viewport.name}: full receipt should preserve Supergeni fusion analysis proof`);
  assert(/support 2\/3/i.test(layout.routeFull), `${viewport.name}: full receipt should show how many routes supported the winning answer`);
  assert(/connection lift \+24/i.test(layout.routeFull), `${viewport.name}: full receipt should show measured connection lift behind details`);
  assert(/1 blind spots/i.test(layout.routeFull), `${viewport.name}: full receipt should preserve known blind-spot count behind details`);
  assert(/signed receipts/i.test(layout.routeFull), `${viewport.name}: full receipt should preserve signed receipt proof`);
  assert(/Winner:/i.test(layout.routeFull), `${viewport.name}: full receipt should preserve winner detail for inspection`);
  assert(/Why: complete answer, fast/i.test(layout.routeFull), `${viewport.name}: full receipt should preserve winner reason proof`);
  assert(/OpenRouter/i.test(layout.routeFull), `${viewport.name}: full receipt should include OpenRouter evidence`);
  assert(/Groq live/i.test(layout.routeFull), `${viewport.name}: full receipt should name active Groq intelligence`);
  assert(/2 quiet/i.test(layout.routeFull), `${viewport.name}: full receipt should preserve quiet provider count`);
  assert(/No paid route/i.test(layout.routeFull), `${viewport.name}: full receipt should preserve no-paid proof`);
  assert(layout.toolbarButtons <= 7, `${viewport.name}: gateway compare must keep visible toolbar actions tight`);

  await page.locator('#p0-input').fill('Say hello from every active model.');
  await page.locator('#p0-add').click();
  await page.waitForSelector('#p0-add-menu:not([hidden])');
  await page.locator('[data-p0-action="ask-all-active"]').click();
  await page.waitForFunction(() => {
    const text = document.getElementById('p0-transcript')?.innerText || '';
    return /Ask All Active is running/i.test(text) &&
      /Keeping each answer separate/i.test(text);
  });
  await page.waitForFunction(() => {
    const text = document.getElementById('p0-transcript')?.innerText || '';
    return /All active answers:/i.test(text) && /OpenRouter · Laguna XS/i.test(text);
  });
  const allText = await page.locator('#p0-transcript').innerText();
  assert(/Best live score: Supergeni/i.test(allText), `${viewport.name}: Ask all should keep the winning route visible in the answer`);
  assert(/Why: complete answer, fast/i.test(allText), `${viewport.name}: Ask all should explain the winning route briefly`);
  assert(/All active answers:/i.test(allText), `${viewport.name}: Ask all should render every active answer`);

  await page.locator('#p0-input').fill('Should MMIR prioritize speed or quality?');
  await page.locator('#p0-add').click();
  await page.waitForSelector('#p0-add-menu:not([hidden])');
  await page.locator('[data-p0-action="discuss-topic"]').click();
  await page.waitForFunction(() => {
    const text = document.getElementById('p0-transcript')?.innerText || '';
    return /Supergeni Council is running/i.test(text) &&
      /Now:/i.test(text) &&
      /Top routes challenge weak assumptions/i.test(text);
  });
  await page.waitForFunction(() => {
    const text = document.getElementById('p0-transcript')?.innerText || '';
    const routeFull = document.getElementById('p0-route')?.getAttribute('aria-label') || '';
    return /Supergeni Council/i.test(text) && /council ready/i.test(routeFull) && /Swarm 472/i.test(routeFull) && /round 1\/3/i.test(routeFull);
  });
  const councilLayout = await page.evaluate(() => ({
    route: document.getElementById('p0-route')?.textContent || '',
    routeFull: document.getElementById('p0-route')?.getAttribute('aria-label') || '',
    toolbarButtons: document.querySelectorAll('.p0-toolbar button').length
  }));
  assert(/Spør 5 AI - beste vinner/i.test(councilLayout.route), `${viewport.name}: Supergeni Council proof should show swarm value in the green status`);
  assert(/Verifisert/i.test(councilLayout.route), `${viewport.name}: Supergeni Council status should show verified value`);
  assert(/privat/i.test(councilLayout.route), `${viewport.name}: Supergeni Council status should show privacy value`);
  assert(!/council ready/i.test(councilLayout.route), `${viewport.name}: Supergeni Council status should keep readiness detail behind details`);
  assert(!/signed receipts/i.test(councilLayout.route), `${viewport.name}: Supergeni Council status should keep receipt proof behind details`);
  assert(/round 1\/3/i.test(councilLayout.routeFull), `${viewport.name}: Supergeni Council proof should preserve swarm round truth`);
  assert(/Fusion analysis/i.test(councilLayout.routeFull), `${viewport.name}: Supergeni Council proof should preserve fusion analysis truth`);
  assert(/connection lift \+24/i.test(councilLayout.routeFull), `${viewport.name}: Supergeni Council proof should preserve measured lift truth`);
  assert(/No paid route/i.test(councilLayout.routeFull), `${viewport.name}: Supergeni Council proof should preserve no-paid route truth`);
  assert(councilLayout.toolbarButtons <= 7, `${viewport.name}: Supergeni Council must keep visible toolbar actions tight`);
  assert(/OpenRouter · OpenRouter GPT OSS 20B/i.test(allText), `${viewport.name}: Ask all should show distinct OpenRouter model answers`);
  assert(/2 quiet/i.test(allText), `${viewport.name}: Ask all should show quiet route count without noisy blocked lines`);
  assert(!/Not active in this run:/i.test(allText), `${viewport.name}: Ask all should not show hidden throttled routes as visible failures`);

  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: `${screenshotDir}/${viewport.name}.png`, fullPage: false });

  const relevantLogs = logs.filter(message => !/favicon|Failed to load resource/i.test(message));
  assert(relevantLogs.length === 0, `${viewport.name}: console/page errors should stay clean, got ${relevantLogs.join(' | ')}`);
  await page.close();
}

port = await resolveRenderPort({
  envName: 'MMIR_GATEWAY_COMPARE_RENDER_PORT',
  attemptsEnvName: 'MMIR_GATEWAY_COMPARE_RENDER_PORT_ATTEMPTS',
  defaultPort: 8796,
  host,
  label: 'gateway compare render check'
});
baseUrl = `http://${host}:${port}`;
const server = startServer();
try {
  await waitForServer(`${baseUrl}/mmir.html`);
  const browser = await chromium.launch();
  try {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'mobile', width: 390, height: 844 }
    ]) {
      await checkViewport(browser, viewport);
    }
  } finally {
    await browser.close();
  }
} finally {
  server.kill('SIGTERM');
}

if (failures.length) {
  console.error('P0 gateway compare pool render check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`P0 gateway compare pool render check passed. Screenshots: ${screenshotDir}`);
