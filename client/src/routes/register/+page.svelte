<script>
  import { goto } from '$app/navigation';
  import { apiUrl, API_CONFIG } from '$lib/api-config.js';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let username = '';
  let email = '';
  let password = '';
  let verificationCode = '';
  let showPassword = false;
  let error = '';
  let success = '';
  let loading = false;
  let sendingCode = false;
  let codeSent = false;
  let codeExpiresAt = null;
  let codeInputs = ['', '', '', '', '', ''];

  function handleCodeInput(index, value) {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }
    
    codeInputs[index] = value;
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
    
    // Update verificationCode
    verificationCode = codeInputs.join('');
  }

  function handleCodeKeydown(index, event) {
    // Handle backspace to go to previous input
    if (event.key === 'Backspace' && !codeInputs[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    }
  }

  async function sendVerificationCode() {
    if (!email) {
      error = 'Please enter your Aalto email';
      return;
    }

    if (!email.toLowerCase().endsWith('@aalto.fi')) {
      error = 'Please use an Aalto email address (@aalto.fi)';
      return;
    }

    error = '';
    success = '';
    sendingCode = true;

    try {
      const response = await fetch(apiUrl(API_CONFIG.endpoints.auth.sendCode), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        codeSent = true;
        codeExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
        success = 'Verification code sent! Check your email.';
        
        // In development, show the code
        if (data.code) {
          console.log(`[DEV] Verification code: ${data.code}`);
          success += ` (Dev code: ${data.code})`;
        }
        
        // Focus first code input
        setTimeout(() => {
          const firstInput = document.getElementById('code-0');
          if (firstInput) firstInput.focus();
        }, 100);
      } else {
        error = data.error || 'Failed to send verification code';
      }
    } catch (err) {
      console.error('Send code error:', err);
      error = 'Failed to connect to server. Please try again.';
    } finally {
      sendingCode = false;
    }
  }

  async function handleRegister() {
    error = '';
    success = '';

    if (!username || !email || !password || !verificationCode) {
      error = 'Please fill in all fields';
      return;
    }

    if (verificationCode.length !== 6) {
      error = 'Please enter the complete 6-digit verification code';
      return;
    }

    if (!email.toLowerCase().endsWith('@aalto.fi')) {
      error = 'Please use an Aalto email address (@aalto.fi)';
      return;
    }

    loading = true;

    try {
      const response = await fetch(apiUrl(API_CONFIG.endpoints.auth.register), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username,
          email,
          password,
          verificationCode
        })
      });

      const data = await response.json();

      if (response.ok) {
        success = 'Account created successfully! Redirecting to login...';
        setTimeout(() => {
          goto('/login');
        }, 2000);
      } else {
        error = data.error || Object.values(data).flat().join(', ') || 'Registration failed';
      }
    } catch (err) {
      console.error('Register error:', err);
      error = 'Failed to connect to server. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Create Account - HandyGO</title>
</svelte:head>

<div class="auth-container">
  <button class="back-button" on:click={() => goto('/')}>
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    BACK
  </button>

  <div class="content-wrapper">
    <!-- Left Card - Marketing -->
    <div class="marketing-card">
      <div class="logo-section">
        <div class="logo">
          <span class="logo-text">HandyGo</span>
          <span class="logo-icon">🏃</span>
        </div>
      </div>
      <h1 class="marketing-title">Connect & Get It Done</h1>
      <p class="marketing-description">
        Connect with verified fellow students for quick, reliable help with campus tasks.
      </p>
      <div class="marketing-illustration">
        <!-- Placeholder for illustration -->
      </div>
    </div>

    <!-- Right Card - Register Form -->
    <div class="form-card">
      <h2 class="form-title">Create Account</h2>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      {#if success}
        <div class="success-message">{success}</div>
      {/if}

      <form on:submit|preventDefault={handleRegister} class="auth-form">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            type="text"
            bind:value={username}
            placeholder="Enter username"
            required
            disabled={loading}
          />
        </div>

        <div class="form-group">
          <label for="email">Aalto Email (Verification)</label>
          <div class="email-input-wrapper">
            <input
              id="email"
              type="email"
              bind:value={email}
              placeholder="your.email@aalto.fi"
              required
              disabled={loading || codeSent}
              class:code-sent={codeSent}
            />
            <button
              type="button"
              class="send-code-button"
              on:click={sendVerificationCode}
              disabled={loading || sendingCode || codeSent}
            >
              {sendingCode ? 'Sending...' : codeSent ? 'Code Sent' : 'Send Code'}
            </button>
          </div>
          {#if codeSent}
            <div class="code-sent-hint">Verification code sent! Check your email.</div>
          {/if}
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

        <div class="form-group">
          <label>Verification Code</label>
          <div class="code-inputs">
            {#each codeInputs as _, i}
              <input
                id="code-{i}"
                type="text"
                maxlength="1"
                value={codeInputs[i]}
                on:input={(e) => handleCodeInput(i, e.target.value)}
                on:keydown={(e) => handleCodeKeydown(i, e)}
                class="code-input"
                disabled={loading || !codeSent}
                placeholder="0"
              />
            {/each}
          </div>
          {#if codeSent}
            <div class="code-hint">
              Didn't get a code? It should arrive within 20 seconds. Please check your spam folder.
            </div>
            <button
              type="button"
              class="resend-code-button"
              on:click={sendVerificationCode}
              disabled={loading || sendingCode}
            >
              Resend code
            </button>
          {/if}
        </div>

        <button type="submit" class="submit-button" disabled={loading || !codeSent}>
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>

      <div class="form-footer">
        <span>Already have an account?</span>
        <a href="/login" class="link">Log in</a>
      </div>
    </div>
  </div>

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
  .auth-container {
    min-height: 100vh;
    background-color: #E5E5E5;
    display: flex;
    flex-direction: column;
    position: relative;
    padding: 20px;
  }

  .back-button {
    position: absolute;
    top: 20px;
    left: 20px;
    background: #ECF86E;
    border: none;
    border-radius: 8px;
    padding: 10px 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    cursor: pointer;
    z-index: 10;
    color: #000;
  }

  .back-button:hover {
    background: #E0F055;
  }

  .content-wrapper {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    max-width: 1400px;
    width: 100%;
    margin: 60px auto 0;
    padding: 0 40px;
  }

  .marketing-card,
  .form-card {
    background: white;
    border-radius: 16px;
    padding: 40px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .marketing-card {
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .logo-section {
    margin-bottom: 30px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.5rem;
    font-weight: 700;
  }

  .logo-text {
    color: #000;
  }

  .logo-icon {
    font-size: 1.8rem;
  }

  .marketing-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: #000;
    margin-bottom: 20px;
    line-height: 1.2;
  }

  .marketing-description {
    font-size: 1rem;
    color: #666;
    line-height: 1.6;
    margin-bottom: 30px;
  }

  .marketing-illustration {
    flex: 1;
    background: linear-gradient(135deg, #EAF2FD 0%, #F8FFCB 100%);
    border-radius: 12px;
    min-height: 300px;
    position: relative;
    overflow: hidden;
  }

  .form-card {
    max-width: 450px;
    margin-left: auto;
    align-self: start;
  }

  .form-title {
    font-size: 2rem;
    font-weight: 700;
    color: #000;
    margin-bottom: 30px;
  }

  .error-message {
    background: #fee;
    color: #c00;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 0.9rem;
  }

  .success-message {
    background: #efe;
    color: #060;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 0.9rem;
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group label {
    font-weight: 600;
    color: #000;
    font-size: 0.9rem;
  }

  .form-group input {
    width: 100%;
    padding: 12px 0;
    border: none;
    border-bottom: 2px solid #ddd;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.2s;
  }

  .form-group input:focus {
    border-bottom-color: #ECF86E;
  }

  .form-group input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .email-input-wrapper {
    display: flex;
    gap: 12px;
    align-items: flex-end;
  }

  .email-input-wrapper input {
    flex: 1;
  }

  .email-input-wrapper input.code-sent {
    background-color: #f9f9f9;
  }

  .send-code-button {
    background: #ECF86E;
    border: none;
    border-radius: 8px;
    padding: 12px 20px;
    font-size: 0.9rem;
    font-weight: 600;
    color: #000;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.2s;
  }

  .send-code-button:hover:not(:disabled) {
    background: #E0F055;
  }

  .send-code-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .code-sent-hint {
    font-size: 0.85rem;
    color: #060;
    margin-top: -4px;
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

  .code-inputs {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .code-input {
    width: 50px;
    height: 60px;
    text-align: center;
    font-size: 1.5rem;
    font-weight: 600;
    border: 2px solid #ddd;
    border-radius: 8px;
    padding: 0;
    transition: border-color 0.2s;
  }

  .code-input:focus {
    border-color: #ECF86E;
    outline: none;
  }

  .code-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .code-hint {
    font-size: 0.85rem;
    color: #666;
    text-align: center;
    margin-top: 8px;
  }

  .resend-code-button {
    background: transparent;
    border: 1px solid #000;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 0.9rem;
    color: #000;
    cursor: pointer;
    margin-top: 12px;
    width: 100%;
    transition: background 0.2s;
  }

  .resend-code-button:hover:not(:disabled) {
    background: #f5f5f5;
  }

  .resend-code-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
    margin-top: 8px;
  }

  .submit-button:hover:not(:disabled) {
    background: #E0F055;
  }

  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .form-footer {
    margin-top: 24px;
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

  .auth-footer {
    background: #2A2A2A;
    padding: 20px;
    display: flex;
    justify-content: center;
    gap: 24px;
    flex-wrap: wrap;
    margin-top: 40px;
  }

  .auth-footer a {
    color: #B0B0B0;
    text-decoration: none;
    font-size: 0.9rem;
  }

  .auth-footer a:hover {
    color: #ECF86E;
  }

  @media (max-width: 1024px) {
    .content-wrapper {
      grid-template-columns: 1fr;
      gap: 30px;
    }

    .form-card {
      max-width: 100%;
      margin: 0;
    }

    .marketing-card {
      display: none;
    }
  }
</style>

