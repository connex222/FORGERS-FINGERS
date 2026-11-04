# Forgers Finger — AAA graphics brief (v3, plain ChatGPT)

This version works with ChatGPT's normal image generator, with no plugins. It gets AAA quality three ways:

1. A **AAA art direction**: polished, cinematic, game key-art quality (v1 asked for a sketchy watercolour look, which was the main reason it looked cheap).
2. **Reference images**: your best art from other games, attached at the start, sets the quality bar.
3. A **style anchor**: you approve one hero image first, then re-attach it with every later prompt so the style can't drift.

The filenames haven't changed, so the game code needs no updates.

---

## Step 0 — Before you paste anything

- Start a **new chat** used only for Forgers Finger art.
- Use the **"Create image"** option (or just ask for an image). Pick the best model your ChatGPT plan offers.
- **Don't worry about exact sizes.** ChatGPT only makes square, landscape (3:2) and portrait (2:3) images. Generate in the matching orientation, then send me the downloads and I'll crop, resize, convert and rename them all to the exact files the game needs.
- **Attach 2–3 of your best finished images from your other games** (for example The Vault Job or Cyber Cypher). This is the only reliable way to make ChatGPT match "the same look". It cannot see your other chats, so it needs to see the pictures.

---

## Step 1 — Paste this master brief first

```
You are the lead art director for "Forgers Finger", a premium AAA-quality comedy party game for TV and phones. It is set in a crooked Victorian auction house where players paint fake masterpieces and bid on which one is genuine. The host is a pompous, shady auctioneer called Lord Gavelby.

REFERENCES
- The images attached to this chat are finished art from my other games. Study them and match their rendering quality, lighting and level of polish. Do not copy their characters or settings.
- Whenever I attach an approved image from this project, treat it as the style reference for the new image.
- Generate at the highest quality and resolution available. Use the exact orientation I ask for: square, landscape or portrait.

AAA ART DIRECTION
- Premium stylised 3D, at the standard of a top-tier console game or a big-budget animated feature film.
- Characters: stylised, appealing caricature proportions (expressive faces, exaggerated noses, moustaches, eyebrows), rendered with realistic materials: subsurface-scattering skin, individual hair strands, velvet, brocade, polished brass, chipped gilt, wet oil paint.
- Lighting: cinematic and dramatic. Warm gaslight and candle key light, cool Prussian-blue fill, strong rim light that separates subjects from the background, soft volumetric haze, gentle depth of field.
- Mood: comedic, mischievous and glamorous. Never grotesque, never cheap, never flat or clip-art. No sketchy linework, no watercolour, no vector flatness.
- Finish: crisp, high detail, clean edges, no AI artefacts (no extra fingers, no melted faces, no garbled text, no warped frames).

PALETTE (apply as the brand theme)
- Prussian blue walls #1D2F4A, deep #101B2E
- Oxblood velvet #7A1F2B
- Brass and gilt #C9A245, highlight #F0D891
- Canvas cream #F3EAD7
- Ink #1B1712
- Adults-only "After Hours" pieces: plum #2A1230, rose #C2306C, candlelight gold

RULES FOR EVERY IMAGE
- No text, letters or numbers unless I ask for exact text. When I do, spell it exactly as given.
- No real people, real artworks, logos or brands.
- Keep the areas I name calm and darker, because the game places text there.
- Characters must be human. No animal characters anywhere.

WORKFLOW
1. Make ONE image at a time. Show it to me and wait for my approval.
2. Inspect each image yourself against this brief before showing it. If anything fails (anatomy, text, crop, style drift), regenerate or fix it with an edit first.
3. The first approved image (Lord Gavelby) is the STYLE ANCHOR. Every later image must match his rendering, lighting and finish exactly.
4. When I ask for a TRANSPARENT background, output a PNG with a truly transparent background (not a white or checkerboard pattern). If you cannot, use a flat pure green #00FF00 background with no shadows touching it, so I can remove it.

Reply "Ready" and wait for my first image.
```

---

## Step 2 — The style anchor (do this first, and don't move on until it's great)

**`auctioneer.png`** — transparent, square 1:1, final 800×800
```
Style anchor image. Lord Gavelby, the auctioneer, head and shoulders, centred, facing three-quarters toward the right. A portly, pompous Victorian gentleman in his sixties: florid cheeks, an enormous waxed handlebar moustache, magnificent mutton-chop sideburns, a gold monocle on a chain, a tall glossy top hat, an oxblood velvet frock coat with brass buttons and a gold watch chain. He holds a polished mahogany gavel up near his face with a smug, conspiratorial grin, one eyebrow arched. AAA stylised 3D, cinematic warm key light with a cool blue rim light. Transparent background. No text.
```
If he isn't right, say exactly what's wrong (for example "more mischievous, glossier top hat, sharper rim light") and ask ChatGPT to **edit this image** rather than start again. On desktop you can also use the **select tool** on the image to fix just one area.

**Once he's approved, download him.** ChatGPT forgets earlier images in long chats, so attach this file again with **every** prompt from here on and start each prompt with: *"Match the style of the attached Lord Gavelby exactly."*

**`auctioneer-shock.png`** — transparent, 1:1
```
Using the approved Lord Gavelby as the character reference, the same man, same outfit, same framing and lighting, now shocked and delighted: monocle popping out of his eye mid-air, eyebrows flying up, moustache bristling, mouth open in a gasp, gavel raised high mid-swing. Transparent background. No text.
```

---

## Step 3 — Player portraits (8 human characters)

Each image is cropped into a circle in the game, so keep the face centred with breathing room. Each character has a solid background colour so the game can tell players apart. Paste this first:

```
Next: 8 player portraits, a rogues' gallery of Victorian art forgers and shady collectors. All humans, a mix of ages, genders and skin tones. Same AAA stylised 3D style, framing and lighting as the approved Lord Gavelby: head and shoulders, centred, facing the viewer, expressive comedic caricature, rich costume materials, warm key light with a rim light. Each sits on the solid flat background colour I give you (no gradient, no scenery). Square 1:1. No text.
```

| File | Character | Background |
|---|---|---|
| `avatar-1.png` | **The Marquis** — elderly aristocrat, towering powdered wig, beauty spot, a smirk that says he's sold the same painting three times | `#8E3B46` |
| `avatar-2.png` | **Velvet Vera** — glamorous con artist in her forties, Black woman, enormous feathered hat, opera gloves, a knowing side-eye | `#2F6E8E` |
| `avatar-3.png` | **Brushstroke Billy** — cheeky young street painter, flat cap, freckles, paint smeared across both cheeks, gap-toothed grin | `#6E8E2F` |
| `avatar-4.png` | **Madame Provenance** — stern gallery dealer, South Asian woman, silver streak in her hair, pince-nez, high lace collar, one raised eyebrow | `#8E6A2F` |
| `avatar-5.png` | **Captain Canvas** — retired naval officer, East Asian man, huge white mutton chops, a bicorne hat, a paintbrush tucked behind his ear | `#5B3F8E` |
| `avatar-6.png` | **Dr Varnish** — wild-haired art "restorer" with brass magnifying goggles pushed up, singed eyebrows, manic delight | `#2F8E6A` |
| `avatar-7.png` | **Lady Lavinia Gilt** — prim young debutante, Latina woman, tiara, innocent doe eyes, a paintbrush very badly hidden in her ringlets | `#8E2F7A` |
| `avatar-8.png` | **Bertie Fudge** — portly bon-vivant dandy, loud checked suit, waxed moustache, champagne flute, cheeks flushed | `#4A4A4A` |

Prompt for each (change the details):
```
Portrait 1 of 8: The Marquis, an elderly aristocrat with a towering powdered wig and a beauty spot, smirking like he has sold the same painting three times. Head and shoulders, centred, facing the viewer. Solid flat background #8E3B46. Same style and lighting as Lord Gavelby. Square. No text.
```

---

## Step 4 — The gilt frame (seen more than anything else)

**`frame-gilt.png`** — transparent, portrait 3:4, final 900×1200
```
A museum-grade ornate carved gilt picture frame, perfectly front-on with no perspective or tilt, portrait 3:4. Heavy baroque carving (acanthus leaves, scrolls, a shell crest at the top centre), realistic gold leaf with burnished highlights, dark recesses and a little worn gesso showing through. The frame border is an even width on all four sides, exactly 10% of the image width. The opening in the middle must be fully TRANSPARENT, and everything outside the frame must also be transparent. No canvas, no picture, no text.
```
The game expects the opening to start **10% in from every edge**. If yours comes out different, tell me the measurements and I'll change one line of code.

---

## Step 5 — TV backgrounds (16:9, final 1920×1080, save as .webp)

All backgrounds: **no people, no text, dark and softly out of focus where text sits.** Paste this line before them:

```
Next: five 16:9 TV backgrounds in the same AAA style. These are environments only: cinematic, rich, with depth of field. The areas I name must stay darker and lower in detail because game text sits on top.
```

**`bg-gallery.webp`** — lobby and scores
```
The grand hall of an opulent but slightly disreputable Victorian art gallery at night. Prussian blue silk walls, brass picture rails, gilt frames hung slightly crooked, a red velvet rope, polished parquet floor reflecting warm gaslight, dust drifting in light shafts. Keep the left half and bottom quarter dark and calm.
```

**`bg-studio.webp`** — painting phase
```
A secret forger's attic studio by moonlight: easels under dust sheets, jars of brushes, half-finished "old masters", forged wax seals on a desk, a skylight casting cool blue light, a warm oil lamp glow. Keep the top two-thirds calm and dark.
```

**`bg-auction.webp`** — auction and reveal
```
A lavish Victorian auction saleroom seen from the back row: empty oxblood velvet chairs, a mahogany rostrum under a dramatic spotlight, heavy curtains, crystal chandeliers, gilt everywhere, faint haze. Keep the centre clear and darker.
```

**`bg-final.webp`** — final results
```
A gala celebration in the gallery: gold confetti suspended in the air, a red carpet, champagne coupes on a silver tray, spotlights sweeping, gilt frames glittering. Festive, with darker edges.
```

**`bg-afterhours.webp`** — every screen in the adults-only After Hours Collection
```
The same gallery after closing time, turned into a decadent private salon: deep plum walls, a rose-pink glow, candlelight, tipped-over wine glasses, a velvet chaise longue with a feather boa draped over it, paintings turned to face the wall. Cheeky and glamorous, never explicit. Keep the centre calm and dark.
```

---

## Step 6 — Logo, icon, stamps, badges

**`logo.png`** — transparent, landscape (crop tight afterwards)
```
Premium AAA game logo reading exactly "Forgers Finger". Sculpted 3D gilt lettering with bevelled edges, burnished gold and dark ink outlines, in a bold Victorian theatre-poster typeface. A paint-dipped human index finger replaces the dot of the "i" in "Finger", with a single glossy crimson paint drip. Subtle sparkle on the gold. No other text, transparent background.
```

**`icon-512.png`** (and resize a copy to **`icon-192.png`**) — square
```
App icon: a human index finger with a paint-smudged tip poking cheekily out from behind an ornate gilt frame, Prussian blue background, bold readable shapes, AAA 3D finish. No text.
```

**`stamp-forgery.png`** — transparent, 2:1
```
A realistic crimson rubber-stamp impression reading exactly "FORGERY!" in heavy slab capitals inside a rough rectangular border, slightly rotated, patchy ink texture as if slammed down hard. Transparent background. No other text.
```

**`stamp-genuine.png`** — transparent, 2:1
```
A glossy 3D gold wax seal with a red ribbon, with the word "GENUINE" embossed in an arc, slightly rotated, catching a bright highlight. Transparent background. No other text.
```

**`rosette.png`** — transparent, square
```
A luxurious prize rosette with crimson and gold satin ribbons and a gold centre button showing a small painted heart. Transparent background. No text.
```

**Award medals** — transparent, square, final 256×256, all matching:
- **`award-forger.png`**: a gold medal on an oxblood ribbon, embossed with a crossed paintbrush and quill and a winking eye.
- **`award-gullible.png`**: a dented bronze medal, embossed with an empty wallet with moths flying out.
- **`award-favourite.png`**: a silver medal on a rose ribbon, embossed with a heart-shaped painter's palette.
- **`award-eagle.png`**: a gold medal on a Prussian blue ribbon, embossed with a sharp eye behind a monocle.

```
Award medal, transparent background, AAA 3D render, polished metal, satin ribbon: [description above]. No text.
```

**`badge-18.png`** — transparent, square
```
A round premium badge for an adults-only "After Hours" mode: plum enamel centre, rose-pink and gold rim, a small crescent moon and a cocktail glass, with "18+" in bold raised gold numerals. Transparent outside the circle. Only the text "18+".
```

---

## If an image still comes out weak

Paste whichever of these fits, rather than starting again:

- **Flat or cheap-looking:** "Too flat. Re-render as premium stylised 3D with cinematic rim lighting, realistic materials and depth of field, matching the Lord Gavelby anchor."
- **Style drift:** "This doesn't match the anchor. Use the approved Lord Gavelby image as the style reference and regenerate with the same lighting and finish."
- **Low detail:** "Regenerate at the highest quality available, with sharper detail in the faces, fabrics and gold."
- **Broken text:** "The lettering is wrong. Regenerate and spell it exactly: Forgers Finger. Check every letter before showing me."
- **Background not transparent:** "Give me this exact image again as a PNG with a truly transparent background." If that still fails, ask for the flat green #00FF00 version and send it to me. I'll strip the green out for you.
- **Drifting after many images:** start a fresh chat, paste the master brief again, and attach Lord Gavelby plus your references.

---

## Checklist (27 images, drop into `public/assets/`)

- [ ] auctioneer.png, auctioneer-shock.png
- [ ] avatar-1.png to avatar-8.png
- [ ] frame-gilt.png
- [ ] bg-gallery.webp, bg-studio.webp, bg-auction.webp, bg-final.webp, bg-afterhours.webp
- [ ] logo.png, icon-512.png, icon-192.png
- [ ] stamp-forgery.png, stamp-genuine.png
- [ ] rosette.png
- [ ] award-forger.png, award-gullible.png, award-favourite.png, award-eagle.png
- [ ] badge-18.png
