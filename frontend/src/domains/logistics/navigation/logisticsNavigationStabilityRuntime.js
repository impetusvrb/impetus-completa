let _mergeOk = 0;
let _mergeFail = 0;

export function noteLogisticsMenuMergeOk() {
  _mergeOk += 1;
}

export function noteLogisticsMenuMergeFail() {
  _mergeFail += 1;
}

export function getLogisticsNavigationStabilitySnapshot() {
  const total = _mergeOk + _mergeFail;
  return {
    merge_ok: _mergeOk,
    merge_fail: _mergeFail,
    stable: total === 0 || _mergeFail / total < 0.2
  };
}
