(function () {
  'use strict';

  const aminoAcids = window.AMINO_ACIDS || [];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const emptyProgress = () => ({ attempted: 0, correct: 0, missed: [], encountered: [] });
  let progress = readProgress();
  let exploreIndex = 0;
  let predictions = {};
  let sortRound = 0;
  let applicationSet = [];
  let applicationIndex = 0;

  function readProgress() {
    try { return JSON.parse(localStorage.getItem('aa-progress')) || emptyProgress(); }
    catch (_) { return emptyProgress(); }
  }
  function saveProgress() {
    try { localStorage.setItem('aa-progress', JSON.stringify(progress)); } catch (_) {}
  }
  function encounter(name) {
    if (!progress.encountered.includes(name)) progress.encountered.push(name);
    saveProgress();
  }
  function record(correct, concept) {
    progress.attempted += 1;
    if (correct) progress.correct += 1;
    else if (!progress.missed.includes(concept)) progress.missed.push(concept);
    saveProgress();
  }
  function shuffled(items) { return [...items].sort(() => Math.random() - 0.5); }
  function findAminoAcid(name) { return aminoAcids.find((item) => item.name === name); }
  function relationText(item) {
    if (/nonpolar|hydrocarbon/.test(item.polarity + item.functionalGroup)) return 'favors hydrophobic packing and retention on nonpolar chromatography media';
    if (item.charge.includes('+')) return 'favors water exposure, anion binding, and migration toward the cathode in an electric field';
    if (item.charge.includes('−')) return 'favors water exposure, cation binding, and migration toward the anode in an electric field';
    return 'supports selective hydrogen bonding and molecular recognition';
  }
  function clearAnswerStates(root = document) {
    $$('.answer-correct,.answer-incorrect,.answer-missed', root).forEach((element) => {
      element.classList.remove('answer-correct', 'answer-incorrect', 'answer-missed');
      $('.answer-state', element)?.remove();
    });
  }
  function markAnswer(element, state, label) {
    if (!element) return;
    element.classList.remove('answer-correct', 'answer-incorrect', 'answer-missed');
    element.classList.add(`answer-${state}`);
    $('.answer-state', element)?.remove();
    const symbol = state === 'correct' ? '✓' : state === 'incorrect' ? '✕' : '!';
    element.insertAdjacentHTML('beforeend', `<span class="answer-state"><span aria-hidden="true">${symbol}</span> ${label}</span>`);
  }
  function significanceMarkup(item) {
    return `<section id="significance-panel" class="significance-panel" ${$('#significance')?.checked ? '' : 'hidden'} aria-labelledby="significance-title"><h4 id="significance-title">Why This Amino Acid Matters</h4><ul>${item.biochemicalSignificance.map((point) => `<li>${point}</li>`).join('')}</ul></section>`;
  }
  function structuralReasoningMarkup(item){return `<section id="structural-reasoning-panel" class="significance-panel structure-property" ${$('#structural-reasoning')?.checked?'':'hidden'}><h4>Structure → Property</h4><ol>${item.structurePropertyExplanation.map(point=>`<li>${point}</li>`).join('')}</ol><p><b>Chirality:</b> ${item.chiralityReason}</p></section>`}

  if (!aminoAcids.length) {
    $('#workspace').innerHTML = '<div class="card scenario"><h2>Content unavailable</h2><p>The structured amino-acid data did not load. Keep <code>data/amino-acids.js</code> beside this page and reload.</p></div>';
    return;
  }

  const tabs = $$('.tab');
  function activateMode(tab, moveFocus = true) {
    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(item.dataset.mode);
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    if (tab.dataset.mode === 'review') renderReview();
    if (moveFocus) document.getElementById(tab.dataset.mode).focus({ preventScroll: true });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateMode(tab));
    tab.addEventListener('keydown', (event) => {
      let next = null;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== null) { event.preventDefault(); tabs[next].focus(); activateMode(tabs[next], false); }
    });
  });
  $$('.mode').forEach((panel) => panel.tabIndex = -1);

  const structureLearning = window.STRUCTURE_LEARNING;
  let structureSection = 'backbone';
  function structureNav(){return `<div class="structure-subnav" role="tablist" aria-label="Structure topics">${[['backbone','Common Backbone'],['chirality','Chirality'],['representations','Structural Representations'],['architecture','Side-Chain Architecture']].map(([key,label])=>`<button class="secondary structure-topic ${structureSection===key?'active':''}" data-topic="${key}" role="tab" aria-selected="${structureSection===key}">${label}</button>`).join('')}</div>`}
  function bindStructureAnswers(root, selector, answer, explanation){$$(selector,root).forEach(button=>button.addEventListener('click',()=>{clearAnswerStates(root);const ok=button.dataset.answer===answer;markAnswer(button,ok?'correct':'incorrect',ok?'Correct':'Not quite');$('.structure-live',root).innerHTML=`<b>${ok?'✓ Correct':'✕ Not quite'}.</b> ${explanation}`;$('.structure-live',root).focus();record(ok,'structure: '+structureSection)}))}
  function renderStructure(){
    const app=$('#structure-app');
    let body='';
    if(structureSection==='backbone')body=`<div class="learning-grid"><article class="card lesson-card"><h3>1. Label the shared α-amino-acid backbone</h3><div class="generic-aa" role="img" aria-label="Generic alpha amino acid: central alpha carbon bonded to amino group, carboxyl group, hydrogen, and variable R group"><span>H₃N⁺</span><span>— Cα —</span><span>COO⁻</span><small>H and R also attach to Cα</small></div><p>Select the label requested: <b>variable portion that changes among amino acids</b>.</p><div class="choices">${structureLearning.backboneParts.map(([key,label])=>`<button class="choice" data-answer="${key}">${label}</button>`).join('')}</div><div class="structure-live feedback-region" tabindex="-1" aria-live="polite"></div></article><article class="card lesson-card"><h3>2. Greek-letter carbon naming</h3><p>Greek names proceed outward from Cα, unlike numerical naming common in organic chemistry.</p><label class="field">Example<select id="greek-example">${Object.keys(structureLearning.greekExamples).map(n=>`<option>${n}</option>`).join('')}</select></label><div id="greek-activity"></div></article></div><div class="lesson-summary">The backbone is shared. Most useful chemical variation comes from the side chain.</div>`;
    if(structureSection==='chirality')body=`<div class="learning-grid"><article class="card lesson-card"><h3>Is the α-carbon chiral?</h3><p>A chiral Cα needs four different substituents. Choose an example, inspect its R group, then predict.</p><label class="field">Amino acid<select id="chiral-example">${structureLearning.chiralityQuestions.map(n=>`<option>${n}</option>`).join('')}</select></label><div id="chiral-prompt"></div></article><article class="card lesson-card"><h3>L versus D</h3><div class="mirror-pair" role="img" aria-label="Paired Fischer projections with carboxyl group at top, R group at bottom, and amino groups on opposite sides"><div>COO⁻<br>H—C—NH₃⁺<br>R<br><b>L form</b></div><div class="mirror-line" aria-hidden="true">│ mirror │</div><div>COO⁻<br>⁺H₃N—C—H<br>R<br><b>D form</b></div></div><p>These structures have the same connectivity but opposite configuration at Cα. What is their relationship?</p><div class="choices"><button class="choice stereo-answer" data-answer="enantiomers">Nonsuperimposable enantiomers</button><button class="choice stereo-answer" data-answer="identical">Identical structures</button><button class="choice stereo-answer" data-answer="constitutional">Constitutional isomers</button></div><details><summary>Optional orientation scaffold</summary><p>Orient H toward the viewer and examine COO⁻ → R → NH₃⁺ as a recognition aid. This mnemonic does not replace formal stereochemical reasoning.</p></details><details><summary>Biological significance</summary><p>Ribosomal proteins use almost exclusively L-amino acids. D-amino acids occur in settings such as bacterial cell walls and specialized peptides. Glycine is neither L nor D because it is achiral.</p></details><div class="structure-live feedback-region" tabindex="-1" aria-live="polite"></div></article></div>`;
    if(structureSection==='representations')body=`<article class="card lesson-card"><h3>Recognize chemistry across drawing conventions</h3><div class="convention-grid"><div><b>Fischer projection</b><p>Horizontal bonds project toward the viewer; vertical bonds project away. Relevant atoms are explicit.</p></div><div><b>Wedge-and-dash</b><p>Solid wedge projects toward; dashed wedge projects away; straight lines lie approximately in the plane.</p></div><div><b>Condensed / side-chain card</b><p>Connectivity is emphasized while some three-dimensional information is omitted.</p></div></div><label class="field">Drawing pair<select id="representation-pair">${structureLearning.representations.map((x,i)=>`<option value="${i}">${x.prompt}</option>`).join('')}</select></label><div class="choices representation-choices">${['same stereoisomer','opposite stereoisomers','same amino acid shown using different conventions','different amino acids'].map(x=>`<button class="choice" data-answer="${x}">${x}</button>`).join('')}</div><div class="structure-live feedback-region" tabindex="-1" aria-live="polite"></div></article>`;
    if(structureSection==='architecture')body=`<article class="card lesson-card"><h3>Connect motifs to behavior</h3><p>Select a motif to examine an amino-acid example and its transferable chemistry.</p><div class="motif-grid">${structureLearning.motifs.map(([motif,example,behavior])=>`<button class="motif-card" data-motif="${motif}"><b>${motif}</b><span>${example}</span><small>${behavior}</small></button>`).join('')}</div><div class="structure-live feedback-region" tabindex="-1" aria-live="polite">Hydrocarbons tend to be hydrophobic; heteroatoms and ionizable groups enable selective interactions and reactions.</div></article>`;
    app.innerHTML=structureNav()+body;
    $$('.structure-topic',app).forEach(b=>b.addEventListener('click',()=>{structureSection=b.dataset.topic;renderStructure()}));
    if(structureSection==='backbone'){bindStructureAnswers(app,'.lesson-card:first-child .choice','r-group','The R group is the variable side chain; amino, carboxyl, H, and Cα form the shared framework.');const renderGreek=()=>{const n=$('#greek-example').value,labels=structureLearning.greekExamples[n];$('#greek-activity').innerHTML=`<p><b>${n}</b>: choose the carbon immediately after Cα.</p><div class="choices">${labels.map(x=>`<button class="choice greek-answer" data-answer="${x}">${x}-carbon</button>`).join('')}</div><div class="structure-live feedback-region" tabindex="-1" aria-live="polite"></div>`;bindStructureAnswers($('#greek-activity'),'.greek-answer','β',`Cβ is the first side-chain carbon. This example continues only through ${labels[labels.length-1]}.`) };$('#greek-example').onchange=renderGreek;renderGreek()}
    if(structureSection==='chirality'){const renderChiral=()=>{const a=findAminoAcid($('#chiral-example').value);$('#chiral-prompt').innerHTML=`<div class="structure"><small>side chain</small>${a.structure}</div><div class="choices"><button class="choice chiral-answer" data-answer="true">Chiral</button><button class="choice chiral-answer" data-answer="false">Achiral</button></div><div class="structure-live feedback-region" tabindex="-1" aria-live="polite"></div>`;bindStructureAnswers($('#chiral-prompt'),'.chiral-answer',String(a.isChiral),a.chiralityReason)};$('#chiral-example').onchange=renderChiral;renderChiral();bindStructureAnswers(app,'.stereo-answer','enantiomers','Mirror-image L and D forms are nonsuperimposable enantiomers. Proteins use the L form; the drawing convention does not change that identity.')}
    if(structureSection==='representations'){const bindRep=()=>{const x=structureLearning.representations[Number($('#representation-pair').value)];bindStructureAnswers(app,'.representation-choices .choice',x.answer,x.reason)};$('#representation-pair').onchange=()=>{clearAnswerStates(app);$('.structure-live',app).textContent='';bindRep()};bindRep()}
    if(structureSection==='architecture')$$('.motif-card',app).forEach(b=>b.addEventListener('click',()=>{const x=structureLearning.motifs.find(m=>m[0]===b.dataset.motif);clearAnswerStates(app);markAnswer(b,'correct','Selected');$('.structure-live',app).innerHTML=`<b>${x[1]}</b> contains ${x[0]} → ${x[2]}.`;$('.structure-live',app).focus()}));
  }

  const predictionQuestions = [
    { id: 'class', question: 'What is its dominant behavior near pH 7?', options: ['Hydrophobic', 'Polar neutral', 'Positive', 'Negative', 'Context dependent'] },
    { id: 'hb', question: 'What side-chain hydrogen bonding is plausible?', options: ['Donor and acceptor', 'Donor only', 'Acceptor only', 'Neither'] },
    { id: 'ion', question: 'Is proton transfer accessible near biological pH?', options: ['Readily accessible', 'Environment dependent', 'Usually inaccessible'] },
    { id: 'role', question: 'Which consequence is most likely?', options: ['Hydrophobic packing', 'Molecular recognition', 'Catalysis or covalent chemistry', 'Backbone geometry'] }
  ];

  function hBondAnswer(item) {
    if (item.donor && item.acceptor) return 'Donor and acceptor';
    if (item.donor) return 'Donor only';
    if (item.acceptor) return 'Acceptor only';
    return 'Neither';
  }
  function hBondDescription(item) {
    if (item.name === 'Cysteine') return 'weak donor; weak acceptor';
    if (item.name === 'Lysine') return 'donor when protonated; not an acceptor in its usual ammonium form';
    return `donor ${item.donor ? 'yes' : 'no'}; acceptor ${item.acceptor ? 'yes' : 'no'}`;
  }
  function ionizationAnswer(item) {
    if (/His|Cys/.test(item.three)) return 'Environment dependent';
    if (/Asp|Glu|Lys|Arg/.test(item.three)) return 'Readily accessible';
    return 'Usually inaccessible';
  }
  function classAnswer(item) {
    if (item.name === 'Histidine') return 'Context dependent';
    if (item.charge.includes('+')) return 'Positive';
    if (item.charge.includes('−')) return 'Negative';
    if (/nonpolar/.test(item.polarity)) return 'Hydrophobic';
    return 'Polar neutral';
  }
  function roleAnswer(item) {
    if (/Gly|Pro/.test(item.three)) return 'Backbone geometry';
    if (/Cys|His|Ser|Asp|Glu|Lys/.test(item.three)) return 'Catalysis or covalent chemistry';
    if (/nonpolar/.test(item.polarity)) return 'Hydrophobic packing';
    return 'Molecular recognition';
  }

  function renderExplore() {
    const item = aminoAcids[exploreIndex];
    predictions = {};
    encounter(item.name);
    $('#explore-app').innerHTML = `
      <div class="explore-grid">
        <article class="card identity">
          <div class="identity-top"><div class="code-badge" aria-label="one-letter code ${item.one}">${item.one}</div><div><h3>${item.name}</h3><div class="abbr">${item.three}</div></div></div>
          <div class="structure"><small>side-chain evidence</small>${item.structure}</div>
          <div class="evidence-box"><b>Start here:</b> ${item.functionalGroup}. Do not reveal the classification yet.</div>
          <label class="field amino-picker">Choose an amino acid<select id="explore-select">${aminoAcids.map((acid) => `<option value="${acid.name}" ${acid === item ? 'selected' : ''}>${acid.name} (${acid.three}, ${acid.one})</option>`).join('')}</select></label>
          ${significanceMarkup(item)}${structuralReasoningMarkup(item)}
        </article>
        <article class="card predict">
          <h3>Predict before revealing</h3>
          <p class="instruction">Make one decision in each row. Use the atoms and functional group as evidence.</p>
          ${predictionQuestions.map((prompt) => `<fieldset class="prediction-row"><legend>${prompt.question}</legend><div class="choices" data-prediction="${prompt.id}">${prompt.options.map((option) => `<button type="button" class="choice" data-option="${option}" aria-pressed="false">${option}</button>`).join('')}</div></fieldset>`).join('')}
          <button id="reveal" class="primary">Check my reasoning</button>
          <div id="explore-feedback" class="feedback-region" aria-live="polite"></div>
        </article>
      </div>
      <section class="card family-explorer"><h3>Explore a structural family</h3><label class="field">Family<select id="family-select">${structureLearning.families.map(([name])=>`<option>${name}</option>`).join('')}</select></label><div id="family-members"></div></section>
      <div class="nav-row"><button id="previous-aa" class="secondary">← Previous</button><button id="related-aa" class="secondary">Compare a related amino acid</button><button id="next-aa" class="primary">Next →</button></div>`;

    $$('.choices').forEach((group) => $$('button', group).forEach((button) => button.addEventListener('click', () => {
      $$('button', group).forEach((choice) => { choice.classList.toggle('selected', choice === button); choice.setAttribute('aria-pressed', String(choice === button)); });
      predictions[group.dataset.prediction] = button.dataset.option;
    })));
    $('#explore-select').addEventListener('change', (event) => { exploreIndex = aminoAcids.findIndex((acid) => acid.name === event.target.value); renderExplore(); });
    $('#previous-aa').addEventListener('click', () => { exploreIndex = (exploreIndex - 1 + aminoAcids.length) % aminoAcids.length; renderExplore(); });
    $('#next-aa').addEventListener('click', () => { exploreIndex = (exploreIndex + 1) % aminoAcids.length; renderExplore(); });
    $('#related-aa').addEventListener('click', () => {
      const pair = comparisonPairs.find((entry) => entry.includes(item.name)) || comparisonPairs[0];
      renderCompare(pair[0], pair[1]);
      activateMode($('#tab-compare'));
    });
    const renderFamily=()=>{const f=structureLearning.families.find(([name])=>name===$('#family-select').value);$('#family-members').innerHTML=`<div class="family-member-grid">${f[1].map(name=>{const x=findAminoAcid(name);return `<article><b>${x.name}</b><span>${x.structure}</span><small>${x.functionalGroup}; ${x.charge}</small></article>`}).join('')}</div><div class="guided-family"><b>Ask:</b> What structure is shared? What differs? How do polarity, charge, reactivity, and substitution consequences change?</div>`};$('#family-select').onchange=renderFamily;renderFamily();
    $('#reveal').addEventListener('click', () => revealExplore(item));
  }

  function revealExplore(item) {
    const expected = { class: classAnswer(item), hb: hBondAnswer(item), ion: ionizationAnswer(item), role: roleAnswer(item) };
    const answered = Object.keys(predictions).length;
    if (answered < predictionQuestions.length) {
      $('#explore-feedback').innerHTML = `<p class="incorrect">Make all ${predictionQuestions.length} predictions before revealing the chemistry.</p>`;
      return;
    }
    const correctCount = Object.keys(expected).filter((key) => predictions[key] === expected[key]).length;
    clearAnswerStates($('#explore-app'));
    Object.entries(expected).forEach(([key, answer]) => {
      const group = $(`[data-prediction="${key}"]`, $('#explore-app'));
      const selected = $('.choice.selected', group);
      markAnswer(selected, predictions[key] === answer ? 'correct' : 'incorrect', predictions[key] === answer ? 'Correct' : 'Not quite');
    });
    record(correctCount === predictionQuestions.length, 'structure-to-property reasoning');
    $('#explore-feedback').innerHTML = `<div class="feedback" tabindex="-1">
      <h4>${correctCount}/${predictionQuestions.length} predictions supported</h4>
      <ol class="reasoning-chain">
        <li><b>Observe:</b> ${item.structure} contains ${item.functionalGroup}.</li>
        <li><b>Infer:</b> ${item.polarity}; typical charge near pH 7 is ${item.charge}. Side-chain pKa: ${item.pKa}.</li>
        <li><b>Predict:</b> H bonding: ${hBondDescription(item)}. ${item.catalytic}.</li>
        <li><b>Transfer:</b> It ${relationText(item)}.</li>
      </ol>
    </div>`;
    $('.feedback', $('#explore-feedback')).focus();
  }
  $('#significance').addEventListener('change', () => {
    const panel = $('#significance-panel');
    if (panel) panel.hidden = !$('#significance').checked;
  });
  $('#structural-reasoning').addEventListener('change',()=>{const panel=$('#structural-reasoning-panel');if(panel)panel.hidden=!$('#structural-reasoning').checked});

  const sortSchemas = {
    textbook:{label:'A · Textbook classification',categories:['nonpolar aliphatic','aromatic','polar uncharged','positively charged','negatively charged']},
    water:{label:'B · Behavior in water',categories:['strongly hydrophobic','mixed or context dependent','hydrophilic but uncharged','hydrophilic and charged']},
    capabilities:{label:'C · Chemical capabilities',categories:['can form hydrogen bonds','can carry positive charge','can carry negative charge','has an ionizable side chain','can participate in acid-base catalysis','contains an aromatic ring','contains sulfur','can form a covalent cross-link','may be phosphorylated','contributes to UV absorbance near 280 nm','especially flexible','conformationally restrictive']},
    structure:{label:'D · Protein structure roles',categories:['likely to appear in a hydrophobic protein core','likely to appear on a water-exposed surface','likely to form ionic interactions','likely to contribute hydrogen bonds','likely to alter backbone flexibility','likely to stabilize extracellular proteins through disulfide bonds','likely to occur in membrane-spanning regions']},
    mechanisms:{label:'E · Enzyme and mechanism roles',categories:['possible proton donor or acceptor','possible nucleophile','possible electrostatic stabilizer','possible metal-ion ligand','possible substrate-recognition residue','primarily structural rather than chemically reactive']},
    structuralFeatures:{label:'F · Structural features',categories:['branched side chain','aromatic ring','hydroxyl group','sulfur-containing','amide-containing','additional carboxylate','additional basic nitrogen','cyclic side chain','smallest side chain','achiral']},
    relatives:{label:'G · Chemical relatives',categories:['acidic residue and corresponding amide','hydrophobic residue and hydroxyl-containing relative','sulfur analogs','aromatic family','branched-chain family','small or conformationally unusual residues']},
    structureBehavior:{label:'H · Structure to behavior',categories:['hydrophobic','hydrophilic or context dependent','charged near pH 7','usually uncharged near pH 7','hydrogen-bond capable','likely ionizable','aromatic','aliphatic or nonaromatic','structurally flexible','structurally restrictive','potentially catalytic','primarily structural']}
  };
  let sortChallenge = 'textbook';
  let sortFormat = 'guided';
  let sortDisplay = 'name-structure';
  let sortHideNames = false;
  let sortShowGroups = false;
  let sortSubset = [];
  let sortAssignments = {};
  let activeSortName = '';
  let sortAttempts = {};
  let unresolvedOnly = false;

  function resetSortWorkspace(newSubset = true) {
    if (newSubset || !sortSubset.length) sortSubset = sortFormat === 'all' ? [...aminoAcids] : shuffled(aminoAcids).slice(0, 6);
    sortAssignments = Object.fromEntries(sortSubset.map((item) => [item.name, []]));
    sortAttempts = Object.fromEntries(sortSubset.map((item) => [item.name, 0]));
    activeSortName = sortSubset[0]?.name || '';
    unresolvedOnly = false;
    renderSort();
  }
  function sortCardLabel(item) {
    const hideNames = sortHideNames;
    const name = hideNames ? '' : `<b>${item.name}</b>`;
    const code3 = `<b>${item.three}</b>`;
    const code1 = `<b>${item.one}</b>`;
    const structure = `<span class="mini-structure">${item.structure}</span>`;
    if (sortDisplay === 'name') return name || structure;
    if (sortDisplay === 'structure') return structure;
    if (sortDisplay === 'three') return code3;
    if (sortDisplay === 'one') return code1;
    if (sortDisplay === 'code-structure') return `${code3} ${structure}`;
    return `${name} ${structure}`;
  }
  function classificationFor(item) { return item.acceptedClassifications[sortChallenge] || []; }
  function isResolved(item) {
    const selected = sortAssignments[item.name] || [];
    const accepted = classificationFor(item);
    return selected.length === accepted.length && selected.every((category) => accepted.includes(category));
  }
  function renderSort() {
    if (!sortSubset.length) { sortSubset = shuffled(aminoAcids).slice(0, 6); activeSortName = sortSubset[0].name; sortAssignments = Object.fromEntries(sortSubset.map((item) => [item.name, []])); sortAttempts = Object.fromEntries(sortSubset.map((item) => [item.name, 0])); }
    const schema = sortSchemas[sortChallenge];
    const active = findAminoAcid(activeSortName) || sortSubset[0];
    const visibleItems = unresolvedOnly ? sortSubset.filter((item) => !isResolved(item)) : sortSubset;
    $('#sort-app').innerHTML = `<div class="card sort-controls">
      <label class="field">Choose a sorting challenge<select id="sort-challenge">${Object.entries(sortSchemas).map(([key,value]) => `<option value="${key}" ${key === sortChallenge ? 'selected' : ''}>${value.label}</option>`).join('')}</select></label>
      <fieldset><legend>Format</legend><label><input type="radio" name="sort-format" value="guided" ${sortFormat === 'guided' ? 'checked' : ''}> Guided round (6)</label><label><input type="radio" name="sort-format" value="all" ${sortFormat === 'all' ? 'checked' : ''}> Organize all 20</label></fieldset>
      <label class="field">Card view<select id="sort-display"><option value="name" ${sortDisplay === 'name' ? 'selected' : ''}>Full name</option><option value="structure" ${sortDisplay === 'structure' ? 'selected' : ''}>Structure</option><option value="three" ${sortDisplay === 'three' ? 'selected' : ''}>Three-letter code</option><option value="one" ${sortDisplay === 'one' ? 'selected' : ''}>One-letter code</option><option value="name-structure" ${sortDisplay === 'name-structure' ? 'selected' : ''}>Name plus structure</option><option value="code-structure" ${sortDisplay === 'code-structure' ? 'selected' : ''}>Code plus structure</option></select></label>
      <label class="toggle compact-toggle"><input id="sort-hide-names" type="checkbox" ${sortHideNames ? 'checked' : ''}> Hide names</label><label class="toggle compact-toggle"><input id="sort-show-groups" type="checkbox" ${sortShowGroups ? 'checked' : ''}> Show functional groups</label>
    </div>
    <div class="sort-toolbar"><button id="sort-start-over" class="secondary">Start over</button><button id="sort-check" class="primary">Check work</button><button id="sort-hint" class="secondary">Reveal one hint</button><button id="sort-unresolved" class="secondary" aria-pressed="${unresolvedOnly}">${unresolvedOnly ? 'Show all amino acids' : 'Show unresolved amino acids'}</button><label class="field clear-field">Clear one category<select id="clear-category"><option value="">Choose category</option>${schema.categories.map((category) => `<option>${category}</option>`).join('')}</select></label></div>
    <div class="sort-workspace ${sortFormat === 'all' ? 'all-twenty' : ''}">
      <section aria-labelledby="sort-cards-title"><h3 id="sort-cards-title">${sortFormat === 'all' ? 'All 20 amino acids' : 'Guided set'}</h3><p class="instruction">Select an amino acid, then apply every defensible category. These are tendencies, not absolute rules.</p><div class="amino-grid">${visibleItems.map((item) => `<button class="amino-sort-card ${item.name === active.name ? 'active' : ''}" data-amino="${item.name}" aria-pressed="${item.name === active.name}">${sortCardLabel(item)}${sortShowGroups ? `<small>${item.functionalGroup}</small>` : ''}</button>`).join('') || '<p>All amino acids in this workspace are resolved.</p>'}</div></section>
      <section class="card category-panel" aria-labelledby="category-panel-title"><p class="kicker">${schema.label}</p><h3 id="category-panel-title">Classify ${active.name}</h3><div class="active-structure"><span>${active.structure}</span><small>${active.functionalGroup}</small></div><div class="category-tags">${schema.categories.map((category) => `<button class="category-tag" data-category="${category}" aria-pressed="${sortAssignments[active.name]?.includes(category) || false}">${category}</button>`).join('')}</div><div id="sort-status" class="status" tabindex="-1" aria-live="polite">Select all categories that apply, then check your work.</div><button id="sort-explain" class="text-button" ${sortAttempts[active.name] >= 2 ? '' : 'hidden'}>Explain this amino acid</button></section>
    </div>`;

    $('#sort-challenge').addEventListener('change', (event) => { sortChallenge = event.target.value; if(sortChallenge==='structureBehavior')sortHideNames=true; resetSortWorkspace(false); });
    $$('input[name="sort-format"]').forEach((radio) => radio.addEventListener('change', (event) => { sortFormat = event.target.value; resetSortWorkspace(true); }));
    $('#sort-display').addEventListener('change', (event) => { sortDisplay = event.target.value; renderSort(); });
    $('#sort-hide-names').addEventListener('change', (event) => { sortHideNames = event.target.checked; renderSort(); });
    $('#sort-show-groups').addEventListener('change', (event) => { sortShowGroups = event.target.checked; renderSort(); });
    $$('.amino-sort-card').forEach((button) => button.addEventListener('click', () => { activeSortName = button.dataset.amino; renderSort(); }));
    $$('.category-tag').forEach((button) => button.addEventListener('click', () => {
      const chosen = sortAssignments[active.name] || [];
      sortAssignments[active.name] = chosen.includes(button.dataset.category) ? chosen.filter((category) => category !== button.dataset.category) : [...chosen, button.dataset.category];
      button.setAttribute('aria-pressed', String(sortAssignments[active.name].includes(button.dataset.category)));
      button.classList.toggle('selected', sortAssignments[active.name].includes(button.dataset.category));
      clearAnswerStates($('.category-panel'));
      $('#sort-status').textContent = 'Selection updated. Check your work when ready.';
    }));
    $('#sort-start-over').addEventListener('click', () => resetSortWorkspace(false));
    $('#sort-check').addEventListener('click', checkSortWork);
    $('#sort-hint').addEventListener('click', () => { $('#sort-status').innerHTML = `<b>Hint:</b> ${active.hints[0]}`; });
    $('#sort-unresolved').addEventListener('click', () => { unresolvedOnly = !unresolvedOnly; renderSort(); });
    $('#clear-category').addEventListener('change', (event) => { if (!event.target.value) return; Object.keys(sortAssignments).forEach((name) => { sortAssignments[name] = sortAssignments[name].filter((category) => category !== event.target.value); }); renderSort(); });
    $('#sort-explain').addEventListener('click', () => { $('#sort-status').innerHTML = `<b>${active.name}:</b> ${active.nuance} ${active.explanation}`; });
  }
  function checkSortWork() {
    let resolved = 0;
    sortSubset.forEach((item) => { sortAttempts[item.name] += 1; if (isResolved(item)) resolved += 1; });
    const active = findAminoAcid(activeSortName);
    const accepted = classificationFor(active);
    const selected = sortAssignments[active.name] || [];
    $$('.category-tag').forEach((button) => {
      const isSelected = selected.includes(button.dataset.category);
      const isAccepted = accepted.includes(button.dataset.category);
      if (isSelected) markAnswer(button, isAccepted ? 'correct' : 'incorrect', isAccepted ? 'Correct' : 'Not quite');
      else if (isAccepted) markAnswer(button, 'missed', 'Required');
    });
    $$('.amino-sort-card').forEach((button) => {
      const item = findAminoAcid(button.dataset.amino);
      if (isResolved(item)) markAnswer(button, 'correct', 'Correct');
      else if ((sortAssignments[item.name] || []).length) markAnswer(button, 'incorrect', 'Revise');
      else markAnswer(button, 'missed', 'Incomplete');
    });
    const activeCorrect = isResolved(active);
    record(activeCorrect, `sorting: ${sortSchemas[sortChallenge].label}`);
    $('#sort-status').innerHTML = activeCorrect ? `<b>✓ Correct.</b> ${active.hints[0]} ${active.nuance}` : `<b>✕ Not quite.</b> ${active.hints[0]} Revise only this amino acid; unrelated answers remain hidden.`;
    $('#sort-status').focus();
    if (sortAttempts[active.name] >= 2) $('#sort-explain').hidden = false;
  }
  $('#new-sort').addEventListener('click', () => { sortRound += 1; resetSortWorkspace(true); });
  $('#reset-sort').addEventListener('click', () => resetSortWorkspace(false));

  const comparisonPairs = [
    ['Glycine','Alanine'],['Glycine','Proline'],['Alanine','Serine'],['Valine','Threonine'],['Leucine','Isoleucine'],['Methionine','Cysteine'],
    ['Phenylalanine','Tyrosine'],['Phenylalanine','Tryptophan'],['Serine','Cysteine'],['Aspartate','Asparagine'],['Glutamate','Glutamine'],
    ['Lysine','Arginine'],['Lysine','Histidine'],['Aspartate','Glutamate'],['Asparagine','Glutamine'],['Tryptophan','Tyrosine']
  ];
  const comparisonPrompts={'Aspartate|Asparagine':'What follows when a carboxylate is replaced by a carboxamide?','Phenylalanine|Tyrosine':'What new chemistry follows from adding one hydroxyl?','Glycine|Proline':'How would these residues differently affect a flexible loop?','Methionine|Cysteine':'How does thioether sulfur differ from thiol sulfur?','Valine|Threonine':'What changes when a hydroxyl is added to a β-branched side chain?'};
  function comparisonAnswer(first, second, question) {
    if (question === 'water') {
      const score = (item) => {
        if (item.charge.includes('+') || item.charge.includes('−')) return 4;
        if (item.name === 'Histidine') return 3;
        if (item.polarity === 'polar' || item.polarity === 'polar aromatic') return 2;
        if (/weakly polar|amphipathic/.test(item.polarity)) return 1;
        return 0;
      };
      return score(first) === score(second) ? 'Similar' : score(first) > score(second) ? first.name : second.name;
    }
    if (question === 'charge') {
      const chargeClass = (item) => item.charge.includes('+') ? 'positive' : item.charge.includes('−') ? 'negative' : 'neutral';
      return chargeClass(first) === chargeClass(second) ? 'Similar' : 'Different';
    }
    const geometryClass = (item) => {
      if (item.name === 'Glycine') return 'exceptionally flexible';
      if (item.name === 'Proline') return 'backbone restricted';
      if (/β-branched|rigid ring|moderately rigid ring|rigid bulky ring/.test(item.flexibility)) return 'side-chain restricted';
      return 'ordinary flexibility';
    };
    return geometryClass(first) === geometryClass(second) ? 'Similar' : 'Different';
  }
  function renderCompare(firstName = 'Serine', secondName = 'Cysteine') {
    const first = findAminoAcid(firstName);
    const second = findAminoAcid(secondName);
    encounter(first.name); encounter(second.name);
    const compactCard = (item) => `<article class="card compare-card"><h3>${item.name} <small>${item.three} · ${item.one}</small></h3><div class="structure"><small>side chain</small>${item.structure}</div><dl class="compact-properties"><div><dt>Functional group</dt><dd>${item.functionalGroup}</dd></div><div><dt>Charge near pH 7</dt><dd>${item.charge}</dd></div><div><dt>H bonding</dt><dd>${hBondDescription(item)}</dd></div><div><dt>pKa</dt><dd>${item.pKa}</dd></div><div><dt>Geometry</dt><dd>${item.size}; ${item.flexibility}</dd></div></dl></article>`;
    $('#compare-app').innerHTML = `
      <h3 class="subheading">High-value related pairs</h3>
      <div class="preset-row">${comparisonPairs.map((pair) => `<button class="preset" data-first="${pair[0]}" data-second="${pair[1]}">${pair[0]} ↔ ${pair[1]}</button>`).join('')}</div>
      <div class="compare-controls"><label class="field">First amino acid<select id="compare-first">${aminoAcids.map((item) => `<option ${item === first ? 'selected' : ''}>${item.name}</option>`).join('')}</select></label><span aria-hidden="true">↔</span><label class="field">Second amino acid<select id="compare-second">${aminoAcids.map((item) => `<option ${item === second ? 'selected' : ''}>${item.name}</option>`).join('')}</select></label></div>
      <div class="compare-grid">${compactCard(first)}${compactCard(second)}</div>
      <article class="card prompt-box"><h3>Make the substitution prediction</h3><p class="comparison-application"><b>Structure question:</b> ${comparisonPrompts[`${first.name}|${second.name}`]||comparisonPrompts[`${second.name}|${first.name}`]||`Which visible structural difference most changes the chemistry of ${first.name} and ${second.name}?`}</p>
        <fieldset class="comparison-question"><legend>Which side chain is more likely to interact strongly with water?</legend>${[first.name, second.name, 'Similar'].map((choice) => `<label><input type="radio" name="compare-water" value="${choice}"> ${choice}</label>`).join('')}</fieldset>
        <fieldset class="comparison-question"><legend>Does the substitution change charge near pH 7?</legend><label><input type="radio" name="compare-charge" value="Different"> Yes</label><label><input type="radio" name="compare-charge" value="Similar"> No</label></fieldset>
        <fieldset class="comparison-question"><legend>Does it substantially change conformational tendency?</legend><label><input type="radio" name="compare-shape" value="Different"> Yes</label><label><input type="radio" name="compare-shape" value="Similar"> No</label></fieldset>
        <button id="check-comparison" class="primary">Check comparison</button><div id="compare-feedback" class="feedback-region" aria-live="polite"></div>
      </article>`;
    $('#compare-first').addEventListener('change', (event) => renderCompare(event.target.value, $('#compare-second').value));
    $('#compare-second').addEventListener('change', (event) => renderCompare($('#compare-first').value, event.target.value));
    $$('.preset').forEach((button) => button.addEventListener('click', () => renderCompare(button.dataset.first, button.dataset.second)));
    $('#check-comparison').addEventListener('click', () => {
      const water = $('input[name="compare-water"]:checked');
      const charge = $('input[name="compare-charge"]:checked');
      const shape = $('input[name="compare-shape"]:checked');
      if (!water || !charge || !shape) { $('#compare-feedback').innerHTML = '<p class="incorrect">Make all three predictions first.</p>'; return; }
      const answers = { water: comparisonAnswer(first, second, 'water'), charge: comparisonAnswer(first, second, 'charge'), shape: comparisonAnswer(first, second, 'shape') };
      const score = Number(water.value === answers.water) + Number(charge.value === answers.charge) + Number(shape.value === answers.shape);
      clearAnswerStates($('.prompt-box'));
      [[water, water.value === answers.water], [charge, charge.value === answers.charge], [shape, shape.value === answers.shape]].forEach(([input, correct]) => markAnswer(input.closest('label'), correct ? 'correct' : 'incorrect', correct ? 'Correct' : 'Not quite'));
      record(score === 3, 'related amino-acid substitutions');
      $('#compare-feedback').innerHTML = `<div class="feedback" tabindex="-1"><h4>${score}/3 predictions supported</h4><ul class="reasoning-chain"><li><b>Water:</b> ${first.name} is ${first.polarity}; ${second.name} is ${second.polarity}.</li><li><b>Charge:</b> ${first.charge} versus ${second.charge}. ${answers.charge === 'Different' ? 'Electrophoretic behavior and salt bridges may change.' : 'Net charge is broadly preserved.'}</li><li><b>Shape:</b> ${first.flexibility} versus ${second.flexibility}.</li><li><b>Judgment:</b> This is ${answers.charge === 'Similar' && answers.shape === 'Similar' ? 'more conservative' : 'potentially nonconservative'}; always consider the local protein environment.</li></ul></div>`;
      $('.feedback', $('#compare-feedback')).focus();
    });
  }

  const scenarios = [
    ['Protein folding', 'A buried leucine is replaced by aspartate. What is most likely?', ['Core packing is destabilized by a buried charge', 'The core becomes more hydrophobic', 'A disulfide forms'], 0, ['Leucine supplies a nonpolar hydrocarbon surface.', 'Aspartate is usually −1 near pH 7.', 'Burying charge is unfavorable unless compensated by partners or protonation.'], 'hydrophobic packing'],
    ['Acid–base catalysis', 'An enzyme needs a side chain that can donate and accept protons near pH 7. Best candidate?', ['Histidine', 'Valine', 'Phenylalanine'], 0, ['Histidine has an imidazole side chain.', 'Its pKa is near physiological pH and can shift in an active site.', 'Both protonated and neutral forms are accessible, enabling proton transfer.'], 'proton transfer'],
    ['Spectroscopy', 'Which residues usually dominate protein absorbance near 280 nm?', ['Tryptophan and tyrosine', 'Phenylalanine and alanine', 'Aspartate and glutamate'], 0, ['Conjugated aromatic rings absorb ultraviolet light.', 'Tryptophan contributes most strongly; tyrosine also contributes substantially.', 'Phenylalanine absorbs much more weakly near 280 nm.'], 'ultraviolet absorbance'],
    ['Covalent chemistry', 'Two cysteines approach in an oxidizing environment. What may form?', ['A disulfide bond', 'A peptide bond', 'A phosphate bridge'], 0, ['Cysteine contains a thiol.', 'Oxidation removes electrons from two thiols.', 'The resulting disulfide is a covalent cross-link.'], 'covalent chemistry'],
    ['Protein structure', 'Glycine in a flexible loop is replaced by proline. Likely consequence?', ['Backbone motion becomes restricted', 'Flexibility increases', 'Aromatic stacking increases'], 0, ['Glycine has minimal steric bulk and broad backbone flexibility.', 'Proline closes a ring onto the backbone nitrogen.', 'The substitution narrows allowed backbone geometry and may introduce a kink.'], 'protein shape'],
    ['pH dependence', 'An aspartate side chain moves into a low-pH solution. What happens?', ['It becomes more protonated and less negative', 'It becomes more negative', 'It gains aromaticity'], 0, ['Low pH means high proton activity.', 'The carboxylate equilibrium shifts toward COOH.', 'Its average negative charge decreases.'], 'acid-base chemistry'],
    ['Molecular recognition', 'A lysine-rich surface binds DNA. Which interaction is most likely?', ['Electrostatic attraction to phosphate', 'Hydrophobic burial by phosphate', 'Disulfide exchange'], 0, ['Lysine is usually positively charged near pH 7.', 'DNA phosphates are negatively charged.', 'Opposite charges favor electrostatic attraction and salt-bridge-like contacts.'], 'molecular recognition'],
    ['Metabolism', 'Glutamate is converted to α-ketoglutarate by oxidative deamination. What is transferred or removed?', ['Its amino nitrogen', 'Its aromatic ring', 'A sulfur atom'], 0, ['Glutamate carries an α-amino group and a carboxylate side chain.', 'Oxidative deamination removes amino nitrogen as ammonium.', 'The carbon skeleton enters central metabolism as α-ketoglutarate.'], 'metabolism'],
    ['Membranes', 'Why are leucine, isoleucine, and valine common in transmembrane regions?', ['Their hydrocarbon side chains contact lipid tails favorably', 'They form many ionic bonds', 'They absorb strongly at 280 nm'], 0, ['All three have nonpolar, branched hydrocarbon side chains.', 'The membrane interior is also nonpolar.', 'Hydrophobic side chains avoid the energetic cost of exposing charge to lipid tails.'], 'membrane proteins'],
    ['Enzyme mechanisms', 'A side chain must stabilize a positively charged intermediate. Which can help?', ['A carboxylate such as Asp or Glu', 'A hydrocarbon such as Val', 'A neutral methyl group'], 0, ['Aspartate and glutamate are usually negatively charged.', 'Opposite charge stabilizes a cationic intermediate.', 'Geometry and dielectric environment determine the actual strength.'], 'catalysis'],
    ['Metal binding', 'Which side-chain atoms commonly coordinate a metal ion?', ['Histidine N, cysteine S, or carboxylate O', 'Only hydrocarbon C–H bonds', 'Only phenylalanine carbons'], 0, ['Metal ligands donate electron density through lone pairs.', 'Imidazole N, thiolate S, and carboxylate O can provide those lone pairs.', 'Binding depends on metal preference and active-site geometry.'], 'metal coordination'],
    ['Molecular recognition', 'Surface phenylalanine is replaced by tyrosine. How does water interaction change?', ['It usually increases because tyrosine adds a phenolic OH', 'It decreases because tyrosine is positive', 'It is identical'], 0, ['Both side chains contain an aromatic ring.', 'Tyrosine adds a phenolic hydroxyl that donates and accepts H bonds.', 'The substitution preserves aromaticity but increases polar recognition.'], 'polarity'],
    ['Regulation', 'Lysine is acetylated on its side-chain amino group. Likely effect?', ['Its positive charge is neutralized', 'Its charge doubles', 'A disulfide forms'], 0, ['Unmodified lysine is usually ammonium (+1) near pH 7.', 'Acetylation forms an amide.', 'The amide is neutral, changing salt bridges and recognition.'], 'post-translational modification'],
    ['Ion-exchange chromatography', 'At pH 7, which protein surface patch is most likely to bind a cation-exchange resin?', ['A patch rich in Asp and Glu', 'A patch rich in Lys and Arg', 'A patch rich in Leu and Val'], 1, ['A cation exchanger carries fixed negative groups.', 'Lysine and arginine are usually positively charged near pH 7.', 'A Lys/Arg-rich patch can bind through electrostatic attraction; elution can be promoted with salt or pH change.'], 'chromatography'],
    ['Electrophoresis', 'A protein is placed in buffer above its isoelectric point. Which direction is expected?', ['Toward the positive electrode (anode)', 'Toward the negative electrode (cathode)', 'No migration under any conditions'], 0, ['Above its pI, the protein has a net negative charge.', 'Negative species move toward the positive electrode.', 'Magnitude also depends on size, shape, and gel conditions.'], 'electrophoresis'],
    ['Reversed-phase chromatography', 'Which peptide is generally retained longer on a nonpolar stationary phase?', ['A peptide enriched in Leu, Ile, and Phe', 'A peptide enriched in Asp and Lys', 'A peptide enriched in Asn and Gln'], 0, ['Reversed-phase media are nonpolar.', 'Leu, Ile, and Phe add hydrophobic surface.', 'Greater hydrophobic contact generally increases retention.'], 'chromatography'],
    ['Acid–base catalysis', 'Why can cysteine be more nucleophilic than serine in an active site?', ['Thiolate is polarizable and can form at accessible pH', 'Sulfur is always positively charged', 'Serine cannot hydrogen-bond'], 0, ['A catalytic base can deprotonate cysteine.', 'The resulting thiolate is polarizable and strongly nucleophilic.', 'Local pKa shifts—not sulfur alone—control reactivity.'], 'cysteine chemistry'],
    ['Spectroscopy', 'Which substitution most strongly lowers A₂₈₀, all else equal?', ['Trp to Ala', 'Leu to Ile', 'Asp to Asn'], 0, ['Tryptophan has the strongest side-chain absorbance near 280 nm.', 'Alanine has essentially none.', 'Removing Trp therefore has a much larger direct effect than the other substitutions.'], 'tryptophan spectroscopy']
  ].concat(structureLearning.applicationScenarios);
  function startApplicationSet() { applicationSet = shuffled(scenarios).slice(0, 5); applicationIndex = 0; renderApplication(); }
  function renderApplication() {
    const scenario = applicationSet[applicationIndex];
    const correctIndex = scenario.length > 6 ? scenario[6] : scenario[3];
    $('#apply-app').innerHTML = `<article class="card scenario"><div class="progress-line"><span>${scenario[0]}</span><span>Question ${applicationIndex + 1} of 5</span></div><h3>${scenario[1]}</h3><div>${scenario[2].map((option, index) => `<label class="answer-option"><input type="radio" name="application-answer" value="${index}"><span>${option}</span></label>`).join('')}</div><button id="check-application" class="primary">Check my prediction</button><div id="application-feedback" class="feedback-region" aria-live="polite"></div></article>`;
    $('#check-application').addEventListener('click', () => {
      const selected = $('input[name="application-answer"]:checked');
      if (!selected) { $('#application-feedback').innerHTML = '<p class="incorrect">Choose a prediction first.</p>'; return; }
      const correct = Number(selected.value) === correctIndex;
      record(correct, scenario[5]);
      $$('input[name="application-answer"]').forEach((input) => input.disabled = true);
      clearAnswerStates($('.scenario'));
      markAnswer(selected.closest('label'), correct ? 'correct' : 'incorrect', correct ? 'Correct' : 'Not quite');
      $('#application-feedback').innerHTML = `<div class="feedback" tabindex="-1"><h4>${correct ? 'Prediction supported' : 'Revise the chemical model'}</h4><ol class="reasoning-chain"><li><b>Structure:</b> ${scenario[4][0]}</li><li><b>Property:</b> ${scenario[4][1]}</li><li><b>Consequence:</b> ${scenario[4][2]}</li></ol><button id="next-application" class="primary">${applicationIndex === 4 ? 'View review dashboard' : 'Next scenario'}</button></div>`;
      $('.feedback', $('#application-feedback')).focus();
      $('#next-application').addEventListener('click', () => { if (applicationIndex === 4) activateMode($('#tab-review')); else { applicationIndex += 1; renderApplication(); } });
    });
  }
  $('#new-apply').addEventListener('click', startApplicationSet);

  const capabilities = {
    'Hydrophobic packing': ['Ala', 'Val', 'Leu', 'Ile', 'Met', 'Phe', 'Trp'],
    'Hydrogen bonding': ['Ser', 'Thr', 'Cys*', 'Asn', 'Gln', 'Tyr', 'Trp', 'His', 'Lys†', 'Arg', 'Asp', 'Glu'],
    'Positive charge near pH 7': ['Lys', 'Arg', 'His*'],
    'Negative charge near pH 7': ['Asp', 'Glu'],
    'Proton transfer': ['His', 'Asp', 'Glu', 'Lys*', 'Cys*', 'Tyr*'],
    'Covalent chemistry': ['Cys', 'Ser*', 'Lys*'],
    'Aromatic recognition': ['Phe', 'Tyr', 'Trp', 'His'],
    'A₂₈₀ contribution': ['Trp (strong)', 'Tyr (substantial)', 'Phe (weak)'],
    'Conformational flexibility': ['Gly'],
    'Conformational restriction': ['Pro']
  };
  function renderReview() {
    const accuracy = progress.attempted ? Math.round(progress.correct / progress.attempted * 100) : 0;
    $('#review-app').innerHTML = `<div class="review-stats"><div class="card stat"><span>Decisions</span><strong>${progress.attempted}</strong></div><div class="card stat"><span>Supported</span><strong>${progress.correct}</strong></div><div class="card stat"><span>Accuracy</span><strong>${accuracy}%</strong></div><div class="card stat"><span>Encountered</span><strong>${progress.encountered.length}/20</strong></div></div>
      <h3>Chemical capability map</h3><p class="legend-note">* strongly environment-dependent or usually requires activation. † Protonated lysine donates but does not accept H bonds.</p>
      <div class="capability-grid">${Object.entries(capabilities).map(([name, values]) => `<article class="card capability"><h3>${name}</h3>${values.map((value) => `<span class="pill">${value}</span>`).join('')}</article>`).join('')}</div>
      <section class="special"><h3>High-value exceptions to rehearse</h3><div class="special-grid">${[
        ['Glycine', 'No side-chain carbon: achiral and unusually flexible.'], ['Proline', 'Ring closes onto backbone N: restricted φ angle and no backbone N–H donor.'],
        ['Cysteine', 'Thiol can become nucleophilic thiolate; oxidation can form disulfides.'], ['Histidine', 'Imidazole pKa is near biological pH and shifts with environment.'],
        ['Tyrosine', 'Aromatic yet polar; phenol can H-bond, ionize, and be phosphorylated.'], ['Tryptophan', 'Bulky amphipathic indole; strongest common contributor to A₂₈₀.']
      ].map(([name, text]) => `<article class="special-item"><b>${name}</b><br>${text}</article>`).join('')}</div></section>
      <section class="review-section"><h3>Structure map</h3><div class="capability-grid">${[['Branched',['Val','Leu','Ile','Thr']],['Aromatic',['Phe','Tyr','Trp','His']],['Sulfur',['Met','Cys']],['Hydroxyl',['Ser','Thr','Tyr']],['Amide',['Asn','Gln']],['Acidic / basic',['Asp','Glu','Lys','Arg','His']],['Flexible',['Gly']],['Restrictive',['Pro']]].map(([k,v])=>`<article class="card capability"><h3>${k}</h3>${v.map(x=>`<span class="pill">${x}</span>`).join('')}</article>`).join('')}</div></section>
      <section class="review-section"><h3>Structural relatives map</h3><div class="relative-map">${[['Ala','Ser','add hydroxyl'],['Val','Thr','add hydroxyl'],['Phe','Tyr','add hydroxyl'],['Ser','Cys','replace hydroxyl with thiol'],['Asp','Asn','replace carboxylate with amide'],['Glu','Gln','replace carboxylate with amide'],['Asp','Glu','add one methylene']].map(([a,b,d])=>`<div><b>${a}</b><span>→ ${d} →</span><b>${b}</b></div>`).join('')}</div></section>
      <section class="card chirality-review"><h3>Chirality review</h3><ul><li>Most standard amino acids have a chiral Cα.</li><li>Glycine is achiral because Cα bears two hydrogens.</li><li>Ribosomal proteins use L-amino acids.</li><li>Enantiomers are nonsuperimposable mirror images.</li></ul><button id="chirality-practice" class="secondary">Practice one chirality prediction</button><div id="chirality-review-area" aria-live="polite"></div></section>
      <section class="review-section beyond"><h3>Beyond the Standard 20</h3><p>Modification and specialized metabolism expand chemical function. These are not members of the main set of 20.</p><div class="special-grid">${structureLearning.modified.map(([name,type,text])=>`<article class="special-item"><b>${name}</b><small>${type}</small><p>${text}</p></article>`).join('')}</div></section>
      <section class="card abbrev"><h3>One quick retrieval decision</h3><button id="abbreviation-practice" class="secondary">Practice an abbreviation</button><div id="abbreviation-area" aria-live="polite"></div></section>`;
    $('#abbreviation-practice').addEventListener('click', practiceAbbreviation);
    $('#chirality-practice').addEventListener('click',()=>{const a=aminoAcids[Math.floor(Math.random()*aminoAcids.length)];$('#chirality-review-area').innerHTML=`<p>Is <b>${a.name}</b> chiral at Cα?</p><button class="choice review-chiral" data-answer="true">Chiral</button><button class="choice review-chiral" data-answer="false">Achiral</button>`;$$('.review-chiral').forEach(b=>b.addEventListener('click',()=>{const ok=b.dataset.answer===String(a.isChiral);clearAnswerStates($('#chirality-review-area'));markAnswer(b,ok?'correct':'incorrect',ok?'Correct':'Not quite');$('#chirality-review-area').insertAdjacentHTML('beforeend',`<p>${a.chiralityReason}</p>`);record(ok,'chirality')}))});
  }
  function practiceAbbreviation() {
    const item = aminoAcids[Math.floor(Math.random() * aminoAcids.length)];
    $('#abbreviation-area').innerHTML = `<p>Enter both codes for <b>${item.name}</b>.</p><div class="inline-fields"><label class="field">Three-letter<input id="three-letter" autocomplete="off"></label><label class="field">One-letter<input id="one-letter" maxlength="1" autocomplete="off"></label></div><button id="check-abbreviation" class="primary">Check</button>`;
    $('#check-abbreviation').addEventListener('click', () => {
      const correct = $('#three-letter').value.trim().toLowerCase() === item.three.toLowerCase() && $('#one-letter').value.trim().toUpperCase() === item.one;
      record(correct, 'abbreviations');
      markAnswer($('.inline-fields', $('#abbreviation-area')), correct ? 'correct' : 'incorrect', correct ? 'Correct' : 'Not quite');
      $('#abbreviation-area').insertAdjacentHTML('beforeend', `<p class="${correct ? 'correct' : 'incorrect'}">${correct ? 'Correct.' : `Answer: ${item.three}, ${item.one}.`} Now return to structure and chemistry.</p>`);
    });
  }
  $('#missed').addEventListener('click', () => {
    const concepts = progress.missed.length ? progress.missed : ['No missed concepts recorded yet.'];
    $('#review-app').insertAdjacentHTML('afterbegin', `<div class="feedback" role="status"><h3>Concepts to revisit</h3><p>${concepts.join(' · ')}</p></div>`);
  });
  $('#reset-progress').addEventListener('click', () => {
    if (confirm('Reset all progress stored on this device?')) { progress = emptyProgress(); saveProgress(); renderReview(); }
  });
  $('#new-session').addEventListener('click', () => { exploreIndex = 0; sortRound = 0; startApplicationSet(); renderExplore(); activateMode($('#tab-explore')); });

  renderExplore();
  renderStructure();
  renderSort();
  renderCompare();
  startApplicationSet();
  renderReview();
}());
