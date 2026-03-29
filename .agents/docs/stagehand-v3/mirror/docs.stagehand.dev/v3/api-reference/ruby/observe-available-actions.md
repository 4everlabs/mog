> ## Documentation Index
> Fetch the complete documentation index at: https://docs.stagehand.dev/llms.txt
> Use this file to discover all available pages before exploring further.

# Observe available actions

> Identifies and returns available actions on the current page that match the given instruction.



## OpenAPI

````yaml https://app.stainless.com/api/spec/documented/stagehand/openapi.documented.yml post /v1/sessions/{id}/observe
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
  /v1/sessions/{id}/observe:
    post:
      summary: Observe available actions
      description: >-
        Identifies and returns available actions on the current page that match
        the given instruction.
      operationId: SessionObserve
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
              $ref: '#/components/schemas/ObserveRequest'
        required: true
      responses:
        '200':
          description: Default Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ObserveResponse'
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
            client.sessions.observe('c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123');


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
            for session in client.sessions.observe(
                id="c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123",
            ):
              print(session)
        - lang: Go
          source: "package main\n\nimport (\n\t\"context\"\n\t\"fmt\"\n\n\t\"github.com/browserbase/stagehand-go\"\n\t\"github.com/browserbase/stagehand-go/option\"\n)\n\nfunc main() {\n\tclient := stagehand.NewClient(\n\t\toption.WithBrowserbaseAPIKey(\"My Browserbase API Key\"),\n\t\toption.WithBrowserbaseProjectID(\"My Browserbase Project ID\"),\n\t\toption.WithModelAPIKey(\"My Model API Key\"),\n\t)\n\tresponse, err := client.Sessions.Observe(\n\t\tcontext.TODO(),\n\t\t\"c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123\",\n\t\tstagehand.SessionObserveParams{},\n\t)\n\tif err != nil {\n\t\tpanic(err.Error())\n\t}\n\tfmt.Printf(\"%+v\\n\", response.Data)\n}\n"
        - lang: Java
          source: |-
            package com.browserbase.api.example;

            import com.browserbase.api.client.StagehandClient;
            import com.browserbase.api.client.okhttp.StagehandOkHttpClient;
            import com.browserbase.api.models.sessions.SessionObserveParams;
            import com.browserbase.api.models.sessions.SessionObserveResponse;

            public final class Main {
                private Main() {}

                public static void main(String[] args) {
                    StagehandClient client = StagehandOkHttpClient.fromEnv();

                    SessionObserveResponse response = client.sessions().observe("c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123");
                }
            }
        - lang: Kotlin
          source: |-
            package com.browserbase.api.example

            import com.browserbase.api.client.StagehandClient
            import com.browserbase.api.client.okhttp.StagehandOkHttpClient
            import com.browserbase.api.models.sessions.SessionObserveParams
            import com.browserbase.api.models.sessions.SessionObserveResponse

            fun main() {
                val client: StagehandClient = StagehandOkHttpClient.fromEnv()

                val response: SessionObserveResponse = client.sessions().observe("c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123")
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
            stagehand.sessions.observe("c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123")


            puts(response)
components:
  schemas:
    ObserveRequest:
      type: object
      properties:
        instruction:
          description: Natural language instruction for what actions to find
          example: Find all clickable navigation links
          type: string
        options:
          $ref: '#/components/schemas/ObserveOptions'
        frameId:
          description: Target frame ID for the observation
          anyOf:
            - type: string
            - type: 'null'
        streamResponse:
          description: Whether to stream the response via SSE
          example: true
          type: boolean
    ObserveResponse:
      type: object
      properties:
        success:
          description: Indicates whether the request was successful
          type: boolean
        data:
          $ref: '#/components/schemas/ObserveResultOutput'
      required:
        - success
        - data
      additionalProperties: false
    ObserveOptions:
      type: object
      properties:
        model:
          description: >-
            Model configuration object or model name string (e.g.,
            'openai/gpt-5-nano')
          anyOf:
            - $ref: '#/components/schemas/ModelConfig'
            - type: string
        variables:
          $ref: '#/components/schemas/Variables'
          description: >-
            Variables whose names are exposed to the model so observe() returns
            %variableName% placeholders in suggested action arguments instead of
            literal values. Accepts flat primitives or { value, description? }
            objects.
          example:
            username:
              value: john@example.com
              description: The login email
            rememberMe: true
        timeout:
          description: Timeout in ms for the observation
          example: 30000
          type: number
        selector:
          description: CSS selector to scope observation to a specific element
          example: nav
          type: string
    ObserveResultOutput:
      type: object
      properties:
        result:
          type: array
          items:
            $ref: '#/components/schemas/ActionOutput'
        actionId:
          description: Action ID for tracking
          type: string
      required:
        - result
      additionalProperties: false
    ModelConfig:
      $ref: '#/components/schemas/ModelConfigObject'
    Variables:
      type: object
      propertyNames:
        type: string
      additionalProperties:
        $ref: '#/components/schemas/VariableValue'
    ActionOutput:
      description: Action object returned by observe and used by act
      type: object
      properties:
        selector:
          description: CSS selector or XPath for the element
          example: '[data-testid=''submit-button'']'
          type: string
        description:
          description: Human-readable description of the action
          example: Click the submit button
          type: string
        backendNodeId:
          description: Backend node ID for the element
          type: number
        method:
          description: The method to execute (click, fill, etc.)
          example: click
          type: string
        arguments:
          description: Arguments to pass to the method
          example:
            - Hello World
          type: array
          items:
            type: string
      required:
        - selector
        - description
      additionalProperties: false
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
    VariableValue:
      anyOf:
        - $ref: '#/components/schemas/VariablePrimitive'
        - type: object
          properties:
            value:
              $ref: '#/components/schemas/VariablePrimitive'
            description:
              type: string
          required:
            - value
          additionalProperties: false
    VariablePrimitive:
      anyOf:
        - type: string
        - type: number
        - type: boolean
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
