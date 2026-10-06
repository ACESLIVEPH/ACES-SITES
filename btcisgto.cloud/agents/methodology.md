# Hydra Lab v1 — research methodology

## What runs

Two rules-based strategy agents tune six fixed parameter candidates. Trend uses fast/slow moving-average pairs of 8/32, 16/64 or 24/96 observations. Reversion uses an average window and entry distance of 20/1%, 40/2% or 60/3%. Reversion exits when price returns to or above the average. These are software agents, not foundation models being trained and not a connected LLM swarm.

They use the unchanged execution core retrieved from the existing BTCisGTO Trading Sim during the September 14 audit. SHA-256: `3C4409BF81F6F4E854EA2E265926650098A1FB29F41E1DFD35A3C43D08388F8B`.

The lab does not operate the live Edge API, a wallet, an exchange, or the dashboard on the user's behalf. The direct integration in this release is the simulator's execution model. Edge research and live data integrations require their own secured interfaces and evaluation datasets.

## Data and selection

- Synthetic mode: 1,200 fictional hourly prices, deterministic seed 42, repeating trend/noise regimes. An engineering demonstration, never profitability evidence.
- Upload: CSV with header `timestamp,close`; 600–10,000 strictly increasing UTC ISO timestamps and positive finite prices. Maximum 2 MB. No upload to a server; provenance is not independently authenticated.
- First 60%: train all six candidates; advance the best net-result candidate per family.
- Next 20%: compare the two finalists; select the best net result, using a deterministic ID tie-break.
- Final 20%: evaluate the selected agent once. Other candidates are not compared on the test set. Earlier observations can warm up indicators, but each segment resets cash and positions.
- Repeated runs on the same data do not create new evidence. If a human changes the system based on a test result, that segment is no longer independent. A new unseen/forward period is necessary.

## Execution model

Each segment starts with 10,000 paper points in quote-currency accounting. One long position at a time, 10% of current equity allocated per entry, no leverage. Decisions made from observation i execute at observation i+1. At segment end, positions are closed. Price observations are supplied to the same core used by the Trading Sim.

Fees: 0.05% per side. Adverse slippage: 0.02% per fill. Fees are based on the core's simplified notional convention, including exit fees based on entry allocation. No order-book depth, partial fills, funding or realistic liquidation. Close-only replay does not capture intrabar excursions. Drawdown uses marked estimated exit equity, including estimated exit costs. At a 10% peak-equity drawdown, new risk halts and positions close under the replay policy; a gap can exceed the threshold.

Benchmark: 10% initial allocation to long buy-and-hold, bought at the second observation of the test segment and sold at its end, with the same core fees/slippage. Remaining capital stays in paper cash. This matches initial exposure, not all later strategy risk; the benchmark is not drawdown-halted. Zero-return cash is implicitly another baseline. No BTC-denominated investment return is claimed.

## Review gates

Positive validation and test net P&L, test result above the benchmark, at least five closed test trades, and test drawdown below 10% without a halt. Five trades is a minimum display gate, not a statistical proof threshold. Synthetic results always stay demonstrations. A historical upload passing every gate is eligible only for forward paper review; it never becomes authorized for real capital.

## Evidence and limitations

Reports export candidate results, parameters, test decisions and fills, cost assumptions, curve, data hash and version. Local results are editable and do not form an independently verified track record. No reports are automatically published to the public journal. Use timestamped server-side logs, independent reconciliation, larger and varied forward samples, capacity analysis and reviewed controls before considering a live pilot.

There is no profitability guarantee. No model, agent or person can confirm future profitability from these simulations. No private keys, wallet signing or live-order endpoints exist in this lab.
