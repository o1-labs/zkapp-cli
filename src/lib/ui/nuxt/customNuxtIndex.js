module.exports = `
<template>
  <main class="main">
    <div class="center">
      <img
        class="logo"
        src="~/assets/HeroMinaLogo_gray.svg"
        alt="Mina Logo"
        width="191"
        height="174"
        priority
      />
      <p class="tagline">
        Built with&nbsp;
        <code class="code">SnarkyJS</code>
      </p>
    </div>
    <p class="start">
      Get started by editing&nbsp;
      <code class="code">pages/index.vue</code>
    </p>
    <div class="grid">
      <a
        href="https://docs.minaprotocol.com/zkapps"
        class="card"
        target="_blank"
        rel="noopener noreferrer"
      >
        <h2>
          <span>DOCS</span>
          <div>
            <img
              src="~/assets/arrow-right-small.svg"
              alt="Mina Logo"
              width="{16}"
              height="{16}"
              priority
            />
          </div>
        </h2>
        <p>Explore zkApps, how to build one & in-depth references</p>
      </a>
      <a
        href="https://docs.minaprotocol.com/zkapps/tutorials/hello-world"
        class="card"
        target="_blank"
        rel="noopener noreferrer"
      >
        <h2>
          <span>TUTORIALS</span>
          <div>
            <img
              src="~/assets/arrow-right-small.svg"
              alt="Mina Logo"
              width="{16}"
              height="{16}"
              priority
            />
          </div>
        </h2>
        <p>Learn with step-by-step SnarkyJS tutorials</p>
      </a>
     <a
        href="https://discord.gg/minaprotocol"
        class="card"
        target="_blank"
        rel="noopener noreferrer"
      >
        <h2>
          <span>QUESTIONS</span>
          <div>
            <img
              src="~/assets/arrow-right-small.svg"
              alt="Mina Logo"
              width="{16}"
              height="{16}"
              priority
            />
          </div>
        </h2>
        <p>Ask questions on our Discord</p>
      </a>
      <a
        href="https://zkappsformina.com/"
        class="card"
        target="_blank"
        rel="noopener noreferrer"
      >
        <h2>
          <span>EXAMPLES</span>
          <div>
            <img
              src="~/assets/arrow-right-small.svg"
              alt="Mina Logo"
              width="{16}"
              height="{16}"
              priority
            />
          </div>
        </h2>
        <p>Play with deployed zkApps and view their code</p>
      </a>                      
    </div>
  </main>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  name: 'IndexPage',
})
</script>
<style src="~/assets/styles/Home.module.css" />
`;
