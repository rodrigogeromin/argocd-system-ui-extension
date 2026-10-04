export interface Metadata {readonly name?:string;readonly namespace?:string;readonly labels?:Readonly<Record<string,string>>}
export interface Application {readonly metadata?:Metadata;readonly spec?:{readonly project?:string};readonly status?:{readonly health?:{readonly status?:string};readonly sync?:{readonly status?:string}}}
export interface ResourceState {readonly group?:string;readonly kind?:string;readonly metadata?:Metadata;readonly spec?:Readonly<Record<string,unknown>>;readonly status?:Readonly<Record<string,unknown>>}
export interface ResourceNode {readonly group?:string;readonly kind?:string;readonly name?:string;readonly namespace?:string;readonly uid?:string}
export interface ApplicationTree {readonly nodes?:readonly ResourceNode[]}
export interface ExtensionProps {readonly application?:Application;readonly resource?:ResourceState;readonly tree?:ApplicationTree;readonly openFlyout?:()=>void;readonly [key:string]:unknown}
export interface FlyoutProps {readonly application?:Application;readonly tree?:ApplicationTree;readonly [key:string]:unknown}
export interface ProjectRegistration {group?:string;kind?:string;tabTitle?:string;title?:string;id?:string;path?:string;icon?:string;shouldDisplay?:boolean;isMiddle?:boolean;flyout?:boolean}
export interface ExtensionsAPI {
  registerResourceExtension(component:import('react').ComponentType<ExtensionProps>,group:string,kind:string,tabTitle:string,opts?:{icon?:string}):void;
  registerSystemLevelExtension(component:import('react').ComponentType<ExtensionProps>,title:string,path:string,icon:string):void;
  registerStatusPanelExtension(component:import('react').ComponentType<ExtensionProps>,title:string,id:string,flyout?:import('react').ComponentType<ExtensionProps>):void;
  registerTopBarActionMenuExt(component:import('react').ComponentType<ExtensionProps>,title:string,id:string,flyout:import('react').ComponentType<ExtensionProps>,shouldDisplay?:(app?:Application)=>boolean,iconClassName?:string,isMiddle?:boolean):void;
  registerAppViewExtension(component:import('react').ComponentType<ExtensionProps>,title:string,icon:string,shouldDisplay?:(app:Application)=>boolean):void;
}
declare global {interface Window {extensionsAPI?:ExtensionsAPI}}
