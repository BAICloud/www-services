<script>
  import { goto } from '$app/navigation';
  
  let taskForm = {
    name: '',
    description: ''
  };
  
  let submitting = false;
  let success = false;
  
  async function handleSubmit() {
    if (!taskForm.name.trim() || !taskForm.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    
    submitting = true;
    try {
      const response = await fetch('http://localhost:3001/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: taskForm.name,
          description: taskForm.description
        })
      });
      
      if (response.ok) {
        success = true;
        setTimeout(() => {
          goto('/search');
        }, 2000);
      } else {
        throw new Error('Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      submitting = false;
    }
  }
</script>

<div class="post-page">
  <header class="header">
    <div class="container">
      <a href="/" class="logo-link">
        <h1 class="logo">HandyGO</h1>
      </a>
      <nav class="nav-menu">
        <a href="/" class="nav-link">Home</a>
        <a href="/search" class="nav-link">Browse Tasks</a>
        <a href="/post" class="nav-link active">Post Task</a>
      </nav>
    </div>
  </header>

  <div class="container">
    {#if success}
      <div class="success-message">
        <h2>✅ Task Posted Successfully!</h2>
        <p>Your task has been posted and is now visible to other students.</p>
        <p>Redirecting to search page...</p>
      </div>
    {:else}
      <div class="post-form">
        <div class="form-header">
          <h1>Post Your Task</h1>
          <p>Describe what help you need and find fellow students to assist you</p>
        </div>

        <form on:submit|preventDefault={handleSubmit} class="task-form">
          <div class="form-group">
            <label for="task-name" class="form-label">Task Title *</label>
            <input
              id="task-name"
              type="text"
              bind:value={taskForm.name}
              placeholder="e.g., Pick up package from A Bloc post office"
              class="form-input"
              required
            />
          </div>

          <div class="form-group">
            <label for="task-description" class="form-label">Detailed Description *</label>
            <textarea
              id="task-description"
              bind:value={taskForm.description}
              placeholder="Provide more details about your task..."
              class="form-textarea"
              rows="4"
              required
            ></textarea>
          </div>

          <div class="form-actions">
            <button type="submit" disabled={submitting} class="submit-btn">
              {submitting ? 'Posting Task...' : 'Post Task'}
            </button>
          </div>
        </form>
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
    max-width: 800px;
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
  
  .post-form {
    padding: 2rem 0;
  }
  
  .form-header {
    text-align: center;
    margin-bottom: 3rem;
  }
  
  .form-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: #000000;
  }
  
  .form-header p {
    font-size: 1.2rem;
    color: #666;
  }
  
  .form-group {
    margin-bottom: 2rem;
  }
  
  .form-label {
    display: block;
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #000000;
  }
  
  .form-input,
  .form-textarea {
    width: 100%;
    padding: 1rem;
    border: 2px solid #EAF2FD;
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
    min-height: 120px;
  }
  
  .form-actions {
    display: flex;
    justify-content: center;
    margin-top: 3rem;
  }
  
  .submit-btn {
    background: #ECF86E;
    color: #000000;
    border: none;
    padding: 1rem 2rem;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .submit-btn:hover:not(:disabled) {
    background: #E0F055;
  }
  
  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .success-message {
    text-align: center;
    padding: 4rem 2rem;
    background: #F8FFCB;
    border-radius: 16px;
    max-width: 600px;
    margin: 0 auto;
  }
  
  .success-message h2 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: #000000;
  }
  
  .success-message p {
    font-size: 1.1rem;
    color: #666;
    margin-bottom: 0.5rem;
  }
</style>

