<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  
  let task = null;
  let loading = true;
  let error = null;
  
  $: taskId = $page.params.id;
  
  onMount(async () => {
    await loadTask();
  });
  
  async function loadTask() {
    loading = true;
    error = null;
    try {
      const response = await fetch(`http://localhost:3001/tasks/${taskId}`);
      if (!response.ok) {
        throw new Error('Task not found');
      }
      task = await response.json();
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="task-detail-page">
  <header class="header">
    <div class="container">
      <a href="/" class="logo-link">
        <h1 class="logo">HandyGO</h1>
      </a>
      <nav class="nav-menu">
        <a href="/" class="nav-link">Home</a>
        <a href="/search" class="nav-link">Browse Tasks</a>
        <a href="/post" class="nav-link">Post Task</a>
      </nav>
    </div>
  </header>

  <div class="container">
    {#if loading}
      <div class="loading">Loading task details...</div>
    {:else if error}
      <div class="error">
        <h2>Task Not Found</h2>
        <p>{error}</p>
        <a href="/search" class="back-btn">Back to Search</a>
      </div>
    {:else if task}
      <div class="task-detail">
        <div class="task-header">
          <h1 class="task-title">{task.name}</h1>
          <span class="task-status {task.completed ? 'completed' : 'active'}">
            {task.completed ? 'Completed' : 'Active'}
          </span>
        </div>
        
        <div class="task-content">
          <div class="task-description">
            <h3>Task Description</h3>
            <p>{task.description}</p>
          </div>
          
          <div class="task-meta">
            <p><strong>Posted:</strong> {new Date(task.time).toLocaleDateString()}</p>
            <p><strong>Status:</strong> {task.completed ? 'Completed' : 'Looking for helpers'}</p>
          </div>
          
          <div class="task-actions">
            <button class="accept-btn">Accept Task</button>
            <button class="chat-btn">Start Chat</button>
          </div>
        </div>
      </div>
    {/if}
  </div>
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
  
  .task-detail {
    padding: 2rem 0;
  }
  
  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 2px solid #EAF2FD;
  }
  
  .task-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: #000000;
    margin: 0;
  }
  
  .task-status {
    padding: 0.3rem 0.8rem;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 600;
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
    margin-bottom: 2rem;
  }
  
  .task-description h3 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: #000000;
  }
  
  .task-description p {
    font-size: 1.1rem;
    line-height: 1.7;
    color: #666;
  }
  
  .task-meta {
    background: #F8FFCB;
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 2rem;
  }
  
  .task-meta p {
    margin-bottom: 0.5rem;
    color: #000;
  }
  
  .task-actions {
    display: flex;
    gap: 1rem;
  }
  
  .accept-btn,
  .chat-btn {
    padding: 1rem 2rem;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .accept-btn {
    background: #ECF86E;
    color: #000000;
  }
  
  .accept-btn:hover {
    background: #E0F055;
  }
  
  .chat-btn {
    background: #EAF2FD;
    color: #000000;
  }
  
  .chat-btn:hover {
    background: #D4E8FD;
  }
  
  .loading, .error {
    text-align: center;
    padding: 4rem 0;
  }
  
  .back-btn {
    background: #ECF86E;
    color: #000000;
    text-decoration: none;
    padding: 1rem 2rem;
    border-radius: 8px;
    font-weight: 600;
    display: inline-block;
    margin-top: 1rem;
  }
</style>

