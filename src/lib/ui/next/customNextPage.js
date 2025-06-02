export default `'use client';
import Head from 'next/head';
import Image from 'next/image';
import {useCallback, useEffect, useRef, useState} from 'react';
import GradientBG from '../components/GradientBG.js';
import styles from '../styles/Home.module.css';
import heroMinaLogo from '../public/assets/hero-mina-logo.svg';
import arrowRightSmall from '../public/assets/arrow-right-small.svg';
import {JsonProof} from "o1js";
import ZkappWorkerClient from "./ZkappWorkerClient"

// We've already deployed the Add contract on testnet at this address
// https://minascan.io/devnet/account/B62qnfpb1Wz7DrW7279B8nR8m4yY6wGJz4dnbAdkzfeUkpyp8aB9VCp
const zkAppAddress = "B62qnfpb1Wz7DrW7279B8nR8m4yY6wGJz4dnbAdkzfeUkpyp8aB9VCp";

export default function Home() {
  
  const [zkappWorkerClient, setZkappWorkerClient] =
  useState<null | ZkappWorkerClient>(null); 
  const [transactionLink, setTransactionLink] = useState<string | null>(null);
  const [contractState, setContractState] = useState<string | null>(null);
  const [zkProgramState, setZkProgramState] = useState<string | null>(null);
  const [proof, setProof] = useState<JsonProof | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // fetch the zkapp state when the page loads
  useEffect(() => {
    (async () => {
      console.log("Loading zkApp worker client ...");
      const zkappWorkerClient = new ZkappWorkerClient();
      setZkappWorkerClient(zkappWorkerClient);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      console.log("done Loading zkApp worker client");
 
      console.log("Setting active instance to Devnet..");

      await zkappWorkerClient.setActiveInstanceToDevnet();
      console.log("Done Setting active instance to Devnet");
      await zkappWorkerClient.loadContract();
      await zkappWorkerClient.initZkappInstance(zkAppAddress);

      await zkappWorkerClient.fetchAccount(zkAppAddress);
      const num = await zkappWorkerClient.getNum();
      setContractState(num.toString());
      setZkProgramState(num.toString());

      // Compile the AddZkProgram
      const cacheFiles = await fetchFiles();
      console.log("Compiling AddZkProgram");
      // ZkProgram cache in the browser is currently not fully supported.
      await zkappWorkerClient.compileZkProgram();

      // Initialize the AddZkProgram with the initial state of the zkapp
      console.log(
        "Initialize AddZkProgram with intial contract state of zkapp"
      );
      
      const initProof = await zkappWorkerClient.initZkProgram(num.toString());
      setProof(initProof);

      // Compile the contract so that o1js has the proving key required to execute contract calls
      console.log(
        "Compiling Add contract to generate proving and verification keys"
      );

      await zkappWorkerClient.compileContract();

      setLoading(false);
    })();
  }, []);

  const updateZkApp = useCallback(async () => {
    setTransactionLink(null);
    setLoading(true);

    try {
      // Retrieve Mina provider injected by browser extension wallet
      const mina = (window as any).mina;
      const walletKey: string = (await mina.requestAccounts())[0];
      console.log("Connected wallet address: " + walletKey);

      // await fetchAccount({ publicKey: PublicKey.fromBase58(walletKey) });
      await zkappWorkerClient!.fetchAccount(walletKey);
      // Execute a transaction locally on the browser
      let hash;
      if (proof) {
 
        await zkappWorkerClient!.createSettleStateTransaction(proof);
        // Prove execution of the contract using the proving key
        console.log("Proving execution of Add.settleState()");
        await zkappWorkerClient!.proveSettleStateTransaction();

        // Broadcast the transaction to the Mina network
        const transactionJSON = await zkappWorkerClient!.getTransactionJSON();
        console.log("Broadcasting proof of execution to the Mina network");
        ({ hash } = await mina.sendTransaction({
          transaction: transactionJSON
        }));
      } else {
        throw Error("Proof passed to Add.settleState is null");
      }

      // display the link to the transaction
      const transactionLink = "https://minascan.io/devnet/tx/" + hash;
      setTransactionLink(transactionLink);
    } catch (e: any) {
      console.error(e.message);
      let errorMessage = "";

      if (
        e.message.includes(
          "Cannot read properties of undefined (reading 'requestAccounts')"
        )
      ) {
        errorMessage = "Is Auro installed?";
      } else if (e.message.includes("Please create or restore wallet first.")) {
        errorMessage = "Have you created a wallet?";
      } else if (e.message.includes("User rejected the request.")) {
        errorMessage = "Did you grant the app permission to connect?";
      } else {
        errorMessage = "An unknown error occurred.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [proof]);

  const updateZkProgram = useCallback(async () => {
    setLoading(true);

    if (contractState && proof) {
      const updateProof = await zkappWorkerClient!.updateZkProgram(
        contractState,
        proof
      );

      setProof(updateProof);
      setZkProgramState(updateProof.publicOutput.toString());
    } else {
      throw Error(
        "Proof and or ContractState passed to AddZkProgram.update is null"
      );
    }
    setLoading(false);
  }, [proof]);

  return (
    <>
      <Head>
        <title>Mina zkApp UI</title>
        <meta name="description" content="built with o1js"/>
        <link rel="icon" href="/assets/favicon.ico"/>
      </Head>
      <GradientBG>
        <main className={styles.main}>
          <div className={styles.center}>
            <a
              href="https://minaprotocol.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                className={styles.logo}
                src={heroMinaLogo}
                alt="Mina Logo"
                width="191"
                height="174"
                priority
              />
            </a>
            <p className={styles.tagline}>
              built with
              <code className={styles.code}> o1js</code>
            </p>
          </div>
          <p className={styles.start}>
            Get started by editing
            <code className={styles.code}> app/page.tsx</code>
          </p>
          <div className={styles.stateContainer}>
            <div className={styles.state}>
              <div>
                <div>Contract State: <span className={styles.bold}>{contractState}</span></div>
                {error ? (
                  <span className={styles.error}>Error: {error}</span>
                ) : (loading ?
                  <div>Loading...</div> :
                  (transactionLink ?
                    <a href={transactionLink} className={styles.bold} target="_blank" rel="noopener noreferrer">
                      View Transaction on MinaScan
                    </a> :
                    <button onClick={updateZkApp} className={styles.button}>Add.settleState()</button>))}
              </div>
            </div>
            <div className={styles.state}>
              <div>
                <div>
                  ZkProgram State:{" "}
                  <span className={styles.bold}>{zkProgramState}</span>
                </div>
                {error ? (
                  <span className={styles.error}>Error: {error}</span>
                ) : loading ? (
                  <div>Loading...</div>
                ) : (
                  <button onClick={updateZkProgram} className={styles.button}>
                    AddZkProgram.update()
                  </button>
                )}
              </div>
            </div>
          </div>          
          <div className={styles.grid}>
            <a
              href="https://docs.minaprotocol.com/zkapps"
              className={styles.card}
              target="_blank"
              rel="noopener noreferrer"
            >
              <h2>
                <span>DOCS</span>
                <div>
                  <Image
                    src={arrowRightSmall}
                    alt="Mina Logo"
                    width={16}
                    height={16}
                    priority
                  />
                </div>
              </h2>
              <p>Explore zkApps, how to build one, and in-depth references</p>
            </a>
            <a
              href="https://docs.minaprotocol.com/zkapps/tutorials/hello-world"
              className={styles.card}
              target="_blank"
              rel="noopener noreferrer"
            >
              <h2>
                <span>TUTORIALS</span>
                <div>
                  <Image
                    src={arrowRightSmall}
                    alt="Mina Logo"
                    width={16}
                    height={16}
                    priority
                  />
                </div>
              </h2>
              <p>Learn with step-by-step o1js tutorials</p>
            </a>
            <a
              href="https://discord.gg/minaprotocol"
              className={styles.card}
              target="_blank"
              rel="noopener noreferrer"
            >
              <h2>
                <span>QUESTIONS</span>
                <div>
                  <Image
                    src={arrowRightSmall}
                    alt="Mina Logo"
                    width={16}
                    height={16}
                    priority
                  />
                </div>
              </h2>
              <p>Ask questions on our Discord server</p>
            </a>
            <a
              href="https://docs.minaprotocol.com/zkapps/how-to-deploy-a-zkapp"
              className={styles.card}
              target="_blank"
              rel="noopener noreferrer"
            >
              <h2>
                <span>DEPLOY</span>
                <div>
                  <Image
                    src={arrowRightSmall}
                    alt="Mina Logo"
                    width={16}
                    height={16}
                    priority
                  />
                </div>
              </h2>
              <p>Deploy a zkApp to Testnet</p>
            </a>
          </div>
        </main>
      </GradientBG>
    </>
  );
}
`;
