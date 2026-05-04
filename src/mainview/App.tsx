import { useMemo, useState } from "react";

type DraftStatus = "pending" | "stale" | "approved" | "published" | "rejected" | "failed";

type DraftReview = {
	id: string;
	repo: string;
	pullRequestNumber: number;
	title: string;
	author: string;
	requestedAt: string;
	status: DraftStatus;
	freshness: "fresh" | "stale";
	lastGeneratedAt: string;
	severity: "critical" | "high" | "medium" | "low";
	headSha: string;
	filesChanged: number;
	comments: number;
};

type Finding = {
	id: string;
	severity: "high" | "medium" | "low";
	filePath: string;
	line: number;
	title: string;
	body: string;
	confidence: number;
};

const drafts: DraftReview[] = [
	{
		id: "draft-1",
		repo: "acme/mobile-app",
		pullRequestNumber: 482,
		title: "Refactor checkout review step",
		author: "maria",
		requestedAt: "8 min ago",
		status: "pending",
		freshness: "fresh",
		lastGeneratedAt: "2 min ago",
		severity: "high",
		headSha: "9f3a1c2",
		filesChanged: 12,
		comments: 4,
	},
	{
		id: "draft-2",
		repo: "acme/web-dashboard",
		pullRequestNumber: 131,
		title: "Add React Query cache persistence",
		author: "luis",
		requestedAt: "1 hr ago",
		status: "stale",
		freshness: "stale",
		lastGeneratedAt: "49 min ago",
		severity: "medium",
		headSha: "b17e9aa",
		filesChanged: 7,
		comments: 2,
	},
	{
		id: "draft-3",
		repo: "open-source/design-system",
		pullRequestNumber: 76,
		title: "Improve combobox keyboard support",
		author: "nora",
		requestedAt: "Yesterday",
		status: "approved",
		freshness: "fresh",
		lastGeneratedAt: "Yesterday",
		severity: "low",
		headSha: "54ac09d",
		filesChanged: 5,
		comments: 1,
	},
];

const changedFiles = [
	"src/features/checkout/ReviewStep.tsx",
	"src/features/checkout/useSubmitOrder.ts",
	"src/features/checkout/validation.ts",
	"src/components/Button.tsx",
	"src/test/checkout.test.tsx",
];

const findings: Finding[] = [
	{
		id: "finding-1",
		severity: "high",
		filePath: "src/features/checkout/useSubmitOrder.ts",
		line: 42,
		title: "Mutation can double-submit an order",
		body: "The submit handler does not guard against an already pending mutation, so a double click can create duplicate checkout requests.",
		confidence: 0.91,
	},
	{
		id: "finding-2",
		severity: "medium",
		filePath: "src/features/checkout/ReviewStep.tsx",
		line: 118,
		title: "Error state is not announced to screen readers",
		body: "The validation message is visually rendered, but it is not connected via aria-describedby or an alert region.",
		confidence: 0.84,
	},
	{
		id: "finding-3",
		severity: "low",
		filePath: "src/test/checkout.test.tsx",
		line: 27,
		title: "Missing regression coverage for stale cart totals",
		body: "Add a focused test for cart total changes between review and submission to prevent checkout regressions.",
		confidence: 0.78,
	},
];

const initialSummary = `This draft review focuses on correctness and user-impacting regressions. I found one high-severity issue around duplicate order submission, plus follow-ups for accessibility and test coverage. Please verify the mutation guard before merging.`;

const diffPreview = `diff --git a/src/features/checkout/useSubmitOrder.ts b/src/features/checkout/useSubmitOrder.ts
@@ -36,7 +36,10 @@ export function useSubmitOrder() {
   const mutation = useMutation({ mutationFn: submitOrder });
 
   return async function handleSubmit(payload: OrderPayload) {
+    // TODO: prevent duplicate requests while pending
     analytics.track("checkout_submit_clicked");
     await mutation.mutateAsync(payload);
   };
 }`;

const statusStyles: Record<DraftStatus, string> = {
	pending: "bg-blue-100 text-blue-700 ring-blue-200",
	stale: "bg-amber-100 text-amber-800 ring-amber-200",
	approved: "bg-emerald-100 text-emerald-700 ring-emerald-200",
	published: "bg-zinc-100 text-zinc-700 ring-zinc-200",
	rejected: "bg-rose-100 text-rose-700 ring-rose-200",
	failed: "bg-red-100 text-red-700 ring-red-200",
};

const severityStyles: Record<Finding["severity"], string> = {
	high: "bg-red-50 text-red-700 border-red-200",
	medium: "bg-amber-50 text-amber-700 border-amber-200",
	low: "bg-sky-50 text-sky-700 border-sky-200",
};

function App() {
	const [selectedDraftId, setSelectedDraftId] = useState(drafts[0].id);
	const [query, setQuery] = useState("");
	const [summary, setSummary] = useState(initialSummary);

	const filteredDrafts = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) {
			return drafts;
		}

		return drafts.filter((draft) => {
			const searchableText =
				`${draft.repo} ${draft.pullRequestNumber} ${draft.title} ${draft.author}`.toLowerCase();
			return searchableText.includes(normalizedQuery);
		});
	}, [query]);

	const selectedDraft = drafts.find((draft) => draft.id === selectedDraftId) ?? drafts[0];

	return (
		<div className="min-h-screen bg-slate-950 text-slate-100">
			<div className="flex min-h-screen">
				<aside className="w-96 border-r border-white/10 bg-slate-900/80 p-5 backdrop-blur">
					<div className="mb-6">
						<p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
							PR Review Agent
						</p>
						<h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Review inbox</h1>
						<p className="mt-2 text-sm text-slate-400">
							Local-first AI drafts. Nothing is published without your approval.
						</p>
					</div>

					<label className="mb-4 block text-sm font-medium text-slate-300" htmlFor="review-search">
						Search reviews
					</label>
					<input
						className="mb-5 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-cyan-400/0 transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-400/10"
						id="review-search"
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Repo, PR, author, title"
						value={query}
					/>

					<div className="space-y-3">
						{filteredDrafts.map((draft) => (
							<button
								className={`w-full rounded-2xl border p-4 text-left transition ${
									draft.id === selectedDraftId
										? "border-cyan-300/50 bg-cyan-300/10 shadow-lg shadow-cyan-950/50"
										: "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
								}`}
								key={draft.id}
								onClick={() => setSelectedDraftId(draft.id)}
								type="button"
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-sm font-semibold text-cyan-100">{draft.repo}</p>
										<p className="mt-1 line-clamp-2 font-medium text-white">
											#{draft.pullRequestNumber} {draft.title}
										</p>
									</div>
									<span
										className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyles[draft.status]}`}
									>
										{draft.status}
									</span>
								</div>
								<div className="mt-4 flex items-center justify-between text-xs text-slate-400">
									<span>@{draft.author}</span>
									<span>{draft.lastGeneratedAt}</span>
								</div>
							</button>
						))}
					</div>
				</aside>

				<main className="flex-1 overflow-y-auto">
					<header className="border-b border-white/10 bg-slate-950/85 px-8 py-6 backdrop-blur">
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div>
								<div className="flex flex-wrap items-center gap-3">
									<span
										className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 ${statusStyles[selectedDraft.status]}`}
									>
										{selectedDraft.status}
									</span>
									<span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
										head {selectedDraft.headSha}
									</span>
								</div>
								<h2 className="mt-4 text-3xl font-bold text-white">
									#{selectedDraft.pullRequestNumber} {selectedDraft.title}
								</h2>
								<p className="mt-2 text-slate-400">
									{selectedDraft.repo} by @{selectedDraft.author} · requested{" "}
									{selectedDraft.requestedAt}
								</p>
							</div>
							<div className="flex gap-3">
								<button
									className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
									type="button"
								>
									Regenerate
								</button>
								<button
									className="rounded-xl border border-rose-400/30 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/10"
									type="button"
								>
									Reject
								</button>
								<button
									className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200"
									type="button"
								>
									Approve to publish
								</button>
							</div>
						</div>
					</header>

					<section className="grid gap-5 p-8 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
						<div className="space-y-5">
							<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
								<h3 className="font-semibold text-white">PR context</h3>
								<div className="mt-4 grid grid-cols-2 gap-3 text-sm">
									<div className="rounded-xl bg-slate-900 p-3">
										<p className="text-slate-500">Files</p>
										<p className="mt-1 text-xl font-bold">{selectedDraft.filesChanged}</p>
									</div>
									<div className="rounded-xl bg-slate-900 p-3">
										<p className="text-slate-500">Comments</p>
										<p className="mt-1 text-xl font-bold">{selectedDraft.comments}</p>
									</div>
									<div className="rounded-xl bg-slate-900 p-3">
										<p className="text-slate-500">Freshness</p>
										<p className="mt-1 font-semibold capitalize">{selectedDraft.freshness}</p>
									</div>
									<div className="rounded-xl bg-slate-900 p-3">
										<p className="text-slate-500">Severity</p>
										<p className="mt-1 font-semibold capitalize">{selectedDraft.severity}</p>
									</div>
								</div>
							</div>

							<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
								<h3 className="font-semibold text-white">Changed files</h3>
								<div className="mt-4 space-y-2">
									{changedFiles.map((filePath) => (
										<button
											className="block w-full truncate rounded-lg bg-slate-900 px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800"
											key={filePath}
											type="button"
										>
											{filePath}
										</button>
									))}
								</div>
							</div>
						</div>

						<div className="space-y-5">
							<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
								<div className="flex items-center justify-between">
									<h3 className="font-semibold text-white">Unified diff</h3>
									<span className="text-xs text-slate-500">gh pr diff</span>
								</div>
								<pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-300">
									<code>{diffPreview}</code>
								</pre>
							</div>

							<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
								<label className="font-semibold text-white" htmlFor="review-summary">
									Editable summary review
								</label>
								<textarea
									className="mt-4 min-h-44 w-full rounded-xl border border-white/10 bg-slate-950 p-4 text-sm leading-6 text-slate-100 outline-none focus:border-cyan-300"
									id="review-summary"
									onChange={(event) => setSummary(event.target.value)}
									value={summary}
								/>
								<p className="mt-3 text-xs text-slate-500">
									This payload stays local until the confirmation step publishes it through gh.
								</p>
							</div>
						</div>

						<div className="space-y-5">
							<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
								<h3 className="font-semibold text-white">Generated findings</h3>
								<div className="mt-4 space-y-3">
									{findings.map((finding) => (
										<article
											className="rounded-xl border border-white/10 bg-slate-950 p-4"
											key={finding.id}
										>
											<div className="flex items-center justify-between gap-3">
												<span
													className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase ${severityStyles[finding.severity]}`}
												>
													{finding.severity}
												</span>
												<span className="text-xs text-slate-500">
													{Math.round(finding.confidence * 100)}% confidence
												</span>
											</div>
											<h4 className="mt-3 font-semibold text-white">{finding.title}</h4>
											<p className="mt-2 text-sm text-slate-400">{finding.body}</p>
											<p className="mt-3 truncate text-xs text-cyan-200">
												{finding.filePath}:{finding.line}
											</p>
										</article>
									))}
								</div>
							</div>

							<div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5">
								<h3 className="font-semibold text-cyan-100">Next integration steps</h3>
								<ul className="mt-3 space-y-2 text-sm text-cyan-50/80">
									<li>Wrap all GitHub calls behind a non-interactive gh service.</li>
									<li>Persist drafts and publish attempts in SQLite.</li>
									<li>Generate strict JSON reviews with the configured OpenAI model.</li>
								</ul>
							</div>
						</div>
					</section>
				</main>
			</div>
		</div>
	);
}

export default App;
