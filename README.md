[![N8N Community Node](https://img.shields.io/badge/n8n-community-brightgreen)](https://n8n.io/integrations/community-nodes/)

# n8n-nodes-zapry

This is an n8n community node that lets you interact with Zapry services in your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Credentials](#credentials)
[Operations](#operations)
[Compatibility](#compatibility)
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Credentials

The Zapry node requires bot credentials:

- **Bot Token**: Your Zapry Bot Token obtained from @BotFather

## Operations

The Zapry node supports the following operations:

### Send Message
Send a text message to a chat or user.

### Send Photo
Send a photo to a chat or user.

### Send Document
Send a document/file to a chat or user.

### Get Updates
Get updates/messages sent to your bot.

### Get Chat Member
Get information about a member in a chat.

## Example Usage

To use the Zapry node:

1. Add your bot token credentials
2. Select an operation (e.g. Send Message)
3. Configure the required parameters:
   - Chat ID
   - Message text
   - Optional formatting parameters

The node will execute the operation and return the results.

## Error Handling

The node includes comprehensive error handling and will return clear error messages if:
- Invalid bot token is provided
- Required parameters are missing 
- The API request fails
