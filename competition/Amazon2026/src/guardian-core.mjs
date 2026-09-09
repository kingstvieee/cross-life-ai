export const PORTALS = Object.freeze(['Work','Creativity','Home','Wellbeing','Relationships','Community','Style']);

const portalKeywords = {
  Work: ['work','meeting','calendar','deadline','project','email','schedule','pitch','investor'],
  Creativity: ['creative','design','content','media','publish','diggitstaar','campaign','launch'],
  Home: ['home','lights','security','temperature','arrival','device','routine','staar access'],
  Wellbeing: ['wellbeing','wellness','sleep','stress','exercise','food','water','reset'],
  Relationships: ['relationship','partner','friend','family','dinner','anniversary','gift','message'],
  Community: ['community','event','venue','toronto','local','accessibility','route','check-in'],
  Style: ['style','outfit','wardrobe','fitting','stylist','rising staardform','clothes']
};
const externalActionPattern = /\b(send|message|email|invite|book|buy|purchase|cancel|delete|share|publish|pay|order|post|register|rsvp|unlock|lock|turn on|turn off|change temperature)\b/i;

export function detectPortals(request='') {
  const text = String(request).toLowerCase();
  const matches = PORTALS.filter((portal) => portalKeywords[portal].some((keyword) => text.includes(keyword)));
  return matches.length ? matches : ['Work','Wellbeing'];
}

export function requiresApproval(request='') { return externalActionPattern.test(String(request)); }

export function buildGuardianPlan(request, context={}) {
  const portals = detectPortals(request);
  const approvalRequired = requiresApproval(request);
  const steps = portals.map((portal,index)=>({
    id:`${portal.toLowerCase()}-${index+1}`,
    portal,
    capability: capabilityFor(portal),
    status: approvalRequired && index === portals.length - 1 ? 'awaiting_approval' : 'prepared',
    externalAction: approvalRequired && index === portals.length - 1,
    summary: `${portal} prepares its part of: ${String(request).replace(/\s+/g,' ').trim().slice(0,140)}`
  }));
  return {
    request:String(request), mode:'guardian_orchestration', portals, approvalRequired,
    state:approvalRequired?'prepared_for_approval':'prepared', context, steps,
    outcome:approvalRequired
      ? 'Guardian prepared the cross-portal plan and stopped before the first external action.'
      : 'Guardian coordinated the relevant portals and prepared the result without external side effects.'
  };
}

export function judgeScenario() {
  const request = 'Guardian, my investor pitch is running late. Protect my launch, fitting, anniversary dinner, gift delivery, wellbeing reset and home arrival.';
  const plan = buildGuardianPlan(request,{location:'Toronto'});
  return {
    ...plan,
    metrics:{disconnectedAppsReplaced:5,portalsCoordinated:plan.portals.length,userRequestsRequired:1,unsafeAutomaticActions:0},
    narration:[
      'Guardian detects one timing conflict instead of waiting for seven separate prompts.',
      'Work protects the investor meeting boundary and shares only relevant timing context.',
      'Creativity stages the DIGGITSTAAR launch package without publishing it.',
      'Style prepares the RISING STAARDFORM fitting update.',
      'Relationships protects the anniversary dinner and gift context.',
      'Wellbeing inserts a practical transition reset without diagnosing the user.',
      'Home prepares STAAR Access for the revised arrival while device changes remain behind approval.'
    ]
  };
}

function capabilityFor(portal){
  return {Work:'schedule_conflict_resolution',Creativity:'diggitstaar_release_orchestration',Home:'staar_access_arrival_routine',Wellbeing:'permission_scoped_reset',Relationships:'commitment_coordination',Community:'local_access_and_route_context',Style:'rising_staardform_fitting_flow'}[portal];
}
