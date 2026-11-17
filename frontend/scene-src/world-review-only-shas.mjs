/** Build 214 private offline collider candidates, NOT accepted production worlds.
 * The GLBs are absent from this public repo. Do not auto-promote matching hashes
 * simply by setting founder/device/rights booleans in receipt JSON.
 */
export const REVIEW_ONLY_COLLIDER_WORLD_HASHES = Object.freeze({
  "home-residence": "533aa52e7c2d9415799ccae3fd045c6974b2e9f74431d01bfda23c05634af4ff",
  "work-command": "e19b3b388445127cf26e6fc95089e4b23b579e403f12ad9cdb6496d5f21c3f3c",
  "creativity-dream": "829f3b005f26f50484b771df99471ab25c5e7be2ece88f2a862d0985cfd77fe4",
  "wellbeing-health": "e27236b54f77d4cade813f8a0d73d3aa69238053b0fbeb9bf2cb1db9dc1e4d43",
  "relationships-realm": "124fcbc8ed2b5457bf0735f727ed09cfa1add26e0847f0c157d97b85379280c6",
  "relationships-singles": "b5cc4b8fad6aaa07265f989221ccce1b8be2ad6a4c9ae69593cf0bd604703dd8",
  "events-village": "765b40b26218eebc6df650321dad649d42f81f97f94210295866af38ea0dac92",
  "style-closet": "11fd1960f37a9654e7a60862c06bc935eb297b140a1a2c38aba2ebe6e31d6138",
  "staarverse-universe": "f215d5c014a069f71716b9b58fb80f602fd060e107082814936c014e2224685b",
  "staarsonic-studio": "abf7f529f563b3c8e6b81d542b83f7635a46ed097bb97081a3a68f9d1775d3dd"
});
export const REVIEW_ONLY_COLLIDER_WORLD_HASH_SET = new Set(Object.values(REVIEW_ONLY_COLLIDER_WORLD_HASHES));
