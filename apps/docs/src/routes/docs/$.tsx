import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { createServerFn } from '@tanstack/react-start';
import { source } from '@/lib/source';
import browserCollections from 'fumadocs-mdx:collections/browser';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { baseOptions, gitConfig } from '@/lib/layout.shared';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { Suspense, use } from 'react';
import { LLMCopyButton, ViewOptions } from '@/components/ai/page-actions';

type LoadedDoc = Awaited<ReturnType<(typeof browserCollections.docs.raw)[string]>>;

const docPromises = new Map<string, Promise<LoadedDoc>>();

function normalizeSlugs(value: unknown): string[] {
	if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
	if (typeof value === 'string') return value.split('/').filter(Boolean);
	return [];
}

function getPathVariants(path: string) {
	const normalizedPath = path.startsWith('./') ? path : `./${path}`;
	const unprefixedPath = path.startsWith('./') ? path.slice(2) : path;

	return [path, normalizedPath, unprefixedPath];
}

function resolveDocPath(path: string | undefined, slugs: unknown) {
	const normalizedSlugs = normalizeSlugs(slugs);
	const normalizedSlugPath = normalizedSlugs.filter(Boolean).join('/');
	const candidates = [
		path,
		normalizedSlugPath ? `${normalizedSlugPath}.mdx` : undefined,
		normalizedSlugPath ? `${normalizedSlugPath}/index.mdx` : 'index.mdx',
		'index.mdx',
	].filter((value): value is string => Boolean(value));

	for (const candidate of candidates) {
		const [rawPath, normalizedPath, unprefixedPath] = getPathVariants(candidate);
		if (
			browserCollections.docs.raw[rawPath] ||
			browserCollections.docs.raw[normalizedPath] ||
			browserCollections.docs.raw[unprefixedPath]
		) {
			return candidate;
		}
	}

	throw notFound();
}

function getDoc(path: string | undefined, slugs: unknown = []): Promise<LoadedDoc> {
	const resolvedPath = resolveDocPath(path, slugs);
	let promise = docPromises.get(resolvedPath);
	if (promise) return promise;

	const [rawPath, normalizedPath, unprefixedPath] = getPathVariants(resolvedPath);
	const loadDoc =
		browserCollections.docs.raw[rawPath] ??
		browserCollections.docs.raw[normalizedPath] ??
		browserCollections.docs.raw[unprefixedPath];
	if (!loadDoc) throw notFound();

	promise = loadDoc() as Promise<LoadedDoc>;
	docPromises.set(resolvedPath, promise);
	return promise;
}

export const Route = createFileRoute('/docs/$')({
	component: Page,
	loader: async ({ params }) => {
		const slugs = normalizeSlugs(params._splat);
		const data = await loader({ data: slugs });
		await getDoc(data.path, data.slugs);
		return data;
	},
});

const loader = createServerFn({
	method: 'GET',
})
	.inputValidator((slugs: string[]) => slugs)
	.handler(async ({ data: slugs }) => {
		const normalizedSlugs = normalizeSlugs(slugs);
		const page = source.getPage(normalizedSlugs);
		if (!page) throw notFound();
		const pageSlugs = normalizeSlugs(page.slugs);
		const resolvedPath = resolveDocPath(page.path, pageSlugs);

		try {
			const pageTree = await source.serializePageTree(source.getPageTree());
			return {
				slugs: pageSlugs,
				path: resolvedPath,
				pageTree: pageTree || { name: 'Root', children: [] },
			};
		} catch (error) {
			console.error('Failed to load page tree:', error);
			return {
				slugs: pageSlugs,
				path: resolvedPath,
				pageTree: { name: 'Root', children: [] },
			};
		}
	});

function PageContent({ markdownUrl, path, slugs }: { markdownUrl: string; path: string; slugs: unknown }) {
	const normalizedSlugs = normalizeSlugs(slugs);
	const resolvedPath = resolveDocPath(path, normalizedSlugs);
	const { toc, frontmatter, default: DocMdx } = use(getDoc(resolvedPath, normalizedSlugs));
	const githubPath = resolvedPath.startsWith('./') ? resolvedPath.slice(2) : resolvedPath;

	return (
		<DocsPage toc={toc}>
			<DocsTitle>{frontmatter.title}</DocsTitle>
			<DocsDescription>{frontmatter.description}</DocsDescription>
			<div className="flex flex-row gap-2 items-center border-b -mt-4 pb-6">
				<LLMCopyButton markdownUrl={markdownUrl} />
				<ViewOptions
					markdownUrl={markdownUrl}
					githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/apps/docs/content/docs/${githubPath}`}
				/>
			</div>
			<DocsBody>
				<DocMdx
					components={{
						...defaultMdxComponents,
					}}
				/>
			</DocsBody>
		</DocsPage>
	);
}

function Page() {
	const loaderData = Route.useLoaderData();
	const { pageTree, slugs, path } = useFumadocsLoader(loaderData || { slugs: [], path: '', pageTree: { name: 'Root', children: [] } });
	const normalizedSlugs = normalizeSlugs(slugs);
	const markdownUrl = `/llms.mdx/docs/${[...normalizedSlugs, 'index.mdx'].join('/')}`;

	return (
		<DocsLayout {...baseOptions()} tree={pageTree || { name: 'Root', children: [] }}>
			<Link to={markdownUrl} hidden />
			<Suspense>
				<PageContent markdownUrl={markdownUrl} path={path} slugs={normalizedSlugs} />
			</Suspense>
		</DocsLayout>
	);
}
