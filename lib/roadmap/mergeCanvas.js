function sameItem(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function mergeLists(base, local, remote) {
  const baseMap = new Map((base || []).filter((item) => item?.id).map((item) => [item.id, item]));
  const localMap = new Map((local || []).filter((item) => item?.id).map((item) => [item.id, item]));
  const remoteMap = new Map((remote || []).filter((item) => item?.id).map((item) => [item.id, item]));
  const seen = new Set();
  const out = [];

  function push(item) {
    if (!item?.id || seen.has(item.id)) return;
    seen.add(item.id);
    out.push(item);
  }

  for (const item of remote || []) {
    if (!item?.id) continue;
    const previous = baseMap.get(item.id);
    const mine = localMap.get(item.id);
    if (!mine) {
      if (!previous || !sameItem(item, previous)) push(item);
      continue;
    }
    const localChanged = !sameItem(mine, previous);
    const remoteChanged = !sameItem(item, previous);
    if (localChanged && !remoteChanged) push(mine);
    else push(remoteChanged && !localChanged ? item : localChanged ? mine : item);
  }

  for (const item of local || []) {
    if (!item?.id || seen.has(item.id)) continue;
    const previous = baseMap.get(item.id);
    const theirs = remoteMap.get(item.id);
    if (!theirs && (!previous || !sameItem(item, previous))) push(item);
  }

  return out;
}

export function mergeCanvas(base, local, remote) {
  return {
    nodes: mergeLists(base.nodes, local.nodes, remote.nodes),
    edges: mergeLists(base.edges, local.edges, remote.edges),
    annotations: mergeLists(base.annotations, local.annotations, remote.annotations),
  };
}

export function isCanvasContentEmpty(data) {
  return (
    (data?.nodes?.length || 0) === 0 &&
    (data?.edges?.length || 0) === 0 &&
    (data?.annotations?.length || 0) === 0
  );
}
