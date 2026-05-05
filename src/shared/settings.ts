export type ColorModePreference = 'dark' | 'light' | 'system'
export type CodeAgent = 'pi' | 'claude' | 'opencode'

export type AppSettings = {
	colorMode: ColorModePreference
	codeAgent: CodeAgent
	model: string
	reviewerInstructions: string
	reviewerInstructionsPath: string
}

export type SaveAppSettingsParams = {
	colorMode: ColorModePreference
	codeAgent: CodeAgent
	model: string
	reviewerInstructions: string
}
