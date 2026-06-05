import assert from "assert";
import moneroTs from "monero-ts";

// @ts-ignore
window.monero = moneroTs;

// set worker loader if not copied to public directory
//moneroTs.LibraryUtils.setWorkerLoader(() => new Worker(new URL("monero-ts/dist/monero.worker.js", import.meta.url)));

main();

async function main() {

  // create keys wallet
  let walletKeys = await moneroTs.createWalletKeys({
    networkType: moneroTs.MoneroNetworkType.MAINNET,
    language: "English",
  });

  // display keys
  document.getElementById("wallet_seed_phrase")!.innerHTML = "Seed phrase: " + (await walletKeys.getSeed());
  document.getElementById("wallet_address")!.innerHTML = "Address: " + (await walletKeys.getAddress(0, 0));
  document.getElementById("wallet_spend_key")!.innerHTML = "Spend key: " + (await walletKeys.getPrivateSpendKey());
  document.getElementById("wallet_view_key")!.innerHTML = "View key: " + (await walletKeys.getPrivateViewKey());

  await testSampleCode();
}

async function testSampleCode() {

  console.log("Using monero-ts version: " + moneroTs.getVersion());

  // connect to mainnet daemon without worker proxy
  let daemon1 = await moneroTs.connectToDaemonRpc({server: "http://xmr-node.cakewallet.com:18081", proxyToWorker: false});
  console.log("Daemon height 1: " + await daemon1.getHeight());

  // connect to mainnet daemon with worker proxy
  let daemon2 = await moneroTs.connectToDaemonRpc({server: "http://xmr-node.cakewallet.com:18081", proxyToWorker: true});
  console.log("Daemon height 2: " + await daemon2.getHeight());

  // connect to a daemon
  console.log("Connecting to daemon");
  let daemon = await moneroTs.connectToDaemonRpc("http://localhost:28081");
  let height = await daemon.getHeight();            // 1523651
  let feeEstimate = await daemon.getFeeEstimate();  // 1014313512
  let txsInPool = await daemon.getTxPool();         // get transactions in the pool
  
  // create wallet from seed phrase using WebAssembly bindings to monero-project
  console.log("Creating wallet from seed phrase");
  let walletFull = await moneroTs.createWalletFull({
    password: "supersecretpassword123",
    networkType: moneroTs.MoneroNetworkType.MAINNET,
    server: {
      uri: "http://xmr-node.cakewallet.com:18081",
    }
  });
  
  // synchronize with progress notifications
  console.log("Synchronizing wallet");
  await walletFull.sync(new class extends moneroTs.MoneroWalletListener {
    async onSyncProgress(height: number, startHeight: number, endHeight: number, percentDone: number, message: string) {
      //console.log("Sync progress: " + percentDone + "%");
    }
  });
  
  // synchronize in the background
  await walletFull.startSyncing(5000);
  
  // listen for incoming transfers
  let fundsReceived = false;
  await walletFull.addListener(new class extends moneroTs.MoneroWalletListener {
    async onOutputReceived(output: moneroTs.MoneroOutputWallet) {
      let amount = output.getAmount();
      let txHash = output.getTx().getHash();
      fundsReceived = true;
    }
  });
  // close wallets
  console.log("Closing wallets");
  await walletFull.close();
  console.log("Done running XMR sample app");
}