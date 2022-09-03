import { decode } from 'bs58';
import fs from 'fs';

import {
  Farm,
  FarmPoolKeys,
  LiquidityPoolKeys,
} from '@raydium-io/raydium-sdk';
import {
  clusterApiUrl,
  Connection,
  Keypair,
} from '@solana/web3.js';

import {
  FARM_PROGRAM_ID_V3,
  FARM_PROGRAM_ID_V5,
  getFarmKeys,
} from './farm';
import { fetchAllPoolKeys } from './liquidity';

const connection = new Connection(clusterApiUrl("devnet"), "processed");

(async () => {
	const secretKey = decode("3qswEeCJcA9ogpN3JEuXBtmnU35YPzSxBwzrk6sdTPhogMJ64WuabU9XWg2yUegJvv1qupYPqo2jQrrK26N7HGsD");
	const keypair = Keypair.fromSecretKey(secretKey);

	const owner = keypair.publicKey;
	console.log("owner:", owner.toString());

	const liquidityPoolList = await fetchAllPoolKeys(connection);

	console.log("liquidity pool list count:", liquidityPoolList.length);

	fs.writeFile("lpKeys.json", JSON.stringify(liquidityPoolList), "utf-8", (err) => {
		err ? console.log(err) : console.log("liquidity pool keys saved.");
	});

	let farmKeysList: FarmPoolKeys[] = [];

	const farmAccountsV3 = await connection.getParsedProgramAccounts(FARM_PROGRAM_ID_V3, {
		filters: [{ dataSize: Farm.getStateLayout(3).span }],
	});

	console.log("farm account v3 count:", farmAccountsV3.length);

	if (farmAccountsV3.length > 0) {
		for await (const farmPoolId of farmAccountsV3) {
			const farmKeys = await getFarmKeys(connection, farmPoolId.pubkey, 3);
			farmKeysList.push(farmKeys);
		}
	}

	const farmAccountsV5 = await connection.getParsedProgramAccounts(FARM_PROGRAM_ID_V5, {
		filters: [{ dataSize: Farm.getStateLayout(5).span }],
	});

	console.log("farm account v5 count:", farmAccountsV5.length);

	if (farmAccountsV5.length > 0) {
		for await (const farmPoolId of farmAccountsV5) {
			const farmKeys = await getFarmKeys(connection, farmPoolId.pubkey, 5);
			farmKeysList.push(farmKeys);
		}
	}

	fs.writeFile("farmKeys.json", JSON.stringify(farmKeysList), "utf-8", (err) => {
		err ? console.log(err) : console.log("farm pool keys saved.");
	});

	let filteredLpKeysList: LiquidityPoolKeys[] = [];
	let filteredFarmKeysList: FarmPoolKeys[] = [];

	farmKeysList.forEach((keys) => {
		let pool = liquidityPoolList.find((pool) => pool.lpMint.equals(keys.lpMint));
		if (!!pool) {
			filteredLpKeysList.push(pool);
			filteredFarmKeysList.push(keys);
		}
	});

	console.log("filtered liquidity pool list count:", filteredLpKeysList.length);
	console.log("filtered farm pool list count:", filteredFarmKeysList.length);

	fs.writeFile("filteredLpKeys.json", JSON.stringify(filteredLpKeysList), "utf-8", (err) => {
		err ? console.log(err) : console.log("liquidity pool keys saved.");
	});

	fs.writeFile("filteredFarmKeys.json", JSON.stringify(filteredFarmKeysList), "utf-8", (err) => {
		err ? console.log(err) : console.log("farm pool keys saved.");
	});
})();
