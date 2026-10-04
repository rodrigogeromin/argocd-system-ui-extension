import type {ComponentType} from 'react';
import type {ExtensionProps} from './types';
import {register} from './register';

export function registerWhenHostMounted(component: ComponentType<ExtensionProps>): void {
  const root = document.getElementById('app');
  if (!root) throw new Error('Argo CD host root #app is unavailable');
  // React 19 createRoot.render is asynchronous. The host installs its System Level
  // listener in App's constructor; registering before the first commit loses that event.
  if (root.childElementCount > 0) { register(component); return; }
  const observer = new MutationObserver(() => {
    if (root.childElementCount === 0) return;
    observer.disconnect();
    register(component);
  });
  observer.observe(root, {childList: true});
}
