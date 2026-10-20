import assert from 'node:assert/strict';
import { buildGuardianPlan, judgeScenario } from './guardian-core.mjs';

const plan = buildGuardianPlan('Please email my family and buy my outfit before the meeting');
assert.equal(plan.approvalRequired, true);
assert.equal(plan.state, 'prepared_for_approval');
assert.ok(plan.steps.some((step) => step.status === 'awaiting_approval'));
assert.ok(plan.steps.every((step) => step.status === 'awaiting_approval' && step.externalAction));

const demo = judgeScenario();
assert.equal(demo.metrics.unsafeAutomaticActions, 0);
assert.equal(demo.approvalRequired, true);
assert.ok(demo.steps.every((step) => step.status === 'awaiting_approval'));
assert.ok(demo.portals.length >= 3);

console.log('Guardian simulation smoke checks passed. No AWS invocation was made.');

const mixed = buildGuardianPlan('Publish my campaign and unlock my home door');
assert.ok(mixed.portals.includes('Creativity') && mixed.portals.includes('Home'));
assert.ok(mixed.steps.every(step => step.status === 'awaiting_approval'));
const preparation = buildGuardianPlan('Prepare my meeting notes');
assert.equal(preparation.approvalRequired, false);
assert.ok(preparation.steps.every(step => step.status === 'prepared'));

// Import and call the ordinary API with no Strands/AWS dependencies installed.
const { default: handler } = await import('../../../api/amazon-guardian.mjs');
for (const mode of ['judge', 'plan']) {
  let status, payload;
  const response = {
    setHeader() {},
    status(value) { status = value; return this; },
    json(value) { payload = value; return this; }
  };
  await handler({method:'POST', body:{mode, input:'Email my family and buy my outfit'}}, response);
  assert.equal(status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.metrics.externalActionsExecuted, 0);
  assert.ok([...payload.plan.now, ...payload.plan.today].every(task => task.sensitive));
}
console.log('Mixed-action approval and dependency-free API regression checks passed.');
