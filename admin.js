const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);
const fin=p=>Math.round(p.price*(1-(p.discount||0)/100));
const S={user:null,cats:[],prods:[],edit:null,busy:false};
const prevHTML=()=>(S.items||[]).map((it,i)=>`<div class="t ${i?'':'cover'}"><img src="${esc(it.url||it.preview)}"><button data-act="rmimg" data-i="${i}">✕</button><button class="st" data-act="cover" data-i="${i}">★</button>${i?'':'<em>Portada</em>'}</div>`).join('');
function loadImg(src){return new Promise((ok,no)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>ok(i);i.onerror=()=>no(new Error('No se pudo cargar una imagen para la historia'));i.src=src})}
function rr(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}
function wrapT(x,t,cx,y,maxW,lh,maxL){const w=t.split(' ');let l='',n=0;for(const k of w){const tt=l?l+' '+k:k;if(x.measureText(tt).width>maxW&&l){if(++n>=maxL){x.fillText(l+'…',cx,y);return}x.fillText(l,cx,y);y+=lh;l=k}else l=tt}x.fillText(l,cx,y)}
async function uploadStory(p,cover,pid){
  const c=document.createElement('canvas');c.width=1080;c.height=1920;const x=c.getContext('2d');
  x.fillStyle='#eae3cf';x.fillRect(0,0,1080,1920);
  const [ph,lg]=await Promise.all([loadImg(cover),loadImg('logo.png')]);
  x.globalCompositeOperation='multiply';x.drawImage(lg,450,230,180,Math.round(180*lg.height/lg.width));x.globalCompositeOperation='source-over';
  const s=Math.min(ph.width,ph.height);x.save();rr(x,180,450,720,720,36);x.clip();x.drawImage(ph,(ph.width-s)/2,(ph.height-s)/2,s,s,180,450,720,720);x.restore();
  x.textAlign='center';x.fillStyle='#4a3a2e';x.font="700 62px 'DM Sans',sans-serif";wrapT(x,p.name,540,1250,900,76,2);
  x.font="400 36px 'DM Sans',sans-serif";x.fillStyle='#8a7766';x.fillText('Pídelo en '+location.host+location.pathname.replace(/admin\.html$/,''),540,1390);
  const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.9));
  const {error}=await sb.storage.from('products').upload('story-'+pid+'.jpg',blob,{contentType:'image/jpeg',upsert:true,cacheControl:'0'});if(error)throw error}
async function igcall(b){try{const r=await fetch(SUPABASE_URL+'/functions/v1/instagram',{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY},body:JSON.stringify(b)});return await r.json()}catch(e){return{ok:false,error:String(e)}}}
function toast(m){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2600)}
async function refresh(){const [a,b]=await Promise.all([sb.from('categories').select('name').order('created_at'),sb.from('products').select('*').order('created_at',{ascending:false})]);S.cats=(a.data||[]).map(x=>x.name);S.prods=(b.data||[]).map(p=>({...p,price:+p.price,images:p.images||[]}));render()}
async function shrink(f){let i;try{i=await createImageBitmap(f)}catch(e){i=await new Promise((ok,no)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=()=>no(new Error('No se pudo leer la imagen "'+f.name+'". Prueba con otro archivo PNG o JPG.'));im.src=URL.createObjectURL(f)})}
  const w=i.width||i.naturalWidth,h=i.height||i.naturalHeight,k=Math.min(1,1200/Math.max(w,h));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));
  const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(i,0,0,c.width,c.height);
  const b=await new Promise(r=>c.toBlob(r,'image/jpeg',.88));if(!b)throw new Error('No se pudo convertir "'+f.name+'" a JPG');return b}
function render(){
  if(!S.user){$('#root').innerHTML=`<main class="wrap"><div class="panel" style="max-width:380px;margin:60px auto"><div style="text-align:center"><img src="logo.png" style="height:90px;mix-blend-mode:multiply"></div><h2 style="text-align:center">Panel de control</h2><br><div class="f" style="grid-template-columns:1fr"><label>Usuario<input id="em" type="text" autocomplete="username" autocapitalize="none"></label><label>Contraseña<input id="pw" type="password" autocomplete="current-password"></label></div><br><button class="btn" style="width:100%" data-act="login">Entrar</button></div></main>`;return}
  const e=S.edit;
  const form=e?`<div class="panel"><h3>${e.id?'Editar producto':'Nuevo producto'}</h3><br><div class="f"><label class="full">Nombre<input id="f-name" value="${esc(e.name)}"></label><label>Precio (COP)<input id="f-price" type="number" min="0" value="${e.price??''}"></label><label>Descuento (%)<input id="f-disc" type="number" min="0" max="90" value="${e.discount||0}"></label><label>Categoría<select id="f-cat">${S.cats.map(c=>`<option ${c===e.category?'selected':''}>${esc(c)}</option>`).join('')}</select></label><label style="display:flex;gap:8px;align-items:center;flex-direction:row"><input id="f-feat" type="checkbox" ${e.featured?'checked':''}> Mostrar en Destacados</label><label class="full">Instagram<select id="f-ig"><option value="">No publicar en Instagram</option><option value="post">Publicación</option><option value="story">Historia</option><option value="both">Publicación + Historia</option></select></label><label class="full" style="display:flex;gap:8px;align-items:center;flex-direction:row"><input id="f-force" type="checkbox"> Volver a publicar aunque ya esté en Instagram</label><label class="full">Descripción<textarea id="f-desc" rows="4">${esc(e.description)}</textarea></label><label class="full">Imágenes (toca ★ para elegir la portada)<input id="f-files" type="file" accept="image/png,image/jpeg,image/webp,image/*" multiple></label><div class="full prev" id="f-prev">${prevHTML()}</div></div><br><button class="btn" data-act="save" ${S.busy?'disabled':''}>${S.busy?'Guardando…':'Guardar'}</button> <button class="btn ghost" data-act="cancel">Cancelar</button></div>`:'';
  $('#root').innerHTML=`<main class="wrap"><div class="sec"><h2>Panel de control</h2><div><button class="btn" data-act="new">+ Nuevo producto</button> <a class="btn ghost" href="index.html">Ver tienda</a> <button class="btn ghost" data-act="igtest">Probar Instagram</button> <button class="btn ghost" data-act="logout">Salir</button></div></div>${form}
  <div class="panel"><h3>Categorías</h3><div class="chips" style="flex-wrap:wrap;margin-top:10px">${S.cats.map(c=>`<span class="chip">${esc(c)} <a data-act="delcat" data-k="${esc(c)}" style="cursor:pointer;color:var(--red)">✕</a></span>`).join('')}</div><div style="display:flex;gap:8px;margin-top:6px"><input class="search" id="newcat" placeholder="Nueva categoría (ej. Halloween)"><button class="btn sm" data-act="addcat">Agregar</button></div></div>
  <div class="panel"><h3>Productos (${S.prods.length})</h3>${S.prods.map(p=>`<div class="row"><img src="${esc(p.images[0]||'')}"><div class="n"><b>${esc(p.name)}</b> ${p.featured?'★':''}<br><small>${esc(p.category)} · ${fmt(fin(p))}${p.discount?` (−${p.discount}%)`:''}</small></div><button class="btn ghost sm" data-act="edit" data-id="${p.id}">Editar</button> <button class="btn red sm" data-act="del" data-id="${p.id}">Borrar</button></div>`).join('')||'<div class="empty">Sin productos</div>'}</div></main>`}
document.addEventListener('click',async ev=>{
  const el=ev.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,id=el.dataset.id;
  try{
  if(a==='login'){if($('#em').value.trim().toLowerCase()!=='alfredo'||$('#pw').value!=='Alfredo-8')return toast('Usuario o contraseña incorrectos');try{localStorage.setItem('t3d_ok','1')}catch(e){}S.user={};await dbLogin();await refresh()}
  else if(a==='igtest'){const r=await igcall({action:'test'});alert(JSON.stringify(r,null,1))}
  else if(a==='logout'){try{localStorage.removeItem('t3d_ok')}catch(e){}try{await sb.auth.signOut()}catch(e){}S.user=null;render()}
  else if(a==='new'){S.edit={name:'',price:'',discount:0,category:S.cats[0],description:'',images:[],featured:false};S.items=[];render();scrollTo(0,0)}
  else if(a==='edit'){S.edit=JSON.parse(JSON.stringify(S.prods.find(p=>p.id===id)));S.items=(S.edit.images||[]).map(u=>({url:u}));render();scrollTo(0,0)}
  else if(a==='cancel'){S.edit=null;render()}
  else if(a==='rmimg'){S.items.splice(+el.dataset.i,1);$('#f-prev').innerHTML=prevHTML()}
  else if(a==='cover'){const [it]=S.items.splice(+el.dataset.i,1);S.items.unshift(it);$('#f-prev').innerHTML=prevHTML()}
  else if(a==='del'){const pr=S.prods.find(p=>p.id===id);if(confirm('¿Borrar este producto?')){let link='';if(pr&&pr.ig_post_id){const r=await igcall({action:'link',product_id:id});link=r.permalink||''}const {error}=await sb.from('products').delete().eq('id',id);if(error)throw error;toast('Producto borrado');await refresh();if(pr&&pr.ig_post_id)alert('El producto se borró de la tienda, pero Instagram no permite borrar publicaciones desde fuera. Bórrala tú desde la app:\n'+(link||'(abre tu perfil y busca la publicación)'))}}
  else if(a==='addcat'){const v=$('#newcat').value.trim();if(v){const {error}=await sb.from('categories').insert({name:v});if(error)throw error;await refresh()}}
  else if(a==='delcat'){if(confirm('¿Borrar la categoría "'+el.dataset.k+'"? Los productos no se borran.')){const {error}=await sb.from('categories').delete().eq('name',el.dataset.k);if(error)throw error;await refresh()}}
  else if(a==='save'){
    const name=$('#f-name').value.trim(),pr=$('#f-price').value;if(!name||pr===''){return toast('Escribe nombre y precio')}
    el.disabled=true;el.textContent='Subiendo…';const ig=$('#f-ig').value,force=$('#f-force').checked;
    const images=[];for(const it of S.items){if(it.url)images.push(it.url);else{const blob=await shrink(it.file);const path=Date.now()+'-'+Math.random().toString(36).slice(2,7)+'.jpg';const {error}=await sb.storage.from('products').upload(path,blob,{contentType:'image/jpeg',cacheControl:'31536000'});if(error)throw error;images.push(sb.storage.from('products').getPublicUrl(path).data.publicUrl)}}
    const row={name,price:+pr,discount:Math.min(90,Math.max(0,+$('#f-disc').value||0)),category:$('#f-cat').value,description:$('#f-desc').value.trim(),images,featured:$('#f-feat').checked};
    const q=S.edit.id?sb.from('products').update(row).eq('id',S.edit.id):sb.from('products').insert(row).select('id').single();const {data:sd,error}=await q;if(error)throw error;const pid=S.edit.id||(sd&&sd.id);
    S.edit=null;toast('Guardado ✓');await refresh();if(ig){if(ig!=='post'){toast('Preparando la historia…');await uploadStory(row,images[0],pid)}toast('Publicando en Instagram…');const r=await igcall({product_id:pid,modes:ig==='both'?['post','story']:[ig],force});alert(r.ok?'Listo en Instagram.\nPublicado: '+(r.done.join(' y ')||'nada')+(r.skipped.length?'\nOmitido porque ya estaba: '+r.skipped.join(' y '):''):'Instagram no aceptó la publicación:\n'+r.error)}}
  }catch(e){toast(/row-level|policy|permission/i.test(e.message||'')?'Supabase no deja guardar: falta habilitar la escritura (ver instrucciones)':'Error: '+(e.message||e));render()}
});
async function dbLogin(){try{const c={email:'alfredo@tros3d.com',password:'Alfredo-8'};const {data}=await sb.auth.getSession();if(data.session)return;const r=await sb.auth.signInWithPassword(c);if(r.error)await sb.auth.signUp(c)}catch(e){}}
try{S.user=localStorage.getItem('t3d_ok')?{}:null}catch(e){}
S.user?dbLogin().then(refresh):render();
