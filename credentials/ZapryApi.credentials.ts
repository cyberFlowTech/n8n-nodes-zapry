import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class ZapryApi implements ICredentialType {
	name = 'zapryApi';

	displayName = 'Zapry API';

	documentationUrl = 'https://docs.zapry.net';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Chat with the <a href="https://zapry.net/botmother">bot mother</a> to obtain the access token',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://openapi.mimo.immo',
			description: 'Base URL for Zapry Bot API',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}/bot{{$credentials.accessToken}}',
			url: '/getMe',
		},
	};
}
