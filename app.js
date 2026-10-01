const $ = (s) => document.querySelector(s);
const editor = $('#editor'), preview = $('#preview'), panes = $('#panes');
const starter = `# Local MD'ye hoş geldin 👋\n\nMarkdown dosyalarını **tamamen cihazında** aç, düzenle ve oku. Başlamak için üstteki **Dosya aç** düğmesini kullanabilir veya bir \`.md\` dosyasını pencereye sürükleyebilirsin.\n\n## Neler yapabilirsin?\n\n- [x] Canlı Markdown önizleme\n- [x] Dosya açma ve sürükle-bırak\n- [x] İçindekiler ve belge araması\n- [x] Koyu / açık tema\n- [x] Markdown, HTML ve PDF çıktısı\n- [x] Otomatik yerel taslak kaydı\n\n> Gizlilik notu: Dosyaların hiçbir sunucuya gönderilmez. Her şey bu tarayıcı sekmesinde işlenir.\n\n### Kod örneği\n\n\`\`\`javascript\nconst güvenli = "Dosyam yerelde kalıyor";\nconsole.log(güvenli);\n\`\`\`\n\n| Özellik | Durum |\n| --- | :---: |\n| Çevrimdışı kullanım | ✓ |\n| Kurulum gerektirmez | ✓ |\n| Mobil uyum | ✓ |\n\n---\n\nİyi okumalar.\n`;

let syncScroll = true, renderTimer, toastTimer;
const tabState = { tabs: [], activeId: null, untitled: 1 };
const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const activeTab = () => tabState.tabs.find(tab => tab.id === tabState.activeId);
const escapeHtml = (s='') => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify = (s) => s.toLowerCase().replace(/<[^>]*>/g,'').replace(/[^\p{L}\p{N}\s-]/gu,'').trim().replace(/\s+/g,'-') || 'bolum';
const inline = (s) => {
  s = escapeHtml(s);
  s = s.replace(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g, '<img src="$2" alt="$1" title="$3" loading="lazy">');
  s = s.replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g, '<a href="$2" title="$3" target="_blank" rel="noopener noreferrer">$1</a>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>').replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>').replace(/~~([^~]+)~~/g, '<del>$1</del>');
  return s;
};

function markdownToHtml(md) {
  const lines = md.replace(/\r\n?/g,'\n').split('\n'); let html='', inCode=false, codeLang='', code=[], listType=null, inQuote=false, para=[];
  const flushPara=()=>{if(para.length){html+=`<p>${inline(para.join(' '))}</p>`;para=[]}};
  const closeList=()=>{if(listType){html+=`</${listType}>`;listType=null}};
  const closeQuote=()=>{if(inQuote){flushPara();closeList();html+='</blockquote>';inQuote=false}};
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    const fence=line.match(/^\s*```\s*([\w-]*)/);
    if(fence){flushPara();closeList();closeQuote();if(!inCode){inCode=true;codeLang=fence[1];code=[]}else{html+=`<pre><code class="language-${escapeHtml(codeLang)}">${escapeHtml(code.join('\n'))}</code></pre>`;inCode=false}continue}
    if(inCode){code.push(line);continue}
    if(/^\s*\|.*\|\s*$/.test(line)&&i+1<lines.length&&/^\s*\|?\s*:?-+/.test(lines[i+1])){flushPara();closeList();closeQuote();const heads=line.trim().replace(/^\||\|$/g,'').split('|');const aligns=lines[++i].trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim());let rows=[];while(i+1<lines.length&&/^\s*\|.*\|\s*$/.test(lines[i+1]))rows.push(lines[++i].trim().replace(/^\||\|$/g,'').split('|'));html+='<table><thead><tr>'+heads.map((h,j)=>`<th style="text-align:${aligns[j]?.startsWith(':')&&aligns[j]?.endsWith(':')?'center':aligns[j]?.endsWith(':')?'right':'left'}">${inline(h.trim())}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map((c,j)=>`<td style="text-align:${aligns[j]?.startsWith(':')&&aligns[j]?.endsWith(':')?'center':aligns[j]?.endsWith(':')?'right':'left'}">${inline(c.trim())}</td>`).join('')+'</tr>').join('')+'</tbody></table>';continue}
    const heading=line.match(/^(#{1,6})\s+(.+)$/);if(heading){flushPara();closeList();closeQuote();const level=heading[1].length,text=heading[2].replace(/\s+#+\s*$/,'');html+=`<h${level} id="${slugify(text)}">${inline(text)}</h${level}>`;continue}
    if(/^\s*(---+|___+|\*\*\*+)\s*$/.test(line)){flushPara();closeList();closeQuote();html+='<hr>';continue}
    const quote=line.match(/^>\s?(.*)$/);if(quote){flushPara();closeList();if(!inQuote){html+='<blockquote>';inQuote=true}if(quote[1])para.push(quote[1]);continue}else closeQuote();
    const item=line.match(/^\s*([-+*]|\d+[.)])\s+(.+)$/);if(item){flushPara();const type=/\d/.test(item[1])?'ol':'ul';if(listType!==type){closeList();html+=`<${type}>`;listType=type}let content=item[2],task=content.match(/^\[([ xX])\]\s*(.*)/);if(task)content=`<input type="checkbox" disabled ${task[1]!==' '?'checked':''}>${inline(task[2])}`;else content=inline(content);html+=`<li>${content}</li>`;continue}else closeList();
    if(!line.trim()){flushPara();continue}para.push(line.trim());
  }
  if(inCode)html+=`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`;flushPara();closeList();closeQuote();return html;
}

function render(){const md=editor.value;preview.innerHTML=markdownToHtml(md);buildOutline();const words=(md.trim().match(/\S+/g)||[]).length;$('#wordCount').textContent=words;$('#charCount').textContent=md.length.toLocaleString('tr-TR');$('#readTime').textContent=`${Math.max(1,Math.ceil(words/220))} dk`;$('#lineCount').textContent=`${md.split('\n').length} satır`;$('#renderStatus').textContent='Güncel';$('#saveStatus').textContent=activeTab()?.dirty?'Kaydedilmedi':'Kaydedildi';}
function scheduleRender(){const tab=activeTab();if(tab){tab.content=editor.value;tab.name=normalizeName($('#documentTitle').value);tab.dirty=true;renderTabs()}$('#renderStatus').textContent='İşleniyor…';$('#saveStatus').textContent='Değiştirildi';clearTimeout(renderTimer);renderTimer=setTimeout(render,120)}
function buildOutline(){const items=[...preview.querySelectorAll('h1,h2,h3')];$('#outline').innerHTML=items.length?items.map(h=>`<a href="#${h.id}" class="level-${h.tagName[1]}">${h.textContent}</a>`).join(''):'<div class="outline-empty">Başlık eklediğinde belge yapısı burada görünecek.</div>';}
function toast(msg){clearTimeout(toastTimer);$('#toast').textContent=msg;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),1900)}
function setView(view){panes.className=`panes ${view}`;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));localStorage.setItem('localmd-view',view)}
function normalizeName(name){const clean=(name||'isimsiz.md').trim().replace(/[\\/]/g,'-');return /\.md$/i.test(clean)?clean:`${clean}.md`}
function renderTabs(){
  $('#tabs').replaceChildren(...tabState.tabs.map(tab=>{
    const item=document.createElement('div');item.className=`tab${tab.id===tabState.activeId?' active':''}`;item.role='tab';item.ariaSelected=String(tab.id===tabState.activeId);item.title=tab.name;
    const label=document.createElement('span');label.className='tab-name';label.textContent=tab.name;
    const dirty=document.createElement('span');dirty.className=tab.dirty?'tab-dirty':'';
    const close=document.createElement('button');close.className='tab-close';close.type='button';close.textContent='×';close.title='Sekmeyi kapat';close.onclick=e=>{e.stopPropagation();closeTab(tab.id)};
    item.append(label,dirty,close);item.onclick=()=>activateTab(tab.id);item.onauxclick=e=>{if(e.button===1)closeTab(tab.id)};return item;
  }))
}
function createTab(text='# Yeni belge\n\nBuradan yazmaya başla…\n',name){
  const finalName=normalizeName(name||`isimsiz${tabState.untitled++===1?'':`-${tabState.untitled-1}`}.md`);
  const tab={id:makeId(),name:finalName,content:text,dirty:true,persisted:false};tabState.tabs.push(tab);activateTab(tab.id);return tab;
}
function activateTab(id){
  const current=activeTab();if(current&&current.id!==id){current.content=editor.value;current.name=normalizeName($('#documentTitle').value)}
  tabState.activeId=id;const tab=activeTab();if(!tab)return;
  editor.value=tab.content;$('#documentTitle').value=tab.name;renderTabs();render();editor.focus();
}
function closeTab(id){
  const index=tabState.tabs.findIndex(tab=>tab.id===id);if(index<0)return;const tab=tabState.tabs[index];
  if(tab.dirty&&!confirm(`“${tab.name}” sekmesindeki kaydedilmemiş değişiklikler silinsin mi?`))return;
  tabState.tabs.splice(index,1);if(tabState.activeId===id){const next=tabState.tabs[index]||tabState.tabs[index-1];if(next)activateTab(next.id);else createTab()}else renderTabs();
}
function setDocument(text,name='isimsiz.md',persisted=false){
  const finalName=normalizeName(name);const existing=tabState.tabs.find(tab=>persisted&&tab.persisted&&tab.name===finalName);
  if(existing){activateTab(existing.id);return}
  const tab={id:makeId(),name:finalName,content:text,dirty:!persisted,persisted};tabState.tabs.push(tab);activateTab(tab.id);toast(`${finalName} açıldı`);
}
async function saveActive(){
  const tab=activeTab();if(!tab)return;tab.content=editor.value;tab.name=normalizeName($('#documentTitle').value);$('#documentTitle').value=tab.name;
  try{const response=await fetch(`/api/documents/${encodeURIComponent(tab.name)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:tab.content})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Kaydedilemedi');tab.name=data.name;tab.persisted=true;tab.dirty=false;renderTabs();render();toast(`${tab.name} documents/markdown_viewer/ klasörüne kaydedildi`)}catch(error){toast(error.message||'Kaydedilemedi')}
}
async function openProjectFile(name){
  const existing=tabState.tabs.find(tab=>tab.persisted&&tab.name===name);if(existing){activateTab(existing.id);$('#projectDialog').close();return}
  try{const response=await fetch(`/api/documents/${encodeURIComponent(name)}`);const data=await response.json();if(!response.ok)throw new Error(data.error||'Dosya açılamadı');setDocument(data.content,data.name,true);$('#projectDialog').close()}catch(error){toast(error.message||'Dosya açılamadı')}
}
async function showProjectFiles(){
  const box=$('#projectFiles');box.innerHTML='<div class="project-empty">Dosyalar yükleniyor…</div>';$('#projectDialog').showModal();
  try{const response=await fetch('/api/documents');const files=await response.json();if(!response.ok)throw new Error(files.error||'Dosyalar alınamadı');box.replaceChildren();if(!files.length){box.innerHTML='<div class="project-empty">Henüz kayıtlı dosya yok.</div>';return}files.forEach(file=>{const button=document.createElement('button');button.className='project-file';button.type='button';const label=document.createElement('span');label.textContent=file.name;button.append(label);button.onclick=()=>openProjectFile(file.name);box.append(button)})}catch(error){box.innerHTML=`<div class="project-empty">${escapeHtml(error.message)}</div>`}
}
function download(content,name,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function htmlDocument(){return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml($('#documentTitle').value)}</title><style>body{max-width:820px;margin:60px auto;padding:0 24px;font:17px/1.7 Georgia,serif;color:#282824}h1,h2,h3{font-family:Arial,sans-serif;line-height:1.25}h2{border-bottom:1px solid #ddd;padding-bottom:.3em}pre,code{font-family:monospace;background:#f1f1ee}code{padding:.15em .35em}pre{padding:18px;overflow:auto}blockquote{border-left:3px solid #d96745;padding-left:18px;color:#666}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}img{max-width:100%}a{color:#bd5132}</style></head><body>${markdownToHtml(editor.value)}</body></html>`}

async function exportPdf(button){
  if(!window.html2canvas||!window.jspdf?.jsPDF){toast('PDF bileşenleri yüklenemedi');return}
  const buttons=[...document.querySelectorAll('[data-export]')],label=button.querySelector('span'),oldLabel=label.textContent;
  buttons.forEach(b=>b.disabled=true);button.classList.add('loading');label.textContent='PDF hazırlanıyor…';
  const capture=document.createElement('div');capture.className='pdf-capture';
  const page=document.createElement('article');page.className='markdown-body pdf-render';page.innerHTML=markdownToHtml(editor.value);capture.appendChild(page);document.body.appendChild(capture);
  try{
    await document.fonts.ready;
    const {jsPDF}=window.jspdf,pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    const pageW=210,pageH=297,margin=10,imgW=pageW-margin*2,usableH=pageH-margin*2,maxSlicePx=capture.clientHeight,slices=computePageSlices(page,maxSlicePx),pages=slices.length;
    for(let i=0;i<pages;i++){
      const slice=slices[i];label.textContent=`PDF hazırlanıyor… ${i+1}/${pages}`;capture.style.height=`${maxSlicePx}px`;page.style.transform=`translateY(-${slice.start}px)`;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const rawCanvas=await html2canvas(capture,{scale:1.5,backgroundColor:'#ffffff',useCORS:true,logging:false,width:capture.clientWidth,height:maxSlicePx,windowWidth:capture.clientWidth,windowHeight:maxSlicePx});
      const canvas=cropCanvasTop(rawCanvas,Math.round(rawCanvas.height*(slice.height/maxSlicePx)));
      if(i)pdf.addPage();pdf.addImage(canvas.toDataURL('image/jpeg',.92),'JPEG',margin,margin,imgW,usableH*(slice.height/maxSlicePx),undefined,'FAST');pdf.setFontSize(8);pdf.setTextColor(140);pdf.text(`${i+1} / ${pages}`,pageW-margin,pageH-4,{align:'right'});
    }
    const file=($('#documentTitle').value||'belge').replace(/\.(md|markdown)$/i,'')+'.pdf';pdf.save(file);toast(`${file} indirildi`);
  }catch(error){console.error('PDF export failed',error);toast('PDF oluşturulamadı')}
  finally{capture.remove();buttons.forEach(b=>b.disabled=false);button.classList.remove('loading');label.textContent=oldLabel}
}

function computePageSlices(page,maxHeight){
  const base=page.getBoundingClientRect().top,total=page.scrollHeight;
  const boundaries=[...page.querySelectorAll('h1,h2,h3,h4,p,li,tr,pre,blockquote,hr')].map(el=>Math.round(el.getBoundingClientRect().bottom-base)).filter(y=>y>0&&y<total).sort((a,b)=>a-b);
  const slices=[];let start=0;
  while(start<total){const desired=Math.min(start+maxHeight,total);let end=desired;if(desired<total){const min=start+maxHeight*.5;for(const y of boundaries)if(y>=min&&y<=desired-16)end=y;if(end<=start+80)end=desired}slices.push({start,height:end-start});start=end}
  return slices;
}

function cropCanvasTop(source,height){const target=document.createElement('canvas');target.width=source.width;target.height=Math.max(1,Math.min(source.height,height));target.getContext('2d').drawImage(source,0,0,target.width,target.height,0,0,target.width,target.height);return target}

editor.addEventListener('input',scheduleRender);editor.addEventListener('scroll',()=>{if(syncScroll){const max=editor.scrollHeight-editor.clientHeight;preview.scrollTop=max?(editor.scrollTop/max)*(preview.scrollHeight-preview.clientHeight):0}});
$('#outline').addEventListener('click',e=>{const a=e.target.closest('a');if(a){e.preventDefault();preview.querySelector(a.getAttribute('href'))?.scrollIntoView({behavior:'smooth'})}});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$('#openBtn').onclick=()=>$('#fileInput').click();$('#fileInput').onchange=async e=>{for(const file of e.target.files){const text=await file.text();setDocument(text,file.name)}e.target.value=''};
$('#newBtn').onclick=()=>createTab();$('#addTabBtn').onclick=()=>createTab();$('#projectBtn').onclick=showProjectFiles;
$('#saveBtn').onclick=saveActive;
$('#exportBtn').onclick=()=>$('#exportDialog').showModal();$('#helpBtn').onclick=()=>$('#helpDialog').showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('[data-export]').forEach(b=>b.onclick=async()=>{const type=b.dataset.export;if(type==='md')download(editor.value,normalizeName($('#documentTitle').value),'text/markdown;charset=utf-8');if(type==='html')download(htmlDocument(),($('#documentTitle').value||'belge').replace(/\.(md|markdown)$/i,'')+'.html','text/html;charset=utf-8');if(type==='pdf')await exportPdf(b);b.closest('dialog').close()});
$('#themeBtn').onclick=()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem('localmd-theme',dark?'dark':'light')};
$('#syncBtn').onclick=e=>{syncScroll=!syncScroll;e.currentTarget.classList.toggle('active',syncScroll);toast(syncScroll?'Senkron kaydırma açık':'Senkron kaydırma kapalı')};
$('#copyBtn').onclick=async()=>{await navigator.clipboard.writeText(preview.innerText);toast('Önizleme metni kopyalandı')};
$('#fullscreenBtn').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
$('#sidebarBtn').onclick=()=>{$('#sidebar').classList.add('hidden');$('#reopenSidebarBtn').classList.remove('hidden')};$('#reopenSidebarBtn').onclick=()=>{$('#sidebar').classList.remove('hidden');$('#reopenSidebarBtn').classList.add('hidden')};
$('#searchInput').addEventListener('input',e=>{const q=e.target.value.trim();render();if(q){const walker=document.createTreeWalker(preview,NodeFilter.SHOW_TEXT);const texts=[];while(walker.nextNode())if(!['SCRIPT','STYLE','CODE','PRE'].includes(walker.currentNode.parentElement.tagName))texts.push(walker.currentNode);texts.forEach(n=>{const parts=n.nodeValue.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'gi'));if(parts.length>1){const frag=document.createDocumentFragment();parts.forEach((p,i)=>{const el=i%2?document.createElement('mark'):document.createTextNode(p);el.textContent=p;frag.append(el)});n.replaceWith(frag)}});preview.querySelector('mark')?.scrollIntoView({behavior:'smooth',block:'center'})}});
document.addEventListener('keydown',e=>{const mod=e.metaKey||e.ctrlKey;if(mod&&e.key.toLowerCase()==='o'){e.preventDefault();$('#fileInput').click()}if(mod&&e.key.toLowerCase()==='n'){e.preventDefault();createTab()}if(mod&&e.key.toLowerCase()==='w'){e.preventDefault();closeTab(tabState.activeId)}if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();saveActive()}if(mod&&e.key==='Tab'&&tabState.tabs.length>1){e.preventDefault();const index=tabState.tabs.findIndex(tab=>tab.id===tabState.activeId),direction=e.shiftKey?-1:1;activateTab(tabState.tabs[(index+direction+tabState.tabs.length)%tabState.tabs.length].id)}if(mod&&e.key.toLowerCase()==='f'){e.preventDefault();$('#searchInput').focus()}if(mod&&e.key.toLowerCase()==='b'&&document.activeElement===editor){e.preventDefault();wrapSelection('**','**')}if(mod&&e.key.toLowerCase()==='i'&&document.activeElement===editor){e.preventDefault();wrapSelection('*','*')}if(mod&&e.shiftKey&&e.key.toLowerCase()==='p'){e.preventDefault();const v=panes.classList.contains('split')?'preview':panes.classList.contains('preview')?'edit':'split';setView(v)}});
function wrapSelection(before,after){const s=editor.selectionStart,end=editor.selectionEnd;editor.setRangeText(before+editor.value.slice(s,end)+after,s,end,'select');editor.selectionStart=s+before.length;editor.selectionEnd=end+before.length;scheduleRender()}
let dragDepth=0;window.addEventListener('dragenter',e=>{e.preventDefault();dragDepth++;$('#dropOverlay').classList.add('visible')});window.addEventListener('dragleave',()=>{if(--dragDepth<=0)$('#dropOverlay').classList.remove('visible')});window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('drop',async e=>{e.preventDefault();dragDepth=0;$('#dropOverlay').classList.remove('visible');let opened=0;for(const file of e.dataTransfer.files){if(/\.(md|markdown|mdown|mkd)$/i.test(file.name)||file.type.startsWith('text/')){setDocument(await file.text(),file.name);opened++}}if(!opened)toast('Lütfen bir veya daha fazla Markdown dosyası bırak')});
window.addEventListener('beforeunload',e=>{if(tabState.tabs.some(tab=>tab.dirty)){e.preventDefault();e.returnValue=''}});
$('#documentTitle').addEventListener('input',scheduleRender);document.documentElement.dataset.theme=localStorage.getItem('localmd-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');setView(localStorage.getItem('localmd-view')||'split');setDocument(starter,'hos-geldin.md');
