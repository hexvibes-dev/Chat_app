// src/scripts/editor/EditorCSSEditor.js
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { css } from '@codemirror/lang-css';
import { oneDark } from '@codemirror/theme-one-dark';

const CSS_PROPERTIES = [
  'color','background','background-color','background-image','background-size','background-position',
  'background-repeat','background-clip','background-origin','background-attachment',
  'font-size','font-family','font-weight','font-style','text-align','text-decoration','line-height',
  'letter-spacing','word-spacing','white-space','text-transform','text-overflow',
  'margin','margin-top','margin-right','margin-bottom','margin-left',
  'padding','padding-top','padding-right','padding-bottom','padding-left',
  'border','border-radius','border-width','border-color','border-style','border-top','border-right','border-bottom','border-left',
  'width','height','max-width','max-height','min-width','min-height',
  'display','position','top','left','right','bottom',
  'flex','flex-direction','justify-content','align-items','gap','flex-wrap','flex-basis','flex-grow','flex-shrink',
  'grid','grid-template-columns','grid-template-rows','grid-gap','grid-column','grid-row',
  'opacity','z-index','cursor','overflow','overflow-x','overflow-y','box-shadow','text-shadow',
  'transition','transition-duration','transition-timing-function','animation','animation-name','animation-duration',
  'transform','transform-origin','filter','visibility','outline','resize','object-fit',
  'background-blend-mode','mix-blend-mode','isolation','object-position','object-fit',
  'linear-gradient','radial-gradient','conic-gradient','repeating-linear-gradient','repeating-radial-gradient',
  'rgba','rgb','hsla','hsl','var','calc'
];

const SPECIAL_SELECTORS = ['bubble','hour','text','anima','anima-text'];

const COLOR_NAMES = new Set([
  'black','silver','gray','white','maroon','red','purple','fuchsia','green','lime','olive','yellow','navy','blue','teal','aqua',
  'aliceblue','antiquewhite','aquamarine','azure','beige','bisque','blanchedalmond','blueviolet','brown','burlywood','cadetblue',
  'chartreuse','chocolate','coral','cornflowerblue','cornsilk','crimson','cyan','darkblue','darkcyan','darkgoldenrod','darkgray',
  'darkgreen','darkkhaki','darkmagenta','darkolivegreen','darkorange','darkorchid','darkred','darksalmon','darkseagreen','darkslateblue',
  'darkslategray','darkturquoise','darkviolet','deeppink','deepskyblue','dimgray','dodgerblue','firebrick','floralwhite','forestgreen',
  'gainsboro','ghostwhite','gold','goldenrod','greenyellow','honeydew','hotpink','indianred','indigo','ivory','khaki','lavender',
  'lavenderblush','lawngreen','lemonchiffon','lightblue','lightcoral','lightcyan','lightgoldenrodyellow','lightgray','lightgreen',
  'lightpink','lightsalmon','lightseagreen','lightskyblue','lightslategray','lightsteelblue','lightyellow','limegreen','linen',
  'magenta','mediumaquamarine','mediumblue','mediumorchid','mediumpurple','mediumseagreen','mediumslateblue','mediumspringgreen',
  'mediumturquoise','mediumvioletred','midnightblue','mintcream','mistyrose','moccasin','navajowhite','oldlace','olivedrab','orange',
  'orangered','orchid','palegoldenrod','palegreen','paleturquoise','palevioletred','papayawhip','peachpuff','peru','pink','plum',
  'powderblue','rosybrown','royalblue','saddlebrown','salmon','sandybrown','seagreen','seashell','sienna','skyblue','slateblue',
  'slategray','snow','springgreen','steelblue','tan','thistle','tomato','turquoise','violet','wheat','whitesmoke','yellowgreen'
]);

let historial = [];

function levenshtein(a,b){
  const al=a.length, bl=b.length;
  if(al===0) return bl;
  if(bl===0) return al;
  const v0=new Array(bl+1), v1=new Array(bl+1);
  for(let i=0;i<=bl;i++) v0[i]=i;
  for(let i=0;i<al;i++){
    v1[0]=i+1;
    for(let j=0;j<bl;j++){
      const cost = a[i]===b[j]?0:1;
      v1[j+1]=Math.min(v1[j]+1, v0[j+1]+1, v0[j]+cost);
    }
    for(let k=0;k<=bl;k++) v0[k]=v1[k];
  }
  return v1[bl];
}

function isColorToken(token){
  if(!token) return false;
  if(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/.test(token)) return true;
  if(/^(rgba?|hsla?)\s*\([^\)]{3,}\)/i.test(token)) return true;
  const lower=token.toLowerCase();
  if(COLOR_NAMES.has(lower)) return true;
  return false;
}

function shouldSaveWord(word){
  if(!word) return false;
  const trimmed=word.trim();
  if(isColorToken(trimmed)) return true;
  return false;
}

function actualizarHistorial(texto){
  if(!texto) return;
  const hexMatches = Array.from(texto.matchAll(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g)).map(m=>m[0]);
  const funcMatches = Array.from(texto.matchAll(/\b(?:rgba?|hsla?)\s*\([^\)]{3,}\)/gi)).map(m=>m[0]);
  const nameMatches = [];
  const words = texto.match(/\b[a-zA-Z][a-zA-Z-]{2,}\b/g) || [];
  for(const w of words){
    if(COLOR_NAMES.has(w.toLowerCase())) nameMatches.push(w);
  }
  const candidates = [...hexMatches, ...funcMatches, ...nameMatches];
  for(const c of candidates){
    const p=c.trim();
    if(!p) continue;
    if(!historial.includes(p) && shouldSaveWord(p)){
      historial.unshift(p);
      if(historial.length>200) historial.pop();
    }
  }
}

function normalizeForMatch(s){
  return s.replace(/[-_]/g,'').toLowerCase();
}

function matchesAllChars(input, candidate){
  if(!input) return true;
  const inorm = input.toLowerCase().replace(/\s+/g,'');
  const cnorm = candidate.toLowerCase();
  for(const ch of inorm){
    if(ch === '(' || ch === ')' || ch === ',' || ch === ':' || ch === ';') continue;
    if(!cnorm.includes(ch)) return false;
  }
  return true;
}

function fuzzyScore(input, candidate){
  if(!matchesAllChars(input, candidate)) return 0;
  const inorm = normalizeForMatch(input);
  const cnorm = normalizeForMatch(candidate);
  if(cnorm === inorm) return 1000;
  if(candidate.toLowerCase().startsWith(input.toLowerCase())) return 900;
  if(cnorm.startsWith(inorm)) return 850;
  if(candidate.toLowerCase().includes(input.toLowerCase())) return 700;
  if(cnorm.includes(inorm)) return 650;
  const parts = candidate.split(/[-_]/).map(p=>p.toLowerCase());
  for(const p of parts){
    if(p.startsWith(input.toLowerCase())) return 800;
  }
  const dist = levenshtein(inorm, cnorm);
  const len = Math.max(cnorm.length,1);
  const score = Math.max(0, 600 - Math.floor((dist/len)*600));
  return score;
}

function obtenerSugerencias(word){
  const pool = [...new Set([...CSS_PROPERTIES, ...SPECIAL_SELECTORS, ...historial])];
  if(!word || word.trim()==='') return pool.slice(0,50);
  const candidates = pool.map(item=>({ item, score: fuzzyScore(word, item) }));
  candidates.sort((a,b)=>b.score - a.score || a.item.localeCompare(b.item));
  return candidates.filter(c=>c.score>0).slice(0,50).map(c=>c.item);
}

let popupDiv=null;
let popupVisible=false;
let sugerenciasActuales=[];
let indiceSeleccionado=0;
let rangoDesde=0;
let rangoHasta=0;
let timeoutAutocomplete=null;
let _suppressAutoClose=false;

function crearPopup(){
  if(popupDiv) return;
  popupDiv=document.createElement('div');
  popupDiv.className='cm-autocomplete-popup';
  popupDiv.style.position='fixed';
  popupDiv.style.display='none';
  popupDiv.style.zIndex='10000';
  popupDiv.style.background='#252526';
  popupDiv.style.border='1px solid #3e3e42';
  popupDiv.style.borderRadius='6px';
  popupDiv.style.maxHeight='220px';
  popupDiv.style.overflowY='auto';
  popupDiv.style.boxShadow='0 6px 18px rgba(0,0,0,0.6)';
  popupDiv.style.fontFamily='monospace';
  popupDiv.style.fontSize='13px';
  popupDiv.style.minWidth='160px';
  popupDiv.style.boxSizing='border-box';
  popupDiv.style.pointerEvents='auto';
  popupDiv.style.transition='opacity 160ms ease';
  document.body.appendChild(popupDiv);
}

function posicionarPopupEnCoords(coords){
  if(!popupDiv||!coords) return;
  popupDiv.style.display='block';
  const left=Math.max(8, coords.left);
  let top=coords.bottom+6;
  const popupRect=popupDiv.getBoundingClientRect();
  if(top+popupRect.height>window.innerHeight-8){
    top=coords.top-popupRect.height-6;
    if(top<8) top=8;
  }
  const maxLeft=window.innerWidth-popupRect.width-8;
  popupDiv.style.left=`${Math.min(left,maxLeft)}px`;
  popupDiv.style.top=`${top}px`;
}

function animateItemsIn(items){
  requestAnimationFrame(()=>{
    for(const it of items){
      it.style.opacity='1';
      it.style.transform='translateY(0)';
    }
  });
}

function mostrarPopup(view, desde, hasta, palabra, sugerencias){
  crearPopup();
  sugerenciasActuales=sugerencias;
  indiceSeleccionado=0;
  rangoDesde=desde;
  rangoHasta=hasta;
  const oldChildren = Array.from(popupDiv.children);
  if(oldChildren.length){
    for(const c of oldChildren){
      c.style.transition='opacity 120ms ease, transform 120ms ease';
      c.style.opacity='0';
      c.style.transform='translateY(-6px)';
    }
    setTimeout(()=>{ popupDiv.innerHTML=''; buildItems(); }, 120);
  } else {
    popupDiv.innerHTML='';
    buildItems();
  }
  function buildItems(){
    const itemsCreated = [];
    sugerencias.forEach((opt,idx)=>{
      const item=document.createElement('div');
      item.textContent=opt;
      item.className='cm-autocomplete-item'+(idx===0?' selected':'');
      item.dataset.idx=idx;
      item.style.padding='6px 12px';
      item.style.cursor='pointer';
      item.style.color='#cccccc';
      item.style.whiteSpace='nowrap';
      item.style.opacity='0';
      item.style.transform='translateY(6px)';
      item.style.transition='opacity 160ms cubic-bezier(.2,.8,.2,1), transform 160ms cubic-bezier(.2,.8,.2,1)';
      item.addEventListener('mouseenter',()=>{ indiceSeleccionado=idx; resaltarItemPopup(); });
      item.addEventListener('mousedown',(e)=>{ e.preventDefault(); completarSeleccion(view,opt); });
      item.addEventListener('touchstart',(e)=>{ e.preventDefault(); indiceSeleccionado=idx; resaltarItemPopup(); }, { passive:false });
      item.addEventListener('touchend',(e)=>{ e.preventDefault(); completarSeleccion(view,opt); }, { passive:false });
      popupDiv.appendChild(item);
      itemsCreated.push(item);
    });
    resaltarItemPopup();
    const coords=view.coordsAtPos(desde);
    if(coords){
      posicionarPopupEnCoords(coords);
    } else {
      const rect=view.dom.getBoundingClientRect();
      popupDiv.style.display='block';
      popupDiv.style.left=`${rect.left+8}px`;
      popupDiv.style.top=`${rect.top+8}px`;
    }
    animateItemsIn(itemsCreated);
  }
  popupVisible=true;
}

function resaltarItemPopup(){
  if(!popupDiv) return;
  const items=popupDiv.querySelectorAll('.cm-autocomplete-item');
  items.forEach((item,idx)=>{
    if(idx===indiceSeleccionado){
      item.classList.add('selected');
      item.style.background='#094771';
      item.style.color='#ffffff';
    } else {
      item.classList.remove('selected');
      item.style.background='';
      item.style.color='#cccccc';
    }
  });
  const selected=items[indiceSeleccionado];
  if(selected) selected.scrollIntoView({ block:'nearest' });
}

const SPECIAL_BLOCKS=new Set(SPECIAL_SELECTORS);

const FUNCTION_TEMPLATES = {
  'linear-gradient': 'linear-gradient(90deg, #000000, #ffffff)',
  'radial-gradient': 'radial-gradient(circle, #000000, #ffffff)',
  'conic-gradient': 'conic-gradient(from 0deg, #000000, #ffffff)',
  'repeating-linear-gradient': 'repeating-linear-gradient(90deg, #000000 0px, #ffffff 10px)',
  'repeating-radial-gradient': 'repeating-radial-gradient(circle, #000000 0px, #ffffff 10px)',
  'rgba': 'rgba(0,0,0,1)',
  'rgb': 'rgb(0,0,0)',
  'hsla': 'hsla(0,0%,0%,1)',
  'hsl': 'hsl(0,0%,0%)',
  'var': 'var(--my-var)',
  'calc': 'calc(100% - 10px)'
};

function completarSeleccion(view,texto){
  if(!popupVisible) return;
  const lower=texto.toLowerCase();
  if(SPECIAL_BLOCKS.has(lower)){
    const insertText=`${texto} {}`;
    view.dispatch({
      changes:{ from:rangoDesde, to:rangoHasta, insert:insertText },
      selection:{ anchor:rangoDesde+texto.length+2 }
    });
    ocultarPopup();
    view.focus();
    ensureCursorCentered(view);
    return;
  }
  if(FUNCTION_TEMPLATES[lower]){
    const template = FUNCTION_TEMPLATES[lower];
    const insertText = template;
    view.dispatch({
      changes:{ from:rangoDesde, to:rangoHasta, insert:insertText },
      selection:{ anchor: rangoDesde + insertText.indexOf('(') + 1 }
    });
    ocultarPopup();
    view.focus();
    ensureCursorCentered(view);
    return;
  }
  if(CSS_PROPERTIES.includes(lower)){
    const insertText=`${texto}: ;`;
    view.dispatch({
      changes:{ from:rangoDesde, to:rangoHasta, insert:insertText },
      selection:{ anchor:rangoDesde+texto.length+2 }
    });
    ocultarPopup();
    view.focus();
    ensureCursorCentered(view);
    return;
  }
  view.dispatch({
    changes:{ from:rangoDesde, to:rangoHasta, insert:texto },
    selection:{ anchor:rangoDesde+texto.length }
  });
  ocultarPopup();
  view.focus();
  ensureCursorCentered(view);
}

function ocultarPopup(){
  if(!popupDiv) return;
  popupDiv.style.display='none';
  popupVisible=false;
  sugerenciasActuales=[];
  indiceSeleccionado=0;
}

function autoClosePairAtPos(view, from, to, open, close){
  view.dispatch({
    changes:{ from:from+1, to:from+1, insert: close },
    selection:{ anchor: from+1 }
  });
}

function autoClosePairInsertClose(view, pos, close){
  view.dispatch({
    changes:{ from: pos+1, to: pos+1, insert: close },
    selection:{ anchor: pos+1 }
  });
}

function handleAutoCloseForTransaction(view,tr,startState){
  if(_suppressAutoClose) return;
  try{
    const isType = (typeof tr.isUserEvent==='function' && tr.isUserEvent('input.type'));
    const isDeleteBackward = (typeof tr.isUserEvent==='function' && tr.isUserEvent('delete.backward'));
    const isDeleteForward = (typeof tr.isUserEvent==='function' && tr.isUserEvent('delete.forward'));
    if(!(isType || isDeleteBackward || isDeleteForward)) return;
    tr.changes.iterChanges((fromA,toA,fromB,toB,inserted)=>{
      const text=inserted.toString();
      const removedLen = toA - fromA;
      if(text && text.length===1){
        const ch=text;
        const pairs={ '{':'}','(':')','[':']','"':'"',"'" : "'", ':':';' };
        if(!(ch in pairs)) return;
        const close=pairs[ch];
        const pos=fromB;
        const nextChar=view.state.doc.sliceString(pos+1,pos+2);
        _suppressAutoClose=true;
        if(ch===':'){
          const after=view.state.doc.sliceString(pos+1,pos+2);
          if(after===';'){
            view.dispatch({ selection:{ anchor: pos+1 } });
          } else {
            view.dispatch({ changes:{ from: pos+1, to: pos+1, insert: ';' }, selection:{ anchor: pos+1 } });
          }
        } else {
          const after=view.state.doc.sliceString(pos+1,pos+2);
          if(after===close){
            view.dispatch({ selection:{ anchor: pos+1 } });
          } else {
            view.dispatch({ changes:{ from: pos+1, to: pos+1, insert: close }, selection:{ anchor: pos+1 } });
          }
        }
        Promise.resolve().then(()=>{ _suppressAutoClose=false; });
      } else if(!text && removedLen===1){
        if(!startState && !tr.startState) return;
        const sState = startState || tr.startState;
        const removedCharOld = sState.doc.sliceString(fromA,toA);
        const opensMap = { '{':'}','(':')','[':']','"':'"',"'" : "'", ':':';' };
        if(removedCharOld && opensMap[removedCharOld]){
          const expectedClose = opensMap[removedCharOld];
          const nextChar = view.state.doc.sliceString(fromB, fromB+1);
          if(nextChar===expectedClose){
            _suppressAutoClose=true;
            view.dispatch({ changes:{ from: fromB, to: fromB+1, insert: '' } });
            Promise.resolve().then(()=>{ _suppressAutoClose=false; });
          }
        }
      }
    });
  }catch(e){
    _suppressAutoClose=false;
  }
}

function scheduleAutocomplete(view,pos){
  if(timeoutAutocomplete) clearTimeout(timeoutAutocomplete);
  timeoutAutocomplete=setTimeout(()=>{
    const line=view.state.doc.lineAt(pos);
    const textBeforeCursor=line.text.slice(0,pos-line.from);
    const match=textBeforeCursor.match(/([a-zA-Z#][\w-()#,.\s%]*)$/);
    if(match&&match[1].length>=1){
      const word=match[1].trim();
      const desde=pos-word.length;
      const sugerencias=obtenerSugerencias(word);
      if(sugerencias.length>0){
        mostrarPopup(view,desde,pos,word,sugerencias);
      } else {
        ocultarPopup();
      }
    } else {
      ocultarPopup();
    }
  },100);
}

function ensureCursorCentered(view){
  try{
    const pos=view.state.selection.main.head;
    const coords=view.coordsAtPos(pos);
    if(!coords) return;
    const editorRect=view.dom.getBoundingClientRect();
    const scrollEl=view.scrollDOM||view.dom;
    const caretRelativeTop=coords.top-editorRect.top+scrollEl.scrollTop;
    const center=(view.dom.clientHeight/2);
    const target=caretRelativeTop-center;
    if(typeof scrollEl.scrollTo==='function'){
      scrollEl.scrollTo({ top: target, behavior: 'smooth' });
    } else {
      scrollEl.scrollTop=target;
    }
  }catch(e){}
}

function attachPopupScrollHandlers(view){
  try{
    const scrollEl=view.scrollDOM||view.dom;
    if(scrollEl && !scrollEl._cmPopupHandlerAttached){
      scrollEl.addEventListener('scroll',()=>{
        if(popupVisible){
          const pos=view.state.selection.main.head;
          const coords=view.coordsAtPos(pos);
          posicionarPopupEnCoords(coords);
        }
      },{ passive:true });
      scrollEl._cmPopupHandlerAttached=true;
    }
  }catch(e){}
  if(!window._cmPopupWindowHandlerAttached){
    window.addEventListener('scroll',()=>{
      if(popupVisible && view){
        const pos=view.state.selection.main.head;
        const coords=view.coordsAtPos(pos);
        posicionarPopupEnCoords(coords);
      }
    },{ passive:true });
    window._cmPopupWindowHandlerAttached=true;
  }
}

function handleGlobalKeyNavigation(event, view){
  if(!popupVisible) return false;
  const key = event.key;
  if(key === 'ArrowDown'){
    event.preventDefault();
    if(sugerenciasActuales.length){
      indiceSeleccionado=(indiceSeleccionado+1)%sugerenciasActuales.length;
      resaltarItemPopup();
    }
    return true;
  }
  if(key === 'ArrowUp'){
    event.preventDefault();
    if(sugerenciasActuales.length){
      indiceSeleccionado=(indiceSeleccionado-1+sugerenciasActuales.length)%sugerenciasActuales.length;
      resaltarItemPopup();
    }
    return true;
  }
  if(key === 'Enter'){
    event.preventDefault();
    if(sugerenciasActuales.length){
      completarSeleccion(view,sugerenciasActuales[indiceSeleccionado]);
      return true;
    }
  }
  if(key === 'Tab'){
    if(sugerenciasActuales.length){
      event.preventDefault();
      completarSeleccion(view,sugerenciasActuales[indiceSeleccionado]);
      return true;
    }
  }
  return false;
}

export class EditorCSSEditor{
  constructor(container,onUpdate,onError){
    this.container=container;
    this.onUpdate=onUpdate;
    this.onError=onError;
    this.view=null;
    this.init();
  }
  init(){
    this.container.innerHTML='';
    const editorDiv=document.createElement('div');
    editorDiv.className='cm-editor-wrapper';
    editorDiv.style.height='100%';
    editorDiv.style.width='100%';
    this.container.appendChild(editorDiv);
    const self=this;
    const startState=EditorState.create({
      doc:'',
      extensions:[
        css(),
        oneDark,
        history(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
          { key: "Ctrl-Space", run: (view) => {
              const pos=view.state.selection.main.head;
              const line=view.state.doc.lineAt(pos);
              const textBeforeCursor=line.text.slice(0,pos-line.from);
              const match=textBeforeCursor.match(/[\w-()#,.\s%]+$/);
              if(match && match[0].length>0){
                const word=match[0].trim();
                const desde=pos-word.length;
                const sugerencias=obtenerSugerencias(word);
                if(sugerencias.length>0){
                  mostrarPopup(view,desde,pos,word,sugerencias);
                  return true;
                }
              }
              ocultarPopup();
              return false;
            }
          },
          { key: "ArrowDown", run: (view) => {
              if(popupVisible && sugerenciasActuales.length){
                indiceSeleccionado=(indiceSeleccionado+1)%sugerenciasActuales.length;
                resaltarItemPopup();
                return true;
              }
              return false;
            }
          },
          { key: "ArrowUp", run: (view) => {
              if(popupVisible && sugerenciasActuales.length){
                indiceSeleccionado=(indiceSeleccionado-1+sugerenciasActuales.length)%sugerenciasActuales.length;
                resaltarItemPopup();
                return true;
              }
              return false;
            }
          },
          { key: "Enter", run: (view) => {
              if(popupVisible && sugerenciasActuales.length){
                completarSeleccion(view,sugerenciasActuales[indiceSeleccionado]);
                return true;
              }
              return false;
            }
          },
          { key: "Tab", run: (view) => {
              if(popupVisible && sugerenciasActuales.length){
                completarSeleccion(view,sugerenciasActuales[indiceSeleccionado]);
                return true;
              }
              return false;
            }
          },
          { key: "Escape", run: (view) => {
              if(popupVisible){
                ocultarPopup();
                return true;
              }
              return false;
            }
          }
        ]),
        EditorView.lineWrapping,
        EditorView.domEventHandlers({
          keydown:(event,view)=>{
            const k=event.key;
            if(k==='Escape' && popupVisible){
              ocultarPopup();
              return true;
            }
            if((k==='ArrowDown' || k==='ArrowUp' || k==='Enter' || k==='Tab') && popupVisible){
              return handleGlobalKeyNavigation(event, view);
            }
            return false;
          }
        }),
        EditorView.updateListener.of((update)=>{
          if(update.docChanged){
            const newValue=update.state.doc.toString();
            actualizarHistorial(newValue);
            if(self.onUpdate) self.onUpdate(newValue);
            self.validateCSS(newValue);
            for(const tr of update.transactions){
              handleAutoCloseForTransaction(self.view,tr, update.startState);
            }
            if(update.transactions.some(tr=>typeof tr.isUserEvent==='function' && tr.isUserEvent("input.type"))){
              const pos=update.state.selection.main.head;
              scheduleAutocomplete(self.view,pos);
              if(popupVisible){
                const coords=self.view.coordsAtPos(pos);
                posicionarPopupEnCoords(coords);
              }
              ensureCursorCentered(self.view);
            } else {
              ocultarPopup();
            }
          }
          if(update.selectionSet){
            ensureCursorCentered(self.view);
          }
        }),
      ],
    });
    this.view=new EditorView({ state:startState, parent:editorDiv });
    attachPopupScrollHandlers(this.view);
    window.addEventListener('resize',()=>{
      if(popupVisible && this.view){
        const pos=this.view.state.selection.main.head;
        const coords=this.view.coordsAtPos(pos);
        posicionarPopupEnCoords(coords);
      }
    });
    document.addEventListener('mousedown',(e)=>{
      if(!popupDiv) return;
      if(!popupDiv.contains(e.target) && !this.view.dom.contains(e.target)){
        ocultarPopup();
      }
    });
    editorDiv.addEventListener('pointerdown',(e)=>{
      if(!popupDiv) return;
      if(!popupDiv.contains(e.target)){
        ocultarPopup();
      }
    }, { passive:true });
    window.addEventListener('keydown',(e)=>{
      if(!this.view) return;
      if(popupVisible) handleGlobalKeyNavigation(e, this.view);
    }, { passive:false });
  }
  setValue(value){
    if(this.view && value!==this.getValue()){
      this.view.dispatch({ changes:{ from:0, to:this.view.state.doc.length, insert:value||'' } });
    }
  }
  getValue(){
    return this.view?this.view.state.doc.toString():'';
  }
  validateCSS(cssText){
    if(!this.onError) return;
    const errors=[];
    const openBraces=(cssText.match(/{/g)||[]).length;
    const closeBraces=(cssText.match(/}/g)||[]).length;
    if(openBraces!==closeBraces){
      errors.push({ line:0, message:`Llaves desbalanceadas: ${openBraces} abiertas, ${closeBraces} cerradas` });
    }
    this.onError(errors);
  }
  destroy(){
    if(this.view){
      this.view.destroy();
      this.view=null;
    }
    if(popupDiv){
      popupDiv.remove();
      popupDiv=null;
    }
    if(timeoutAutocomplete) clearTimeout(timeoutAutocomplete);
  }
}