# Reusable ticket styles

## Bottom-aligned Home screens

Home keeps the shared marquee below the header and places the selected screen against the bottom inset when space is available. Taller screens keep their natural height and scroll with the page. Render new screens directly after the marquee in Home to inherit this layout.

## Shared ticket edges

All current and future CasinoTicket uses omit the pale outer rim, as requested on 8 November 2026. The paper reaches the scalloped cut edge; retain each ticket's inset outline and any intentional filled band. The shared component no longer renders a separate rim path.

The shared CasinoTicket defaults to a fixed 12px inset for the inner outline at every ticket width. Use `borderInset` for an intentional per-ticket override.

## Turquoise Paper Ticket

Use the phrase **“Use the Turquoise Paper Ticket style on [element].”**

This is the Player’s Tab appearance retained on 8 November 2026 after reverting the gold-accent experiment. It follows the turquoise portrait ticket in `../asset_samples`. Preserve the requested element’s content and behaviour; apply this visual treatment only to the requested element.

### Appearance

- Rich, visibly mottled turquoise paper, with no cream wash or gradient laid over it.
- Mint outer band filling the area outside the dark teal inset border, retaining the existing CasinoTicket silhouette.
- Warm cream text, including the balance amount.
- Cream paper heading with burgundy lettering.
- Heading top corners curve inward to echo the ticket's inset outline, following the Sign In banner shape. Bottom corners retain their 5px outward rounding; heading colour stays cream. Applied 8 November 2026; developer visual acceptance pending.
- Card owns fixed 16px padding on all four sides. Heading and full-width sections share that content boundary; no extra heading side margin. The 12px inset outline leaves 4px straight-edge gaps around the heading. Payment button has no outward outline or shadow; keyboard focus draws inside the button. Vertical spacing between sections remains separate from the card padding.
- Internal vertical spacing belongs to parent Tailwind flex layouts: `gap-5` between major sections, `gap-3` between portrait/identity and between buttons, `gap-1.5` between name/date and balance label/amount, and `gap-4` before actions. Portrait centring uses `self-center`; no individual spacing margins. Fixed card padding accepted by developer on 8 November 2026; gap refactor awaits visual check.
- User List only: its grid uses `items-stretch`, and its sidebar uses a column flex layout with `[&>.player-tab]:flex-1`. Both tickets match the taller one's natural height without a fixed height. PlayerTab's shared sizing and internal gaps are unchanged; other screens do not inherit this equal-height layout. Active Brave desktop visually checked on 8 November 2026; developer acceptance pending.
- User List's `.user-list-player-sidebar` also stretches the card's section and lower details/actions group. `justify-content: space-between` places spare height above the actions, retaining the existing minimum gap and 12px gap between buttons. View History's box ends at the fixed bottom padding; no spacing margins added. Equal ticket heights accepted by developer; this action-placement refinement awaits acceptance.
- Cream paper primary button with dark turquoise lettering.
- Fine, translucent cream separators.
- No gold heading, balance or payment button in this version.

### Existing assets and implementation

- Turquoise texture: `frontend/src/assets/casino/home-turquoise-paper.png`.
- Cream texture for heading/button: `frontend/src/assets/casino/ticket-paper.png`.
- Shape component: `frontend/src/components/casino-ticket.tsx`.
- Current example: `../frontend/src/pages/users/user-list/user-list.tsx`, Player’s Tab only.
- Reusable component: `frontend/src/components/player-tab.tsx`, rendered with `<PlayerTab />` after importing it. The component currently retains Alex’s static sample content and disabled actions; configurable player data is a later step.
- Styling source: `frontend/src/components/player-tab.css`, `.player-tab` and associated rules. Its texture, portrait sprite and font are included independently of User List styles. User List owns only sidebar placement and responsive stacking.
- Original visual reference: `../asset_samples`, turquoise portrait ticket on the profile screen.

The turquoise surface uses `background-color: #075152`, the existing turquoise image, and `background-size: cover`. The filled 12px outer band uses mint `#6cada0`, sampled from the reference band; the thin inset outline uses dark teal `#244c45`, sampled from its outline on 8 November 2026. PlayerTab explicitly uses the same 12px inset as the shared default. The developer accepted the band colour on 8 November 2026; the added paper texture awaits visual acceptance. Body text is `#fff0cf`, with `#ffe6b1` for the balance and activity values. Heading lettering uses the shared burgundy `--vegas-wine`; button lettering is `#075152`.

The mint band uses the same `home-turquoise-paper.png` grain as the inside through an SVG pattern sized to the actual ticket dimensions (`userSpaceOnUse`). Mint supplies the colour with luminosity blending at 0.35 opacity. The shared ticket omits its separate outer rim; the dark teal inset outline remains. Only PlayerTab enables the texture.

The heading and payment button use `ticket-paper.png` directly, with no cream tint overlay, as requested on 8 November 2026 to show its grain more clearly. The developer accepted the untinted heading; the matching payment-button update awaits visual acceptance. Keep these distinct from the unwashed turquoise body.

Texture cropping depends on the target ticket’s proportions. Match the approved character without promising pixel-identical grain placement. A new use of this style does not authorize changing neighbouring cream tickets or making turquoise the shared default.

### Verification

Instructor visually inspected the active Player’s Tab in Brave on 8 November 2026 after applying the original turquoise texture and cream details. The subsequent gold experiment was reverted in source. No new mobile audit, production build or whole-feature completion is implied by this style reference. User List remains incomplete.

On 8 November 2026, the instructor inspected the active magnified Brave view: subtle paper grain was visible on the mint band and the dark teal outline remained distinct. Normal-size developer acceptance of this texture is pending. This was not a responsive audit; no build, lint or tests were run for this checkpoint.

8 November 2026: developer rejected the earlier three-colour edge. Instructor observed the corrected single mint band in active Brave after removing the rim stripe and matching the inside paper grain. Developer acceptance pending; no build, lint, tests or responsive audit.
