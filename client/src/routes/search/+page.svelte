<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  
  let tasks = [];
  let loading = true;
  let searchQuery = '';
  
  $: {
    searchQuery = $page.url.searchParams.get('q') || '';
  }
  
  onMount(async () => {
    await loadTasks();
  });
  
  async function loadTasks() {
    loading = true;
    try {
      const response = await fetch('http://localhost:3001/tasks');
      if (response.ok) {
        const allTasks = await response.json();
        if (searchQuery) {
          tasks = allTasks.filter(task => 
            task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.description.toLowerCase().includes(searchQuery.toLowerCase())
          );
        } else {
          tasks = allTasks;
        }
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      loading = false;
    }
  }
  
  function handleSearch() {
    const url = new URL($page.url);
    if (searchQuery.trim()) {
      url.searchParams.set('q', searchQuery);
    } else {
      url.searchParams.delete('q');
    }
    goto(url.toString());
  }
</script>

<div class="search-page">
  <header class="header">
    <div class="container">
      <a href="/" class="logo-link">
        <h1 class="logo">HandyGO</h1>
      </a>
      <nav class="nav-menu">
        <a href="/" class="nav-link">Home</a>
        <a href="/search" class="nav-link active">Browse Tasks</a>
        <a href="/post" class="nav-link">Post Task</a>
      </nav>
    </div>
  </header>

  <section class="search-section">
    <div class="container">
      <div class="search-box">
        <input 
          type="text" 
          placeholder="Search tasks..." 
          bind:value={searchQuery}
          on:keypress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button on:click={handleSearch}>Search</button>
      </div>
      
      {#if loading}
        <div class="loading">Loading tasks...</div>
      {:else if tasks.length > 0}
        <div class="tasks-grid">
          {#each tasks as task}
            <div class="task-card" on:click={() => goto(`/task/${task.id}`)}>
              <h3>{task.name}</h3>
              <p>{task.description}</p>
              <div class="task-footer">
                <span class="task-status {task.completed ? 'completed' : 'active'}">
                  {task.completed ? 'Completed' : 'Active'}
                </span>
                <button>View Details</button>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="no-tasks">
          <p>No tasks found. <a href="/post">Post a task</a></p>
        </div>
      {/if}
    </div>
  </section>
</div>

<style>
  .header {
    background: #FFFFFF;
    border-bottom: 1px solid #EAF2FD;
    padding: 1rem 0;
  }
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }
  
  .header .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .logo-link {
    text-decoration: none;
    color: #000;
  }
  
  .logo {
    font-size: 1.8rem;
    font-weight: 700;
    margin: 0;
  }
  
  .nav-menu {
    display: flex;
    gap: 2rem;
  }
  
  .nav-link {
    text-decoration: none;
    color: #000;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 6px;
  }
  
  .nav-link.active {
    background: #ECF86E;
  }
  
  .search-section {
    padding: 3rem 0;
  }
  
  .search-box {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    max-width: 600px;
  }
  
  .search-box input {
    flex: 1;
    padding: 1rem;
    border: 2px solid #EAF2FD;
    border-radius: 8px;
    font-size: 1rem;
  }
  
  .search-box button {
    background: #ECF86E;
    border: none;
    padding: 1rem 2rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  }
  
  .tasks-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  
  .task-card {
    background: #FFFFFF;
    border: 2px solid #EAF2FD;
    border-radius: 12px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .task-card:hover {
    border-color: #ECF86E;
    transform: translateY(-3px);
  }
  
  .task-card h3 {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #000;
  }
  
  .task-card p {
    color: #666;
    margin-bottom: 1rem;
  }
  
  .task-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .task-status {
    padding: 0.3rem 0.8rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
  }
  
  .task-status.active {
    background: #ECF86E;
    color: #000;
  }
  
  .task-status.completed {
    background: #EAF2FD;
    color: #666;
  }
  
  .task-card button {
    background: #ECF86E;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
  }
  
  .loading, .no-tasks {
    text-align: center;
    padding: 3rem;
    color: #666;
  }
</style>

