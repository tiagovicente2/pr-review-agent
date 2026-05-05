import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { AppSettings, SaveAppSettingsParams } from "../../shared/settings";

const settingsPath = getSettingsPath();
const instructionsPath = getInstructionsPath();

export function getAppSettings(): AppSettings {
	ensureSettingsFiles();
	const saved = readJsonSettings();
	return {
		colorMode: saved.colorMode ?? "system",
		codeAgent: saved.codeAgent ?? "pi",
		model: saved.model ?? "pi-agent",
		reviewerInstructions: readFileSync(instructionsPath, "utf8"),
		reviewerInstructionsPath: instructionsPath,
	};
}

export function saveAppSettings(params: SaveAppSettingsParams): AppSettings {
	ensureSettingsFiles();
	const codeAgent = params.codeAgent === "pi" ? "pi" : "pi";
	writeFileSync(
		settingsPath,
		`${JSON.stringify(
			{
				colorMode: params.colorMode,
				codeAgent,
				model: params.model || "pi-agent",
			},
			null,
			2,
		)}\n`,
	);
	writeFileSync(instructionsPath, params.reviewerInstructions);
	return getAppSettings();
}

export function getReviewerInstructions() {
	ensureSettingsFiles();
	return readFileSync(instructionsPath, "utf8").trim();
}

function ensureSettingsFiles() {
	mkdirSync(dirname(settingsPath), { recursive: true });
	if (!existsSync(settingsPath)) {
		writeFileSync(
			settingsPath,
			`${JSON.stringify({ colorMode: "system", codeAgent: "pi", model: "pi-agent" }, null, 2)}\n`,
		);
	}
	if (!existsSync(instructionsPath)) {
		writeFileSync(instructionsPath, "");
	}
}

function readJsonSettings() {
	try {
		return JSON.parse(readFileSync(settingsPath, "utf8")) as Partial<AppSettings>;
	} catch {
		return {};
	}
}

function getSettingsPath() {
	return join(getConfigDir(), "settings.json");
}

function getInstructionsPath() {
	return join(getConfigDir(), "reviewer-instructions.md");
}

function getConfigDir() {
	const baseDir =
		Bun.env.XDG_CONFIG_HOME ??
		(Bun.env.HOME ? join(Bun.env.HOME, ".config") : join(process.cwd(), ".config"));
	return join(baseDir, "pr-review-agent");
}
