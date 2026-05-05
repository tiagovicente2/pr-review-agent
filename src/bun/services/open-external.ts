export async function openExternalUrl(params: { url: string }): Promise<{ ok: true }> {
	const url = new URL(params.url);
	if (url.protocol !== "https:" && url.protocol !== "http:") {
		throw new Error("Only HTTP(S) URLs can be opened externally.");
	}

	const command =
		process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
	const args = process.platform === "win32" ? ["/c", "start", "", params.url] : [params.url];
	const proc = Bun.spawn([command, ...args], {
		stdout: "ignore",
		stderr: "ignore",
	});

	const exitCode = await proc.exited;
	if (exitCode !== 0) {
		throw new Error(`Could not open ${params.url}`);
	}

	return { ok: true };
}
