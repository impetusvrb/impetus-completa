# OPM-GOV-001 — Lifecycle Baseline

## Receiving (OPM-003)

```
Created → Scheduled → Receiving → Inspection → Quarantine (opcional) → Completed
```

| Estado baseline | mapsTo operacional |
|-----------------|-------------------|
| created | planned |
| scheduled | in_transit |
| inspection | inspecting |
| quarantine | inspecting + metadata.quarantine |
| completed | completed |

## Inventory (OPM-002A)

```
Available → Reserved → Picked → Issued
```

## Picking (OPM-004)

```
Created → Released → Executing → Paused (opcional) → Completed
```

| Estado baseline | mapsTo operacional |
|-----------------|-------------------|
| created | pending |
| released | released |
| executing | picking |
| paused | paused |
| completed | completed |

## Shipping (OPM-005)

```
Ready → Loading → Dispatching → Shipped
```

| Estado baseline | mapsTo operacional |
|-----------------|-------------------|
| ready | ready / staged |
| loading | loading |
| dispatching | loading + dispatching |
| shipped | shipped |
