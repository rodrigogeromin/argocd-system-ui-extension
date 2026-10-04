import type {Application,ProjectRegistration} from './types';
import project from '../../extension-project.json';
// Customize with application metadata/project without mutating host objects.
export function shouldDisplay(application?:Application):boolean {
  void application;
  return (project.registration as ProjectRegistration).shouldDisplay??true;
}
