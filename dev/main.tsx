import './demo-api';
import React,{useState} from 'react';
import {mount} from './runtime';
import {Extension} from '../src/argocd/connected-extension';
import {ExtensionFlyout} from '../src/app/Extension';
import {shouldDisplay} from '../src/argocd/visibility';
import {validContext, absentContext} from './fixtures/context';
import type {ProjectRegistration} from '../src/argocd/types';
import type {HostContractInput} from '../references/parameters';
import project from '../extension-project.json';
import './preview.css';
const registration=project.registration as ProjectRegistration;
const contract=project.hostContract as HostContractInput;
const query = new URLSearchParams(location.search);
const element = document.getElementById('root');
if (!element) throw new Error('Missing preview root');
if (query.get('theme') === 'dark') element.dataset.theme = 'dark';
function Preview(){
 const [open,setOpen]=useState(false);
 const context=query.get('fixture')==='absent'?absentContext:validContext;
 const mainProps=Object.fromEntries(contract.props.filter(key=>key!=='openFlyout').map(key=>[key,context[key as keyof typeof context]]));
 const flyoutProps=Object.fromEntries((contract.flyoutProps??[]).map(key=>[key,context[key as keyof typeof context]]));
 const visible=!contract.argumentMap.includes('callback.shouldDisplay')||shouldDisplay(context.application);
 return <div className="preview-panel" style={{width:query.get('width')??'100%',height:query.get('height')??'100%'}}>
 {visible&&project.profile==='top-bar-action'?<button type="button" onClick={()=>setOpen(true)}><i className={registration.icon} aria-hidden="true"/><Extension {...mainProps}/></button>:visible?<Extension {...mainProps} {...(contract.props.includes('openFlyout')?{openFlyout:()=>setOpen(true)}:{})} />:<p>Hidden by shouldDisplay</p>}
 {open&&<aside aria-label="Flyout"><button onClick={()=>setOpen(false)}>Close details</button><ExtensionFlyout {...flyoutProps}/></aside>}
 </div>;
}
mount(element,<Preview/>);
