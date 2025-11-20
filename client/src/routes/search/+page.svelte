<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { apiUrl, API_CONFIG } from '$lib/api-config.js';
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
  let selectedTaskId = null; // Track selected/hovered task from map marker
  let taskCoordinates = new Map(); // Store stable coordinates for each task
  let filterByMapBounds = false; // Whether to filter tasks by current map bounds
  
  $: {
    searchQuery = $page.url.searchParams.get('q') || '';
  }
  
  // Reload tasks when search query changes (only in browser)
  $: if (searchQuery !== undefined && browser) {
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
    
    // Initialize Leaflet map centered on Aalto University ABLOCK
    map = L.map(mapContainer, {
      zoomControl: false,
      attributionControl: true
    }).setView([60.1848, 24.8274], 15);
    
    // Add CartoDB Positron tile layer (modern, minimal style)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);
    
    // Add custom zoom controls
    const zoomControl = L.control.zoom({
      position: 'topright'
    }).addTo(map);
    
    // Force map to recalculate size after a short delay to ensure layout is stable
    setTimeout(() => {
      if (map) {
        map.invalidateSize();
        // Ensure zoom controls are visible and positioned correctly
        ensureZoomControlsVisible();
      }
    }, 100);
    
    // Add markers for tasks
    if (tasks.length > 0) {
      addMarkersToMap();
    }
    
    // Listen for map move/zoom events to update filters if "Search this area" is active
    map.on('moveend zoomend', () => {
      if (filterByMapBounds) {
        // Automatically refresh task list when map bounds change and filter is active
        loadTasks();
      }
      // Ensure zoom controls stay visible after map events
      ensureZoomControlsVisible();
      // Ensure map header button stays in correct position
      ensureMapHeaderPosition();
    });
    
    // Ensure zoom controls are always visible after zoom
    map.on('zoomend', () => {
      ensureZoomControlsVisible();
      ensureMapHeaderPosition();
    });
    
    // Also listen for zoomstart to fix position immediately
    map.on('zoomstart', () => {
      ensureMapHeaderPosition();
    });
    
    // Function to ensure zoom controls are always visible and correctly positioned
    function ensureZoomControlsVisible() {
      const zoomControls = document.querySelector('.leaflet-control-zoom');
      if (zoomControls) {
        zoomControls.style.display = 'block';
        zoomControls.style.visibility = 'visible';
        zoomControls.style.opacity = '1';
        zoomControls.style.position = 'absolute';
        zoomControls.style.top = '16px';
        zoomControls.style.right = '16px';
        zoomControls.style.zIndex = '1000';
        zoomControls.style.margin = '0';
      }
    }
    
    // Function to ensure map header button stays in correct position
    function ensureMapHeaderPosition() {
      const mapHeader = document.querySelector('.map-header');
      const mapPanel = document.querySelector('.map-panel');
      if (mapHeader && mapPanel) {
        // Force the header to stay at the top center of map-panel (NOT map-container)
        // This ensures it doesn't move when the map zooms
        mapHeader.style.position = 'absolute';
        mapHeader.style.top = '16px'; // Fixed 16px from top of map-panel
        mapHeader.style.left = '50%';
        mapHeader.style.transform = 'translateX(-50%)';
        mapHeader.style.zIndex = '999';
        mapHeader.style.margin = '0';
        mapHeader.style.padding = '0';
      }
    }
    
    // Use MutationObserver to watch for changes to zoom controls and map header
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => {
        ensureZoomControlsVisible();
        ensureMapHeaderPosition();
      });
      
      const mapElement = mapContainer;
      if (mapElement) {
        observer.observe(mapElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class']
        });
        // Also observe the parent container for header changes
        const parentContainer = mapElement.parentElement;
        if (parentContainer) {
          observer.observe(parentContainer, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
          });
        }
      }
    }
    
    // Periodically check and fix zoom controls and header position (safety net)
    const zoomControlCheckInterval = setInterval(() => {
      if (map && mapContainer) {
        ensureZoomControlsVisible();
        ensureMapHeaderPosition();
      } else {
        clearInterval(zoomControlCheckInterval);
      }
    }, 500); // Check every 500ms
    
    // Initial positioning
    setTimeout(() => {
      ensureMapHeaderPosition();
    }, 200);
  }
  
  function addMarkersToMap() {
    if (!map || !L) return;
    
    // STRICT CHECK: Don't recreate markers if they're already initialized
    // This prevents markers from moving when hovering over cards
    if (markersInitialized && markers.length > 0) {
      console.log('⚠️ Markers already initialized, skipping recreation. This should not happen during hover!');
      console.trace('Stack trace to see what triggered this');
      return;
    }
    
    console.log('✅ Creating markers... (This should only happen when tasks change)');
    
    // Clear existing markers
    markers.forEach(marker => {
      if (marker && map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
    markers = [];
    
    // Add marker for each task (showing rank number)
    // ABLOCK coordinates: 60.1848, 24.8274
    const ABLOCK_LAT = 60.1848;
    const ABLOCK_LNG = 24.8274;
    
    console.log(`Adding markers for ${tasks.length} tasks (showing first 10)`);
    
    tasks.slice(0, 10).forEach((task, index) => {
      const rank = index + 1; // Rank is 1-indexed
      const taskId = task?.id || `task_${index}`;
      
      if (!task || !task.id) {
        console.warn(`Task at index ${index} is missing ID, using fallback: ${taskId}`);
      }
      
      // Use cached coordinates if available, otherwise calculate and cache
      let lat, lng;
      if (taskCoordinates.has(taskId)) {
        const coords = taskCoordinates.get(taskId);
        lat = coords.lat;
        lng = coords.lng;
      } else {
        // Generate stable position based on task ID using a simple hash
        function hashString(str) {
          if (!str || typeof str !== 'string') return 0;
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          return hash;
        }
        
        // Use a combination of hash and index to ensure unique positions
        // This prevents all markers from overlapping if task IDs are missing or identical
        const hash = Math.abs(hashString(taskId));
        const combinedHash = hash + (index * 7919); // Prime number for better distribution
        
        // Generate position around ABLOCK with visible offsets
        // Offset range: -0.005 to +0.005 degrees (about 500 meters)
        // This ensures markers are spread out around ABLOCK but still visible on the map
        const latOffset = ((combinedHash % 1000 - 500) / 100000); // ±0.005 degrees
        const lngOffset = (((combinedHash >> 10) % 1000 - 500) / 100000); // ±0.005 degrees
        
        // Ensure coordinates are valid numbers
        lat = ABLOCK_LAT + latOffset;
        lng = ABLOCK_LNG + lngOffset;
        
        // Validate coordinates before creating marker
        if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng) || 
            lat < 60 || lat > 61 || lng < 24 || lng > 25) {
          console.warn(`Invalid coordinates for task ${taskId}, using ABLOCK with index offset`);
          // Use ABLOCK with index-based offset as fallback (spread in a grid)
          const row = Math.floor(index / 3);
          const col = index % 3;
          lat = ABLOCK_LAT + (row * 0.0005) - 0.0005; // 3 rows
          lng = ABLOCK_LNG + (col * 0.0005) - 0.0005; // 3 columns
        }
        
        // Cache the coordinates
        taskCoordinates.set(taskId, { lat, lng });
      }
      
      // Create custom icon with rank number for each marker (black modern style)
      // The SVG viewBox is 155x200, icon size is 32x42
      // The teardrop tip should point to the exact coordinate
      const pinIcon = L.divIcon({
        html: `
          <div style="position: relative; width: 32px; height: 42px;">
            <svg width="32" height="42" viewBox="0 0 155 200" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
              <path d="M77.1375 0C34.6 0 -0.00416623 34.6 3.76228e-07 77.1333C3.76228e-07 92.9333 4.74583 108.125 13.6292 120.913C14.075 121.679 14.525 122.421 15.0542 123.142L71.3583 197.358C72.8875 199.063 74.9417 200 77.1417 200C79.3125 200 81.3792 199.054 83.1667 197.05L139.212 123.129C139.767 122.396 140.238 121.592 140.496 121.121C149.508 108.154 154.279 92.9458 154.279 77.1417C154.279 34.6 119.675 0 77.1375 0Z" fill="#000000"/>
            </svg>
            <span style="position: absolute; top: 28%; left: 50%; transform: translateX(-50%); font-weight: 700; font-size: 0.85rem; color: #FFFFFF; text-shadow: 0 1px 2px rgba(0,0,0,0.5); line-height: 1;">${rank}</span>
          </div>
        `,
        className: 'custom-pin',
        iconSize: [32, 42],
        iconAnchor: [16, 42], // Center horizontally (32/2), bottom vertically (42)
        popupAnchor: [0, -42]
      });
      
      // Create marker with explicit coordinates to ensure stability
      const marker = L.marker([lat, lng], { 
        icon: pinIcon,
        draggable: false,
        keyboard: false
      }).addTo(map);
      
      // Explicitly set position to ensure it doesn't change
      marker.setLatLng([lat, lng]);
      
      // LOCK the marker position - prevent any code from changing it
      const originalLatLng = [lat, lng];
      marker.setLatLng = function(newLatLng) {
        // Ignore any attempts to change position - keep original position
        if (L && this._map) {
          L.Marker.prototype.setLatLng.call(this, originalLatLng);
        }
        return this;
      };
      
      // Debug: log marker creation
      console.log(`Created marker #${rank} for task ${taskId} at (${lat.toFixed(6)}, ${lng.toFixed(6)}) - Position LOCKED`);
      
      // Store task reference and coordinates in marker for hover matching
      marker._taskId = task.id;
      marker._lat = lat;
      marker._lng = lng;
      marker._locked = true; // Mark as locked
      
      // Add click event to marker - scroll to card when clicked
      marker.on('click', (e) => {
        console.log(`📍 Marker clicked for task ${task.id}`);
        e.originalEvent?.stopPropagation(); // Prevent map click
        selectedTaskId = task.id;
        // Scroll to corresponding card (only scrolls the card list, not the page)
        scrollToCard(task.id);
      });
      
      // Add hover events for visual feedback (highlight marker)
      marker.on('mouseover', () => {
        selectedTaskId = task.id;
        // Just highlight, don't scroll on hover
      });
      
      marker.on('mouseout', () => {
        // Don't clear immediately, let card hover take over if mouse moves there
        setTimeout(() => {
          if (selectedTaskId === task.id) {
            selectedTaskId = null;
          }
        }, 100);
      });
      
      markers.push(marker);
    });
    
    console.log(`Successfully created ${markers.length} markers on the map`);
    console.log('Marker coordinates:', markers.map(m => ({
      taskId: m._taskId,
      lat: m._lat?.toFixed(6),
      lng: m._lng?.toFixed(6)
    })));
    
    markersInitialized = true;
  }
  
  // Watch for hoveredTask changes and highlight corresponding marker
  // IMPORTANT: This ONLY changes marker styling (opacity, scale, z-index), NEVER position
  $: if (hoveredTask && map && markers.length > 0 && markersInitialized) {
    markers.forEach((marker) => {
      // DO NOT touch marker position here - only change visual styling
      if (marker._taskId === hoveredTask.id) {
        // Highlight the hovered marker
        marker.setOpacity(1);
        marker.setZIndexOffset(1000);
        const iconElement = marker._icon;
        if (iconElement) {
          iconElement.style.transform = 'scale(1.3)';
          iconElement.style.transition = 'transform 0.2s ease';
        }
      } else {
        // Dim other markers
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
  // IMPORTANT: This ONLY changes marker styling, NEVER position
  $: if (!hoveredTask && map && markers.length > 0 && markersInitialized) {
    markers.forEach(marker => {
      // DO NOT touch marker position here - only reset visual styling
      marker.setOpacity(1);
      marker.setZIndexOffset(0);
      const iconElement = marker._icon;
      if (iconElement) {
        iconElement.style.transform = 'scale(1)';
      }
    });
  }
  
  // Watch for tasks changes and reload markers (only when tasks actually change)
  // This reactive statement only depends on tasks, map, L, and loading - NOT on hoveredTask or selectedTaskId
  // CRITICAL: This should NEVER run during hover - only when tasks array reference or content actually changes
  $: if (map && L && tasks.length > 0 && !loading) {
    // Create a stable hash of task IDs to detect changes
    const currentHash = tasks
      .slice(0, 10)
      .map(t => t?.id || '')
      .filter(id => id !== '')
      .join(',');
    
    // STRICT: Only reload markers if the task list hash actually changed AND markers aren't already initialized
    if (currentHash !== lastTasksHash && currentHash !== '' && (!markersInitialized || markers.length === 0)) {
      console.log('📋 Tasks changed, recreating markers. Old hash:', lastTasksHash, 'New hash:', currentHash);
      lastTasksHash = currentHash;
      markersInitialized = false; // Allow recreation
      addMarkersToMap();
    } else if (currentHash !== lastTasksHash && currentHash !== '') {
      // Hash changed but markers are already initialized - just update the hash, don't recreate
      console.log('📋 Task hash changed but markers already exist, updating hash only');
      lastTasksHash = currentHash;
    } else if (currentHash === lastTasksHash && !markersInitialized && markers.length === 0) {
      // Tasks haven't changed but markers need initialization
      console.log('🔧 Initializing markers for the first time');
      addMarkersToMap();
    }
    // If markers are already initialized and hash hasn't changed, do nothing
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
    // Only run in browser
    if (!browser) return;
    
    loading = true;
    try {
      const response = await fetch(apiUrl(API_CONFIG.endpoints.tasks), {
        credentials: 'include' // Include cookies for session
      });
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
      
      // Filter by map bounds (if enabled)
      if (filterByMapBounds && map && L) {
        const bounds = map.getBounds();
        filteredTasks = filteredTasks.filter(task => {
          const taskId = task?.id || '';
          // Check if task has cached coordinates
          if (taskCoordinates.has(taskId)) {
            const coords = taskCoordinates.get(taskId);
            const lat = coords.lat;
            const lng = coords.lng;
            // Check if task coordinates are within map bounds
            return bounds.contains([lat, lng]);
          }
          // If no cached coordinates, include the task (shouldn't happen if markers are created)
          return false;
        });
        console.log(`Filtered to ${filteredTasks.length} tasks within map bounds`);
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
  
  function handleSearchThisArea() {
    if (!map || !L) {
      console.warn('Map not initialized');
      return;
    }
    
    // Toggle filter by map bounds
    filterByMapBounds = !filterByMapBounds;
    
    if (filterByMapBounds) {
      // Get current map bounds
      const bounds = map.getBounds();
      console.log('Searching in area:', {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      });
      
      // Reload tasks with map bounds filter
      loadTasks();
    } else {
      // Clear map bounds filter
      loadTasks();
    }
  }
  
  function scrollToCard(taskId) {
    // Find card element by data-task-id attribute
    const cardElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (!cardElement) {
      console.warn(`Card with task ID ${taskId} not found`);
      return;
    }
    
    // Find the scrollable container (results-panel)
    const resultsPanel = document.querySelector('.results-panel');
    if (!resultsPanel) {
      console.warn('Results panel container not found, using fallback scroll');
      cardElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
      return;
    }
    
    // Get positions using getBoundingClientRect for accurate measurements
    const cardRect = cardElement.getBoundingClientRect();
    const containerRect = resultsPanel.getBoundingClientRect();
    const containerScrollTop = resultsPanel.scrollTop;
    const containerHeight = resultsPanel.clientHeight;
    
    // Calculate card's position relative to the scrollable container
    // cardRect.top is relative to viewport, containerRect.top is relative to viewport
    // So the difference gives us the card's position relative to the container's visible area
    const cardTopInViewport = cardRect.top;
    const containerTopInViewport = containerRect.top;
    
    // Card's top position relative to container's visible top edge
    const cardOffsetFromContainerTop = cardTopInViewport - containerTopInViewport;
    
    // Card's absolute position in the scrollable content
    const cardAbsoluteTop = containerScrollTop + cardOffsetFromContainerTop;
    
    // Calculate scroll position to center the card
    const cardHeight = cardRect.height;
    const scrollTo = cardAbsoluteTop - (containerHeight / 2) + (cardHeight / 2);
    
    console.log(`Scrolling to card ${taskId}:`, {
      cardTopInViewport,
      containerTopInViewport,
      cardOffsetFromContainerTop,
      containerScrollTop,
      cardAbsoluteTop,
      containerHeight,
      cardHeight,
      scrollTo: Math.max(0, scrollTo)
    });
    
    // Smooth scroll within the container only
    resultsPanel.scrollTo({
      top: Math.max(0, scrollTo), // Ensure scrollTop is not negative
      behavior: 'smooth'
    });
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
    selectedTaskId = task.id;
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
    // 清除悬停任务（但保留 selectedTaskId 如果是从地图标记触发的）
    hoveredTask = null;
    // Only clear selectedTaskId if not hovering over a marker
    setTimeout(() => {
      if (!hoveredTask) {
        selectedTaskId = null;
      }
    }, 100);
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
                class="result-card {selectedTaskId === task.id ? 'selected' : ''}"
                data-task-id={task.id}
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
        <div class="map-header">
          <button 
            class="search-area-btn {filterByMapBounds ? 'active' : ''}"
            on:click={handleSearchThisArea}
            title={filterByMapBounds ? 'Clear area filter' : 'Filter tasks by current map view'}
          >
            {filterByMapBounds ? 'Clear area filter' : 'Search this area'}
          </button>
        </div>
        <div class="map-container">
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
  
  .result-card.selected {
    border-color: #ECF86E;
    box-shadow: 0 6px 20px rgba(236, 248, 110, 0.4);
    background: #FAFFE8;
    z-index: 3;
    transform: scale(1.02);
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
    height: 100%; /* Ensure fixed height */
    min-height: 0; /* Prevent flex item from expanding */
    overflow: hidden; /* Prevent overflow */
    position: relative; /* Positioning context for map-header */
  }
  
  .map-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden; /* Prevent overflow issues */
    min-height: 0; /* Prevent flex item from expanding */
    flex: 1; /* Take up remaining space */
  }
  
  .leaflet-container {
    width: 100% !important;
    height: 100% !important;
    z-index: 1;
    position: relative; /* Ensure proper stacking context */
  }
  
  /* Ensure Leaflet zoom controls stay visible and fixed - HIGHEST PRIORITY */
  .leaflet-control-zoom {
    z-index: 1000 !important;
    position: absolute !important;
    top: 16px !important; /* Fixed pixel value instead of rem */
    right: 16px !important; /* Fixed pixel value instead of rem */
    margin: 0 !important;
    border: none !important;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.4) !important;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    transform: none !important;
    width: auto !important;
    height: auto !important;
  }
  
  .leaflet-control-zoom a {
    display: block !important;
    width: 34px !important;
    height: 34px !important;
    line-height: 34px !important;
    text-align: center !important;
    text-decoration: none !important;
    color: #333 !important;
    background: #fff !important;
    border-bottom: 1px solid #ccc !important;
    cursor: pointer !important;
    pointer-events: auto !important;
  }
  
  .leaflet-control-zoom a:hover {
    background: #f4f4f4 !important;
  }
  
  .leaflet-control-zoom-in,
  .leaflet-control-zoom-out {
    font: bold 18px/34px Arial, sans-serif !important;
  }
  
  .map-header {
    position: absolute !important;
    top: 16px !important; /* Fixed pixel value - relative to map-panel */
    left: 50% !important;
    transform: translateX(-50%) !important;
    z-index: 999 !important; /* Below zoom controls but above map */
    pointer-events: none !important;
    margin: 0 !important;
    padding: 0 !important;
    width: auto !important;
    height: auto !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-width: none !important;
    max-height: none !important;
    /* Positioned relative to map-panel, NOT map-container - this prevents movement during zoom */
  }
  
  .search-area-btn {
    background: #000;
    color: #fff;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    pointer-events: auto; /* Allow clicking despite parent's pointer-events: none */
    white-space: nowrap;
    transition: all 0.2s ease;
    position: relative; /* Ensure button is positioned correctly */
  }
  
  .search-area-btn:hover {
    background: #333;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  .search-area-btn.active {
    background: #ECF86E;
    color: #000;
  }
  
  .search-area-btn.active:hover {
    background: #d4e55a;
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












