import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const repoShared = path.join(__dirname, '../../../..', 'shared/domain-publication');

export const publicationFramework = require(path.join(repoShared, 'domainPublicationFramework.cjs'));
export const audienceResolver = require(path.join(repoShared, 'domainAudienceResolver.cjs'));
export const publicationMetrics = require(path.join(repoShared, 'domainPublicationMetrics.cjs'));
export const visibilityEngine = require(path.join(repoShared, 'domainVisibilityEngine.cjs'));
