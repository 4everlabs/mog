> ## Documentation Index
> Fetch the complete documentation index at: https://docs.stagehand.dev/llms.txt
> Use this file to discover all available pages before exploring further.

# Perform an action

> Executes a browser action using natural language instructions or a predefined Action object.



## OpenAPI

````yaml https://app.stainless.com/api/spec/documented/stagehand/openapi.documented.yml post /v1/sessions/{id}/act
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
  /v1/sessions/{id}/act:
    post:
      summary: Perform an action
      description: >-
        Executes a browser action using natural language instructions or a
        predefined Action object.
      operationId: SessionAct
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
              $ref: '#/components/schemas/ActRequest'
        required: true
      responses:
        '200':
          description: Default Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ActResponse'
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
            client.sessions.act('c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123', {
              input: 'Click the login button',
            });


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
            for session in client.sessions.act(
                id="c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123",
                input="Click the login button",
            ):
              print(session)
        - lang: Go
          source: "package main\n\nimport (\n\t\"context\"\n\t\"fmt\"\n\n\t\"github.com/browserbase/stagehand-go\"\n\t\"github.com/browserbase/stagehand-go/option\"\n)\n\nfunc main() {\n\tclient := stagehand.NewClient(\n\t\toption.WithBrowserbaseAPIKey(\"My Browserbase API Key\"),\n\t\toption.WithBrowserbaseProjectID(\"My Browserbase Project ID\"),\n\t\toption.WithModelAPIKey(\"My Model API Key\"),\n\t)\n\tresponse, err := client.Sessions.Act(\n\t\tcontext.TODO(),\n\t\t\"c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123\",\n\t\tstagehand.SessionActParams{\n\t\t\tInput: stagehand.SessionActParamsInputUnion{\n\t\t\t\tOfString: stagehand.String(\"Click the login button\"),\n\t\t\t},\n\t\t},\n\t)\n\tif err != nil {\n\t\tpanic(err.Error())\n\t}\n\tfmt.Printf(\"%+v\\n\", response.Data)\n}\n"
        - lang: Java
          source: |-
            package com.browserbase.api.example;

            import com.browserbase.api.client.StagehandClient;
            import com.browserbase.api.client.okhttp.StagehandOkHttpClient;
            import com.browserbase.api.models.sessions.SessionActParams;
            import com.browserbase.api.models.sessions.SessionActResponse;

            public final class Main {
                private Main() {}

                public static void main(String[] args) {
                    StagehandClient client = StagehandOkHttpClient.fromEnv();

                    SessionActParams params = SessionActParams.builder()
                        .id("c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123")
                        .input("Click the login button")
                        .build();
                    SessionActResponse response = client.sessions().act(params);
                }
            }
        - lang: Kotlin
          source: |-
            package com.browserbase.api.example

            import com.browserbase.api.client.StagehandClient
            import com.browserbase.api.client.okhttp.StagehandOkHttpClient
            import com.browserbase.api.models.sessions.SessionActParams
            import com.browserbase.api.models.sessions.SessionActResponse

            fun main() {
                val client: StagehandClient = StagehandOkHttpClient.fromEnv()

                val params: SessionActParams = SessionActParams.builder()
                    .id("c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123")
                    .input("Click the login button")
                    .build()
                val response: SessionActResponse = client.sessions().act(params)
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
            stagehand.sessions.act("c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123",
            input: "Click the login button")


            puts(response)
components:
  schemas:
    ActRequest:
      type: object
      properties:
        input:
          description: Natural language instruction or Action object
          example: Click the login button
          anyOf:
            - type: string
            - $ref: '#/components/schemas/Action'
        options:
          $ref: '#/components/schemas/ActOptions'
        frameId:
          description: Target frame ID for the action
          anyOf:
            - type: string
            - type: 'null'
        streamResponse:
          description: Whether to stream the response via SSE
          example: true
          type: boolean
      required:
        - input
    ActResponse:
      type: object
      properties:
        success:
          description: Indicates whether the request was successful
          type: boolean
        data:
          $ref: '#/components/schemas/ActResultOutput'
      required:
        - success
        - data
      additionalProperties: false
    Action:
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
    ActOptions:
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
            Variables to substitute in the action instruction. Accepts flat
            primitives or { value, description? } objects.
          example:
            username: john_doe
            password:
              value: secret123
              description: The login password
        timeout:
          description: Timeout in ms for the action
          example: 30000
          type: number
    ActResultOutput:
      type: object
      properties:
        result:
          $ref: '#/components/schemas/ActResultDataOutput'
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
    ActResultDataOutput:
      type: object
      properties:
        success:
          description: Whether the action completed successfully
          example: true
          type: boolean
        message:
          description: Human-readable result message
          example: Successfully clicked the login button
          type: string
        actionDescription:
          description: Description of the action that was performed
          example: Clicked button with text 'Login'
          type: string
        actions:
          description: List of actions that were executed
          type: array
          items:
            $ref: '#/components/schemas/ActionOutput'
      required:
        - success
        - message
        - actionDescription
        - actions
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
