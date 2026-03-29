> ## Documentation Index
> Fetch the complete documentation index at: https://docs.stagehand.dev/llms.txt
> Use this file to discover all available pages before exploring further.

# Extract data from the page

> Extracts structured data from the current page using AI-powered analysis.



## OpenAPI

````yaml https://app.stainless.com/api/spec/documented/stagehand/openapi.documented.yml post /v1/sessions/{id}/extract
openapi: 3.1.0
info:
  title: Stagehand API
  version: 3.1.0
  description: >-
    Stagehand SDK for AI browser automation [ALPHA]. This API allows clients to

    execute browser automation tasks remotely on the Browserbase cloud.

    All endpoints except /sessions/start require an active session ID.

    Responses are streamed using Server-Sent Events (SSE) when the

    `x-stream-response: true` header is provided.


    This SDK is currently ALPHA software and is not production ready!

    Please try it and give us your feedback, stay tuned for upcoming release
    announcements!
  contact:
    name: Browserbase
    url: https://browserbase.com
servers:
  - url: https://api.stagehand.browserbase.com
security:
  - BrowserbaseApiKey: []
    BrowserbaseProjectId: []
    ModelApiKey: []
paths:
  /v1/sessions/{id}/extract:
    post:
      summary: Extract data from the page
      description: >-
        Extracts structured data from the current page using AI-powered
        analysis.
      operationId: SessionExtract
      parameters:
        - schema:
            description: Unique session identifier
            example: c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123
            type: string
          in: path
          name: id
          required: true
          description: Unique session identifier
        - schema:
            description: Whether to stream the response via SSE
            example: 'true'
            type: string
            enum:
              - 'true'
              - 'false'
          in: header
          name: x-stream-response
          description: Whether to stream the response via SSE
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ExtractRequest'
        required: true
      responses:
        '200':
          description: Default Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExtractResponse'
      x-codeSamples:
        - lang: JavaScript
          source: >-
            import Stagehand from 'stagehand-sdk';


            const client = new Stagehand({
              browserbaseAPIKey: process.env['BROWSERBASE_API_KEY'], // This is the default and can be omitted
              browserbaseProjectID: process.env['BROWSERBASE_PROJECT_ID'], // This is the default and can be omitted
              modelAPIKey: process.env['MODEL_API_KEY'], // This is the default and can be omitted
            });


            const response = await
            client.sessions.extract('c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123');


            console.log(response.data);
        - lang: Python
          source: |-
            import os
            from stagehand import Stagehand

            client = Stagehand(
                browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),  # This is the default and can be omitted
                browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),  # This is the default and can be omitted
                model_api_key=os.environ.get("MODEL_API_KEY"),  # This is the default and can be omitted
            )
            for session in client.sessions.extract(
                id="c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123",
            ):
              print(session)
        - lang: Go
          source: "package main\n\nimport (\n\t\"context\"\n\t\"fmt\"\n\n\t\"github.com/browserbase/stagehand-go\"\n\t\"github.com/browserbase/stagehand-go/option\"\n)\n\nfunc main() {\n\tclient := stagehand.NewClient(\n\t\toption.WithBrowserbaseAPIKey(\"My Browserbase API Key\"),\n\t\toption.WithBrowserbaseProjectID(\"My Browserbase Project ID\"),\n\t\toption.WithModelAPIKey(\"My Model API Key\"),\n\t)\n\tresponse, err := client.Sessions.Extract(\n\t\tcontext.TODO(),\n\t\t\"c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123\",\n\t\tstagehand.SessionExtractParams{},\n\t)\n\tif err != nil {\n\t\tpanic(err.Error())\n\t}\n\tfmt.Printf(\"%+v\\n\", response.Data)\n}\n"
        - lang: Java
          source: |-
            package com.browserbase.api.example;

            import com.browserbase.api.client.StagehandClient;
            import com.browserbase.api.client.okhttp.StagehandOkHttpClient;
            import com.browserbase.api.models.sessions.SessionExtractParams;
            import com.browserbase.api.models.sessions.SessionExtractResponse;

            public final class Main {
                private Main() {}

                public static void main(String[] args) {
                    StagehandClient client = StagehandOkHttpClient.fromEnv();

                    SessionExtractResponse response = client.sessions().extract("c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123");
                }
            }
        - lang: Kotlin
          source: |-
            package com.browserbase.api.example

            import com.browserbase.api.client.StagehandClient
            import com.browserbase.api.client.okhttp.StagehandOkHttpClient
            import com.browserbase.api.models.sessions.SessionExtractParams
            import com.browserbase.api.models.sessions.SessionExtractResponse

            fun main() {
                val client: StagehandClient = StagehandOkHttpClient.fromEnv()

                val response: SessionExtractResponse = client.sessions().extract("c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123")
            }
        - lang: Ruby
          source: >-
            require "stagehand"


            stagehand = Stagehand::Client.new(
              browserbase_api_key: "My Browserbase API Key",
              browserbase_project_id: "My Browserbase Project ID",
              model_api_key: "My Model API Key"
            )


            response =
            stagehand.sessions.extract("c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123")


            puts(response)
components:
  schemas:
    ExtractRequest:
      type: object
      properties:
        instruction:
          description: Natural language instruction for what to extract
          example: Extract all product names and prices from the page
          type: string
        schema:
          description: JSON Schema defining the structure of data to extract
          type: object
          propertyNames:
            type: string
          additionalProperties: {}
        options:
          $ref: '#/components/schemas/ExtractOptions'
        frameId:
          description: Target frame ID for the extraction
          anyOf:
            - type: string
            - type: 'null'
        streamResponse:
          description: Whether to stream the response via SSE
          example: true
          type: boolean
    ExtractResponse:
      type: object
      properties:
        success:
          description: Indicates whether the request was successful
          type: boolean
        data:
          $ref: '#/components/schemas/ExtractResultOutput'
      required:
        - success
        - data
      additionalProperties: false
    ExtractOptions:
      type: object
      properties:
        model:
          description: >-
            Model configuration object or model name string (e.g.,
            'openai/gpt-5-nano')
          anyOf:
            - $ref: '#/components/schemas/ModelConfig'
            - type: string
        timeout:
          description: Timeout in ms for the extraction
          example: 30000
          type: number
        selector:
          description: CSS selector to scope extraction to a specific element
          example: '#main-content'
          type: string
    ExtractResultOutput:
      type: object
      properties:
        result:
          description: Extracted data matching the requested schema
          x-stainless-any: true
        actionId:
          description: Action ID for tracking
          type: string
      required:
        - result
      additionalProperties: false
    ModelConfig:
      $ref: '#/components/schemas/ModelConfigObject'
    ModelConfigObject:
      type: object
      properties:
        provider:
          description: AI provider for the model (or provide a baseURL endpoint instead)
          example: openai
          type: string
          enum:
            - openai
            - anthropic
            - google
            - microsoft
            - bedrock
        modelName:
          description: Model name string with provider prefix (e.g., 'openai/gpt-5-nano')
          example: openai/gpt-5-nano
          type: string
        apiKey:
          description: API key for the model provider
          example: sk-some-openai-api-key
          type: string
        baseURL:
          description: Base URL for the model provider
          example: https://api.openai.com/v1
          type: string
          format: uri
      required:
        - modelName
  securitySchemes:
    BrowserbaseApiKey:
      type: apiKey
      in: header
      name: x-bb-api-key
      description: Browserbase API key for authentication
    BrowserbaseProjectId:
      type: apiKey
      in: header
      name: x-bb-project-id
      description: Browserbase project ID
    ModelApiKey:
      type: apiKey
      in: header
      name: x-model-api-key
      description: API key for the AI model provider (OpenAI, Anthropic, etc.)

````

Built with [Mintlify](https://mintlify.com).
