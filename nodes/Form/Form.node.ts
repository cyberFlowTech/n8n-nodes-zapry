import { INodeProperties } from "n8n-workflow";

import { formFields } from '../Form/common.descriptions';

export const formFieldsProperties: INodeProperties[] = [
	{
		displayName: 'Define Form',
		name: 'defineForm',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Using Fields Below',
				value: 'fields',
			},
			{
				name: 'Using JSON',
				value: 'json',
			},
		],
		default: 'fields',
	},
	{
		displayName: 'Form Fields',
		name: 'jsonOutput',
		type: 'json',
		typeOptions: {
			rows: 5,
		},
		default:
			'[\n   {\n      "fieldLabel":"Name",\n      "placeholder":"enter you name",\n      "requiredField":true\n   },\n   {\n      "fieldLabel":"Age",\n      "fieldType":"number",\n      "placeholder":"enter your age"\n   },\n   {\n      "fieldLabel":"Email",\n      "fieldType":"email",\n      "requiredField":true\n   }\n]',
		validateType: 'form-fields',
		ignoreValidationDuringExecution: true,
		hint: '<a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.form/" target="_blank">See docs</a> for field syntax',
		displayOptions: {
			show: {
				defineForm: ['json'],
			},
		},
	},
	{ ...formFields, displayOptions: { show: { defineForm: ['fields'] } } },
];