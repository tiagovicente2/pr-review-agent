import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type {
	AppSettings,
	AvailablePiModel,
	ReviewLanguage,
	SaveAppSettingsParams,
} from '@/shared/settings'

const settingsPath = getSettingsPath()
const instructionsPath = getInstructionsPath()
let availablePiModelsCache: AvailablePiModel[] | null = null

export function getAppSettings(): AppSettings {
	ensureSettingsFiles()
	const saved = readJsonSettings()
	return {
		colorMode: saved.colorMode ?? 'system',
		codeAgent: saved.codeAgent ?? 'pi',
		model: saved.model ?? getDefaultPiModel(),
		reviewLanguage: getReviewLanguage(saved.reviewLanguage),
		reviewerInstructions: readFileSync(instructionsPath, 'utf8'),
		reviewerInstructionsPath: instructionsPath,
	}
}

export function saveAppSettings(params: SaveAppSettingsParams): AppSettings {
	ensureSettingsFiles()
	const codeAgent = params.codeAgent === 'pi' ? 'pi' : 'pi'
	writeFileSync(
		settingsPath,
		`${JSON.stringify(
			{
				colorMode: params.colorMode,
				codeAgent,
				model: params.model || 'pi-agent',
				reviewLanguage: getReviewLanguage(params.reviewLanguage),
			},
			null,
			2,
		)}\n`,
	)
	writeFileSync(instructionsPath, params.reviewerInstructions)
	return getAppSettings()
}

export function getReviewerInstructions() {
	ensureSettingsFiles()
	return readFileSync(instructionsPath, 'utf8').trim()
}

export function getReviewModel() {
	ensureSettingsFiles()
	return readJsonSettings().model || getDefaultPiModel()
}

export async function listAvailablePiModels(): Promise<AvailablePiModel[]> {
	if (availablePiModelsCache) return availablePiModelsCache

	const saved = readJsonSettings()
	const piSettings = readPiAgentSettings()
	const searches = uniqueValues([
		'',
		saved.model,
		piSettings.defaultModel,
		piSettings.defaultProvider,
	])

	for (const search of searches) {
		const models = parsePiModels(await listPiModelsBySearch(search))
		if (models.length > 0) {
			availablePiModelsCache = models
			return models
		}
	}

	availablePiModelsCache = defaultPiModels()
	return availablePiModelsCache
}

async function listPiModelsBySearch(search: string) {
	const proc = Bun.spawn(search ? ['pi', '--list-models', search] : ['pi', '--list-models'], {
		stdin: 'ignore',
		stdout: 'pipe',
		stderr: 'pipe',
		env: { ...Bun.env, PI_SKIP_VERSION_CHECK: '1' },
	})
	const timeout = setTimeout(() => proc.kill(), 8000)
	try {
		const [stdout, stderr, exitCode] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
			proc.exited,
		])
		return exitCode === 0 ? `${stdout}\n${stderr}` : ''
	} finally {
		clearTimeout(timeout)
	}
}

export function getReviewLanguage(value?: unknown): ReviewLanguage {
	if (value !== undefined) {
		return getReviewLanguageValue(value)
	}
	ensureSettingsFiles()
	return getReviewLanguageValue(readJsonSettings().reviewLanguage)
}

function ensureSettingsFiles() {
	mkdirSync(dirname(settingsPath), { recursive: true })
	if (!existsSync(settingsPath)) {
		writeFileSync(
			settingsPath,
			`${JSON.stringify(
				{ colorMode: 'system', codeAgent: 'pi', model: 'pi-agent', reviewLanguage: 'english' },
				null,
				2,
			)}\n`,
		)
	}
	if (!existsSync(instructionsPath)) {
		writeFileSync(instructionsPath, '')
	}
}

function parsePiModels(output: string): AvailablePiModel[] {
	return output
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.filter((line) => !line.startsWith('provider '))
		.filter((line) => !line.startsWith('No models matching'))
		.map((line) => line.split(/\s+/))
		.filter((columns) => columns.length >= 2)
		.map(([provider, model]) => ({
			id: `${provider}/${model}`,
			label: `${provider}/${model}`,
			provider,
			model,
		}))
}

function defaultPiModels(): AvailablePiModel[] {
	return [{ id: 'pi-agent', label: 'pi-agent', provider: 'pi', model: 'agent' }]
}

function getDefaultPiModel() {
	const piSettings = readPiAgentSettings()
	return piSettings.defaultProvider && piSettings.defaultModel
		? `${piSettings.defaultProvider}/${piSettings.defaultModel}`
		: 'pi-agent'
}

function readPiAgentSettings(): { defaultProvider?: string; defaultModel?: string } {
	try {
		const settings = JSON.parse(readFileSync(join(getPiAgentDir(), 'settings.json'), 'utf8')) as {
			defaultProvider?: unknown
			defaultModel?: unknown
		}
		return {
			defaultProvider:
				typeof settings.defaultProvider === 'string' ? settings.defaultProvider : undefined,
			defaultModel: typeof settings.defaultModel === 'string' ? settings.defaultModel : undefined,
		}
	} catch {
		return {}
	}
}

function uniqueValues(values: Array<string | undefined>) {
	return [
		...new Set(
			values.filter((value): value is string => value !== undefined && value !== 'pi-agent'),
		),
	]
}

function getReviewLanguageValue(value: unknown): ReviewLanguage {
	return value === 'portuguese' ? 'portuguese' : 'english'
}

function readJsonSettings() {
	try {
		return JSON.parse(readFileSync(settingsPath, 'utf8')) as Partial<AppSettings>
	} catch {
		return {}
	}
}

function getSettingsPath() {
	return join(getConfigDir(), 'settings.json')
}

function getInstructionsPath() {
	return join(getConfigDir(), 'reviewer-instructions.md')
}

function getConfigDir() {
	const baseDir =
		Bun.env.XDG_CONFIG_HOME ??
		(Bun.env.HOME ? join(Bun.env.HOME, '.config') : join(process.cwd(), '.config'))
	return join(baseDir, 'pr-review-agent')
}

function getPiAgentDir() {
	return Bun.env.PI_CODING_AGENT_DIR ?? (Bun.env.HOME ? join(Bun.env.HOME, '.pi', 'agent') : '')
}
