// This file ensures n8n can find and load your nodes and credentials
const { Zapry } = require('./dist/nodes/Zapry/Zapry.node.js');

module.exports = {
	nodeTypes: {
		zapry: Zapry,
	},
	credentialTypes: {
		zapryApi: require('./dist/credentials/ZapryApi.credentials.js').ZapryApi,
	},
};
