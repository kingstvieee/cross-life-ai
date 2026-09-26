import assert from 'node:assert/strict';
import { buildGuardianPlan, judgeScenario } from './guardian-core.mjs';

const plan = buildGuardianPlan('Please email the investor and buy my outfit before the meeting');
assert.equal(plan.approvalRequired, true);
assert.equal(plan.state, 'prepared_for_approval');
assert.ok(plan.steps.some((step) => step.status === 'awaiting_approval'));

const demo = judgeScenario();
assert.equal(demo.metrics.unsafeAutomaticActions, 0);
assert.ok(demo.portals.length >= 3);

console.log('Guardian simulation smoke checks passed. No AWS invocation was made.');
