import { DateTime } from 'luxon';
import type {
	INodeExecutionData,
	MultiPartFormData,
	IDataObject,
	IWebhookFunctions,
	FormFieldsParameter,
} from 'n8n-workflow';
import {
	FORM_TRIGGER_NODE_TYPE,
	NodeOperationError,
	jsonParse,
} from 'n8n-workflow';
import sanitize from 'sanitize-html';

import { getResolvables } from '../../../utils/utilities';
import type { FormTriggerData, FormField } from '../interfaces';

export function sanitizeCustomCss(css: string | undefined): string | undefined {
	if (!css) return undefined;

	// Use sanitize-html with custom settings for CSS
	return sanitize(css, {
		allowedTags: [], // No HTML tags allowed
		allowedAttributes: {}, // No attributes allowed
		// This ensures we're only keeping the text content
		// which should be the CSS, while removing any HTML/script tags
	});
}

export function createDescriptionMetadata(description: string) {
	return description === ''
		? 'n8n form'
		: description.replace(/^\s*\n+|<\/?[^>]+(>|$)/g, '').slice(0, 150);
}

export function prepareFormData({
	formTitle,
	formDescription,
	formSubmittedHeader,
	formSubmittedText,
	redirectUrl,
	formFields,
	testRun,
	query,
	instanceId,
	useResponseData,
	appendAttribution = true,
	buttonLabel,
	customCss,
}: {
	formTitle: string;
	formDescription: string;
	formSubmittedText: string | undefined;
	redirectUrl: string | undefined;
	formFields: FormFieldsParameter;
	testRun: boolean;
	query: IDataObject;
	instanceId?: string;
	useResponseData?: boolean;
	appendAttribution?: boolean;
	buttonLabel?: string;
	formSubmittedHeader?: string;
	customCss?: string;
}) {
	const utm_campaign = instanceId ? `&utm_campaign=${instanceId}` : '';
	const n8nWebsiteLink = `https://n8n.io/?utm_source=n8n-internal&utm_medium=form-trigger${utm_campaign}`;

	if (formSubmittedText === undefined) {
		formSubmittedText = 'Your response has been recorded';
	}

	const formData: FormTriggerData = {
		testRun,
		formTitle,
		formDescription,
		formDescriptionMetadata: createDescriptionMetadata(formDescription),
		formSubmittedHeader,
		formSubmittedText,
		n8nWebsiteLink,
		formFields: [],
		useResponseData,
		appendAttribution,
		buttonLabel,
		dangerousCustomCss: sanitizeCustomCss(customCss),
	};

	if (redirectUrl) {
		if (!redirectUrl.includes('://')) {
			redirectUrl = `http://${redirectUrl}`;
		}
		formData.redirectUrl = redirectUrl;
	}

	for (const [index, field] of formFields.entries()) {
		const { fieldType, requiredField, multiselect, placeholder } = field;

		const input: FormField = {
			id: `field-${index}`,
			errorId: `error-field-${index}`,
			label: field.fieldLabel,
			inputRequired: requiredField ? 'form-required' : '',
			defaultValue: query[field.fieldLabel] ?? '',
			placeholder,
		};

		if (multiselect || (fieldType && ['radio', 'checkbox'].includes(fieldType))) {
			input.isMultiSelect = true;
			input.multiSelectOptions =
				field.fieldOptions?.values.map((e, i) => ({
					id: `option${i}_${input.id}`,
					label: e.option,
				})) ?? [];

			if (fieldType === 'radio') {
				input.radioSelect = 'radio';
			} /* else if (field.limitSelection === 'exact') {
				input.exactSelectedOptions = field.numberOfSelections;
			} else if (field.limitSelection === 'range') {
				input.minSelectedOptions = field.minSelections;
				input.maxSelectedOptions = field.maxSelections;
			}*/
		} else if (fieldType === 'file') {
			input.isFileInput = true;
			input.acceptFileTypes = field.acceptFileTypes;
			input.multipleFiles = field.multipleFiles ? 'multiple' : '';
		} else if (fieldType === 'dropdown') {
			input.isSelect = true;
			const fieldOptions = field.fieldOptions?.values ?? [];
			input.selectOptions = fieldOptions.map((e) => e.option);
		} else if (fieldType === 'textarea') {
			input.isTextarea = true;
		} else if (fieldType === 'html') {
			input.isHtml = true;
			input.html = field.html as string;
		} else if (fieldType === 'hiddenField') {
			input.isHidden = true;
			input.hiddenName = field.fieldName as string;
			input.hiddenValue =
				input.defaultValue === '' ? (field.fieldValue as string) : input.defaultValue;
		} else {
			input.isInput = true;
			input.type = fieldType as 'text' | 'number' | 'date' | 'email';
		}

		formData.formFields.push(input);
	}

	return formData;
}

export const validateResponseModeConfiguration = (context: IWebhookFunctions) => {
	const responseMode = context.getNodeParameter('responseMode', 'onReceived') as string;
	const connectedNodes = context.getChildNodes(context.getNode().name);
	const nodeVersion = context.getNode().typeVersion;

	const isRespondToWebhookConnected = connectedNodes.some(
		(node) => node.type === 'n8n-nodes-base.respondToWebhook',
	);

	if (!isRespondToWebhookConnected && responseMode === 'responseNode') {
		throw new NodeOperationError(
			context.getNode(),
			new Error('No Respond to Webhook node found in the workflow'),
			{
				description:
					'Insert a Respond to Webhook node to your workflow to respond to the form submission or choose another option for the “Respond When” parameter',
			},
		);
	}

	if (isRespondToWebhookConnected && responseMode !== 'responseNode' && nodeVersion <= 2.1) {
		throw new NodeOperationError(
			context.getNode(),
			new Error(`${context.getNode().name} node not correctly configured`),
			{
				description:
					'Set the “Respond When” parameter to “Using Respond to Webhook Node” or remove the Respond to Webhook node',
			},
		);
	}

	if (isRespondToWebhookConnected && nodeVersion > 2.1) {
		throw new NodeOperationError(
			context.getNode(),
			new Error(
				'The "Respond to Webhook" node is not supported in workflows initiated by the "n8n Form Trigger"',
			),
			{
				description:
					'To configure your response, add an "n8n Form" node and set the "Page Type" to "Form Ending"',
			},
		);
	}
};

export function addFormResponseDataToReturnItem(
	returnItem: INodeExecutionData,
	formFields: FormFieldsParameter,
	bodyData: IDataObject,
) {
	for (const [index, field] of formFields.entries()) {
		const key = `field-${index}`;
		const name = field.fieldLabel ?? field.fieldName;
		let value = bodyData[key] ?? null;

		if (value === null) {
			returnItem.json[name] = null;
			continue;
		}

		if (field.fieldType === 'html') {
			if (field.elementName) {
				returnItem.json[field.elementName] = value;
			}
			continue;
		}

		if (field.fieldType === 'number') {
			value = Number(value);
		}
		if (field.fieldType === 'text') {
			value = String(value).trim();
		}
		if (
			(field.multiselect || field.fieldType === 'checkbox' || field.fieldType === 'radio') &&
			typeof value === 'string'
		) {
			value = jsonParse(value);

			if (field.fieldType === 'radio' && Array.isArray(value)) {
				value = value[0];
			}
		}
		if (field.fieldType === 'date' && value && field.formatDate !== '') {
			value = DateTime.fromFormat(String(value), 'yyyy-mm-dd').toFormat(field.formatDate as string);
		}
		if (field.fieldType === 'file' && field.multipleFiles && !Array.isArray(value)) {
			value = [value];
		}

		returnItem.json[name] = value;
	}
}

export async function prepareFormReturnItem(
	context: IWebhookFunctions,
	formFields: FormFieldsParameter,
	mode: 'test' | 'production',
	useWorkflowTimezone: boolean = false,
) {
	const bodyData = (context.getBodyData().data as IDataObject) ?? {};
	const files = (context.getBodyData().files as IDataObject) ?? {};

	const returnItem: INodeExecutionData = {
		json: {},
	};
	if (files && Object.keys(files).length) {
		returnItem.binary = {};
	}

	for (const key of Object.keys(files)) {
		const processFiles: MultiPartFormData.File[] = [];
		let multiFile = false;
		const filesInput = files[key] as MultiPartFormData.File[] | MultiPartFormData.File;

		if (Array.isArray(filesInput)) {
			bodyData[key] = filesInput.map((file) => ({
				filename: file.originalFilename,
				mimetype: file.mimetype,
				size: file.size,
			}));
			processFiles.push(...filesInput);
			multiFile = true;
		} else {
			bodyData[key] = {
				filename: filesInput.originalFilename,
				mimetype: filesInput.mimetype,
				size: filesInput.size,
			};
			processFiles.push(filesInput);
		}

		const entryIndex = Number(key.replace(/field-/g, ''));
		const fieldLabel = isNaN(entryIndex) ? key : formFields[entryIndex].fieldLabel;

		let fileCount = 0;
		for (const file of processFiles) {
			let binaryPropertyName = fieldLabel.replace(/\W/g, '_');

			if (multiFile) {
				binaryPropertyName += `_${fileCount++}`;
			}

			returnItem.binary![binaryPropertyName] = await context.nodeHelpers.copyBinaryFile(
				file.filepath,
				file.originalFilename ?? file.newFilename,
				file.mimetype,
			);
		}
	}

	addFormResponseDataToReturnItem(returnItem, formFields, bodyData);

	const timezone = useWorkflowTimezone ? context.getTimezone() : 'UTC';
	returnItem.json.submittedAt = DateTime.now().setZone(timezone).toISO();

	returnItem.json.formMode = mode;

	if (
		context.getNode().type === FORM_TRIGGER_NODE_TYPE &&
		Object.keys(context.getRequestObject().query || {}).length
	) {
		returnItem.json.formQueryParameters = context.getRequestObject().query;
	}

	return returnItem;
}

export function resolveRawData(context: IWebhookFunctions, rawData: string) {
	const resolvables = getResolvables(rawData);
	let returnData: string = rawData;

	if (returnData.startsWith('=')) {
		returnData = returnData.replace(/^=+/, '');
	} else {
		return returnData;
	}

	if (resolvables.length) {
		for (const resolvable of resolvables) {
			const resolvedValue = context.evaluateExpression(`${resolvable}`);

			if (typeof resolvedValue === 'object' && resolvedValue !== null) {
				returnData = returnData.replace(resolvable, JSON.stringify(resolvedValue));
			} else {
				returnData = returnData.replace(resolvable, resolvedValue as string);
			}
		}
	}
	return returnData;
}
