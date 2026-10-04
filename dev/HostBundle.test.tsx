import '@testing-library/jest-dom';
import React from 'react';
import * as ReactDOM from 'react-dom';
import {jsxRuntime} from './host-runtime';
import {render, screen, cleanup,fireEvent} from '@testing-library/react';
import {readFileSync} from 'node:fs';
import type {ExtensionProps} from '../src/argocd/types';
import {validContext} from './fixtures/context';
import project from '../extension-project.json';
import type {HostContractInput} from '../references/parameters';
const contract=project.hostContract as HostContractInput;
import type {ExtensionsAPI,ProjectRegistration} from '../src/argocd/types';
const registration=project.registration as unknown as ProjectRegistration;
function expectedArguments(){return (contract.argumentMap as string[]).map(token=>{
  if(token==='component')return expect.any(Function);
  if(token==='component.flyout')return registration.flyout?expect.any(Function):undefined;
  if(token==='callback.shouldDisplay')return expect.any(Function);
  if(token==='registration.iconOptions')return registration.icon?{icon:registration.icon}:undefined;
  if(token==='undefined')return undefined;
  if(token.startsWith('registration.'))return registration[token.slice('registration.'.length) as keyof ProjectRegistration];
  throw new Error(`Unknown host argument: ${token}`);
});}
// Executed only after production build by npm run harness. Uses the host's globals.
test('production bundle registers and renders against simulated host globals', () => {
  let component: React.ComponentType<ExtensionProps> | undefined;
  const globals = window as unknown as Record<string, unknown>;
  globals.React = React;
  globals.ReactDOM = ReactDOM;
  if(contract.globals.includes('ReactJSXRuntime'))globals.ReactJSXRuntime = jsxRuntime;
  const register = jest.fn((c: React.ComponentType<ExtensionProps>,...args:unknown[]) => {void args;component = c;});
  window.extensionsAPI = Object.fromEntries(['registerResourceExtension','registerSystemLevelExtension','registerStatusPanelExtension','registerTopBarActionMenuExt','registerAppViewExtension'].map(method=>[method,register])) as unknown as ExtensionsAPI;
  const frozen = Object.fromEntries(contract.props.filter(key=>key!=='openFlyout').map(key=>[key,validContext[key as keyof typeof validContext]])) as ExtensionProps;
  function freeze(value: unknown) {
    if (value && typeof value === 'object') {
      Object.freeze(value);
      Object.values(value).forEach(freeze);
    }
  }
  freeze(frozen);
  // Indirect eval models the host loading extension JS; this is not Argo CD integration.
  (0, eval)(readFileSync(`dist/resources/extension-${project.name}.js`, 'utf8'));
  expect(register).toHaveBeenCalledWith(...expectedArguments());
  if (!component) throw new Error('No host registration');
  const Component = component;
  const openFlyout=jest.fn();
  if(project.profile==='top-bar-action'){
    render(<button type="button" onClick={openFlyout}><i className={registration.icon} aria-hidden="true"/><Component {...frozen} openFlyout={openFlyout}/></button>);
    expect(document.querySelector('button button')).not.toBeInTheDocument();
    expect(document.querySelectorAll('button')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button',{name:registration.title}));expect(openFlyout).toHaveBeenCalledTimes(1);
  }else if(project.profile==='system-level') render(<main aria-label={registration.title}><Component {...frozen}/></main>);
  else render(<Component {...frozen} {...(contract.props.includes('openFlyout')?{openFlyout}:{})} />);
  if(registration.flyout&&project.profile==='status-panel'&&contract.props.includes('openFlyout')){fireEvent.click(screen.getByRole('button',{name:'Open details'}));expect(openFlyout).toHaveBeenCalledTimes(1);}
  const callbackIndex=contract.argumentMap.indexOf('callback.shouldDisplay');
  if(callbackIndex>=0){const callback=register.mock.calls[0][callbackIndex] as unknown as (application?:typeof validContext.application)=>boolean;expect(callback(validContext.application)).toBe(registration.shouldDisplay??true);expect(callback(undefined)).toBe(registration.shouldDisplay??true);}
  if(project.profile==='top-bar-action')expect(screen.getByText(registration.title!)).toBeInTheDocument();
  else if(contract.props.includes('application'))expect(screen.getByText('Healthy')).toBeInTheDocument();
  else expect(screen.getByRole('heading',{name:'Instale o Argo Rollouts'})).toBeInTheDocument();
  cleanup();
  render(<Component />);
  if(project.profile==='top-bar-action')expect(screen.getByText(registration.title!)).toBeInTheDocument();
  else expect(screen.getByRole('heading',{name:'Instale o Argo Rollouts'})).toBeInTheDocument();
  expect(globals.React).toBe(React);
  expect(globals.ReactDOM).toBe(ReactDOM);
  if(contract.globals.includes('ReactJSXRuntime'))expect(globals.ReactJSXRuntime).toBe(jsxRuntime);
  if(registration.flyout){
    cleanup();
    const Flyout=register.mock.calls[0][contract.argumentMap.indexOf('component.flyout')] as unknown as React.ComponentType<ExtensionProps>;
    const flyoutProps=Object.fromEntries((contract.flyoutProps??[]).map(key=>[key,validContext[key as keyof typeof validContext]]));
    render(<Flyout {...flyoutProps}/>);expect(screen.getByRole('heading',{name:'Extension details'})).toBeInTheDocument();
  }
  delete window.extensionsAPI;
});
