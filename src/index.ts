import fetch from "node-fetch";
import { getGameStatus } from "prodigy-api";
import { writeFile } from "fs/promises";
import path from "path";

type Patches = [string | RegExp, string][];

const getGameFile = async (version: string) => (await fetch(`https://code.prodigygame.com/code/${version}/game.min.js?v=${version}`)).text();
const getGameVersion = async () => (await getGameStatus()).gameClientVersion;

const main = async () => {
	const version = await getGameVersion();
	const gameFile = await getGameFile(version);

	const patches: Patches = [
		[
			/s\),this\._game=(.)/,
			`s),this._game=$1;Object.defineProperty(window._, "game", {get: () => this._game, enumerable: true, configurable: true});Object.defineProperty(window._, "instance", {get: () => $1.instance, enumerable: true, configurable: true});Object.defineProperty(window._, "player", {get: () => window._.${gameFile.match(/instance.prodigy.gameContainer.get\("...-...."\).player/)?.[0]}, enumerable: true, configurable: true});Object.defineProperty(window._, "gameData", {get: () => $1.instance.game.state.states.get("Boot")._gameData, enumerable: true, configurable: true});Object.defineProperty(window._, "localizer", {get: () => $1.instance.prodigy.gameContainer.get("LocalizationService"), enumerable: true, configurable: true});Object.defineProperty(window._, "network", {get: () => window._.player.game.input.onDown._bindings[0].context, enumerable: true, configurable: true});`
		],
		[
			/(.)\.constants=Object/,
			"window._.constants=$1,$1.constants=Object"
		]
	];

	const patchedGameFile = patches.reduce((gameFile, [regex, patch]) => gameFile.replace(regex, patch), gameFile);

	await writeFile(path.join(path.dirname("."), "game-files", `game-${version}.js`), patchedGameFile);
	await writeFile(path.join(path.dirname("."), "game-files", "current.js"), patchedGameFile);
};

main();
