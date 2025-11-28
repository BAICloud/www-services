<script>
  import { goto } from '$app/navigation';
  import { apiUrl, API_CONFIG } from '$lib/api-config.js';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let emailOrUsername = '';
  let password = '';
  let showPassword = false;
  let error = '';
  let loading = false;

  async function handleLogin() {
    error = '';
    loading = true;

    if (!emailOrUsername || !password) {
      error = 'Please fill in all fields';
      loading = false;
      return;
    }

    try {
      const response = await fetch(apiUrl(API_CONFIG.endpoints.auth.login), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: emailOrUsername.includes('@') ? emailOrUsername : undefined,
          username: emailOrUsername.includes('@') ? undefined : emailOrUsername,
          password: password
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store user info if returned
        if (data.user) {
          if (browser) {
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        }
        goto('/');
      } else {
        error = data.error || data.message || 'Login failed. Please check your credentials.';
      }
    } catch (err) {
      console.error('Login error:', err);
      error = 'Failed to connect to server. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Log in - HandyGO</title>
</svelte:head>

<div class="auth-page">
  <!-- Top Header -->
  <header class="top-header">
    <div class="header-content">
      <button class="back-button" on:click={() => goto('/')}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        BACK
      </button>
      <button class="logo-button" on:click={() => goto('/')}>
        <img src="/favicon.png" alt="HandyGO" class="logo-icon" />
        <span class="logo-text">HandyGo</span>
      </button>
    </div>
  </header>

  <!-- Main Content Area -->
  <main class="main-content-area">
    <div class="content-wrapper">
      <!-- Left Card - Marketing -->
      <div class="marketing-card">
        <div class="logo-section">
          <div class="logo">
            <img src="/favicon.png" alt="HandyGO" class="logo-icon-large" />
            <span class="logo-text-large">HandyGo</span>
          </div>
        </div>
        <h1 class="marketing-title">Connect & Get It Done</h1>
        <p class="marketing-description">
          Connect with verified fellow students for quick, reliable help with campus tasks.
        </p>
        <div class="marketing-illustration">
          <img src="/login-illustration.png" alt="HandyGO Illustration" class="illustration-image" />
        </div>
      </div>

      <!-- Right Card - Login Form -->
      <div class="form-card">
        <h2 class="form-title">Welcome Back</h2>

        {#if error}
          <div class="error-message">{error}</div>
        {/if}

        <form on:submit|preventDefault={handleLogin} class="auth-form">
          <div class="form-group">
            <label for="email-username">Username or Aalto Email</label>
            <input
              id="email-username"
              type="text"
              bind:value={emailOrUsername}
              placeholder="Enter username or email"
              required
              disabled={loading}
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <div class="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                bind:value={password}
                placeholder="Enter password"
                required
                disabled={loading}
              />
              <button
                type="button"
                class="eye-button"
                on:click={() => showPassword = !showPassword}
                tabindex="-1"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  {#if showPassword}
                    <path d="M10 3C5.5 3 1.73 6.11 0 10.5C1.73 14.89 5.5 18 10 18C14.5 18 18.27 14.89 20 10.5C18.27 6.11 14.5 3 10 3ZM10 15C7.24 15 5 12.76 5 10C5 7.24 7.24 5 10 5C12.76 5 15 7.24 15 10C15 12.76 12.76 15 10 15ZM10 7C8.34 7 7 8.34 7 10C7 11.66 8.34 13 10 13C11.66 13 13 11.66 13 10C13 8.34 11.66 7 10 7Z" fill="currentColor"/>
                  {:else}
                    <path d="M10 3C5.5 3 1.73 6.11 0 10.5C1.73 14.89 5.5 18 10 18C14.5 18 18.27 14.89 20 10.5C18.27 6.11 14.5 3 10 3ZM10 15C7.24 15 5 12.76 5 10C5 7.24 7.24 5 10 5C12.76 5 15 7.24 15 10C15 12.76 12.76 15 10 15Z" fill="currentColor"/>
                    <line x1="0" y1="0" x2="20" y2="20" stroke="currentColor" stroke-width="2"/>
                  {/if}
                </svg>
              </button>
            </div>
          </div>

          <a href="/forgot-password" class="forgot-password">Forget password?</a>

          <button type="submit" class="submit-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <div class="form-footer">
          <span>Haven't registered yet?</span>
          <a href="/register" class="link">Create an account</a>
        </div>
        
        <!-- Decorative element -->
        <div class="decorative-element"></div>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="auth-footer">
    <a href="/about">About</a>
    <a href="/services">Services</a>
    <a href="/faq">FAQ</a>
    <a href="/terms">Terms</a>
    <a href="/privacy">Privacy</a>
  </footer>
</div>

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  .auth-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #E5E5E5;
  }

  /* Top Header */
  .top-header {
    background: #000000;
    padding: 1rem 2rem;
    display: flex;
    align-items: center;
    position: relative;
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
  }

  .back-button {
    background: #ECF86E;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    color: #000;
    transition: background 0.2s;
  }

  .back-button:hover {
    background: #E0F055;
  }

  .logo-button {
    background: #ECF86E;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    cursor: pointer;
    color: #000;
    transition: background 0.2s;
  }

  .logo-button:hover {
    background: #E0F055;
  }

  .logo-icon {
    width: 24px;
    height: 24px;
  }

  .logo-text {
    font-size: 1rem;
    font-weight: 700;
  }

  /* Main Content Area */
  .main-content-area {
    flex: 1;
    padding: 2rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .content-wrapper {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    max-width: 1400px;
    width: 100%;
  }

  /* Marketing Card */
  .marketing-card {
    background: #FFFFFF;
    border-radius: 16px;
    padding: 2.5rem;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .logo-section {
    margin-bottom: 2rem;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .logo-icon-large {
    width: 32px;
    height: 32px;
  }

  .logo-text-large {
    font-size: 1.5rem;
    font-weight: 700;
    color: #000;
  }

  .marketing-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: #000;
    margin-bottom: 1rem;
    line-height: 1.2;
  }

  .marketing-description {
    font-size: 1rem;
    color: #666;
    line-height: 1.6;
    margin-bottom: 2rem;
  }

  .marketing-illustration {
    flex: 1;
    min-height: 400px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .illustration-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 12px;
  }

  /* Form Card */
  .form-card {
    background: #FFFFFF;
    border-radius: 16px;
    padding: 2.5rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    position: relative;
    align-self: start;
  }

  .form-title {
    font-size: 2rem;
    font-weight: 700;
    color: #000;
    margin-bottom: 2rem;
  }

  .error-message {
    background: #fee;
    color: #c00;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 0.9rem;
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-weight: 600;
    color: #000;
    font-size: 0.9rem;
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .form-group input {
    width: 100%;
    padding: 12px 0;
    border: none;
    border-bottom: 2px solid #ddd;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.2s;
    background: transparent;
  }

  .form-group input:focus {
    border-bottom-color: #ECF86E;
  }

  .form-group input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .password-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .password-input-wrapper input {
    flex: 1;
    padding-right: 40px;
  }

  .eye-button {
    position: absolute;
    right: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: #666;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .eye-button:hover {
    color: #000;
  }

  .forgot-password {
    color: #0066cc;
    text-decoration: none;
    font-size: 0.9rem;
    align-self: flex-start;
    margin-top: -0.5rem;
  }

  .forgot-password:hover {
    text-decoration: underline;
  }

  .submit-button {
    background: #ECF86E;
    border: none;
    border-radius: 8px;
    padding: 14px 28px;
    font-size: 1rem;
    font-weight: 600;
    color: #000;
    cursor: pointer;
    transition: background 0.2s;
    margin-top: 0.5rem;
    width: 100%;
  }

  .submit-button:hover:not(:disabled) {
    background: #E0F055;
  }

  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .form-footer {
    margin-top: 1.5rem;
    text-align: center;
    color: #666;
    font-size: 0.9rem;
  }

  .form-footer .link {
    color: #0066cc;
    text-decoration: none;
    margin-left: 4px;
    font-weight: 600;
  }

  .form-footer .link:hover {
    text-decoration: underline;
  }

  /* Decorative element */
  .decorative-element {
    position: absolute;
    right: -40px;
    top: 50%;
    transform: translateY(-50%);
    width: 100px;
    height: 100px;
    background: linear-gradient(135deg, #ECF86E 0%, #D4E8FD 100%);
    border-radius: 50% 30% 50% 30%;
    opacity: 0.6;
    z-index: -1;
  }

  /* Footer */
  .auth-footer {
    background: #2A2A2A;
    padding: 1.5rem;
    display: flex;
    justify-content: center;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .auth-footer a {
    color: #FFFFFF;
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.2s;
  }

  .auth-footer a:hover {
    color: #ECF86E;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .content-wrapper {
      grid-template-columns: 1fr;
    }

    .marketing-card {
      display: none;
    }

    .form-card {
      max-width: 100%;
    }
  }

  @media (max-width: 768px) {
    .top-header {
      padding: 1rem;
    }

    .header-content {
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .main-content-area {
      padding: 1rem;
    }

    .auth-footer {
      gap: 1rem;
      padding: 1rem;
    }

    .auth-footer a {
      font-size: 0.8rem;
    }
  }
</style>
