$(document).ready(function(){
 const foods=[
  {id:1,name:"Classic Burger",category:"Hamburguesas",price:32,desc:"Carne a la plancha, queso cheddar, lechuga y salsa de la casa.",img:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=85"},
  {id:2,name:"Doble Cheese",category:"Hamburguesas",price:42,desc:"Doble carne, doble cheddar, cebolla y pepinillos.",img:"https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=700&q=85"},
  {id:3,name:"BBQ Bacon",category:"Hamburguesas",price:45,desc:"Carne, tocino crocante, queso y salsa barbacoa.",img:"https://images.unsplash.com/photo-1553979459-d2229ba7433a?auto=format&fit=crop&w=700&q=85"},
  {id:4,name:"Chicken Crispy",category:"Hamburguesas",price:36,desc:"Pollo crocante, lechuga fresca y mayonesa especial.",img:"https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=700&q=85"},
  {id:5,name:"Combo Burger Club",category:"Combos",price:55,desc:"Hamburguesa clásica, papas fritas y bebida.",img:"https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=700&q=85"},
  {id:6,name:"Papas clásicas",category:"Acompañamientos",price:16,desc:"Papas doradas y crocantes con salsa de la casa.",img:"https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=700&q=85"},
  {id:7,name:"Aros de cebolla",category:"Acompañamientos",price:18,desc:"Aros crujientes para compartir.",img:"https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=700&q=85"},
  {id:8,name:"Limonada",category:"Bebidas",price:12,desc:"Limonada fresca, ideal para acompañar tu burger.",img:"https://images.unsplash.com/photo-1513558161293-c4c7b4a5f4?auto=format&fit=crop&w=700&q=85"}
 ];
 let category="Todos",cart=JSON.parse(localStorage.getItem("sa_cart")||"[]"),logs=JSON.parse(localStorage.getItem("sa_logs")||"[]");
 const money=n=>"Bs. "+n.toFixed(2);
 function log(action){logs.unshift({action,time:new Date().toLocaleString("es-BO")});logs=logs.slice(0,60);localStorage.setItem("sa_logs",JSON.stringify(logs));renderLog();}
 function renderLog(){$("#activityLog").empty();logs.slice(0,20).forEach(x=>$("#activityLog").append(`<div class="log-item">${$("<span>").text(x.time+" · "+x.action).html()}</div>`));}
 function toast(msg){$("#toast").text(msg).stop(true,true).slideDown(180).delay(2400).fadeOut(300);}
 function renderFoods(){let term=$("#searchFood").val().toLowerCase().trim();let list=foods.filter(f=>(category==="Todos"||f.category===category)&&(f.name.toLowerCase().includes(term)||f.desc.toLowerCase().includes(term)));$("#foodGrid").empty();list.forEach(f=>{$("#foodGrid").append(`<article class="food-card"><img loading="lazy" src="${f.img}" alt="${f.name}"><div class="food-info"><span class="food-category">${f.category}</span><h3>${f.name}</h3><p>${f.desc}</p><div class="food-bottom"><span class="price">${money(f.price)}</span><button class="add-btn" data-id="${f.id}">＋ Agregar</button></div></div></article>`)});$("#emptyState").prop("hidden",list.length>0);}
 function saveCart(){localStorage.setItem("sa_cart",JSON.stringify(cart));renderCart();}
 function renderCart(){let count=cart.reduce((a,x)=>a+x.qty,0),total=0;$("#cartItems").empty();$("#cartCount").text(count);$("#cartItemsLabel").text(count+" productos");if(!cart.length){$("#cartItems").html('<p class="muted">Todavía no agregaste platos.</p>')}cart.forEach(item=>{let f=foods.find(x=>x.id===item.id);if(!f)return;total+=f.price*item.qty;$("#cartItems").append(`<div class="cart-row"><div><strong>${f.name}</strong><small>${money(f.price)} c/u</small></div><div class="qty-controls"><button data-action="minus" data-id="${f.id}">−</button><b>${item.qty}</b><button data-action="plus" data-id="${f.id}">＋</button><button data-action="remove" data-id="${f.id}" aria-label="Eliminar">×</button></div></div>`)});$("#cartTotal").text(money(total));}
 function validName(){let v=$("#customerName").val().trim();let ok=/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+){1,4}$/.test(v)&&v.length>=4;$("#nameError").text(ok?"":"Ingresa nombre y apellido (solo letras).");return ok;}
 function validPhone(){let v=$("#customerPhone").val().replace(/\s/g,"");let ok=/^(?:\+591)?[67]\d{7}$/.test(v);$("#phoneError").text(ok?"":"Ingresa un celular boliviano válido de 8 dígitos.");return ok;}
 function validDelivery(){let ok=!!$("#delivery").val();$("#deliveryError").text(ok?"":"Selecciona una modalidad.");return ok;}
 function validAddress(){let needed=$("#delivery").val().includes("domicilio"),v=$("#address").val().trim(),ok=!needed||(v.length>=8&&v.length<=120);$("#addressError").text(ok?"": "Para entrega, escribe una dirección de al menos 8 caracteres.");return ok;}
 $("#foodFilters").on("click",".filter",function(){category=$(this).data("category");$(".filter").removeClass("active");$(this).addClass("active");renderFoods();log("Filtró el menú: "+category);});
 let searchTimer;$("#searchFood").on("input",function(){clearTimeout(searchTimer);let el=$(this);searchTimer=setTimeout(()=>{renderFoods();log("Buscó: "+el.val().trim());},250);});
 $("#foodGrid").on("click",".add-btn",function(){let id=Number($(this).data("id")),item=cart.find(x=>x.id===id);if(item)item.qty++;else cart.push({id,qty:1});saveCart();let f=foods.find(x=>x.id===id);log("Agregó "+f.name+" al carrito");toast(f.name+" agregado al pedido");});
 $("#cartItems").on("click","button",function(){let id=Number($(this).data("id")),action=$(this).data("action"),item=cart.find(x=>x.id===id);if(!item)return;if(action==="plus")item.qty++;if(action==="minus")item.qty--;if(action==="remove"||item.qty<=0)cart=cart.filter(x=>x.id!==id);saveCart();log("Actualizó el carrito");});
 $("#goCart").on("click",()=>{$("html,body").animate({scrollTop:$("#pedido").offset().top-70},450);log("Abrió el carrito");});
 $("#menuToggle").on("click",()=>$("#mainNav").toggleClass("open"));
 $("#mainNav a").on("click",()=>$("#mainNav").removeClass("open"));
 $(".accordion-title").on("click",function(){$(this).next(".accordion-body").slideToggle("fast");$(this).find("span").text($(this).next().is(":visible")?"−":"＋");log("Abrió/cerró un acordeón");});
 $("#delivery").on("change",function(){$("#address").prop("disabled",!this.value.includes("domicilio"));validAddress();log("Cambió modalidad de pedido");});
 $("#customerName").on("input blur",validName);$("#customerPhone").on("input blur",validPhone);$("#delivery").on("blur",validDelivery);$("#address").on("input blur",validAddress);
 $("#orderForm").on("submit",function(e){e.preventDefault();let ok=validName()&&validPhone()&&validDelivery()&&validAddress();if(!cart.length){toast("Agrega al menos un plato al carrito.");return;}if(!ok){toast("Revisa los campos marcados.");return;}let total=cart.reduce((a,x)=>a+foods.find(f=>f.id===x.id).price*x.qty,0);$("#confirmText").text($("#customerName").val().trim()+", tu pedido de "+cart.reduce((a,x)=>a+x.qty,0)+" producto(s) tiene un total estimado de "+money(total)+". Modalidad: "+$("#delivery").val()+". Esta es una confirmación demostrativa.");$("#confirmModal").prop("hidden",false);log("Validó y revisó un pedido demo");});
 $("#closeModal,#finishOrder").on("click",()=>{$("#confirmModal").prop("hidden",true);toast("Demostración finalizada.");});
 $("#toggleLog").on("click",function(){$("#activityLog,#clearLog").slideToggle("fast");$(this).text($("#activityLog").is(":visible")?"Ocultar −":"Mostrar +");});
 $("#clearLog").on("click",()=>{logs=[];localStorage.removeItem("sa_logs");renderLog();toast("Bitácora limpiada");});
 // Throttle: evita registrar demasiados eventos de scroll.
 let lastScroll=0;$(window).on("scroll",function(){let now=Date.now();if(now-lastScroll>1200){lastScroll=now;/* throttle de scroll */}});
 renderFoods();renderCart();renderLog();log("Ingresó al sitio");
 // Promesa y async/await: carga simulada de datos locales del menú.
 function loadMenu(){return new Promise(resolve=>setTimeout(()=>resolve(foods.length),180));}
 async function initMenu(){let n=await loadMenu();$("#foodGrid").addClass("loaded");console.info("Menú listo:",n,"platos");}
 initMenu();
});