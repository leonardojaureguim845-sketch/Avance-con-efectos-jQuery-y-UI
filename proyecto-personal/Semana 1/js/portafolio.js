(function () {
  'use strict';
  const projects = [
    { title: 'Concrete Mood', category: 'urbano', label: 'URBANO / 2026', image: 'https://images.pexels.com/photos/4118956/pexels-photo-4118956.jpeg?auto=compress&cs=tinysrgb&w=900' },
    { title: 'Skate Everyday', category: 'casual', label: 'CASUAL / 2026', image: 'https://images.unsplash.com/photo-1761167474127-1c6e596ecea6?auto=format&fit=crop&w=900&q=82' },
    { title: 'After Dark', category: 'streetwear', label: 'STREETWEAR / 2026', image: 'https://images.unsplash.com/photo-1685328403732-64be6bb9d112?auto=format&fit=crop&w=900&q=82' },
    { title: 'Oversize Culture', category: 'casual', label: 'CASUAL / 2026', image: 'https://images.unsplash.com/photo-1745240261519-0b988d54d098?auto=format&fit=crop&w=900&q=82' },
    { title: 'Block Party', category: 'urbano', label: 'URBANO / 2026', image: 'https://images.unsplash.com/photo-1773848090642-0a61807e9846?auto=format&fit=crop&w=900&q=82' }
  ];
  const grid = document.getElementById('portfolioGrid');
  function render(filter) {
    const visible = filter === 'todos' ? projects : projects.filter(item => item.category === filter);
    grid.innerHTML = '';
    visible.forEach(project => {
      const card = document.createElement('article');
      card.className = 'portfolio-card';
      card.innerHTML = `<img src="${project.image}" alt="${project.title}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='assets/img/street-02.svg'"><div class="portfolio-overlay"><span>${project.label}</span><h3>${project.title}</h3></div>`;
      grid.appendChild(card);
    });
  }
  document.getElementById('portfolioFilters').addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    document.querySelectorAll('.portfolio-filter').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    render(button.dataset.filter);
    window.addLog('Portafolio', 'Filtró lookbook: ' + button.textContent.trim());
  });
  render('todos');
})();
