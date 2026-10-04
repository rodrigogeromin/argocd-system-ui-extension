export type ExtensionProfile = 'resource-tab' | 'system-level' | 'status-panel' | 'top-bar-action' | 'app-view';
export interface HostContractInput {sourceKind:'official'|'custom';tag:string;sources:string[];profile:ExtensionProfile;method:string;signature:string;props:string[];globals:Array<'React'|'ReactDOM'|'ReactJSXRuntime'>;jsxMode:'classic'|'automatic';argumentMap:string[];flyoutProps?:string[];runtime?:{react:string;reactDom:string;typesReact:string;typesReactDom:string}}
export interface GenerationParameters {
  name: string;
  description: string;
  argoCdVersion: string; // Exact SemVer, including prereleases; validated by the generator schema.
  profile: ExtensionProfile;
  hostContract?: HostContractInput;
  registration?: {group?: string; kind?: string; tabTitle?: string; title?: string; id?: string; path?: string; icon?: string; shouldDisplay?: boolean; isMiddle?: boolean; flyout?: boolean};
  dataSource?: 'host-props'|'argocd-api'|'proxy'|'external-api';
  backend?: {kind?: 'none' | 'proxy'};
}
