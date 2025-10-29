  // estado centralizado
  const STORAGE_KEY = 'fichaFlagelo_v1';
  const state = {
    attrs:{FOR:0,AGI:0,VIG:0,INT:0,AUR:0,CAR:0},
    hpMax:10,pv:10,ps:50,tension:6,inventory:[],manualTensionOverride:false,
    personal:{name:'',origin:'',age:'',height:'',eye:''},
    skills:'',abilities:'',notes:'',effects:''
  };

  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
  const q = sel => document.querySelector(sel);
  const qAll = sel => Array.from(document.querySelectorAll(sel));

  // refs
  const pvInput = q('#pvInput'), psInput = q('#psInput'), tensionInput = q('#tensionInput');
  const pvBar = q('#pvBar'), psBar = q('#psBar'), tensionBar = q('#tensionBar');
  const pvLabel = q('#pvLabel'), psLabel = q('#psLabel'), tensionLabel = q('#tensionLabel');
  const portrait = q('#portrait');
  const invList = q('#invList');
  const attrsWrap = q('#attrs');


// Elementos do menu (se existirem no HTML)
const libraryMenu = q('.library-menu');
const libraryToggle = q('#libraryToggle');
const fichaList = q('#fichaList');
const newFichaBtn = q('#newFichaBtn');

// -------------------------------
// Funções de Armazenamento
// -------------------------------
function getRawStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Erro ao ler localStorage', e);
    return null;
  }
}

function getAllFichas() {
  const raw = getRawStorage();
  if (!raw) return { fichas: {}, lastActive: '' };

  if (raw && typeof raw === 'object' && raw.fichas && typeof raw.fichas === 'object') {
    return raw; // formato novo
  }

  // --- MIGRAÇÃO AUTOMÁTICA (formato antigo → novo)
  const name =
    (state.personal && state.personal.name && state.personal.name.trim()) ||
    'Ficha-1';
  const migrated = { fichas: {}, lastActive: name };
  migrated.fichas[name] = raw;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  console.log('Dados antigos migrados para formato de múltiplas fichas');
  return migrated;
}

// -------------------------------
// Salvamento / Carregamento
// -------------------------------
function saveToStorage(silent = false) {
  const allData = getAllFichas();
  const name =
    (state.personal && state.personal.name && state.personal.name.trim()) ||
    `Autosave_${new Date().toISOString().replace(/[:.]/g, '-')}`;

  allData.fichas[name] = {
    attrs: state.attrs,
    pv: state.pv,
    ps: state.ps,
    tension: state.tension,
    inventory: state.inventory,
    personal: state.personal,
    skills: q('#skills')?.value || '',
    abilities: q('#abilities')?.value || '',
    notes: q('#notes')?.value || '',
    effects: q('#effectsField')?.value || '',
  };
  allData.lastActive = name;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
  if (!silent) alert(`Ficha "${name}" salva!`);
  updateFichaList();
}

function loadFicha(name) {
  const allData = getAllFichas();
  const ficha = allData.fichas[name];
  if (!ficha) return false;

  Object.assign(state.attrs, ficha.attrs);
  state.pv = ficha.pv;
  state.ps = ficha.ps;
  state.tension = ficha.tension;
  state.inventory = ficha.inventory.slice();
  state.personal = Object.assign({}, ficha.personal);

  q('#skills').value = ficha.skills || '';
  q('#abilities').value = ficha.abilities || '';
  q('#notes').value = ficha.notes || '';
  q('#effectsField').value = ficha.effects || '';

  // atualiza campos pessoais
  q('#nameField').value = state.personal.name || '';
  q('#originField').value = state.personal.origin || '';
  q('#ageField').value = state.personal.age || '';
  q('#heightField').value = state.personal.height || '';
  q('#eyeField').value = state.personal.eye || '';

  recalc();
  return true;
}

// -------------------------------
// Interface da Biblioteca
// -------------------------------
function getFichaNames() {
  return Object.keys(getAllFichas().fichas);
}

function updateFichaList() {
  if (!fichaList) return;
  const names = getFichaNames();
  if (names.length === 0) {
    fichaList.innerHTML = `<li style="color:#aaa;font-style:italic;">Nenhuma ficha salva</li>`;
    return;
  }

  fichaList.innerHTML = names
    .map(
      (name) => `
    <li style="display:flex;justify-content:space-between;margin-bottom:4px;">
      <button class="load-ficha" style="flex:1;text-align:left;">${name}</button>
      <button class="del-ficha" data-name="${name}" style="color:red;margin-left:6px;">🗑️</button>
    </li>`
    )
    .join('');

  qAll('.load-ficha').forEach((btn) => {
    btn.addEventListener('click', () => {
      loadFicha(btn.textContent);
      if (libraryMenu) libraryMenu.style.display = 'none';
    });
  });

  qAll('.del-ficha').forEach((btn) => {
    btn.addEventListener('click', () => {
      const allData = getAllFichas();
      const name = btn.dataset.name;
      if (confirm(`Apagar ficha "${name}"?`)) {
        delete allData.fichas[name];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
        updateFichaList();
      }
    });
  });
}

// -------------------------------
// Eventos do menu
// -------------------------------
if (libraryToggle && libraryMenu) {
  libraryToggle.addEventListener('click', () => {
    libraryMenu.style.display =
      libraryMenu.style.display === 'none' ? 'block' : 'none';
    updateFichaList();
  });
}

if (newFichaBtn) {
  newFichaBtn.addEventListener('click', () => {
    Object.assign(state.attrs, { FOR: 0, AGI: 0, VIG: 0, INT: 0, AUR: 0, CAR: 0 });
    state.pv = 10;
    state.ps = 50;
    state.tension = 6;
    state.inventory = [];
    state.personal = { name: '', origin: '', age: '', height: '', eye: '' };

    q('#skills').value = '';
    q('#abilities').value = '';
    q('#notes').value = '';
    q('#effectsField').value = '';
    recalc();

    if (libraryMenu) libraryMenu.style.display = 'none';
  });
}

// -------------------------------
// Botão principal de salvar
// -------------------------------
if (q('#saveBtn')) {
  q('#saveBtn').addEventListener('click', () => {
    const name = state.personal.name.trim();
    if (!name) {
      const n = prompt('Digite o nome do personagem para salvar:');
      if (!n) return;
      state.personal.name = n.trim();
      q('#nameField').value = n.trim();
    }
    saveToStorage(false);
  });
}

// -------------------------------
// Inicialização automática
// -------------------------------
(function init() {
  const allData = getAllFichas();
  if (allData.lastActive) loadFicha(allData.lastActive);
  updateFichaList();
})();

window.addEventListener('beforeunload', () => saveToStorage(true));

  function recalc(){
    state.hpMax = 10 + (state.attrs.VIG * 3);
    if(!state.manualTensionOverride){ state.tension = clamp(6 + (state.attrs.AUR * 2), 6, 12); }
    state.pv = Math.max(0, Number(state.pv) || 0);
    state.ps = Math.max(0, Number(state.ps) || 0);
    render();
  }

  function updateBar(id, value, max){
    const input = q(`#${id}Input`);
    const label = q(`#${id}Label`);
    const bar = q(`#${id}Bar`);

    const pct = clamp((value / max) * 100, 0, 100);
  
    // Animação suave de largura
    bar.style.transition = 'width .5s cubic-bezier(.2,.9,.2,1)';
    bar.style.width = pct + '%';

    // Atualiza valores
    input.value = value;
    label.textContent = `${value}/${max}`;
  }

  function render(){
    // Atualiza atributos
    for(const [k,v] of Object.entries(state.attrs)){
        const el = attrsWrap.querySelector(`[data-attr="${k}"] .val`);
        if(el) el.value = v;
    }

    // Atualiza barras (genérico)
    updateBar('pv', state.pv, state.hpMax);
    updateBar('ps', state.ps, 100);
    updateBar('tension', state.tension, 12);

    // Define imagem de retrato
    if(state.ps < 25) portrait.style.backgroundImage = "var(--portrait-insane)";
    else if(state.pv < (state.hpMax/2)) portrait.style.backgroundImage = "var(--portrait-injured)";
    else portrait.style.backgroundImage = "var(--portrait-normal)";

    renderInventory();
  }

  function renderInventory(){
    invList.innerHTML = state.inventory.map((it,idx)=>
      `<li class="inv-item"><div class="left"><strong>${escapeHtml(it.name)}</strong><div style="font-size:12px;color:var(--muted)">${escapeHtml(it.space)}</div></div><div class="meta">x${it.qty}<br><button data-idx="${idx}" class="inv-del">remover</button></div></li>`
    ).join('');
  }

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>\"']/g,ch=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[ch]); }

  // eventos: atributos (delegation)
  attrsWrap.addEventListener('click', e=>{
    const btn = e.target.closest('button[data-action]');
    if(!btn) return;
    const action = btn.getAttribute('data-action');
    const attrEl = btn.closest('.attr');
    const key = attrEl && attrEl.dataset.attr;
    if(!key) return;
    const curr = state.attrs[key];
    if(action === 'inc' && curr < 10) { state.attrs[key] = curr + 1; if(key==='AUR') state.manualTensionOverride=false; }
    if(action === 'dec' && curr > 0) { state.attrs[key] = curr - 1; if(key==='AUR') state.manualTensionOverride=false; }
    recalc();
  });

  // vitals inputs
  pvInput.addEventListener('input', ()=>{ state.pv = pvInput.value===''?0:Number(pvInput.value); render(); });
  psInput.addEventListener('input', ()=>{ state.ps = psInput.value===''?0:Number(psInput.value); render(); });
  tensionInput.addEventListener('input', ()=>{ state.tension = tensionInput.value===''?0:Number(tensionInput.value); state.manualTensionOverride = true; render(); });

  // inventário
  q('#invAddBtn').addEventListener('click', ()=>{
    const name = q('#invName').value.trim();
    const qty = Number(q('#invQty').value) || 1;
    const space = q('#invSpace').value.trim() || '';
    if(!name) return;
    state.inventory.push({name,qty,space});
    q('#invName').value='';q('#invQty').value='';q('#invSpace').value='';
    render();
  });

  invList.addEventListener('click', e=>{
    const btn = e.target.closest('.inv-del'); if(!btn) return;
    const idx = Number(btn.dataset.idx); if(isFinite(idx)) { state.inventory.splice(idx,1); render(); }
  });

  // personal fields sync
  q('#nameField').addEventListener('input', e=>{ state.personal.name = e.target.value; });
  q('#originField').addEventListener('input', e=>{ state.personal.origin = e.target.value; });
  q('#ageField').addEventListener('input', e=>{ state.personal.age = e.target.value; });
  q('#heightField').addEventListener('input', e=>{ state.personal.height = e.target.value; });
  q('#eyeField').addEventListener('input', e=>{ state.personal.eye = e.target.value; });

  // save / clear buttons
  q('#saveBtn').addEventListener('click', ()=>{ saveToStorage(); alert('Ficha salva no localStorage.'); });
  q('#clearBtn').addEventListener('click', ()=>{ if(confirm('Remover dados salvos?')){ localStorage.removeItem(STORAGE_KEY); location.reload(); } });

  // auto-save on unload
  window.addEventListener('beforeunload', ()=>{ saveToStorage(); });

  // init: try load
  (function init(){
    const loaded = loadFromStorage();
    // populate UI from state
    // personal
    q('#nameField').value = state.personal.name || '';
    q('#originField').value = state.personal.origin || '';
    q('#ageField').value = state.personal.age || '';
    q('#heightField').value = state.personal.height || '';
    q('#eyeField').value = state.personal.eye || '';
    // text areas
    q('#skills').value = q('#skills').value || '';
    q('#abilities').value = q('#abilities').value || '';
    q('#notes').value = q('#notes').value || '';
    q('#effectsField').value = q('#effectsField').value || '';
    // ensure numeric casts
    state.pv = Number(state.pv) || 0; state.ps = Number(state.ps) || 0; state.tension = Number(state.tension) || 6;
    recalc();
  })();

  // inicializa
  // recalc já chamado no init67