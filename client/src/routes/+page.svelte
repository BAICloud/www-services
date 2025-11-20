<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  let searchQuery = '';
  let tasks = [];
  let loading = true;
  
  onMount(async () => {
    try {
      const response = await fetch('http://localhost:3001/tasks');
      if (response.ok) {
        tasks = await response.json();
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      loading = false;
    }
  });
  
  function handleSearch() {
    if (searchQuery.trim()) {
      goto(`/search?q=${encodeURIComponent(searchQuery)}`);
    } else {
      goto('/search');
    }
  }
  
  function handleKeyPress(event) {
    if (event.key === 'Enter') {
      handleSearch();
    }
  }
</script>

<svelte:head>
  <title>HandyGO - Campus Task Sharing Platform</title>
</svelte:head>

<main class="homepage">
  <header class="header">
    <div class="container">
      <div class="nav-brand">
        <h1 class="logo">HandyGO</h1>
        <span class="tagline">Campus Task Sharing</span>
      </div>
      <nav class="nav-menu">
        <a href="/" class="nav-link active">Home</a>
        <a href="/search" class="nav-link">Browse Tasks</a>
        <a href="/post" class="nav-link">Post Task</a>
      </nav>
    </div>
  </header>

  <section class="hero">
    <div class="container">
      <h2 class="hero-title">Need Help with Campus Errands?</h2>
      <p class="hero-subtitle">Connect with fellow Aalto students for quick, reliable assistance</p>
      
      <div class="search-container">
        <div class="search-box">
          <input 
            type="text" 
            placeholder="Search for help: package pickup, printing, groceries..." 
            bind:value={searchQuery}
            on:keypress={handleKeyPress}
            class="search-input"
          />
          <button on:click={handleSearch} class="search-button">Search</button>
        </div>
      </div>
      
      <div class="quick-tags">
        <button class="tag" on:click={() => { searchQuery = 'package pickup'; handleSearch(); }}>
          📦 Package Pickup
        </button>
        <button class="tag" on:click={() => { searchQuery = 'printing'; handleSearch(); }}>
          🖨️ Printing
        </button>
        <button class="tag" on:click={() => { searchQuery = 'groceries'; handleSearch(); }}>
          🛒 Groceries
        </button>
      </div>
    </div>
  </section>

  <section class="features">
    <div class="container">
      <h3 class="section-title">Why Choose HandyGO?</h3>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h4>Quick & Easy</h4>
          <p>Post or accept tasks in less than 3 steps</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🎓</div>
          <h4>Student Verified</h4>
          <p>All users verified with Aalto student IDs</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">💬</div>
          <h4>Direct Chat</h4>
          <p>Communicate directly with helpers</p>
        </div>
      </div>
    </div>
  </section>

  <section class="recent-tasks">
    <div class="container">
      <div class="section-header">
        <h3 class="section-title">Recent Tasks</h3>
        <a href="/search" class="view-all">View All →</a>
      </div>
      
      {#if loading}
        <div class="loading">Loading tasks...</div>
      {:else if tasks.length > 0}
        <div class="tasks-grid">
          {#each tasks.slice(0, 6) as task}
            <div class="task-card" on:click={() => goto(`/task/${task.id}`)}>
              <div class="task-header">
                <h4 class="task-title">{task.name}</h4>
                <span class="task-status {task.completed ? 'completed' : 'active'}">
                  {task.completed ? 'Completed' : 'Active'}
                </span>
              </div>
              <p class="task-description">{task.description}</p>
              <div class="task-footer">
                <span class="task-time">{new Date(task.time).toLocaleDateString()}</span>
                <button class="view-task-btn">View Details</button>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="no-tasks">
          <p>No tasks available yet. Be the first to post one!</p>
          <a href="/post" class="post-first-btn">Post Your First Task</a>
        </div>
      {/if}
    </div>
  </section>
</main>

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #000000;
    background-color: #FFFFFF;
  }
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }
  
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
  
  .nav-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .logo {
    font-size: 1.8rem;
    font-weight: 700;
    color: #000000;
    margin: 0;
  }
  
  .tagline {
    font-size: 0.9rem;
    color: #666;
    font-weight: 400;
  }
  
  .nav-menu {
    display: flex;
    gap: 2rem;
  }
  
  .nav-link {
    text-decoration: none;
    color: #000000;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    transition: all 0.2s ease;
  }
  
  .nav-link:hover,
  .nav-link.active {
    background-color: #ECF86E;
    color: #000000;
  }
  
  .hero {
    background: linear-gradient(135deg, #F8FFCB 0%, #EAF2FD 100%);
    padding: 4rem 0;
    text-align: center;
  }
  
  .hero-title {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: #000000;
  }
  
  .hero-subtitle {
    font-size: 1.2rem;
    color: #666;
    margin-bottom: 2rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }
  
  .search-container {
    max-width: 600px;
    margin: 0 auto 2rem;
  }
  
  .search-box {
    display: flex;
    background: #FFFFFF;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
  
  .search-input {
    flex: 1;
    padding: 1rem 1.5rem;
    border: none;
    font-size: 1rem;
    outline: none;
  }
  
  .search-button {
    background: #ECF86E;
    border: none;
    padding: 1rem 1.5rem;
    cursor: pointer;
    font-weight: 600;
    transition: background-color 0.2s ease;
  }
  
  .search-button:hover {
    background: #E0F055;
  }
  
  .quick-tags {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .tag {
    background: #FFFFFF;
    border: 2px solid #EAF2FD;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }
  
  .tag:hover {
    border-color: #ECF86E;
    background: #F8FFCB;
  }
  
  .features {
    padding: 4rem 0;
    background: #FFFFFF;
  }
  
  .section-title {
    font-size: 2.5rem;
    font-weight: 700;
    text-align: center;
    margin-bottom: 3rem;
    color: #000000;
  }
  
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
  }
  
  .feature-card {
    text-align: center;
    padding: 2rem;
    background: #F8FFCB;
    border-radius: 12px;
    transition: transform 0.2s ease;
  }
  
  .feature-card:hover {
    transform: translateY(-5px);
  }
  
  .feature-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  .feature-card h4 {
    font-size: 1.3rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #000000;
  }
  
  .feature-card p {
    color: #666;
  }
  
  .recent-tasks {
    padding: 4rem 0;
    background: #EAF2FD;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .view-all {
    color: #000000;
    text-decoration: none;
    font-weight: 600;
    transition: color 0.2s ease;
  }
  
  .view-all:hover {
    color: #ECF86E;
  }
  
  .tasks-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  
  .task-card {
    background: #FFFFFF;
    border-radius: 12px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  
  .task-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }
  
  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }
  
  .task-title {
    font-size: 1.2rem;
    font-weight: 600;
    color: #000000;
    margin: 0;
  }
  
  .task-status {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 500;
  }
  
  .task-status.active {
    background: #ECF86E;
    color: #000000;
  }
  
  .task-status.completed {
    background: #EAF2FD;
    color: #666;
  }
  
  .task-description {
    color: #666;
    margin-bottom: 1rem;
    line-height: 1.5;
  }
  
  .task-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .task-time {
    font-size: 0.9rem;
    color: #999;
  }
  
  .view-task-btn {
    background: #ECF86E;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  
  .view-task-btn:hover {
    background: #E0F055;
  }
  
  .loading {
    text-align: center;
    padding: 2rem;
    color: #666;
  }
  
  .no-tasks {
    text-align: center;
    padding: 3rem;
  }
  
  .no-tasks p {
    font-size: 1.1rem;
    color: #666;
    margin-bottom: 1rem;
  }
  
  .post-first-btn {
    background: #ECF86E;
    color: #000000;
    text-decoration: none;
    padding: 1rem 2rem;
    border-radius: 8px;
    font-weight: 600;
    transition: background-color 0.2s ease;
  }
  
  .post-first-btn:hover {
    background: #E0F055;
  }
  
  @media (max-width: 768px) {
    .hero-title {
      font-size: 2rem;
    }
    
    .header .container {
      flex-direction: column;
      gap: 1rem;
    }
    
    .nav-menu {
      gap: 1rem;
    }
  }
</style>