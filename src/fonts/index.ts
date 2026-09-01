import { randomUUID } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ResvgRenderOptions } from "@resvg/resvg-js";

export const BUNDLED_FONT_FAMILY = "Noto Sans CJK SC";

const FONT_FILE_NAME = "NotoSansCJKsc-Regular.otf";
const FONT_FILE_SIZE = 16_437_364;
const FONT_CONTENT_HASH = "2c76254f6fc379fddfce0a7e84fb5385bb135d3e399294f6eeb6680d0365b74b";
const bundledFontUrl = new URL(`./${FONT_FILE_NAME}`, import.meta.url);
const runtimeGlobal = globalThis as typeof globalThis & {
	__chartsCliEmbeddedFontPath?: string;
};

type FontOptions = NonNullable<ResvgRenderOptions["font"]>;

let bundledFontPathPromise: Promise<string> | undefined;

export function resolveBundledFontPath(): Promise<string> {
	bundledFontPathPromise ??= resolveBundledFontPathOnce();
	return bundledFontPathPromise;
}

export async function getBundledFontOptions(loadSystemFonts = true): Promise<FontOptions> {
	return {
		loadSystemFonts,
		fontFiles: [await resolveBundledFontPath()],
		defaultFontFamily: BUNDLED_FONT_FAMILY,
		sansSerifFamily: BUNDLED_FONT_FAMILY,
		serifFamily: BUNDLED_FONT_FAMILY,
		cursiveFamily: BUNDLED_FONT_FAMILY,
		fantasyFamily: BUNDLED_FONT_FAMILY,
		monospaceFamily: BUNDLED_FONT_FAMILY,
	};
}

async function resolveBundledFontPathOnce(): Promise<string> {
	const packagedFontPath = fileURLToPath(bundledFontUrl);
	if (existsSync(packagedFontPath)) return packagedFontPath;

	const embeddedFontPath = runtimeGlobal.__chartsCliEmbeddedFontPath;
	if (!embeddedFontPath) {
		throw new Error(`Bundled font is missing: ${packagedFontPath}`);
	}

	return extractEmbeddedFont(embeddedFontPath);
}

function extractEmbeddedFont(embeddedFontPath: string): string {
	const userScope = typeof process.getuid === "function" ? `-${process.getuid()}` : "";
	const cacheDir = join(tmpdir(), `charts-cli-fonts${userScope}`);
	const cachedFontPath = join(cacheDir, `${FONT_CONTENT_HASH}-${FONT_FILE_NAME}`);

	mkdirSync(cacheDir, { recursive: true, mode: 0o700 });
	if (isValidCachedFont(cachedFontPath, FONT_FILE_SIZE)) return cachedFontPath;
	if (existsSync(cachedFontPath)) rmSync(cachedFontPath, { force: true });

	const fontData = readFileSync(embeddedFontPath);
	if (fontData.byteLength !== FONT_FILE_SIZE) {
		throw new Error(`Embedded bundled font is invalid: ${embeddedFontPath}`);
	}

	const temporaryFontPath = `${cachedFontPath}.${process.pid}.${randomUUID()}.tmp`;
	writeFileSync(temporaryFontPath, fontData, { flag: "wx", mode: 0o600 });
	try {
		renameSync(temporaryFontPath, cachedFontPath);
	} catch (error) {
		if (!isValidCachedFont(cachedFontPath, fontData.byteLength)) throw error;
	} finally {
		rmSync(temporaryFontPath, { force: true });
	}

	return cachedFontPath;
}

function isValidCachedFont(fontPath: string, expectedSize: number): boolean {
	return existsSync(fontPath) && statSync(fontPath).size === expectedSize;
}
