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
/** Build235 revised triangle routes: all remain PRIVATE QA even when the
 * standalone narrowphase confirms an offline clear capsule path. No iPhone,
 * portal endpoint, floor support, art/rights or founder world approval.
 */
export const REVIEW_ONLY_BUILD235_TRIANGLE_WORLD_HASHES = Object.freeze({
  "creativity-dream": "49a8bb7323693754d19d432e824daa3e7690313541e9104e0c90767bf0695ddc",
  "events-village": "3505a8aa6b3acb7a3b4548ce668bdb2a84b1a4bebe1e9b0f2dd81669bd13d9ff",
  "home-residence": "0d5885179e6648e691a70928a5d5ee450eb77f53cd7a3197cd3b0ad13444ab41",
  "relationships-realm": "38f0203721f3df30663f8157075015e84e84c9affc485f51186b41795c28b1f3",
  "relationships-singles": "a6a2f6eb7d5533bd32b04598d230799837986929771f5612b5c15b458219db4b",
  "staarsonic-studio": "87a449c1b37880bc1843e6c73e4ee881a1b414b971f081b94346d4fe9f60d9cb",
  "staarverse-universe": "1da40c7ef27503635b9789a39584403b76c290a9b7caf8949090b5956d8313d7",
  "style-closet": "62d71af370af697886ba3e054f4d0a1bdfdaad4251a1d8aab2b16fdfa7d1f78c",
  "wellbeing-health": "95720fadf933a90042a5e9c7f8d3c4db02278568df3f0330e48a7c55a2a5249c",
  "work-command": "8029e7994fdc4370d6b39baf96431ab1a3c9968c3985b62163bb3168b75f86f7"
});
/** Build237 floor slabs are only `walkable_candidate`; do not accept them as
 * native physics floor surfaces or use them to bypass a production receipt.
 */
export const REVIEW_ONLY_BUILD237_FLOOR_WORLD_HASHES = Object.freeze({
  "creativity-dream": "0524f57a726deb9deb702a332680a13b23bae2a5f85101ce8957b494bfcda11b",
  "events-village": "56ca2a915e3ec92a367e8483237cec48633e00f0158751c108c4cfbe5847bdd7",
  "home-residence": "d92331d7d14aa76b41b524c1236a3589a6a654920e1ce02a90df575e6f65ad60",
  "relationships-realm": "8541fb3c7d611629b81ee1ba32c9ea578819ff90fc00fa3032a03588590f2fd4",
  "relationships-singles": "03f3040ec1d97c2c9206a56d99220083081e5a3d75da0669234ea35f7ff45a3a",
  "staarsonic-studio": "a957fbe433e0a180178007c9bf4375905decc9d39405a6fefef6dc8b0804d7af",
  "staarverse-universe": "0b81698d02718f5d72a6a8ef811d9f72d0c21f5f644eb6f82bd277a91c77ebdf",
  "style-closet": "4d7a967532fd3effaea1074c1b370584a7a1334fca7978901303514c63a0b15f",
  "wellbeing-health": "aa9648c1b65e0d919808ed81ac5522d2421fc56d703a2b9d0b4880f05aff96db",
  "work-command": "faedc9bbca605a432a31dd4f78e47120a6fb89e2747e72dbc0b56e153cf7e94b"
});
export const REVIEW_ONLY_COLLIDER_WORLD_HASH_SET = new Set([
  ...Object.values(REVIEW_ONLY_COLLIDER_WORLD_HASHES),
  ...Object.values(REVIEW_ONLY_BUILD235_TRIANGLE_WORLD_HASHES),
  ...Object.values(REVIEW_ONLY_BUILD237_FLOOR_WORLD_HASHES)
]);
