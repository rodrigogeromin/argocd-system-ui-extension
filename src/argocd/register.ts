import type {ComponentType} from 'react';
import type {ExtensionProps,ProjectRegistration} from './types';
import project from '../../extension-project.json';
import {shouldDisplay} from './visibility';
import {ExtensionFlyout} from '../app/Extension';

export function register(component:ComponentType<ExtensionProps>):void{
  const host=window.extensionsAPI;
  if(!host)throw new Error('Argo CD extensionsAPI is unavailable; use npm run dev for preview');
  const registration=project.registration as ProjectRegistration;
  const args=(project.hostContract.argumentMap as string[]).map(token=>{
    if(token==='component')return component;
    if(token==='component.flyout')return registration.flyout?ExtensionFlyout:undefined;
    if(token==='callback.shouldDisplay')return shouldDisplay;
    if(token==='registration.iconOptions')return registration.icon?{icon:registration.icon}:undefined;
    if(token==='undefined')return undefined;
    if(token.startsWith('registration.'))return registration[token.slice('registration.'.length) as keyof ProjectRegistration];
    throw new Error(`Unsupported host argument mapping: ${token}`);
  });
  const api=host as unknown as Record<string,(...args:never[])=>void>;
  const method=api[project.hostContract.method];
  if(typeof method!=='function')throw new Error(`Argo CD extensionsAPI.${project.hostContract.method} is unavailable`);
  Reflect.apply(method,host,args as never[]);
}
