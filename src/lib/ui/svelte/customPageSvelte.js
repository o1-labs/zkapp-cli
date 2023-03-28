module.exports = `
<script>
  import heroMinaLogo from '$lib/assets/HeroMinaLogo_gray.svg'
  import arrowRightSmall from '$lib/assets/arrow-right-small.svg'   
  import { onMount } from "svelte";
  import { isReady, Mina, PublicKey } from 'snarkyjs';
	

  onMount(async () => {
    await isReady;  

    const { Add } = await import('../../../contracts/build/src/')
    // Update this to use the address (public key) for your zkApp account
    // To try it out, you can try this address for an example "Add" smart contract that we've deployed to
    // Berkeley Testnet B62qk33E2Kg31SBSpAGUDkjzDGHk9LFt2N1vKFyHy3ezXdd6eiJeAqa
    const zkAppAddress = ''
    // This should be removed once the zkAppAddress is updated.
    if (!zkAppAddress) {
      console.error(
        'The following error is caused because the zkAppAddress has an empty string as the public key. Update the zkAppAddress with the public key for your zkApp account, or try this address for an example "Add" smart contract that we deployed to Berkeley Testnet: B62qqkb7hD1We6gEfrcqosKt9C398VLp1WXeTo1i9boPoqF7B1LxHg4',
      );
    }
    const zkApp = new Add(PublicKey.fromBase58(zkAppAddress))
  });

</script>
<svelte:head>
  <title>zkApp CLI</title>
</svelte:head>
<main class="main">
  <div class="center">
    <a
    href="https://minaprotocol.com/"
    target="_blank"
    rel="noopener noreferrer">
      <img
        class="logo"
        src={heroMinaLogo}
        alt="Mina Logo"
        width="191"
        height="174"
        priority />
    </a>
    <p class="tagline">
      Built with&nbsp;
      <code class="code">SnarkyJS</code>
    </p>
  </div>
  <p class="start">
    Get started by editing&nbsp;
    <code class="code">src/+page.svelte</code>
  </p>
  <div class="grid">
    <a
      href="https://docs.minaprotocol.com/zkapps"
      class="card"
      target="_blank"
      rel="noopener noreferrer">
      <h2>
        <span>DOCS</span>
        <div>
          <img
            src={arrowRightSmall}
            alt="Mina Logo"
            width={16}
            height={16}
            priority />
        </div>
      </h2>
      <p>Explore zkApps, how to build one & in-depth references</p>
    </a>
    <a
      href="https://docs.minaprotocol.com/zkapps/tutorials/hello-world"
      class="card"
      target="_blank"
      rel="noopener noreferrer">
      <h2>
        <span>TUTORIALS</span>
        <div>
          <img
            src={arrowRightSmall}
            alt="Mina Logo"
            width={16}
            height={16}
            priority />
        </div>
      </h2>
      <p>Learn with step-by-step SnarkyJS tutorials</p>
    </a>
    <a
      href="https://discord.gg/minaprotocol"
      class="card"
      target="_blank"
      rel="noopener noreferrer">
      <h2>
        <span>QUESTIONS</span>
        <div>
          <img
            src={arrowRightSmall}
            alt="Mina Logo"
            width={16}
            height={16}
            priority />
        </div>
      </h2>
      <p>Ask questions on our Discord</p>
    </a>
    <a
      href="https://docs.minaprotocol.com/zkapps/how-to-deploy-a-zkapp"
      class="card"
      target="_blank"
      rel="noopener noreferrer">
      <h2>
        <span>DEPOLY</span>
        <div>
          <img
            src={arrowRightSmall}
            alt="Mina Logo"
            width={16}
            height={16}
            priority />
        </div>
      </h2>
      <p>Deploy a zkApp</p>
    </a>
  </div>
</main>
<style>
 @import '../styles/Home.module.css';
</style>
`;
