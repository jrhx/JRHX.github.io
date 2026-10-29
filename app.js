// 全局数据
let games = [];
let currentFilter = 'all';
let currentSort = 'default';
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let history = JSON.parse(localStorage.getItem('history') || '[]');
let currentGameId = null;

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', async () => {
    await loadGames();
    initCarousel();
    renderHomeGames();
    initFilterTags();
    initSearch();
    initUserMenu();
    initNavSwitch();
    initSortOptions();
    initModalClose();
});

// 加载游戏数据
async function loadGames() {
    try {
        const res = await fetch('games.json');
        games = await res.json();
        // 兼容旧数据
        games = games.map(g => ({
            ...g,
            downloadLinks: g.downloadLinks || [{ name: '下载', url: g.downloadLink || '#' }]
        }));
    } catch (e) {
        console.error('加载游戏数据失败', e);
    }
}

// 渲染首页游戏
function renderHomeGames() {
    const featured = games.filter(g => g.featured).slice(0, 6);
    const hot = [...games].sort((a,b) => b.downloads - a.downloads).slice(0, 6);
    const newest = [...games].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
    
    document.getElementById('featuredGames').innerHTML = renderGameCards(featured);
    document.getElementById('hotGames').innerHTML = renderGameCards(hot);
    document.getElementById('newGames').innerHTML = renderGameCards(newest);
    
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
                ${game.hot ? '<span class="game-badge badge-hot">热门</span>' : ''}
                ${game.isNew ? '<span class="game-badge badge-new">新游</span>' : ''}
                <img src="${game.cover}" alt="${game.title}" loading="lazy" onerror="this.style.display='none'">
            </div>
            <div class="game-info">
                <div class="game-title">${game.title}</div>
                <div class="game-tags">
                    ${game.tags.slice(0, 2).map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <div class="game-meta">
                    <span class="game-rating">★ ${game.rating}</span>
                    <span>${game.downloads} 下载</span>
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
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('fav-btn')) return;
            const id = parseInt(card.dataset.id);
            openGameDetail(id);
        });
    });
    
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
    currentGameId = id;
    
    // 添加到浏览历史
    history = history.filter(hid => hid !== id);
    history.unshift(id);
    if (history.length > 50) history.pop();
    localStorage.setItem('history', JSON.stringify(history));
    
    const modal = document.getElementById('gameModal');
    document.getElementById('modalTitle').textContent = game.title;
    document.getElementById('modalCover').style.backgroundImage = `url(${game.cover})`;
    document.getElementById('modalCover').style.backgroundSize = 'cover';
    document.getElementById('modalCover').style.backgroundPosition = 'center';
    document.getElementById('modalDesc').textContent = game.desc;
    document.getElementById('modalRating').textContent = `★ ${game.rating} 分`;
    document.getElementById('modalDownloads').textContent = `${game.downloads} 次下载`;
    document.getElementById('modalVersion').textContent = game.version ? `版本 ${game.version}` : '';
    document.getElementById('modalSize').textContent = game.size ? `大小 ${game.size}` : '';
    document.getElementById('modalTags').innerHTML = game.tags.map(t => `<span class="tag">${t}</span>`).join('');
    
    // 下载按钮
    const validLinks = game.downloadLinks.filter(l => l.url);
    document.getElementById('downloadBtns').innerHTML = validLinks.map((link, idx) => `
        <a href="${link.url}" target="_blank" class="download-btn ${idx > 0 ? 'secondary' : ''}">
            ${link.name}
        </a>
    `).join('');
    
    // 加载评论
    renderComments(id);
    
    modal.classList.add('show');
}

// 关闭弹窗
function initModalClose() {
    document.getElementById('modalClose').addEventListener('click', () => {
        document.getElementById('gameModal').classList.remove('show');
    });

    document.getElementById('gameModal').addEventListener('click', (e) => {
        if (e.target.id === 'gameModal') {
            document.getElementById('gameModal').classList.remove('show');
        }
    });
}

// 评论功能
function renderComments(gameId) {
    const allComments = JSON.parse(localStorage.getItem('comments') || '{}');
    const gameComments = allComments[gameId] || [];
    
    const list = document.getElementById('commentList');
    if (gameComments.length === 0) {
        list.innerHTML = '<div class="empty-state" style="padding:20px; font-size:13px;">暂无评论，快来抢沙发</div>';
        return;
    }
    
    list.innerHTML = gameComments.map(c => `
        <div class="comment-item">
            <div class="comment-user">${c.user}</div>
            <div class="comment-content">${c.content}</div>
            <div class="comment-time">${c.time}</div>
        </div>
    `).join('');
}

function submitComment() {
    const input = document.getElementById('commentInput');
    const content = input.value.trim();
    if (!content) {
        alert('请输入评论内容');
        return;
    }
    
    const allComments = JSON.parse(localStorage.getItem('comments') || '{}');
    if (!allComments[currentGameId]) allComments[currentGameId] = [];
    
    allComments[currentGameId].unshift({
        user: '游客',
        content: content,
        time: new Date().toLocaleString('zh-CN')
    });
    
    localStorage.setItem('comments', JSON.stringify(allComments));
    input.value = '';
    renderComments(currentGameId);
}

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
    const navLinks = document.querySelectorAll('.nav-menu a[data-page]');
    const pages = document.querySelectorAll('.page');
    
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const target = link.dataset.page;
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            pages.forEach(p => p.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            
            if (target === 'categoryPage') {
                renderCategoryGames();
            }
        });
    });
}

function switchToCategory() {
    document.querySelector('.nav-menu a[data-page="categoryPage"]').click();
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

// 排序选项
function initSortOptions() {
    document.querySelectorAll('.sort-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.sort-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            currentSort = opt.dataset.sort;
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
    
    // 排序
    switch(currentSort) {
        case 'newest':
            filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
            break;
        case 'hot':
            filtered.sort((a,b) => b.downloads - a.downloads);
            break;
        case 'rating':
            filtered.sort((a,b) => b.rating - a.rating);
            break;
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
        
        if (document.getElementById('categoryPage').classList.contains('active')) {
            document.getElementById('categoryGames').innerHTML = renderGameCards(result);
        } else {
            // 首页只显示搜索结果
            document.getElementById('featuredGames').innerHTML = renderGameCards(result);
            document.getElementById('hotGames').innerHTML = '';
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
        switchToCategory();
        document.getElementById('categoryTitle').textContent = '我的收藏';
        document.getElementById('categoryGames').innerHTML = renderGameCards(favGames);
        bindCardEvents();
        dropdown.classList.remove('show');
    });
    
    // 历史记录
    document.getElementById('showHistory').addEventListener('click', () => {
        const historyGames = history.map(id => games.find(g => g.id === id)).filter(Boolean);
        switchToCategory();
        document.getElementById('categoryTitle').textContent = '浏览历史';
        document.getElementById('categoryGames').innerHTML = renderGameCards(historyGames);
        bindCardEvents();
        dropdown.classList.remove('show');
    });
}

// 投稿弹窗
function openSubmitModal() {
    document.getElementById('submitModal').classList.add('show');
}

function closeSubmitModal() {
    document.getElementById('submitModal').classList.remove('show');
}

function generateSubmit() {
    const name = document.getElementById('submitName').value.trim();
    const desc = document.getElementById('submitDesc').value.trim();
    const link = document.getElementById('submitLink').value.trim();
    const user = document.getElementById('submitUser').value.trim() || '匿名网友';
    
    if (!name || !link) {
        alert('请填写游戏名称和下载链接');
        return;
    }
    
    const result = `【游戏投稿】
游戏名称：${name}
游戏介绍：${desc}
下载链接：${link}
投稿人：${user}
投稿时间：${new Date().toLocaleString('zh-CN')}`;
    
    document.getElementById('submitResult').style.display = 'block';
    document.getElementById('submitResult').value = result;
    document.getElementById('submitResult').select();
}

document.getElementById('submitModal').addEventListener('click', (e) => {
    if (e.target.id === 'submitModal') {
        closeSubmitModal();
    }
});
