import type { CollectionEntry } from 'astro:content';

const repositoryEditorUrl =
  'https://github.dev/joshspicer/joshspicer.github.io';
const repositoryBranch = 'master';

export const getBlogPostSourcePath = (
  post: Pick<CollectionEntry<'blog'>, 'filePath' | 'id'>,
) =>
  post.filePath ?? `src/content/blog/${post.id.replace(/\/$/, '')}.md`;

const encodeRepositoryPath = (path: string) =>
  path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

export const getRepositoryEditorUrl = (path?: string) =>
  path
    ? `${repositoryEditorUrl}/blob/${repositoryBranch}/${encodeRepositoryPath(path)}`
    : repositoryEditorUrl;

export const getRepositoryEditUrl = (path: string) =>
  `https://github.com/joshspicer/joshspicer.github.io/edit/${repositoryBranch}/${encodeRepositoryPath(path)}`;
