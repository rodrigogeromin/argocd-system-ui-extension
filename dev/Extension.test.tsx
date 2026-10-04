import React from 'react';
import '@testing-library/jest-dom';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {Extension} from '../src/argocd/connected-extension';
import {register} from '../src/argocd/register';
import {ArgoClient} from '../src/argocd/api';
import {buildApplication, defaults} from '../src/features/rollouts/application';
import {validContext} from './fixtures/context';
import type {ExtensionsAPI} from '../src/argocd/types';
afterEach(() => jest.restoreAllMocks());
test('renders catalogue with absent context and preserves immutable host context', () => {
  const before = JSON.stringify(validContext); render(<Extension {...validContext}/>);
  expect(screen.getByRole('heading', {name: 'Catálogo de Addons'})).toBeInTheDocument(); expect(JSON.stringify(validContext)).toBe(before);
  expect(screen.getByRole('button', {name: 'Revisar instalação'})).toBeDisabled();
});
test('registers the same System Level page with the new menu title', () => {
  const fn = jest.fn(); window.extensionsAPI = {registerSystemLevelExtension: fn} as unknown as ExtensionsAPI;
  register(Extension); expect(fn).toHaveBeenCalledWith(Extension, 'Catálogo de Addons', '/argo-rollouts', 'fa-cubes');
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
  expect(create).toHaveBeenCalledTimes(1); expect(get.mock.calls[0][3]).toBe('platform');
});
test('discovery finds existing Rollouts without creating anything', async () => {
  const app = {...buildApplication(defaults), status: {health: {status: 'Healthy'}, sync: {status: 'Synced'}}};
  jest.spyOn(ArgoClient.prototype, 'get').mockImplementation(async name => name === 'argo-rollouts' ? app : null);
  const create = jest.spyOn(ArgoClient.prototype, 'create'); render(<Extension/>);
  fireEvent.click(screen.getByRole('button', {name: 'Atualizar status'}));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Status atualizado'));
  expect(screen.getByText('Instalado')).toBeInTheDocument(); expect(create).not.toHaveBeenCalled();
});
test('invalid JSON and conflicting Istio versions disable submission', () => {
  render(<Extension/>); fireEvent.click(screen.getByRole('checkbox', {name: 'Selecionar Kyverno'}));
  fireEvent.change(screen.getByLabelText('Values JSON de Kyverno'), {target: {value: 'invalid'}}); expect(screen.getByRole('button', {name: 'Revisar instalação'})).toBeDisabled();
});
test('403 preflight error is displayed and never attempts POST', async () => {
  jest.spyOn(ArgoClient.prototype, 'get').mockRejectedValue(new Error('permission denied')); const create = jest.spyOn(ArgoClient.prototype, 'create');
  render(<Extension/>); fireEvent.click(screen.getByRole('checkbox', {name: 'Selecionar External Secrets'})); fireEvent.click(screen.getByRole('button', {name: 'Revisar instalação'})); fireEvent.click(screen.getByRole('button', {name: 'Instalar selecionados'}));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('permission denied')); expect(create).not.toHaveBeenCalled();
});
