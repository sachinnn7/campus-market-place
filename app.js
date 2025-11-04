(function(){
  const API_BASE = localStorage.getItem("cmp_api_base") || "http://localhost:4000/api";
  const STORAGE_KEYS={ wishlist:"cmp_wishlist_v1", token:"cmp_token_v1", user:"cmp_user_v1" };

  /** @type {Array<{id:string,title:string,category:string,condition:string,price:number,description:string,seller:string,email:string,image?:string,createdAt:number}>} */
  let listings = [];
  /** @type {Set<string>} */
  let wishlist = new Set(readJson(STORAGE_KEYS.wishlist) || []);
  /** @type {{id:string,name:string,email:string}|null} */
  let currentUser = readJson(STORAGE_KEYS.user) || null;
  let token = localStorage.getItem(STORAGE_KEYS.token) || null;

  // Fallback demo listings if backend is unavailable
  const SAMPLE_LISTINGS = [
    { id: "demo-1", title: "Linear Algebra Textbook", category: "Books", condition: "Good", price: 350, description: "Strang 5th Ed., highlights in chapters 1-3.", image:"image/phy.jpg", seller: "Demo User", seller_id: -1, email: "demo@example.edu", createdAt: Date.now()-1000*60*60*24*2 },
    { id: "demo-2", title: "Physics Notes - Mechanics", category: "Notes", condition: "Like New", price: 150, description: "Clean, neatly organized notes.", image: "image/note.jpg", seller: "Demo User", seller_id: -1, email: "demo@example.edu", createdAt: Date.now()-1000*60*60*8 },
    { id: "demo-3", title: "Scientific Calculator FX-991ES", category: "Electronics", condition: "Like New", price: 900, description: "Barely used, includes cover.", image: "image/calculator.jpg", seller: "Demo User", seller_id: -1, email: "demo@example.edu", createdAt: Date.now()-1000*60*60*4 },
    { id: "demo-4", title: "Stationery Bundle", category: "Stationery", condition: "New", price: 250, description: "Pens, pencils, highlighters.", image: "image/stationary.jpg", seller: "Demo User", seller_id: -1, email: "demo@example.edu", createdAt: Date.now()-1000*60*60*3 },
    { id: "demo-5", title: "Dorm Lamp", category: "Other", condition: "Fair", price: 200, description: "Works fine, small scratch on base.", image: "image/lamp.jpg", seller: "Demo User", seller_id: -1, email: "demo@example.edu", createdAt: Date.now()-1000*60*30 }
  ];
 

  const els = {
    listings: document.getElementById("listings"),
    template: document.getElementById("listingCardTemplate"),
    search: document.getElementById("searchInput"),
    category: document.getElementById("categoryFilter"),
    condition: document.getElementById("conditionFilter"),
    sort: document.getElementById("sortSelect"),
    openPost: document.getElementById("openPostDialog"),
    postDialog: document.getElementById("postDialog"),
    postForm: document.getElementById("postForm"),
    wishlistBtn: document.getElementById("openWishlist"),
    wishlistDialog: document.getElementById("wishlistDialog"),
    wishlistContainer: document.getElementById("wishlistContainer"),
    closeWishlist: document.getElementById("closeWishlist"),
    wishlistCount: document.getElementById("wishlistCount"),
    // Auth/UI
    authArea: document.getElementById("authArea"),
    userArea: document.getElementById("userArea"),
    userName: document.getElementById("userName"),
    logoutBtn: document.getElementById("logoutBtn"),
    openInbox: document.getElementById("openInbox"),
    unreadBadge: document.getElementById("unreadBadge"),
    openLogin: document.getElementById("openLoginDialog"),
    openRegister: document.getElementById("openRegisterDialog"),
    loginDialog: document.getElementById("loginDialog"),
    registerDialog: document.getElementById("registerDialog"),
    loginForm: document.getElementById("loginForm"),
    registerForm: document.getElementById("registerForm"),
  };

  function readJson(key){
    try{ return JSON.parse(localStorage.getItem(key)||"null"); }catch{ return null; }
  }
  function writeJson(key,value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  function cryptoId(){
    return Math.random().toString(36).slice(2,8)+"-"+Date.now().toString(36);
  }

  function imageToDataUrl(file){
    return new Promise((resolve)=>{
      const reader = new FileReader();
      reader.onload = ()=> resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  async function api(path, opts={}){
    const headers = { "Content-Type":"application/json", ...(opts.headers||{}) };
    if(token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    const text = await res.text();
    let data; try { data = text? JSON.parse(text) : null; } catch { data = null; }
    if(!res.ok) throw new Error((data&&data.error)||res.statusText);
    return data;
  }

  async function loadListings(){
    try{
      listings = await api('/listings', { method:'GET', headers:{ "Content-Type":"application/json" } });
      render();
    }catch(err){
      console.error(err);
      // Use fallback samples so the UI is not empty
      listings = SAMPLE_LISTINGS.slice();
      render();
    }
  }

  function render(){
    const query = (els.search.value||"").trim().toLowerCase();
    const cat = els.category.value;
    const cond = els.condition.value;
    const sortBy = els.sort.value;

    let filtered = listings.filter(item=>{
      const inQuery = !query || [item.title,item.description,item.category,item.seller].join(" ").toLowerCase().includes(query);
      const inCat = !cat || item.category===cat;
      const inCond = !cond || item.condition===cond;
      return inQuery && inCat && inCond;
    });

    if(sortBy==="priceAsc"){ filtered.sort((a,b)=>a.price-b.price); }
    else if(sortBy==="priceDesc"){ filtered.sort((a,b)=>b.price-a.price); }
    else if(sortBy==="title"){ filtered.sort((a,b)=>a.title.localeCompare(b.title)); }
    else { filtered.sort((a,b)=>b.createdAt-a.createdAt); }

    els.listings.innerHTML="";
    if(filtered.length===0){
      els.listings.innerHTML = `<div class="empty">No items found. Try different filters.</div>`;
      return;
    }

    const frag = document.createDocumentFragment();
    for(const item of filtered){
      const node = /** @type {HTMLElement} */ (els.template.content.firstElementChild.cloneNode(true));
      const img = node.querySelector(".thumb");
      if(item.image){ img.style.backgroundImage = `url(${item.image})`; img.style.backgroundSize="cover"; img.style.backgroundPosition="center"; }
      node.querySelector(".card-title").textContent=item.title;
      node.querySelector(".price").textContent=`₹${item.price}`;
      node.querySelector(".category").textContent=item.category;
      node.querySelector(".condition").textContent=item.condition;
      node.querySelector(".desc").textContent=item.description||"";
      node.querySelector(".seller-name").textContent=`Seller: ${item.seller}`;
      const wishBtn = node.querySelector(".wishlist-btn");
      const contactBtn = node.querySelector(".contact-btn");
      const dmBtn = node.querySelector(".dm-btn");
      if(wishlist.has(item.id)) wishBtn.classList.add("active");
      wishBtn.addEventListener("click",()=>toggleWishlist(item.id));
      contactBtn.href = `mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent("Inquiry about: "+item.title)}&body=${encodeURIComponent("Hi "+item.seller+",\n\nI'm interested in your listing on Campus Market Place.\n\nRegards,")}`;
      dmBtn.addEventListener('click', ()=> openChat(item));
      // owner actions
      if(currentUser && item.seller_id===currentUser.id){
        const ownerWrap = document.createElement('div');
        ownerWrap.className='owner-actions';
        const editBtn = document.createElement('button'); editBtn.className='btn'; editBtn.textContent='Edit';
        const delBtn = document.createElement('button'); delBtn.className='btn'; delBtn.textContent='Delete';
        editBtn.onclick = ()=> openEditDialog(item);
        delBtn.onclick = ()=> deleteListing(item.id);
        node.querySelector('.card-actions').appendChild(ownerWrap);
        ownerWrap.appendChild(editBtn);
        ownerWrap.appendChild(delBtn);
      }
      frag.appendChild(node);
    }
    els.listings.appendChild(frag);
  }

  function toggleWishlist(id){
    if(wishlist.has(id)) wishlist.delete(id); else wishlist.add(id);
    writeJson(STORAGE_KEYS.wishlist, Array.from(wishlist));
    updateWishlistCount();
    render();
  }

  function updateWishlistCount(){
    els.wishlistCount.textContent = String(wishlist.size);
  }

  async function handlePost(e){
    e.preventDefault();
    const data = new FormData(els.postForm);
    const title = String(data.get("title")||"").trim();
    const category = String(data.get("category")||"");
    const condition = String(data.get("condition")||"");
    const price = Number(data.get("price")||0);
    const description = String(data.get("description")||"").trim();
    const imageFile = /** @type {File} */(data.get("image"));

    if(!currentUser || !token){
      alert("Please login to post an item.");
      return;
    }
    if(!title || !category || !condition || !(price>=0)){
      alert("Please fill all required fields.");
      return;
    }

    let imageData;
    if(imageFile && imageFile.size){
      imageData = await imageToDataUrl(imageFile);
    }

    try{
      await api('/listings', { method:'POST', body: JSON.stringify({ title, category, condition, price, description, image:imageData }) });
      els.postForm.reset();
      els.postDialog.close();
      await loadListings();
    }catch(err){
      alert("Failed to post item: "+err.message);
    }
  }

  function openWishlist(){
    const items = listings.filter(l=>wishlist.has(l.id));
    els.wishlistContainer.innerHTML="";
    if(items.length===0){
      els.wishlistContainer.innerHTML = `<div class="empty">Your wishlist is empty.</div>`;
    } else {
      for(const it of items){
        const row = document.createElement("div");
        row.className = "wishlist-item";
        const img = document.createElement("div");
        img.className = "thumb";
        if(it.image){ img.style.backgroundImage=`url(${it.image})`; img.style.backgroundSize="cover"; img.style.backgroundPosition="center"; }
        const info = document.createElement("div");
        const title = document.createElement("p"); title.className="title"; title.textContent=it.title;
        const meta = document.createElement("p"); meta.className="muted"; meta.textContent=`₹${it.price} • ${it.category} • ${it.condition}`;
        const actions = document.createElement("div");
        const removeBtn = document.createElement("button"); removeBtn.className="btn"; removeBtn.textContent="Remove"; removeBtn.onclick=()=>{ toggleWishlist(it.id); openWishlist(); };
        const contact = document.createElement("a"); contact.className="btn primary"; contact.textContent="Contact"; contact.target="_blank"; contact.href=`mailto:${encodeURIComponent(it.email)}?subject=${encodeURIComponent("Inquiry about: "+it.title)}`;
        actions.style.display="flex"; actions.style.gap="8px";
        info.appendChild(title); info.appendChild(meta); actions.appendChild(removeBtn); actions.appendChild(contact);
        row.appendChild(img); row.appendChild(info); row.appendChild(actions);
        els.wishlistContainer.appendChild(row);
      }
    }
    if(typeof els.wishlistDialog.showModal === "function"){ els.wishlistDialog.showModal(); }
    else { alert("Wishlist: modal not supported in this browser"); }
  }

  // Events
  els.openPost.addEventListener("click",()=>{
    if(!currentUser){
      if(typeof els.loginDialog.showModal === "function"){ els.loginDialog.showModal(); }
      else { alert("Please login first."); }
      return;
    }
    if(typeof els.postDialog.showModal === "function"){ els.postDialog.showModal(); }
    else { alert("Modal dialog not supported in this browser"); }
  });
  els.postForm.addEventListener("submit", handlePost);
  document.getElementById("submitPost").addEventListener("click", handlePost);
  els.wishlistBtn.addEventListener("click", openWishlist);
  els.closeWishlist.addEventListener("click", ()=> els.wishlistDialog.close());
  els.search.addEventListener("input", render);
  els.category.addEventListener("change", render);
  els.condition.addEventListener("change", render);
  els.sort.addEventListener("change", render);

  // Auth UI
  function applyAuthUI(){
    if(currentUser){
      els.authArea.style.display = "none";
      els.userArea.style.display = "flex";
      els.userName.textContent = currentUser.name;
    }else{
      els.authArea.style.display = "flex";
      els.userArea.style.display = "none";
      els.userName.textContent = "";
    }
  }

  els.openLogin.addEventListener("click",()=>{
    if(typeof els.loginDialog.showModal === "function"){ els.loginDialog.showModal(); }
  });
  els.openRegister.addEventListener("click",()=>{
    if(typeof els.registerDialog.showModal === "function"){ els.registerDialog.showModal(); }
  });
  els.logoutBtn.addEventListener("click",()=>{
    token=null; localStorage.removeItem(STORAGE_KEYS.token);
    currentUser=null; localStorage.removeItem(STORAGE_KEYS.user);
    applyAuthUI();
  });

  async function handleLogin(e){
    e.preventDefault();
    const fd = new FormData(els.loginForm);
    const email = String(fd.get('email')||'').trim();
    const password = String(fd.get('password')||'');
    try{
      const res = await api('/auth/login', { method:'POST', body: JSON.stringify({ email, password }) });
      token = res.token; localStorage.setItem(STORAGE_KEYS.token, token);
      currentUser = res.user; writeJson(STORAGE_KEYS.user, currentUser);
      els.loginForm.reset(); els.loginDialog.close();
      applyAuthUI();
    }catch(err){ alert('Login failed: '+err.message); }
  }
  async function handleRegister(e){
    e.preventDefault();
    const fd = new FormData(els.registerForm);
    const name = String(fd.get('name')||'').trim();
    const email = String(fd.get('email')||'').trim();
    const password = String(fd.get('password')||'');
    try{
      const res = await api('/auth/register', { method:'POST', body: JSON.stringify({ name, email, password }) });
      token = res.token; localStorage.setItem(STORAGE_KEYS.token, token);
      currentUser = res.user; writeJson(STORAGE_KEYS.user, currentUser);
      els.registerForm.reset(); els.registerDialog.close();
      applyAuthUI();
    }catch(err){ alert('Register failed: '+err.message); }
  }
  document.getElementById('submitLogin').addEventListener('click', handleLogin);
  els.registerForm.addEventListener('submit', handleRegister);
  document.getElementById('submitRegister').addEventListener('click', handleRegister);

  // Edit/Delete
  let editingId = null;
  const editDialog = document.getElementById('editDialog');
  const editForm = document.getElementById('editForm');
  const chatDialog = document.getElementById('chatDialog');
  const chatForm = document.getElementById('chatForm');
  const chatThread = document.getElementById('chatThread');
  const inboxDialog = document.getElementById('inboxDialog');
  const inboxContainer = document.getElementById('inboxContainer');
  function fillForm(form, item){
    form.elements['title'].value = item.title;
    form.elements['category'].value = item.category;
    form.elements['condition'].value = item.condition;
    form.elements['price'].value = item.price;
    form.elements['description'].value = item.description||'';
  }
  function openEditDialog(item){
    editingId = item.id;
    fillForm(editForm, item);
    if(typeof editDialog.showModal === 'function'){ editDialog.showModal(); }
  }
  async function deleteListing(id){
    if(!confirm('Delete this listing?')) return;
    try{
      await api(`/listings/${id}`, { method:'DELETE' });
      await loadListings();
    }catch(err){ alert('Delete failed: '+err.message); }
  }
  async function handleEdit(e){
    e.preventDefault();
    if(!editingId) return;
    const fd = new FormData(editForm);
    const payload = {
      title: String(fd.get('title')||'').trim(),
      category: String(fd.get('category')||''),
      condition: String(fd.get('condition')||''),
      price: Number(fd.get('price')||0),
      description: String(fd.get('description')||'').trim()
    };
    const imageFile = /** @type {File} */(fd.get('image'));
    if(imageFile && imageFile.size){ payload.image = await imageToDataUrl(imageFile); }
    try{
      await api(`/listings/${editingId}`, { method:'PUT', body: JSON.stringify(payload) });
      editForm.reset(); editDialog.close(); editingId=null;
      await loadListings();
    }catch(err){ alert('Edit failed: '+err.message); }
  }
  editForm.addEventListener('submit', handleEdit);
  document.getElementById('submitEdit').addEventListener('click', handleEdit);

  // Chat / DM
  let chatWithUserId = null;
  let chatListingId = null;
  async function loadThread(){
    if(!chatWithUserId || !chatListingId) return;
    try{
      const msgs = await api(`/messages/thread?withUserId=${encodeURIComponent(chatWithUserId)}&listingId=${encodeURIComponent(chatListingId)}`, { method:'GET' });
      chatThread.innerHTML = '';
      for(const m of msgs){
        const row = document.createElement('div');
        row.className = 'chat-msg'+(m.fromUserId===currentUser?.id?' me':'');
        const bubble = document.createElement('div'); bubble.className='chat-bubble'; bubble.textContent = m.text;
        row.appendChild(bubble);
        chatThread.appendChild(row);
      }
      chatThread.scrollTop = chatThread.scrollHeight;
    }catch(err){ chatThread.innerHTML = `<div class="empty">Failed to load messages.</div>`; }
  }
  function openChat(item){
    if(!currentUser){ alert('Please login to message the seller.'); return; }
    if(item.seller_id===currentUser.id){ alert('This is your own listing.'); return; }
    chatWithUserId = item.seller_id;
    chatListingId = item.id;
    if(typeof chatDialog.showModal === 'function'){ chatDialog.showModal(); }
    loadThread();
  }
  async function handleSendChat(e){
    e.preventDefault();
    const text = String(new FormData(chatForm).get('text')||'').trim();
    if(!text) return;
    try{
      await api('/messages', { method:'POST', body: JSON.stringify({ toUserId: chatWithUserId, listingId: chatListingId, text }) });
      chatForm.reset();
      await loadThread();
    }catch(err){ alert('Failed to send: '+err.message); }
  }
  chatForm.addEventListener('submit', handleSendChat);
  document.getElementById('sendChat').addEventListener('click', handleSendChat);

  // Inbox
  async function loadInbox(){
    if(!currentUser) return;
    try{
      const items = await api('/messages/inbox', { method:'GET' });
      inboxContainer.innerHTML='';
      let unreadTotal = 0;
      for(const it of items){ unreadTotal += it.unread; }
      els.unreadBadge.textContent = unreadTotal>0 ? `(${unreadTotal})` : '';
      if(items.length===0){ inboxContainer.innerHTML = `<div class="empty">No messages yet.</div>`; return; }
      for(const th of items){
        const row = document.createElement('div'); row.className='wishlist-item';
        const info = document.createElement('div');
        const title = document.createElement('p'); title.className='title'; title.textContent = (th.withUser?.name||'User')+` • Listing #${th.listingId}`;
        const meta = document.createElement('p'); meta.className='muted'; meta.textContent = `${new Date(th.lastAt).toLocaleString()} • ${th.lastText}`;
        const openBtn = document.createElement('button'); openBtn.className='btn primary'; openBtn.textContent='Open'; openBtn.onclick=async()=>{
          chatWithUserId = th.withUserId; chatListingId = th.listingId;
          if(typeof chatDialog.showModal === 'function'){ chatDialog.showModal(); }
          await api('/messages/mark-read', { method:'POST', body: JSON.stringify({ withUserId: th.withUserId, listingId: th.listingId }) });
          await loadThread();
          await loadInbox();
        };
        info.appendChild(title); info.appendChild(meta);
        row.appendChild(info); row.appendChild(openBtn);
        inboxContainer.appendChild(row);
      }
    }catch(err){ inboxContainer.innerHTML = `<div class="empty">Failed to load inbox.</div>`; }
  }
  els.openInbox?.addEventListener('click', async()=>{ if(typeof inboxDialog.showModal==='function'){ inboxDialog.showModal(); await loadInbox(); } });
  document.getElementById('closeInbox')?.addEventListener('click', ()=> inboxDialog.close());
  // periodic unread refresh
  setInterval(()=>{ if(currentUser) loadInbox(); }, 15000);

  updateWishlistCount();
  applyAuthUI();
  loadListings();
})();


