(function () {
  'use strict';
  const products = [
    { id: 1, name: 'Oversize Essential', category: 'poleras', price: 89, tag: 'MÁS VENDIDO', image: 'https://images.unsplash.com/photo-1773848090642-0a61807e9846?auto=format&fit=crop&w=900&q=82', description: 'Polera oversize de algodón para un fit relajado y urbano.' },
    { id: 2, name: 'Graphic Tee 199X', category: 'poleras', price: 115, tag: 'NUEVO', image: 'https://images.unsplash.com/photo-1542327534-59a1fe8daf73?auto=format&fit=crop&w=900&q=82', description: 'Gráfico frontal inspirado en la cultura skate y street.' },
    { id: 3, name: 'Baggy Denim' , category: 'pantalones', price: 189, tag: 'TENDENCIA', image: 'https://images.unsplash.com/photo-1685328403732-64be6bb9d112?auto=format&fit=crop&w=900&q=82', description: 'Denim baggy de pierna amplia, inspirado en los 90.' },
    { id: 4, name: 'Cargo Utility', category: 'pantalones', price: 210, tag: 'URBANO', image: 'https://images.unsplash.com/photo-1761167474127-1c6e596ecea6?auto=format&fit=crop&w=900&q=82', description: 'Cargo de múltiples bolsillos y silueta relajada.' },
    { id: 5, name: 'Denim Street Jacket', category: 'chaquetas', price: 260, tag: 'CLÁSICO', image: 'https://images.unsplash.com/photo-1745240261519-0b988d54d098?auto=format&fit=crop&w=900&q=82', description: 'Chaqueta denim de corte amplio para combinar en capas.' },
    { id: 6, name: 'Bomber Varsity', category: 'chaquetas', price: 295, tag: 'NUEVO', image: 'https://images.pexels.com/photos/4118956/pexels-photo-4118956.jpeg?auto=compress&cs=tinysrgb&w=900', description: 'Bomber varsity con vibra urbana y detalles deportivos.' },
    { id: 7, name: 'Gorra Snapback', category: 'accesorios', price: 65, tag: 'DETALLE', image: 'https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=900&q=82', description: 'Snapback ajustable para completar tu outfit street.' },
    { id: 8, name: 'Crossbody Urban', category: 'accesorios', price: 125, tag: 'URBANO', image: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=900&q=82', description: 'Bolso crossbody compacto para llevar lo esencial.' }
  ];
  const grid = document.getElementById('productGrid');
  const search = document.getElementById('productSearch');
  const count = document.getElementById('productCount');
  let selectedCategory = 'todos';

  function renderProducts() {
    const term = search.value.trim().toLowerCase();
    const filtered = products.filter(product => {
      const matchesCategory = selectedCategory === 'todos' || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(term) || product.description.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
    grid.innerHTML = '';
    count.textContent = 'Mostrando ' + filtered.length + ' de ' + products.length + ' productos';
    if (!filtered.length) {
      grid.innerHTML = '<div class="empty-state"><strong>No encontramos prendas.</strong><p>Prueba otra palabra o categoría.</p></div>';
      return;
    }
    filtered.forEach(product => {
      const card = document.createElement('article');
      card.className = 'product-card';
      card.innerHTML = `<div class="product-image"><img src="${product.image}" alt="${product.name}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='assets/img/street-01.svg'"><span class="product-tag">${product.tag}</span></div><div class="product-info"><small>${product.category}</small><h3>${product.name}</h3><div class="product-bottom"><span class="product-price">Bs. ${product.price}</span><button class="detail-btn" data-id="${product.id}">Ver detalle ↗</button></div></div>`;
      grid.appendChild(card);
    });
  }
  document.getElementById('categoryFilters').addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    document.querySelectorAll('.filter-btn').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    selectedCategory = button.dataset.category;
    renderProducts();
    window.addLog('Catálogo', 'Filtró categoría: ' + button.textContent.trim());
  });
  search.addEventListener('input', window.debounce(() => {
    renderProducts();
    window.addLog('Buscador', 'Buscó: ' + (search.value.trim() || 'limpió la búsqueda'));
  }, 300));
  grid.addEventListener('click', event => {
    const button = event.target.closest('.detail-btn');
    if (!button) return;
    const product = products.find(item => item.id === Number(button.dataset.id));
    if (!product) return;
    window.showToast(product.name + ': ' + product.description + ' Precio referencial: Bs. ' + product.price);
    window.addLog('Producto', 'Consultó ' + product.name + ' (Bs. ' + product.price + ')');
  });
  renderProducts();
})();
