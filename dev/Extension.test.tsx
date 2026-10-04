import React from 'react';
import '@testing-library/jest-dom';
import {render, screen, fireEvent, waitFor, act} from '@testing-library/react';
import {Extension} from '../src/argocd/connected-extension';
import {register} from '../src/argocd/register';
import {ArgoClient} from '../src/argocd/api';
import {buildApplication, defaults} from '../src/features/rollouts/application';
import {validContext} from './fixtures/context';
import type {ExtensionsAPI} from '../src/argocd/types';
beforeEach(() => {jest.spyOn(ArgoClient.prototype, 'get').mockResolvedValue(null);});
afterEach(() => {jest.restoreAllMocks(); window.history.replaceState({}, '', '/');});
test('renders catalogue with absent context and preserves immutable host context', () => {
  const before = JSON.stringify(validContext); render(<Extension {...validContext}/>);
  expect(screen.getByRole('heading', {name: 'Addons'})).toBeInTheDocument(); expect(JSON.stringify(validContext)).toBe(before);
  expect(screen.getByRole('button', {name: 'Revisar instalação'})).toBeDisabled();
});
test('registers the same System Level page with the new menu title', () => {
  const fn = jest.fn(); window.extensionsAPI = {registerSystemLevelExtension: fn} as unknown as ExtensionsAPI;
  register(Extension); expect(fn).toHaveBeenCalledWith(Extension, 'Addons', '/argo-rollouts', 'fa-cubes');
  delete window.extensionsAPI; expect(() => register(Extension)).toThrow('extensionsAPI');
});
test('supports search and category filters with an empty state', () => {
  render(<Extension/>); fireEvent.change(screen.getByLabelText('Buscar addon'), {target: {value: 'kyverno'}});
  expect(screen.getByRole('heading', {name: 'Kyverno'})).toBeInTheDocument(); expect(screen.queryByRole('heading', {name: 'Grafana'})).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Categoria'), {target: {value: 'Service Mesh'}}); expect(screen.getByText('Nenhum addon corresponde à busca.')).toBeInTheDocument();
});
test('ambient preset includes base, istiod, CNI and Prometheus as dependencies', () => {
  render(<Extension/>); fireEvent.click(screen.getByRole('button', {name: 'Istio Ambient + observabilidade'}));
  expect(screen.getByRole('checkbox', {name: 'Istio Base incluído como dependência'})).toBeChecked();
  expect(screen.getByRole('checkbox', {name: 'Istio CNI incluído como dependência'})).toBeDisabled();
  expect(screen.getByRole('checkbox', {name: 'Prometheus Stack incluído como dependência'})).toBeChecked();
});
test('requires a review before creation and uses the configured project', async () => {
  const get = jest.spyOn(ArgoClient.prototype, 'get').mockResolvedValue(null);
  const create = jest.spyOn(ArgoClient.prototype, 'create').mockImplementation(async app => ({...app, status: {health: {status: 'Healthy'}, sync: {status: 'Synced'}}}));
  render(<Extension/>); fireEvent.change(screen.getByLabelText('Projeto Argo CD'), {target: {value: 'platform'}});
  fireEvent.click(screen.getByRole('checkbox', {name: 'Selecionar Kyverno'})); expect(create).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name: 'Revisar instalação'})); expect(screen.getByRole('region', {name: 'Revisão da instalação'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: 'Instalar selecionados'}));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Instalação concluída'));
  expect(create).toHaveBeenCalledTimes(1); expect(get.mock.calls.filter(call => call[0] === 'kyverno').at(-1)?.[3]).toBe('platform');
});
test('automatically discovers existing Rollouts on entry without button click or POST', async () => {
  const app = {...buildApplication(defaults), status: {health: {status: 'Healthy'}, sync: {status: 'Synced'}}};
  jest.spyOn(ArgoClient.prototype, 'get').mockImplementation(async name => name === 'argo-rollouts' ? app : null);
  const create = jest.spyOn(ArgoClient.prototype, 'create'); render(<Extension/>);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Status atualizado'));
  expect(screen.getByText('Instalado')).toBeInTheDocument(); expect(create).not.toHaveBeenCalled();
});
test('invalid JSON and conflicting Istio versions disable submission', () => {
  render(<Extension/>); fireEvent.click(screen.getByRole('checkbox', {name: 'Selecionar Kyverno'}));
  fireEvent.click(screen.getByRole('link', {name: 'Ver detalhes de Kyverno'})); fireEvent.click(screen.getByRole('tab', {name: 'Parâmetros'}));
  fireEvent.change(screen.getByLabelText('Values JSON de Kyverno'), {target: {value: 'invalid'}}); expect(screen.getByRole('button', {name: 'Revisar instalação'})).toBeDisabled();
});
test('403 preflight error is displayed and never attempts POST', async () => {
  jest.spyOn(ArgoClient.prototype, 'get').mockRejectedValue(new Error('permission denied')); const create = jest.spyOn(ArgoClient.prototype, 'create');
  render(<Extension/>); fireEvent.click(screen.getByRole('checkbox', {name: 'Selecionar External Secrets'})); fireEvent.click(screen.getByRole('button', {name: 'Revisar instalação'})); fireEvent.click(screen.getByRole('button', {name: 'Instalar selecionados'}));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('permission denied')); expect(create).not.toHaveBeenCalled();
});

test('opens detail tabs, keeps custom values when returning, and reviews the edited manifest', () => {
  const create = jest.spyOn(ArgoClient.prototype, 'create'); render(<Extension/>);
  fireEvent.click(screen.getByRole('link', {name: 'Ver detalhes de Kyverno'}));
  expect(window.location.search).toBe('?addon=kyverno'); expect(screen.queryByLabelText('Buscar addon')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', {level: 1, name: 'Kyverno'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', {name: 'Parâmetros'}));
  fireEvent.change(screen.getByLabelText('Namespace de Kyverno'), {target: {value: 'policies'}});
  fireEvent.change(screen.getByLabelText('Helm · admissionController.replicas'), {target: {value: '3'}});
  fireEvent.click(screen.getByRole('tab', {name: 'Manifesto'})); expect(screen.getByRole('tabpanel')).toHaveTextContent('policies'); expect(screen.getByRole('tabpanel')).toHaveTextContent('"replicas": 3');
  fireEvent.click(screen.getByRole('checkbox', {name: 'Selecionar Kyverno'}));
  fireEvent.click(screen.getByRole('button', {name: 'Voltar para Addons'}));
  expect(screen.getByRole('checkbox', {name: 'Selecionar Kyverno'})).toBeChecked();
  fireEvent.click(screen.getByRole('link', {name: 'Ver detalhes de Kyverno'})); fireEvent.click(screen.getByRole('tab', {name: 'Parâmetros'}));
  expect(screen.getByLabelText('Namespace de Kyverno')).toHaveValue('policies'); expect(create).not.toHaveBeenCalled();
});
test('supports detail deep links and browser history without creating applications', () => {
  window.history.replaceState({}, '', '/argo-rollouts?addon=istio-ztunnel'); render(<Extension/>);
  expect(screen.getByRole('heading', {level: 1, name: 'Istio Ztunnel'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: 'Istio Base'})); expect(window.location.search).toContain('addon=istio-base');
  window.history.replaceState({}, '', '/argo-rollouts'); fireEvent.popState(window);
  expect(screen.getByLabelText('Buscar addon')).toBeInTheDocument();
});

 test('a new project cancels old discovery and ignores late results', async () => {
  let resolveOld: (value: ReturnType<typeof buildApplication>) => void = () => {};
  const oldResult = new Promise<ReturnType<typeof buildApplication>>(resolve => {resolveOld = resolve;});
  const get = jest.spyOn(ArgoClient.prototype, 'get').mockImplementation(async (name, _namespace, _signal, project) => project === 'default' && name === 'argo-rollouts' ? oldResult : null);
  render(<Extension/>); expect(screen.getByRole('status')).toHaveTextContent('Consultando');
  const oldSignal = get.mock.calls[0][2];
  fireEvent.change(screen.getByLabelText('Projeto Argo CD'), {target: {value: 'platform'}});
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Status atualizado'));
  expect(oldSignal.aborted).toBe(true);
  await act(async () => resolveOld({...buildApplication(defaults), status: {health: {status: 'Healthy'}, sync: {status: 'Synced'}}}));
  expect(screen.queryByText('Instalado')).not.toBeInTheDocument();
  expect(get.mock.calls.filter(call => call[3] === 'platform')).toHaveLength(12);
 });
 test('manual refresh remains available and unmount cancels automatic reads', async () => {
  const get = jest.spyOn(ArgoClient.prototype, 'get').mockResolvedValue(null);
  const {unmount} = render(<Extension/>);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Status atualizado'));
  expect(get).toHaveBeenCalledTimes(12);
  fireEvent.click(screen.getByRole('button', {name: 'Atualizar status'}));
  await waitFor(() => expect(get).toHaveBeenCalledTimes(24));
  expect(jest.spyOn(ArgoClient.prototype, 'create')).not.toHaveBeenCalled();
  unmount(); expect(get.mock.calls.at(-1)?.[2].aborted).toBe(true);
 });

test('installation cancels pending discovery without leaving cards stuck checking', async () => {
  const get = jest.spyOn(ArgoClient.prototype, 'get').mockImplementation(async (_name, _namespace, signal) => new Promise(resolve => {signal.addEventListener('abort', () => resolve(null), {once: true});}));
  const create = jest.spyOn(ArgoClient.prototype, 'create').mockImplementation(async app => ({...app, status: {health: {status: 'Healthy'}, sync: {status: 'Synced'}}}));
  render(<Extension/>); const readSignal = get.mock.calls[0][2];
  get.mockResolvedValue(null);
  fireEvent.click(screen.getByRole('checkbox', {name: 'Selecionar Kyverno'}));
  fireEvent.click(screen.getByRole('button', {name: 'Revisar instalação'}));
  fireEvent.click(screen.getByRole('button', {name: 'Instalar selecionados'}));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Instalação concluída'));
  expect(readSignal.aborted).toBe(true); expect(screen.queryByText('Consultando')).not.toBeInTheDocument(); expect(create).toHaveBeenCalledTimes(1);
});
