<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  
  let L = null;
  
  let tasks = [];
  let loading = true;
  let searchQuery = '';
  let postType = 'all';
  let distance = '';
  let minPrice = '';
  let maxPrice = '';
  let noPriceLimit = false;
  let hoveredTask = null;
  let favorites = new Set();
  let hoverTimeout = null;
  let isLoggedIn = false;
  let currentUser = null;
  let showUserMenu = false;
  let showLanguageMenu = false;
  let currentLanguage = 'en';
  let map = null;
  let mapContainer = null;
  let markers = [];
  let markersInitialized = false;
  let lastTasksHash = '';
  
  $: {
    searchQuery = $page.url.searchParams.get('q') || '';
  }
  
  // Reload tasks when search query changes
  $: if (searchQuery !== undefined) {
    loadTasks();
  }
  
  onMount(async () => {
    // Check login status
    const userData = localStorage.getItem('user');
    if (userData) {
      currentUser = JSON.parse(userData);
      isLoggedIn = true;
    }
    
    // Get language setting
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      currentLanguage = savedLanguage;
    }
    
    // Load tasks
    await loadTasks();
    
    // Import Leaflet only in browser
    if (browser) {
      const leafletModule = await import('leaflet');
      L = leafletModule.default;
      
      // Initialize map after DOM is ready
      setTimeout(() => {
        initMap();
      }, 100);
    }
  });
  
  function initMap() {
    if (!mapContainer || map || !L) return;
    
    // Initialize Leaflet map centered on Aalto University, Helsinki
    map = L.map(mapContainer, {
      zoomControl: false,
      attributionControl: true
    }).setView([60.1882, 24.8307], 13);
    
    // Add CartoDB Positron tile layer (modern, minimal style)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);
    
    // Add custom zoom controls
    L.control.zoom({
      position: 'topright'
    }).addTo(map);
    
    // Add markers for tasks
    if (tasks.length > 0) {
      addMarkersToMap();
    }
  }
  
  function addMarkersToMap() {
    if (!map || !L) return;
    
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Add marker for each task (showing rank number)
    tasks.slice(0, 10).forEach((task, index) => {
      const rank = index + 1; // Rank is 1-indexed
      
      // Generate stable position based on task ID using a simple hash
      function hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return hash;
      }
      
      const hash = Math.abs(hashString(task.id || index.toString()));
      const lat = 60.1882 + ((hash % 100 - 50) / 1000) * 0.5;
      const lng = 24.8307 + (((hash >> 10) % 100 - 50) / 1000) * 0.5;
      
      // Create custom icon with rank number for each marker (black modern style)
      const pinIcon = L.divIcon({
        html: `
          <div style="position: relative;">
            <svg width="32" height="42" viewBox="0 0 155 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M77.1375 0C34.6 0 -0.00416623 34.6 3.76228e-07 77.1333C3.76228e-07 92.9333 4.74583 108.125 13.6292 120.913C14.075 121.679 14.525 122.421 15.0542 123.142L71.3583 197.358C72.8875 199.063 74.9417 200 77.1417 200C79.3125 200 81.3792 199.054 83.1667 197.05L139.212 123.129C139.767 122.396 140.238 121.592 140.496 121.121C149.508 108.154 154.279 92.9458 154.279 77.1417C154.279 34.6 119.675 0 77.1375 0Z" fill="#000000"/>
            </svg>
            <span style="position: absolute; top: 28%; left: 50%; transform: translateX(-50%); font-weight: 700; font-size: 0.85rem; color: #FFFFFF; text-shadow: 0 1px 2px rgba(0,0,0,0.5); line-height: 1;">${rank}</span>
          </div>
        `,
        className: 'custom-pin',
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -42]
      });
      
      const marker = L.marker([lat, lng], { icon: pinIcon })
        .addTo(map)
        .bindPopup(`<strong>#${rank} ${task.name}</strong>`);
      
      // Store task reference in marker for hover matching
      marker._taskId = task.id;
      markers.push(marker);
    });
    
    markersInitialized = true;
  }
  
  // Watch for hoveredTask changes and highlight corresponding marker
  $: if (hoveredTask && map && markers.length > 0) {
    markers.forEach((marker) => {
      if (marker._taskId === hoveredTask.id) {
        marker.setOpacity(1);
        marker.setZIndexOffset(1000);
        // Scale up the marker to make it more prominent
        const iconElement = marker._icon;
        if (iconElement) {
          iconElement.style.transform = 'scale(1.3)';
          iconElement.style.transition = 'transform 0.2s ease';
        }
      } else {
        marker.setOpacity(0.4);
        marker.setZIndexOffset(0);
        const iconElement = marker._icon;
        if (iconElement) {
          iconElement.style.transform = 'scale(1)';
        }
      }
    });
  }
  
  // Reset marker opacity when no task is hovered
  $: if (!hoveredTask && map && markers.length > 0) {
    markers.forEach(marker => {
      marker.setOpacity(1);
      marker.setZIndexOffset(0);
      const iconElement = marker._icon;
      if (iconElement) {
        iconElement.style.transform = 'scale(1)';
      }
    });
  }
  
  // Watch for tasks changes and reload markers
  $: if (map && L && tasks.length > 0 && !loading) {
    // Create a hash of task IDs to detect changes
    const currentHash = tasks.map(t => t.id).join(',');
    if (currentHash !== lastTasksHash) {
      lastTasksHash = currentHash;
      markersInitialized = false;
      addMarkersToMap();
    }
  }
  
  function handleLogout() {
    localStorage.removeItem('user');
    isLoggedIn = false;
    currentUser = null;
    showUserMenu = false;
  }
  
  function changeLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    showLanguageMenu = false;
  }
  
  function toggleUserMenu() {
    showUserMenu = !showUserMenu;
  }
  
  function toggleLanguageMenu() {
    showLanguageMenu = !showLanguageMenu;
  }
  
  const languages = {
    en: 'English',
    sv: 'Svenska',
    fi: 'Suomi'
  };
  
  function calculateRelevance(task, query) {
    if (!query || !query.trim()) return 0;
    
    const queryLower = query.toLowerCase().trim();
    const nameLower = task.name?.toLowerCase() || '';
    const descLower = task.description?.toLowerCase() || '';
    let score = 0;
    
    // Exact match in name gets highest score
    if (nameLower === queryLower) {
      score += 100;
    } else if (nameLower.startsWith(queryLower)) {
      score += 50;
    } else if (nameLower.includes(queryLower)) {
      score += 30;
    }
    
    // Match in description
    if (descLower.includes(queryLower)) {
      score += 10;
    }
    
    // Word-based matching (more words matched = higher score)
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
    queryWords.forEach(word => {
      if (nameLower.includes(word)) score += 20;
      if (descLower.includes(word)) score += 5;
    });
    
    return score;
  }
  
  async function loadTasks() {
    loading = true;
    try {
      const response = await fetch('https://loud-starling-77.deno.dev/tasks');
      const allTasks = await response.json();
      
      let filteredTasks = allTasks;
      
      // Filter by search query
      if (searchQuery) {
        filteredTasks = allTasks.filter(task => 
          task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Filter by post type
      if (postType !== 'all') {
        // Assuming tasks have a 'type' field, adjust as needed
        // filteredTasks = filteredTasks.filter(task => task.type === postType);
      }
      
      // Filter by price
      if (!noPriceLimit) {
        if (minPrice) {
          filteredTasks = filteredTasks.filter(task => {
            const price = parseFloat(task.price) || 0;
            return price >= parseFloat(minPrice);
          });
        }
        if (maxPrice) {
          filteredTasks = filteredTasks.filter(task => {
            const price = parseFloat(task.price) || 0;
            return price <= parseFloat(maxPrice);
          });
        }
      }
      
      // Calculate relevance and sort
      if (searchQuery) {
        filteredTasks = filteredTasks.map(task => ({
          ...task,
          relevance: calculateRelevance(task, searchQuery)
        })).sort((a, b) => b.relevance - a.relevance);
      } else {
        // If no search query, sort by time (newest first)
        filteredTasks = filteredTasks.sort((a, b) => new Date(b.time) - new Date(a.time));
      }
      
      tasks = filteredTasks;
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      loading = false;
    }
  }
  
  function handleSearch() {
    loadTasks();
  }
  
  function handleKeyPress(event) {
    if (event.key === 'Enter') {
      handleSearch();
    }
  }
  
  function handleCardHover(task, event) {
    // 检查是否点击了收藏按钮
    if (event.target.closest('.favorite-btn')) {
      return;
    }
    // 清除之前的定时器
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    // 立即设置悬停任务
    hoveredTask = task;
  }
  
  function handleCardLeave(event) {
    // 检查是否离开了收藏按钮
    if (event.relatedTarget && event.relatedTarget.closest('.favorite-btn')) {
      return;
    }
    // 清除定时器
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    // 清除悬停任务
    hoveredTask = null;
  }
  
  function formatTimeAgo(dateString) {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffMs = now - postDate;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;
    
    if (diffHours < 24) {
      const hours = Math.floor(diffHours);
      if (hours === 0) return { label: 'Just now', icon: '🆕' };
      return { label: `${hours}h ago`, icon: '⏰' };
    } else if (diffDays < 7) {
      const days = Math.floor(diffDays);
      if (days <= 1) return { label: '24h ago', icon: '⏰' };
      if (days <= 2) return { label: '48h ago', icon: '⏰' };
      return { label: `${days}d ago`, icon: '⏰' };
    }
    return null;
  }
  
  function toggleFavorite(taskId, event) {
    event.stopPropagation();
    if (favorites.has(taskId)) {
      favorites.delete(taskId);
    } else {
      favorites.add(taskId);
    }
    // 创建新的 Set 以触发响应式更新
    favorites = new Set([...favorites]);
  }
  
  function isFavorite(taskId) {
    return favorites.has(taskId);
  }
</script>

<svelte:head>
  <title>Search Tasks - HandyGO</title>
</svelte:head>

<main class="search-page">
  <!-- Navigation Header -->
  <header class="header">
    <div class="container">
      <div class="nav-left">
        <img src="/favicon.png" alt="HandyGO" class="logo-icon" />
        <h1 class="logo">HandyGO</h1>
      </div>
      <nav class="nav-right">
        {#if isLoggedIn}
          <!-- User Menu -->
          <div class="user-menu-wrapper">
            <div class="user-info" on:click={toggleUserMenu}>
              <img src="https://ui-avatars.com/api/?name={currentUser?.name || 'User'}&background=ECF86E&color=000" alt="User Avatar" class="user-avatar" />
              <span class="user-name">{currentUser?.name || 'User'}</span>
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none" class="dropdown-arrow">
                <path d="M1 1L6 6L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            {#if showUserMenu}
              <div class="user-dropdown">
                <a href="/profile" class="dropdown-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z" fill="currentColor"/>
                    <path d="M0 14C0 10.6863 2.68629 8 6 8H10C13.3137 8 16 10.6863 16 14V16H0V14Z" fill="currentColor"/>
                  </svg>
                  Profile
                </a>
                <button class="dropdown-item" on:click={handleLogout}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 2L1 7L6 12M1 7H12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                  Logout
                </button>
              </div>
            {/if}
          </div>
          
          <!-- Notifications -->
          <button class="icon-button" title="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" stroke-width="2"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2"/>
              <circle cx="19" cy="5" r="4" fill="#ECF86E"/>
            </svg>
          </button>
          
          <!-- Messages -->
          <button class="icon-button" title="Messages">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        {:else}
          <!-- Login/Register Buttons -->
          <button class="btn-login" on:click={() => goto('/login')}>Login</button>
          <button class="btn-register" on:click={() => goto('/register')}>Register</button>
        {/if}
        
        <!-- Language Selector -->
        <div class="language-wrapper">
          <button class="language-btn" on:click={toggleLanguageMenu}>
            {languages[currentLanguage]}
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" class="dropdown-arrow">
              <path d="M1 1L6 6L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          {#if showLanguageMenu}
            <div class="language-dropdown">
              <button class="dropdown-item" class:active={currentLanguage === 'en'} on:click={() => changeLanguage('en')}>
                English
              </button>
              <button class="dropdown-item" class:active={currentLanguage === 'sv'} on:click={() => changeLanguage('sv')}>
                Svenska
              </button>
              <button class="dropdown-item" class:active={currentLanguage === 'fi'} on:click={() => changeLanguage('fi')}>
                Suomi
              </button>
            </div>
          {/if}
        </div>
      </nav>
    </div>
  </header>

  <!-- Main Content with Three Columns -->
  <section class="search-main">
    <div class="search-container">
      <!-- Left Sidebar: Filters -->
      <aside class="filters-panel">
        <div class="search-bar">
          <input 
            type="text" 
            placeholder="Search tasks..." 
            bind:value={searchQuery}
            on:keypress={handleKeyPress}
            class="filter-search-input"
          />
          <button on:click={handleSearch} class="search-icon-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Post Type</label>
          <select bind:value={postType} class="filter-select">
            <option value="all">All Types</option>
            <option value="need">Need</option>
            <option value="offer">Offer</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Distance</label>
          <select bind:value={distance} class="filter-select">
            <option value="">Select distance</option>
            <option value="3">3 km</option>
            <option value="10">10 km</option>
            <option value="30">30 km</option>
            <option value="50">50 km</option>
            <option value="all">All distances</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Price</label>
          <div class="price-inputs">
            <input 
              type="number" 
              placeholder="Min" 
              bind:value={minPrice}
              class="filter-input price-input"
              disabled={noPriceLimit}
            />
            <span class="price-separator">-</span>
            <input 
              type="number" 
              placeholder="Max" 
              bind:value={maxPrice}
              class="filter-input price-input"
              disabled={noPriceLimit}
            />
          </div>
          <button 
            class="price-limit-btn" 
            on:click={() => noPriceLimit = !noPriceLimit}
            role="button"
            type="button"
          >
            {noPriceLimit ? '✓' : ''} No price limit
          </button>
        </div>
      </aside>
      
      <!-- Middle: Search Results -->
      <section class="results-panel">
        {#if loading}
          <div class="loading">
            <p>Loading tasks...</p>
          </div>
        {:else if tasks.length > 0}
          <div class="results-grid">
            {#each tasks as task, index}
              {@const timeInfo = formatTimeAgo(task.time)}
              {@const rank = index + 1}
              <div 
                class="result-card" 
                on:click={() => goto(`/task/${task.id}`)}
                on:keydown={(e) => { if (e.key === 'Enter') goto(`/task/${task.id}`); }}
                on:mouseenter={(e) => handleCardHover(task, e)}
                on:mouseleave={handleCardLeave}
                role="button"
                tabindex="0"
              >
                <div class="rank-badge">#{rank}</div>
                <div class="card-image-placeholder">📸</div>
                <button 
                  class="favorite-btn {isFavorite(task.id) ? 'active' : ''}" 
                  on:click={(e) => toggleFavorite(task.id, e)}
                  on:mouseenter|stopPropagation
                  title={isFavorite(task.id) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="20" height="20" class="heart-icon">
                    <path d="M32 407.584A279.584 279.584 0 0 1 512 212.64a279.584 279.584 0 0 1 480 194.944 278.144 278.144 0 0 1-113.024 224.512L562.592 892.8a96 96 0 0 1-124.416-1.952L130.016 620.16A278.976 278.976 0 0 1 32 407.584z" class="heart-path"/>
                  </svg>
                </button>
                <div class="card-info">
                  <div class="card-meta">
                    {#if timeInfo}
                      <span class="time-badge">
                        <svg class="time-icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
                          <path d="M511.913993 63.989249c-247.012263 0-447.924744 200.912481-447.924744 447.924744s200.912481 447.924744 447.924744 447.924744 447.924744-200.912481 447.924744-447.924744S758.926256 63.989249 511.913993 63.989249zM511.913993 895.677474c-211.577356 0-383.763481-172.186125-383.763481-383.763481 0-211.577356 172.014111-383.763481 383.763481-383.763481s383.763481 172.014111 383.763481 383.763481S723.491349 895.677474 511.913993 895.677474z" fill="#575B66"></path>
                          <path d="M672.05913 511.913993l-159.973123 0L512.086007 288.123635c0-17.717453-14.277171-32.166639-31.994625-32.166639-17.717453 0-31.994625 14.449185-31.994625 32.166639l0 255.956996c0 17.717453 14.277171 31.994625 31.994625 31.994625l191.967747 0c17.717453 0 32.166639-14.277171 32.166639-31.994625C704.053754 526.191164 689.604569 511.913993 672.05913 511.913993z" fill="#575B66"></path>
                        </svg>
                        {timeInfo.label}
                      </span>
                    {/if}
                    {#if task.price}
                      <span class="price-badge">€{task.price}</span>
                    {/if}
                  </div>
                  <h3 class="card-title">{task.name}</h3>
                  <p class="card-location">📍 Aalto Campus, Espoo</p>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="no-results">
            <p>No tasks found.</p>
            <a href="/post" class="post-task-btn">Post a Task</a>
          </div>
        {/if}
      </section>
      
      <!-- Right: Map -->
      <aside class="map-panel">
        <div class="map-container">
          <div class="map-header">
            <button class="search-area-btn">Search this area</button>
          </div>
          <div bind:this={mapContainer} class="leaflet-container"></div>
        </div>
      </aside>
    </div>
  </section>
</main>

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }
  
  .search-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  /* Header Styles */
  .header {
    background: #FFFFFF;
    border-bottom: 1px solid #EAF2FD;
    position: sticky;
    top: 0;
    z-index: 100;
    flex-shrink: 0;
  }
  
  .header .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 20px;
  }
  
  .nav-left {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  
  .logo-icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }
  
  .logo {
    font-size: 1.8rem;
    font-weight: 700;
    color: #000000;
    margin: 0;
  }
  
  /* Nav Right Styles */
  .nav-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  /* Buttons */
  .btn-login {
    background: transparent;
    border: 2px solid #000;
    color: #000;
    padding: 0.5rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .btn-login:hover {
    background: #000;
    color: #fff;
  }
  
  .btn-register {
    background: #ECF86E;
    border: none;
    color: #000;
    padding: 0.5rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .btn-register:hover {
    background: #E0F055;
  }
  
  /* Icon Buttons */
  .icon-button {
    background: none;
    border: none;
    cursor: pointer;
    color: #666;
    padding: 0.5rem;
    border-radius: 8px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .icon-button:hover {
    background: #EAF2FD;
    color: #000;
  }
  
  /* User Menu */
  .user-menu-wrapper {
    position: relative;
  }
  
  .user-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 8px;
    transition: all 0.2s ease;
  }
  
  .user-info:hover {
    background: #EAF2FD;
  }
  
  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
  }
  
  .user-name {
    font-weight: 600;
    color: #000;
  }
  
  .dropdown-arrow {
    transition: transform 0.2s ease;
  }
  
  .user-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    background: #fff;
    border: 1px solid #EAF2FD;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    min-width: 180px;
    z-index: 1000;
    overflow: hidden;
  }
  
  .dropdown-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: none;
    background: none;
    color: #000;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background 0.2s ease;
    text-decoration: none;
  }
  
  .dropdown-item:hover,
  .dropdown-item.active {
    background: #F8FFCB;
  }
  
  .dropdown-item svg {
    flex-shrink: 0;
  }
  
  /* Language Selector */
  .language-wrapper {
    position: relative;
  }
  
  .language-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    color: #666;
    font-weight: 500;
    padding: 0.5rem;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s ease;
  }
  
  .language-btn:hover {
    background: #EAF2FD;
    color: #000;
  }
  
  .language-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    background: #fff;
    border: 1px solid #EAF2FD;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    min-width: 150px;
    z-index: 1000;
    overflow: hidden;
  }
  
  .search-main {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  
  .search-container {
    display: grid;
    grid-template-columns: 280px 1fr 500px;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  
  /* Left Panel: Filters */
  .filters-panel {
    background: #FFFFFF;
    border-right: 1px solid #EAF2FD;
    padding: 1.5rem;
    overflow-y: auto;
  }
  
  .search-bar {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  
  .filter-search-input {
    flex: 1;
    padding: 0.75rem;
    border: 2px solid #EAF2FD;
    border-radius: 8px;
    font-size: 0.9rem;
    outline: none;
  }
  
  .filter-search-input:focus {
    border-color: #ECF86E;
  }
  
  .search-icon-btn {
    background: #ECF86E;
    border: none;
    padding: 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    color: #000;
  }
  
  .search-icon-btn:hover {
    background: #E0F055;
  }
  
  .filter-group {
    margin-bottom: 1.5rem;
  }
  
  .filter-label {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    color: #000;
    margin-bottom: 0.5rem;
  }
  
  .filter-select,
  .filter-input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #EAF2FD;
    border-radius: 8px;
    font-size: 0.9rem;
    outline: none;
  }
  
  .filter-select:focus,
  .filter-input:focus {
    border-color: #ECF86E;
  }
  
  .price-separator {
    color: #666;
    font-weight: 500;
  }
  
  .price-limit-btn {
    width: 100%;
    margin-top: 0.5rem;
    background: transparent;
    border: 2px solid #EAF2FD;
    padding: 0.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.85rem;
    transition: all 0.2s ease;
  }
  
  .price-limit-btn:hover {
    background: #F8FFCB;
    border-color: #ECF86E;
  }
  
  .price-inputs {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 0.5rem;
    align-items: center;
  }
  
  /* Middle Panel: Results */
  .results-panel {
    background: #FFFFFF;
    padding: 1.5rem;
    overflow-y: auto;
  }
  
  .loading {
    text-align: center;
    padding: 4rem 0;
    color: #666;
  }
  
  .results-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  
  .result-card {
    background: #FFFFFF;
    border: 2px solid #EAF2FD;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    z-index: 1;
  }
  
  .result-card:hover {
    border-color: #ECF86E;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 2;
  }
  
  .rank-badge {
    position: absolute;
    top: 1rem;
    left: 1rem;
    background: #000000;
    color: #FFFFFF;
    font-weight: 700;
    font-size: 0.9rem;
    padding: 0.4rem 0.7rem;
    border-radius: 8px;
    z-index: 10;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  .card-image-placeholder {
    width: 100%;
    height: 180px;
    background: #EAF2FD;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
  }
  
  .favorite-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(255, 255, 255, 0.9);
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    z-index: 10;
    pointer-events: auto;
  }
  
  .favorite-btn:hover {
    transform: scale(1.1);
  }
  
  .favorite-btn .heart-icon {
    width: 20px;
    height: 20px;
  }
  
  .favorite-btn .heart-path {
    fill: #999;
    transition: fill 0.2s ease;
  }
  
  .favorite-btn.active .heart-path {
    fill: #FF0000;
  }
  
  .favorite-btn:hover .heart-path {
    fill: #FF6B6B;
  }
  
  .favorite-btn.active {
    background: rgba(255, 0, 0, 0.1);
  }
  
  .card-info {
    padding: 1rem;
  }
  
  .card-meta {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }
  
  .time-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: #F8FFCB;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #000;
  }
  
  .time-icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
  
  .price-badge {
    display: inline-block;
    background: #ECF86E;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #000;
  }
  
  .card-title {
    font-size: 1rem;
    font-weight: 600;
    color: #000;
    margin-bottom: 0.5rem;
    line-height: 1.3;
  }
  
  .card-location {
    font-size: 0.85rem;
    color: #666;
  }
  
  .no-results {
    text-align: center;
    padding: 4rem 0;
  }
  
  .post-task-btn {
    display: inline-block;
    background: #ECF86E;
    color: #000;
    padding: 1rem 2rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    margin-top: 1rem;
  }
  
  /* Right Panel: Map */
  .map-panel {
    background: #FFFFFF;
    border-left: 1px solid #EAF2FD;
    display: flex;
    flex-direction: column;
  }
  
  .map-container {
    width: 100%;
    height: 100%;
    position: relative;
  }
  
  .leaflet-container {
    width: 100%;
    height: 100%;
    z-index: 1;
  }
  
  .map-header {
    position: absolute;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    pointer-events: none;
  }
  
  .search-area-btn {
    background: #000;
    color: #fff;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    pointer-events: auto;
    white-space: nowrap;
  }
  
  
  /* Responsive */
  @media (max-width: 1200px) {
    .search-container {
      grid-template-columns: 250px 1fr 400px;
    }
  }
  
  @media (max-width: 900px) {
    .search-container {
      grid-template-columns: 1fr;
    }
    
    .map-panel {
      display: none;
    }
  }
</style>












