# Good Hour design system

Good Hour Diner is a fictional American diner seen through the restraint of a product page. The screen's job is to let someone imagine an order and keep it. The design should feel confident and carefully made, not like a diner-themed checkout or an Apple impersonation.

## Custom theme: Good Hour

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| Canvas | `#fbfbfd` | `#111216` | Main product stage |
| Surface | `#ffffff` | `#1b1c21` | Supporting content and order sheet |
| Ink | `#1d1d1f` | `#f5f5f7` | Primary text |
| Secondary | `#515154` | `#c4c4cb` | Supporting text |
| Action blue | `#0066cc` | `#6aaeff` | Links and primary actions |
| Diner cherry | `#b92e32` | `#ef9b9d` | Brand/content accent, not every control |

Light-mode contrast: ink on canvas 16.28:1, secondary on canvas 7.65:1, blue on white 5.57:1, cherry on white 6.00:1. Dark-mode text and control colors are separate values, not light colors inverted by a filter.

System UI fonts keep controls familiar; the display scale is 72 px hero, 78 px menu introduction, 70 px product headings, 22–30 px supporting statements, and 13–17 px controls and utility text. Sizes compress and sections stack by available width.

Regular width:

```text
glass navigation  Good Hour       Menu  The idea       order
                   product name + actions
                   large plated product stage
                   concise menu introduction
                   pancakes: copy | art
                   shake: art | copy
                   explanation + footer
```

Compact width stacks the same content and actions: navigation, product copy, product art, then the next section. The signature is the small clock mark paired with a generously staged diner plate—a nod to the pleasure of choosing what to eat at any hour. Motion is limited to button press feedback, a short order-sheet entrance, and small art hover; reduced-motion users get none of it.

The Apple Design Skill in `.design-rules/` guided the implementation as a web interpretation, not a claim of native iOS or macOS compliance. In particular, `typography.md › Conveying hierarchy` informs the type scale; `layout.md › Visual hierarchy` informs the product-first order; `branding.md › Best practices` keeps the cherry accent restrained; `materials.md › Liquid Glass` confines blur to the functional layer; and `accessibility.md › Vision` and `accessibility.md › Mobility` inform contrast, labels, and touch targets. The original SVG food art remains illustrative rather than photorealistic; original food renders would be a future visual upgrade.
