import { parsePatchFiles } from '@pierre/diffs'
import { FileDiff, type FileDiffMetadata } from '@pierre/diffs/react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { css } from 'styled-system/css'
import { Box, HStack, Stack } from 'styled-system/jsx'
import { Badge } from '@/components/ui'
import type { PiInlineComment } from '@/shared/review'
import { getFileDiffKey, getLineAnnotations, getScrollableParent, groupInlineCommentsByPath } from './diffViewerUtils'
import { ReviewCommentAnnotation } from './ReviewCommentAnnotation'

type ParsedPatchState =
	| { files: FileDiffMetadata[]; error?: undefined }
	| { files: FileDiffMetadata[]; error: string }

type DiffViewerProps = {
	colorMode: 'light' | 'dark'
	inlineComments?: PiInlineComment[]
	patch: string
	selectedFilePath?: string | null
}

export const DiffViewer = memo(function DiffViewer({
	colorMode,
	inlineComments = [],
	patch,
	selectedFilePath,
}: DiffViewerProps) {
	const parsedPatch = useMemo(() => parsePatch(patch), [patch])
	const inlineCommentsByPath = useMemo(() => groupInlineCommentsByPath(inlineComments), [inlineComments])
	const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(() => new Set())
	const [expandedFiles, setExpandedFiles] = useState<Set<string>>(() => new Set())
	const fileRefs = useRef(new Map<string, HTMLDivElement>())

	useEffect(() => {
		if (!selectedFilePath) {
			return
		}

		let selectedKey: string | null = null
		setCollapsedFiles((current) => {
			const next = new Set(current)
			for (const file of parsedPatch.files) {
				if (file.name === selectedFilePath || file.prevName === selectedFilePath) {
					selectedKey = getFileDiffKey(file)
					next.delete(selectedKey)
				}
			}
			return next
		})

		requestAnimationFrame(() => {
			if (!selectedKey) {
				return
			}

			const node = fileRefs.current.get(selectedKey)
			const scrollParent = node ? getScrollableParent(node) : null
			if (node && scrollParent) {
				scrollParent.scrollTo({
					behavior: 'smooth',
					top: node.offsetTop - scrollParent.offsetTop,
				})
			}
		})
	}, [parsedPatch.files, selectedFilePath])
	const options = useMemo(
		() =>
			({
				theme: {
					dark: 'pierre-dark',
					light: 'pierre-light',
				},
				themeType: colorMode,
				diffStyle: 'unified',
				diffIndicators: 'bars',
				hunkSeparators: 'line-info-basic',
				lineDiffType: 'word',
				overflow: 'scroll',
				collapsedContextThreshold: 8,
				expansionLineCount: 20,
				tokenizeMaxLineLength: 500,
			}) as const,
		[colorMode],
	)

	if (!patch.trim()) {
		return <DiffStatus title="No diff loaded" body="Select a PR to load its GitHub diff." />
	}

	if (parsedPatch.error) {
		return <DiffStatus title="Could not render diff" body={parsedPatch.error} tone="red" />
	}

	if (parsedPatch.files.length === 0) {
		return <DiffStatus title="Empty diff" body="GitHub returned no changed files for this PR." />
	}

	return (
		<Stack gap="4" pr="1">
			{parsedPatch.files.map((fileDiff) => {
				const fileKey = getFileDiffKey(fileDiff)
				const selected = fileDiff.name === selectedFilePath || fileDiff.prevName === selectedFilePath
				const collapsed = collapsedFiles.has(fileKey) || (!selected && !expandedFiles.has(fileKey))

				return (
					<Box
						className={diffClassName}
						key={fileKey}
						ref={(node) => {
							if (node) {
								fileRefs.current.set(fileKey, node)
							} else {
								fileRefs.current.delete(fileKey)
							}
						}}
					>
						<DiffFileHeader
							collapsed={collapsed}
							fileDiff={fileDiff}
							onToggle={() => {
								if (collapsed) {
									setCollapsedFiles((current) => {
										const next = new Set(current)
										next.delete(fileKey)
										return next
									})
									setExpandedFiles((current) => new Set(current).add(fileKey))
								} else {
									setExpandedFiles((current) => {
										const next = new Set(current)
										next.delete(fileKey)
										return next
									})
									setCollapsedFiles((current) => new Set(current).add(fileKey))
								}
							}}
						/>
						{collapsed ? null : (
							<FileDiff
								disableWorkerPool
								fileDiff={fileDiff}
								lineAnnotations={getLineAnnotations(fileDiff, inlineCommentsByPath)}
								options={{ ...options, disableFileHeader: true }}
								renderAnnotation={ReviewCommentAnnotation}
							/>
						)}
					</Box>
				)
			})}
		</Stack>
	)
})

function DiffFileHeader({
	collapsed,
	fileDiff,
	onToggle,
}: {
	collapsed: boolean
	fileDiff: FileDiffMetadata
	onToggle: () => void
}) {
	const additions = fileDiff.hunks.reduce((total, hunk) => total + hunk.additionLines, 0)
	const deletions = fileDiff.hunks.reduce((total, hunk) => total + hunk.deletionLines, 0)

	return (
		<Box
			as="button"
			bg="gray.2"
			borderBottomWidth={collapsed ? '0' : '1px'}
			cursor="pointer"
			onClick={onToggle}
			px="3"
			py="2"
			textAlign="left"
			w="100%"
			_hover={{ bg: 'gray.3' }}
		>
			<HStack gap="3" justify="space-between" w="100%">
				<HStack minW="0" gap="2">
					<Box color="fg.muted" fontSize="sm" w="5">
						{collapsed ? '▸' : '▾'}
					</Box>
					<Stack gap="0" minW="0">
						<Box fontFamily="mono" fontSize="sm" fontWeight="medium" truncate>
							{fileDiff.name}
						</Box>
						{fileDiff.prevName && fileDiff.prevName !== fileDiff.name ? (
							<Box color="fg.muted" fontFamily="mono" fontSize="xs" truncate>
								from {fileDiff.prevName}
							</Box>
						) : null}
					</Stack>
				</HStack>
				<HStack flexShrink="0" gap="2" fontFamily="mono" fontSize="xs">
					<Badge colorPalette="gray" variant="surface">
						{fileDiff.type}
					</Badge>
					<Box color="review.blue">+{additions}</Box>
					<Box color="red.11">-{deletions}</Box>
				</HStack>
			</HStack>
		</Box>
	)
}

function parsePatch(patch: string): ParsedPatchState {
	try {
		return {
			files: parsePatchFiles(patch, 'github-pr-diff', true).flatMap(
				(parsedPatch) => parsedPatch.files,
			),
		}
	} catch (error) {
		return {
			files: [],
			error: error instanceof Error ? error.message : String(error),
		}
	}
}

function DiffStatus({
	body,
	title,
	tone = 'gray',
}: {
	body: string
	title: string
	tone?: 'gray' | 'red'
}) {
	return (
		<Box bg={tone === 'red' ? 'red.subtle.bg' : 'gray.2'} borderRadius="l2" p="4">
			<Box color={tone === 'red' ? 'red.11' : 'fg.default'} fontWeight="semibold">
				{title}
			</Box>
			<Box color={tone === 'red' ? 'red.11' : 'fg.muted'} mt="1" textStyle="sm">
				{body}
			</Box>
		</Box>
	)
}

const diffClassName = css({
	bg: 'gray.1',
	borderRadius: 'l2',
	borderWidth: '1px',
	overflow: 'hidden',
})
