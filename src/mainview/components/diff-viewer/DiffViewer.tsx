import { parsePatchFiles } from "@pierre/diffs";
import { type DiffLineAnnotation, FileDiff, type FileDiffMetadata } from "@pierre/diffs/react";
import { useMemo } from "react";
import { css } from "styled-system/css";
import { Box, Stack } from "styled-system/jsx";
import { Badge } from "@/components/ui";
import type { PiInlineComment } from "../../../shared/review";

type DiffAnnotation = {
	body: string;
};

type ParsedPatchState =
	| { files: FileDiffMetadata[]; error?: undefined }
	| { files: FileDiffMetadata[]; error: string };

type DiffViewerProps = {
	colorMode: "light" | "dark";
	inlineComments?: PiInlineComment[];
	patch: string;
};

export function DiffViewer({ colorMode, inlineComments = [], patch }: DiffViewerProps) {
	const parsedPatch = useMemo(() => parsePatch(patch), [patch]);
	const options = useMemo(
		() =>
			({
				theme: {
					dark: "pierre-dark",
					light: "pierre-light",
				},
				themeType: colorMode,
				diffStyle: "unified",
				diffIndicators: "bars",
				hunkSeparators: "line-info-basic",
				lineDiffType: "word",
				overflow: "scroll",
				collapsedContextThreshold: 8,
				expansionLineCount: 20,
				tokenizeMaxLineLength: 500,
			}) as const,
		[colorMode],
	);

	if (!patch.trim()) {
		return <DiffStatus title="No diff loaded" body="Select a PR to load its GitHub diff." />;
	}

	if (parsedPatch.error) {
		return <DiffStatus title="Could not render diff" body={parsedPatch.error} tone="red" />;
	}

	if (parsedPatch.files.length === 0) {
		return <DiffStatus title="Empty diff" body="GitHub returned no changed files for this PR." />;
	}

	return (
		<Stack gap="4">
			{parsedPatch.files.map((fileDiff) => (
				<FileDiff
					className={diffClassName}
					disableWorkerPool
					fileDiff={fileDiff}
					key={getFileDiffKey(fileDiff)}
					lineAnnotations={getLineAnnotations(fileDiff, inlineComments)}
					options={options}
					renderAnnotation={renderAnnotation}
				/>
			))}
		</Stack>
	);
}

function getFileDiffKey(fileDiff: FileDiffMetadata) {
	return fileDiff.cacheKey ?? `${fileDiff.prevName ?? ""}->${fileDiff.name}:${fileDiff.type}`;
}

function parsePatch(patch: string): ParsedPatchState {
	try {
		return {
			files: parsePatchFiles(patch, "github-pr-diff", true).flatMap(
				(parsedPatch) => parsedPatch.files,
			),
		};
	} catch (error) {
		return {
			files: [],
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

function getLineAnnotations(
	fileDiff: FileDiffMetadata,
	inlineComments: PiInlineComment[],
): DiffLineAnnotation<DiffAnnotation>[] {
	return inlineComments
		.filter((comment) => comment.path === fileDiff.name || comment.path === fileDiff.prevName)
		.map((comment) => ({
			lineNumber: comment.line,
			metadata: {
				body: comment.body,
			},
			side: comment.side === "LEFT" ? "deletions" : "additions",
		}));
}

function renderAnnotation(annotation: DiffLineAnnotation<DiffAnnotation>) {
	return (
		<Box
			bg="cyan.subtle.bg"
			borderColor="cyan.surface.border"
			borderRadius="l2"
			borderWidth="1px"
			p="3"
		>
			<Badge colorPalette="cyan" size="sm">
				Pi comment
			</Badge>
			<Box color="fg.default" mt="2" textStyle="sm">
				{annotation.metadata.body}
			</Box>
		</Box>
	);
}

function DiffStatus({
	body,
	title,
	tone = "gray",
}: {
	body: string;
	title: string;
	tone?: "gray" | "red";
}) {
	return (
		<Box bg={tone === "red" ? "red.subtle.bg" : "gray.2"} borderRadius="l2" p="4">
			<Box color={tone === "red" ? "red.11" : "fg.default"} fontWeight="semibold">
				{title}
			</Box>
			<Box color={tone === "red" ? "red.11" : "fg.muted"} mt="1" textStyle="sm">
				{body}
			</Box>
		</Box>
	);
}

const diffClassName = css({
	bg: "gray.1",
	borderRadius: "l2",
	borderWidth: "1px",
	overflow: "hidden",
});
