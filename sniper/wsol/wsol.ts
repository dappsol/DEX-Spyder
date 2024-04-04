import {
  Connection,
  Keypair,
  Transaction,
  SystemProgram,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  NATIVE_MINT,
  createSyncNativeInstruction,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
  Account,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { ASSOCIATED_TOKEN_PROGRAM_ID, simulateTransaction } from "@raydium-io/raydium-sdk";

let num = 1;
export async function wrapSol(connection: Connection, keypair: Keypair, amount: number, addInfo: any) {
  addInfo({ type: "warning", text: `Trying to wrap ${amount}SOL to WSOL ${num++}` })
  try {
    let ata = await getAssociatedTokenAddress(NATIVE_MINT, keypair.publicKey)
    // const ix = createAssociatedTokenAccountInstruction(
    //   keypair.publicKey, ata, keypair.publicKey, NATIVE_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
    // )
    while (true) {
      // const createATATx = new Transaction().add(
      //   ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1021197 }),
      //   ix
      // )
      try {
        // createATATx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash
        // createATATx.feePayer = keypair.publicKey
        // console.log(await simulateTransaction(connection, [createATATx]))
        // const sig = await connection.sendTransaction(createATATx, [keypair], { maxRetries: 10 })
        // await connection.confirmTransaction(sig, "finalized")
        const ataInfo = await getOrCreateAssociatedTokenAccount(
          connection, keypair, NATIVE_MINT, keypair.publicKey
        )
        ata = ataInfo.address
        console.log("🚀 ~ wrapSol ~ ata:", ata)
        break
      } catch (e) {
        console.log("Blockchain congested,  trying again to create ATA")
      }
    }
    let tx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1021197 }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: 151337 }),
      // trasnfer SOL
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: ata,
        lamports: amount * 10 ** 9,
      }),
      // sync wrapped SOL balance
      createSyncNativeInstruction(ata, TOKEN_PROGRAM_ID)
    );
    try {
      tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash
      tx.feePayer = keypair.publicKey
      console.log(await simulateTransaction(connection, [tx]))
      const sig = await connection.sendTransaction(tx, [keypair], { maxRetries: 10 })
      try {
        const hash = await connection.confirmTransaction(sig, "confirmed")
        addInfo({ type: "success", text: `Successfully wrapped ${amount}SOL` })
        console.log(`txhash: ${hash}`)
      } catch (error) {
        console.log("Wrapping SOL not succeded", error)
        addInfo({ type: "error", text: "Wrapping SOL not succeded, try again" })
        return
      }
    } catch (error) {
      addInfo({ type: "error", text: `Blockhash not found, try again ${num++}` })
      return
    }
  } catch (error) {
    console.log("Try creating WSOL account again")
    addInfo({ type: "error", text: `Failed to wrap, try again ${num++}` })
    return
  }
}

