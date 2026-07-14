# Amino Acid Chemical Reasoning Explorer

A static, browser-based learning tool for undergraduate biochemistry. It helps students infer chemical behavior from amino-acid side-chain structure instead of memorizing isolated facts.

## Learning goals

- Connect functional groups to polarity, charge, hydrogen bonding, and acid–base behavior.
- Predict effects on protein folding, catalysis, covalent chemistry, recognition, spectroscopy, and metabolism.
- Make predictions before explanations are revealed, then follow an observe → infer → predict → transfer reasoning chain.
- Compare chemically related substitutions and explain why they are conservative or nonconservative.
- Transfer side-chain chemistry to chromatography, electrophoresis, metabolism, protein folding, and enzyme mechanisms.
- Practice all 20 common amino acids through Explore, Sort, Compare, Apply, and Review modes.

## Files

- `index.html` — semantic page structure
- `styles.css` — responsive academic visual design and focus states
- `script.js` — activities, feedback, and local progress
- `data/amino-acids.js` — editable structured content for all 20 amino acids

## Run locally

Open `index.html` in a modern browser. No installation, server, login, or internet connection is required.

## Publish with GitHub Pages

1. Put these files in a GitHub repository, preserving the `data` folder.
2. In the repository, open **Settings → Pages**.
3. Choose **Deploy from a branch**, select the branch and `/ (root)`, then save.
4. GitHub will show the published URL after deployment completes.

## Edit content

Edit objects in `data/amino-acids.js`. Keep field names unchanged because the interface reads them directly. Multiple valid sorting answers live in each amino acid’s `sort` array.

To add an application question, add an item to the `scenarios` array in `script.js` using this order: prompt, answer choices, zero-based correct-answer index, reasoning feedback, and concept label.

## Accessibility

The interface uses semantic landmarks, real buttons and form controls, a skip link, visible keyboard focus, live feedback regions, text labels in addition to color, responsive layouts, and reduced-motion support. Learning-mode tabs support Left/Right Arrow, Home, and End keys. Sorting uses buttons rather than pointer-only drag and drop. Feedback receives focus after a response so keyboard and screen-reader users hear the result in context. Progress is saved only in the learner’s browser with `localStorage` and is never transmitted.

Correctness never relies on color alone: submitted options retain pale shading, a high-contrast border, a checkmark or X, and a written **Correct** or **Not quite** label. Sorting also distinguishes incomplete required classifications.

## Instructor guide

### Purpose of each mode

- **Explore** uses prediction before explanation to connect a functional group with polarity, ionization, hydrogen bonding, catalysis, and biological consequences.
- **Sort** rehearses five complementary classification systems. Guided rounds fit a lecture pause; Organize All 20 supports longer study sessions. Overlapping classifications are intentional.
- **Compare** makes students decide how a related substitution changes hydration, charge, and conformational tendency.
- **Apply** transfers side-chain chemistry to protein folding, enzyme mechanisms, acid–base catalysis, molecular recognition, metabolism, chromatography, electrophoresis, membranes, and spectroscopy.
- **Review** consolidates chemical capabilities, unusual residues, missed concepts, and optional abbreviation retrieval.

### Suggested 10–15 minute workflow

1. Predict the chemistry of two amino acids in Explore.
2. Complete one six-card Guided Sort round.
3. Compare one chemically related pair.
4. Complete five Apply scenarios.
5. Review missed concepts and one high-value exception.

### Use with a prerecorded lecture

Pause the recording before a reveal and ask students to state the structural evidence for their prediction aloud. Suggested placements include:

- **Before lecture:** one Explore item to activate functional-group knowledge.
- **During lecture:** a Guided Sort round or preset comparison as a retrieval pause.
- **After lecture:** five Apply questions plus Review Missed Concepts.
- **Before later units:** use Structure Roles for protein folding, Mechanism Roles for enzymes and acid–base chemistry, and relevant Apply scenarios before metabolism, chromatography, or electrophoresis.

### Progress and privacy

The browser stores attempts, supported answers, missed concepts, and encountered amino acids in `localStorage`. Data remain on that device and are not transmitted. **Reset progress** clears the stored record; **Start New Session** resets the current activity sequence while preserving the static application architecture. This is study feedback, not a gradebook.

### Editing instructional content

Each object in `data/amino-acids.js` contains core chemistry plus extended fields for textbook category, water behavior, chemical capabilities, protein-structure roles, mechanism roles, accepted classifications, hints, biochemical significance, and nuanced notes. Add or revise classifications there rather than in the interface.

Application scenarios live in the `scenarios` array in `script.js`. Each scenario contains a topic, prompt, choices, correct-answer index, a three-step reasoning explanation, and a concept label used by progress tracking.

## Future enhancements

- Instructor-authored scenario packs
- Optional molecular structure images with accessible text equivalents
- Exportable, anonymous study summaries
- More select-all and confidence-rating prompts
- Localization and screen-reader user testing
