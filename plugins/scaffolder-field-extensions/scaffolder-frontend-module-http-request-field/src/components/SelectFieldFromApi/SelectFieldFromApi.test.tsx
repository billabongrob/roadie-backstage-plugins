/*
 * Copyright 2021 Larder Software Limited
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import { fireEvent, within } from '@testing-library/react';
import {
  renderWithEffects,
  TestApiProvider,
  wrapInTestApp,
} from '@backstage/test-utils';
import { SelectFieldFromApi } from './SelectFieldFromApi';
import {
  AnyApiRef,
  discoveryApiRef,
  fetchApiRef,
  githubAuthApiRef,
  OAuthApi,
} from '@backstage/core-plugin-api';
import { FieldProps } from '@rjsf/core';
import Mocked = jest.Mocked;

describe('SelectFieldFromApi', () => {
  const fetchApi = { fetch: jest.fn() };

  const discovery = {
    async getBaseUrl(plugin: string) {
      return `http://backstage.tests/api/${plugin}`;
    },
  };

  const mockGithubAuthApi: Mocked<OAuthApi> = {
    getAccessToken: jest.fn(),
  };

  const apis: [AnyApiRef, any][] = [
    [fetchApiRef, fetchApi],
    [discoveryApiRef, discovery],
    [githubAuthApiRef, mockGithubAuthApi],
  ];

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should use response body directly where there is no arraySelector', async () => {
    fetchApi.fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(['result1', 'result2']),
    });
    const uiSchema = { 'ui:options': { path: '/test-endpoint' } };
    const props = {
      uiSchema,
      formContext: { formData: {} },
    } as unknown as FieldProps<string>;
    const { getByTestId, getByText } = await renderWithEffects(
      wrapInTestApp(
        <TestApiProvider apis={apis}>
          <SelectFieldFromApi {...props} />
        </TestApiProvider>,
      ),
    );
    const input = await getByTestId('select');
    expect(input.textContent).toBe('Select from results');
    fireEvent.mouseDown(within(input).getByRole('button'));

    expect(getByText('result1')).toBeInTheDocument();
    expect(getByText('result2')).toBeInTheDocument();
  });

  it('should use array specified by arraySelector', async () => {
    fetchApi.fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ myarray: ['result1', 'result2'] }),
    });
    const uiSchema = {
      'ui:options': { path: '/test-endpoint', arraySelector: 'myarray' },
    };
    const props = {
      uiSchema,
      formContext: { formData: {} },
    } as unknown as FieldProps<string>;
    const { getByTestId, getByText } = await renderWithEffects(
      wrapInTestApp(
        <TestApiProvider apis={apis}>
          <SelectFieldFromApi {...props} />
        </TestApiProvider>,
      ),
    );
    const input = await getByTestId('select');
    expect(input.textContent).toBe('Select from results');
    fireEvent.mouseDown(within(input).getByRole('button'));

    expect(getByText('result1')).toBeInTheDocument();
    expect(getByText('result2')).toBeInTheDocument();
  });

  it('should pass an access token through in the Authorization header if "oauth" is configured', async () => {
    fetchApi.fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ myarray: ['result1', 'result2'] }),
    });
    mockGithubAuthApi.getAccessToken.mockResolvedValue('my-github-auth-token');
    const uiSchema = {
      'ui:options': {
        path: '/test-endpoint',
        arraySelector: 'myarray',
        oauth: { provider: 'github', scopes: ['repo'] },
      },
    };
    const props = {
      uiSchema,
      formContext: { formData: {} },
    } as unknown as FieldProps<string>;

    await renderWithEffects(
      wrapInTestApp(
        <TestApiProvider apis={apis}>
          <SelectFieldFromApi {...props} />
        </TestApiProvider>,
      ),
    );

    expect(mockGithubAuthApi.getAccessToken).toHaveBeenCalledWith(
      ['repo'],
      expect.anything(),
    );
    expect(fetchApi.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: { Authorization: 'Bearer my-github-auth-token' },
      }),
    );
  });
});
