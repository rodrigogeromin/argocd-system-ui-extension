import React from 'react';
import type {ExtensionProps} from '../../../argocd/types';
export function ContextSummary({application, resource, tree}: ExtensionProps) {
  if (!application && !resource && !tree) return <p role="status">No context supplied by the host.</p>;
  return <>
    <h2>Host context</h2>
    <dl>
      <dt>Application</dt><dd>{application?.metadata?.name ?? 'Not supplied'}</dd>
      <dt>Namespace</dt><dd>{application?.metadata?.namespace ?? 'Not supplied'}</dd>
      <dt>Project</dt><dd>{application?.spec?.project ?? 'Not supplied'}</dd>
      <dt>Health</dt><dd>{application?.status?.health?.status ?? 'Not supplied'}</dd>
      <dt>Resource</dt><dd>{resource?.metadata?.name ?? 'Not supplied'}</dd>
      <dt>Kind</dt><dd>{resource?.kind ?? 'Not supplied'}</dd>
      <dt>Tree nodes</dt><dd>{tree?.nodes?.length ?? 0}</dd>
    </dl>
    <p>Context is read-only. This extension does not call remote services.</p>
  </>;
}
