'use strict';
const ADDRESS = 'bc1qn4yzkudwj5yt8hkk7xtqskkqx2yxz54zp8zppd';
const SOURCE = 'https://mempool.space/api/address/' + ADDRESS;
const $ = id => document.getElementById(id);
let observation = null;
async function refresh() {
  if ($('refresh').disabled) return;
  $('refresh').disabled = true;
  $('export').disabled = true;
  observation = null;
  $('balance').textContent = '— sats';
  $('chain-badge').textContent = 'Checking source';
  $('balance-status').classList.remove('error');
  $('balance-status').textContent = 'Requesting confirmed holdings from mempool.space…';
  try {
    const response = await fetch(SOURCE, { signal: AbortSignal.timeout(12000), cache: 'no-store' });
    if (!response.ok) throw new Error('Lookup failed');
    const data = await response.json();
    if (data.address !== ADDRESS) throw new Error('Address mismatch');
    const values = [data.chain_stats?.funded_txo_sum, data.chain_stats?.spent_txo_sum, data.mempool_stats?.funded_txo_sum, data.mempool_stats?.spent_txo_sum];
    if (!values.every(v => Number.isSafeInteger(v) && v >= 0)) throw new Error('Invalid amounts');
    const confirmed = values[0] - values[1], pending = values[2] - values[3];
    if (confirmed < 0) throw new Error('Invalid confirmed balance');
    const checkedAt = new Date().toISOString();
    observation = { kind: 'public_address_observation', address: ADDRESS, source: SOURCE, checkedAt, confirmedSats: confirmed, pendingNetSats: pending, sourceResponse: data, scope: 'Address observation only. Ownership, cold custody, liabilities, revenue and mission reserve are not verified.' };
    $('balance').textContent = confirmed.toLocaleString('en-US') + ' sats';
    $('chain-badge').textContent = 'Source retrieved';
    $('balance-status').textContent = (confirmed / 1e8).toFixed(8) + ' BTC confirmed · checked ' + new Date(checkedAt).toLocaleString() + '. Pending net change: ' + pending.toLocaleString('en-US') + ' sats. Source: mempool.space.';
    $('export').disabled = false;
  } catch {
    $('balance').textContent = 'Unavailable';
    $('chain-badge').textContent = 'Source unavailable';
    $('balance-status').classList.add('error');
    $('balance-status').textContent = 'The address lookup could not be verified. Retry or open the explorer. No balance or progress has been estimated.';
  } finally { $('refresh').disabled = false; }
}
$('refresh').addEventListener('click', refresh);
$('copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(ADDRESS); $('copy-status').textContent = 'Address copied.'; } catch { $('copy-status').textContent = 'Copy was unavailable. Select the public address above to copy it manually.'; } });
$('export').addEventListener('click', () => {
  if (!observation) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(observation, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'btcisgto-address-observation.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
refresh();
