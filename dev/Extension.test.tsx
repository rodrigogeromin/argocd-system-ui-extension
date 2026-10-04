import React from 'react';
import '@testing-library/jest-dom';
import {render, screen, fireEvent, waitFor, act} from '@testing-library/react';
import {Extension} from '../src/argocd/connected-extension';
import {register} from '../src/argocd/register';
import {ArgoClient} from '../src/argocd/api';
import {buildApplication, defaults} from '../src/features/rollouts/application';
import {validContext} from './fixtures/context';
import type {ExtensionsAPI} from '../src/argocd/types';
const app = buildApplication(defaults);
afterEach(() => {jest.restoreAllMocks(); jest.useRealTimers();});
test('renders installation with absent context and preserves provided context', () => {
  const before = JSON.stringify(validContext);
  render(<Extension {...validContext} />);
  expect(screen.getByRole('heading', {name: 'Instale o Argo Rollouts'})).toBeInTheDocument();
  expect(screen.getByLabelText('Namespace de destino')).toHaveValue('argo-rollouts');
  expect(JSON.stringify(validContext)).toBe(before);
});
test('registers a System Level page with exact arguments', () => {
  const fn = jest.fn();
  window.extensionsAPI = {registerSystemLevelExtension: fn} as unknown as ExtensionsAPI;
  register(Extension);
  expect(fn).toHaveBeenCalledWith(Extension, 'Argo Rollouts', '/argo-rollouts', 'fa-rocket');
  delete window.extensionsAPI;
  expect(() => register(Extension)).toThrow('extensionsAPI');
});
test('creates only after checking absence and reaches ready after polling', async () => {
  jest.useFakeTimers();
  const ready = {...app, status: {sync: {status: 'Synced'}, health: {status: 'Healthy'}}};
  const get = jest.spyOn(ArgoClient.prototype, 'get').mockResolvedValueOnce(null).mockResolvedValue(ready);
  const create = jest.spyOn(ArgoClient.prototype, 'create').mockResolvedValue(app);
  render(<Extension />);
  fireEvent.click(screen.getByRole('button', {name: 'Instalar Argo Rollouts'}));
  await waitFor(() => expect(create).toHaveBeenCalledWith(app, expect.any(AbortSignal)));
  await waitFor(() => expect(screen.getByRole('button', {name: 'Application criada'})).toBeDisabled());
  await act(async () => {jest.advanceTimersByTime(5000);});
  expect(screen.getByRole('status')).toHaveTextContent('sincronizada e saudável');
  expect(get).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('link', {name: /Abrir Application/})).toHaveAttribute('href', 'http://localhost/applications/argocd/argo-rollouts');
});
test('preserves existing application and shows its actual version', async () => {
  jest.spyOn(ArgoClient.prototype, 'get').mockResolvedValue({...app, spec: {...app.spec, source: {...app.spec.source!, targetRevision: '2.40.0'}}});
  const create = jest.spyOn(ArgoClient.prototype, 'create');
  render(<Extension />);
  fireEvent.click(screen.getByRole('button', {name: 'Instalar Argo Rollouts'}));
  await waitFor(() => expect(screen.getByText('argo-rollouts · 2.40.0')).toBeInTheDocument());
  expect(create).not.toHaveBeenCalled();
});
test('refuses another application using the same name', async () => {
  jest.spyOn(ArgoClient.prototype, 'get').mockResolvedValue({...app, spec: {...app.spec, source: {...app.spec.source!, chart: 'other'}}});
  const create = jest.spyOn(ArgoClient.prototype, 'create');
  render(<Extension />);
  fireEvent.click(screen.getByRole('button', {name: 'Instalar Argo Rollouts'}));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('outra Application'));
  expect(create).not.toHaveBeenCalled();
});
test('blocks invalid inputs and reports API permission errors', async () => {
  jest.spyOn(ArgoClient.prototype, 'get').mockRejectedValue(new Error('Seu usuário não tem permissão'));
  render(<Extension />);
  fireEvent.change(screen.getByLabelText('Nome da Application'), {target: {value: 'Invalid Name'}});
  expect(screen.getByRole('button', {name: 'Instalar Argo Rollouts'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Nome da Application'), {target: {value: 'argo-rollouts'}});
  fireEvent.click(screen.getByRole('button', {name: 'Consultar instalação'}));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('não tem permissão'));
});
test('consult does not create an application and displays the empty state', async () => {
  jest.spyOn(ArgoClient.prototype, 'get').mockResolvedValue(null);
  const create = jest.spyOn(ArgoClient.prototype, 'create');
  render(<Extension />);
  fireEvent.click(screen.getByRole('button', {name: 'Consultar instalação'}));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Nenhuma Application'));
  expect(create).not.toHaveBeenCalled();
});
test('cancels in-flight requests when unmounted', async () => {
  const get = jest.spyOn(ArgoClient.prototype, 'get').mockImplementation(() => new Promise(() => {}));
  const {unmount} = render(<Extension />);
  fireEvent.click(screen.getByRole('button', {name: 'Consultar instalação'}));
  const signal = get.mock.calls[0][2];
  unmount();
  expect(signal.aborted).toBe(true);
});
test('preflight permission failure never attempts creation', async () => {
  jest.spyOn(ArgoClient.prototype, 'get').mockRejectedValue(new Error('Permissão negada'));
  const create = jest.spyOn(ArgoClient.prototype, 'create');
  render(<Extension />);
  fireEvent.click(screen.getByRole('button', {name: 'Instalar Argo Rollouts'}));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Permissão negada'));
  expect(create).not.toHaveBeenCalled();
});
test('uses the configured project for preflight and polling', async () => {
  jest.useFakeTimers();
  const configured = {...app, spec: {...app.spec, project: 'platform'}};
  const get = jest.spyOn(ArgoClient.prototype, 'get').mockResolvedValueOnce(null).mockResolvedValue(configured);
  jest.spyOn(ArgoClient.prototype, 'create').mockResolvedValue(configured);
  render(<Extension />);
  fireEvent.change(screen.getByLabelText('Projeto Argo CD'), {target: {value: 'platform'}});
  fireEvent.click(screen.getByRole('button', {name: 'Instalar Argo Rollouts'}));
  await waitFor(() => expect(screen.getByRole('button', {name: 'Application criada'})).toBeDisabled());
  await act(async () => jest.advanceTimersByTime(5000));
  expect(get).toHaveBeenCalledTimes(2);
  for (const call of get.mock.calls) expect(call[3]).toBe('platform');
});
