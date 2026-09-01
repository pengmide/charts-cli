import embeddedFontPath from "./fonts/NotoSansCJKsc-Regular.otf" with { type: "file" };

const runtimeGlobal = globalThis as typeof globalThis & {
	__chartsCliEmbeddedFontPath?: string;
};
runtimeGlobal.__chartsCliEmbeddedFontPath = embeddedFontPath;

await import("./main.js");
