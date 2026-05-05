import { FileTree, useFileTree } from '@pierre/trees/react'
import { type CSSProperties, useEffect, useMemo } from 'react'
import type { GitHubPullRequestDetails } from '@/shared/github'

type ChangedFile = GitHubPullRequestDetails['files'][number]

export function ChangedFilesTree({
	files,
	onSelectFile,
	selectedFilePath,
}: {
	files: ChangedFile[]
	onSelectFile: (path: string | null) => void
	selectedFilePath: string | null
}) {
	const paths = useMemo(() => files.map((file) => file.path), [files])
	const gitStatus = useMemo(
		() => files.map((file) => ({ path: file.path, status: 'modified' as const })),
		[files],
	)
	const statsByPath = useMemo(
		() => new Map(files.map((file) => [file.path, `+${file.additions} / -${file.deletions}`])),
		[files],
	)
	const { model } = useFileTree({
		density: 'compact',
		flattenEmptyDirectories: false,
		gitStatus,
		icons: { colored: false, set: 'standard' },
		initialExpansion: 'open',
		initialSelectedPaths: selectedFilePath ? [selectedFilePath] : [],
		onSelectionChange: (selectedPaths) => {
			onSelectFile(selectedPaths.find((path) => statsByPath.has(path)) ?? null)
		},
		paths,
		renderRowDecoration: ({ item }) => {
			const text = statsByPath.get(item.path)
			return text ? { text, title: `${item.path}: ${text}` } : null
		},
		search: true,
	})

	useEffect(() => {
		model.resetPaths(paths, {
			initialExpandedPaths: getExpandableParentPaths(paths),
		})
		model.setGitStatus(gitStatus)
	}, [gitStatus, model, paths])

	useEffect(() => {
		return model.subscribe(() => {
			const focusedPath = model.getFocusedPath()
			if (focusedPath && statsByPath.has(focusedPath)) {
				onSelectFile(focusedPath)
			}
		})
	}, [model, onSelectFile, statsByPath])

	useEffect(() => {
		if (selectedFilePath) {
			model.getItem(selectedFilePath)?.select()
		}
	}, [model, selectedFilePath])

	return <FileTree model={model} style={treeStyle} />
}

function getExpandableParentPaths(paths: string[]) {
	return Array.from(
		new Set(
			paths.flatMap((path) => {
				const parts = path.split('/')
				return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'))
			}),
		),
	)
}

const treeStyle = {
	'--trees-background-override': 'transparent',
	'--trees-foreground-override': 'var(--colors-fg-default)',
	'--trees-selection-background-override': 'var(--colors-gray-3)',
	border: 'none',
	height: '100%',
	minHeight: '0',
	overflow: 'hidden',
	width: '100%',
} as CSSProperties
