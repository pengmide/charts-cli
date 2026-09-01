import assert from "node:assert/strict";
import test from "node:test";
import { Resvg } from "@resvg/resvg-js";
import { BUNDLED_FONT_FAMILY, getBundledFontOptions } from "../dist/fonts/index.js";

const width = 320;
const height = 100;
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <text x="8" y="40" font-family="sans-serif" font-size="32">内置字体</text>
  <text x="8" y="85" font-family="sans-serif" font-size="32">ABC 123</text>
</svg>`;

test("bundled font renders Chinese and Latin without system fonts", async () => {
	const font = await getBundledFontOptions(false);
	assert.equal(font.loadSystemFonts, false);
	assert.equal(font.defaultFontFamily, BUNDLED_FONT_FAMILY);
	assert.equal(font.sansSerifFamily, BUNDLED_FONT_FAMILY);
	assert.equal(font.fontFiles?.length, 1);

	const pixels = new Resvg(svg, { font }).render().pixels;
	let chinesePixels = 0;
	let latinPixels = 0;
	for (let index = 3; index < pixels.length; index += 4) {
		if (pixels[index] === 0) continue;
		const row = Math.floor((index - 3) / 4 / width);
		if (row < height / 2) chinesePixels += 1;
		else latinPixels += 1;
	}

	assert.ok(chinesePixels > 200, `expected Chinese text pixels, received ${chinesePixels}`);
	assert.ok(latinPixels > 200, `expected Latin text pixels, received ${latinPixels}`);
});
