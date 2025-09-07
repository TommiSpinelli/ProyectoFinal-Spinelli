/* =========================
   Claves de almacenamiento
   ========================= */
const LS_KEYS = {
  productos: "ecom_productos",
  carrito: "ecom_carrito"
};

/* =========================
   Utilidad localStorage
   ========================= */
function save(key, data){ localStorage.setItem(key, JSON.stringify(data)); }
function load(key, fallback){
  try{
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  }catch{ return fallback; }
}

/* =========================
   Datos por defecto
   ========================= */
const DEFAULT_PRODUCTS = [
  { codigo: "T1",  nombre: "Teclado",   precio: 55000 },
  { codigo: "M1",  nombre: "Monitor",   precio: 350000 },
  { codigo: "MO1", nombre: "Mouse",     precio: 40000 },
  { codigo: "L1",  nombre: "Impresora", precio: 150000 },
  { codigo: "H1",  nombre: "Headsets",  precio: 90000 }
];

/* =========================
   Estado (arrays)
   ========================= */
let productos = load(LS_KEYS.productos, null);
if(!Array.isArray(productos) || productos.length === 0){
  productos = DEFAULT_PRODUCTS.slice();  // copia
  save(LS_KEYS.productos, productos);
}

let carrito = load(LS_KEYS.carrito, []); // [{codigo, qty}]

/* =========================
   Helpers
   ========================= */
function formatARS(n){
  return "$" + (Math.round(n)).toLocaleString("es-AR");
}
function findProduct(codigo){
  const c = (codigo || "").toString().toUpperCase();
  return productos.find(p => p.codigo.toUpperCase() === c);
}
function getCartQty(){ return carrito.reduce((a,i)=>a+i.qty,0); }
function updateCartBadge(){
  const el = document.getElementById("cart-badge");
  if(el) el.textContent = getCartQty();
}

/* =========================
   Cargar productos (remotos)
   ========================= */
async function loadProducts(){
  try {
    const res = await fetch("productos.json");
    if(!res.ok) throw new Error("Error al cargar productos remotos");
    const data = await res.json();
    if(Array.isArray(data) && data.length>0){
      productos = data;
      save(LS_KEYS.productos, productos);
    } else {
      throw new Error("JSON vacío o inválido");
    }
  } catch(e){
    console.warn("Usando productos locales:", e.message);
    productos = load(LS_KEYS.productos, DEFAULT_PRODUCTS);
    save(LS_KEYS.productos, productos);
  }
}

/* =========================
   Notificaciones (Toastify)
   ========================= */
function notify(msg, type="info"){ 
  const color = type==="error" ? "#ef4444" : (type==="success" ? "#16a34a" : "#2563eb");
  if(typeof Toastify === "undefined"){
    // Fallback simple si Toastify no está cargado
    alert(msg);
    return;
  }
  Toastify({
    text: msg,
    duration: 2200,
    gravity: "top",
    position: "right",
    close: true,
    style: { background: color }
  }).showToast();
}

/* =========================
   Catálogo
   ========================= */
function renderCatalog(){
  const list = document.getElementById("product-list");
  if(!list) return;

  list.innerHTML = "";

  // Aseguro productos
  if(!Array.isArray(productos) || productos.length === 0){
    productos = DEFAULT_PRODUCTS.slice();
    save(LS_KEYS.productos, productos);
  }

  productos.forEach(p=>{
    const card = document.createElement("div");
    card.className = "item";

    const h3 = document.createElement("h3");
    h3.textContent = p.nombre;

    const code = document.createElement("div");
    code.className = "code";
    code.textContent = "Código: " + p.codigo;

    const price = document.createElement("div");
    price.className = "price";
    price.textContent = formatARS(p.precio);

    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = "Agregar al carrito";
    btn.onclick = ()=>{
      addToCart(p.codigo,1);
      updateCartBadge();
      notify(`${p.nombre} agregado al carrito`, "success");
    };

    card.appendChild(h3);
    card.appendChild(code);
    card.appendChild(price);
    card.appendChild(btn);
    list.appendChild(card);
  });
}

function setupAddProduct(){
  const btn = document.getElementById("btn-agregar-producto");
  if(!btn) return;

  btn.onclick = ()=>{
    const nombre = (prompt("Nombre del producto:")||"").trim();
    if(!nombre) return notify("Nombre inválido", "error");

    const precioNum = Number((prompt("Precio (ARS, número):")||"").trim());
    if(!precioNum || precioNum<=0) return notify("Precio inválido", "error");

    const codigo = (prompt("Código único (ej: T1):")||"").trim();
    if(!codigo) return notify("Código inválido", "error");
    if(findProduct(codigo)) return notify("Ya existe un producto con ese código.", "error");

    productos.push({ codigo, nombre, precio: precioNum });
    save(LS_KEYS.productos, productos);
    renderCatalog();
    notify("Producto agregado.", "success");
  };
}

/* =========================
   Carrito
   ========================= */
function addToCart(codigo, qty){
  const p = findProduct(codigo);
  if(!p) return notify("Producto no encontrado", "error");

  const i = carrito.findIndex(x=>x.codigo===p.codigo);
  if(i===-1) carrito.push({ codigo:p.codigo, qty:qty });
  else carrito[i].qty += qty;

  carrito = carrito.filter(x=>x.qty>0);
  save(LS_KEYS.carrito, carrito);
}

function setQty(codigo, qty){
  const i = carrito.findIndex(x=>x.codigo===codigo);
  if(i===-1) return;
  carrito[i].qty = qty;
  if(carrito[i].qty<=0) carrito.splice(i,1);
  save(LS_KEYS.carrito, carrito);
}

function cartTotal(){
  return carrito.reduce((acc,it)=>{
    const p = findProduct(it.codigo);
    return acc + (p ? p.precio*it.qty : 0);
  },0);
}

function renderCart(){
  const wrap = document.getElementById("cart-list");
  const totalEl = document.getElementById("cart-total");
  if(!wrap || !totalEl) return;

  wrap.innerHTML = "";
  if(carrito.length===0){
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "Tu carrito está vacío.";
    wrap.appendChild(empty);
  }else{
    carrito.forEach(it=>{
      const p = findProduct(it.codigo);
      if(!p) return;

      const row = document.createElement("div");
      row.className = "cart-row";

      const name = document.createElement("div");
      name.className = "name";
      name.textContent = p.nombre;

      const code = document.createElement("div");
      code.className = "code";
      code.textContent = "Código: " + p.codigo;

      const counter = document.createElement("div");
      counter.className = "counter";

      const minus = document.createElement("button");
      minus.textContent = "−";
      minus.onclick = ()=>{ setQty(it.codigo, it.qty-1); renderCart(); updateCartBadge(); };

      const qty = document.createElement("div");
      qty.textContent = it.qty;

      const plus = document.createElement("button");
      plus.textContent = "+";
      plus.onclick = ()=>{ setQty(it.codigo, it.qty+1); renderCart(); updateCartBadge(); };

      const price = document.createElement("div");
      price.className = "price";
      price.textContent = formatARS(p.precio*it.qty);

      counter.appendChild(minus);
      counter.appendChild(qty);
      counter.appendChild(plus);

      row.appendChild(name);
      row.appendChild(code);
      row.appendChild(counter);
      row.appendChild(price);
      wrap.appendChild(row);
    });
  }

  totalEl.textContent = formatARS(cartTotal());

  const btnVaciar = document.getElementById("btn-vaciar");
  if(btnVaciar){
    btnVaciar.onclick = ()=>{
      if(confirm("¿Vaciar el carrito?")){
        carrito = [];
        save(LS_KEYS.carrito, carrito);
        renderCart(); updateCartBadge();
        notify("Carrito vaciado", "info");
      }
    };
  }
}

/* =========================
   Finalizar compra
   ========================= */
function setupCheckout(){
  const btnCheckout = document.createElement("button");
  btnCheckout.className = "btn secondary";
  btnCheckout.textContent = "Finalizar compra";
  btnCheckout.onclick = ()=>{
    if(carrito.length===0){
      notify("El carrito está vacío", "error");
      return;
    }
    const total = formatARS(cartTotal());
    // Simulo envío de orden (podrías hacer fetch a un endpoint falso)
    notify(`Compra realizada con éxito. Total: ${total}`, "success");
    carrito = [];
    save(LS_KEYS.carrito, carrito);
    renderCart();
    updateCartBadge();
  };

  const summary = document.querySelector(".cart-summary");
  if(summary) summary.appendChild(btnCheckout);
}

/* =========================
   Inicio por página
   ========================= */
document.addEventListener("DOMContentLoaded", async ()=>{
  await loadProducts();   // Cargar remoto (productos.json)
  updateCartBadge();
  const page = document.body.getAttribute("data-page");
  if(page==="catalogo"){ renderCatalog(); setupAddProduct(); }
  if(page==="carrito"){ renderCart(); setupCheckout(); }
});
