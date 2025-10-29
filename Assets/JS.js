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

  // persistence: save/load
  function saveToStorage(){
    // copy minimal serializable state
    const out = {
      attrs: state.attrs,
      pv: state.pv, ps: state.ps, tension: state.tension,
      inventory: state.inventory,
      personal: state.personal,
      skills: q('#skills').value,
      abilities: q('#abilities').value,
      notes: q('#notes').value,
      effects: q('#effectsField').value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
  }

  function loadFromStorage(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return false;
    try{
      const o = JSON.parse(raw);
      if(o.attrs) state.attrs = Object.assign(state.attrs, o.attrs);
      if(typeof o.pv==='number' || typeof o.pv==='string') state.pv = Number(o.pv);
      if(typeof o.ps==='number' || typeof o.ps==='string') state.ps = Number(o.ps);
      if(typeof o.tension==='number' || typeof o.tension==='string') state.tension = Number(o.tension);
      if(Array.isArray(o.inventory)) state.inventory = o.inventory.slice();
      if(o.personal) state.personal = Object.assign(state.personal, o.personal);
      if(typeof o.skills==='string') q('#skills').value = o.skills;
      if(typeof o.abilities==='string') q('#abilities').value = o.abilities;
      if(typeof o.notes==='string') q('#notes').value = o.notes;
      if(typeof o.effects==='string') q('#effectsField').value = o.effects;
      return true;
    }catch(e){ console.warn('load failed',e); return false; }
  }

  // simple numeric animation helper
  function animateNumber(el, from, to, duration=400){
    const start = performance.now();
    const diff = to - from;
    function frame(now){
      const t = Math.min(1, (now - start)/duration);
      const v = Math.round(from + diff * (1 - Math.pow(1 - t,3))); // easeOutCubic
      el.textContent = v;
      if(t < 1) requestAnimationFrame(frame);
      else el.textContent = to; // ensure final
    }
    requestAnimationFrame(frame);
  }

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