<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  let postType = 'need';
  let uploadedImages = [];
  let postTitle = '';
  let description = '';
  let price = '';
  let location = 'Espoo, Finland';
  let showLocationSuggestions = false;
  let locationSuggestions = [];
  let searchingLocation = false;
  
  let submitting = false;
  let isLoggedIn = false;
  let currentUser = null;
  let showUserMenu = false;
  let showLanguageMenu = false;
  let currentLanguage = 'en';
  
  onMount(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      currentUser = JSON.parse(userData);
      isLoggedIn = true;
    }
    
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      currentLanguage = savedLanguage;
    }
  });
  
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
  
  function handleImageUpload(event) {
    const files = event.target.files;
    if (files.length > 6) {
      alert('Maximum of 6 pictures allowed');
      return;
    }
    uploadedImages = Array.from(files);
  }
  
  async function getCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    
    searchingLocation = true;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Use OpenStreetMap Nominatim API for reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();
          
          if (data.address) {
            const parts = [];
            if (data.address.city) parts.push(data.address.city);
            if (data.address.state) parts.push(data.address.state);
            if (data.address.country) parts.push(data.address.country);
            location = parts.join(', ') || `${latitude}, ${longitude}`;
          }
        } catch (error) {
          console.error('Error getting location:', error);
          location = `${latitude}, ${longitude}`;
        }
        searchingLocation = false;
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your location');
        searchingLocation = false;
      }
    );
  }
  
  async function searchLocation(query) {
    if (!query.trim()) {
      locationSuggestions = [];
      showLocationSuggestions = false;
      return;
    }
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`
      );
      const data = await response.json();
      
      locationSuggestions = data.map(item => ({
        display_name: item.display_name,
        lat: item.lat,
        lon: item.lon
      }));
      showLocationSuggestions = true;
    } catch (error) {
      console.error('Error searching location:', error);
    }
  }
  
  function handleLocationChange(value) {
    location = value;
    searchLocation(value);
  }
  
  function selectLocation(suggestion) {
    location = suggestion.display_name;
    showLocationSuggestions = false;
    locationSuggestions = [];
  }
  
  async function handlePost() {
    if (!postTitle.trim() || !description.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    
    submitting = true;
    try {
      const sanitizedPrice = (price ?? '').toString().trim();
      const sanitizedLocation = (location ?? '').toString().trim();
      const payload = {
        name: postTitle.trim(),
        description: description.trim(),
        price: sanitizedPrice !== '' ? sanitizedPrice : '0',
        location: sanitizedLocation !== '' ? sanitizedLocation : 'Espoo, Finland',
        type: postType || 'need',
        userId: currentUser?.id || currentUser?.email || currentUser?.name || 'anonymous'
      };
      
      const response = await fetch('https://loud-starling-77.deno.dev/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        alert('Post created successfully!');
        goto('/search');
      } else {
        throw new Error('Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>New Announcement - HandyGO</title>
</svelte:head>

<main class="post-page">
  <!-- Navigation Header -->
  <header class="header">
    <div class="container">
      <div class="nav-left" on:click={() => goto('/')} role="button" tabindex="0" on:keydown={(e) => { if (e.key === 'Enter') goto('/'); }}>
        <img src="/favicon.png" alt="HandyGO" class="logo-icon" />
        <h1 class="logo">HandyGO</h1>
      </div>
      <nav class="nav-right">
        {#if isLoggedIn}
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
          <button class="icon-button" title="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" stroke-width="2"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2"/>
              <circle cx="19" cy="5" r="4" fill="#ECF86E"/>
            </svg>
          </button>
          <button class="icon-button" title="Messages">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        {:else}
          <button class="btn-login" on:click={() => goto('/login')}>Login</button>
          <button class="btn-register" on:click={() => goto('/register')}>Register</button>
        {/if}
        
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

  <div class="container">
    <div class="post-content">
      <h1 class="page-title">New Announcement</h1>
      
      <!-- Type Selection -->
      <div class="form-section">
        <h2 class="section-label">Type</h2>
        <div class="type-toggle">
          <button 
            class="type-btn {postType === 'need' ? 'active' : ''}" 
            on:click={() => postType = 'need'}
          >
            Need
          </button>
          <button 
            class="type-btn {postType === 'offer' ? 'active' : ''}" 
            on:click={() => postType = 'offer'}
          >
            Offer
          </button>
        </div>
      </div>
      
      <!-- Pictures -->
      <div class="form-section">
        <h2 class="section-label">Pictures</h2>
        <div class="upload-container">
          <label for="image-upload" class="upload-box">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14" stroke-linecap="round"/>
            </svg>
            <span>Upload Images</span>
          </label>
          <input 
            id="image-upload" 
            type="file" 
            multiple 
            accept="image/*" 
            on:change={handleImageUpload}
            style="display: none;"
          />
          <span class="upload-hint">*Maximum of 6 pictures</span>
        </div>
        {#if uploadedImages.length > 0}
          <div class="uploaded-images">
            {#each uploadedImages as image}
              <div class="image-preview">
                <img src={URL.createObjectURL(image)} alt="Preview" />
              </div>
            {/each}
          </div>
        {/if}
      </div>
      
      <!-- Title -->
      <div class="form-section">
        <h2 class="section-label">Title of the posts</h2>
        <input 
          type="text" 
          bind:value={postTitle}
          placeholder="Enter post title..."
          class="form-input"
        />
      </div>
      
      <!-- Description -->
      <div class="form-section">
        <h2 class="section-label">Description</h2>
        <textarea 
          bind:value={description}
          placeholder="Describe the specific requirements of the task, including time and location..."
          class="form-textarea"
          rows="4"
        ></textarea>
      </div>
      
      <!-- Price -->
      <div class="form-section">
        <h2 class="section-label">Price</h2>
        <div class="price-input">
          <span class="price-symbol">€</span>
          <input 
            type="number" 
            bind:value={price}
            placeholder="0"
            class="form-input"
          />
        </div>
      </div>
      
      <!-- Location -->
      <div class="form-section">
        <h2 class="section-label">Location</h2>
        <div class="location-container">
          <div class="location-input-wrapper">
            <button 
              class="location-btn" 
              type="button"
              on:click={getCurrentLocation}
              disabled={searchingLocation}
              title="Get current location"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              {searchingLocation ? 'Locating...' : '📍'}
            </button>
            <div class="location-input">
              <input 
                type="text" 
                bind:value={location}
                on:input={(e) => handleLocationChange(e.target.value)}
                placeholder="Espoo, Finland or search for a location"
                class="form-input"
              />
            </div>
          </div>
          {#if showLocationSuggestions && locationSuggestions.length > 0}
            <div class="location-suggestions">
              {#each locationSuggestions as suggestion}
                <button 
                  class="suggestion-item" 
                  type="button"
                  on:click={() => selectLocation(suggestion)}
                >
                  {suggestion.display_name}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Post Button -->
      <div class="post-action">
        <button 
          class="post-btn" 
          on:click={handlePost}
          disabled={submitting}
        >
          {submitting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  </div>
</main>

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #FFFFFF;
    color: #000000;
  }
  
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 20px;
  }
  
  /* Header Styles (same as other pages) */
  .header {
    background: #FFFFFF;
    border-bottom: 1px solid #EAF2FD;
    position: sticky;
    top: 0;
    z-index: 100;
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
    cursor: pointer;
    transition: opacity 0.2s ease;
  }
  
  .nav-left:hover {
    opacity: 0.7;
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
  
  .nav-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
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
  
  /* Post Content */
  .post-content {
    padding: 2rem 0;
  }
  
  .page-title {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 2rem;
    color: #000000;
  }
  
  .form-section {
    margin-bottom: 2rem;
  }
  
  .section-label {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: #000000;
  }
  
  /* Type Toggle */
  .type-toggle {
    display: flex;
    gap: 1rem;
  }
  
  .type-btn {
    flex: 1;
    padding: 0.75rem 1.5rem;
    border: 2px solid #EAF2FD;
    background: #FFFFFF;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .type-btn.active {
    background: #ECF86E;
    border-color: #ECF86E;
    color: #000000;
  }
  
  .type-btn:hover:not(.active) {
    background: #F8FFCB;
  }
  
  /* Upload Box */
  .upload-container {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .upload-box {
    width: 200px;
    height: 200px;
    background: #EAF2FD;
    border: 2px dashed #D4E8FD;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .upload-box:hover {
    background: #D4E8FD;
    border-color: #ECF86E;
  }
  
  .upload-box svg {
    color: #666;
  }
  
  .upload-box span {
    font-size: 0.9rem;
    color: #666;
  }
  
  .upload-hint {
    font-size: 0.85rem;
    color: #666;
  }
  
  .uploaded-images {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 1rem;
  }
  
  .image-preview {
    width: 100px;
    height: 100px;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .image-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  /* Form Inputs */
  .form-input,
  .form-textarea {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 2px solid #EAF2FD;
    background: #FFFFFF;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s ease;
  }
  
  .form-input:focus,
  .form-textarea:focus {
    outline: none;
    border-color: #ECF86E;
  }
  
  .form-textarea {
    resize: vertical;
    font-family: inherit;
  }
  
  /* Price Input */
  .price-input {
    display: flex;
    align-items: center;
    border: 2px solid #EAF2FD;
    border-radius: 8px;
    background: #FFFFFF;
  }
  
  .price-symbol {
    padding: 0.75rem;
    font-weight: 600;
    color: #666;
  }
  
  .price-input .form-input {
    border: none;
    padding: 0.75rem 1rem;
  }
  
  .price-input:focus-within {
    border-color: #ECF86E;
  }
  
  /* Location Input */
  .location-container {
    position: relative;
  }
  
  .location-input-wrapper {
    display: flex;
    gap: 0.5rem;
  }
  
  .location-btn {
    background: #ECF86E;
    border: 2px solid #ECF86E;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s ease;
    white-space: nowrap;
  }
  
  .location-btn:hover:not(:disabled) {
    background: #E0F055;
    border-color: #E0F055;
  }
  
  .location-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .location-input {
    flex: 1;
    display: flex;
    align-items: center;
    border: 2px solid #EAF2FD;
    border-radius: 8px;
    background: #FFFFFF;
  }
  
  .location-input .form-input {
    border: none;
    padding: 0.75rem;
  }
  
  .location-input:focus-within {
    border-color: #ECF86E;
  }
  
  .location-suggestions {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 0;
    right: 0;
    background: #FFFFFF;
    border: 2px solid #EAF2FD;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    max-height: 200px;
    overflow-y: auto;
    z-index: 100;
  }
  
  .suggestion-item {
    width: 100%;
    padding: 0.75rem 1rem;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    transition: background 0.2s ease;
    font-size: 0.9rem;
    color: #000000;
  }
  
  .suggestion-item:hover {
    background: #F8FFCB;
  }
  
  /* Post Button */
  .post-action {
    display: flex;
    justify-content: flex-end;
    margin-top: 2rem;
  }
  
  .post-btn {
    background: #EAF2FD;
    border: none;
    color: #000000;
    padding: 1rem 3rem;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .post-btn:hover:not(:disabled) {
    background: #D4E8FD;
    transform: translateY(-2px);
  }
  
  .post-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .upload-container {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .type-toggle {
      flex-direction: column;
    }
    
    .post-btn {
      width: 100%;
    }
  }
</style>
