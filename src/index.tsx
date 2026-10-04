import {registerWhenHostMounted} from './argocd/startup';
import {Extension} from './argocd/connected-extension';
registerWhenHostMounted(Extension);
