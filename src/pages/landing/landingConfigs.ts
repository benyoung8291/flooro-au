export interface LandingConfig {
  slug: string;
  keyword: string;
  title: string;
  description: string;
  h1: React.ReactNode;
  intro: string;
  badge: string;
  features: { title: string; desc: string }[];
  faqs: { q: string; a: string }[];
}

export const LANDING_CONFIGS: Record<string, LandingConfig> = {
  "flooring-estimating-software": {
    slug: "flooring-estimating-software",
    keyword: "flooring estimating software",
    title: "Flooring Estimating Software Australia | Flooro",
    description:
      "Flooring estimating software built for Australian contractors. Draw plans, optimise cuts, and send accurate quotes from your phone. Free to start.",
    badge: "Built for Australian flooring contractors",
    h1: (
      <>
        Flooring estimating<br />software that pays<br />for itself.
      </>
    ),
    intro:
      "Stop losing margin to spreadsheet maths. Flooro is the flooring estimating software that draws floor plans, optimises material cuts, and produces client-ready quotes in minutes — on your laptop or your phone, on-site.",
    features: [
      { title: "Accurate to the millimetre", desc: "Snap-to-vertex drawing with two-click scale calibration. Polygons, cut-outs, curves — all to scale." },
      { title: "Real material costing", desc: "Sheet vinyl, plank, tile, broadloom — every material type with proper waste, seams, and box rounding." },
      { title: "Quote in your branding", desc: "Hierarchical line items, your letterhead, sequential quote numbers. PDF, CSV, or Excel — your call." },
      { title: "Sync takeoff to quote", desc: "Change a room dimension and the quote updates. No more re-keying numbers between tools." },
      { title: "Built for the site visit", desc: "Measure on your phone in the carpark, walk into the meeting with a sendable quote." },
      { title: "Australian-built", desc: "GST handled, AUD pricing, m² and lm units, AU-style quote terms. Local support, local pricing." },
    ],
    faqs: [
      { q: "What's the best flooring estimating software in Australia?", a: "Flooro is purpose-built for Australian flooring contractors — sheet vinyl, plank, tile, and broadloom carpet — with GST, AUD, and m²/lm units baked in. Unlike generic construction estimators, every feature targets flooring-specific maths: greedy-strip cut optimisation, tile pattern engines, drop-direction control, and waste calculations." },
      { q: "Can I use it on my phone on-site?", a: "Yes — Flooro is fully responsive. Snap a photo of a printed plan, set scale with two clicks, and trace the room. You can walk out of a site visit with a quote ready to send." },
      { q: "How much does flooring estimating software cost?", a: "Flooro is free to start. Paid plans unlock unlimited projects, team access, and advanced cut optimisation. See the pricing section on our home page." },
      { q: "Does it handle GST and Australian quotes?", a: "Yes. GST is calculated automatically, all pricing is in AUD, and quote layouts follow standard Australian conventions including ABN display and signature blocks." },
    ],
  },
  "flooring-takeoff-software": {
    slug: "flooring-takeoff-software",
    keyword: "flooring takeoff software",
    title: "Flooring Takeoff Software | Measure Plans in Minutes — Flooro",
    description:
      "Flooring takeoff software for sheet vinyl, plank, tile, and carpet. Trace floor plans, optimise cuts, and export quantities to your quote. Free to start.",
    badge: "Takeoff that finishes in minutes, not hours",
    h1: (
      <>
        Flooring takeoff,<br />done in the time<br />it takes for tea.
      </>
    ),
    intro:
      "Upload a PDF plan, snap a photo on-site, or sketch the room from scratch. Flooro's flooring takeoff software measures, optimises cuts, and feeds quantities straight into your quote — no double-entry, no calculator gymnastics.",
    features: [
      { title: "Drop a PDF, set the scale", desc: "Upload manufacturer or architect PDFs, calibrate scale with two points, and you're measuring in seconds." },
      { title: "Polygon, rectangle, curve", desc: "Three drawing tools cover every room shape — including curved walls and complex cut-outs." },
      { title: "Smart cut optimisation", desc: "Greedy-strip algorithm packs roll goods at any angle. Cross-room offcut reuse cuts waste below 3%." },
      { title: "Tile pattern engine", desc: "Grid, brick, herringbone, basketweave, diagonal — with proper box rounding and pattern-match waste." },
      { title: "Multi-page floor plans", desc: "Each page gets its own scale and rooms — perfect for multi-storey or multi-zone takeoffs." },
      { title: "Live quantities", desc: "m², lm, boxes, rolls — all calculated live as you draw. Export to your quote with one click." },
    ],
    faqs: [
      { q: "What is flooring takeoff software?", a: "Flooring takeoff software measures floor plans and converts them into the material quantities you need to order — square metres of vinyl, boxes of tiles, linear metres of trim. Flooro adds cut optimisation and pattern logic on top so the quantities you order match what the installer will actually use." },
      { q: "Can I import a PDF floor plan?", a: "Yes. Drop a PDF (single or multi-page) into Flooro, set the scale by clicking two points of a known dimension, and start tracing. The plan is rendered client-side using pdfjs — no upload to a third party." },
      { q: "How accurate is the cut optimisation?", a: "Flooro uses a greedy-strip algorithm with cross-room offcut reuse. For typical jobs this brings waste below 3% — significantly better than rule-of-thumb 10% padding." },
      { q: "Does it work for tile takeoffs as well as roll goods?", a: "Yes. Flooro handles sheet vinyl, plank, broadloom carpet, and tiles (with full pattern engine: grid, brick, herringbone, basketweave, diagonal) including proper box rounding." },
    ],
  },
  "carpet-estimating-software": {
    slug: "carpet-estimating-software",
    keyword: "carpet estimating software",
    title: "Carpet Estimating Software | Drop & Seam Optimiser — Flooro",
    description:
      "Carpet estimating software with drop-direction control, seam optimisation, and broadloom waste under 3%. Built for Australian flooring contractors.",
    badge: "Drops, seams, and waste — solved",
    h1: (
      <>
        Carpet estimating<br />without the<br />guesswork.
      </>
    ),
    intro:
      "Broadloom is unforgiving — wrong drop direction, wrong seam placement, and you're eating the difference. Flooro's carpet estimating software handles drops, seams, and offcut reuse automatically so your quote matches your install.",
    features: [
      { title: "Drop-direction control", desc: "Set fill direction per room, or let the optimiser pick the layout with the least waste." },
      { title: "Seam placement & avoid zones", desc: "Mark doorways, wet areas, or high-traffic zones — the optimiser routes seams around them." },
      { title: "Cross-room offcut reuse", desc: "Best-fit bin packing reuses drops between rooms automatically. No more skip-bin offcuts." },
      { title: "Smooth-edge & gripper", desc: "Linear metres of edge trim calculated automatically with allowance for doorways and openings." },
      { title: "Stair & landing support", desc: "Drop a stair template, set tread/riser counts, get accurate broadloom and underlay quantities." },
      { title: "Quote in AUD with GST", desc: "Australian quote layout, ABN, GST, payment terms — ready to send to the homeowner." },
    ],
    faqs: [
      { q: "What's the best software for estimating carpet jobs?", a: "Flooro is built for carpet (and other flooring) contractors with drop-direction control, seam optimisation, smooth-edge calculations, and AU-style quotes. The greedy-strip algorithm typically brings broadloom waste below 3% even on complex multi-room jobs." },
      { q: "Does it handle broadloom seams properly?", a: "Yes. You can set fill direction per room, mark seam-avoid zones (doorways, wet areas), and the optimiser places seams in low-traffic locations while minimising offcut waste." },
      { q: "Can it estimate underlay and smooth edge too?", a: "Yes. Underlay is calculated as a roll good with its own width and waste, and smooth edge / gripper is auto-calculated as linear metres around the room perimeter, excluding doorways." },
    ],
  },
  "vinyl-flooring-calculator": {
    slug: "vinyl-flooring-calculator",
    keyword: "vinyl flooring calculator",
    title: "Vinyl Flooring Calculator | Sheet, Plank & Tile — Flooro",
    description:
      "Free vinyl flooring calculator for sheet vinyl, plank, and LVT. Calculate area, drops, coving, weld rod, and waste. Built for Australian contractors.",
    badge: "More than a square-metre calculator",
    h1: (
      <>
        Vinyl flooring<br />calculator with<br />actual cut planning.
      </>
    ),
    intro:
      "A square-metre calculator tells you nothing about how many drops you'll cut, where the seams land, or how much coving and weld rod you need. Flooro is a vinyl flooring calculator that does all of it — and turns the result into a quote.",
    features: [
      { title: "Sheet, plank, and LVT", desc: "Roll goods at any width, plank with directional layout, LVT with pattern logic — one tool covers all vinyl types." },
      { title: "Coving & skirting auto-calc", desc: "Vinyl coving uses drop length plus 2× coving height per drop. Calculated automatically." },
      { title: "Weld rod by linear metre", desc: "Weld rod allowance follows the seam plan — exactly the metres you need, no rounding up to a full coil." },
      { title: "Cut plan visualisation", desc: "See where every drop comes out of the roll before you place the order. Catch problems before they cost you." },
      { title: "Wastage suggestions", desc: "Dynamic 3.5–15% wastage based on room complexity. No more flat 10% padding." },
      { title: "Mobile-first", desc: "Use the calculator on your phone at the supplier desk. No app install, no login required to start." },
    ],
    faqs: [
      { q: "How do I calculate how much vinyl flooring I need?", a: "Multiply room length × width to get area, then add waste — but for sheet vinyl you also need to plan drops (which way the roll runs) and seams. Flooro's vinyl flooring calculator does all of this automatically: enter the room shape, pick a roll width, and it shows the exact drops, seams, and metres of roll you need to order." },
      { q: "Does it calculate coving and weld rod?", a: "Yes. Vinyl coving is calculated as drop length plus 2× coving height per drop (the standard install allowance). Weld rod is calculated from the seam plan in linear metres. Both appear as separate line items on the quote." },
      { q: "Is the vinyl calculator free?", a: "Yes — Flooro is free to start. You can measure rooms, run cut optimisation, and view the results without paying. Paid plans unlock unlimited projects and team features." },
      { q: "What waste percentage should I use for vinyl?", a: "Flooro suggests 3.5–15% based on room complexity (number of corners, shape, roll width vs room width). For simple rectangular rooms with a roll wider than the room, waste is often under 5%. Complex multi-cutout rooms can hit 12–15%." },
    ],
  },
};

export const LANDING_SLUGS = Object.keys(LANDING_CONFIGS);