# Ghost Core — Research Summary for Architectural Reference

Purpose: learn from the architecture, not clone the product.

## Publicly reported product direction
Ghost Core is a dedicated computer for an always-on personal AI assistant, emphasizing local model execution, persistent context, app/device connections and user-controlled autonomy.

Publicly reported hardware includes:
- NVIDIA RTX PRO 4000 Blackwell SFF
- 24 GB GDDR7 ECC VRAM
- AMD Ryzen 5 7600
- 64 GB DDR5
- 1 TB NVMe

## Development lessons worth carrying into STAARWAARDD
- The differentiation is the system around commodity compute, not just hardware.
- Model layer, agent runtime, memory, software, permissions, product design and hardware all matter.
- Swappable models reduce platform lock-in.
- Local-first processing can improve privacy, but online actions still require explicit network policy.
- Dedicated hardware should follow software validation, not precede it for STAARWAARDD.

## Do not copy
- Ghost branding
- enclosure/industrial design
- product naming
- proprietary software

## Sources for Manus research refresh
- https://ghost.ai/
- https://ghost.ai/privacy
- https://ghost.ai/setup
- TechCrunch coverage of Ghost seed round and Core launch
