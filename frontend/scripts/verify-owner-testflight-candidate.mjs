/** Owner-directed TestFlight candidate gate, NOT a production asset certification.
 * No third-party rights letter or signed asset receipt is demanded for private,
 * owner-declared candidate media. Review-only GLBs remain quarantined; the
 * existing locked 2D fallback is used until independently accepted for runtime.
 */
import {inspectProductionPackage} from './verify-production-package.mjs';
const result=await inspectProductionPackage();
const permitted=new Set(['guardian','worlds','independent-evidence']);
const blockers=result.blockers.filter(x=>!permitted.has(x.id));
const report={schema:'staar-owner-testflight-candidate-v1',
  testFlightCandidateReady:blockers.length===0,
  excludedFromTestFlightReleaseGate:[...permitted],
  assetsInRuntime:'Existing locked fallback; review-only Guardian/world GLBs are NOT release-certified or included by this exception',
  rightsBasis:'Owner declaration only; third-party license/rights status not independently verified',
  productionAssetCertification:false,
  checksRetained:'App identity, soundtrack and startup-film hashes, EAS archive bytes, Apple configuration, and StarCenttinel if certified assets are loaded',
  blockers,sourcePreflightBlockers:result.blockers};
console.log(JSON.stringify(report,null,2));
if(blockers.length)process.exitCode=1;
