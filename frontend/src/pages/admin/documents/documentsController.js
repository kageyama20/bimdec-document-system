/*
 * BIMDEC document generator — ported from the inline <script> in the old
 * admin/documents.html (lines 1212-2055).
 *
 * This is deliberately still imperative. The generator drives ~180 ids
 * directly, autosaves by walking '.editor input[id]' and writing el.value,
 * and paginates by measuring live element heights against an A4 page — all
 * of which React state would fight rather than help. The markup in
 * DocumentMarkup.jsx renders exactly once and is never re-rendered, so this
 * module owns the DOM inside it, exactly as the original page did.
 * Converting these ~840 lines to React state is a separate piece of work.
 *
 * Mechanical changes from the original, and nothing else:
 *   - wrapped in initGenerator(root, {...}), so what used to be page globals
 *     are now closure state scoped to one mount;
 *   - document.getElementById(x)   -> byId(x)              (scoped to root)
 *   - document.querySelectorAll(x) -> root.querySelectorAll(x)
 *   - document/window listeners registered through onDoc/onWin so teardown
 *     can remove them;
 *   - inline onclick="..." attributes became data-onclick="..." (React drops
 *     string handlers) and are dispatched by the delegation block at the
 *     bottom of this file;
 *   - html2pdf is a dynamic import instead of a CDN global, and the preview
 *     zoom is now restored in a finally block;
 *   - the page's own auth guard is gone — <ProtectedRoute role="admin"> and
 *     the session context handle it.
 */
import DB from '../../../lib/db';
import EmailClient from '../../../lib/emailClient';

export function initGenerator(root, { who = '', onLogout = () => {} } = {}) {
  const byId = (id) => root.querySelector('#' + CSS.escape(String(id)));

  const teardown = [];
  const onDoc = (type, fn, opts) => {
    document.addEventListener(type, fn, opts);
    teardown.push(() => document.removeEventListener(type, fn, opts));
  };
  const onWin = (type, fn, opts) => {
    window.addEventListener(type, fn, opts);
    teardown.push(() => window.removeEventListener(type, fn, opts));
  };

  // Was an inline script in the old page's app bar.
  async function portalLogout(){ await DB.logout(); onLogout(); }
  const portalWho = byId('portalWho');
  if(portalWho) portalWho.textContent = who;

  /* ---------------- data model ---------------- */
  let itemState = {
    proposal: [
      {desc:'', qty:1, unit:'LOT', price:0},
    ],
    invoice: [
      {desc:'', qty:1, unit:'LOT', price:0},
    ],
    ack: [
      {desc:'', amount:0},
    ]
  };
  // Snapshot of the defaults, taken before anything can mutate itemState, so a saved
  // draft written by an older version of this file (missing a key, e.g. "ack" before
  // the itemized Particulars feature existed) can never leave itemState.<kind> undefined.
  const ITEM_STATE_DEFAULTS = JSON.parse(JSON.stringify(itemState));

  const PHP = n => 'Php ' + (Number(n)||0).toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2});

  /* ---------------- digital signatures (PNG/JPG) ---------------- */
  const SIG_KEYS = ['p_prepby', 'i_prepby', 'i_appby', 'a_recvby', 'a_appby'];
  let sigState = { p_prepby:null, i_prepby:null, i_appby:null, a_recvby:null, a_appby:null };
  const SIG_MAX_BYTES = 2 * 1024 * 1024; // 2MB

  function handleSigUpload(key, inputEl){
    const file = inputEl.files && inputEl.files[0];
    if(!file) return;
    if(!/^image\/(png|jpe?g)$/i.test(file.type)){
      alert('Please choose a PNG or JPG image.');
      inputEl.value = '';
      return;
    }
    if(file.size > SIG_MAX_BYTES){
      alert('Image is too large — please use a file under 2MB.');
      inputEl.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      sigState[key] = reader.result;
      renderSigThumb(key);
      renderPreview();
      scheduleSave();
    };
    reader.readAsDataURL(file);
    inputEl.value = '';
  }

  function removeSig(key){
    sigState[key] = null;
    renderSigThumb(key);
    renderPreview();
    scheduleSave();
  }

  function renderSigThumb(key){
    const wrap = byId(key + '_sigpreview');
    if(!wrap) return;
    if(sigState[key]){
      wrap.innerHTML = `<img class="sig-thumb" src="${sigState[key]}" alt="Signature preview">
        <button type="button" class="sig-remove-btn" data-onclick="removeSig('${key}')">Remove</button>`;
    } else {
      wrap.innerHTML = '';
    }
  }

  function renderAllSigThumbs(){
    SIG_KEYS.forEach(renderSigThumb);
  }

  function applySigToPreview(key, imgId){
    const img = byId(imgId);
    if(!img) return;
    if(sigState[key]){
      img.src = sigState[key];
      img.classList.remove('hidden');
    } else {
      img.removeAttribute('src');
      img.classList.add('hidden');
    }
  }

  /* ---------------- lock toggles (Issuer letterhead / Payment channel) ---------------- */
  const LOCK_GROUPS = {
    letterhead: { fieldClass:'lk-letterhead', btnIds:['lockbtn-letterhead-proposal','lockbtn-letterhead-invoice','lockbtn-letterhead-ack'] },
    paych:      { fieldClass:'lk-paych',      btnIds:['lockbtn-paych-proposal','lockbtn-paych-invoice'] }
  };
  let lockState = { letterhead:false, paych:false };

  function applyLockDisplay(group){
    const g = LOCK_GROUPS[group];
    const locked = lockState[group];
    root.querySelectorAll('.'+g.fieldClass).forEach(field=>{
      field.classList.toggle('locked', locked);
      field.querySelectorAll('input, select, textarea').forEach(el=>{ el.disabled = locked; });
    });
    g.btnIds.forEach(id=>{
      const btn = byId(id);
      if(!btn) return;
      btn.classList.toggle('locked', locked);
      btn.querySelector('span').textContent = locked ? 'Locked' : 'Editable';
    });
  }
  function toggleLock(group){
    lockState[group] = !lockState[group];
    applyLockDisplay(group);
    scheduleSave();
  }
  function applyAllLocks(){ Object.keys(LOCK_GROUPS).forEach(applyLockDisplay); }

  /* ---------------- date prepared: tickable day/month/year auto-fill ---------------- */
  function syncAutoDateDisabled(baseId){
    const dayEl = byId(baseId+'_day');
    const monthEl = byId(baseId+'_month');
    const yearEl = byId(baseId+'_year');
    if(!dayEl || !monthEl || !yearEl) return;
    const dateField = byId(baseId);
    if(!dateField) return;
    dateField.disabled = (dayEl.checked || monthEl.checked || yearEl.checked);
  }
  function updateAutoDate(baseId){
    const day = byId(baseId+'_day').checked;
    const month = byId(baseId+'_month').checked;
    const year = byId(baseId+'_year').checked;
    const dateField = byId(baseId);
    if(!day && !month && !year){
      dateField.disabled = false;
      scheduleSave();
      return;
    }
    const now = new Date();
    const dd = now.getDate();
    const mmName = now.toLocaleString('en-US', {month:'long'});
    const yyyy = now.getFullYear();
    let parts = [];
    if(day) parts.push(dd);
    if(month) parts.push(mmName);
    if(year) parts.push(yyyy);
    // keep natural "Day Month Year" reading order regardless of tick order
    let out = [];
    if(day && month){ out.push(dd + ' ' + mmName); } else { if(day) out.push(dd); if(month) out.push(mmName); }
    if(year) out.push(yyyy);
    dateField.value = out.join(' ');
    dateField.disabled = true;
    renderPreview();
    scheduleSave();
  }

  const TAB_LABELS = { proposal:'Proposal', invoice:'Billing Invoice', ack:'Acknowledgement Receipt' };
  const ALL_TABS = Object.keys(TAB_LABELS);

  /* ---------------- preview zoom ---------------- */
  let zoomState = { proposal:0.8, invoice:0.8, ack:0.8 };
  let previewPage = { proposal:1, invoice:1, ack:1 };
  let previewPageCount = { proposal:1, invoice:1, ack:1 };
  const ZOOM_MIN = 0.5, ZOOM_MAX = 2, ZOOM_STEP = 0.1;

  function applyZoom(kind){
    const sheet = byId('sheet-'+kind);
    if(sheet) sheet.style.zoom = zoomState[kind];
    const label = byId('zoomLevel_'+kind);
    if(label) label.textContent = Math.round(zoomState[kind]*100) + '%';
    paginateActive();
  }
  function zoomIn(kind){
    zoomState[kind] = Math.min(ZOOM_MAX, +(zoomState[kind] + ZOOM_STEP).toFixed(2));
    applyZoom(kind);
  }
  function zoomOut(kind){
    zoomState[kind] = Math.max(ZOOM_MIN, +(zoomState[kind] - ZOOM_STEP).toFixed(2));
    applyZoom(kind);
  }
  function resetZoom(kind){
    zoomState[kind] = 1;
    applyZoom(kind);
  }
  function bindZoomWheel(){
    root.querySelectorAll('.preview-wrap[data-kind]').forEach(wrap=>{
      const kind = wrap.dataset.kind;
      wrap.addEventListener('wheel', e=>{
        if(!e.ctrlKey) return;
        e.preventDefault();
        if(e.deltaY < 0) zoomIn(kind); else zoomOut(kind);
      }, { passive:false });
    });
  }

  function switchTab(tab){
    root.querySelectorAll('.tabbtn').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
    ALL_TABS.forEach(t=>{
      const ws = byId('workspace-'+t);
      if(ws) ws.classList.toggle('hidden', tab!==t);
    });
    byId('activeTabLabel').textContent = TAB_LABELS[tab] || tab;
    paginateActive();
  }

  function suggestedFilename(which){
    const stamp = new Date().toISOString().slice(0,10);
    if(which==='proposal') return `BIMDEC-Proposal-${(byId('p_qno').value||stamp).replace(/[\\/:*?"<>|]/g,'-')}`;
    if(which==='invoice')  return `BIMDEC-Invoice-${(byId('i_invno').value||stamp).replace(/[\\/:*?"<>|]/g,'-')}`;
    if(which==='ack')      return `BIMDEC-Receipt-${(byId('a_recno').value||stamp).replace(/[\\/:*?"<>|]/g,'-')}`;
    return `BIMDEC-Document-${stamp}`;
  }

  /* ---------------- Send to email (renders the sheet to a PDF, then emails it) ---------------- */
  const DOC_EMAIL_META = {
    proposal: { subject: n => `Proposal${n ? ' — ' + n : ''} — BIMDEC`, noun: 'proposal', bodyIntro: 'Please see the attached proposal.' },
    invoice:  { subject: n => `Billing Invoice${n ? ' ' + n : ''} — BIMDEC`, noun: 'billing invoice', bodyIntro: 'Please see the attached billing invoice.' },
    ack:      { subject: n => `Acknowledgement Receipt${n ? ' ' + n : ''} — BIMDEC`, noun: 'acknowledgement receipt', bodyIntro: 'Please see the attached acknowledgement receipt.' },
  };

  function docNumberFor(which){
    if(which==='proposal') return byId('p_qno').value;
    if(which==='invoice')  return byId('i_invno').value;
    if(which==='ack')      return byId('a_recno').value;
    return '';
  }

  async function sendDocumentEmail(which){
    const emailInput = byId('sendEmail_' + which);
    const status = byId('sendStatus_' + which);
    const btn = byId('sendBtn_' + which);
    const to = emailInput.value.trim();

    if(!to){
      status.className = 'send-status bad';
      status.textContent = 'Enter a recipient email address first.';
      return;
    }
    if(!EmailClient.isConfigured()){
      status.className = 'send-status bad';
      status.textContent = 'Email service isn\'t connected yet — open the Email page and enter your backend URL + API key first.';
      return;
    }

    const sheet = byId('sheet-' + which);
    if(!sheet){
      status.className = 'send-status bad';
      status.textContent = 'Could not find the document preview to send.';
      return;
    }

    btn.disabled = true;
    status.className = 'send-status pending';
    status.textContent = 'Loading PDF generator…';

    let html2pdf;
    try{
      ({ default: html2pdf } = await import('html2pdf.js'));
    }catch(e){
      status.className = 'send-status bad';
      status.textContent = 'PDF generator failed to load (check your internet connection) — try again.';
      btn.disabled = false;
      return;
    }
    status.textContent = 'Rendering PDF…';

    let prevZoom = null;
    try{
      // Render the full sheet at full scale (ignore the on-screen zoom) so the
      // PDF matches what "Print / Save as PDF" produces, not the shrunk preview.
      prevZoom = sheet.style.zoom;
      sheet.style.zoom = 1;
      const filename = suggestedFilename(which) + '.pdf';
      const pdfBlob = await html2pdf()
        .set({
          margin: 8,
          filename,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(sheet)
        .outputPdf('blob');

      status.textContent = 'Sending email…';
      const base64 = await blobToBase64(pdfBlob);
      const meta = DOC_EMAIL_META[which];
      const docNo = docNumberFor(which);

      await EmailClient.send({
        to,
        subject: meta.subject(docNo),
        html: `<p>${meta.bodyIntro}</p><p>— BIMDEC Design &amp; Engineering Consultants</p>`,
        attachments: [{ filename, content: base64, contentType: 'application/pdf' }],
      });

      status.className = 'send-status ok';
      status.textContent = 'Sent to ' + to + '.';
    }catch(err){
      status.className = 'send-status bad';
      status.textContent = 'Failed: ' + err.message;
    }finally{
      if(prevZoom !== null) sheet.style.zoom = prevZoom;
      btn.disabled = false;
    }
  }

  function blobToBase64(blob){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  let pendingPrintKind = null;
  const PRINT_PAPER_SIZES = {
    legal:'8.5in 14in',
    letter:'8.5in 11in',
    a3:'297mm 420mm',
    a4:'210mm 297mm',
    executive:'7.25in 10.5in',
    tabloid:'11in 17in',
    statement:'5.5in 8.5in'
  };
  function printSheet(which){
    pendingPrintKind = which;
    const modal = byId('printPaperModal');
    if(modal) modal.classList.add('open');
  }
  function closePrintPaperModal(){
    const modal = byId('printPaperModal');
    if(modal) modal.classList.remove('open');
    pendingPrintKind = null;
  }
  function applyPrintPaperSize(size){
    const value = PRINT_PAPER_SIZES[size] || PRINT_PAPER_SIZES.a4;
    let style = byId('dynamicPrintPageStyle');
    if(!style){
      style = document.createElement('style');
      style.id = 'dynamicPrintPageStyle';
      document.head.appendChild(style);
    }
    style.textContent = `@media print { @page { size: ${value} portrait; margin: 8mm; } }`;
  }
  function confirmPrintPaper(){
    const which = pendingPrintKind;
    if(!which) return closePrintPaperModal();
    const select = byId('printPaperSize');
    const size = select ? select.value : 'a4';
    applyPrintPaperSize(size);
    closePrintPaperModal();

    // Print the complete selected document. Preview-only page hiding is disabled
    // by the print stylesheet, so Home/Previous/Next/End never limit the export.
    ALL_TABS.forEach(t=>{
      const el = byId('sheet-'+t);
      if(el) el.classList.toggle('hidden-print', t!==which);
    });
    const prevTitle = document.title;
    document.title = suggestedFilename(which);
    // Give the browser one frame to apply the selected @page rule before opening print.
    requestAnimationFrame(()=>{
      window.print();
      setTimeout(()=>{ document.title = prevTitle; }, 800);
    });
  }

  /* ---------------- autosave (localStorage) ---------------- */
  const AUTOSAVE_KEY = 'bimdec_doc_autosave_v1';
  let autosaveTimer = null;

  function collectFieldValues(){
    const fields = {};
    root.querySelectorAll('.editor input[id], .editor textarea[id], .editor select[id]').forEach(el=>{
      fields[el.id] = (el.type === 'checkbox') ? el.checked : el.value;
    });
    return fields;
  }

  function saveState(){
    try{
      const payload = {
        fields: collectFieldValues(),
        itemState: itemState,
        sigState: sigState,
        lockState: lockState,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
      const stamp = byId('autosaveStamp');
      if(stamp){
        const t = new Date(payload.savedAt);
        stamp.textContent = 'Draft autosaved ' + t.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      }
    }catch(e){ /* storage unavailable - fail silently (e.g. quota exceeded by large signature images) */ }
  }

  function scheduleSave(){
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(saveState, 300);
  }

  function loadState(){
    let saved = null;
    try{ saved = JSON.parse(localStorage.getItem(AUTOSAVE_KEY) || 'null'); }catch(e){ saved = null; }
    if(!saved) return false;
    if(saved.itemState){
      // Merge per-kind instead of replacing the whole object, so an older draft
      // that predates a given tab's item list (e.g. no "ack" key yet) falls back
      // to the built-in default for that tab instead of leaving it undefined.
      itemState = {
        proposal: Array.isArray(saved.itemState.proposal) ? saved.itemState.proposal : ITEM_STATE_DEFAULTS.proposal,
        invoice: Array.isArray(saved.itemState.invoice) ? saved.itemState.invoice : ITEM_STATE_DEFAULTS.invoice,
        ack: Array.isArray(saved.itemState.ack) ? saved.itemState.ack : ITEM_STATE_DEFAULTS.ack,
      };
    }
    if(saved.sigState) sigState = Object.assign({p_prepby:null,i_prepby:null,i_appby:null,a_recvby:null,a_appby:null}, saved.sigState);
    if(saved.lockState) lockState = Object.assign({letterhead:false, paych:false}, saved.lockState);
    if(saved.fields){
      Object.keys(saved.fields).forEach(id=>{
        const el = byId(id);
        if(!el) return;
        if(el.type === 'checkbox') el.checked = !!saved.fields[id];
        else el.value = saved.fields[id];
      });
    }
    const stamp = byId('autosaveStamp');
    if(stamp && saved.savedAt){
      const t = new Date(saved.savedAt);
      stamp.textContent = 'Draft restored · saved ' + t.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    }
    return true;
  }

  function clearSavedDraft(){
    if(!confirm('Clear the autosaved draft? This cannot be undone.')) return;
    localStorage.removeItem(AUTOSAVE_KEY);
    location.reload();
  }

  /* ---------------- line item editor rendering ---------------- */
  let dragItem = null;

  function renderItemEditor(kind){
    const wrap = byId(kind==='proposal' ? 'p_items' : 'i_items');
    if(!Array.isArray(itemState[kind])) itemState[kind] = ITEM_STATE_DEFAULTS[kind] ? JSON.parse(JSON.stringify(ITEM_STATE_DEFAULTS[kind])) : [];
    wrap.innerHTML = '';
    itemState[kind].forEach((item, idx)=>{
      const div = document.createElement('div');
      div.className = 'item-editor';
      div.draggable = true;
      div.dataset.index = idx;
      div.innerHTML = `
        <button type="button" class="drag-handle" title="Drag this fee item to reorder" aria-label="Drag this fee item to reorder">⋮⋮</button>
        <button class="rm-btn" data-onclick="removeItem('${kind}',${idx})" title="Remove">✕</button>
        <div class="drag-hint">Drag this item anywhere on the card to reorder</div>
        <div class="desc"><textarea rows="1" data-idx="${idx}" data-field="desc" data-oninput="updateItem('${kind}',this)" placeholder="Description">${esc(item.desc)}</textarea></div>
        <div class="grid5">
          <input data-idx="${idx}" data-field="qty" type="number" step="0.01" value="${item.qty}" data-oninput="updateItem('${kind}',this)" placeholder="Qty">
          <select data-idx="${idx}" data-field="unit" data-onchange="updateItem('${kind}',this)">
            <option value="LOT" ${item.unit==='LOT' ? 'selected' : ''}>LOT</option>
            <option value="EA" ${item.unit==='EA' ? 'selected' : ''}>EA</option>
          </select>
          <input data-idx="${idx}" data-field="price" type="number" step="0.01" value="${item.price}" data-oninput="updateItem('${kind}',this)" placeholder="Unit price">
        </div>`;

      div.addEventListener('dragstart', e=>{
        // Inputs/buttons remain editable/clickable; everything else on the card can start a reorder.
        if(e.target.closest('input,select,textarea,button')){
          if(!e.target.closest('.drag-handle')){
            e.preventDefault();
            return;
          }
        }
        dragItem = {kind, index: idx};
        div.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(idx));
      });
      div.addEventListener('dragend', ()=>{
        div.classList.remove('dragging');
        wrap.querySelectorAll('.drop-target').forEach(x=>x.classList.remove('drop-target'));
        dragItem = null;
      });
      div.addEventListener('dragover', e=>{
        if(!dragItem || dragItem.kind !== kind) return;
        e.preventDefault();
        if(dragItem.index !== idx) div.classList.add('drop-target');
      });
      div.addEventListener('dragleave', ()=>div.classList.remove('drop-target'));
      div.addEventListener('drop', e=>{
        if(!dragItem || dragItem.kind !== kind) return;
        e.preventDefault();

        const from = dragItem.index;
        const rect = div.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        let to = idx + (before ? 0 : 1);

        const moved = itemState[kind].splice(from, 1)[0];
        if(from < to) to--;
        itemState[kind].splice(Math.max(0, Math.min(to, itemState[kind].length)), 0, moved);

        dragItem = null;
        renderItemEditor(kind);
        renderPreview();
        scheduleSave();
      });

      wrap.appendChild(div);
    });
  }
  function addItem(kind){
    itemState[kind].push({desc:'New line item', qty:1, unit:'LOT', price:0});
    renderItemEditor(kind);
    renderPreview();
    scheduleSave();
  }
  function removeItem(kind, idx){
    itemState[kind].splice(idx,1);
    renderItemEditor(kind);
    renderPreview();
    scheduleSave();
  }
  function updateItem(kind, el){
    const idx = el.dataset.idx, field = el.dataset.field;
    itemState[kind][idx][field] = (field==='qty'||field==='price') ? parseFloat(el.value||0) : el.value;
    renderPreview();
    scheduleSave();
  }

  /* ---------------- Acknowledgement Receipt: particulars line items ---------------- */
  function renderAckItemEditor(){
    const wrap = byId('a_items');
    if(!wrap) return;
    if(!Array.isArray(itemState.ack)) itemState.ack = JSON.parse(JSON.stringify(ITEM_STATE_DEFAULTS.ack));
    wrap.innerHTML = '';
    itemState.ack.forEach((item, idx)=>{
      const div = document.createElement('div');
      div.className = 'item-editor';
      div.draggable = true;
      div.dataset.index = idx;
      div.innerHTML = `
        <button type="button" class="drag-handle" title="Drag this line to reorder" aria-label="Drag this line to reorder">⋮⋮</button>
        <button class="rm-btn" data-onclick="removeAckItem(${idx})" title="Remove">✕</button>
        <div class="drag-hint">Drag this line anywhere on the card to reorder</div>
        <div class="desc"><textarea rows="1" data-idx="${idx}" data-field="desc" data-oninput="updateAckItem(this)" placeholder="Particulars / description">${esc(item.desc)}</textarea></div>
        <div class="field" style="margin:6px 0 0;"><label style="font-size:9.5px;">Amount</label><input data-idx="${idx}" data-field="amount" type="number" step="0.01" value="${item.amount}" data-oninput="updateAckItem(this)" placeholder="Amount"></div>`;

      div.addEventListener('dragstart', e=>{
        if(e.target.closest('input,select,textarea,button')){
          if(!e.target.closest('.drag-handle')){ e.preventDefault(); return; }
        }
        dragItem = {kind:'ack', index: idx};
        div.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(idx));
      });
      div.addEventListener('dragend', ()=>{
        div.classList.remove('dragging');
        wrap.querySelectorAll('.drop-target').forEach(x=>x.classList.remove('drop-target'));
        dragItem = null;
      });
      div.addEventListener('dragover', e=>{
        if(!dragItem || dragItem.kind !== 'ack') return;
        e.preventDefault();
        if(dragItem.index !== idx) div.classList.add('drop-target');
      });
      div.addEventListener('dragleave', ()=>div.classList.remove('drop-target'));
      div.addEventListener('drop', e=>{
        if(!dragItem || dragItem.kind !== 'ack') return;
        e.preventDefault();
        const from = dragItem.index;
        const rect = div.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        let to = idx + (before ? 0 : 1);
        const moved = itemState.ack.splice(from, 1)[0];
        if(from < to) to--;
        itemState.ack.splice(Math.max(0, Math.min(to, itemState.ack.length)), 0, moved);
        dragItem = null;
        renderAckItemEditor();
        renderPreview();
        scheduleSave();
      });

      wrap.appendChild(div);
    });
  }
  function addAckItem(){
    itemState.ack.push({desc:'New particulars line', amount:0});
    renderAckItemEditor();
    renderPreview();
    scheduleSave();
  }
  function removeAckItem(idx){
    itemState.ack.splice(idx,1);
    renderAckItemEditor();
    renderPreview();
    scheduleSave();
  }
  function updateAckItem(el){
    const idx = el.dataset.idx, field = el.dataset.field;
    itemState.ack[idx][field] = field==='amount' ? parseFloat(el.value||0) : el.value;
    renderPreview();
    scheduleSave();
  }
  /* ---------------- preview rendering ---------------- */
  function esc(s){ return (s||'').toString(); }
  function nl2li(text){
    return text.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>`<li>${esc(l)}</li>`).join('');
  }
  function textToHtml(text){
    return esc(text).replace(/\n/g, '<br>');
  }
  function itemRows(items){
    return items.map(it => `<tr>
        <td>${esc(it.desc)}</td>
        <td class="num">${it.qty} ${esc(it.unit)}</td>
        <td class="num">${PHP(it.price)}</td>
        <td class="num">${PHP(it.qty*it.price)}</td>
      </tr>`).join('');
  }
  function sumItems(items){ return items.reduce((s,it)=>s+ (it.qty*it.price), 0); }

  function renderPreview(){
    const g = id => byId(id);

    /* ---- PROPOSAL ---- */
    const p = id => byId('p_'+id).value;
    g('pv_p_letterhead').textContent =
      `${g('p_addr').value}\n${g('p_email').value}\n${g('p_phone').value}\n${g('p_tin').value}`;
    g('pv_p_qno').textContent = p('qno');
    g('pv_p_client').textContent = p('client');
    g('pv_p_date').textContent = p('date');
    g('pv_p_clientco').textContent = p('clientco');
    g('pv_p_valid').textContent = p('valid');
    g('pv_p_project').textContent = p('project');
    g('pv_p_loc').textContent = p('loc');
    g('pv_p_scope').innerHTML = nl2li(p('scope'));
    g('pv_p_items').innerHTML = itemRows(itemState.proposal);
    const pTotal = sumItems(itemState.proposal);
    g('pv_p_totals').innerHTML = `
      <div class="trow"><span class="k">Total professional fee</span><span>${PHP(pTotal)}</span></div>
      <div class="trow grand"><span class="k">Total contract price <span class="nonvat-badge">NON‑VAT</span></span><span>${PHP(pTotal)}</span></div>`;
    g('pv_p_sitevisit').textContent = p('sitevisit');
    g('pv_p_terms').innerHTML = textToHtml(p('terms'));
    g('pv_p_revisions').innerHTML = textToHtml(p('revisions'));
    g('pv_p_payment').innerHTML = textToHtml(p('payment'));
    g('pv_p_paych').innerHTML = textToHtml(`Bank: ${p('bankname')}\nAccount Name: ${p('acctname')}\nAccount Number: ${p('acctno')}`);
    g('pv_p_lead').textContent = 'Lead time: ' + p('lead');
    g('pv_p_prepby').textContent = p('prepby') + '  ·  ' + p('prepdate');
    applySigToPreview('p_prepby', 'pv_p_prepby_sig');
    g('tb_p_qno').textContent = p('qno');
    g('tb_p_date').textContent = p('date');

    /* ---- INVOICE ---- */
    const i = id => byId('i_'+id).value;
    g('pv_i_letterhead').textContent =
      `${g('i_addr').value}\n${g('i_email').value}\n${g('i_phone').value}\n${g('i_tin').value}`;
    g('pv_i_invno').textContent = i('invno');
    g('pv_i_customer').textContent = i('customer');
    g('pv_i_date').textContent = i('date');
    g('pv_i_custaddr').textContent = i('custaddr');
    g('pv_i_project').textContent = i('project');
    g('pv_i_loc').textContent = i('loc');
    g('pv_i_items').innerHTML = itemRows(itemState.invoice);
    const iSub = sumItems(itemState.invoice);
    const dp = parseFloat(g('i_dp').value||0);
    const disc = parseFloat(g('i_disc').value||0);
    const iDue = iSub - dp - disc;
    let totalsHtml = `<div class="trow"><span class="k">Subtotal (Non‑VAT)</span><span>${PHP(iSub)}</span></div>`;
    if(dp) totalsHtml += `<div class="trow"><span class="k">Less: Down payment</span><span>- ${PHP(dp)}</span></div>`;
    if(disc) totalsHtml += `<div class="trow"><span class="k">Less: Discount</span><span>- ${PHP(disc)}</span></div>`;
    totalsHtml += `<div class="trow grand"><span class="k">Total amount due <span class="nonvat-badge">NON‑VAT</span></span><span>${PHP(iDue)}</span></div>`;
    g('pv_i_totals').innerHTML = totalsHtml;
    g('pv_i_paych').innerHTML = textToHtml(`Bank: ${i('bankname')}\nAccount Name: ${i('acctname')}\nAccount Number: ${i('acctno')}`);
    g('pv_i_prepby').textContent = (i('prepby') || '—') + (i('prepdate') ? '  ·  ' + i('prepdate') : '');
    applySigToPreview('i_prepby', 'pv_i_prepby_sig');
    g('pv_i_appby').textContent = (i('appby') || '—') + (i('appdate') ? '  ·  ' + i('appdate') : '');
    applySigToPreview('i_appby', 'pv_i_appby_sig');
    g('tb_i_invno').textContent = i('invno');
    g('tb_i_date').textContent = i('date');

    /* ---- ACKNOWLEDGEMENT RECEIPT ---- */
    const a = id => byId('a_'+id).value;
    g('pv_a_letterhead').textContent =
      `${g('a_addr').value}\n${g('a_email').value}\n${g('a_phone').value}\n${g('a_tin').value}`;
    g('pv_a_recno').textContent = a('recno');
    g('pv_a_receivedfrom').textContent = a('receivedfrom');
    g('pv_a_date').textContent = a('date');
    g('pv_a_refno').textContent = a('refno');
    g('pv_a_paymethod').textContent = a('paymethod');
    g('pv_a_paydetails').textContent = a('paydetails');
    g('pv_a_particulars').innerHTML = itemState.ack.map(it =>
      `<div class="ack-line"><span>${esc(it.desc)}</span><span class="num">${PHP(it.amount)}</span></div>`
    ).join('');
    const ackSubtotal = itemState.ack.reduce((s,it)=>s+(parseFloat(it.amount)||0), 0);
    g('pv_a_subtotal').textContent = 'Particulars subtotal: ' + PHP(ackSubtotal);
    const aAmount = parseFloat(g('a_amount').value||0);
    g('pv_a_totals').innerHTML = `<div class="trow grand"><span class="k">Amount received <span class="nonvat-badge">NON‑VAT</span></span><span>${PHP(aAmount)}</span></div>`;
    g('pv_a_amountwords').textContent = 'Amount in words: ' + a('amountwords');
    g('pv_a_recvby').textContent = a('recvby') + '  ·  ' + a('recvdate');
    applySigToPreview('a_recvby', 'pv_a_recvby_sig');
    g('pv_a_appby').textContent = (a('appby') || '—') + (a('appdate') ? '  ·  ' + a('appdate') : '');
    applySigToPreview('a_appby', 'pv_a_appby_sig');
    g('tb_a_recno').textContent = a('recno');
    g('tb_a_date').textContent = a('date');

    paginateActive();
  }

  /* ---------------- wire up live updates ---------------- */
  function bindLiveInputs(){
    root.querySelectorAll('.editor input, .editor textarea').forEach(el=>{
      el.addEventListener('input', renderPreview);
      el.addEventListener('input', scheduleSave);
    });
  }

  /* ---------------- on-screen page-break preview ----------------
     This never touches what actually prints — real pagination in the PDF
     is handled by the @media print rules / @page size. This just estimates
     the same A4 page height on screen so the live preview shows a document
     that has grown past one page as separate stacked "papers" with a
     page-break marker, instead of one endless sheet. */
  const PAGE_H = 1123;      // on-screen px approximating an A4 page (matches .sheet's base height)
  const PAD_TOP = 46, PAD_BOTTOM = 40; // matches .sheet's own padding
  const CONTENT_H = PAGE_H - PAD_TOP - PAD_BOTTOM;
  const SEAM = 30;          // visible gray gap drawn between two "papers"

  function updatePageNav(kind){
    const total = previewPageCount[kind] || 1;
    const page = Math.min(Math.max(previewPage[kind] || 1, 1), total);
    previewPage[kind] = page;

    const status = byId('pageNav_'+kind);
    if(status) status.textContent = page + ' / ' + total;

    const states = {
      pageHome: page <= 1,
      pagePrev: page <= 1,
      pageNext: page >= total,
      pageEnd: page >= total
    };
    Object.keys(states).forEach(prefix=>{
      const btn = byId(prefix+'_'+kind);
      if(btn) btn.disabled = states[prefix];
    });
  }

  function setPreviewPage(kind, page){
    const total = previewPageCount[kind] || 1;
    previewPage[kind] = Math.min(Math.max(Number(page)||1, 1), total);
    updatePageNav(kind);

    // Continuous preview: navigation buttons scroll to the requested printed
    // page position instead of hiding every other page.
    const sheet = byId('sheet-'+kind);
    if(!sheet) return;
    const target = [...sheet.querySelectorAll('[data-preview-page]')]
      .find(el => Number(el.dataset.previewPage) === previewPage[kind]);
    if(target){
      target.scrollIntoView({behavior:'smooth', block:'start'});
    }
  }

  function goHome(kind){ setPreviewPage(kind, 1); }
  function prevPage(kind){ setPreviewPage(kind, (previewPage[kind]||1) - 1); }
  function nextPage(kind){ setPreviewPage(kind, (previewPage[kind]||1) + 1); }
  function goEnd(kind){ setPreviewPage(kind, previewPageCount[kind] || 1); }

  function paginateSheet(sheetId, noteId){
    const sheet = byId(sheetId);
    if(!sheet) return;

    const kind = sheetId.replace(/^sheet-/, '');
    // Always measure the complete document first. Hidden page blocks must not
    // affect the next pagination pass.
    sheet.querySelectorAll('[data-page-hidden="true"]').forEach(el=>el.removeAttribute('data-page-hidden'));
    sheet.querySelectorAll('.page-gap').forEach(n=>n.remove());

    const upper = sheet.querySelector('.sheet-upper');
    const lower = sheet.querySelector('.sheet-lower');
    const foot = sheet.querySelector('.sheet-foot');
    const blocks = [...upper.children, ...lower.children, foot].filter(Boolean);

    const zoom = zoomState[kind] || 1;
    let used = 0;
    let currentPage = 1;
    blocks.forEach(el=>{
      const cs = getComputedStyle(el);
      const h = (el.offsetHeight + parseFloat(cs.marginTop||0) + parseFloat(cs.marginBottom||0)) / zoom;
      if(used > 0 && used + h > CONTENT_H){
        currentPage++;
        used = h;
      } else {
        used += h;
      }
      el.dataset.previewPage = currentPage;
    });

    const pages = Math.max(currentPage, 1);
    previewPageCount[kind] = pages;
    if(previewPage[kind] > pages) previewPage[kind] = pages;
    if(previewPage[kind] < 1) previewPage[kind] = 1;

    // Continuous preview: keep every block visible. The page number is only
    // used by the navigation controls to scroll to the corresponding printed
    // page position.
    blocks.forEach(el=>{ el.dataset.pageHidden = 'false'; });
    sheet.classList.remove('page-viewing');

    const note = byId(noteId);
    if(note){
      note.textContent = pages > 1
        ? `Continuous preview — ${pages} printed pages`
        : 'Continuous preview — 1 printed page';
    }
    updatePageNav(kind);
  }

  function paginateActive(){
    requestAnimationFrame(()=>{
      paginateSheet('sheet-proposal', 'pageCountProposal');
      paginateSheet('sheet-invoice', 'pageCountInvoice');
      paginateSheet('sheet-ack', 'pageCountAck');
    });
  }

  const hadSavedDraft = loadState();
  function safeInit(label, fn){
    try{ fn(); }catch(e){ console.error('Init step failed: '+label, e); }
  }
  safeInit('renderItemEditor(proposal)', ()=>renderItemEditor('proposal'));
  safeInit('renderItemEditor(invoice)', ()=>renderItemEditor('invoice'));
  safeInit('renderAckItemEditor', renderAckItemEditor);
  safeInit('renderAllSigThumbs', renderAllSigThumbs);
  safeInit('applyAllLocks', applyAllLocks);
  safeInit('syncAutoDateDisabled(p_prepdate)', ()=>syncAutoDateDisabled('p_prepdate'));
  safeInit('syncAutoDateDisabled(i_prepdate)', ()=>syncAutoDateDisabled('i_prepdate'));
  safeInit('syncAutoDateDisabled(a_appdate)', ()=>syncAutoDateDisabled('a_appdate'));
  // These two are what make typing show up in the preview — they always run,
  // even if a step above failed, so a bad saved draft can never again result
  // in a page where input silently stops reaching the preview.
  safeInit('bindLiveInputs', bindLiveInputs);
  safeInit('renderPreview', renderPreview);
  safeInit('applyZoom(all tabs)', ()=>ALL_TABS.forEach(applyZoom));
  safeInit('bindZoomWheel', bindZoomWheel);
  if(!hadSavedDraft) saveState();
  byId('printPaperModal')?.addEventListener('click', e=>{ if(e.target.id==='printPaperModal') closePrintPaperModal(); });
  onDoc('keydown', e=>{ if(e.key==='Escape') closePrintPaperModal(); });
  onWin('beforeunload', saveState);

  if(document.fonts && document.fonts.ready){ document.fonts.ready.then(paginateActive); }
  onWin('resize', paginateActive);
  paginateActive();

  /* ---------------- inline-handler dispatch ----------------
     The original markup carried onclick/onchange/oninput attributes, and
     renderItemEditor() still builds rows as HTML strings. Both now emit
     data-on* attributes, and one delegated listener per event type runs the
     expression verbatim — so dynamically inserted rows work with no extra
     wiring, and nothing is attached to window. */
  const ACTIONS = {
    switchTab, toggleLock, updateAutoDate, renderPreview, scheduleSave,
    updateItem, updateAckItem, addItem, removeItem, addAckItem, removeAckItem,
    handleSigUpload, removeSig, zoomIn, zoomOut, resetZoom,
    goHome, prevPage, nextPage, goEnd,
    printSheet, confirmPrintPaper, closePrintPaperModal,
    clearSavedDraft, sendDocumentEmail, portalLogout,
  };
  const ACTION_NAMES = Object.keys(ACTIONS);
  const ACTION_FNS = ACTION_NAMES.map((n) => ACTIONS[n]);
  const compiled = new Map();

  function runAction(expr, el, event) {
    let fn = compiled.get(expr);
    if (!fn) {
      // `this` in an inline handler meant the element it was written on.
      fn = new Function(...ACTION_NAMES, 'event', '__el', expr.replace(/\bthis\b/g, '__el'));
      compiled.set(expr, fn);
    }
    fn(...ACTION_FNS, event, el);
  }

  for (const type of ['click', 'change', 'input']) {
    const attr = 'data-on' + type;
    const handler = (event) => {
      const el = event.target.closest && event.target.closest('[' + attr + ']');
      if (!el || !root.contains(el)) return;
      runAction(el.getAttribute(attr), el, event);
    };
    root.addEventListener(type, handler);
    teardown.push(() => root.removeEventListener(type, handler));
  }

  /* ---------------- teardown ----------------
     'beforeunload' no longer fires when the user just navigates to another
     route, so the draft is saved here too — otherwise clicking "Users" would
     drop up to 300ms of typing. The dynamic @page style is removed so the
     paper size chosen here can't leak into a print from another page. */
  return () => {
    clearTimeout(autosaveTimer);
    try { saveState(); } catch (e) { /* storage unavailable */ }
    teardown.forEach((off) => off());
    document.getElementById('dynamicPrintPageStyle')?.remove();
  };
}
