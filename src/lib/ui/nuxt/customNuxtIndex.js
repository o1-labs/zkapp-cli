export default `
<template>
  <Head>
    <Title>Mina zkApp UI</Title>
  </Head>
  <GradientBG>
    <main class="main">
      <div class="center">
        <a
          href="https://minaprotocol.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            class="logo"
            src="~/assets/hero-mina-logo.svg"
            alt="Mina Logo"
            width="191"
            height="174"
            priority
          />
        </a>
        <p class="tagline">
          built with
          <code class="code">o1js</code>
        </p>
      </div>
      <p class="start">
        Get started by editing
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
          <p>Explore zkApps, how to build one, and in-depth references</p>
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
          <p>Learn with step-by-step o1js tutorials</p>
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
          <p>Ask questions on our Discord server</p>
        </a>
        <a
          href="https://docs.minaprotocol.com/zkapps/how-to-deploy-a-zkapp"
          class="card"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h2>
            <span>DEPLOY</span>
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
          <p>Deploy a zkApp to Berkeley Testnet</p>
        </a>
      </div>
    </main>
  </GradientBG>
</template>

<script lang="ts">
import GradientBG from '~/components/GradientBG.vue'

export default {
  setup() {
    onMounted(async () => {
      const { Mina, PublicKey } = await import('o1js')
      const { Add } = await import('../../contracts/build/src/')

      // Update this to use the address (public key) for your zkApp account.
      // To try it out, you can try this address for an example "Add" smart contract that we've deployed to
      // Berkeley Testnet B62qkwohsqTBPsvhYE8cPZSpzJMgoKn4i1LQRuBAtVXWpaT4dgH6WoA.
      const zkAppAddress = ''
      // This should be removed once the zkAppAddress is updated.
      if (!zkAppAddress) {
        console.error(
          'The following error is caused because the zkAppAddress has an empty string as the public key. Update the zkAppAddress with the public key for your zkApp account, or try this address for an example "Add" smart contract that we deployed to Berkeley Testnet: B62qkwohsqTBPsvhYE8cPZSpzJMgoKn4i1LQRuBAtVXWpaT4dgH6WoA',
        )
      }
      // const zkApp = new Add(PublicKey.fromBase58(zkAppAddress))
    })
  },
}
</script>
<style scoped>
@import '~/assets/styles/Home.module.css';
</style>

`;
