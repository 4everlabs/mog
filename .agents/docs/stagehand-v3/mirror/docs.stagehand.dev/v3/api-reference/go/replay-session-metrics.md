> ## Documentation Index
> Fetch the complete documentation index at: https://docs.stagehand.dev/llms.txt
> Use this file to discover all available pages before exploring further.

# Replay session metrics

> Retrieves replay metrics for a session.



## OpenAPI

````yaml https://app.stainless.com/api/spec/documented/stagehand/openapi.documented.yml get /v1/sessions/{id}/replay
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
  /v1/sessions/{id}/replay:
    get:
      summary: Replay session metrics
      description: Retrieves replay metrics for a session.
      operationId: SessionReplay
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
      responses:
        '200':
          description: Default Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReplayResponse'
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
            client.sessions.replay('c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123');


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
            response = client.sessions.replay(
                id="c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123",
            )
            print(response.data)
        - lang: Go
          source: "package main\n\nimport (\n\t\"context\"\n\t\"fmt\"\n\n\t\"github.com/browserbase/stagehand-go\"\n\t\"github.com/browserbase/stagehand-go/option\"\n)\n\nfunc main() {\n\tclient := stagehand.NewClient(\n\t\toption.WithBrowserbaseAPIKey(\"My Browserbase API Key\"),\n\t\toption.WithBrowserbaseProjectID(\"My Browserbase Project ID\"),\n\t\toption.WithModelAPIKey(\"My Model API Key\"),\n\t)\n\tresponse, err := client.Sessions.Replay(\n\t\tcontext.TODO(),\n\t\t\"c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123\",\n\t\tstagehand.SessionReplayParams{},\n\t)\n\tif err != nil {\n\t\tpanic(err.Error())\n\t}\n\tfmt.Printf(\"%+v\\n\", response.Data)\n}\n"
        - lang: Java
          source: |-
            package com.browserbase.api.example;

            import com.browserbase.api.client.StagehandClient;
            import com.browserbase.api.client.okhttp.StagehandOkHttpClient;
            import com.browserbase.api.models.sessions.SessionReplayParams;
            import com.browserbase.api.models.sessions.SessionReplayResponse;

            public final class Main {
                private Main() {}

                public static void main(String[] args) {
                    StagehandClient client = StagehandOkHttpClient.fromEnv();

                    SessionReplayResponse response = client.sessions().replay("c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123");
                }
            }
        - lang: Kotlin
          source: |-
            package com.browserbase.api.example

            import com.browserbase.api.client.StagehandClient
            import com.browserbase.api.client.okhttp.StagehandOkHttpClient
            import com.browserbase.api.models.sessions.SessionReplayParams
            import com.browserbase.api.models.sessions.SessionReplayResponse

            fun main() {
                val client: StagehandClient = StagehandOkHttpClient.fromEnv()

                val response: SessionReplayResponse = client.sessions().replay("c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123")
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
            stagehand.sessions.replay("c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123")


            puts(response)
components:
  schemas:
    ReplayResponse:
      type: object
      properties:
        success:
          description: Indicates whether the request was successful
          type: boolean
        data:
          $ref: '#/components/schemas/ReplayResultOutput'
      required:
        - success
        - data
      additionalProperties: false
    ReplayResultOutput:
      type: object
      properties:
        pages:
          type: array
          items:
            $ref: '#/components/schemas/ReplayPageOutput'
        clientLanguage:
          type: string
      required:
        - pages
      additionalProperties: false
    ReplayPageOutput:
      type: object
      properties:
        url:
          type: string
        timestamp:
          type: number
        duration:
          type: number
        actions:
          type: array
          items:
            $ref: '#/components/schemas/ReplayActionOutput'
      required:
        - url
        - timestamp
        - duration
        - actions
      additionalProperties: false
    ReplayActionOutput:
      type: object
      properties:
        method:
          type: string
        parameters:
          type: object
          propertyNames:
            type: string
          additionalProperties: {}
        result:
          type: object
          propertyNames:
            type: string
          additionalProperties: {}
        timestamp:
          type: number
        endTime:
          type: number
        tokenUsage:
          $ref: '#/components/schemas/TokenUsageOutput'
      required:
        - method
        - parameters
        - result
        - timestamp
      additionalProperties: false
    TokenUsageOutput:
      type: object
      properties:
        inputTokens:
          type: number
        outputTokens:
          type: number
        timeMs:
          type: number
        cost:
          type: number
      additionalProperties: false
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
