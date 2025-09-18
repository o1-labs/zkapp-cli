/**
 * Zeko L2 Bridge Interaction Example
 *
 * This example demonstrates how to interact with Zeko L2 bridge functionality.
 * The bridge enables seamless transfers between Mina L1 and Zeko L2.
 */

import { Mina, PrivateKey, PublicKey, UInt64 } from 'o1js';

// Zeko L2 Network Configuration
const zekoL2Network = Mina.Network({
  networkId: 'testnet', // Using testnet for compatibility, actual endpoint points to Zeko
  mina: 'https://devnet.zeko.io/graphql',
  archive: 'https://devnet.zeko.io/graphql',
});

// Mina L1 Network Configuration (for bridge operations)
const minaL1Network = Mina.Network({
  networkId: 'testnet',
  mina: 'https://api.minascan.io/node/devnet/v1/graphql',
  archive: 'https://api.minascan.io/archive/devnet/v1/graphql',
});

export class ZekoBridgeExample {
  private userKey: PrivateKey;
  private userAddress: PublicKey;

  constructor(userPrivateKey: PrivateKey) {
    this.userKey = userPrivateKey;
    this.userAddress = userPrivateKey.toPublicKey();
  }

  /**
   * Demonstrates deposit from L1 to L2
   */
  async depositToL2(amount: UInt64): Promise<void> {
    console.log('🌉 Depositing from Mina L1 to Zeko L2...');

    // Switch to L1 network for deposit
    Mina.setActiveInstance(minaL1Network);

    // Note: This is a simplified example
    // Real implementation would use bridge contract interaction
    console.log(`Depositing ${amount.toString()} MINA to L2`);
    console.log('Deposit transaction would be created here...');

    // After deposit confirmation, switch to L2
    Mina.setActiveInstance(zekoL2Network);
    console.log('✅ Deposit completed! Funds available on Zeko L2');
  }

  /**
   * Demonstrates withdrawal from L2 to L1
   */
  async withdrawToL1(amount: UInt64): Promise<void> {
    console.log('🌉 Withdrawing from Zeko L2 to Mina L1...');

    // Start on L2 network
    Mina.setActiveInstance(zekoL2Network);

    console.log(`Withdrawing ${amount.toString()} MINA to L1`);
    console.log('Withdrawal transaction would be created here...');

    // Switch to L1 for final settlement
    Mina.setActiveInstance(minaL1Network);
    console.log('✅ Withdrawal completed! Funds available on Mina L1');
  }

  /**
   * Demonstrates fast L2 transactions
   */
  async demonstrateL2Speed(): Promise<void> {
    console.log('⚡ Demonstrating Zeko L2 speed advantages...');

    Mina.setActiveInstance(zekoL2Network);

    console.log('Creating multiple quick transactions...');
    console.log('• Transaction 1: ~10 seconds to finality');
    console.log('• Transaction 2: ~10 seconds to finality');
    console.log('• Transaction 3: ~10 seconds to finality');
    console.log('🚀 Total time: ~30 seconds vs ~15 minutes on L1');
  }

  /**
   * Show network information
   */
  displayNetworkInfo(): void {
    console.log('\n📊 Zeko L2 Network Information:');
    console.log('Network ID: testnet (pointing to Zeko L2)');
    console.log('RPC Endpoint: https://devnet.zeko.io/graphql');
    console.log('Archive Endpoint: https://devnet.zeko.io/graphql');
    console.log('Finality Time: ~10 seconds');
    console.log('Throughput: Unlimited account updates per transaction');
  }
}

// Example usage
export async function runBridgeExample(): Promise<void> {
  console.log('🔗 Zeko L2 Bridge Example\n');

  const userKey = PrivateKey.random();
  const bridge = new ZekoBridgeExample(userKey);

  bridge.displayNetworkInfo();

  // Simulate bridge operations
  await bridge.depositToL2(UInt64.from(1000000000)); // 1 MINA
  await bridge.demonstrateL2Speed();
  await bridge.withdrawToL1(UInt64.from(500000000)); // 0.5 MINA

  console.log('\n✨ Bridge example completed!');
  console.log(
    '💡 This demonstrates the seamless L1 ↔ L2 experience Zeko provides.'
  );
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBridgeExample().catch(console.error);
}
