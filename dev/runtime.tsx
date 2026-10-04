import {createRoot} from 'react-dom/client';
import type {ReactElement} from 'react';
export function mount(element:HTMLElement,node:ReactElement){createRoot(element).render(node);}
