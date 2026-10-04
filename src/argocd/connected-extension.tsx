import React from 'react';
import {Extension as InstallationPage} from '../app/Extension';
import {ArgoClient, applicationURL} from './api';
import type {RolloutsServices} from '../features/rollouts/application';
import type {ExtensionProps} from './types';
const api = new ArgoClient();
const services: RolloutsServices = {
  get: (name, namespace, signal, project) => api.get(name, namespace, signal, project),
  create: (application, signal) => api.create(application, signal),
  applicationURL
};
export function Extension(props: ExtensionProps) { return <InstallationPage {...props} client={services} />; }
