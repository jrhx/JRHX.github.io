// 全局数据
let games = [];
let currentFilter = 'all';
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let history = JSON.parse(localStorage.getItem('history') || '[]');

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', async () => {
    await loadGames();
    initCarousel();
    renderHomeGames();
    initFilterTags();
    initSearch();
    initUserMenu();
    initNavSwitch();
});

// 加载游戏数据
async function loadGames() {
    try {
        const res = await fetch('games.json');
        games = await res.json();
    } catch (e) {
        console.error('加载游戏数据失败', e);
    }
}

// 渲染首页游戏
function renderHomeGames() {
    const hotGames = games.filter(g => g.hot).slice(0, 6);
    const newGames = [...games].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
    
    document.getElementById('hotGames').innerHTML = renderGameCards(hotGames);
    document.getElementById('newGames').innerHTML = renderGameCards(newGames);
    
    bindCardEvents();
}

// 渲染游戏卡片HTML
function renderGameCards(gameList) {
    if (gameList.length === 0) {
        return '<div class="empty-state">暂无相关游戏</div>';
    }
    
    return gameList.map(game => `
        <div class="game-card" data-id="${game.id}">
            <div class="game-cover">
                <img src="${game.cover}" alt="${game.title}" loading="lazy">
            </div>
            <div class="game-info">
                <div class="game-title">${game.title}</div>
                <div class="game-tags">
                    ${game.tags.slice(0, 2).map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <div class="game-meta">
                    <span class="game-rating">★ ${game.rating}</span>
                    <span>下载 ${game.downloads}</span>
                    <button class="fav-btn ${favorites.includes(game.id) ? 'active' : ''}" data-id="${game.id}">
                        ${favorites.includes(game.id) ? '❤️' : '🤍'}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// 绑定卡片点击和收藏事件
function bindCardEvents() {
    // 卡片点击打开详情
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('fav-btn')) return;
            const id = parseInt(card.dataset.id);
            openGameDetail(id);
        });
    });
    
    // 收藏按钮
    document.querySelectorAll('.fav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            toggleFavorite(id, btn);
        });
    });
}

// 切换收藏
function toggleFavorite(id, btn) {
    if (favorites.includes(id)) {
        favorites = favorites.filter(fid => fid !== id);
        btn.classList.remove('active');
        btn.textContent = '🤍';
    } else {
        favorites.push(id);
        btn.classList.add('active');
        btn.textContent = '❤️';
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// 打开游戏详情
function openGameDetail(id) {
    const game = games.find(g => g.id === id);
    if (!game) return;
    
    // 添加到浏览历史
    if (!history.includes(id)) {
        history.unshift(id);
        if (history.length > 20) history.pop();
        localStorage.setItem('history', JSON.stringify(history));
    }
    
    const modal = document.getElementById('gameModal');
    document.getElementById('modalTitle').textContent = game.title;
    document.getElementById('modalCover').style.backgroundImage = `url(${game.cover})`;
    document.getElementById('modalDesc').textContent = game.desc;
    document.getElementById('modalRating').textContent = `★ ${game.rating}`;
    document.getElementById('modalDownloads').textContent = `下载 ${game.downloads} 次`;
    document.getElementById('modalTags').innerHTML = game.tags.map(t => `<span class="tag">${t}</span>`).join('');
    document.getElementById('downloadBtn').onclick = () => window.open(game.downloadLink, '_blank');
    
    modal.classList.add('show');
}

// 关闭弹窗
document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('gameModal').classList.remove('show');
});

document.getElementById('gameModal').addEventListener('click', (e) => {
    if (e.target.id === 'gameModal') {
        document.getElementById('gameModal').classList.remove('show');
    }
});

// 轮播图功能
function initCarousel() {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.carousel-btn.prev');
    const nextBtn = document.querySelector('.carousel-btn.next');
    let current = 0;
    let timer;
    
    function showSlide(index) {
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        slides[index].classList.add('active');
        dots[index].classList.add('active');
        current = index;
    }
    
    function nextSlide() {
        showSlide((current + 1) % slides.length);
    }
    
    function prevSlide() {
        showSlide((current - 1 + slides.length) % slides.length);
    }
    
    function autoPlay() {
        timer = setInterval(nextSlide, 4000);
    }
    
    prevBtn.addEventListener('click', () => {
        clearInterval(timer);
        prevSlide();
        autoPlay();
    });
    
    nextBtn.addEventListener('click', () => {
        clearInterval(timer);
        nextSlide();
        autoPlay();
    });
    
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            clearInterval(timer);
            showSlide(index);
            autoPlay();
        });
    });
    
    autoPlay();
}

// 导航切换
function initNavSwitch() {
    const navLinks = document.querySelectorAll('.nav-menu a');
    const pages = document.querySelectorAll('.page');
    
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const target = link.dataset.page;
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            pages.forEach(p => p.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            
            // 切换到分类页时渲染
            if (target === 'categoryPage') {
                renderCategoryGames();
            }
            
            // 关闭下拉菜单
            document.querySelector('.user-dropdown').classList.remove('show');
        });
    });
}

// 初始化筛选标签
function initFilterTags() {
    const allTags = [...new Set(games.flatMap(g => g.tags))];
    const filterContainer = document.getElementById('filterTags');
    
    filterContainer.innerHTML = `<span class="filter-tag active" data-tag="all">全部</span>` +
        allTags.map(tag => `<span class="filter-tag" data-tag="${tag}">${tag}</span>`).join('');
    
    filterContainer.querySelectorAll('.filter-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            filterContainer.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            currentFilter = tag.dataset.tag;
            renderCategoryGames();
        });
    });
}

// 渲染分类页游戏
function renderCategoryGames() {
    let filtered = games;
    if (currentFilter !== 'all') {
        filtered = games.filter(g => g.tags.includes(currentFilter));
    }
    
    document.getElementById('categoryGames').innerHTML = renderGameCards(filtered);
    bindCardEvents();
}

// 搜索功能
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    
    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.trim().toLowerCase();
        if (!keyword) {
            // 搜索为空时回到当前页
            if (document.getElementById('homePage').classList.contains('active')) {
                renderHomeGames();
            } else {
                renderCategoryGames();
            }
            return;
        }
        
        const result = games.filter(g => 
            g.title.toLowerCase().includes(keyword) || 
            g.tags.some(t => t.toLowerCase().includes(keyword))
        );
        
        // 在分类页显示搜索结果
        if (document.getElementById('categoryPage').classList.contains('active')) {
            document.getElementById('categoryGames').innerHTML = renderGameCards(result);
        } else {
            // 首页也显示搜索结果
            document.getElementById('hotGames').innerHTML = renderGameCards(result);
            document.getElementById('newGames').innerHTML = '';
        }
        
        bindCardEvents();
    });
}

// 用户菜单
function initUserMenu() {
    const userMenu = document.querySelector('.user-menu');
    const dropdown = document.querySelector('.user-dropdown');
    
    userMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    
    document.addEventListener('click', () => {
        dropdown.classList.remove('show');
    });
    
    // 收藏页
    document.getElementById('showFavorites').addEventListener('click', () => {
        const favGames = games.filter(g => favorites.includes(g.id));
        document.querySelector('.nav-menu a[data-page="categoryPage"]').click();
        document.getElementById('categoryGames').innerHTML = renderGameCards(favGames);
        document.querySelector('.section-title span').textContent = '我的收藏';
        bindCardEvents();
    });
    
    // 历史记录
    document.getElementById('showHistory').addEventListener('click', () => {
        const historyGames = history.map(id => games.find(g => g.id === id)).filter(Boolean);
        document.querySelector('.nav-menu a[data-page="categoryPage"]').click();
        document.getElementById('categoryGames').innerHTML = renderGameCards(historyGames);
        document.querySelector('.section-title span').textContent = '浏览历史';
        bindCardEvents();
    });
}
